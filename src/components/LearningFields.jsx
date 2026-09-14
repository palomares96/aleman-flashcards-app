import React from 'react';
import { getSuggestedLearning } from '../utils/vocabulary.js';

export default function LearningFields({ word, onChange }) {
  const learning = word.learning || getSuggestedLearning(word) || {};
  const update = (field, value) => onChange({ ...learning, [field]: value, source: 'user' });
  return (
    <fieldset className="p-4 sm:p-5 rounded-2xl bg-teal-950/30 border border-teal-400/20 space-y-4">
      <legend className="px-2 font-bold text-teal-200">Significado y uso</legend>
      <p className="text-sm text-gray-400">Aclara cuándo usar esta palabra. Las notas y ejemplos aparecen al revelar la respuesta.</p>
      {[
        ['usageEs', 'Cómo se usa (español)', 'Ej.: colocar algo de pie; para tumbarlo se usa legen.'],
        ['hintEs', 'Pista para la pregunta (opcional)', 'Ej.: colocar una botella de pie'],
        ['exampleDe', 'Ejemplo en alemán', 'Ich stelle die Flasche auf den Tisch.'],
        ['exampleEs', 'Traducción del ejemplo', 'Coloco la botella de pie sobre la mesa.'],
      ].map(([field, label, placeholder]) => (
        <label key={field} className="block text-sm text-gray-300">
          {label}
          <textarea rows={field === 'usageEs' ? 3 : 2} value={learning[field] || ''}
            onChange={event => update(field, event.target.value)} placeholder={placeholder}
            className="mt-1 block w-full rounded-lg bg-gray-800 border border-white/10 p-3 text-white focus:border-teal-400 outline-none" />
        </label>
      ))}
    </fieldset>
  );
}
