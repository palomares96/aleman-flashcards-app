import { collection, doc, documentId, getDocs, limit, orderBy, query, runTransaction, startAfter } from 'firebase/firestore';
import { db, auth } from '../firebase.js';
import { planVocabularyPatch } from '../utils/vocabulary.js';

const running = new Map();

// Run once per mounted signed-in app, page through ALL words, and re-read every
// candidate in a transaction so an edit in another tab cannot be overwritten.
// No admin privileges or relaxed rules; a user can only enrich their own deck.
export function backfillOwnVocabulary(uid, onProgress = () => {}) {
  if (running.has(uid)) return running.get(uid);
  const work = async () => {
    let cursor;
    const totals = { scanned: 0, updated: 0 };
    do {
      if (auth.currentUser?.uid !== uid) throw new Error('La sesión ha cambiado.');
      const constraints = [orderBy(documentId()), limit(100)];
      if (cursor) constraints.push(startAfter(cursor));
      const page = await getDocs(query(collection(db, `users/${uid}/words`), ...constraints));
      for (const candidate of page.docs) {
        if (auth.currentUser?.uid !== uid) throw new Error('La sesión ha cambiado.');
        totals.scanned++;
        if (Object.keys(planVocabularyPatch(candidate.data())).length) {
          const changed = await runTransaction(db, async transaction => {
            const ref = doc(db, `users/${uid}/words`, candidate.id);
            const latest = await transaction.get(ref);
            if (!latest.exists()) return false;
            const patch = planVocabularyPatch(latest.data());
            if (!Object.keys(patch).length) return false;
            transaction.update(ref, patch);
            return true;
          });
          if (changed) totals.updated++;
        }
      }
      onProgress({ ...totals });
      cursor = page.size === 100 ? page.docs[page.docs.length - 1] : null;
    } while (cursor);
    return totals;
  };
  const promise = work().finally(() => running.delete(uid));
  running.set(uid, promise);
  return promise;
}
