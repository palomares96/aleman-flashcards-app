import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { lexicalKey, portableWord } from "../utils/transfer.js";
import { readCollection, notifyVocabularyChanged } from "./repository.js";
export async function importVocabulary(
  uid,
  words,
  source = null,
  onProgress = () => {},
) {
  const existing = new Set(
    (await readCollection(`users/${uid}/words`)).map(lexicalKey),
  );
  let imported = 0,
    skipped = 0;
  for (const original of words) {
    if (auth.currentUser?.uid !== uid)
      throw new Error("La sesión ha cambiado.");
    const word = portableWord(original),
      key = lexicalKey(word);
    if (existing.has(key)) {
      skipped++;
      continue;
    }
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(key),
    );
    const hash = Array.from(new Uint8Array(bytes), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const ref = doc(db, `users/${uid}/words/import_${hash}`);
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
    existing.add(key);
    onProgress({ imported, skipped });
  }
  notifyVocabularyChanged();
  return { imported, skipped };
}
