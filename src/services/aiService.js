import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase.js";
import {
  validateInput,
  buildPrompt,
  validateResponse,
} from "../../functions/shared/aiContracts.mjs";
const options = {
  expectedInputs: [{ type: "text", languages: ["de", "es"] }],
  expectedOutputs: [{ type: "text", languages: ["de", "es"] }],
};
export async function localAIStatus() {
  if (!globalThis.LanguageModel) return "unavailable";
  try {
    return await LanguageModel.availability(options);
  } catch {
    return "unavailable";
  }
}
export async function downloadLocalAI(onProgress) {
  if (!globalThis.LanguageModel)
    throw new Error("La IA local no está disponible en este navegador.");
  const session = await LanguageModel.create({
    ...options,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", (event) =>
        onProgress?.(Math.round(event.loaded * 100)),
      );
    },
  });
  session.destroy();
}
async function runLocal(kind, input) {
  let session;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    session = await LanguageModel.create({
      ...options,
      signal: controller.signal,
      initialPrompts: [
        {
          role: "system",
          content:
            "Return a JSON object for this German/Spanish language exercise.",
        },
      ],
    });
    return validateResponse(
      kind,
      await session.prompt(buildPrompt(kind, input), {
        signal: controller.signal,
      }),
    );
  } finally {
    clearTimeout(timeout);
    session?.destroy();
  }
}
const cache = new Map();
async function request(kind, input, { useCache = true } = {}) {
  const data = validateInput(kind, input);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Inicia sesión para practicar.");
  const key = JSON.stringify([uid, kind, data]);
  if (kind === "generateSentence" && useCache && cache.has(key))
    return { ...cache.get(key), provider: "cache" };
  let result;
  if ((await localAIStatus()) === "available") {
    try {
      result = { ...(await runLocal(kind, data)), provider: "local" };
    } catch {
      /* bounded server fallback */
    }
  }
  if (auth.currentUser?.uid !== uid) throw new Error("La sesión ha cambiado.");
  if (!result) {
    const response = await httpsCallable(functions, kind, { timeout: 85000 })(
      data,
    );
    result = {
      ...validateResponse(kind, response.data),
      provider: "cloud",
      usage: response.data.usage,
    };
  }
  if (auth.currentUser?.uid !== uid) throw new Error("La sesión ha cambiado.");
  if (kind === "generateSentence") {
    if (cache.size >= 30) cache.delete(cache.keys().next().value);
    cache.set(key, result);
  }
  return result;
}
export const aiService = {
  generateSentence: (params, _tier, options) =>
    request("generateSentence", params, options),
  evaluateTranslation: (params) => request("evaluateTranslation", params),
  usage: async () => (await httpsCallable(functions, "aiUsage")()).data,
};
export function clearAICache() {
  cache.clear();
}
