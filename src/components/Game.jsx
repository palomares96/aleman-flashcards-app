import StudySheet from "./StudySheet.jsx";
import WordLearningPanel from "./WordLearningPanel.jsx";
import { expandVocabulary, normalizeGerman } from "../utils/vocabulary.js";
import React, { useState, useEffect, useRef } from "react";
import { useStudyData } from "../hooks/useStudyData.js";
import { recordReview, pendingReviews } from "../services/studyStore.js";
import { readCollection } from "../services/repository.js";
import {
  studyId,
  dailyQueue,
  progressStats,
  localDay,
  germanAnswer,
  checkAnswer,
  ERROR_LABELS,
} from "../utils/study.js";
import AudioButton from "./AudioButton.jsx";
import ContrastPractice from "./ContrastPractice.jsx";
import MistakesNotebook from "./MistakesNotebook.jsx";

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
const CardFace = ({
  palabra,
  isFront,
  direction,
  baseGradientClasses,
  isVisible,
}) => {
  const isGermanSide =
    (isFront && direction === "de-es") || (!isFront && direction === "es-de");
  const mainText = isGermanSide
    ? normalizeGerman(palabra.german, palabra.type)
    : palabra.spanish;
  const langLabel = isGermanSide ? "ALEMÁN" : "ESPAÑOL";

  // Diccionarios para visualización
  const articles = { m: "der", f: "die", n: "das" };
  const genderLabels = { m: "Masculino", f: "Femenino", n: "Neutral" };

  let displayMain = mainText;
  let typeInfo = "";

  if (isGermanSide) {
    if (palabra.type === "noun" && palabra.attributes?.gender) {
      displayMain = `${articles[palabra.attributes.gender]} ${mainText.charAt(0).toUpperCase() + mainText.slice(1)}`;
      typeInfo = `Sustantivo • ${genderLabels[palabra.attributes.gender] || ""}`;
    } else {
      typeInfo =
        {
          verb: "Verbo",
          adjective: "Adjetivo",
          preposition: "Preposición",
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

  return (
    <div
      aria-hidden={!isVisible}
      className={`
            absolute w-full h-full rounded-[2rem] 
            ${faceGradient} 
            backdrop-blur-xl border border-white/20 shadow-2xl 
            study-card-face flex flex-col overflow-y-auto backface-hidden
        `}
      style={{
        backfaceVisibility: "hidden",
        transform: isFront ? "rotateY(0deg)" : "rotateY(180deg)",
      }}
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
        <h2 className="study-card-word font-bold text-white mb-2 tracking-tight leading-tight drop-shadow-md break-words">
          {displayMain}
        </h2>
        {!isGermanSide && palabra.learning?.hintEs && (
          <p className="text-sm text-white/80 mb-3">
            {palabra.learning.hintEs}
          </p>
        )}
        <p className="text-sm text-white/80 font-medium tracking-wide">
          {typeInfo}
        </p>

        {/* Info extra para verbos (solo cara alemana) */}
        {isGermanSide &&
          palabra.type === "verb" &&
          !palabra.isDerived &&
          palabra.attributes?.pastTense && (
            <div className="mt-2 pt-2 border-t border-white/20 w-full">
              <p className="text-sm text-white/90 opacity-90 font-mono">
                {palabra.attributes.pastTense}, {palabra.attributes.participle}
              </p>
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

// =================================================================================
// COMPONENTE VISUAL: STACK DE CARTAS (CON ANIMACIONES AJUSTADAS)
// =================================================================================
const DeckBackground = ({ count }) => {
  if (count <= 1) return null;
  const stackColor = "bg-gray-800"; // Always neutral to avoid spoilers
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      {count > 1 && (
        <div
          className={`absolute inset-0 rounded-[2rem] ${stackColor} opacity-30 transform translate-y-8 scale-[0.90] blur-[1px] transition-all duration-300`}
        ></div>
      )}
      {count > 0 && (
        <div
          className={`absolute inset-0 rounded-[2rem] ${stackColor} opacity-50 transform translate-y-4 scale-[0.95] transition-all duration-300 shadow-xl`}
        ></div>
      )}
    </div>
  );
};

const ActiveCard = ({ palabra, flipped, direction, onClick, isSwipingOut }) => {
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
  }

  // --- ANIMACIONES DE DESLIZAMIENTO ---
  const swipeAnimationClasses = isSwipingOut
    ? "-translate-x-[120%] rotate-[-15deg] opacity-0 duration-150 ease-in"
    : "translate-x-0 rotate-0 opacity-100 duration-200 ease-out";

  return (
    <div
      className={`study-card relative w-full transition-all ${swipeAnimationClasses}`}
      style={{ perspective: "1200px" }}
    >
      {/* Carta Principal */}
      <div
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
        className="relative w-full h-full cursor-pointer transition-transform duration-300 transform-style-3d shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <CardFace
          palabra={palabra}
          isFront={true}
          isVisible={!flipped}
          direction={direction}
          baseGradientClasses={baseGradient}
        />
        <CardFace
          palabra={palabra}
          isFront={false}
          isVisible={flipped}
          direction={direction}
          baseGradientClasses={baseGradient}
        />
      </div>
    </div>
  );
};

// =================================================================================
// LÓGICA DEL JUEGO (GAME)
// =================================================================================
function StudyCards({ user, mistakeIds = null, modePicker }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [saved] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(`study-options:${user.uid}`)) || {}
      );
    } catch {
      return {};
    }
  });
  const study = useStudyData(user.uid);
  const sessionId = useRef(crypto.randomUUID());
  const [direction, setDirection] = useState(
    mistakeIds
      ? mistakeIds.direction === "es-de"
        ? "es-de"
        : "de-es"
      : saved.direction === "es-de"
        ? "es-de"
        : "de-es",
  );
  const [practice, setPractice] = useState(
    mistakeIds
      ? mistakeIds.direction === "listen"
        ? "listen"
        : "cards"
      : ["cards", "type", "listen"].includes(saved.practice)
        ? saved.practice
        : "cards",
  );
  const [mode, setMode] = useState(
    mistakeIds
      ? "mistakes"
      : ["due", "review", "random"].includes(saved.mode)
        ? saved.mode
        : "due",
  );
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(
      ["type", "categoryId", "difficulty", "gender", "case", "performance"].map(
        (key) => [
          key,
          !mistakeIds && typeof saved.filters?.[key] === "string"
            ? saved.filters[key]
            : "",
        ],
      ),
    ),
  );
  useEffect(() => {
    if (mistakeIds) return;
    try {
      localStorage.setItem(
        `study-options:${user.uid}`,
        JSON.stringify({ direction, practice, mode, filters }),
      );
    } catch {
      /* Practice remains usable when browser storage is unavailable. */
    }
  }, [user.uid, direction, practice, mode, filters, mistakeIds]);
  const [friend, setFriend] = useState(
    mistakeIds?.sourceUid !== user.uid ? mistakeIds?.sourceUid || "" : "",
  );
  const [friends, setFriends] = useState([]);
  const [sharedWords, setSharedWords] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [reviewed, setReviewed] = useState(null);
  const [errorType, setErrorType] = useState("meaning");
  const [error, setError] = useState("");
  const [session, setSession] = useState({ total: 0, correct: 0 });
  const [done, setDone] = useState([]);
  const [clock, setClock] = useState(Date.now());
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
    setSession({ total: 0, correct: 0 });
    setFlipped(false);
    setAnswer("");
    setFeedback(null);
    setReviewed(null);
    setDetailsOpen(false);
    setReasonOpen(false);
    setClock(Date.now());
  }, [direction, practice, mode, filters, friend, mistakeIds]);
  const source = friend ? sharedWords : study.items;
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
    if (
      mode === "mistakes" &&
      !(mistakeIds ? mistakeIds.ids.includes(id) : p.lastRating === 1)
    )
      return false;
    return true;
  });
  const today = localDay(clock);
  // Pending introductions count towards the same daily budget as committed ones.
  const pendingNew = new Set(
    pendingReviews(user.uid)
      .filter((event) => event.day === today && event.isNew)
      .map((event) => event.cardId),
  ).size;
  const newLimit = Math.max(
    0,
    20 - (study.daily[today]?.newCards || 0) - pendingNew,
  );
  const queue = (
    mode === "due"
      ? dailyQueue(
          filtered,
          study.progress,
          activeDirection,
          ownerUid,
          clock,
          newLimit,
        )
      : filtered
  ).filter((word) => !done.includes(studyId(word, activeDirection, ownerUid)));
  if (mode === "random") {
    const order = (item) =>
      [...(sessionId.current + item.id)].reduce(
        (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0,
        2166136261,
      );
    queue.sort((a, b) => order(a) - order(b));
  }
  const word = reviewed?.word || queue[0];
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
    setFlipped(true);
  };
  const rate = (rating, reason = errorType) => {
    if (!word || !flipped || busy || reviewed) return;
    setBusy(true);
    setError("");
    try {
      const cardId = studyId(word, activeDirection, ownerUid);
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
        filters,
        sessionId: sessionId.current,
        sessionComplete: queue.length === 1,
        isNew: !study.progress[cardId]?.schedule,
      });
      setSession((previous) => ({
        total: previous.total + 1,
        correct: previous.correct + Number(rating > 1),
      }));
      setReviewed({ word, cardId, rating, reason });
      setDetailsOpen(false);
      setReasonOpen(false);
    } catch (failure) {
      setError(`No se guardó el repaso. ${failure.message}`);
    } finally {
      setBusy(false);
    }
  };
  const nextCard = () => {
    if (!reviewed) return;
    setDone((previous) => [...previous, reviewed.cardId]);
    setReviewed(null);
    setFlipped(false);
    setAnswer("");
    setFeedback(null);
    setErrorType("meaning");
    setDetailsOpen(false);
    setClock(Date.now());
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
          <p className="text-xs text-gray-400">
            {session.total} hechas · {queue.length} pendientes
            {Object.values(filters).some(Boolean) || friend
              ? " · Filtrado"
              : ""}
          </p>
        </div>
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
      <StudySheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Tu práctica"
      >
        {modePicker}
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
            ["due", "Repasos pendientes"],
            ["review", "Todo el mazo"],
            ["random", "Al azar"],
            ["mistakes", "Últimos fallos"],
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
            {select(
              "Tipo",
              filters.type,
              (value) => setFilters({ ...filters, type: value }),
              [
                ["", "Todos"],
                ["noun", "Sustantivos"],
                ["verb", "Verbos"],
                ["adjective", "Adjetivos"],
                ["preposition", "Preposiciones"],
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
            {select(
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
                ["Akkusativ", "Acusativo"],
                ["Dativ", "Dativo"],
                ["Genitiv", "Genitivo"],
                ["Wechselpräposition", "Variable"],
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
                palabra={word}
                flipped={flipped}
                direction={practice === "listen" ? "es-de" : direction}
                onClick={() => {
                  if (reviewed) return;
                  setFlipped(!flipped);
                  setFeedback(null);
                  setDetailsOpen(false);
                }}
                isSwipingOut={false}
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
                onClick={() => setFlipped(true)}
                className={`w-full py-3 rounded-xl ${practice === "cards" ? "bg-blue-600 font-semibold" : "text-gray-400 text-sm"}`}
              >
                Mostrar respuesta
              </button>
            )}
            {flipped && (
              <>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <p
                    role="status"
                    className={
                      feedback?.correct ? "text-green-300" : "text-gray-300"
                    }
                  >
                    {reviewed
                      ? reviewed.rating === 1
                        ? "Marcada para repasar"
                        : "Respuesta guardada"
                      : feedback
                        ? feedback.correct
                          ? "Correcto"
                          : `Revisa: ${ERROR_LABELS[feedback.type] || "respuesta"}`
                        : "¿Cómo te ha ido?"}
                  </p>
                  {reviewed && (
                    <button
                      type="button"
                      className="shrink-0 px-2 py-3 text-blue-300"
                      onClick={() => setDetailsOpen(true)}
                    >
                      Ver detalle
                    </button>
                  )}
                </div>
                {reviewed ? (
                  <button
                    type="button"
                    onClick={nextCard}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold"
                  >
                    Siguiente ficha
                  </button>
                ) : (
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
                )}
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
                <StudySheet
                  open={detailsOpen}
                  onClose={() => setDetailsOpen(false)}
                  title="Sobre esta respuesta"
                >
                  <p className="mb-3 text-sm text-gray-300">
                    Solución:{" "}
                    <strong>
                      {practice === "listen" || direction === "es-de"
                        ? germanAnswer(word)
                        : word.spanish}
                    </strong>
                  </p>
                  {reviewed?.rating === 1 &&
                    reviewed.reason !== "unspecified" && (
                      <p className="mb-3 text-sm text-gray-400">
                        Motivo: {ERROR_LABELS[reviewed.reason]}
                      </p>
                    )}
                  {feedback && (
                    <div role="status" className="space-y-2 mb-5">
                      <p
                        className={
                          feedback.correct ? "text-green-300" : "text-amber-300"
                        }
                      >
                        {feedback.message}
                      </p>
                      {!feedback.correct && reviewed?.rating === 3 && (
                        <p className="text-sm text-gray-400">
                          Si tu alternativa es válida, puedes marcar «Me la sé».
                          Añádela en la biblioteca para aceptarla en próximos
                          ejercicios.
                        </p>
                      )}
                    </div>
                  )}
                  <WordLearningPanel word={word} />
                </StudySheet>
              </>
            )}
          </div>
        </div>
      ) : (
        <section className="rounded-3xl bg-gray-800 p-7 text-center space-y-3">
          <h2 className="text-2xl font-bold">
            {source.length ? "Sesión terminada" : "Todavía no hay palabras"}
          </h2>
          <p className="text-gray-300">
            {source.length
              ? "Los repasos tienen prioridad. En la sesión de pendientes se introducen hasta 20 tarjetas nuevas al día entre todas las direcciones."
              : "Añade vocabulario desde Biblioteca para empezar."}
          </p>
          {source.length > 0 && (
            <button
              onClick={() => {
                setDone([]);
                sessionId.current = crypto.randomUUID();
                setClock(Date.now());
              }}
              className="p-3 bg-blue-600 rounded-xl"
            >
              Comprobar próximos repasos
            </button>
          )}
        </section>
      )}
    </div>
  );
}
function Game({ user }) {
  const [tab, setTab] = useState("cards");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mistakeIds, setMistakeIds] = useState(null);
  const modePicker = (
    <nav aria-label="Práctica" className="grid grid-cols-3 gap-2">
      {[
        ["cards", "Repasar"],
        ["contrasts", "Contrastes"],
        ["mistakes", "Mis errores"],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={tab === value}
          onClick={() => {
            setTab(value);
            setMistakeIds(null);
            setSettingsOpen(false);
          }}
          className={`text-sm py-3 px-2 rounded-xl ${tab === value ? "bg-blue-600" : "bg-gray-800"}`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
  return (
    <div className={`game-view ${tab === "cards" ? "game-view-cards" : ""}`}>
      {tab === "cards" ? (
        <StudyCards
          key={user.uid}
          user={user}
          mistakeIds={mistakeIds}
          modePicker={modePicker}
        />
      ) : (
        <>
          <header className="study-toolbar mb-3">
            <span className="text-sm text-gray-400">
              {tab === "contrasts" ? "Contrastes" : "Mis errores"}
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl bg-white/5 px-3 py-3 text-sm"
              aria-label="Ajustes de práctica"
            >
              Cambiar práctica
            </button>
          </header>
          <StudySheet
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            title="Tu práctica"
          >
            {modePicker}
          </StudySheet>
          {tab === "contrasts" && <ContrastPractice user={user} />}
          {tab === "mistakes" && (
            <MistakesNotebook
              user={user}
              onPractice={(ids) => {
                setMistakeIds(ids);
                setTab("cards");
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
export default Game;
