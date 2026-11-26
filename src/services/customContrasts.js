import { doc, runTransaction } from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { prepareContrast } from "../utils/contrasts.js";

export async function addCustomContrast(uid, exercise) {
  if (auth.currentUser?.uid !== uid) throw new Error("La sesión ha cambiado.");
  const { id, ...data } = prepareContrast(exercise);
  const ref = doc(db, `users/${uid}/customContrasts/${id}`);
  return runTransaction(db, async (tx) => {
    if ((await tx.get(ref)).exists()) return false;
    tx.set(ref, data);
    return true;
  });
}
