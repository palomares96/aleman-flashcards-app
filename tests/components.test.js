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
export const state = { writes: [], rows: [], beforeTransaction: null };
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
export const addDoc = async (ref, data) => { state.writes.push({ ref, data }); return { id: 'new' }; };
export const setDoc = async (ref, data) => { state.writes.push({ ref, data }); };
export const updateDoc = async (ref, data) => { state.writes.push({ ref, data }); };
export const deleteDoc = async () => {};
export const useAchievementCheck = () => () => {};
export const runTransaction = async (db, callback) => {
  if (state.beforeTransaction) { state.beforeTransaction(); state.beforeTransaction = null; }
  return callback({
    get: async ref => { const row = state.rows.find(row => row.id === ref.id); return { exists: () => !!row, data: () => structuredClone(row) }; },
    update: (ref, patch) => {
      state.writes.push({ ref, data: patch });
      const row = state.rows.find(row => row.id === ref.id);
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
    export { default as Game } from './src/components/Game.jsx';
    export { default as WordForm } from './src/components/WordForm.jsx';
    export { default as VocabularyManager } from './src/components/VocabularyManager.jsx';
    export { backfillOwnVocabulary } from './src/services/vocabularyMigration.js';
    export { state, auth } from 'firebase/firestore';
  `, resolveDir: process.cwd(), loader: 'js' },
  bundle: true, format: 'esm', platform: 'browser', write: false,
  plugins: [{ name: 'in-memory-firebase', setup(plugin) {
    plugin.onResolve({ filter: /firebase\/firestore$|\/firebase\.js$|\/useAchievementCheck\.js$/ }, () => ({ path: 'adapter', namespace: 'test' }));
    plugin.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: adapter, loader: 'js' }));
  } }],
});

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
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
  ui.state.rows = [baseWord()]; ui.state.writes = [];
  const root = ui.createRoot(container());
  await ui.act(async () => root.render(ui.createElement(Component, { user: { uid: 'test' } })));
  return async () => ui.act(async () => root.unmount());
}

test('revealing a card shows its family and usage notes; panel clicks do not flip it', async () => {
  const random = Math.random;
  Math.random = () => 0;
  const unmount = await mount(ui.Game);
  try {
    assert.equal(document.querySelector('aside'), null);
    await click([...document.querySelectorAll('button')].find(element => element.title === 'Alemán -> Español'));
    const card = document.querySelector('[aria-label="Girar tarjeta"]');
    await ui.act(async () => card.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    assert.equal(card.getAttribute('aria-pressed'), 'true');
    assert.equal(document.querySelectorAll('aside li').length, 5);
    assert.match(document.querySelector('aside').textContent, /vorstellen/);
    assert.match(document.querySelector('aside').textContent, /legen/);
    await click(document.querySelector('aside'));
    assert.equal(card.getAttribute('aria-pressed'), 'true');
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
  ui.state.rows = [baseWord()]; ui.state.writes = [];
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
