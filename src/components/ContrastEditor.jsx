import React, { useState } from "react";
import { addCustomContrast } from "../services/customContrasts.js";
import { germanAnswer } from "../utils/study.js";
import { prepareContrast } from "../utils/contrasts.js";

const emptyOption = () => ({ wordId: "", form: "", valid: false });
const inputClass = "block w-full mt-1 p-3 rounded-xl bg-gray-800 text-white";

export default function ContrastEditor({
  uid,
  words,
  firstWord,
  onSaved,
  onCancel,
}) {
  const [id] = useState(() => "custom_" + crypto.randomUUID());
  const [choices, setChoices] = useState(() => [
    firstWord
      ? { wordId: firstWord.id, form: firstWord.german, valid: false }
      : emptyOption(),
    emptyOption(),
  ]);
  const [sentence, setSentence] = useState("");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (index, patch) =>
    setChoices((previous) =>
      previous.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const exercise = prepareContrast({
        id,
        sentence,
        explanation,
        wordIds: choices.map((item) => item.wordId),
        words: choices.map(
          (item) => words.find((word) => word.id === item.wordId)?.german,
        ),
        options: choices.map((item) => item.form),
        answers: choices.filter((item) => item.valid).map((item) => item.form),
      });
      await addCustomContrast(uid, exercise);
      onSaved(exercise);
    } catch (failure) {
      setError(
        failure.code
          ? "No se pudo guardar el contraste. Vuelve a intentarlo."
          : failure.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="space-y-4">
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <legend className="text-xl font-bold mb-2">Crear contraste</legend>
        <label className="block">
          Frase con hueco
          <textarea
            required
            maxLength={2000}
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="Escribe ___ en cada hueco"
            className={inputClass}
          />
        </label>
        {choices.map((item, index) => (
          <fieldset
            key={index}
            className="min-w-0 p-3 rounded-xl border border-white/15 space-y-2"
          >
            <legend className="px-1 text-sm text-teal-300">
              Opción {index + 1}
            </legend>
            <label className="block">
              Ficha de la biblioteca
              <select
                required
                value={item.wordId}
                className={inputClass}
                onChange={(e) => {
                  const word = words.find((word) => word.id === e.target.value);
                  change(index, {
                    wordId: word?.id || "",
                    form: word?.german || "",
                    valid: false,
                  });
                }}
              >
                <option value="">Elige una ficha</option>
                {words.map((word) => (
                  <option
                    key={word.id}
                    value={word.id}
                    disabled={choices.some(
                      (choice, i) => i !== index && choice.wordId === word.id,
                    )}
                  >
                    {germanAnswer(word)} · {word.spanish}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Forma en la frase
              <input
                required
                maxLength={1000}
                value={item.form}
                onChange={(e) => change(index, { form: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="flex gap-2 items-center py-2">
              <input
                type="checkbox"
                checked={item.valid}
                onChange={(e) => change(index, { valid: e.target.checked })}
              />
              Encaja en la frase
            </label>
          </fieldset>
        ))}
        {choices.length === 3 ? (
          <button
            type="button"
            className="text-blue-300"
            onClick={() => setChoices(choices.slice(0, 2))}
          >
            Quitar tercera opción
          </button>
        ) : (
          words.length > 2 && (
            <button
              type="button"
              className="text-blue-300"
              onClick={() => setChoices([...choices, emptyOption()])}
            >
              + Añadir tercera ficha
            </button>
          )
        )}
        <label className="block">
          Explicación tras responder
          <textarea
            required
            maxLength={2000}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Si encajan varias opciones, explica qué tienen en común."
            className={inputClass}
          />
        </label>
        {error && (
          <p role="alert" className="text-amber-300">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="p-3 rounded-xl bg-blue-600">
            {busy ? "Guardando…" : "Guardar contraste"}
          </button>
          <button type="button" onClick={onCancel} className="p-3">
            Cancelar
          </button>
        </div>
      </fieldset>
    </form>
  );
}
