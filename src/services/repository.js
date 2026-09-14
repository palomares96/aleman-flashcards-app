import {
  collection,
  getDocsFromServer,
  query,
  orderBy,
  documentId,
  startAfter,
  limit,
} from "firebase/firestore";
import { db } from "../firebase.js";

export async function readCollection(path) {
  const rows = [];
  let cursor;
  do {
    const page = await getDocsFromServer(
      query(
        collection(db, path),
        orderBy(documentId()),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(200),
      ),
    );
    rows.push(
      ...page.docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id })),
    );
    if (page.docs.length < 200) break;
    cursor = page.docs.at(-1);
  } while (cursor);
  return rows;
}
export const notifyVocabularyChanged = () =>
  window.dispatchEvent(new Event("vocabulary-changed"));
