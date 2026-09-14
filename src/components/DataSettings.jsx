import React, { useState, useEffect } from "react";
import { doc, getDocFromServer, updateDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { useStudyData } from "../hooks/useStudyData.js";
import {
  offlineEnabled,
  setOfflineEnabled,
  pendingReviews,
} from "../services/studyStore.js";
import {
  portableWord,
  vocabularyCSV,
  downloadFile,
  parseVocabularyBackup,
} from "../utils/transfer.js";
import { importVocabulary } from "../services/importVocabulary.js";
import { readCollection } from "../services/repository.js";
export default function DataSettings({ user, userProfile, onSharingChange }) {
  const study = useStudyData(user.uid);
  const [offline, setOffline] = useState(() => offlineEnabled(user.uid)),
    [sharing, setSharing] = useState(!!userProfile.shareVocabulary),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(null);
  const [sharingReady, setSharingReady] = useState(false);
  useEffect(() => {
    let active = true;
    getDocFromServer(doc(db, "users", user.uid))
      .then((snapshot) => {
        if (active) {
          setSharing(!!snapshot.data()?.shareVocabulary);
          setSharingReady(true);
        }
      })
      .catch(() => {
        if (active)
          setMessage(
            "No se pudo comprobar si compartes el mazo. Conecta y reabre Datos para cambiar esta preferencia.",
          );
      });
    return () => {
      active = false;
    };
  }, [user.uid]);
  const run = async (task) => {
    setBusy(true);
    setMessage("");
    try {
      await task();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const exportJSON = () =>
    run(async () => {
      const [history, contrasts, examples, sentences, legacy] =
        await Promise.all(
          [
            "reviewEvents",
            "contrastProgress",
            "savedExamples",
            "sentenceAttempts",
            "progress",
          ].map((name) => readCollection(`users/${user.uid}/${name}`)),
        );
      downloadFile(
        "aleman-vocabulario.json",
        JSON.stringify(
          {
            format: "aleman-vocabulary",
            version: 1,
            exportedAt: new Date().toISOString(),
            words: study.words.map(portableWord),
            studyProgress: study.progress,
            studyDays: study.daily,
            reviewEvents: history,
            pendingReviews: pendingReviews(user.uid),
            contrastProgress: contrasts,
            savedExamples: examples,
            sentenceAttempts: sentences,
            legacyProgress: legacy,
          },
          null,
          2,
        ),
        "application/json",
      );
      setMessage(
        "Copia exportada. Al importar se recupera el vocabulario; el historial queda incluido como archivo de consulta.",
      );
    });
  return (
    <section className="space-y-5">
      <h2 className="font-bold text-xl">Datos y privacidad</h2>
      <label className="flex gap-3">
        <input
          type="checkbox"
          checked={sharing}
          disabled={busy || !sharingReady}
          onChange={(e) => {
            const checked = e.target.checked;
            run(async () => {
              await updateDoc(doc(db, "users", user.uid), {
                shareVocabulary: checked,
              });
              setSharing(checked);
              onSharingChange?.(checked);
              setMessage("Preferencia de compartir guardada.");
            });
          }}
        />
        <span>
          Compartir mi vocabulario y sus notas con mis amigos aceptados.
          <small className="block text-gray-400">
            No incluye tu email, progreso ni historial. Desactivarlo revoca el
            acceso; no elimina las copias que ya hayan importado.
          </small>
        </span>
      </label>
      <label className="flex gap-3">
        <input
          type="checkbox"
          checked={offline}
          disabled={busy || study.loading || !!study.error}
          onChange={(e) => {
            const checked = e.target.checked;
            run(async () => {
              setOfflineEnabled(user.uid, checked, userProfile);
              setOffline(checked);
            });
          }}
        />
        <span>
          Guardar mi biblioteca en este dispositivo para estudiar sin conexión.
          <small className="block text-gray-400">
            Úsalo en un dispositivo personal. Los repasos pendientes se
            conservan hasta sincronizarse.
          </small>
        </span>
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          disabled={busy || study.loading || !!study.error}
          onClick={exportJSON}
          className="p-3 bg-blue-600 rounded-xl"
        >
          Exportar copia JSON
        </button>
        <button
          disabled={busy || study.loading || !!study.error}
          onClick={() =>
            run(async () =>
              downloadFile(
                "aleman-vocabulario.csv",
                vocabularyCSV(study.words),
                "text/csv;charset=utf-8",
              ),
            )
          }
          className="p-3 bg-gray-800 rounded-xl"
        >
          Exportar CSV / Anki
        </button>
      </div>
      {study.error && <p role="alert">{study.error}</p>}
      <label className="block">
        Importar vocabulario de una copia JSON
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(null);
            if (file)
              run(async () => {
                if (file.size > 5_000_000) throw new Error("Máximo 5 MB.");
                setPreview(parseVocabularyBackup(await file.text()));
              });
            e.target.value = "";
          }}
          className="mt-2 block w-full text-sm"
        />
      </label>
      {preview && (
        <div className="p-4 bg-gray-800 rounded-xl">
          <p>
            {preview.length} palabras válidas. Se omitirán los duplicados; tu
            progreso actual se conserva.
          </p>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const result = await importVocabulary(user.uid, preview);
                setMessage(
                  `Importadas: ${result.imported}. Ya existentes: ${result.skipped}.`,
                );
                setPreview(null);
              })
            }
            className="mt-3 p-3 bg-blue-600 rounded-xl"
          >
            Importar estas palabras
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-amber-300">
          {message}
        </p>
      )}
    </section>
  );
}
