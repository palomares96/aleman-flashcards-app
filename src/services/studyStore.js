import {
  doc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { readCollection } from "./repository.js";
import { expandVocabulary } from "../utils/vocabulary.js";
import { applyReview, localDay } from "../utils/study.js";

const stores = new Map();
const prefix = (uid) => `aleman:review:${uid}:`;
const cacheKey = (uid) => `aleman:deck:${uid}`;
const offlineKey = (uid) => `aleman:offline:${uid}`;
const storage = () => globalThis.localStorage;
export function pendingReviews(uid) {
  const result = [];
  let s;
  try {
    s = storage();
    void s.length;
  } catch {
    return [];
  }
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (key?.startsWith(prefix(uid))) {
      try {
        result.push(JSON.parse(s.getItem(key)));
      } catch {
        throw new Error(
          "Hay un repaso local dañado. Exporta una copia antes de borrar los datos del navegador.",
        );
      }
    }
  }
  return result.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}
export function offlineEnabled(uid) {
  try {
    return storage().getItem(offlineKey(uid)) === "true";
  } catch {
    return false;
  }
}
export function setOfflineEnabled(uid, enabled, profile = null) {
  if (enabled) {
    if (profile)
      storage().setItem(
        `aleman:profile:${uid}`,
        JSON.stringify({
          displayName: profile.displayName,
          tier: profile.tier || "free",
          shareVocabulary: !!profile.shareVocabulary,
        }),
      );
    storage().setItem(offlineKey(uid), "true");
  } else {
    storage().removeItem(offlineKey(uid));
    storage().removeItem(cacheKey(uid));
    storage().removeItem(`aleman:examples:${uid}`);
    storage().removeItem(`aleman:profile:${uid}`);
  }
  try {
    saveCache(uid);
  } catch (error) {
    storage().removeItem(offlineKey(uid));
    storage().removeItem(cacheKey(uid));
    storage().removeItem(`aleman:profile:${uid}`);
    throw new Error(
      `No se pudo guardar la biblioteca sin conexión. ${error.message}`,
    );
  }
}
function saveCache(uid) {
  const state = stores.get(uid)?.state;
  if (state && !state.loading && offlineEnabled(uid)) {
    // Never cache shared decks; review outbox and personal deck are scoped to UID.
    storage().setItem(
      cacheKey(uid),
      JSON.stringify({
        version: 1,
        words: state.words,
        progress: state.progress,
        daily: state.daily,
        savedAt: Date.now(),
      }),
    );
  }
}
export function getStudyStore(uid) {
  if (!stores.has(uid))
    stores.set(uid, {
      listeners: new Set(),
      state: {
        words: [],
        items: [],
        progress: {},
        daily: {},
        loading: true,
        error: "",
        syncError: "",
        pending: 0,
        offline: false,
      },
      loaded: 0,
    });
  return stores.get(uid);
}
function publish(uid, patch) {
  const store = getStudyStore(uid);
  store.state = { ...store.state, ...patch };
  store.listeners.forEach((listener) => listener());
}
const assertOwner = (uid) => {
  if (auth.currentUser?.uid !== uid)
    throw new Error("Vuelve a iniciar sesión para sincronizar tus repasos.");
};
export async function loadStudy(uid, force = false) {
  const store = getStudyStore(uid);
  if (store.loadingPromise) return store.loadingPromise;
  if (!force && Date.now() - store.loaded < 60000) return;
  store.loadingPromise = Promise.resolve()
    .then(async () => {
      publish(uid, { error: "" });
      try {
        assertOwner(uid);
        if (globalThis.navigator?.onLine === false)
          throw new Error("Sin conexión.");
        const [words, records, days] = await Promise.all([
          readCollection(`users/${uid}/words`),
          readCollection(`users/${uid}/studyProgress`),
          readCollection(`users/${uid}/studyDays`),
        ]);
        assertOwner(uid);
        const progress = Object.fromEntries(
          records.map(({ id, ...data }) => [id, data]),
        );
        const daily = Object.fromEntries(
          days.map(({ id, ...data }) => [id, data]),
        );
        // An acknowledged-but-not-removed event must not be counted twice locally.
        for (const event of pendingReviews(uid)) {
          const saved = await getDocFromServer(
            doc(db, `users/${uid}/reviewEvents/${event.id}`),
          );
          if (saved.exists()) {
            const [latestProgress, latestDay] = await Promise.all([
              getDocFromServer(
                doc(db, `users/${uid}/studyProgress/${event.cardId}`),
              ),
              getDocFromServer(doc(db, `users/${uid}/studyDays/${event.day}`)),
            ]);
            if (latestProgress.exists())
              progress[event.cardId] = latestProgress.data();
            if (latestDay.exists()) daily[event.day] = latestDay.data();
            storage().removeItem(prefix(uid) + event.id);
          } else {
            progress[event.cardId] = applyReview(progress[event.cardId], event);
          }
        }
        assertOwner(uid);
        // A reload may overlap a locally queued/committed review. Never replace a
        // newer item snapshot with a fetch that started before that answer.
        for (const [id, current] of Object.entries(store.state.progress)) {
          if (current.lastReviewed > (progress[id]?.lastReviewed || 0))
            progress[id] = current;
        }
        for (const [day, current] of Object.entries(store.state.daily)) {
          if (current.reviews > (daily[day]?.reviews || 0))
            daily[day] = current;
        }
        publish(uid, {
          words,
          items: expandVocabulary(words),
          progress,
          daily,
          loading: false,
          offline: false,
          pending: pendingReviews(uid).length,
        });
        store.loaded = Date.now();
        saveCache(uid);
      } catch (error) {
        if (auth.currentUser?.uid !== uid) return;
        let cached;
        try {
          cached =
            offlineEnabled(uid) && JSON.parse(storage().getItem(cacheKey(uid)));
        } catch {
          /* retain error */
        }
        if (cached?.version === 1)
          publish(uid, {
            ...cached,
            items: expandVocabulary(cached.words),
            loading: false,
            offline: true,
            error: "",
            pending: pendingReviews(uid).length,
          });
        else
          publish(uid, {
            loading: false,
            error: `No se pudo cargar tu biblioteca: ${error.message}`,
          });
      }
    })
    .finally(() => {
      store.loadingPromise = null;
    });
  return store.loadingPromise;
}
export async function commitReview(uid, event) {
  assertOwner(uid);
  return runTransaction(db, async (transaction) => {
    assertOwner(uid);
    const eventRef = doc(db, `users/${uid}/reviewEvents/${event.id}`);
    const progressRef = doc(db, `users/${uid}/studyProgress/${event.cardId}`);
    const dayRef = doc(db, `users/${uid}/studyDays/${event.day}`);
    const [existing, previous, day] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(progressRef),
      transaction.get(dayRef),
    ]);
    if (existing.exists())
      return { progress: previous.data(), day: day.data() };
    const before = previous.data() || {};
    const updated = applyReview(before, event);
    const stats = day.data() || { reviews: 0, correct: 0, newCards: 0 };
    const nextDay = {
      ...stats,
      reviews: stats.reviews + 1,
      correct: stats.correct + Number(event.rating > 1),
      newCards: stats.newCards + Number(!before.schedule),
      day: event.day,
      timeZone: event.timeZone,
    };
    transaction.set(eventRef, {
      ...event,
      effectiveAt: updated.lastReviewed,
      log: updated.log,
      committedAt: serverTimestamp(),
    });
    transaction.set(progressRef, updated);
    transaction.set(dayRef, nextDay);
    return { progress: updated, day: nextDay };
  });
}
export async function flushReviews(uid) {
  if (globalThis.navigator?.onLine === false) {
    publish(uid, {
      offline: true,
      syncError: pendingReviews(uid).length
        ? "Sin conexión. Tus respuestas están guardadas en este dispositivo."
        : "",
      pending: pendingReviews(uid).length,
    });
    return;
  }
  const store = getStudyStore(uid);
  if (store.flushing) return store.flushing;
  store.flushing = Promise.resolve()
    .then(async () => {
      try {
        assertOwner(uid);
        for (const event of pendingReviews(uid)) {
          const saved = await commitReview(uid, event);
          assertOwner(uid);
          storage().removeItem(prefix(uid) + event.id);
          // Rebase later offline events on the committed state, including other devices.
          let progress = saved.progress;
          for (const pending of pendingReviews(uid).filter(
            (item) => item.cardId === event.cardId,
          ))
            progress = applyReview(progress, pending);
          publish(uid, {
            progress: { ...store.state.progress, [event.cardId]: progress },
            daily: { ...store.state.daily, [event.day]: saved.day },
            pending: pendingReviews(uid).length,
            syncError: "",
            offline: false,
          });
          saveCache(uid);
        }
      } catch (error) {
        publish(uid, {
          syncError: error.message,
          pending: pendingReviews(uid).length,
        });
      }
    })
    .finally(() => {
      store.flushing = null;
    });
  return store.flushing;
}
export function recordReview(uid, input) {
  assertOwner(uid);
  const store = getStudyStore(uid);
  const at = Date.now(),
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const event = {
    ...input,
    id: crypto.randomUUID(),
    at,
    timeZone,
    day: localDay(at, timeZone),
  };
  // Persist first. A quota/private-mode failure leaves the current card unanswered.
  const progress = applyReview(store.state.progress[event.cardId], event);
  storage().setItem(prefix(uid) + event.id, JSON.stringify(event));
  publish(uid, {
    progress: { ...store.state.progress, [event.cardId]: progress },
    pending: pendingReviews(uid).length,
  });
  try {
    saveCache(uid);
  } catch {
    publish(uid, {
      syncError: "El repaso está guardado, pero no cabe la copia sin conexión.",
    });
  }
  void flushReviews(uid);
  return event;
}
export function clearStudyMemory(uid) {
  stores.delete(uid);
}
