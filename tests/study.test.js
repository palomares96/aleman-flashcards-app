import { test } from "node:test";
import assert from "node:assert/strict";
import {
  studyId,
  applyReview,
  dailyQueue,
  checkAnswer,
  localDay,
  progressStats,
} from "../src/utils/study.js";
import {
  expandVocabulary,
  enrichWord,
  planVocabularyPatch,
} from "../src/utils/vocabulary.js";
import {
  lexicalKey,
  parseVocabularyBackup,
  portableWord,
  vocabularyCSV,
} from "../src/utils/transfer.js";
import {
  validateInput,
  validateResponse,
  buildPrompt,
} from "../functions/shared/aiContracts.mjs";
const now = Date.parse("2026-09-14T10:00:00Z");
const word = {
  id: "base_with_under_scores",
  type: "verb",
  german: "stehen",
  spanish: "estar de pie",
  attributes: {
    separablePrefixes: [
      { prefix: "auf", meaning: "levantarse" },
      { prefix: "an", meaning: "hacer cola" },
    ],
    prefixCatalogVersion: 1,
  },
  progress: { correct: 300 },
};
const event = (cardId, rating, at = now) => ({
  cardId,
  rating,
  at,
  sourceUid: "me",
  wordId: word.id,
  direction: "de-es",
  german: "stehen",
  spanish: "estar de pie",
});
test("all study identities isolate bases, prefixes, directions, sources and underscore collisions", () => {
  const items = expandVocabulary([word]);
  assert.equal(items[1].progress, undefined);
  const ids = items.flatMap((item) =>
    ["de-es", "es-de", "listen"].flatMap((direction) =>
      ["me", "friend"].map((uid) => studyId(item, direction, uid)),
    ),
  );
  assert.equal(new Set(ids).size, 18);
  assert.notEqual(
    studyId({ ...word, id: word.id + "_auf" }, "de-es", "me"),
    studyId(items[1], "de-es", "me"),
  );
});
test("FSRS persists round-trippable state, distinguishes ratings and records ordered reviews", () => {
  const id = studyId(word, "de-es", "me");
  const again = applyReview({}, event(id, 1)),
    easy = applyReview({}, event(id, 4));
  assert.ok(again.schedule.due < easy.schedule.due);
  assert.equal(again.incorrect, 1);
  assert.equal(again.correctStreak, 0);
  assert.equal(easy.correct, 1);
  const next = applyReview(
    JSON.parse(JSON.stringify(easy)),
    event(id, 3, easy.schedule.due),
  );
  assert.equal(next.schedule.reps, 2);
  assert.equal(progressStats(next).totalPlays, 2);
  const lateOffline = applyReview(next, event(id, 1, now - 86400000));
  assert.ok(lateOffline.lastReviewed > next.lastReviewed);
  assert.equal(lateOffline.mistakes.meaning, 1);
  assert.throws(() => applyReview(next, event(id, 5)), /válida/);
});
test("daily queue prioritizes overdue cards, caps new cards and never transfers base history", () => {
  const items = expandVocabulary([word]);
  const progress = {
    [studyId(items[1], "de-es", "me")]: applyReview(
      {},
      event(studyId(items[1], "de-es", "me"), 1, now - 3600000),
    ),
  };
  assert.deepEqual(
    dailyQueue(items, progress, "de-es", "me", now, 1).map((w) => w.id),
    [items[1].id, items[0].id],
  );
  assert.equal(dailyQueue(items, progress, "es-de", "me", now, 2).length, 2);
  assert.equal(dailyQueue(items, progress, "de-es", "me", now, 0).length, 1);
});
test("local calendar days handle timezone boundaries and daylight-saving changes", () => {
  assert.equal(
    localDay(Date.parse("2026-09-14T23:30:00Z"), "Europe/Zurich"),
    "2026-09-15",
  );
  assert.equal(
    localDay(Date.parse("2026-09-14T01:00:00Z"), "America/New_York"),
    "2026-09-13",
  );
  assert.equal(
    localDay(Date.parse("2026-03-29T01:30:00Z"), "Europe/Zurich"),
    "2026-03-29",
  );
});
test("typed answers preserve noun casing/articles, tolerate whitespace and allow explicit alternatives", () => {
  const noun = {
    german: "Haus",
    spanish: "casa",
    type: "noun",
    attributes: { gender: "n" },
    learning: { alternativesEs: ["hogar"] },
  };
  assert.equal(checkAnswer("  das   Haus. ", noun, "es-de").correct, true);
  assert.equal(checkAnswer("das haus", noun, "es-de").type, "capitalization");
  assert.equal(checkAnswer("der Haus", noun, "es-de").type, "article");
  assert.equal(checkAnswer("HOGAR", noun, "de-es").correct, true);
  assert.equal(checkAnswer("Haus", noun, "listen").correct, false);
  assert.equal(
    checkAnswer("aufstehen", { german: "aufstehen", type: "verb" }, "listen")
      .correct,
    true,
  );
});
test("grammar enrichment preserves custom overrides and does not leak base forms to derivatives", () => {
  assert.equal(
    enrichWord({ ...word, grammar: { auxiliary: "custom" } }).grammar.auxiliary,
    "custom",
  );
  assert.equal(expandVocabulary([word])[1].grammar.auxiliary, "sein");
  assert.equal(expandVocabulary([word])[2].grammar, undefined);
  assert.equal(
    planVocabularyPatch({ type: "noun", german: "Haus" }).grammar.plural,
    "die Häuser",
  );
});
test("transfer keys identify noun duplicates while preserving senses and excluding study metadata", () => {
  const noun = { type: "noun", german: "Haus", spanish: "casa" };
  assert.equal(lexicalKey(noun), lexicalKey({ ...noun, german: "HAUS" }));
  assert.notEqual(
    lexicalKey(noun),
    lexicalKey({ ...noun, spanish: "dinastía" }),
  );
  const exported = portableWord({
    ...noun,
    progress: { correct: 99 },
    id: "private",
    importedFrom: { uid: "friend" },
  });
  assert.equal(exported.progress, undefined);
  assert.equal(exported.id, undefined);
  assert.equal(exported.importedFrom, undefined);
  assert.equal(
    parseVocabularyBackup(
      JSON.stringify({
        format: "aleman-vocabulary",
        version: 1,
        words: [noun, noun],
      }),
    ).length,
    1,
  );
  assert.throws(() => parseVocabularyBackup('{"words":[]}'), /copia JSON/);
  assert.match(vocabularyCSV([{ ...noun, spanish: "=SUM(A1)" }]), /'=SUM/);
});
test("AI contracts bound inputs and reject malformed generations and scores before use", () => {
  assert.throws(() =>
    validateInput("generateSentence", { words: [], targetLang: "DE" }),
  );
  assert.throws(() =>
    validateInput("generateSentence", {
      words: Array(7).fill({}),
      targetLang: "DE",
    }),
  );
  assert.throws(() =>
    validateResponse("evaluateTranslation", {
      score: 100,
      feedback: "ok",
      betterTranslation: "ok",
    }),
  );
  assert.throws(() => validateResponse("generateSentence", { sentence: "ok" }));
  assert.throws(() =>
    validateResponse("evaluateTranslation", {
      score: "10",
      feedback: "ok",
      betterTranslation: "ok",
    }),
  );
  const prompt = buildPrompt("generateSentence", {
    words: [
      { term: "stellen", translation: "colocar de pie", usageEs: "vertical" },
    ],
    targetLang: "DE",
    context: "Trabajo",
  });
  assert.match(prompt, /vertical/);
  assert.match(prompt, /Trabajo/);
  assert.equal(
    validateResponse(
      "generateSentence",
      '```json\n{"sentence":"Hallo!","idealTranslation":"¡Hola!"}\n```',
    ).sentence,
    "Hallo!",
  );
});
