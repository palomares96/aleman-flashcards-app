import React, { useEffect, useState } from "react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { readCollection } from "../services/repository.js";
import { offlineEnabled } from "../services/studyStore.js";
export default function SavedExamples({
  user,
  version,
  onUse,
  disabled = false,
}) {
  const [examples, setExamples] = useState([]),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    const key = `aleman:examples:${user.uid}`;
    readCollection(`users/${user.uid}/savedExamples`)
      .then((rows) => {
        if (active) {
          setExamples(rows);
          setLoaded(true);
          if (offlineEnabled(user.uid))
            localStorage.setItem(key, JSON.stringify(rows));
        }
      })
      .catch(() => {
        if (active) {
          try {
            const cached =
              offlineEnabled(user.uid) && JSON.parse(localStorage.getItem(key));
            if (cached) {
              setExamples(cached);
              setLoaded(true);
              return;
            }
          } catch {
            /* show load error */
          }
          setError("No se pudieron cargar los ejemplos guardados.");
        }
      });
    return () => {
      active = false;
    };
  }, [user.uid, version]);
  useEffect(() => {
    if (loaded && offlineEnabled(user.uid)) {
      try {
        localStorage.setItem(
          `aleman:examples:${user.uid}`,
          JSON.stringify(examples),
        );
      } catch {
        setError(
          "Los ejemplos están disponibles, pero no cabe su copia sin conexión.",
        );
      }
    }
  }, [examples, loaded, user.uid]);
  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (!editing.sentence.trim() || !editing.idealTranslation.trim())
        throw new Error("Completa la frase y su traducción.");
      await updateDoc(
        doc(db, `users/${user.uid}/savedExamples/${editing.id}`),
        {
          sentence: editing.sentence,
          idealTranslation: editing.idealTranslation,
          correctedByUser: true,
        },
      );
      setExamples(
        examples.map((item) => (item.id === editing.id ? editing : item)),
      );
      setEditing(null);
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <details className="border border-white/10 p-3 rounded-xl mb-4">
      <summary className="cursor-pointer">
        Ejemplos guardados ({examples.length})
      </summary>
      {error && (
        <p role="alert" className="text-amber-300 mt-3">
          {error}
        </p>
      )}
      <div className="max-h-80 overflow-auto">
        {examples.map((example) => (
          <article
            key={example.id}
            className="border-t border-white/10 py-3 mt-3"
          >
            <p>{example.sentence.replace(/\[[^|]+\|([^\]]+)\]/g, "$1")}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <button
                disabled={disabled}
                onClick={() => onUse(example)}
                className="text-blue-300"
              >
                Practicar
              </button>
              <button onClick={() => setEditing({ ...example })}>
                Corregir
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteDoc(
                      doc(db, `users/${user.uid}/savedExamples/${example.id}`),
                    );
                    setExamples(
                      examples.filter((item) => item.id !== example.id),
                    );
                  } catch (e) {
                    setError(e.message);
                  }
                }}
                className="text-red-300"
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <form onSubmit={save} className="space-y-3">
          <label className="block">
            Frase
            <textarea
              value={editing.sentence}
              maxLength={2000}
              onChange={(e) =>
                setEditing({ ...editing, sentence: e.target.value })
              }
              className="block p-2 w-full bg-gray-800"
            />
          </label>
          <label className="block">
            Traducción
            <textarea
              value={editing.idealTranslation}
              maxLength={2000}
              onChange={(e) =>
                setEditing({ ...editing, idealTranslation: e.target.value })
              }
              className="block p-2 w-full bg-gray-800"
            />
          </label>
          <button className="p-2 bg-blue-600 rounded-xl">
            Guardar corrección
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="p-2"
          >
            Cancelar
          </button>
        </form>
      )}
    </details>
  );
}
