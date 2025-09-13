import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js'; // Ajusta la ruta
import { query, collection, where, orderBy, getDocs } from "firebase/firestore";

// =================================================================================
// COMPONENTE #4: Dashboard de Estadísticas (ACTUALIZADO)
// =================================================================================
// Borra tu componente StatsDashboard actual y pega este en su lugar:

function StatsDashboard({ user }) {
    const [stats, setStats] = useState({ dailyData: [], kpis: { totalWords: 0, currentMastered: 0 } });
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState(30); // 7, 30, 90 días

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;
            setLoading(true);

            // 1. Obtener los snapshots diarios de la Cloud Function
            const today = new Date();
            const startDate = new Date();
            startDate.setDate(today.getDate() - timeframe);

            const statsQuery = query(
                collection(db, "dailyStats"),
                where("userId", "==", user.uid),
                where("date", ">=", startDate),
                orderBy("date", "asc")
            );

            const [statsSnapshot, wordsSnapshot] = await Promise.all([
                getDocs(statsQuery),
                getDocs(collection(db, "words"))
            ]);
            
            const dailyData = statsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    // Formatea la fecha a DD/MM
                    label: new Date(data.date.seconds * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit'}),
                    value: data.masteredCount
                };
            });
            
            // 2. Obtener los KPIs
            const totalWords = wordsSnapshot.size;
            const currentMastered = dailyData.length > 0 ? dailyData[dailyData.length - 1].value : 0;
            
            setStats({
                dailyData,
                kpis: {
                    totalWords,
                    currentMastered,
                }
            });

            setLoading(false);
        };

        fetchStats();
    }, [user, timeframe]);

    if (loading) return <div className="p-10 text-center">Cargando estadísticas...</div>;
    
    const maxMastered = Math.max(...stats.dailyData.map(d => d.value), 1);

    const StatCard = ({ title, value, subtext }) => (
        <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400">{title}</h3>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
    );
    
    const TimeframeButton = ({ days, children }) => (
        <button onClick={() => setTimeframe(days)} className={`px-3 py-1 text-xs rounded-full ${timeframe === days ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
            {children}
        </button>
    );

    return (
        <div className="w-full max-w-4xl mx-auto">
            <h1 className="mb-8 text-3xl font-bold text-gray-300">Dashboard de Progreso</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <StatCard title="Vocabulario Total" value={stats.kpis.totalWords} subtext="Palabras en tu diccionario" />
                <StatCard title="Palabras Dominadas (Hoy)" value={stats.kpis.currentMastered} subtext="Calculado diariamente" />
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Evolución de Palabras Dominadas</h3>
                    <div className="flex gap-2">
                        <TimeframeButton days={7}>7 Días</TimeframeButton>
                        <TimeframeButton days={30}>30 Días</TimeframeButton>
                        <TimeframeButton days={90}>90 Días</TimeframeButton>
                    </div>
                </div>
                {stats.dailyData.length > 0 ? (
                    <div className="flex justify-between items-end h-60 gap-1 border-l border-b border-gray-700 p-2">
                        {stats.dailyData.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${day.label}: ${day.value} dominadas`}>
                                <div className="bg-green-500 hover:bg-green-400 rounded-t-sm w-3/4" style={{ height: `${(day.value / maxMastered) * 100}%` }}></div>
                                <span className="text-xs text-gray-500 mt-2 transform -rotate-45">{day.label}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-60 text-gray-500">
                        <p>No hay datos todavía. ¡Sigue jugando para empezar a ver tu progreso!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StatsDashboard;