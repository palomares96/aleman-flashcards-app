import { createEmptyCard, fsrs } from "ts-fsrs";

export const SCHEDULER_VERSION = "fsrs6-v1";
export const scheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: false,
  maximum_interval: 3650,
});
export const ERROR_LABELS = {
  meaning: "Significado",
  article: "Artículo",
  capitalization: "Mayúsculas",
  spelling: "Ortografía",
  case: "Caso",
  prefix: "Prefijo / posición",
  conjugation: "Conjugación",
};
export const RATINGS = [
  [1, "Otra vez"],
  [2, "Difícil"],
  [3, "Bien"],
  [4, "Fácil"],
];
export function studyId(word, direction, ownerUid) {
  // Tuple encoding prevents collisions between base IDs, prefixes and friends.
  return encodeURIComponent(
    JSON.stringify([
      ownerUid,
      word.baseWordId || word.id,
      word.isDerived ? word.prefix : "",
      direction,
    ]),
  );
}
export function localDay(
  time = Date.now(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(time));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function progressStats(progress = {}) {
  const correct = Number(progress.correct) || 0,
    incorrect = Number(progress.incorrect) || 0;
  const totalPlays = correct + incorrect;
  return {
    ...progress,
    correct,
    incorrect,
    totalPlays,
    errorRate: totalPlays ? incorrect / totalPlays : 0,
    isMastered:
      (progress.schedule?.scheduled_days || 0) >= 21 &&
      (progress.correctStreak || 0) >= 3,
  };
}
export function scheduleCard(progress, rating, at) {
  if (![1, 2, 3, 4].includes(rating) || !Number.isFinite(at))
    throw new Error("Valoración no válida.");
  const effectiveAt = Math.max(at, (progress?.lastReviewed || 0) + 1);
  const prior = progress?.schedule;
  const card = prior
    ? {
        ...prior,
        due: new Date(prior.due),
        ...(prior.last_review
          ? { last_review: new Date(prior.last_review) }
          : {}),
      }
    : createEmptyCard(new Date(effectiveAt));
  const next = scheduler.next(card, new Date(effectiveAt), rating);
  const serialize = (data) =>
    Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value instanceof Date ? value.getTime() : value,
      ]),
    );
  return {
    schedule: serialize(next.card),
    log: serialize(next.log),
    effectiveAt,
  };
}
export function applyReview(previous = {}, event) {
  const { schedule, log, effectiveAt } = scheduleCard(
    previous,
    event.rating,
    event.at,
  );
  const failed = event.rating === 1;
  const mistakes = { ...(previous.mistakes || {}) };
  if (failed)
    mistakes[event.errorType || "meaning"] =
      (mistakes[event.errorType || "meaning"] || 0) + 1;
  return {
    ...previous,
    cardId: event.cardId,
    sourceUid: event.sourceUid,
    wordId: event.wordId,
    direction: event.direction,
    german: event.german,
    spanish: event.spanish,
    schedule,
    schedulerVersion: SCHEDULER_VERSION,
    correct: (previous.correct || 0) + Number(!failed),
    incorrect: (previous.incorrect || 0) + Number(failed),
    correctStreak: failed ? 0 : (previous.correctStreak || 0) + 1,
    lastReviewed: effectiveAt,
    lastRating: event.rating,
    mistakes,
    ...(failed
      ? {
          lastMistake: {
            at: event.at,
            answer: event.answer || "",
            type: event.errorType || "meaning",
          },
        }
      : {}),
    log,
  };
}
export function dailyQueue(
  words,
  progress,
  direction,
  ownerUid,
  now = Date.now(),
  newLimit = 20,
) {
  const due = [],
    unseen = [];
  words.forEach((word) => {
    const p = progress[studyId(word, direction, ownerUid)];
    if (!p?.schedule) unseen.push(word);
    else if (p.schedule.due <= now) due.push(word);
  });
  due.sort(
    (a, b) =>
      progress[studyId(a, direction, ownerUid)].schedule.due -
      progress[studyId(b, direction, ownerUid)].schedule.due,
  );
  return [...due, ...unseen.slice(0, Math.max(0, newLimit))];
}
export const germanAnswer = (word) =>
  `${word.type === "noun" ? { m: "der ", f: "die ", n: "das " }[word.attributes?.gender] || "" : ""}${word.german}`;
const cleanAnswer = (value) =>
  value
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
export function checkAnswer(answer, word, direction) {
  const expected = direction === "de-es" ? word.spanish : germanAnswer(word);
  const alternatives = [
    expected,
    ...(word.learning?.[
      direction === "de-es" ? "alternativesEs" : "alternativesDe"
    ] || []),
  ];
  const actual = cleanAnswer(answer);
  if (
    alternatives.some(
      (value) =>
        cleanAnswer(value) === actual ||
        (direction === "de-es" &&
          cleanAnswer(value).toLowerCase() === actual.toLowerCase()),
    )
  )
    return {
      correct: true,
      expected,
      message: "Coincide con una respuesta guardada.",
    };
  let type = "meaning",
    message =
      "Compara tu respuesta con la solución. Puede haber otras traducciones válidas.";
  if (direction !== "de-es") {
    if (actual.toLowerCase() === cleanAnswer(expected).toLowerCase()) {
      type = "capitalization";
      message =
        word.type === "noun"
          ? "Revisa las mayúsculas: los sustantivos se escriben con inicial mayúscula."
          : "Revisa las mayúsculas: los infinitivos y adjetivos aislados se escriben en minúscula.";
    } else if (
      word.type === "noun" &&
      actual.replace(/^(der|die|das)\s+/i, "").toLowerCase() ===
        word.german.toLowerCase()
    ) {
      type = "article";
      message = "Revisa el artículo del sustantivo.";
    } else if (
      actual
        .toLowerCase()
        .replace(/ae/g, "ä")
        .replace(/oe/g, "ö")
        .replace(/ue/g, "ü")
        .replace(/ss/g, "ß") === expected.toLowerCase().replace(/ss/g, "ß")
    ) {
      type = "spelling";
      message =
        "La forma es cercana. Revisa la ortografía; puedes aceptar esta variante si tu teclado lo requiere.";
    }
  }
  return { correct: false, expected, type, message };
}
