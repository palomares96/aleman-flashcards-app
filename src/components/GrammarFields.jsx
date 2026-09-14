import React from "react";
import { enrichWord } from "../utils/vocabulary.js";
export default function GrammarFields({ word, onChange }) {
  const grammar = enrichWord(word).grammar || {};
  const fields =
    word.type === "noun"
      ? [["plural", "Plural (con artículo)"]]
      : word.type === "verb"
        ? [
            ["principalParts", "Formas: presente · Präteritum · participio"],
            ["auxiliary", "Auxiliar del Perfekt"],
            ["pattern", "Caso y preposición"],
            ["mainClause", "Ejemplo en oración principal"],
            ["subordinateClause", "Ejemplo en subordinada"],
          ]
        : [["pattern", "Caso y preposición"]];
  return (
    <fieldset className="p-4 rounded-2xl border border-blue-400/20 space-y-3">
      <legend className="px-2 text-blue-200 font-bold">
        Gramática (opcional)
      </legend>
      {[...fields, ["registerEs", "Matiz o registro (español)"]].map(
        ([key, label]) => (
          <label key={key} className="block text-sm text-gray-300">
            {label}
            <input
              value={grammar[key] || ""}
              onChange={(e) =>
                onChange({ ...grammar, [key]: e.target.value, source: "user" })
              }
              className="block mt-1 p-3 bg-gray-800 rounded-lg w-full"
            />
          </label>
        ),
      )}
    </fieldset>
  );
}
