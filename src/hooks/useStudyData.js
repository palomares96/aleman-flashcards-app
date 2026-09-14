import { useEffect, useSyncExternalStore } from "react";
import {
  getStudyStore,
  loadStudy,
  flushReviews,
} from "../services/studyStore.js";

export function useStudyData(uid) {
  const store = getStudyStore(uid);
  const state = useSyncExternalStore(
    (callback) => {
      store.listeners.add(callback);
      return () => store.listeners.delete(callback);
    },
    () => store.state,
  );
  useEffect(() => {
    void loadStudy(uid).then(() => flushReviews(uid));
    const refresh = () => {
      void loadStudy(uid, true).then(() => flushReviews(uid));
    };
    const sync = () => {
      void flushReviews(uid);
    };
    window.addEventListener("online", refresh);
    window.addEventListener("vocabulary-changed", refresh);
    const crossTab = (event) => {
      if (event.key?.startsWith(`aleman:review:${uid}:`)) refresh();
    };
    window.addEventListener("storage", crossTab);
    const timer = setInterval(sync, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("vocabulary-changed", refresh);
      window.removeEventListener("storage", crossTab);
    };
  }, [uid]);
  return {
    ...state,
    reload: () => loadStudy(uid, true),
    retrySync: () => flushReviews(uid),
  };
}
