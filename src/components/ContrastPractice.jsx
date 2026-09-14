import React, { useEffect, useMemo, useState } from "react";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { useStudyData } from "../hooks/useStudyData.js";
import { readCollection } from "../services/repository.js";
import { CONTRASTS } from "../data/contrasts.js";
export default function ContrastPractice({ user }) {
  const { items, loading: vocabularyLoading } = useStudyData(user.uid);
  const [all, setAll] = useState(false),
    [index, setIndex] = useState(0),
    [answer, setAnswer] = useState(""),
    [history, setHistory] = useState({}),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [repeat, setRepeat] = useState([]);
  const [attemptId, setAttemptId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    readCollection(`users/${user.uid}/contrastProgress`)
      .then((rows) =>
        setHistory(Object.fromEntries(rows.map((row) => [row.id, row]))),
      )
      .catch(() => setError("No se pudo cargar el historial de contrastes."))
      .finally(() => setHistoryLoading(false));
  }, [user.uid]);
  const exercises = useMemo(() => {
    const terms = new Set(items.map((word) => word.german));
    return CONTRASTS.filter(
      (exercise) => all || exercise.words.some((word) => terms.has(word)),
    ).sort(
      (a, b) =>
        Number(history[b.id]?.lastCorrect === false) -
        Number(history[a.id]?.lastCorrect === false),
    );
    // Freeze ordering for this session. Reorder on the next visit.
  }, [items, all, history]);
  const exercise = [...exercises, ...repeat][index];
  const save = async (choice) => {
    if (!exercise || saving) return;
    setAnswer(choice);
    setSaving(true);
    setError("");
    try {
      const ref = doc(db, `users/${user.uid}/contrastProgress/${exercise.id}`);
      const correct = choice === exercise.answer;
      await runTransaction(db, async (tx) => {
        const attemptRef = doc(
          db,
          `users/${user.uid}/contrastAttempts/${attemptId}`,
        );
        const [snap, attempt] = await Promise.all([
            tx.get(ref),
            tx.get(attemptRef),
          ]),
          before = snap.data() || {};
        if (attempt.exists()) return;
        tx.set(attemptRef, {
          exerciseId: exercise.id,
          choice,
          correct,
          createdAt: serverTimestamp(),
        });
        tx.set(ref, {
          attempts: (before.attempts || 0) + 1,
          errors: (before.errors || 0) + Number(!correct),
          lastCorrect: correct,
          lastAnswer: choice,
          lastAttemptId: attemptId,
          updatedAt: serverTimestamp(),
        });
      });
    } catch {
      setError(
        "La respuesta no se ha sincronizado. Reintenta antes de continuar.",
      );
    } finally {
      setSaving(false);
    }
  };
  const next = () => {
    if (answer !== exercise.answer && index < exercises.length)
      setRepeat((previous) => [...previous, exercise]);
    setIndex(index + 1);
    setAnswer("");
    setAttemptId(crypto.randomUUID());
  };
  if (historyLoading || vocabularyLoading)
    return <p role="status">Preparando contrastes…</p>;
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">¿Cuál encaja aquí?</h1>
      <p className="text-gray-400">
        Practica el matiz que cambia la elección de una palabra.
      </p>
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={all}
          disabled={saving}
          onChange={(e) => {
            setAll(e.target.checked);
            setRepeat([]);
            setIndex(0);
            setAnswer("");
            setError("");
            setAttemptId(crypto.randomUUID());
          }}
        />{" "}
        Incluir todos los contrastes, aunque no estén en mi mazo
      </label>
      {exercise ? (
        <div className="p-6 rounded-3xl bg-gray-800 space-y-5">
          <p className="text-sm text-gray-400">
            {index + 1} / {exercises.length + repeat.length}
          </p>
          <p>{exercise.prompt}</p>
          <p lang="de" className="text-2xl">
            {exercise.sentence}
          </p>
          <div className="flex flex-wrap gap-3">
            {exercise.options.map((option) => (
              <button
                key={option}
                disabled={!!answer || saving}
                onClick={() => save(option)}
                className={`p-3 rounded-xl ${answer === option ? "bg-blue-600" : "bg-gray-700"}`}
              >
                {option}
              </button>
            ))}
          </div>
          {answer && (
            <div role="status" className="space-y-3">
              <p
                className={
                  answer === exercise.answer
                    ? "text-green-300"
                    : "text-amber-300"
                }
              >
                {answer === exercise.answer
                  ? "Correcto"
                  : `Respuesta: ${exercise.answer}`}
              </p>
              <p>{exercise.explanation}</p>
              {error ? (
                <button onClick={() => save(answer)} disabled={saving}>
                  Reintentar guardado
                </button>
              ) : (
                <button
                  onClick={next}
                  disabled={saving}
                  className="p-3 bg-blue-600 rounded-xl"
                >
                  Siguiente
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 bg-gray-800 rounded-3xl">
          <p>
            {exercises.length
              ? "Has completado estos contrastes."
              : "Todavía no hay contrastes para tus palabras. Activa todos para practicar."}
          </p>
          <button
            onClick={() => {
              setIndex(0);
              setRepeat([]);
              setAnswer("");
              setAttemptId(crypto.randomUUID());
            }}
            className="mt-4 underline"
          >
            Repetir sesión
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-amber-300">
          {error}
        </p>
      )}
    </section>
  );
}
