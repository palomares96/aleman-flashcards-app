import { useCallback, useRef } from "react";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { loadStudy, getStudyStore } from "../services/studyStore.js";
import { evaluateAchievements } from "../utils/achievements.js";
import { readCollection } from "../services/repository.js";
export { TROPHIES, TROPHY_CATEGORIES } from "../data/trophies.js";

// Compute only on the achievements screen, from the shared study snapshot.
// Existing awards are retained; unsupported legacy achievements are not guessed.
export function useAchievementCheck(user, onNewTrophy) {
  const callback = useRef(onNewTrophy);
  callback.current = onNewTrophy;
  const uid = user?.uid;
  return useCallback(async () => {
    if (!uid) return [];
    await loadStudy(uid);
    const state = getStudyStore(uid).state;
    if (state.error) throw new Error(state.error);
    const [friends, sentences, reviewEvents, legacyEvents, categories] =
      await Promise.all([
        readCollection(`users/${uid}/friends`),
        readCollection(`users/${uid}/sentenceAttempts`),
        readCollection(`users/${uid}/reviewEvents`),
        readCollection(`users/${uid}/user_events`),
        readCollection("categories"),
      ]);
    const earned = evaluateAchievements(
      uid,
      state,
      friends,
      sentences,
      [...reviewEvents, ...legacyEvents],
      categories,
    );
    const ref = doc(db, "users", uid);
    const result = await runTransaction(db, async (tx) => {
      const snapshot = await tx.get(ref),
        previous = snapshot.data()?.achievements?.unlocked || [];
      const awards = earned.filter((trophy) => !previous.includes(trophy.id));
      const unlocked = [
        ...new Set([...previous, ...awards.map((trophy) => trophy.id)]),
      ];
      if (awards.length)
        tx.update(ref, {
          achievements: { unlocked, updatedAt: serverTimestamp() },
        });
      return { unlocked, awards };
    });
    result.awards.forEach((trophy) => callback.current?.(trophy));
    return result.unlocked;
  }, [uid]);
}
