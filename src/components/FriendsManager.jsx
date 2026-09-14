import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase.js";
import ImportModal from "./ImportModal.jsx";
export default function FriendsManager({ user }) {
  const [friends, setFriends] = useState([]),
    [requests, setRequests] = useState([]),
    [outgoing, setOutgoing] = useState([]),
    [term, setTerm] = useState(""),
    [results, setResults] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [friend, setFriend] = useState(null);
  useEffect(() => {
    const fail = () =>
      setMessage(
        "No se pudo cargar la información de amigos. Reabre esta pestaña para reintentar.",
      );
    const subscriptions = [
      onSnapshot(
        collection(db, `users/${user.uid}/friends`),
        (snap) => setFriends(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        fail,
      ),
      onSnapshot(
        query(
          collection(db, "friendRequests"),
          where("to_uid", "==", user.uid),
          where("status", "==", "pending"),
        ),
        (snap) =>
          setRequests(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        fail,
      ),
      onSnapshot(
        query(
          collection(db, "friendRequests"),
          where("from_uid", "==", user.uid),
          where("status", "==", "pending"),
        ),
        (snap) =>
          setOutgoing(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        fail,
      ),
    ];
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [user.uid]);
  const call = async (name, data, success) => {
    setBusy(true);
    setMessage("");
    try {
      await httpsCallable(functions, name)(data);
      setMessage(success);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const search = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setResults([]);
    try {
      await httpsCallable(functions, "savePublicProfile")({});
      const lower = term.trim().normalize("NFC").toLowerCase();
      if (lower.length < 2) throw new Error("Escribe al menos dos caracteres.");
      const snapshot = await getDocs(
        query(
          collection(db, "publicProfiles"),
          orderBy("displayName_lowercase"),
          where("displayName_lowercase", ">=", lower),
          where("displayName_lowercase", "<=", lower + "\uf8ff"),
          limit(20),
        ),
      );
      const found = snapshot.docs
        .map((d) => d.data())
        .filter((p) => p.uid !== user.uid);
      setResults(found);
      if (!found.length)
        setMessage(
          "No hay coincidencias. Los usuarios antiguos aparecen después de abrir la app actualizada.",
        );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-bold">Amigos</h2>
      <p className="text-sm text-gray-400">
        Solo se muestra tu nombre de usuario. Cada amigo decide si comparte sus
        palabras.
      </p>
      <form onSubmit={search} className="flex gap-2">
        <input
          aria-label="Buscar usuario"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Nombre de usuario"
          className="min-w-0 flex-1 p-3 rounded-xl bg-gray-800"
        />
        <button disabled={busy} className="p-3 rounded-xl bg-blue-600">
          Buscar
        </button>
      </form>
      {message && (
        <p role="status" className="text-amber-300">
          {message}
        </p>
      )}
      {results.map((profile) => (
        <div
          key={profile.uid}
          className="flex justify-between gap-2 p-3 bg-gray-800 rounded-xl"
        >
          <span>{profile.displayName}</span>
          <button
            disabled={
              busy ||
              friends.some((f) => f.id === profile.uid) ||
              outgoing.some((r) => r.to_uid === profile.uid)
            }
            onClick={() =>
              call(
                "sendFriendRequest",
                { toUid: profile.uid },
                "Solicitud enviada; revisa también tus solicitudes recibidas.",
              )
            }
            className="text-blue-300 disabled:text-gray-500"
          >
            Añadir
          </button>
        </div>
      ))}
      {requests.length > 0 && (
        <h3 className="font-bold">Solicitudes recibidas</h3>
      )}
      {requests.map((request) => (
        <div key={request.id} className="p-3 bg-gray-800 rounded-xl space-y-2">
          <p>{request.from_displayName}</p>
          <div className="flex gap-4">
            <button
              disabled={busy}
              onClick={() =>
                call(
                  "handleFriendRequest",
                  { requestId: request.id, action: "accept" },
                  "Amistad aceptada.",
                )
              }
              className="text-green-300"
            >
              Aceptar
            </button>
            <button
              disabled={busy}
              onClick={() =>
                call(
                  "handleFriendRequest",
                  { requestId: request.id, action: "decline" },
                  "Solicitud rechazada.",
                )
              }
              className="text-red-300"
            >
              Rechazar
            </button>
          </div>
        </div>
      ))}
      {outgoing.map((request) => (
        <div
          key={request.id}
          className="flex justify-between p-3 bg-gray-800 rounded-xl"
        >
          <span>Pendiente: {request.to_displayName}</span>
          <button
            disabled={busy}
            onClick={() =>
              call(
                "handleFriendRequest",
                { requestId: request.id, action: "cancel" },
                "Solicitud cancelada.",
              )
            }
          >
            Cancelar
          </button>
        </div>
      ))}
      <h3 className="font-bold">Mis amigos ({friends.length})</h3>
      {friends.map((item) => (
        <div key={item.id} className="p-4 bg-gray-800 rounded-xl">
          <p className="font-bold">{item.displayName}</p>
          <div className="flex gap-4 mt-2">
            <button onClick={() => setFriend(item)} className="text-blue-300">
              Importar palabras
            </button>
            <button
              disabled={busy}
              onClick={() =>
                call(
                  "removeFriend",
                  { friendUid: item.id },
                  "Amistad eliminada; el acceso compartido se ha revocado.",
                )
              }
              className="text-red-300"
            >
              Eliminar amistad
            </button>
          </div>
        </div>
      ))}
      {friend && (
        <ImportModal
          user={user}
          friend={friend}
          onClose={() => setFriend(null)}
        />
      )}
    </section>
  );
}
