import test from "node:test";
import assert from "node:assert/strict";
import {
  expandVocabulary,
  prepareWordForSave,
  planVocabularyPatch,
} from "../src/utils/vocabulary.js";
import { checkAnswer, studyId, studyQuestion } from "../src/utils/study.js";
import {
  lexicalKey,
  parseStudyBackup,
  portableWord,
} from "../src/utils/transfer.js";
import { prepareContrast, contrastAnswers } from "../src/utils/contrasts.js";

const expression = {
  id: "expr",
  type: "expression",
  german: "  Das war  keine Absicht. ",
  spanish: "Ha sido sin querer",
  learning: {
    hintEs: "Has tirado un vaso por accidente y quieres disculparte",
    alternativesEs: ["No ha sido a propósito"],
  },
};
const lock = {
  id: "lock",
  type: "noun",
  german: "Schloss",
  spanish: "cerradura",
  attributes: { gender: "n" },
  learning: {
    exampleDe: "Der Schlüssel steckt im Schloss.",
    alternativesEs: ["cerrojo"],
  },
};
const castle = {
  ...lock,
  id: "castle",
  spanish: "castillo",
  learning: {
    exampleDe: "Wir besichtigen das Schloss.",
    alternativesEs: ["palacio"],
  },
};
const exchange = {
  id: "exchange",
  type: "verb",
  german: "umtauschen",
  spanish: "cambiar",
  learning: { hintEs: "cambiar un billete de tren por otro en la taquilla" },
};
const merken = {
  id: "custom_" + crypto.randomUUID(),
  wordIds: ["notice", "remember"],
  words: ["merken", "sich etwas merken"],
  options: ["merke", "merke mir"],
  answers: ["merke"],
  sentence: "Ich ___, dass die Tür offen ist.",
  explanation: "Me doy cuenta de que la puerta está abierta.",
};
const remember = {
  ...merken,
  id: "custom_" + crypto.randomUUID(),
  answers: ["merke mir"],
  sentence: "Ich ___ ___ den Türcode.",
  explanation: "Memorizo el código para usarlo después.",
};
const bulb = {
  id: "custom_" + crypto.randomUUID(),
  wordIds: ["switch", "replace", "notice"],
  words: ["wechseln", "austauschen", "merken"],
  options: ["wechseln", "austauschen", "merken"],
  answers: ["wechseln", "austauschen"],
  sentence: "Ich muss die Glühbirne ___.",
  explanation: "Ambos verbos expresan que se sustituye la bombilla por otra.",
};

test("expressions retain exact text beside a component word and accept their own translations", () => {
  const [card, noun] = expandVocabulary([
    expression,
    { id: "absicht", type: "noun", german: "Absicht", spanish: "intención" },
  ]);
  assert.equal(prepareWordForSave(card).german, expression.german);
  assert.deepEqual(planVocabularyPatch(card), {});
  assert.notEqual(studyId(card, "de-es", "me"), studyId(noun, "de-es", "me"));
  assert.deepEqual(studyQuestion(card, "es-de"), {
    text: card.spanish,
    context: expression.learning.hintEs,
  });
  assert.ok(checkAnswer("No ha sido a propósito", card, "de-es").correct);
  assert.ok(checkAnswer("Das war keine Absicht.", card, "es-de").correct);
  assert.equal(checkAnswer("intención", card, "de-es").correct, false);
  assert.throws(() => prepareWordForSave({ ...card, german: "   " }));
});

test("separate senses have separate questions, alternatives and scheduling IDs", () => {
  assert.deepEqual(studyQuestion(exchange, "es-de"), {
    text: "cambiar",
    context: exchange.learning.hintEs,
  });
  assert.notEqual(lexicalKey(lock), lexicalKey(castle));
  for (const direction of ["es-de", "de-es"])
    assert.notEqual(
      studyId(lock, direction, "me"),
      studyId(castle, direction, "me"),
    );
  assert.deepEqual(studyQuestion(lock, "de-es"), {
    text: "das Schloss",
    context: lock.learning.exampleDe,
  });
  const bareLock = { ...lock, learning: {} };
  assert.match(
    studyQuestion(bareLock, "de-es", [bareLock, castle]).context,
    /además de «castillo»/,
  );
  assert.ok(checkAnswer("cerrojo", lock, "de-es").correct);
  assert.equal(checkAnswer("cerrojo", castle, "de-es").correct, false);
  assert.equal(checkAnswer("palacio", lock, "de-es").correct, false);
});

test("personal clozes keep inflected forms, multiple gaps, overlapping answers and stable IDs in JSON", () => {
  const words = [expression, castle, lock, exchange].map((word) => ({
    ...portableWord(word),
    id: word.id,
  }));
  const customContrasts = [merken, remember, bulb];
  const parsed = parseStudyBackup(
    JSON.stringify({
      format: "aleman-vocabulary",
      version: 1,
      words,
      customContrasts,
    }),
  );
  assert.deepEqual(parsed, { words, customContrasts });
  assert.deepEqual(contrastAnswers(parsed.customContrasts[2]), [
    "wechseln",
    "austauschen",
  ]);
  assert.deepEqual(contrastAnswers({ answer: "stelle" }), ["stelle"]);
  for (const invalid of [
    { answers: [] },
    { sentence: "Kein Platz." },
    { answers: ["other"] },
    { wordIds: ["same", "same"] },
  ])
    assert.throws(() => prepareContrast({ ...merken, ...invalid }));
});
