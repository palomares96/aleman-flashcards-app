const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineString, defineInt } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");
const { createSocialHandlers, requireAuth } = require("./lib/social");
admin.initializeApp();
const db = admin.firestore();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });
const model = defineString("GEMINI_MODEL", {
  description:
    "A supported Gemini model ID verified in this Google Cloud project.",
});
const location = defineString("GEMINI_LOCATION", { default: "europe-west1" });
const freeLimit = defineInt("FREE_AI_DAILY_LIMIT", { default: 5 });
const premiumLimit = defineInt("PREMIUM_AI_DAILY_LIMIT", { default: 50 });
const stamp = () => admin.firestore.FieldValue.serverTimestamp();
for (const [name, handler] of Object.entries(createSocialHandlers(db, stamp)))
  exports[name] = onCall(handler);
async function budget(uid, kind, consume = false) {
  const today = new Date().toISOString().slice(0, 10);
  return db.runTransaction(async (tx) => {
    const user = await tx.get(db.doc(`users/${uid}`));
    const dailyLimit =
      user.data()?.tier === "premium"
        ? premiumLimit.value()
        : freeLimit.value();
    const ref = db.doc(`rateLimits/${uid}_${kind}_${today}`),
      current = await tx.get(ref);
    const count = current.data()?.count || 0;
    if (consume && count >= dailyLimit)
      throw new HttpsError(
        "resource-exhausted",
        `Límite de ${dailyLimit} solicitudes diarias alcanzado. Se renueva a las 00:00 UTC.`,
      );
    if (consume)
      tx.set(ref, {
        userId: uid,
        functionName: kind,
        date: today,
        count: count + 1,
        updatedAt: stamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(
          Date.now() + 7 * 86400000,
        ),
      });
    return {
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - count - Number(consume)),
      resetDay: today,
    };
  });
}
exports.aiUsage = onCall(async (request) => {
  const uid = requireAuth(request);
  const [generateSentence, evaluateTranslation] = await Promise.all(
    ["generateSentence", "evaluateTranslation"].map((kind) =>
      budget(uid, kind),
    ),
  );
  return { generateSentence, evaluateTranslation };
});
for (const kind of ["generateSentence", "evaluateTranslation"]) {
  exports[kind] = onCall(
    { timeoutSeconds: 90, memory: "512MiB" },
    async (request) => {
      const uid = requireAuth(request);
      const { validateInput, buildPrompt, validateResponse, responseSchemas } =
        await import("./shared/aiContracts.mjs");
      let input;
      try {
        input = validateInput(kind, request.data);
      } catch (error) {
        throw new HttpsError("invalid-argument", error.message);
      }
      const usage = await budget(uid, kind, true);
      try {
        const ai = new GoogleGenAI({
          vertexai: true,
          project: process.env.GCLOUD_PROJECT,
          location: location.value(),
        });
        const response = await ai.models.generateContent({
          model: model.value(),
          contents: buildPrompt(kind, input),
          config: {
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseJsonSchema: responseSchemas[kind],
            httpOptions: { timeout: 60000 },
          },
        });
        return {
          ...validateResponse(kind, response.text),
          usage,
          provider: "cloud",
        };
      } catch (error) {
        // Never log the learner's vocabulary, prompts or private translations.
        console.error("AI request failed", {
          kind,
          code: error.code || error.status || "invalid-response",
        });
        throw new HttpsError(
          "unavailable",
          "No se pudo completar la petición de IA. La solicitud cuenta en el límite diario; puedes usar ejemplos guardados.",
        );
      }
    },
  );
}
