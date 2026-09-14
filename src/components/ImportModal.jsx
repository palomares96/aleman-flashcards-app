import React, { useEffect, useState } from "react";
import { readCollection } from "../services/repository.js";
import { importVocabulary } from "../services/importVocabulary.js";
import { lexicalKey } from "../utils/transfer.js";
export default function ImportModal({ user, friend, onClose }) {
  const [words, setWords] = useState([]),
    [own, setOwn] = useState(new Set()),
    [selected, setSelected] = useState(new Set()),
    [page, setPage] = useState(0),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage("");
    Promise.all([
      readCollection(`users/${friend.id}/words`),
      readCollection(`users/${user.uid}/words`),
    ])
      .then(([shared, mine]) => {
        if (active) {
          setWords(shared);
          setOwn(new Set(mine.map(lexicalKey)));
        }
      })
      .catch(() => {
        if (active)
          setMessage(
            "No se pudo cargar el mazo. Tu amigo debe activar «Compartir vocabulario».",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.uid, friend.id, retry]);
  const pageWords = words.slice(page * 20, (page + 1) * 20);
  const runImport = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await importVocabulary(
        user.uid,
        words.filter((w) => selected.has(w.id)),
        friend,
      );
      setMessage(
        `Importadas: ${result.imported}. Ya existentes: ${result.skipped}.`,
      );
      setOwn(
        new Set([
          ...own,
          ...words.filter((w) => selected.has(w.id)).map(lexicalKey),
        ]),
      );
      setSelected(new Set());
    } catch (e) {
      setMessage(
        `La importación quedó incompleta. Puedes reintentar sin duplicar las palabras importadas. ${e.message}`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Importar de ${friend.displayName}`}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div className="bg-gray-900 rounded-2xl p-5 max-w-xl w-full max-h-[90vh] overflow-auto space-y-4">
        <h2 className="text-xl font-bold">Importar de {friend.displayName}</h2>
        {loading ? (
          <p role="status">Cargando mazo…</p>
        ) : (
          <>
            <p className="text-sm text-gray-400">
              Misma palabra y significado: se omite. Los sentidos distintos se
              conservan. No se copia el progreso de tu amigo.
            </p>
            {pageWords.map((word) => (
              <label
                key={word.id}
                className="flex gap-3 p-3 bg-gray-800 rounded-xl"
              >
                <input
                  type="checkbox"
                  disabled={busy || own.has(lexicalKey(word))}
                  checked={selected.has(word.id)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    e.target.checked ? next.add(word.id) : next.delete(word.id);
                    setSelected(next);
                  }}
                />
                <span>
                  {word.german} — {word.spanish}
                  {own.has(lexicalKey(word)) && (
                    <small className="block text-gray-400">Ya existe</small>
                  )}
                </span>
              </label>
            ))}
            <div className="flex justify-between items-center">
              <button
                disabled={!page || busy}
                onClick={() => setPage(page - 1)}
              >
                ← Anterior
              </button>
              <span>
                {page + 1} / {Math.max(1, Math.ceil(words.length / 20))}
              </span>
              <button
                disabled={(page + 1) * 20 >= words.length || busy}
                onClick={() => setPage(page + 1)}
              >
                Siguiente →
              </button>
            </div>
            <button
              disabled={busy}
              onClick={() =>
                setSelected(
                  new Set([
                    ...selected,
                    ...pageWords
                      .filter((w) => !own.has(lexicalKey(w)))
                      .map((w) => w.id),
                  ]),
                )
              }
              className="underline"
            >
              Seleccionar nuevas de esta página
            </button>
            <button
              disabled={busy || !selected.size}
              onClick={runImport}
              className="block p-3 bg-blue-600 rounded-xl disabled:opacity-40"
            >
              {busy ? "Importando…" : `Importar ${selected.size}`}
            </button>
          </>
        )}
        {message && (
          <p role="status" className="text-amber-300">
            {message}
          </p>
        )}
        {!loading && !words.length && (
          <button onClick={() => setRetry(retry + 1)}>Reintentar carga</button>
        )}
        <button
          onClick={onClose}
          disabled={busy}
          className="p-3 rounded-xl bg-gray-800"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
