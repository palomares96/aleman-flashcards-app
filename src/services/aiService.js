import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

/**
 * Service to handle AI generation, prioritizing local on-device models (Gemini Nano)
 * and falling back to Cloud Functions if local AI is unavailable.
 */

// Check if the browser supports the Prompt API (Chrome Built-in AI)
const hasLocalAI = () => {
    return typeof window.ai !== "undefined" && typeof window.ai.languageModel !== "undefined";
};

// --- PROMPTS ---

const constructSentencePrompt = (params) => {
    const {
        words, targetLang, tense, grammaticalCase,
        sentenceStructure, verbMood, voice, keyword
    } = params;

    const langName = targetLang === 'DE' ? 'Alemán' : 'Español';
    const targetTranslationLang = targetLang === 'DE' ? 'Español' : 'Alemán';

    let wordsDetails = words.map(w =>
        `"${w.term}" (significado deseado: "${w.translation}", tipo: ${w.type || 'palabra'})`
    ).join(", ");

    if (keyword && keyword.trim() !== '') {
        wordsDetails += `, y también la palabra "${keyword.trim()}"`;
    }

    let grammarRules = `
        1.  CONJUGA los verbos correctamente. No los dejes en infinitivo.
        2.  CORRIGE errores ortográficos obvios en las palabras de entrada.
        3.  Respeta declinaciones y el orden de la frase (TEKAMOLO si aplica).
    `;

    let ruleCounter = 4;
    if (targetLang === 'DE') {
        if (tense && tense !== 'any') grammarRules += `\n        ${ruleCounter++}.  REQUISITO DE TIEMPO VERBAL: La frase DEBE estar en "${tense}".`;
        if (grammaticalCase && grammaticalCase !== 'any') grammarRules += `\n        ${ruleCounter++}.  REQUISITO DE CASO: La frase DEBE contener un elemento claro en caso "${grammaticalCase}".`;
        if (sentenceStructure && sentenceStructure !== 'any') grammarRules += `\n        ${ruleCounter++}.  REQUISITO DE ESTRUCTURA: La frase DEBE ser de tipo "${sentenceStructure}".`;
        if (verbMood && verbMood !== 'any') grammarRules += `\n        ${ruleCounter++}.  REQUISITO DE MODO VERBAL: La frase DEBE usar el modo "${verbMood}".`;
        if (voice && voice !== 'any') grammarRules += `\n        ${ruleCounter++}.  REQUISITO DE VOZ: La frase DEBE estar en "${voice}".`;
    }

    return `
        Eres un profesor de ${langName} experto en crear material de estudio para niveles A2/B1.
        
        TAREA:
        1.  Genera una frase gramaticalmente PERFECTA en ${langName} que cumpla TODAS las reglas.
        2.  Traduce esa misma frase de forma ideal y natural al ${targetTranslationLang}.

        REGLA DE ORO:
        La frase generada debe ser simple, clara y de longitud adecuada para un nivel A2.

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
        Tu respuesta DEBE SER ÚNICAMENTE el objeto JSON, sin markdown, sin \`\`\`.
        
        Ejemplo:
        { "sentence": "Ich gehe zum [noun-m|Bahnhof].", "idealTranslation": "Voy a la estación de tren." }
    `;
};

const constructEvaluationPrompt = (params) => {
    const { originalSentence, userTranslation, idealTranslation, sourceLang, targetLang } = params;
    const cleanOriginal = originalSentence.replace(/\[.*?\|(.*?)\]/g, '$1');

    return `
        Actúa como un profesor de idiomas examinador y justo.
        INPUT:
        1. Frase Original (${sourceLang}): "${cleanOriginal}"
        2. Traducción IDEAL de referencia (${targetLang}): "${idealTranslation}"
        3. Traducción del Alumno (${targetLang}): "${userTranslation}"

        TAREA:
        Compara la "Traducción del Alumno" con la "Traducción IDEAL". Asigna una nota de 0 a 10 y da feedback.

        CRITERIOS:
        - 10: Perfecta o idéntica.
        - 8-9: Significado correcto, errores menores (typos).
        - 5-7: Comprensible pero con errores gramaticales.
        - 0-4: Incorrecta o ininteligible.

        FORMATO DE SALIDA:
        JSON puro.
        {
            "score": integer,
            "feedback": "string",
            "betterTranslation": "string"
        }
    `;
};

// --- LOCAL EXECUTION ---

const runLocalModel = async (prompt, systemInstruction) => {
    if (!hasLocalAI()) throw new Error("Local AI not supported");

    try {
        const capabilities = await window.ai.languageModel.capabilities();
        if (capabilities.available === 'no') {
            throw new Error("Local AI model not available");
        }

        // Create a session. Note: API is experimental and might change.
        // We handle the creation logic based on current experimental specs.
        const session = await window.ai.languageModel.create({
            systemPrompt: systemInstruction
        });

        const result = await session.prompt(prompt);
        // Destroy session to free resources
        session.destroy();

        // Parse JSON
        const cleanJson = result.trim().replace(/```json|```/g, '');
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Local AI Execution Failed:", e);
        throw e; // Bubble up to fallback
    }
};

// --- EXPORTED METHODS ---

export const aiService = {
    generateSentence: async (params, userTier = 'free') => {
        // 1. Try Local (Preferred for everyone)
        if (hasLocalAI()) {
            try {
                console.log("Attempting local generation (Gemini Nano)...");
                const prompt = constructSentencePrompt(params);
                return await runLocalModel(prompt, "You are a helpful language teacher.");
            } catch (e) {
                console.warn("Local generation failed.", e);
                // If user is FREE, we CANNOT fallback to cloud.
                if (userTier !== 'premium') {
                    throw new Error("Tu dispositivo no pudo generar la frase localmente y tu plan Gratuito no incluye acceso a la Nube. Actualiza a Premium para acceso ilimitado.");
                }
                console.log("Falling back to cloud (Premium)...");
            }
        } else {
            // If no local AI and user is FREE
            if (userTier !== 'premium') {
                throw new Error("Tu dispositivo no soporta IA Local y tu plan Gratuito no incluye acceso a la Nube. Actualiza a Premium.");
            }
        }

        // 2. Fallback to Cloud (Only for PREMIUM)
        const functions = getFunctions(getApp(), "europe-west1");
        const generateFunc = httpsCallable(functions, 'generateSentence');
        const result = await generateFunc(params);
        return result.data;
    },

    evaluateTranslation: async (params, userTier = 'free') => {
        // 1. Try Local
        if (hasLocalAI()) {
            try {
                console.log("Attempting local evaluation (Gemini Nano)...");
                const prompt = constructEvaluationPrompt(params);
                return await runLocalModel(prompt, "You are a helpful language teacher.");
            } catch (e) {
                console.warn("Local evaluation failed.", e);
                if (userTier !== 'premium') {
                    throw new Error("Error en evaluación local. Plan Premium requerido para acceso a la Nube.");
                }
            }
        } else {
            if (userTier !== 'premium') {
                throw new Error("IA Local no soportada. Plan Premium requerido para acceso a la Nube.");
            }
        }

        // 2. Fallback to Cloud (Only for PREMIUM)
        const functions = getFunctions(getApp(), "europe-west1");
        const evalFunc = httpsCallable(functions, 'evaluateTranslation');
        const result = await evalFunc(params);
        return result.data;
    }
};
