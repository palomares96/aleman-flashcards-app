import StudySheet from "./StudySheet.jsx";
import WordLearningPanel from "./WordLearningPanel.jsx";
import {
  composeSeparableVerb,
  enrichWord,
  expandVocabulary,
  normalizePrefixes,
} from "../utils/vocabulary.js";
import React, { useState, useEffect, useRef } from "react";
import { useStudyData } from "../hooks/useStudyData.js";
import { recordReview } from "../services/studyStore.js";
import { readCollection } from "../services/repository.js";
import {
  studyId,
  progressStats,
  germanAnswer,
  studyQuestion,
  checkAnswer,
  ERROR_LABELS,
} from "../utils/study.js";
import { orderStudyCards } from "../utils/studyQueue.js";
import AudioButton from "./AudioButton.jsx";
import ContrastPractice from "./ContrastPractice.jsx";

const prepositionCases = new Map([
  ["Akkusativ", { label: "Acusativo", colors: "from-rose-600 to-rose-800" }],
  ["Dativ", { label: "Dativo", colors: "from-blue-600 to-blue-800" }],
  ["Genitiv", { label: "Genitivo", colors: "from-violet-600 to-violet-800" }],
  [
    "Wechselpräposition",
    { label: "Dativo o acusativo", colors: "from-teal-600 to-teal-800" },
  ],
]);

// --- ICONOS ---
const FilterIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-6 h-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
    />
  </svg>
);
const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
    className="w-6 h-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);
const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
    className="w-6 h-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
const SwapIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    />
  </svg>
);
const RotateIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 opacity-60"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

// =================================================================================
// COMPONENTE VISUAL: CARA DE LA TARJETA
// =================================================================================
const CardFace = ({ palabra, isFront, direction, baseGradientClasses, library }) => {
  const isGermanSide =
    (isFront && direction === "de-es") || (!isFront && direction === "es-de");
  const question = studyQuestion(palabra, direction, library);
  const displayMain = isFront ? question.text : isGermanSide ? germanAnswer(palabra) : palabra.spanish;
  const context = isFront ? question.context : !isGermanSide && palabra.learning?.hintEs;
  const langLabel = isGermanSide ? "ALEMÁN" : "ESPAÑOL";

  // Diccionarios para visualización
  const genderLabels = { m: "Masculino", f: "Femenino", n: "Neutral" };

  let typeInfo = "";

  if (isGermanSide) {
    if (palabra.type === "noun" && palabra.attributes?.gender) {
      typeInfo = `Sustantivo • ${genderLabels[palabra.attributes.gender] || ""}`;
    } else if (palabra.type === "preposition") {
      const grammaticalCase = palabra.attributes?.case;
      typeInfo = `Preposición · ${prepositionCases.get(grammaticalCase)?.label || grammaticalCase || "Caso sin indicar"}`;
    } else {
      typeInfo =
        {
          verb: "Verbo",
          adjective: "Adjetivo",
          expression: "Expresión",
          other: "Palabra",
        }[palabra.type] || "Palabra";
    }
  } else {
    typeInfo = "Traducción";
  }

  // Estilo Glossy con corte diagonal nítido
  const sharpReflectionStyle = {
    background:
      "linear-gradient(125deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0) 45.1%, rgba(0,0,0,0.1) 100%)",
  };

  const neutralGradient = "bg-gradient-to-br from-gray-700 to-gray-800";
  const faceGradient = isGermanSide ? baseGradientClasses : neutralGradient;
  const revealedVerb =
    !isFront && palabra.type === "verb" && !palabra.isDerived
      ? enrichWord(palabra)
      : null;
  const family = revealedVerb
    ? normalizePrefixes(revealedVerb.attributes.separablePrefixes)
        .map((item) => ({
          ...item,
          german: composeSeparableVerb(revealedVerb.german, item.prefix),
        }))
        .filter((item) => item.german)
    : [];
  const forms =
    revealedVerb?.grammar?.principalParts ||
    (revealedVerb?.attributes?.pastTense && revealedVerb?.attributes?.participle
      ? `${revealedVerb.attributes.pastTense} · ${revealedVerb.attributes.participle}`
      : "");

  return (
    <div
      className={`
            relative w-full h-full rounded-[2rem]
            ${faceGradient} 
            backdrop-blur-xl border border-white/20 shadow-2xl 
            study-card-face flex flex-col overflow-y-auto
        `}
    >
      {/* Capa de brillo */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={sharpReflectionStyle}
      ></div>

      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <span className="text-xs font-bold tracking-[0.2em] text-white/70 uppercase">
          {langLabel}
        </span>
        {isFront && (
          <div className="animate-pulse">
            <RotateIcon />
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col justify-center z-10 my-3">
        <h2 className="study-card-word whitespace-pre-wrap font-bold text-white mb-2 tracking-tight leading-tight drop-shadow-md break-words">
          {displayMain}
        </h2>
        {context && (
          <p className="text-sm text-white/80 mb-3">
            {context}
          </p>
        )}
        {!(revealedVerb && !isGermanSide) && (
          <p className="text-sm text-white/80 font-medium tracking-wide">
            {typeInfo}
          </p>
        )}

        {revealedVerb && (
          <div className="mt-3 pt-3 border-t border-white/20 space-y-2 text-sm">
            {!isGermanSide && (
              <p className="font-semibold text-white">{revealedVerb.german}</p>
            )}
            <p className="text-white/90">
              <span className="font-semibold">Conjugación:</span>{" "}
              {forms || "Aún no añadida"}
            </p>
            {revealedVerb.grammar?.auxiliary && (
              <p className="text-white/75">
                Perfekt con {revealedVerb.grammar.auxiliary}
              </p>
            )}
            {family.length > 0 && (
              <div className="pt-2 border-t border-white/15">
                <p className="font-semibold text-white/90 mb-1">
                  Derivados · {Math.min(2, family.length)} de {family.length}
                </p>
                <ul className="space-y-1 text-white/85">
                  {family.slice(0, 2).map((item) => (
                    <li key={item.prefix} className="break-words">
                      {item.german} · {item.meaning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="z-10 flex justify-between items-end w-full">
        <span className="text-xs font-bold text-white/90 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
          Nivel {palabra.difficulty}
        </span>
        {!isFront && (
          <span className="text-xs text-white/50 uppercase tracking-widest font-bold">
            Reverso
          </span>
        )}
      </div>
    </div>
  );
};

const ActiveCard = ({ palabra, flipped, direction, onClick, library }) => {
  let baseGradient = "bg-gradient-to-br from-gray-700 to-gray-800";

  if (palabra.type === "noun") {
    if (palabra.attributes?.gender === "m") {
      baseGradient = "bg-gradient-to-br from-blue-500 to-blue-700";
    }
    if (palabra.attributes?.gender === "f") {
      baseGradient = "bg-gradient-to-br from-pink-500 to-pink-700";
    }
    if (palabra.attributes?.gender === "n") {
      baseGradient = "bg-gradient-to-br from-emerald-500 to-emerald-700";
    }
  } else if (palabra.type === "verb") {
    baseGradient = "bg-gradient-to-br from-orange-500 to-orange-700";
  } else if (palabra.type === "adjective") {
    baseGradient = "bg-gradient-to-br from-purple-500 to-purple-700";
  } else if (palabra.type === "preposition") {
    const grammaticalCase = prepositionCases.get(palabra.attributes?.case);
    if (grammaticalCase)
      baseGradient = `bg-gradient-to-br ${grammaticalCase.colors}`;
  }

  return (
    <div
      className="study-card relative w-full cursor-pointer rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="Girar tarjeta"
      aria-pressed={flipped}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <CardFace
        key={flipped ? "answer" : "prompt"}
        palabra={palabra}
        isFront={!flipped}
        direction={direction}
        baseGradientClasses={baseGradient}
        library={library}
      />
    </div>
  );
};

// =================================================================================
// LÓGICA DEL JUEGO (GAME)
// =================================================================================
function StudyCards({ user, prepositionsOnly }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const optionsKey = `study-options:${user.uid}${prepositionsOnly ? ":prepositions" : ""}`;
  const [saved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(optionsKey)) || {};
    } catch {
      return {};
    }
  });
  const study = useStudyData(user.uid);
  const sessionId = useRef(crypto.randomUUID());
  const [direction, setDirection] = useState(
    saved.direction === "es-de" ? "es-de" : "de-es",
  );
  const [practice, setPractice] = useState(
    ["cards", "type", "listen"].includes(saved.practice)
      ? saved.practice
      : "cards",
  );
  const [mode, setMode] = useState(
    ["review", "random", "smart"].includes(saved.mode) ? saved.mode : "review",
  );
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(
      ["type", "categoryId", "difficulty", "gender", "case", "performance"].map(
        (key) => [
          key,
          typeof saved.filters?.[key] === "string" ? saved.filters[key] : "",
        ],
      ),
    ),
  );
  useEffect(() => {
    try {
      localStorage.setItem(
        optionsKey,
        JSON.stringify({ direction, practice, mode, filters }),
      );
    } catch {
      /* Practice remains usable when browser storage is unavailable. */
    }
  }, [optionsKey, direction, practice, mode, filters]);
  const [friend, setFriend] = useState("");
  const [friends, setFriends] = useState([]);
  const [sharedWords, setSharedWords] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [revealedCardId, setRevealedCardId] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [lastReview, setLastReview] = useState(null);
  const [errorType, setErrorType] = useState("meaning");
  const [error, setError] = useState("");
  const [session, setSession] = useState({
    total: 0,
    correct: 0,
    incorrect: [],
  });
  const [retryPool, setRetryPool] = useState(null);
  const [round, setRound] = useState(1);
  const [cycleSize, setCycleSize] = useState(0);
  const [done, setDone] = useState([]);
  const [busy, setBusy] = useState(false);
  const activeDirection = practice === "listen" ? "listen" : direction;
  const ownerUid = friend || user.uid;
  useEffect(() => {
    let active = true;
    readCollection(`users/${user.uid}/friends`)
      .then((rows) => {
        if (active) setFriends(rows);
      })
      .catch(() => {
        if (active) setError("No se pudo cargar la lista de amigos.");
      });
    return () => {
      active = false;
    };
  }, [user.uid]);
  useEffect(() => {
    let active = true;
    setSharedWords([]);
    if (!friend) {
      setSharedLoading(false);
      return;
    }
    setSharedLoading(true);
    setError("");
    readCollection(`users/${friend}/words`)
      .then((rows) => {
        if (active) setSharedWords(expandVocabulary(rows));
      })
      .catch(() => {
        if (active)
          setError(
            "Este amigo debe activar «Compartir vocabulario» y mantener la amistad para prestar su mazo.",
          );
      })
      .finally(() => {
        if (active) setSharedLoading(false);
      });
    return () => {
      active = false;
    };
  }, [friend]);
  useEffect(() => {
    sessionId.current = crypto.randomUUID();
    setDone([]);
    setSession({ total: 0, correct: 0, incorrect: [] });
    setRetryPool(null);
    setRound(1);
    setCycleSize(0);
    setRevealedCardId(null);
    setAnswer("");
    setFeedback(null);
    setLastReview(null);
    setDetailsOpen(false);
    setReasonOpen(false);
  }, [direction, practice, mode, filters, friend]);
  const deck = friend ? sharedWords : study.items;
  const source = prepositionsOnly
    ? deck.filter((word) => word.type === "preposition")
    : deck;
  const filtered = source.filter((word) => {
    if (filters.type && word.type !== filters.type) return false;
    if (filters.categoryId && word.categoryId !== filters.categoryId)
      return false;
    if (
      filters.difficulty &&
      Number(word.difficulty) !== Number(filters.difficulty)
    )
      return false;
    if (filters.gender && word.attributes?.gender !== filters.gender)
      return false;
    if (filters.case && word.attributes?.case !== filters.case) return false;
    const id = studyId(word, activeDirection, ownerUid),
      p = progressStats(study.progress[id]);
    if (filters.performance === "new" && p.totalPlays) return false;
    if (
      filters.performance === "struggling" &&
      (!p.incorrect || p.errorRate <= 0.3)
    )
      return false;
    return true;
  });
  const pool = retryPool || filtered;
  const queue = orderStudyCards(
    pool,
    mode,
    sessionId.current,
    study.progress,
    activeDirection,
    ownerUid,
  ).filter((word) => !done.includes(studyId(word, activeDirection, ownerUid)));
  const word = queue[0];
  const cardId = word ? studyId(word, activeDirection, ownerUid) : null;
  const flipped = cardId !== null && revealedCardId === cardId;
  const categories = [
    ...new Map(
      source
        .filter((w) => w.categoryId)
        .map((w) => [
          w.categoryId,
          w.category || w.categoryName || w.categoryId,
        ]),
    ).entries(),
  ];
  const answerForm = (event) => {
    event.preventDefault();
    if (!word || !answer.trim()) return;
    const result = checkAnswer(answer, word, activeDirection);
    setFeedback(result);
    setErrorType(result.type || "meaning");
    setRevealedCardId(cardId);
  };
  const rate = (rating, reason = errorType) => {
    if (!word || !flipped || busy) return;
    setBusy(true);
    setError("");
    try {
      recordReview(user.uid, {
        cardId,
        wordId: word.baseWordId || word.id,
        sourceUid: ownerUid,
        direction: activeDirection,
        german: word.german,
        spanish: word.spanish,
        rating,
        errorType: reason,
        answer,
        mode: practice,
        filters: prepositionsOnly
          ? { ...filters, type: "preposition" }
          : filters,
        sessionId: sessionId.current,
        sessionComplete: queue.length === 1,
        isNew: !study.progress[cardId]?.schedule,
      });
      setSession((previous) => ({
        total: previous.total + 1,
        correct: previous.correct + Number(rating > 1),
        incorrect:
          rating === 1
            ? [...previous.incorrect, { word, cardId }]
            : previous.incorrect,
      }));
      setLastReview({ word, rating, reason, feedback });
      setDone((previous) => [...previous, cardId]);
      setRevealedCardId(null);
      setAnswer("");
      setFeedback(null);
      setErrorType("meaning");
      setReasonOpen(false);
    } catch (failure) {
      setError(`No se guardó el repaso. ${failure.message}`);
    } finally {
      setBusy(false);
    }
  };
  const restartRound = (onlyMistakes) => {
    if (onlyMistakes && !session.incorrect.length) return;
    if (onlyMistakes) {
      setCycleSize((previous) => previous || session.total);
      setRetryPool(session.incorrect.map(({ word }) => word));
      setRound((previous) => previous + 1);
    } else {
      setRetryPool(null);
      setCycleSize(0);
      setRound(1);
    }
    setDone([]);
    setSession({ total: 0, correct: 0, incorrect: [] });
    setLastReview(null);
    setRevealedCardId(null);
    setAnswer("");
    setFeedback(null);
    sessionId.current = crypto.randomUUID();
  };
  const select = (label, value, change, options) => (
    <label className="text-sm text-gray-300">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => change(event.target.value)}
        className="block mt-1 w-full rounded-xl p-2 bg-gray-800 text-white"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
  if (study.loading) return <p role="status">Cargando tu biblioteca…</p>;
  if (study.error)
    return (
      <div role="alert">
        <p>{study.error}</p>
        <button onClick={study.reload}>Reintentar</button>
      </div>
    );
  return (
    <div className="study-session">
      <header className="study-toolbar">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-gray-200">
            {practice === "listen"
              ? "Dictado"
              : practice === "type"
                ? "Escribir"
                : "Tarjetas"}{" "}
            <span className="font-normal text-gray-400">
              ·{" "}
              {practice === "listen"
                ? "DE"
                : direction === "de-es"
                  ? "DE → ES"
                  : "ES → DE"}
            </span>
          </h1>
          <p aria-live="polite" className="text-xs text-gray-400">
            {session.total} hechas · {queue.length} pendientes
            {Object.values(filters).some(Boolean) || friend
              ? " · Filtrado"
              : ""}
          </p>
        </div>
        {lastReview && (
          <button
            type="button"
            className="ml-auto px-1 py-3 text-sm text-blue-300"
            onClick={() => setDetailsOpen(true)}
          >
            Última respuesta
          </button>
        )}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-3 text-sm"
          aria-label="Ajustes de práctica"
        >
          <FilterIcon />
          <span>Ajustes</span>
        </button>
      </header>
      {lastReview && (
        <StudySheet
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          title="Última respuesta"
        >
          <p className="mb-3 text-sm text-gray-300">
            Solución:{" "}
            <strong>
              {activeDirection === "de-es"
                ? lastReview.word.spanish
                : germanAnswer(lastReview.word)}
            </strong>
          </p>
          {lastReview.rating === 1 && lastReview.reason !== "unspecified" && (
            <p className="mb-3 text-sm text-gray-400">
              Motivo: {ERROR_LABELS[lastReview.reason]}
            </p>
          )}
          {lastReview.feedback && (
            <div className="space-y-2 mb-5">
              <p
                className={
                  lastReview.feedback.correct
                    ? "text-green-300"
                    : "text-amber-300"
                }
              >
                {lastReview.feedback.message}
              </p>
              {!lastReview.feedback.correct && lastReview.rating === 3 && (
                <p className="text-sm text-gray-400">
                  Si tu alternativa es válida, añádela en la biblioteca para
                  aceptarla en próximos ejercicios.
                </p>
              )}
            </div>
          )}
          <WordLearningPanel word={lastReview.word} />
        </StudySheet>
      )}
      <StudySheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Tu práctica"
      >
        <div className="my-5">
          {select("Dirección", direction, setDirection, [
            ["de-es", "Alemán → Español"],
            ["es-de", "Español → Alemán"],
          ])}
          {practice === "listen" && (
            <p className="text-xs text-gray-400 mt-2">
              En dictado siempre escuchas y escribes en alemán.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {select("Sesión", mode, setMode, [
            ["review", "Repaso"],
            ["random", "Repaso aleatorio"],
            ["smart", "Aleatorio inteligente"],
          ])}
          {select("Ejercicio", practice, setPractice, [
            ["cards", "Tarjetas"],
            ["type", "Escribir respuesta"],
            ["listen", "Escuchar y escribir"],
          ])}
        </div>
        <section className="mt-5 border-t border-white/10 pt-4">
          <h3 className="text-sm font-semibold">Mazo y filtros</h3>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {!prepositionsOnly &&
              select(
                "Tipo",
                filters.type,
                (value) => setFilters({ ...filters, type: value }),
                [
                  ["", "Todos"],
                  ["noun", "Sustantivos"],
                  ["verb", "Verbos"],
                  ["adjective", "Adjetivos"],
                  ["preposition", "Preposiciones"],
                  ["expression", "Expresiones"],
                  ["other", "Otros"],
                ],
              )}
            {select(
              "Categoría",
              filters.categoryId,
              (value) => setFilters({ ...filters, categoryId: value }),
              [["", "Todas"], ...categories],
            )}
            {select(
              "Dificultad",
              filters.difficulty,
              (value) => setFilters({ ...filters, difficulty: value }),
              [
                ["", "Todas"],
                ["1", "1"],
                ["2", "2"],
                ["3", "3"],
              ],
            )}
            {select(
              "Progreso",
              filters.performance,
              (value) => setFilters({ ...filters, performance: value }),
              [
                ["", "Todos"],
                ["new", "Sin practicar"],
                ["struggling", "Me cuestan"],
              ],
            )}
            {!prepositionsOnly &&
              select(
                "Artículo",
                filters.gender,
                (value) => setFilters({ ...filters, gender: value }),
                [
                  ["", "Todos"],
                  ["m", "der"],
                  ["f", "die"],
                  ["n", "das"],
                ],
              )}
            {select(
              "Caso",
              filters.case,
              (value) => setFilters({ ...filters, case: value }),
              [
                ["", "Todos"],
                ...Array.from(prepositionCases, ([value, { label }]) => [
                  value,
                  label,
                ]),
              ],
            )}
            {select("Mazo", friend, setFriend, [
              ["", "Mi vocabulario"],
              ...friends.map((f) => [f.id, f.displayName]),
            ])}
          </div>
          <button
            type="button"
            className="mt-3 py-3 text-sm text-blue-300"
            onClick={() => {
              setFilters(
                Object.fromEntries(
                  Object.keys(filters).map((key) => [key, ""]),
                ),
              );
              setFriend("");
            }}
          >
            Quitar filtros y usar mi mazo
          </button>
        </section>
        <p className="mt-5 text-sm text-gray-400">
          {session.total} respuestas · {session.correct} recordadas. Tus
          preferencias se guardan en este dispositivo.
        </p>
      </StudySheet>
      {(study.pending > 0 || study.offline || study.syncError) && (
        <div role="status" className="text-xs text-gray-400">
          {study.pending
            ? `${study.pending} repasos guardados en este dispositivo, pendientes de sincronizar.`
            : study.offline
              ? "Biblioteca sin conexión."
              : "Repasos sincronizados."}
          {study.syncError && (
            <span className="block text-amber-300">
              {study.syncError}{" "}
              <button onClick={study.retrySync} className="underline">
                Reintentar sincronización
              </button>
            </span>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {sharedLoading ? (
        <p role="status">Cargando mazo compartido…</p>
      ) : word ? (
        <div className={`study-play ${flipped ? "is-revealed" : ""}`}>
          <div className="study-card-slot">
            {practice === "listen" && !flipped ? (
              <div className="study-card flex flex-col items-center justify-center rounded-3xl bg-gray-800 p-5 text-center gap-4">
                <h2 className="text-2xl">Escucha y escribe en alemán</h2>
                <AudioButton text={germanAnswer(word)} />
                <p className="text-sm text-gray-400">
                  Incluye el artículo si es un sustantivo.
                </p>
              </div>
            ) : (
              <ActiveCard
                key={cardId}
                palabra={word}
                library={deck}
                flipped={flipped}
                direction={practice === "listen" ? "es-de" : direction}
                onClick={() => {
                  setRevealedCardId(flipped ? null : cardId);
                  setFeedback(null);
                }}
              />
            )}
            {flipped && (
              <div className="study-card-audio">
                <AudioButton text={germanAnswer(word)} compact />
              </div>
            )}
          </div>
          <div className="study-actions">
            {practice !== "cards" && !flipped && (
              <form onSubmit={answerForm} className="flex gap-2">
                <input
                  aria-label="Tu respuesta"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  className="min-w-0 flex-1 p-3 bg-gray-800 rounded-xl"
                  placeholder="Tu respuesta"
                />
                <button
                  className="p-3 bg-blue-600 rounded-xl"
                  disabled={!answer.trim()}
                >
                  Comprobar
                </button>
              </form>
            )}
            {!flipped && (
              <button
                onClick={() => setRevealedCardId(cardId)}
                className={`w-full py-3 rounded-xl ${practice === "cards" ? "bg-blue-600 font-semibold" : "text-gray-400 text-sm"}`}
              >
                Mostrar respuesta
              </button>
            )}
            {flipped && (
              <>
                <p
                  role="status"
                  className={`text-sm ${feedback?.correct ? "text-green-300" : "text-gray-300"}`}
                >
                  {feedback
                    ? feedback.correct
                      ? "Correcto"
                      : `Revisa: ${ERROR_LABELS[feedback.type] || "respuesta"}`
                    : "¿Cómo te ha ido?"}
                </p>
                <div className="study-ratings grid grid-cols-2 gap-2">
                  {[
                    [1, "No me la sé"],
                    [3, "Me la sé"],
                  ].map(([rating, label]) => (
                    <button
                      key={rating}
                      aria-label={label}
                      disabled={busy}
                      onClick={() =>
                        rating === 1 ? setReasonOpen(true) : rate(rating)
                      }
                      className={`px-1 py-3 rounded-xl text-sm font-semibold ${rating === 1 ? "bg-red-900/70" : "bg-teal-900/70"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <StudySheet
                  open={reasonOpen}
                  onClose={() => setReasonOpen(false)}
                  title="¿Qué te costó?"
                  closeLabel="Volver"
                >
                  <p className="text-sm text-gray-400 mb-4">
                    Opcional. Toca un motivo para guardar la respuesta.
                  </p>
                  {error && (
                    <p role="alert" className="mb-3 text-sm text-red-300">
                      {error}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(ERROR_LABELS)
                      .filter(([key]) => key !== "unspecified")
                      .map(([key, label]) => (
                        <button
                          type="button"
                          key={key}
                          disabled={busy}
                          onClick={() => rate(1, key)}
                          className="rounded-xl bg-gray-800 px-3 py-3 text-sm text-left"
                        >
                          {label}
                        </button>
                      ))}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => rate(1, feedback?.type || "unspecified")}
                    className="mt-4 w-full rounded-xl bg-blue-600 px-3 py-3 font-semibold"
                  >
                    Continuar sin motivo
                  </button>
                </StudySheet>
              </>
            )}
          </div>
        </div>
      ) : (
        <section className="rounded-3xl bg-gray-800 p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold">
            {session.total
              ? session.incorrect.length
                ? `Ronda ${round} completada`
                : "¡Repaso completo!"
              : prepositionsOnly
                ? "No hay preposiciones en esta selección"
                : "Todavía no hay palabras"}
          </h2>
          {session.total ? (
            <>
              <p className="text-gray-300">
                {session.correct} aciertos · {session.incorrect.length} fallos
              </p>
              <p className="text-sm text-gray-400">
                {session.incorrect.length
                  ? `Quedan ${session.incorrect.length} de ${cycleSize || session.total} fichas por acertar.`
                  : `Has acertado las ${cycleSize || session.total} fichas de este repaso.`}
              </p>
              {session.incorrect.length > 0 && (
                <button
                  onClick={() => restartRound(true)}
                  className="w-full p-3 bg-orange-700 rounded-xl font-semibold"
                >
                  Reintentar {session.incorrect.length} fallos
                </button>
              )}
              <button
                onClick={() => restartRound(false)}
                className="w-full p-3 bg-blue-600 rounded-xl"
              >
                Empezar otro repaso
              </button>
            </>
          ) : (
            <p className="text-gray-300">
              {source.length
                ? "Prueba a quitar algún filtro en Ajustes."
                : prepositionsOnly
                  ? friend
                    ? "Elige otro mazo en Ajustes."
                    : "Añade una preposición en Biblioteca para empezar."
                  : "Añade vocabulario desde Biblioteca para empezar."}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
function Game({ user }) {
  const [tab, setTab] = useState("cards");
  return (
    <div
      className={`game-view ${tab === "contrasts" ? "" : "game-view-cards"}`}
    >
      <nav
        aria-label="Práctica"
        className="grid shrink-0 grid-cols-3 gap-1 mb-2"
      >
        {[
          ["cards", "Repasar"],
          ["prepositions", "Preposiciones"],
          ["contrasts", "Contrastes"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={`text-sm py-3 px-1 rounded-xl ${tab === value ? "bg-blue-600" : "bg-gray-800"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "contrasts" ? (
        <ContrastPractice user={user} />
      ) : (
        <StudyCards
          key={`${user.uid}:${tab}`}
          user={user}
          prepositionsOnly={tab === "prepositions"}
        />
      )}
    </div>
  );
}
export default Game;
