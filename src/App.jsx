import React, { useState, useEffect, useRef } from "react";
import AppLayout from "./components/AppLayout.jsx";
import Login from "./components/Login.jsx";
import CreateUsername from "./components/CreateUserName.jsx";
import PrivacyPolicy from "./components/PrivacyPolicy.jsx";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDocFromServer } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./firebase.js";
import { clearStudyMemory } from "./services/studyStore.js";
function App() {
  const [user, setUser] = useState(null),
    [profile, setProfile] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [showPrivacy, setShowPrivacy] = useState(false);
  const generation = useRef(0),
    currentUid = useRef(null);
  const loadProfile = async (current) => {
    const version = ++generation.current;
    setLoading(true);
    setError("");
    setProfile(null);
    try {
      if (current && globalThis.navigator?.onLine === false)
        throw new Error("Sin conexión.");
      const snapshot = current
        ? await getDocFromServer(doc(db, "users", current.uid))
        : null;
      if (version !== generation.current) return;
      setProfile(snapshot?.exists() ? snapshot.data() : null);
      // Publish only the minimal discoverable profile; no email/tier is copied.
      if (snapshot?.exists())
        void httpsCallable(
          functions,
          "savePublicProfile",
        )({}).catch(() => {
          /* Friends screen provides a retry. */
        });
    } catch (failure) {
      if (version === generation.current) {
        let cached;
        try {
          cached =
            current &&
            localStorage.getItem(`aleman:offline:${current.uid}`) === "true" &&
            JSON.parse(localStorage.getItem(`aleman:profile:${current.uid}`));
        } catch {
          /* show original error */
        }
        if (cached?.displayName) setProfile(cached);
        else setError(`No se pudo cargar tu perfil. ${failure.message}`);
      }
    } finally {
      if (version === generation.current) setLoading(false);
    }
  };
  useEffect(
    () =>
      onAuthStateChanged(auth, (current) => {
        if (currentUid.current && currentUid.current !== current?.uid)
          clearStudyMemory(currentUid.current);
        currentUid.current = current?.uid || null;
        setUser(current);
        void loadProfile(current);
      }),
    [],
  );
  if (showPrivacy)
    return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />;
  if (loading)
    return (
      <div className="p-10 text-white bg-gray-900 min-h-screen" role="status">
        Conectando…
      </div>
    );
  if (error)
    return (
      <div className="p-10 text-white bg-gray-900 min-h-screen" role="alert">
        <p>{error}</p>
        <button
          onClick={() => loadProfile(user)}
          className="p-3 bg-blue-600 rounded-xl mt-4"
        >
          Reintentar
        </button>
      </div>
    );
  if (user && !profile)
    return (
      <CreateUsername user={user} onProfileCreated={() => loadProfile(user)} />
    );
  return user && profile ? (
    <AppLayout
      key={user.uid}
      user={user}
      userProfile={profile}
      onShowPrivacy={() => setShowPrivacy(true)}
    />
  ) : (
    <Login onShowPrivacy={() => setShowPrivacy(true)} />
  );
}
export default App;
