#!/usr/bin/env node
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planVocabularyPatch, applyVocabularyPatch } from '../src/utils/vocabulary.js';

const options = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, index, args) => {
  if (arg.startsWith('--')) pairs.push([arg.slice(2), args[index + 1]?.startsWith('--') ? true : args[index + 1] || true]);
  return pairs;
}, []));

if (options.help || (!options.input && (!options.project || !options.uid))) {
  console.log(`Preview a local export (no credentials, no writes to Firestore):
  node scripts/enrich-vocabulary.mjs --input words.json --output .migration-backups/preview.json

Preview the complete personal deck using Google Application Default Credentials:
  node scripts/enrich-vocabulary.mjs --project PROJECT --uid UID --output .migration-backups/plan.json

Apply that exact reviewed plan, skipping documents changed since the preview:
  node scripts/enrich-vocabulary.mjs --project PROJECT --uid UID --apply .migration-backups/plan.json

Google mode requires npm ci --prefix functions and an authorized ADC session.
Local export format: [{ "id": "word-id", "german": "Stellen", "type": "verb", ... }]
Plans contain private vocabulary. Keep them out of Git.`);
  process.exit(options.help ? 0 : 1);
}

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(options.output || '.migration-backups/vocabulary-plan.json');
const summarize = entries => ({
  scanned: entries.length,
  changed: entries.filter(entry => Object.keys(entry.patch).length).length,
  withUsageNotes: entries.filter(entry => entry.patch.learning).length,
  withPrefixChanges: entries.filter(entry => entry.patch['attributes.separablePrefixes']).length,
  // A review queue, not a claim that every unmatched word needs a note.
  withoutCatalogNote: entries.filter(entry => !entry.after.learning?.usageEs).map(entry => ({ id: entry.id, german: entry.after.german, spanish: entry.after.spanish })),
});

let db;
let Timestamp;
if (!options.input) {
  const require = createRequire(resolve(here, '../functions/package.json'));
  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const firestore = require('firebase-admin/firestore');
  Timestamp = firestore.Timestamp;
  initializeApp({ credential: applicationDefault(), projectId: options.project });
  db = firestore.getFirestore();
}

if (options.apply) {
  if (options.input) throw new Error('--apply cannot be combined with --input.');
  const plan = JSON.parse(await readFile(resolve(options.apply), 'utf8'));
  if (plan.project !== options.project || plan.uid !== options.uid || plan.version !== 1) throw new Error('Plan target/version does not match.');
  const result = { applied: 0, skippedChanged: 0, unchanged: 0 };
  for (const entry of plan.entries) {
    if (!Object.keys(entry.patch).length) { result.unchanged++; continue; }
    if (!entry.id || entry.id.includes('/') || !entry.updateTime) throw new Error('Invalid document identity/precondition.');
    // Only execute patches that this version of the planner itself produces.
    if (JSON.stringify(planVocabularyPatch(entry.before)) !== JSON.stringify(entry.patch)) throw new Error('Plan has changed; regenerate it.');
    try {
      await db.collection(`users/${options.uid}/words`).doc(entry.id).update(entry.patch, {
        lastUpdateTime: new Timestamp(entry.updateTime.seconds, entry.updateTime.nanoseconds),
      });
      result.applied++;
    } catch (error) {
      if ([5, 9].includes(error.code)) result.skippedChanged++;
      else throw error;
    }
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.skippedChanged) process.exitCode = 2;
} else {
  let records;
  if (options.input) {
    records = JSON.parse(await readFile(resolve(options.input), 'utf8'));
    if (!Array.isArray(records)) throw new Error('Input must be an array of vocabulary documents.');
  } else {
    records = [];
    let cursor;
    do {
      let query = db.collection(`users/${options.uid}/words`).orderBy('__name__').limit(200);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      records.push(...page.docs.map(snapshot => ({ ...snapshot.data(), id: snapshot.id, _updateTime: { seconds: snapshot.updateTime.seconds, nanoseconds: snapshot.updateTime.nanoseconds } })));
      cursor = page.size === 200 ? page.docs.at(-1) : null;
    } while (cursor);
  }
  const entries = records.map(({ id, _updateTime, ...before }) => {
    const patch = planVocabularyPatch(before);
    return { id, updateTime: _updateTime || null, before, patch, after: applyVocabularyPatch(before, patch) };
  });
  const summary = summarize(entries);
  const plan = { version: 1, project: options.project || null, uid: options.uid || null, createdAt: new Date().toISOString(), summary, entries };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(plan, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ ...summary, withoutCatalogNote: summary.withoutCatalogNote.length, planFile: output, applied: 0 }, null, 2));
}
