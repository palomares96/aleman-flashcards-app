import React from "react";
import { enrichWord } from "../utils/vocabulary.js";
import { studyQuestion } from "../utils/study.js";

export default function LearningFields({ word, library, onChange }) {
  const prepared = enrichWord(word);
  const learning = word.learning || prepared.learning || {};
  const update = (field, value) =>
    onChange({ ...learning, [field]: value, source: "user" });
  return (
    <>
      <details className="p-4 rounded-2xl bg-teal-950/30 border border-teal-400/20 space-y-4">
        <summary className="cursor-pointer font-bold text-teal-200">
          Situación, ejemplos y alternativas
        </summary>
        <p className="text-sm text-gray-400">
          Guarda una ficha por significado. Añade aquí las respuestas que
          aceptarías para esta ficha.
        </p>
        {[
          [
            "usageEs",
            "Cómo se usa (español)",
            "Ej.: colocar algo de pie; para tumbarlo se usa legen.",
          ],
          [
            "hintEs",
            "Situación o pista (ES → DE)",
            "¿En qué situación lo dirías?",
          ],
          [
            "exampleDe",
            "Ejemplo en alemán (DE → ES)",
            "Una frase que aclare el significado",
          ],
          [
            "exampleEs",
            "Traducción del ejemplo",
            "Coloco la botella de pie sobre la mesa.",
          ],
        ].map(([field, label, placeholder]) => (
          <label key={field} className="block text-sm text-gray-300">
            {label}
            <textarea
              name={field}
              rows={field === "usageEs" ? 3 : 2}
              value={learning[field] || ""}
              onChange={(event) => update(field, event.target.value)}
              placeholder={placeholder}
              className="mt-1 block w-full rounded-lg bg-gray-800 border border-white/10 p-3 text-white focus:border-teal-400 outline-none"
            />
          </label>
        ))}
        {["De", "Es"].map((lang) => (
          <label key={lang} className="block text-sm text-gray-300">
            Respuestas alternativas ({lang === "De" ? "alemán" : "español"}, una
            por línea)
            <textarea
              name={"alternatives" + lang}
              rows={2}
              value={(learning["alternatives" + lang] || []).join("\n")}
              onChange={(event) =>
                update("alternatives" + lang, event.target.value.split("\n"))
              }
              className="mt-1 block w-full rounded-lg bg-gray-800 p-3 text-white"
            />
          </label>
        ))}
      </details>
      {(word.german || word.spanish) && (
        <section
          aria-label="Vista previa del repaso"
          className="p-4 rounded-xl bg-slate-800 space-y-2"
        >
          <h3 className="text-sm font-semibold text-gray-300">
            Vista previa del repaso
          </h3>
          {["es-de", "de-es"].map((direction) => {
            const { text, context } = studyQuestion(
              prepared,
              direction,
              library,
            );
            return (
              <div
                key={direction}
                className="grid grid-cols-[4rem_1fr] gap-2 text-sm"
              >
                <span className="text-teal-300">
                  {direction === "es-de" ? "ES → DE" : "DE → ES"}
                </span>
                <div className="min-w-0 break-words whitespace-pre-wrap">
                  <span>{text || "…"}</span>
                  {context && <p className="text-gray-300">{context}</p>}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
