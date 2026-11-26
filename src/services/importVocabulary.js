import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { lexicalKey, portableWord } from "../utils/transfer.js";
import { readCollection, notifyVocabularyChanged } from "./repository.js";
import { addCustomContrast } from "./customContrasts.js";

async function importId(key) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key),
  );
  return (
    "import_" +
    Array.from(new Uint8Array(bytes), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
  );
}
export async function importVocabulary(
  uid,
  words,
  source = null,
  onProgress = () => {},
  backupIds = null,
) {
  const currentWords = await readCollection(`users/${uid}/words`);
  const existing = new Map(
    currentWords.map((word) => [lexicalKey(word), word.id]),
  );
  const ids = new Set(currentWords.map((word) => word.id));
  // An old library can already have two distinct IDs for the same lexical
  // key. Each ID in a personal backup must keep its own contrast references.
  const backupWordIds = new Set(
    backupIds ? words.map((word) => word.id).filter(Boolean) : [],
  );
  const matchedIds = new Set();
  let imported = 0,
    skipped = 0;
  for (const original of words) {
    if (auth.currentUser?.uid !== uid)
      throw new Error("La sesión ha cambiado.");
    const word = portableWord(original),
      key = lexicalKey(word);
    const originalId = backupIds && original.id;
    let existingId = existing.get(key);
    if (originalId) {
      if (ids.has(originalId)) existingId = originalId;
      else if (backupWordIds.has(existingId) || matchedIds.has(existingId))
        existingId = null;
    }
    if (existingId) {
      if (originalId) {
        backupIds.set(originalId, existingId);
        matchedIds.add(existingId);
      }
      skipped++;
      continue;
    }
    const targetId = originalId || (await importId(key));
    const ref = doc(db, `users/${uid}/words/${targetId}`);
    const added = await runTransaction(db, async (tx) => {
      const current = await tx.get(ref);
      if (current.exists()) return false;
      tx.set(ref, {
        ...word,
        createdAt: serverTimestamp(),
        ...(source
          ? {
              importedFrom: { uid: source.id, displayName: source.displayName },
            }
          : {}),
      });
      return true;
    });
    if (added) imported++;
    else skipped++;
    existing.set(key, targetId);
    ids.add(targetId);
    if (originalId) backupIds.set(originalId, targetId);
    onProgress({ imported, skipped });
  }
  notifyVocabularyChanged();
  return { imported, skipped };
}

export async function importStudyBackup(uid, backup) {
  const restoredIds = new Map();
  const result = await importVocabulary(
    uid,
    backup.words,
    null,
    undefined,
    restoredIds,
  );
  let contrastsAdded = 0;
  for (const exercise of backup.customContrasts) {
    // A source card can have been deleted since authoring. Its saved forms
    // still make the exercise playable.
    const wordIds = exercise.wordIds.map((id) => restoredIds.get(id) || id);
    const added = await addCustomContrast(uid, { ...exercise, wordIds });
    if (added) contrastsAdded++;
  }
  return { ...result, contrastsAdded };
}
