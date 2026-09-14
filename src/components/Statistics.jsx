import React, { useState } from "react";
import { useStudyData } from "../hooks/useStudyData.js";
import { studyId, progressStats, localDay } from "../utils/study.js";
export default function Statistics({ user }) {
  const study = useStudyData(user.uid);
  const [direction, setDirection] = useState("de-es");
  if (study.loading) return <p role="status">Cargando estadísticas…</p>;
  if (study.error)
    return (
      <div role="alert">
        {study.error}
        <button onClick={study.reload}>Reintentar</button>
      </div>
    );
  const records = study.items.map((word) =>
    progressStats(study.progress[studyId(word, direction, user.uid)]),
  );
  const total = records.reduce((sum, item) => sum + item.totalPlays, 0),
    correct = records.reduce((sum, item) => sum + item.correct, 0);
  const due = records.filter((item) => item.schedule?.due <= Date.now()).length;
  const days = Object.values(study.daily)
    .filter((day) => day.reviews)
    .sort((a, b) => a.day.localeCompare(b.day));
  let longest = 0,
    streak = 0,
    previous;
  for (const day of days) {
    const at = Date.parse(day.day + "T00:00:00Z");
    streak = previous && at - previous === 86400000 ? streak + 1 : 1;
    longest = Math.max(longest, streak);
    previous = at;
  }
  const today = localDay(),
    yesterday = new Date(Date.parse(today + "T00:00:00Z") - 86400000)
      .toISOString()
      .slice(0, 10);
  const activeStreak =
    days.at(-1)?.day === today || days.at(-1)?.day === yesterday ? streak : 0;
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-bold">Tu aprendizaje</h2>
      <select
        aria-label="Dirección de las estadísticas"
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        className="p-3 rounded-xl bg-gray-800"
      >
        <option value="de-es">Alemán → Español</option>
        <option value="es-de">Español → Alemán</option>
        <option value="listen">Dictado alemán</option>
      </select>
      <div className="grid grid-cols-2 gap-3">
        {[
          [study.items.length, "Tarjetas en mi mazo"],
          [due, "Repasos pendientes"],
          [
            records.filter((item) => item.totalPlays).length,
            "Tarjetas practicadas",
          ],
          [
            total ? `${Math.round((correct / total) * 100)}%` : "—",
            "Respuestas recordadas",
          ],
          [activeStreak, "Días seguidos"],
          [longest, "Mejor racha"],
        ].map(([value, label]) => (
          <div key={label} className="p-4 rounded-2xl bg-gray-800">
            <strong className="block text-3xl text-blue-300">{value}</strong>
            <span className="text-sm text-gray-400">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Cada verbo con prefijo y cada dirección tiene su propio progreso. Las
        rachas incluyen todos los repasos de tarjetas y se registran al
        estudiar, según el día local del dispositivo. El historial anterior se
        conserva en la exportación JSON; no se reparte entre tarjetas nuevas.
      </p>
      <h3 className="font-bold">Últimos días de estudio</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr>
              <th className="py-2">Día</th>
              <th>Repasos</th>
              <th>Recordados</th>
              <th>Nuevas</th>
            </tr>
          </thead>
          <tbody>
            {days
              .slice(-30)
              .reverse()
              .map((day) => (
                <tr key={day.day} className="border-t border-white/10">
                  <td className="py-2">{day.day}</td>
                  <td>{day.reviews}</td>
                  <td>{day.correct}</td>
                  <td>{day.newCards}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!days.length && (
        <p className="text-gray-400">
          Tu primer repaso empezará este historial.
        </p>
      )}
      {study.pending > 0 && (
        <p role="status" className="text-amber-300">
          {study.pending} respuestas pendientes de sincronizar; los días se
          actualizan cuando se confirman.
        </p>
      )}
    </section>
  );
}
