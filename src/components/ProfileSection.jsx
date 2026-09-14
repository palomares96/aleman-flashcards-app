import React, { useEffect, useState } from "react";
import StatsDashboard from "./Statistics.jsx";
import FriendsManager from "./FriendsManager.jsx";
import DataSettings from "./DataSettings.jsx";
import { signOut } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { auth } from "../firebase.js";
import {
  flushReviews,
  pendingReviews,
  clearStudyMemory,
  setOfflineEnabled,
} from "../services/studyStore.js";
import {
  aiService,
  localAIStatus,
  downloadLocalAI,
  clearAICache,
} from "../services/aiService.js";
export default function ProfileSection({ user, userProfile }) {
  const [settingsProfile, setSettingsProfile] = useState(userProfile);
  const [tab, setTab] = useState("stats"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [usage, setUsage] = useState(null),
    [local, setLocal] = useState("checking"),
    [download, setDownload] = useState(null);
  useEffect(() => {
    let active = true;
    aiService
      .usage()
      .then((value) => {
        if (active) setUsage(value);
      })
      .catch(() => {});
    localAIStatus().then((value) => {
      if (active) setLocal(value);
    });
    return () => {
      active = false;
    };
  }, []);
  const logout = async () => {
    setBusy(true);
    setError("");
    try {
      if (pendingReviews(user.uid).length) {
        void flushReviews(user.uid);
        throw new Error(
          "Quedan repasos por sincronizar. Usa «Reintentar sincronización» en Repasar y vuelve a cerrar sesión.",
        );
      }
      if (Capacitor.isNativePlatform()) {
        const { FirebaseAuthentication } =
          await import("@capacitor-firebase/authentication");
        await FirebaseAuthentication.signOut();
      }
      await signOut(auth);
      clearStudyMemory(user.uid);
      clearAICache();
      setOfflineEnabled(user.uid, false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">{userProfile.displayName}</h1>
        <button disabled={busy} onClick={logout} className="text-red-300">
          Cerrar sesión
        </button>
      </div>
      <div className="p-4 rounded-xl bg-gray-800">
        <p className="font-bold">
          {userProfile.tier === "premium" ? "Premium" : "Plan gratuito"}
        </p>
        <p className="text-sm text-gray-400">
          IA local:{" "}
          {local === "available"
            ? "lista"
            : local === "downloadable" || local === "downloading"
              ? "requiere descarga"
              : "no disponible"}
          . La nube tiene un límite diario por función (se renueva a las 00:00
          UTC). Las solicitudes fallidas también cuentan.
        </p>
        {usage ? (
          <p className="text-sm mt-2">
            Hoy quedan {usage.generateSentence.remaining}/
            {usage.generateSentence.limit} generaciones y{" "}
            {usage.evaluateTranslation.remaining}/
            {usage.evaluateTranslation.limit} evaluaciones.
          </p>
        ) : (
          <button
            className="text-sm underline"
            onClick={() =>
              aiService
                .usage()
                .then(setUsage)
                .catch((e) => setError(e.message))
            }
          >
            Consultar límite de IA
          </button>
        )}
        {["downloadable", "downloading"].includes(local) && (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await downloadLocalAI(setDownload);
                setLocal(await localAIStatus());
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
            className="mt-3 p-3 rounded-xl bg-blue-600"
          >
            Descargar IA local {download !== null ? `${download}%` : ""}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-amber-300">
          {error}
        </p>
      )}
      <nav className="flex gap-2">
        {[
          ["stats", "Estadísticas"],
          ["friends", "Amigos"],
          ["settings", "Datos"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 p-3 text-sm rounded-xl ${tab === key ? "bg-blue-600" : "bg-gray-800"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "stats" && <StatsDashboard user={user} />}
      {tab === "friends" && <FriendsManager user={user} />}
      {tab === "settings" && (
        <DataSettings
          user={user}
          userProfile={settingsProfile}
          onSharingChange={(value) =>
            setSettingsProfile((previous) => ({
              ...previous,
              shareVocabulary: value,
            }))
          }
        />
      )}
    </div>
  );
}
