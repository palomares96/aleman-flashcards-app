import { progressStats, studyId } from "./study.js";

const hash = (text) =>
  [...text].reduce(
    (value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );

// Stable random draw for a whole round. Remaining cards don't jump around on rerender.
const draw = (seed, id) => (hash(`${seed}:${id}`) + 0.5) / 4294967296;

export function smartWeight(progress, now = Date.now()) {
  const stats = progressStats(progress);
  const newness = 5 / (stats.totalPlays + 1);
  const errors = 10 * stats.errorRate ** 2;
  const due = progress?.schedule?.due <= now ? 2 : 0;
  return 0.1 + newness + errors + due;
}

export function orderStudyCards(
  cards,
  mode,
  seed,
  progress,
  direction,
  ownerUid,
  now = Date.now(),
) {
  if (mode === "review") return [...cards];
  const ordered = cards
    .map((word) => {
      const id = studyId(word, direction, ownerUid);
      const random = draw(seed, id);
      return {
        word,
        score:
          mode === "smart"
            ? -Math.log(random) / smartWeight(progress[id], now)
            : random,
      };
    })
    .sort((a, b) => a.score - b.score);

  // A base verb and its prefix cards are related. Keep them apart when possible.
  const result = [];
  while (ordered.length) {
    const previousFamily = result.at(-1)?.baseWordId || result.at(-1)?.id;
    const counts = new Map();
    ordered.forEach(({ word }) => {
      const family = word.baseWordId || word.id;
      counts.set(family, (counts.get(family) || 0) + 1);
    });
    const dominant = [...counts].find(
      ([, count]) => count > ordered.length / 2,
    )?.[0];
    const next = ordered.findIndex(({ word }) => {
      const family = word.baseWordId || word.id;
      return family !== previousFamily && (!dominant || family === dominant);
    });
    result.push(ordered.splice(next < 0 ? 0 : next, 1)[0].word);
  }
  return result;
}
