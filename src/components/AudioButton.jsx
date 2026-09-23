import React, { useEffect, useState } from "react";
export default function AudioButton({ text, compact = false }) {
  const [status, setStatus] = useState("");
  useEffect(
    () => () => {
      globalThis.speechSynthesis?.cancel();
    },
    [text],
  );
  const speak = () => {
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) {
      setStatus(
        "Este dispositivo no ofrece lectura en voz alta. Puedes seguir con tarjetas o escritura.",
      );
      return;
    }
    const voice = speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.startsWith("de"));
    if (!voice) {
      setStatus(
        "No hay una voz alemana disponible. Actívala en los ajustes de voz del dispositivo y vuelve a intentarlo.",
      );
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.voice = voice;
    utterance.rate = 0.85;
    utterance.onstart = () => setStatus("Reproduciendo…");
    utterance.onend = () => setStatus("");
    utterance.onerror = () =>
      setStatus("No se pudo reproducir el audio. Inténtalo de nuevo.");
    speechSynthesis.speak(utterance);
  };
  return (
    <div className={compact ? "relative" : ""}>
      <button
        type="button"
        onClick={speak}
        aria-label="Escuchar alemán"
        title="Escuchar alemán"
        className={
          compact
            ? "w-11 h-11 flex items-center justify-center rounded-full bg-black/25 text-white"
            : "px-4 py-3 rounded-xl bg-blue-900/60"
        }
      >
        {compact ? <span aria-hidden="true">🔊</span> : "🔊 Escuchar alemán"}
      </button>
      {status && (
        <p
          role="status"
          className={
            compact
              ? "absolute right-0 top-full mt-2 w-56 p-3 rounded-xl bg-slate-900 shadow-xl text-xs text-gray-200 z-20"
              : "text-xs text-gray-400 mt-2"
          }
        >
          {status}
        </p>
      )}
    </div>
  );
}
