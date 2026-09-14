import React, { useState } from "react";
import { useStudyData } from "../hooks/useStudyData.js";
import { ERROR_LABELS } from "../utils/study.js";
export default function MistakesNotebook({ user, onPractice }) {
  const { progress, loading, error, reload } = useStudyData(user.uid);
  const [type, setType] = useState("");
  const mistakes = Object.entries(progress)
    .filter(([, item]) => item.incorrect && (!type || item.mistakes?.[type]))
    .sort(
      (a, b) =>
        (b[1].mistakes?.[type] || b[1].incorrect) -
        (a[1].mistakes?.[type] || a[1].incorrect),
    );
  const groups = new Map();
  mistakes.forEach(([id, item]) => {
    const key = JSON.stringify([item.sourceUid, item.direction]);
    const group = groups.get(key) || {
      ids: [],
      sourceUid: item.sourceUid,
      direction: item.direction,
    };
    group.ids.push(id);
    groups.set(key, group);
  });
  if (loading) return <p role="status">Cargando errores…</p>;
  if (error)
    return (
      <div role="alert">
        {error}
        <button onClick={reload}>Reintentar</button>
      </div>
    );
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Mis errores</h1>
      <p className="text-gray-400">
        Los errores se conservan aunque después aciertes. El repaso correctivo
        empieza con tus patrones más frecuentes.
      </p>
      <select
        aria-label="Filtrar errores"
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="p-3 bg-gray-800 rounded-xl"
      >
        <option value="">Todos los tipos</option>
        {Object.entries(ERROR_LABELS).map(([key, label]) => (
          <option value={key} key={key}>
            {label}
          </option>
        ))}
      </select>
      {[...groups.entries()].map(([key, group]) => (
        <button
          key={key}
          onClick={() => onPractice({ ...group, ids: group.ids.slice(0, 10) })}
          className="block p-3 bg-blue-600 rounded-xl"
        >
          Repasar hasta 10 ·{" "}
          {group.direction === "listen"
            ? "Dictado"
            : group.direction.toUpperCase()}{" "}
          {group.sourceUid !== user.uid ? "(mazo de amigo)" : ""}
        </button>
      ))}
      {!mistakes.length && (
        <p className="p-6 bg-gray-800 rounded-xl">
          No hay errores registrados con este filtro.
        </p>
      )}
      {mistakes.map(([id, item]) => (
        <article key={id} className="p-5 bg-gray-800 rounded-2xl">
          <h2 className="font-bold text-xl">
            {item.german}{" "}
            <span className="text-sm text-gray-400">{item.direction}</span>
          </h2>
          <p>{item.spanish}</p>
          <p className="text-sm text-gray-400 my-2">
            {Object.entries(item.mistakes || {})
              .map(([key, count]) => `${ERROR_LABELS[key] || key}: ${count}`)
              .join(" · ")}
          </p>
          {item.lastMistake?.answer && (
            <p className="text-sm">
              Tu último intento fallido: <q>{item.lastMistake.answer}</q>
            </p>
          )}
          <p className="text-xs text-teal-300 mt-2">
            {item.lastRating > 1
              ? "Último repaso recordado"
              : "Pendiente de corregir"}
          </p>
        </article>
      ))}
    </section>
  );
}
