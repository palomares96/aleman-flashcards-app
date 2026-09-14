import { progressStats, studyId } from "./study.js";
import { TROPHIES } from "../data/trophies.js";
export function evaluateAchievements(
  uid,
  state,
  friends,
  sentences,
  events,
  categories,
) {
  const words = state.items;
  const ownWords = state.words.filter((word) => !word.importedFrom);
  const progress = Object.values(state.progress).map(progressStats);
  const totalPrefixes = words.filter((word) => word.isDerived).length;
  const masteredWordsByType = {
    noun: 0,
    verb: 0,
    adjective: 0,
    preposition: 0,
    other: 0,
  };
  const totalWordsByType = { ...masteredWordsByType };
  for (const word of words) {
    totalWordsByType[word.type]++;
    if (
      ["de-es", "es-de"].every(
        (direction) =>
          progressStats(state.progress[studyId(word, direction, uid)])
            .isMastered,
      )
    )
      masteredWordsByType[word.type]++;
  }
  const masteredCount = Object.values(masteredWordsByType).reduce(
    (a, b) => a + b,
    0,
  );
  const allDailyStats = Object.values(state.daily)
    .filter((day) => day.reviews)
    .sort((a, b) => a.day.localeCompare(b.day));
  let longestStreak = 0,
    streak = 0,
    previous;
  for (const day of allDailyStats) {
    const at = Date.parse(day.day + "T00:00:00Z");
    streak = at - previous === 86400000 ? streak + 1 : 1;
    longestStreak = Math.max(longestStreak, streak);
    previous = at;
  }
  let sentenceStreak = 0;
  const ordered = [...sentences].sort(
    (a, b) =>
      (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0),
  );
  for (let i = ordered.length - 1; i >= 0 && ordered[i].score > 7; i--)
    sentenceStreak++;
  const friendModePlays = progress
    .filter((p) => p.sourceUid !== uid)
    .reduce((sum, p) => sum + p.totalPlays, 0);
  const sessions = new Map();
  for (const event of events)
    if (event.sessionId)
      sessions.set(event.sessionId, [
        ...(sessions.get(event.sessionId) || []),
        event,
      ]);
  const completedSessions = [...sessions.values()]
    .filter((session) => session.some((e) => e.sessionComplete))
    .sort((a, b) => a[0].at - b[0].at);
  const checks = {
    // === Filtros (NUEVO) ===
    sm_tense_explorer: () => {
      const tensesUsed = new Set(sentences.map((s) => s.tense));
      return (
        tensesUsed.has("Präsens") &&
        (tensesUsed.has("Präteritum") || tensesUsed.has("Perfekt")) &&
        tensesUsed.has("Futur I")
      );
    },
    sm_case_explorer: () => {
      const casesUsed = new Set(sentences.map((s) => s.grammaticalCase));
      return (
        casesUsed.has("acusativo") &&
        casesUsed.has("dativo") &&
        casesUsed.has("genitivo")
      );
    },
    sm_structure_explorer: () => {
      const structuresUsed = new Set(sentences.map((s) => s.sentenceStructure));
      return (
        structuresUsed.has("Hauptsatz") &&
        structuresUsed.has("Nebensatz") &&
        structuresUsed.has("Relativsatz")
      );
    },
    sm_advanced_explorer: () => {
      const moodsUsed = new Set(sentences.map((s) => s.verbMood));
      const voicesUsed = new Set(sentences.map((s) => s.voice));
      return (
        moodsUsed.has("Konjunktiv II") &&
        moodsUsed.has("Imperativ") &&
        voicesUsed.has("Passiv")
      );
    },
    gm_picky_learner: () => {
      const count = events.filter(
        (e) =>
          (e.type === "correct_answer_with_filters" || e.rating > 1) &&
          e.filters?.difficulty,
      ).length;
      return count >= 20;
    },
    gm_category_specialist: () => {
      const count = events.filter(
        (e) =>
          (e.type === "correct_answer_with_filters" || e.rating > 1) &&
          e.filters?.categoryId,
      ).length;
      return count >= 20;
    },
    sm_keyword_user: () =>
      sentences.filter((s) => s.keyword && s.keyword.trim() !== "").length >=
      10,
    sm_kitchen_sink: () =>
      sentences.some((s) => {
        let activeFilters = 0;
        if (s.tense && s.tense !== "any") activeFilters++;
        if (s.grammaticalCase && s.grammaticalCase !== "any") activeFilters++;
        if (s.sentenceStructure && s.sentenceStructure !== "any")
          activeFilters++;
        if (s.verbMood && s.verbMood !== "any") activeFilters++;
        if (s.voice && s.voice !== "any") activeFilters++;
        return activeFilters >= 5;
      }),
    friend_mode_pro: () => friendModePlays >= 100,

    // Palabras añadidas (sin importadas)
    first_word: () => ownWords.length >= 1,
    add_10: () => ownWords.length >= 10,
    add_50: () => ownWords.length >= 50,
    bibliotecario_2: () => ownWords.length >= 100,
    bibliotecario_3: () => ownWords.length >= 200,
    bibliotecario_4: () => ownWords.length >= 500,
    bibliotecario_5: () => ownWords.length >= 1000,
    bibliotecario_6: () => ownWords.length >= 1500,
    bibliotecario_7: () => ownWords.length >= 2000,
    wortmeister: () => ownWords.length >= 2500,
    words_add_10000: () => ownWords.length >= 10000,

    // Maestría
    first_master: () => masteredCount >= 1,
    aprendiz_5: () => masteredCount >= 5,
    debutante_10: () => masteredCount >= 10,
    estudiante_25: () => masteredCount >= 25,
    experto_50: () => masteredCount >= 50,
    maestro_100: () => masteredCount >= 100,
    maestro_250: () => masteredCount >= 250,
    virtuoso: () => masteredCount >= 500,
    sprachgelehrter: () => masteredCount >= 1000,
    sprachmeister: () => masteredCount >= 1500,
    maestro_2000: () => masteredCount >= 2000,
    maestro_3000: () => masteredCount >= 3000,

    // Rachas de días
    daily_7: () => longestStreak >= 7,
    daily_14: () => longestStreak >= 14,
    daily_30: () => longestStreak >= 30,
    streak_daily_60: () => longestStreak >= 60,

    // Rachas de aciertos
    streak_5: () => progress.some((p) => (p.correctStreak || 0) >= 5),
    streak_10: () => progress.some((p) => (p.correctStreak || 0) >= 10),
    streak_25: () => progress.some((p) => (p.correctStreak || 0) >= 25),
    streak_50: () => progress.some((p) => (p.correctStreak || 0) >= 50),
    streak_60: () => progress.some((p) => (p.correctStreak || 0) >= 60),
    streak_correct_100: () =>
      progress.some((p) => (p.correctStreak || 0) >= 100),

    // Amigos
    friend_1: () => friends.length >= 1,
    friend_5: () => friends.length >= 5,
    friend_10: () => friends.length >= 10,

    // Prefijos
    prefixes_5: () => totalPrefixes >= 5,
    prefixes_50: () => totalPrefixes >= 50,

    // Modo Frase
    perfect_sentence: () => sentences.some((s) => (s.score || 0) === 10),
    sentences_5: () => sentences.length >= 5,
    sentences_25: () => sentences.length >= 25,
    sentences_100: () => sentences.length >= 100,
    sentences_250: () => sentences.length >= 250,
    good_sentences_5: () => sentenceStreak >= 5,
    good_sentences_10: () => sentenceStreak >= 10,

    // Palabras extra
    bibliotecario_8: () => words.length >= 3000,
    bibliotecario_9: () => words.length >= 4000,
    bibliotecario_maestro: () => words.length >= 5000,

    // Explorador - Aciertos y palabras jugadas
    correct_50: () =>
      progress.reduce((sum, p) => sum + (p.correct || 0), 0) >= 50,
    correct_100: () =>
      progress.reduce((sum, p) => sum + (p.correct || 0), 0) >= 100,
    correct_500: () =>
      progress.reduce((sum, p) => sum + (p.correct || 0), 0) >= 500,
    correct_1000: () =>
      progress.reduce((sum, p) => sum + (p.correct || 0), 0) >= 1000,
    played_50: () =>
      progress.reduce(
        (sum, p) => sum + ((p.correct || 0) + (p.incorrect || 0)),
        0,
      ) >= 50,
    played_200: () =>
      progress.reduce(
        (sum, p) => sum + ((p.correct || 0) + (p.incorrect || 0)),
        0,
      ) >= 200,
    sentence_scholar: () => sentences.length >= 50,
    versatile_learner: () =>
      new Set(events.filter((e) => e.cardId).map((e) => e.direction)).size >= 2,

    // Dedicación
    day_3: () => allDailyStats.length >= 3,
    day_10: () => allDailyStats.length >= 10,
    day_30: () => allDailyStats.length >= 30,
    day_100: () => allDailyStats.length >= 100,
    marathon: () => longestStreak >= 100,

    // Perfeccionista
    perfect_start: () => completedSessions[0]?.every((e) => e.rating > 1),
    perfect_game: () =>
      completedSessions.some((session) => session.every((e) => e.rating > 1)),
    accuracy_90: () => {
      const totalPlays = progress.reduce(
        (sum, p) => sum + ((p.correct || 0) + (p.incorrect || 0)),
        0,
      );
      const totalCorrect = progress.reduce(
        (sum, p) => sum + (p.correct || 0),
        0,
      );
      return totalPlays > 20 && totalCorrect / totalPlays >= 0.9; // Min 20 jugadas
    },
    sentences_perfect_5: () =>
      sentences.filter((s) => (s.score || 0) === 10).length >= 5,
    sentences_perfect_15: () =>
      sentences.filter((s) => (s.score || 0) === 10).length >= 15,
    sentences_perfect_30: () =>
      sentences.filter((s) => (s.score || 0) === 10).length >= 30,

    // Coleccionista
    noun_master: () => masteredWordsByType.noun >= 50,
    verb_master: () => masteredWordsByType.verb >= 50,
    adjective_master: () => masteredWordsByType.adjective >= 25,
    preposition_master: () => masteredWordsByType.preposition >= 20,
    other_master: () => masteredWordsByType.other >= 20,
    master_all_nouns: () =>
      totalWordsByType.noun > 0 &&
      masteredWordsByType.noun === totalWordsByType.noun,
    master_all_verbs: () =>
      totalWordsByType.verb > 0 &&
      masteredWordsByType.verb === totalWordsByType.verb,

    // Especiales
    first_month: () => allDailyStats.length >= 30,
    trilingual_ambition: () =>
      categories.filter((category) => category.createdBy === uid).length >= 3,
  };

  return TROPHIES.filter((trophy) => checks[trophy.id]?.());
}
