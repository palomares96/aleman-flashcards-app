import React from 'react';
import { composeSeparableVerb, enrichWord, normalizePrefixes } from '../utils/vocabulary.js';

export default function WordLearningPanel({ word, showFamily = true }) {
  const enriched = enrichWord(word);
  const learning = enriched.learning || {};
  const grammar = enriched.grammar || {};
  const labels = { plural: 'Plural', principalParts: 'Formas principales', auxiliary: 'Auxiliar del Perfekt', pattern: 'Construcción', mainClause: 'Oración principal', subordinateClause: 'Oración subordinada', registerEs: 'Matiz' };
  const grammarRows = Object.entries(labels).filter(([key]) => grammar[key]);
  const family = showFamily && word.type === 'verb' && !word.isDerived
    ? normalizePrefixes(enriched.attributes.separablePrefixes) : [];
  const validFamily = family.filter(item => composeSeparableVerb(enriched.german, item.prefix));
  if (!learning.usageEs && !learning.exampleDe && !validFamily.length && !grammarRows.length) return null;
  return (
    <aside aria-label="Ayuda para aprender la palabra" className="relative mt-6 space-y-4 text-left">
      {(learning.usageEs || learning.exampleDe) && (
        <section className="rounded-2xl border border-teal-400/20 bg-teal-950/30 p-5">
          <h3 className="text-sm font-bold text-teal-200 mb-2">Cuándo usarla</h3>
          {learning.usageEs && <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-line">{learning.usageEs}</p>}
          {learning.exampleDe && <div className="mt-3 border-l-2 border-teal-400/50 pl-3">
            <p lang="de" className="text-white text-sm leading-relaxed">{learning.exampleDe}</p>
            {learning.exampleEs && <p lang="es" className="text-gray-400 text-sm mt-1">{learning.exampleEs}</p>}
          </div>}
        </section>
      )}
      {grammarRows.length > 0 && <section className="p-5 rounded-2xl border border-blue-400/20 bg-blue-950/20"><h3 className="font-bold text-blue-200 mb-3">Gramática</h3><dl className="space-y-3">{grammarRows.map(([key, label]) => <div key={key}><dt className="text-xs text-gray-400">{label}</dt><dd className="text-sm mt-1">{grammar[key]}</dd></div>)}</dl></section>}
      {validFamily.length > 0 && (
        <section className="rounded-2xl border border-orange-400/20 bg-orange-950/20 p-5">
          <h3 className="text-sm font-bold text-orange-200">Familia de {enriched.german}</h3>
          <p className="text-xs text-gray-400 mt-1 mb-4">Verbos con prefijo separable · el significado puede cambiar.</p>
          <ul className="divide-y divide-white/10">
            {validFamily.map(item => (
              <li key={item.prefix} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span lang="de" className="font-semibold text-orange-100 break-words">{composeSeparableVerb(enriched.german, item.prefix)}</span>
                  <span className="text-sm text-gray-200">{item.meaning}</span>
                </div>
                <p className="text-xs text-orange-300/70 mt-1">{item.prefix} + {enriched.german}</p>
                {item.exampleDe && <p lang="de" className="mt-2 text-sm text-gray-300">{item.exampleDe}</p>}
                {item.exampleEs && <p lang="es" className="text-xs text-gray-400 mt-1">{item.exampleEs}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
