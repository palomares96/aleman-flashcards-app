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
// --- 1. Cloud Function: Generar Frase (V3 - Gramaticalmente Estricta) ---
// =================================================================================
exports.generateSentence = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required.");
    
    const { words, targetLang } = request.data; 
    // words es ahora: [{ term: 'nutzen', type: 'verb', gender: '...' }, ...]

    if (!words || words.length === 0) {
        throw new HttpsError("invalid-argument", "Faltan palabras.");
    }

    const langName = targetLang === 'DE' ? 'Alemán' : 'Español';
    
    // Construimos una lista detallada para que la IA no se confunda de tipo
    const wordsDetails = words.map(w => 
        `"${w.term}" (debes usarlo como: ${w.type || 'palabra genérica'})`
    ).join(", ");

    const prompt = `
        Eres un experto lingüista y profesor de ${langName}.
        
        TAREA:
        Genera una frase gramaticalmente PERFECTA de nivel A2 en ${langName}.
        
        REQUISITOS DE LAS PALABRAS INPUT:
        Debes integrar obligatoriamente estas palabras en la frase:
        ${wordsDetails}

        REGLAS DE ORO (Gramática):
        1. Si la palabra es un VERBO, debes CONJUGARLO correctamente como verbo. NO lo uses como adjetivo o sustantivo. (Ej: Si la palabra es "nutzen", di "Ich nutze es", NO digas "es ist nutzen").
        2. Si la palabra tiene un error ortográfico evidente (typo), CORRÍGELO en la frase generada (Ej: "Knöckel" -> "Knöchel").
        3. Respeta los casos y declinaciones.
        
        REGLAS DE SALIDA (Etiquetado):
        Envuelve las palabras obligatorias usadas con estas etiquetas EXACTAS:
        - Sustantivos: [noun-m|Palabra], [noun-f|Palabra], [noun-n|Palabra] (o [noun-x|...] si no aplica género)
        - Verbos: [verb|Palabra] (La forma conjugada)
        - Adjetivos: [adj|Palabra]
        - Preposiciones: [prep|Palabra]

        Solo devuelve la frase etiquetada final. Nada más.
    `;

    try {
        const result = await generativeModel.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
        const response = await result.response;
        // Limpiamos posibles caracteres extra
        let sentence = response.candidates[0].content.parts[0].text.trim();
        // Eliminar comillas si la IA las pone
        sentence = sentence.replace(/^"|"$/g, '');
        
        return { sentence: sentence };
    } catch (error) {
        console.error("Error en generateSentence:", error);
        throw new HttpsError("internal", "Error al generar la frase.");
    }
});

// =================================================================================
// --- 2. Cloud Function: Evaluar Traducción (V5 - Con Nota Numérica) ---
// =================================================================================
exports.evaluateTranslation = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required.");

    const { originalSentence, userTranslation, sourceLang, targetLang } = request.data;

    // Limpiamos etiquetas
    const cleanOriginal = originalSentence.replace(/\[.*?\|(.*?)\]/g, '$1');

    const prompt = `
        Actúa como un profesor de idiomas examinador.
        
        INPUT:
        1. Frase Original (${sourceLang}): "${cleanOriginal}"
        2. Traducción del Alumno (${targetLang}): "${userTranslation}"

        TAREA:
        Evalúa la traducción y asigna una nota del 0 al 10.
        
        CRITERIOS DE PUNTUACIÓN (Score):
        - 10: Traducción perfecta o nativa.
        - 8-9: Significado correcto, pero pequeños errores (typos leves, un género mal, orden de palabras ligeramente no natural).
        - 5-7: El significado se entiende, pero hay errores gramaticales evidentes (conjugación, casos incorrectos).
        - 0-4: Significado incorrecto, palabras inventadas o ininteligible.

        REGLAS DE FEEDBACK:
        - Si la nota es >= 7, sé positivo.
        - Si la nota es < 5, explica claramente el error de concepto.
        - NO alucines palabras que no están.

        SALIDA JSON:
        {
            "score": integer, // 0 a 10
            "feedback": "string", // Explicación breve en Español.
            "betterTranslation": "string" // La corrección ideal.
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
        console.error("Error en evaluateTranslation:", error);
        throw new HttpsError("internal", "Error al evaluar.");
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
    console.log("Ejecutando la tarea diaria de cálculo de estadísticas...");
    const MASTERY_CRITERIA = { MIN_PLAYS: 5, MAX_ERROR_RATE: 0.2, STREAK_NEEDED: 4 };
    const usersSnapshot = await db.collection("users").get();
    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const progressSnapshot = await db.collection(`users/${userId}/progress`).get();
        let masteredCount = 0;
        progressSnapshot.forEach(progressDoc => {
            const progress = progressDoc.data();
            const totalPlays = (progress.correct || 0) + (progress.incorrect || 0);
            const errorRate = totalPlays > 0 ? (progress.incorrect || 0) / totalPlays : 0;
            const isMasteredByPlays = totalPlays >= MASTERY_CRITERIA.MIN_PLAYS && errorRate < MASTERY_CRITERIA.MAX_ERROR_RATE;
            const isMasteredByStreak = (progress.correctStreak || 0) >= MASTERY_CRITERIA.STREAK_NEEDED;
            if (isMasteredByPlays || isMasteredByStreak) { masteredCount++; }
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const statId = `${userId}_${today.toISOString().split('T')[0]}`;
        await db.collection("dailyStats").doc(statId).set({
            userId: userId,
            masteredCount: masteredCount,
            date: admin.firestore.Timestamp.fromDate(today),
        });
        console.log(`Estadísticas guardadas para el usuario ${userId}: ${masteredCount} palabras dominadas.`);
    }
    console.log("Tarea de cálculo de estadísticas completada.");
    return null;
});