import React, { useEffect, useState } from "react";
export default function AudioButton({ text }) {
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
    <div>
      <button
        type="button"
        onClick={speak}
        className="px-4 py-3 rounded-xl bg-blue-900/60"
      >
        🔊 Escuchar alemán
      </button>
      {status && (
        <p role="status" className="text-xs text-gray-400 mt-2">
          {status}
        </p>
      )}
    </div>
  );
}
