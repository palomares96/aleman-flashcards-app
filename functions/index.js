// functions/index.js
// --- DEPLOY V5 - FORCE UPDATE ---

// --- Importaciones ---
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
// const { defineString } = require('firebase-functions/v2/params'); // <-- LÍNEA PROBLEMÁTICA ELIMINADA
const { VertexAI } = require('@google-cloud/vertexai');
const admin = require("firebase-admin");
const { CloudBillingClient } = require("@google-cloud/billing");

// --- Inicialización ---
admin.initializeApp();
const db = admin.firestore();
const billing = new CloudBillingClient();
setGlobalOptions({ region: "europe-west1" });

// =================================================================================
// --- Configuración del Modelo de IA (Gemini) ---
// =================================================================================
// NOTA: La clave de API ahora se accederá directamente a través de process.env más adelante
const vertex_ai = new VertexAI({ 
    project: process.env.GCLOUD_PROJECT, 
    location: 'us-central1' // Mantenemos us-central1, es el más seguro
});

// CAMBIO AQUÍ: Usamos el nombre genérico, sin versiones numéricas
const model = 'gemini-2.5-flash-lite'; 

const generativeModel = vertex_ai.getGenerativeModel({
    model: model,
    generation_config: {
        "max_output_tokens": 2048,
        "temperature": 0.7,
        "top_p": 1,
    },
    // Settings de seguridad opcionales pero recomendados
    safety_settings: [
        { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
    ],
});

// =================================================================================
// --- 1. Cloud Function: Generar Frase (V4 - Contexto y Traducción) ---
// =================================================================================
exports.generateSentence = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required.");
    
    // Desestructuramos todos los nuevos filtros
    const { 
        words, targetLang, tense, grammaticalCase, 
        sentenceStructure, verbMood, voice, keyword 
    } = request.data;

    if (!words || words.length === 0) {
        throw new HttpsError("invalid-argument", "Faltan palabras.");
    }

    const langName = targetLang === 'DE' ? 'Alemán' : 'Español';
    const targetTranslationLang = targetLang === 'DE' ? 'Español' : 'Alemán';
    
    let wordsDetails = words.map(w => 
        `"${w.term}" (significado deseado: "${w.translation}", tipo: ${w.type || 'palabra'})`
    ).join(", ");

    // Añadimos la palabra clave si existe
    if (keyword && keyword.trim() !== '') {
        wordsDetails += `, y también la palabra "${keyword.trim()}"`;
    }

    // --- CONSTRUCCIÓN DE REGLAS DINÁMICAS ---
    let grammarRules = `
        1.  CONJUGA los verbos correctamente. No los dejes en infinitivo.
        2.  CORRIGE errores ortográficos obvios en las palabras de entrada.
        3.  Respeta declinaciones y el orden de la frase (TEKAMOLO si aplica).
    `;

    let ruleCounter = 4;
    if (targetLang === 'DE') {
        if (tense && tense !== 'any') {
            grammarRules += `\n        ${ruleCounter++}.  REQUISITO DE TIEMPO VERBAL: La frase DEBE estar en "${tense}".`;
        }
        if (grammaticalCase && grammaticalCase !== 'any') {
            grammarRules += `\n        ${ruleCounter++}.  REQUISITO DE CASO: La frase DEBE contener un elemento claro en caso "${grammaticalCase}".`;
        }
        if (sentenceStructure && sentenceStructure !== 'any') {
            grammarRules += `\n        ${ruleCounter++}.  REQUISITO DE ESTRUCTURA: La frase DEBE ser de tipo "${sentenceStructure}".`;
        }
        if (verbMood && verbMood !== 'any') {
            grammarRules += `\n        ${ruleCounter++}.  REQUISITO DE MODO VERBAL: La frase DEBE usar el modo "${verbMood}".`;
        }
        if (voice && voice !== 'any') {
            grammarRules += `\n        ${ruleCounter++}.  REQUISITO DE VOZ: La frase DEBE estar en "${voice}".`;
        }
    }

    const prompt = `
        Eres un profesor de ${langName} experto en crear material de estudio para niveles A2/B1.
        
        TAREA:
        1.  Genera una frase gramaticalmente PERFECTA en ${langName} que cumpla TODAS las reglas.
        2.  Traduce esa misma frase de forma ideal y natural al ${targetTranslationLang}.

        REGLA DE ORO:
        La frase generada debe ser simple, clara y de longitud adecuada para un nivel A2. Evita estructuras demasiado complejas o frases muy largas, incluso si se usan filtros avanzados. Queremos frases útiles para aprender, no literatura compleja.

        REQUISITOS DE LAS PALABRAS INPUT:
        -   Debes integrar obligatoriamente estas palabras: ${wordsDetails}.
        -   El significado de la palabra en la frase DEBE corresponder al "significado deseado".

        REGLAS DE GRAMÁTICA (${langName}):
        ${grammarRules}
        
        REGLAS DE ETIQUETADO EN LA FRASE GENERADA:
        -   Envuelve las palabras obligatorias usadas en la frase en ${langName} con estas etiquetas:
            -   Sustantivos: [noun-m|Palabra], [noun-f|Palabra], [noun-n|Palabra]
            -   Verbos: [verb|Palabra] (la forma conjugada)
            -   Adjetivos: [adj|Palabra]
            -   Preposiciones: [prep|Palabra]
            -   Otros: [word|Palabra]
        
        FORMATO DE SALIDA (MUY IMPORTANTE):
        Tu respuesta DEBE SER ÚNICAMENTE el objeto JSON, sin ningún texto introductorio, explicaciones o marcadores como \`\`\`json. NADA MÁS.
        
        Ejemplo de respuesta válida:
        {
          "sentence": "Ich gehe zum [noun-m|Bahnhof].",
          "idealTranslation": "Voy a la estación de tren."
        }
    `;

    try {
        const result = await generativeModel.generateContent({ 
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generation_config: { response_mime_type: "application/json" }
        });
        const response = await result.response;
        
        if (!response.candidates || response.candidates.length === 0) {
            console.error("Error en generateSentence: No se han devuelto candidatos desde el modelo. Razón:", response.promptFeedback);
            throw new HttpsError("internal", "La IA no ha podido generar una respuesta. Esto puede ser debido a los filtros de seguridad internos.");
        }

        const jsonText = response.candidates[0].content.parts[0].text.trim();
        
        try {
            const jsonResponse = JSON.parse(jsonText.replace(/```json|```/g, ''));
            return jsonResponse;
        } catch (jsonError) {
            console.error("Error al parsear el JSON de la IA:", jsonError);
            console.error("Texto problemático recibido de la IA:", jsonText);
            throw new HttpsError("internal", "La IA ha devuelto una respuesta con un formato inesperado y no se ha podido procesar.");
        }

    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error en generateSentence V6:", error);
        console.error("Prompt enviado:", prompt);
        throw new HttpsError("internal", "Ha ocurrido un error general al comunicarse con el servicio de IA.");
    }
});

// =================================================================================
// --- 2. Cloud Function: Evaluar Traducción (V5 - Con Nota Numérica) ---
// =================================================================================
exports.evaluateTranslation = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required.");

    const { originalSentence, userTranslation, idealTranslation, sourceLang, targetLang } = request.data;

    // Limpiamos etiquetas
    const cleanOriginal = originalSentence.replace(/\[.*?\|(.*?)\]/g, '$1');

    const prompt = `
        Actúa como un profesor de idiomas examinador y justo.
        
        INPUT:
        1. Frase Original (${sourceLang}): "${cleanOriginal}"
        2. Traducción IDEAL de referencia (${targetLang}): "${idealTranslation}"
        3. Traducción del Alumno (${targetLang}): "${userTranslation}"

        TAREA:
        Compara la "Traducción del Alumno" con la "Traducción IDEAL". Asigna una nota de 0 a 10 y da feedback.
        
        CRITERIOS DE PUNTUACIÓN (Score):
        - 10: La traducción del alumno es idéntica o una alternativa perfectamente válida a la traducción ideal.
        - 8-9: Significado 100% correcto, pero con pequeños errores (typos, un artículo incorrecto, orden de palabras no tan natural como el ideal).
        - 5-7: El significado principal se entiende, pero hay errores gramaticales o de léxico (verbo mal conjugado, palabra inadecuada pero comprensible).
        - 0-4: El significado es incorrecto, la frase es ininteligible o se aleja mucho del sentido de la frase original.

        REGLAS DE FEEDBACK:
        - El feedback debe ser CONSTRUCTIVO y en Español.
        - Si la nota NO es 10, explica por qué no lo es, basándote en la comparación con la traducción ideal.
        - La "betterTranslation" debe ser la "Traducción IDEAL" que te he pasado, o una pequeña variación si encuentras una mejora OBVIA. No la reinventes.

        SALIDA JSON:
        Devuelve un único objeto JSON con esta estructura exacta:
        {
            "score": integer,
            "feedback": "string",
            "betterTranslation": "string"
        }
    `;

    try {
        const result = await generativeModel.generateContent({ 
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generation_config: { response_mime_type: "application/json" }
        });
        
        const response = await result.response;
        const jsonText = response.candidates[0].content.parts[0].text.trim().replace(/```json|```/g, '');
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error en evaluateTranslation V6:", error);
        console.error("Prompt enviado:", prompt);
        throw new HttpsError("internal", "Error al evaluar la traducción.");
    }
});

// =================================================================================
// --- Tus Funciones Existentes (Sin Cambios) ---
// =================================================================================

// --- Función para gestionar solicitudes de amistad ---
exports.handleFriendRequest = onCall(async (request) => {
    if (!request.auth) { throw new HttpsError("unauthenticated", "Debes estar autenticado."); }
    const { requestId, action } = request.data;
    const myUid = request.auth.uid;
    const requestRef = db.collection("friendRequests").doc(requestId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) { throw new HttpsError("not-found", "La solicitud no existe."); }
    const requestData = requestDoc.data();
    if (requestData.to_uid !== myUid) { throw new HttpsError("permission-denied", "No puedes gestionar esta solicitud."); }
    const theirUid = requestData.from_uid;
    try {
        if (action === "accept") {
            const batch = db.batch();
            const myFriendRef = db.doc(`users/${myUid}/friends/${theirUid}`);
            const theirFriendRef = db.doc(`users/${theirUid}/friends/${myUid}`);
            batch.update(requestRef, { status: "accepted" });
            batch.set(myFriendRef, { displayName: requestData.from_displayName, since: admin.firestore.FieldValue.serverTimestamp() });
            batch.set(theirFriendRef, { displayName: requestData.to_displayName, since: admin.firestore.FieldValue.serverTimestamp() });
            await batch.commit();
            return { success: true, message: "Amigo añadido." };
        } else if (action === "decline") {
            await requestRef.delete();
            return { success: true, message: "Solicitud rechazada." };
        } else {
            throw new HttpsError("invalid-argument", "Acción no válida.");
        }
    } catch (error) {
        console.error("Error al procesar la solicitud de amistad:", error);
        throw new HttpsError("internal", "Error al procesar la solicitud.");
    }
});

// --- Función para desactivar la facturación ---
exports.stopBilling = onMessagePublished("budget-killswitch-topic", async (event) => {
    const pubsubMessage = event.data.message;
    const budgetData = pubsubMessage.json;
    if (budgetData.costAmount <= budgetData.budgetAmount) { console.log("El coste no ha superado el presupuesto. No se hace nada."); return; }
    console.log("¡Presupuesto superado! Desactivando la facturación...");
    const project = await billing.getProjectBillingInfo({ name: process.env.GCLOUD_PROJECT });
    const projectName = project[0].name;
    if (!projectName || !project[0].billingEnabled) { console.log("La facturación ya está desactivada."); return; }
    await billing.updateProjectBillingInfo({ name: projectName, projectBillingInfo: { billingAccountName: "" } });
    console.log("¡FACTURACIÓN DESACTIVADA!");
});

// --- Función para calcular las estadísticas diarias ---
exports.calculateDailyStats = onSchedule("every 24 hours", async (event) => {
    console.log("calculateDailyStats function is disabled due to performance concerns.");
    return null;
});