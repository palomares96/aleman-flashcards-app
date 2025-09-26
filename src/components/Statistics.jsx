import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { MASTERY_CRITERIA } from '../config.js'; // Importamos los criterios

function StatsDashboard({ user }) {
    const [stats, setStats] = useState({
        dailyData: [],
        kpis: {
            totalWords: 0,
            masteredToday: 0,
            masteredTotal: 0 // Nuevo KPI
        },
        masteredByType: [] // Nuevo dato para el gráfico
    });
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState(30);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;
            setLoading(true);

            // --- 1. OBTENEMOS TODOS LOS DATOS NECESARIOS A LA VEZ ---
            const [dailyStatsSnapshot, wordsSnapshot, progressSnapshot] = await Promise.all([
                getDocs(query(collection(db, "dailyStats"), where("userId", "==", user.uid), orderBy("date", "asc"))),
                getDocs(collection(db, `users/${user.uid}/words`)),
                getDocs(collection(db, `users/${user.uid}/progress`))
            ]);

            // --- 2. PROCESAMOS LAS ESTADÍSTICAS DIARIAS (Gráfico de evolución) ---
            const today = new Date();
            const startDate = new Date();
            startDate.setDate(today.getDate() - timeframe);
            const dailyData = dailyStatsSnapshot.docs
                .map(doc => doc.data())
                .filter(data => data.date.toDate() >= startDate)
                .map(data => ({
                    label: data.date.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
                    value: data.masteredCount
                }));
            const masteredToday = dailyData.length > 0 ? dailyData[dailyData.length - 1].value : 0;

            // --- 3. CALCULAMOS EL VOCABULARIO TOTAL (Contando verbos separables) ---
            let totalPlayableWords = 0;
            const wordTypeMap = new Map(); // Usaremos esto para el gráfico
            wordsSnapshot.forEach(doc => {
                totalPlayableWords++;
                const wordData = doc.data();
                wordTypeMap.set(doc.id, wordData.type); // Guardamos el tipo de cada palabra
                if (wordData.type === 'verb' && wordData.attributes?.separablePrefixes) {
                    totalPlayableWords += wordData.attributes.separablePrefixes.length;
                }
            });

            // --- 4. CALCULAMOS EL TOTAL DE PALABRAS DOMINADAS Y EL DESGLOSE POR TIPO ---
            let masteredTotal = 0;
            const masteredByTypeCounters = { noun: 0, verb: 0, adjective: 0, preposition: 0, Otros: 0 };
            const mainTypes = ['noun', 'verb', 'adjective', 'preposition'];

            progressSnapshot.forEach(progressDoc => {
                const progress = progressDoc.data();
                const totalPlays = (progress.correct || 0) + (progress.incorrect || 0);
                const errorRate = totalPlays > 0 ? (progress.incorrect || 0) / totalPlays : 0;
                const isMastered = (totalPlays >= MASTERY_CRITERIA.MIN_PLAYS && errorRate < MASTERY_CRITERIA.MAX_ERROR_RATE) || (progress.correctStreak || 0) >= MASTERY_CRITERIA.STREAK_NEEDED;

                if (isMastered) {
                    masteredTotal++;
                    const wordType = wordTypeMap.get(progressDoc.id);
                    if (mainTypes.includes(wordType)) {
                        masteredByTypeCounters[wordType]++;
                    } else {
                        masteredByTypeCounters.Otros++;
                    }
                }
            });
            
            // Convertimos el objeto de contadores a un array para el gráfico
            const masteredByType = Object.entries(masteredByTypeCounters).map(([name, value]) => ({ name, value }));
            
            // --- 5. ACTUALIZAMOS EL ESTADO CON TODOS LOS DATOS NUEVOS ---
            setStats({
                dailyData,
                kpis: {
                    totalWords: totalPlayableWords,
                    masteredToday,
                    masteredTotal
                },
                masteredByType
            });

            setLoading(false);
        };

        fetchStats();
    }, [user, timeframe]);

    if (loading) return <div className="p-10 text-center">Cargando estadísticas...</div>;
    
    // --- COMPONENTES VISUALES ---
    const maxMasteredEvolution = Math.max(...stats.dailyData.map(d => d.value), 1);
    const maxMasteredByType = Math.max(...stats.masteredByType.map(d => d.value), 1);
    const typeTranslations = { noun: 'Sust.', verb: 'Verbos', adjective: 'Adj.', preposition: 'Prep.', Otros: 'Otros' };
    // Reemplaza el objeto typeColors por este:
    const typeColors = { noun: '#3b82f6', verb: '#ec4899', adjective: '#f59e0b', preposition: '#22c55e', Otros: '#6b7280' };

    const StatCard = ({ title, value, subtext }) => (
        <div className="bg-gray-800 p-6 rounded-lg text-center sm:text-left">
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
            
            {/* --- SECCIÓN DE KPIs ACTUALIZADA --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <StatCard title="Vocabulario Total" value={stats.kpis.totalWords} subtext="Palabras jugables" />
                <StatCard title="Dominadas (Total)" value={stats.kpis.masteredTotal} subtext="Desde el inicio" />
                <StatCard title="Dominadas (Hoy)" value={stats.kpis.masteredToday} subtext="Calculado diariamente" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- GRÁFICO DE EVOLUCIÓN (SIN CAMBIOS) --- */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Evolución de Palabras Dominadas</h3>
                        <div className="flex gap-2">
                            <TimeframeButton days={7}>7 D</TimeframeButton>
                            <TimeframeButton days={30}>30 D</TimeframeButton>
                            <TimeframeButton days={90}>90 D</TimeframeButton>
                        </div>
                    </div>
                    {stats.dailyData.length > 1 ? (
                        <div className="flex justify-between items-end h-60 gap-1 border-l border-b border-gray-700 p-2">
                            {stats.dailyData.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end group" title={`${day.label}: ${day.value} dominadas`}>
                                    <div className="bg-green-500 group-hover:bg-green-400 rounded-t-sm w-3/4 transition-colors" style={{ height: `${(day.value / maxMasteredEvolution) * 100}%` }}></div>
                                    <span className="text-xs text-gray-500 mt-2 transform -rotate-45">{day.label}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-60 text-gray-500">
                            <p>No hay suficientes datos. ¡Sigue jugando!</p>
                        </div>
                    )}
                </div>

                {/* --- NUEVO GRÁFICO: DOMINADAS POR TIPO --- */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Palabras Dominadas por Tipo</h3>
                    {stats.kpis.masteredTotal > 0 ? (
                        <div className="flex justify-around items-end h-60 gap-4 border-l border-b border-gray-700 p-2">
                            {stats.masteredByType.map((type) => (
                                <div key={type.name} className="flex-1 flex flex-col items-center justify-end group" title={`${typeTranslations[type.name] || type.name}: ${type.value}`}>
                                    <span className="text-sm font-bold mb-1">{type.value}</span>
                                    <div className="group-hover:opacity-80 rounded-t-sm w-full transition-opacity" style={{ 
                                        height: `${(type.value / maxMasteredByType) * 100}%`,
                                        backgroundColor: typeColors[type.name] || '#6b7280' 
                                    }}></div>
                                    <span className="text-xs text-gray-400 mt-2">{typeTranslations[type.name] || type.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-60 text-gray-500">
                            <p>¡Domina algunas palabras para ver el gráfico!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StatsDashboard;