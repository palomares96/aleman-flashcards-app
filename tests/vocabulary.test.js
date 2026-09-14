import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGerman, normalizePrefixes, composeSeparableVerb, enrichWord, expandVocabulary, planVocabularyPatch, applyVocabularyPatch, prepareWordForSave } from '../src/utils/vocabulary.js';
import { USAGE_NOTES, VERB_FAMILIES } from '../src/data/learningCatalog.js';

test('prefix casing is consistent for legacy, edited and reflexive verbs', () => {
  for (const term of ['Anrufen', 'ANRUFEN', ' An|rufen ', 'An·Rufen', 'an-rufen']) assert.equal(normalizeGerman(term, 'verb'), 'anrufen');
  assert.equal(composeSeparableVerb(' Stehen ', ' AUF- '), 'aufstehen');
  assert.equal(composeSeparableVerb('Sich Ziehen', 'AN'), 'sich anziehen');
  assert.equal(normalizeGerman('sich An|ziehen', 'verb'), 'sich anziehen');
  assert.equal(normalizeGerman('Rad fahren', 'verb'), 'Rad fahren');
  assert.equal(normalizeGerman('Sie', 'other'), 'Sie');
  assert.equal(normalizeGerman('über das Haus', 'preposition'), 'über das Haus');
  assert.equal(normalizeGerman('haus', 'noun'), 'Haus');
  assert.equal(normalizeGerman('SCHÖN', 'adjective'), 'schön');
  assert.equal(composeSeparableVerb('Rad fahren', 'ab'), '');
});

test('dirty legacy prefix arrays are normalized, deduplicated, and not mutated', () => {
  const prefixes = [{ prefix: 'AB-', meaning: ' Salir ', exampleDe: 'Der Bus fährt ab.' }, { prefix: 'ab', meaning: 'duplicate' }, null, { prefix: '', meaning: 'empty' }];
  assert.deepEqual(normalizePrefixes(prefixes), [{ prefix: 'ab', meaning: 'Salir', exampleDe: 'Der Bus fährt ab.' }]);
  assert.equal(prefixes[0].prefix, 'AB-');
});

test('known base verbs get real families; unknown and already prefixed verbs get no invented combinations', () => {
  assert.equal(enrichWord({ german: 'Machen', type: 'verb' }).attributes.separablePrefixes.length, 5);
  assert.equal(enrichWord({ german: 'erfinden', type: 'verb' }).attributes.separablePrefixes, undefined);
  assert.equal(enrichWord({ german: 'Anrufen', type: 'verb' }).attributes.separablePrefixes, undefined);
});

test('migration extends legacy families once without changing custom meanings, translations, progress or other attributes', () => {
  const before = { id: 'has_underscore', german: 'Stellen', spanish: 'Mi traducción', type: 'verb', attributes: { custom: 123, separablePrefixes: [{ prefix: 'VOR', meaning: 'Mi significado' }] }, progress: { correct: 10 } };
  const patch = planVocabularyPatch(before);
  assert.equal(patch.german, 'stellen');
  assert.equal(patch['attributes.separablePrefixes'][0].meaning, 'Mi significado');
  assert.ok(patch.learning.usageEs.includes('legen'));
  const after = applyVocabularyPatch(before, patch);
  assert.equal(after.attributes.custom, 123);
  assert.equal(after.spanish, before.spanish);
  assert.deepEqual(after.progress, before.progress);
  assert.deepEqual(planVocabularyPatch(after), {});
  assert.equal(before.german, 'Stellen');
});

test('user notes, explicit empty families, removals and newer schema versions survive migrations', () => {
  const before = { german: 'stellen', type: 'verb', schemaVersion: 5, learning: { usageEs: 'Mi nota' }, attributes: { separablePrefixes: [] } };
  const patch = planVocabularyPatch(before);
  assert.equal(patch.learning, undefined);
  assert.equal(patch.schemaVersion, 5);
  assert.deepEqual(enrichWord(before).attributes.separablePrefixes, []);
  const removed = { ...before, attributes: { prefixCatalogVersion: 1, separablePrefixes: [{ prefix: 'ab', meaning: 'Dejar' }] } };
  assert.equal(enrichWord(removed).attributes.separablePrefixes.length, 1);
});

test('derivatives keep stable base IDs and do not inherit wrong conjugations or notes', () => {
  const cards = expandVocabulary([{ id: 'my_base_id', german: 'Stehen', spanish: 'estar de pie', type: 'verb', attributes: { pastTense: 'stand', participle: 'gestanden', separablePrefixes: [{ prefix: 'AUF', meaning: 'levantarse' }] } }]);
  const derived = cards.find(card => card.german === 'aufstehen');
  assert.equal(derived.baseWordId, 'my_base_id');
  assert.equal(derived.id, 'my_base_id_auf');
  assert.equal(derived.attributes.participle, undefined);
  assert.match(derived.learning.usageEs, /levantarse/i);
  assert.equal(expandVocabulary([derived]).length, 1);
});

test('saving or importing preserves notes and custom metadata and normalizes German', () => {
  const saved = prepareWordForSave({ german: ' Anrufen ', spanish: ' Llamar ', type: 'verb', importedFrom: { uid: 'friend' }, learning: { usageEs: ' Por teléfono ', exampleDe: 'Ich rufe dich an.' }, attributes: { custom: 42 } });
  assert.equal(saved.german, 'anrufen');
  assert.equal(saved.learning.usageEs, 'Por teléfono');
  assert.equal(saved.attributes.custom, 42);
  assert.deepEqual(saved.importedFrom, { uid: 'friend' });
  assert.throws(() => prepareWordForSave({ german: '', spanish: '' }));
});

test('catalogue shape and all seeded migrations are repeatable', () => {
  for (const [lemma, family] of Object.entries(VERB_FAMILIES)) {
    assert.equal(normalizePrefixes(family).length, family.length, lemma);
    for (const item of family) {
      assert.ok(composeSeparableVerb(lemma, item.prefix), lemma);
      assert.ok(item.exampleDe && item.exampleEs, lemma);
    }
  }
  for (const [key, learning] of Object.entries(USAGE_NOTES)) {
    const [type, german] = key.split(':');
    assert.ok(learning.usageEs && learning.exampleDe && learning.exampleEs, key);
    const word = { german, type, spanish: 'sample' };
    const migrated = applyVocabularyPatch(word, planVocabularyPatch(word));
    assert.deepEqual(planVocabularyPatch(migrated), {}, key);
  }
});
