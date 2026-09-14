import { LEARNING_VERSION, USAGE_NOTES, VERB_FAMILIES } from '../data/learningCatalog.js';

const clean = value => typeof value === 'string' ? value.normalize('NFC').trim() : '';
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

// Normalize dictionary lemmas, not sentences: preserve nouns in phrases such as
// "Rad fahren", proper names and the formal pronoun "Sie".
export function normalizeGerman(value, type) {
  const term = clean(value).replace(/\s+/g, ' ');
  if (type === 'noun') return term.charAt(0).toLocaleUpperCase('de-DE') + term.slice(1);
  if (type === 'verb') {
    const match = term.match(/^(sich\s+)?([\p{L}|·-]+)$/iu);
    if (match) return (match[1] ? 'sich ' : '') + match[2].replace(/[|·-]/g, '').toLocaleLowerCase('de-DE');
  }
  if (type === 'adjective' && /^[\p{L}-]+$/u.test(term)) return term.toLocaleLowerCase('de-DE');
  return term;
}

export function normalizePrefix(value) {
  const prefix = clean(value).toLocaleLowerCase('de-DE').replace(/[\s|·-]+$/g, '');
  return /^\p{L}+$/u.test(prefix) ? prefix : '';
}

export function normalizePrefixes(prefixes) {
  const seen = new Set();
  return (Array.isArray(prefixes) ? prefixes : []).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const prefix = normalizePrefix(item.prefix);
    const meaning = clean(item.meaning);
    if (!prefix || !meaning || seen.has(prefix)) return [];
    seen.add(prefix);
    return [{ ...item, prefix, meaning }];
  });
}

export function composeSeparableVerb(base, prefix) {
  const lemma = normalizeGerman(base, 'verb');
  const normalizedPrefix = normalizePrefix(prefix);
  if (!normalizedPrefix || !/^(sich )?\p{L}+$/u.test(lemma)) return '';
  return lemma.startsWith('sich ')
    ? `sich ${normalizedPrefix}${lemma.slice(5)}`
    : normalizedPrefix + lemma;
}

export function getSuggestedLearning(word) {
  const german = normalizeGerman(word.german, word.type);
  return USAGE_NOTES[`${word.type}:${german}`] ||
    (word.type === 'verb' && german.startsWith('sich ') ? USAGE_NOTES[`verb:${german.slice(5)}`] : undefined);
}

export function normalizeLearning(learning = {}) {
  learning = learning && typeof learning === 'object' ? learning : {};
  return {
    ...learning,
    version: LEARNING_VERSION,
    usageEs: clean(learning.usageEs),
    hintEs: clean(learning.hintEs),
    exampleDe: clean(learning.exampleDe),
    exampleEs: clean(learning.exampleEs),
  };
}

export function enrichWord(word) {
  const german = normalizeGerman(word.german, word.type);
  const attributes = { ...(word.attributes || {}) };
  // Only seed a missing family. An explicit [] means the user removed it.
  if (word.type === 'verb') {
    let prefixes = own(attributes, 'separablePrefixes')
      ? attributes.separablePrefixes : VERB_FAMILIES[german];
    if (prefixes) {
      prefixes = normalizePrefixes(prefixes);
      const seeds = VERB_FAMILIES[german] || [];
      // Extend an existing nonempty legacy family once, retaining the user's
      // meaning and example when the same prefix is already present.
      if (prefixes.length && !attributes.prefixCatalogVersion) {
        const seen = new Set(prefixes.map(item => item.prefix));
        prefixes = [...prefixes, ...seeds.filter(item => !seen.has(item.prefix))];
      }
      attributes.separablePrefixes = prefixes;
      attributes.prefixCatalogVersion = Math.max(LEARNING_VERSION, Number(attributes.prefixCatalogVersion) || 0);
    }
  }
  const result = { ...word, german, attributes };
  const suggested = getSuggestedLearning(result);
  if (own(word, 'learning')) result.learning = normalizeLearning(word.learning);
  else if (suggested) result.learning = { ...suggested };
  return result;
}

// Additive schema migration. Dot paths avoid replacing unrelated attributes.
// No changes to translations, IDs, progress, categories, or user-authored notes.
export function planVocabularyPatch(word) {
  const enriched = enrichWord(word);
  const patch = {};
  if (enriched.german !== word.german) patch.german = enriched.german;
  const oldPrefixes = word.attributes?.separablePrefixes;
  const newPrefixes = enriched.attributes.separablePrefixes;
  if (word.type === 'verb' && newPrefixes && JSON.stringify(oldPrefixes) !== JSON.stringify(newPrefixes)) {
    patch['attributes.separablePrefixes'] = newPrefixes;
  }
  if (word.type === 'verb' && enriched.attributes.prefixCatalogVersion && enriched.attributes.prefixCatalogVersion !== word.attributes?.prefixCatalogVersion) {
    patch['attributes.prefixCatalogVersion'] = enriched.attributes.prefixCatalogVersion;
  }
  if (!own(word, 'learning') && enriched.learning) patch.learning = enriched.learning;
  if (Object.keys(patch).length) patch.schemaVersion = Math.max(2, Number(word.schemaVersion) || 0);
  return patch;
}

export function applyVocabularyPatch(word, patch) {
  const result = { ...word, attributes: { ...(word.attributes || {}) } };
  for (const [field, value] of Object.entries(patch)) {
    if (field.startsWith('attributes.')) result.attributes[field.slice(11)] = value;
    else result[field] = value;
  }
  return result;
}

export function expandVocabulary(words) {
  return words.flatMap(original => {
    const word = enrichWord(original);
    if (word.type !== 'verb' || word.isDerived) return [word];
    const derived = normalizePrefixes(word.attributes.separablePrefixes).flatMap(prefix => {
      const german = composeSeparableVerb(word.german, prefix.prefix);
      if (!german) return [];
      const card = {
        ...word, id: `${word.id}_${prefix.prefix}`, baseWordId: word.id,
        german, spanish: prefix.meaning, isDerived: true,
        // A derivative can change reflexivity, meaning and conjugation.
        // Never inherit the base verb's usage note or past forms.
        attributes: {},
      };
      delete card.learning;
      const usage = prefix.learning || getSuggestedLearning(card);
      if (usage || prefix.exampleDe) card.learning = normalizeLearning({
        ...usage,
        exampleDe: prefix.exampleDe || usage?.exampleDe,
        exampleEs: prefix.exampleEs || usage?.exampleEs,
      });
      return [card];
    });
    return [word, ...derived];
  });
}

// Shared add/edit/import serialization. Preserve extra metadata from older or
// newer clients while normalizing only the fields this editor owns.
export function prepareWordForSave(word) {
  const result = enrichWord(word);
  result.spanish = clean(word.spanish);
  result.schemaVersion = Math.max(2, Number(word.schemaVersion) || 0);
  if (!result.german || !result.spanish) throw new Error('Escribe la palabra en alemán y su traducción.');
  if (result.learning) result.learning = normalizeLearning(result.learning);
  return result;
}
