const { createHash } = require("node:crypto");
const { HttpsError } = require("firebase-functions/v2/https");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const uidValue = (value) => {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("/") ||
    value.length > 128
  )
    throw new HttpsError("invalid-argument", "Usuario no válido.");
  return value;
};
const requireAuth = (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  return request.auth.uid;
};
function createSocialHandlers(db, timestamp) {
  return {
    async savePublicProfile(request) {
      const uid = requireAuth(request);
      return db.runTransaction(async (tx) => {
        const userRef = db.doc(`users/${uid}`),
          old = await tx.get(userRef);
        // Existing accounts retain their identity; clients cannot rewrite tier/email.
        const displayName = old.exists
          ? old.data().displayName
          : String(request.data?.displayName || "")
              .normalize("NFC")
              .trim();
        if (
          typeof displayName !== "string" ||
          displayName.length < 3 ||
          displayName.length > 40 ||
          displayName.includes("/") ||
          [...displayName].some((character) => character.charCodeAt(0) < 32)
        )
          throw new HttpsError(
            "invalid-argument",
            "Usa un nombre de 3 a 40 caracteres, sin barras.",
          );
        const lower = displayName.toLowerCase();
        const reservation = db.doc(`usernames/${hash(lower)}`),
          reserved = await tx.get(reservation);
        if (!old.exists && reserved.exists && reserved.data().uid !== uid)
          throw new HttpsError("already-exists", "Ese nombre ya está en uso.");
        if (!old.exists) {
          // Include pre-migration accounts in the uniqueness check.
          const legacy = await tx.get(
            db
              .collection("users")
              .where("displayName_lowercase", "==", lower)
              .limit(1),
          );
          if (!legacy.empty)
            throw new HttpsError(
              "already-exists",
              "Ese nombre ya está en uso.",
            );
          tx.set(userRef, {
            uid,
            email: request.auth.token.email || "",
            displayName,
            displayName_lowercase: lower,
            tier: "free",
            shareVocabulary: false,
            createdAt: timestamp(),
          });
        }
        if (!reserved.exists) tx.set(reservation, { uid });
        const profile = { uid, displayName, displayName_lowercase: lower };
        tx.set(db.doc(`publicProfiles/${uid}`), profile);
        return profile;
      });
    },
    async sendFriendRequest(request) {
      const uid = requireAuth(request),
        toUid = uidValue(request.data?.toUid);
      if (uid === toUid)
        throw new HttpsError("invalid-argument", "Elige otro usuario.");
      const id = hash(JSON.stringify([uid, toUid].sort()));
      return db.runTransaction(async (tx) => {
        const ref = db.doc(`friendRequests/${id}`);
        const [from, to, friend, existing] = await Promise.all([
          tx.get(db.doc(`publicProfiles/${uid}`)),
          tx.get(db.doc(`publicProfiles/${toUid}`)),
          tx.get(db.doc(`users/${uid}/friends/${toUid}`)),
          tx.get(ref),
        ]);
        if (!from.exists || !to.exists)
          throw new HttpsError("not-found", "Perfil no disponible.");
        if (friend.exists)
          throw new HttpsError("already-exists", "Ya sois amigos.");
        if (
          existing.exists &&
          existing.data().status === "pending" &&
          existing.data().schemaVersion === 2
        )
          return { requestId: id, pending: true };
        tx.set(ref, {
          from_uid: uid,
          to_uid: toUid,
          from_displayName: from.data().displayName,
          to_displayName: to.data().displayName,
          status: "pending",
          schemaVersion: 2,
          createdAt: timestamp(),
        });
        return { requestId: id, pending: true };
      });
    },
    async handleFriendRequest(request) {
      const uid = requireAuth(request),
        id = uidValue(request.data?.requestId),
        action = request.data?.action;
      if (!["accept", "decline", "cancel"].includes(action))
        throw new HttpsError("invalid-argument", "Acción no válida.");
      return db.runTransaction(async (tx) => {
        const ref = db.doc(`friendRequests/${id}`),
          snap = await tx.get(ref);
        if (!snap.exists)
          throw new HttpsError("not-found", "Solicitud no disponible.");
        const data = snap.data();
        if ((action === "cancel" ? data.from_uid : data.to_uid) !== uid)
          throw new HttpsError(
            "permission-denied",
            "No puedes gestionar esta solicitud.",
          );
        if (data.status !== "pending")
          throw new HttpsError(
            "failed-precondition",
            "Esta solicitud ya se ha resuelto.",
          );
        if (action === "accept") {
          if (data.schemaVersion !== 2)
            throw new HttpsError(
              "failed-precondition",
              "Esta solicitud es de una versión antigua. Recházala y pide que te envíen una nueva.",
            );
          const [from, to] = await Promise.all([
            tx.get(db.doc(`publicProfiles/${data.from_uid}`)),
            tx.get(db.doc(`publicProfiles/${data.to_uid}`)),
          ]);
          if (!from.exists || !to.exists)
            throw new HttpsError("not-found", "Perfil no disponible.");
          tx.set(db.doc(`users/${data.from_uid}/friends/${data.to_uid}`), {
            displayName: to.data().displayName,
            since: timestamp(),
          });
          tx.set(db.doc(`users/${data.to_uid}/friends/${data.from_uid}`), {
            displayName: from.data().displayName,
            since: timestamp(),
          });
        }
        tx.update(ref, {
          status: action === "accept" ? "accepted" : "declined",
          resolvedAt: timestamp(),
        });
        return { success: true };
      });
    },
    async removeFriend(request) {
      const uid = requireAuth(request),
        friendUid = uidValue(request.data?.friendUid);
      const batch = db.batch();
      batch.delete(db.doc(`users/${uid}/friends/${friendUid}`));
      batch.delete(db.doc(`users/${friendUid}/friends/${uid}`));
      await batch.commit();
      return { success: true };
    },
  };
}
module.exports = { createSocialHandlers, requireAuth };
