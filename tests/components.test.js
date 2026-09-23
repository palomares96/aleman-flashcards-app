import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Exercise the real components and migration with in-memory Firebase adapters.
// No application config, credentials, real auth, or network calls are loaded.
const adapter = `
export const db = {};
export const auth = { currentUser: { uid: 'test' } };
export const state = { writes: [], rows: [], records: {}, beforeTransaction: null, aiCalls: [], failSave: false };
export const aiService = { generateSentence: async data => { state.aiCalls.push({ kind: 'generate', data }); return { sentence: 'Ich [verb|stelle] die Flasche auf den Tisch.', idealTranslation: 'Pongo la botella de pie sobre la mesa.', provider: 'local' }; }, evaluateTranslation: async data => { state.aiCalls.push({ kind: 'evaluate', data }); return { score: 10, feedback: 'Correcto.', betterTranslation: data.idealTranslation }; } };
export const functions = {};
export const getDoc = async ref => ({ exists: () => !!state.records[ref.path], data: () => state.records[ref.path] });
export const getDocFromServer = getDoc;
export const collection = (db, path) => ({ path });
export const doc = (db, ...parts) => ({ path: parts.join('/'), id: parts.at(-1) });
export const query = (ref, ...constraints) => ({ ...ref, constraints });
export const limit = value => ({ limit: value });
export const orderBy = value => ({ order: value });
export const where = (...value) => ({ where: value });
export const startAfter = value => ({ after: value.id });
export const documentId = () => '__name__';
export const increment = value => value;
export const serverTimestamp = () => 'test-time';
export const getDocs = async ref => {
  let rows = ref.path === 'categories' ? [{ id: 'other', name_es: 'Otros' }]
    : ref.path.endsWith('/words') ? [...state.rows] : [];
  if (ref.constraints?.some(item => item.where)) rows = [];
  const after = ref.constraints?.find(item => item.after)?.after;
  if (after) rows = rows.filter(row => row.id > after);
  const max = ref.constraints?.find(item => item.limit)?.limit;
  if (max) rows = rows.slice(0, max);
  const docs = rows.map(row => ({ id: row.id, data: () => structuredClone(row) }));
  return { docs, size: docs.length, empty: !docs.length, forEach: fn => docs.forEach(fn) };
};
export const getDocsFromServer = getDocs;
export const addDoc = async (ref, data) => { state.writes.push({ ref, data }); return { id: 'new' }; };
export const setDoc = async (ref, data) => { if (state.failSave) throw new Error('network unavailable'); state.records[ref.path] = structuredClone(data); state.writes.push({ ref, data }); };
export const updateDoc = async (ref, data) => { state.writes.push({ ref, data }); };
export const deleteDoc = async () => {};
export const useAchievementCheck = () => () => {};
export const runTransaction = async (db, callback) => {
  if (state.beforeTransaction) { state.beforeTransaction(); state.beforeTransaction = null; }
  return callback({
    set: (ref, data) => { state.records[ref.path] = structuredClone(data); state.writes.push({ ref, data }); },
    get: async ref => { const row = ref.path.includes('/words/') ? state.rows.find(row => row.id === ref.id) : state.records[ref.path]; return { exists: () => !!row, data: () => structuredClone(row) }; },
    update: (ref, patch) => {
      state.writes.push({ ref, data: patch });
      const row = ref.path.includes('/words/') ? state.rows.find(row => row.id === ref.id) : (state.records[ref.path] ||= {});
      for (const [key, value] of Object.entries(patch)) {
        if (key.startsWith('attributes.')) { row.attributes ||= {}; row.attributes[key.slice(11)] = value; }
        else row[key] = value;
      }
    }
  });
};
`;

const built = await build({
  stdin: { contents: `
    export { createElement, act } from 'react';
    export { createRoot } from 'react-dom/client';
    export { default as Achievements } from './src/components/Achievements.jsx';
    export { default as SentenceMode } from './src/components/SentenceMode.jsx';
    export { default as Game } from './src/components/Game.jsx';
    export { default as WordForm } from './src/components/WordForm.jsx';
    export { default as VocabularyManager } from './src/components/VocabularyManager.jsx';
    export { backfillOwnVocabulary } from './src/services/vocabularyMigration.js';
    export { clearStudyMemory } from './src/services/studyStore.js';
    export { state, auth } from 'firebase/firestore';
  `, resolveDir: process.cwd(), loader: 'js' },
  bundle: true, format: 'esm', platform: 'browser', write: false,
  plugins: [{ name: 'in-memory-firebase', setup(plugin) {
    plugin.onResolve({ filter: /firebase\/firestore$|\/firebase\.js$|\/aiService(?:\.js)?$/ }, () => ({ path: 'adapter', namespace: 'test' }));
    plugin.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: adapter, loader: 'js' }));
  } }],
});

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.Event = dom.window.Event;
// jsdom does not implement native dialog behavior.
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// React act needs a task queue; use timers to avoid retaining native MessagePorts.
const NativeMessageChannel = globalThis.MessageChannel;
globalThis.MessageChannel = class {
  constructor() { this.port1 = { onmessage: null }; this.port2 = { postMessage: () => setTimeout(() => this.port1.onmessage?.(), 0) }; }
};
after(() => { dom.window.close(); globalThis.MessageChannel = NativeMessageChannel; });
const temporary = await mkdtemp(join(tmpdir(), 'aleman-tests-'));
const moduleFile = join(temporary, 'components.mjs');
await writeFile(moduleFile, built.outputFiles[0].text);
after(() => rm(temporary, { recursive: true, force: true }));
const ui = await import(pathToFileURL(moduleFile));

const baseWord = () => ({ id: 'base_with_underscore', german: 'Stellen', spanish: 'Poner / colocar', type: 'verb', difficulty: 1, categoryId: 'other', attributes: { isRegular: true } });
const container = () => document.getElementById('root');
const click = async element => { assert.ok(element, 'element exists: ' + container().innerHTML.slice(0,1600)); await ui.act(async () => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))); };
const button = label => [...document.querySelectorAll('button')].find(element => element.textContent === label || element.getAttribute('aria-label') === label);
const settings = () => click(button('Ajustes de práctica'));
const closeSheet = () => click(document.querySelector('dialog[open] button'));
const setValue = async (selector, value) => {
  const element = document.querySelector(selector);
  assert.ok(element, selector);
  await ui.act(async () => {
    const prototype = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new window.Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
};
async function mount(Component) {
  ui.clearStudyMemory('test'); localStorage.clear();
  ui.state.rows = [baseWord()]; ui.state.writes = []; ui.state.records = {}; ui.state.aiCalls = []; ui.state.failSave = false;
  const root = ui.createRoot(container());
  await ui.act(async () => root.render(ui.createElement(Component, { user: { uid: 'test' } })));
  return async () => ui.act(async () => root.unmount());
}

test('learning details stay out of the game until opened and do not flip the card', async () => {
  const random = Math.random;
  Math.random = () => 0;
  const unmount = await mount(ui.Game);
  try {
    assert.equal(document.querySelector('aside'), null);
    await settings();
    await setValue('select[aria-label="Dirección"]', 'es-de');
    await closeSheet();
    const card = document.querySelector('[aria-label="Girar tarjeta"]');
    await ui.act(async () => card.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    assert.equal(card.getAttribute('aria-pressed'), 'true');
    assert.equal(document.querySelector('aside'), null);
    await click(button('Ver detalle'));
    assert.equal(document.querySelectorAll('aside li').length, 5);
    assert.match(document.querySelector('aside').textContent, /vorstellen/);
    assert.match(document.querySelector('aside').textContent, /legen/);
    await click(document.querySelector('aside'));
    assert.equal(card.getAttribute('aria-pressed'), 'true');
    await closeSheet();
    await ui.act(async () => new Promise(resolve => setTimeout(resolve, 310)));
    await click(card);
    assert.equal(document.querySelector('aside'), null);
  } finally { await unmount(); Math.random = random; }
});

test('adding a word persists normalized casing and learning fields', async () => {
  const unmount = await mount(ui.WordForm);
  try {
    await setValue('select[name="type"]', 'verb');
    await setValue('input[name="german"]', ' AN|RUFEN ');
    await setValue('input[name="spanish"]', 'Llamar');
    await setValue('textarea', 'Llamar por teléfono.');
    await ui.act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    const saved = ui.state.writes.at(-1).data;
    assert.equal(saved.german, 'anrufen');
    assert.equal(saved.learning.usageEs, 'Llamar por teléfono.');
  } finally { await unmount(); }
});

test('editing a word retains catalogue examples, normalizes casing and saves custom notes', async () => {
  const unmount = await mount(ui.VocabularyManager);
  try {
    const row = [...document.querySelectorAll('span,button,div')].find(element => element.textContent.trim() === 'stellen');
    await click(row);
    await setValue('input[name="german"]', 'STELLEN');
    await setValue('textarea', 'Mi nota personal.');
    await ui.act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    const saved = ui.state.writes.at(-1).data;
    assert.equal(saved.german, 'stellen');
    assert.equal(saved.learning.usageEs, 'Mi nota personal.');
    assert.equal(saved.attributes.separablePrefixes.length, 5);
    assert.ok(saved.attributes.separablePrefixes[0].exampleDe);
  } finally { await unmount(); }
});

test('backfill pages through the full deck and is idempotent on a second run', async () => {
  ui.state.rows = Array.from({ length: 205 }, (_, index) => ({ ...baseWord(), id: String(index).padStart(4, '0') }));
  ui.state.writes = [];
  assert.deepEqual(await ui.backfillOwnVocabulary('test'), { scanned: 205, updated: 205 });
  assert.deepEqual(await ui.backfillOwnVocabulary('test'), { scanned: 205, updated: 0 });
  assert.equal(ui.state.writes.length, 205);
});

test('backfill preserves a concurrent custom note, skips deletion, and stops after sign-out', async () => {
  ui.clearStudyMemory('test'); localStorage.clear();
  ui.state.rows = [baseWord()]; ui.state.writes = []; ui.state.records = {}; ui.state.aiCalls = []; ui.state.failSave = false;
  ui.state.beforeTransaction = () => { ui.state.rows[0].learning = { usageEs: 'Concurrent edit' }; };
  await ui.backfillOwnVocabulary('test');
  assert.equal(ui.state.writes[0].data.learning, undefined);
  assert.equal(ui.state.rows[0].learning.usageEs, 'Concurrent edit');
  ui.state.rows = [baseWord()];
  ui.state.beforeTransaction = () => { ui.state.rows = []; };
  assert.deepEqual(await ui.backfillOwnVocabulary('test'), { scanned: 1, updated: 0 });
  ui.auth.currentUser = null;
  await assert.rejects(ui.backfillOwnVocabulary('test'), /sesión/);
  ui.auth.currentUser = { uid: 'test' };
});

test('typed study requires reveal, classifies errors and persists the chosen direction', async () => {
  const unmount = await mount(ui.Game);
  try {
    assert.ok(![...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === 'Bien'));
    await settings();
    await setValue('select[aria-label="Dirección"]', 'es-de');
    await setValue('select[aria-label="Ejercicio"]', 'type');
    await closeSheet();
    await setValue('input[aria-label="Tu respuesta"]', 'STELLEN');
    await ui.act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    await click(button('Ver detalle'));
    assert.match(container().textContent, /minúscula/);
    await closeSheet();
    await click([...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Otra vez'));
    const event = ui.state.writes.find(write => write.ref.path.includes('/reviewEvents/')).data;
    assert.equal(event.direction, 'es-de');
    assert.equal(event.errorType, 'capitalization');
    assert.equal(event.german, 'stellen');
    assert.equal(event.rating, 1);
    assert.equal(document.querySelector('aside'), null);
  } finally { await unmount(); }
});

test('dictation hides the answer and offers a clear unsupported-audio fallback', async () => {
  const unmount = await mount(ui.Game);
  try {
    await settings();
    await setValue('select[aria-label="Ejercicio"]', 'listen');
    await closeSheet();
    assert.equal(document.querySelector('[aria-label="Girar tarjeta"]'), null);
    assert.equal(document.querySelector('aside'), null);
    await click([...document.querySelectorAll('button')].find(button => button.textContent.includes('Escuchar alemán')));
    assert.match(container().textContent, /no ofrece lectura/);
    await click([...document.querySelectorAll('button')].find(button => button.textContent === 'Mostrar respuesta'));
    await click(button('Ver detalle'));
    assert.match(document.querySelector('aside').textContent, /Familia de stellen/);
  } finally { await unmount(); }
});

test('contrast exercises explain a wrong choice and schedule one corrective repeat', async () => {
  const unmount = await mount(ui.Game);
  try {
    await settings();
    await click([...document.querySelectorAll('button')].find(button => button.textContent === 'Contrastes'));
    await click([...document.querySelectorAll('button')].find(button => button.textContent === 'lege'));
    assert.match(container().textContent, /posición vertical/);
    assert.equal(ui.state.writes.find(write => write.ref.path.includes('/contrastAttempts/')).data.correct, false);
    await click([...document.querySelectorAll('button')].find(button => button.textContent === 'Siguiente'));
    assert.match(container().textContent, /2 \/ 4/);
  } finally { await unmount(); }
});

test('practice preferences survive returning from another mode and settings do not discard a revealed answer', async () => {
  const unmount = await mount(ui.Game);
  try {
    await settings();
    await setValue('select[aria-label="Dirección"]', 'es-de');
    await setValue('select[aria-label="Ejercicio"]', 'type');
    await setValue('select[aria-label="Sesión"]', 'review');
    await closeSheet();
    await click(button('Mostrar respuesta'));
    await settings();
    await closeSheet();
    assert.equal(document.querySelector('[aria-label="Girar tarjeta"]').getAttribute('aria-pressed'), 'true');
    await settings();
    await click(button('Contrastes'));
    await settings();
    await click(button('Repasar'));
    assert.ok(document.querySelector('[aria-label="Tu respuesta"]'));
    await settings();
    assert.equal(document.querySelector('[aria-label="Dirección"]').value, 'es-de');
    assert.equal(document.querySelector('[aria-label="Sesión"]').value, 'review');
    await setValue('select[aria-label="Tipo"]', 'noun');
    await click(button('Quitar filtros y usar mi mazo'));
    assert.equal(document.querySelector('select[aria-label="Tipo"]').value, '');
  } finally { await unmount(); }
});


test('achievements finish loading and record earned milestones without a render loop', async () => {
  const unmount = await mount(ui.Achievements);
  try {
    assert.match(container().textContent, /Progreso Total/);
    const updates = ui.state.writes.filter(write => write.ref.path === 'users/test');
    assert.equal(updates.length, 1);
    assert.ok(updates[0].data.achievements.unlocked.includes('first_word'));
  } finally { await unmount(); }
});

test('sentence evaluation uses language codes and retries a failed save without charging another evaluation', async () => {
  const unmount = await mount(ui.SentenceMode);
  try {
    await click([...document.querySelectorAll('button')].find(button => button.textContent.includes('Generar')));
    const generated = ui.state.aiCalls.find(call => call.kind === 'generate').data;
    assert.equal(generated.context, 'Vida cotidiana');
    assert.equal(new Set(generated.words.map(word => word.term)).size, generated.words.length);
    await setValue('textarea', 'Pongo la botella de pie sobre la mesa.');
    ui.state.failSave = true;
    await ui.act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    const evaluation = ui.state.aiCalls.find(call => call.kind === 'evaluate').data;
    assert.equal(evaluation.sourceLang, 'DE'); assert.equal(evaluation.targetLang, 'ES');
    assert.match(container().textContent, /aún no está guardado/);
    ui.state.failSave = false;
    await click([...document.querySelectorAll('button')].find(button => button.textContent === 'Reintentar guardado'));
    assert.equal(ui.state.aiCalls.filter(call => call.kind === 'evaluate').length, 1);
    assert.equal(ui.state.writes.filter(write => write.ref.path.includes('/sentenceAttempts/')).length, 1);
  } finally { await unmount(); }
});
