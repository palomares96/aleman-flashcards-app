// src/components/Statistics.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { collection, getDocs, query, where, orderBy, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { MASTERY_CRITERIA } from '../config.js';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function StatsDashboard({ user }) {
    const [stats, setStats] = useState({
        dailyData: [],
        kpis: { totalWords: 0, masteredToday: 0, masteredTotal: 0 },
        masteredByType: []
    });
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState(7);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;
            setLoading(true);

            try {
                const maxDaysQuery = new Date();
                maxDaysQuery.setDate(maxDaysQuery.getDate() - 90);

                const emptySnap = { docs: [] };
                const [dailyStatsSnapshot, wordsSnapshot, progressSnapshot] = await Promise.all([
                    getDocs(query(
                        collection(db, "dailyStats"),
                        where("userId", "==", user.uid),
                        where("date", ">=", maxDaysQuery),
                        orderBy("date", "asc")
                    )).catch(err => {
                        console.error("Error fetching dailyStats:", err);
                        return emptySnap;
                    }),
                    getDocs(collection(db, `users/${user.uid}/words`)).catch(err => {
                        console.error("Error fetching words:", err);
                        return emptySnap;
                    }),
                    getDocs(collection(db, `users/${user.uid}/progress`)).catch(err => {
                        console.error("Error fetching progress:", err);
                        return emptySnap;
                    })
                ]);

                // 1. Datos Históricos (Gráfico)
                const today = new Date();
                const startDate = new Date();
                startDate.setDate(today.getDate() - timeframe);

                const dailyData = dailyStatsSnapshot.docs
                    .map(doc => doc.data())
                    .filter(data => data.date && data.date.toDate() >= startDate)
                    .map(data => ({
                        label: data.date.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
                        value: data.masteredCount
                    }));

                // 2. Cálculo en Tiempo Real (Vocabulario y Tipos)
                let totalPlayableWords = 0;
                const wordTypeMap = new Map();

                wordsSnapshot.forEach(doc => {
                    const w = doc.data();
                    const baseId = doc.id;

                    wordTypeMap.set(baseId, w.type);
                    totalPlayableWords++;

                    if (w.type === 'verb' && w.attributes?.separablePrefixes) {
                        w.attributes.separablePrefixes.forEach(p => {
                            const derivedId = `${baseId}_${p.prefix}`;
                            wordTypeMap.set(derivedId, 'verb');
                            totalPlayableWords++;
                        });
                    }
                });

                // 3. Cálculo de Dominadas (TOTAL EN TIEMPO REAL)
                let liveMasteredTotal = 0;
                const masteredByTypeCounters = { noun: 0, verb: 0, adjective: 0, preposition: 0, Otros: 0 };
                const mainTypes = ['noun', 'verb', 'adjective', 'preposition'];

                progressSnapshot.forEach(progressDoc => {
                    const progress = progressDoc.data();
                    const wordId = progressDoc.id;

                    const totalPlays = (progress.correct || 0) + (progress.incorrect || 0);
                    const errorRate = totalPlays > 0 ? (progress.incorrect || 0) / totalPlays : 0;
                    const isMastered = (totalPlays >= MASTERY_CRITERIA.MIN_PLAYS && errorRate < MASTERY_CRITERIA.MAX_ERROR_RATE) || (progress.correctStreak || 0) >= MASTERY_CRITERIA.STREAK_NEEDED;

                    if (isMastered) {
                        liveMasteredTotal++;
                        let wordType = wordTypeMap.get(wordId);
                        if (!wordType && wordId && wordId.includes('_')) {
                            const baseId = wordId.split('_')[0];
                            wordType = wordTypeMap.get(baseId);
                        }
                        if (wordType) wordType = String(wordType).toLowerCase();

                        if (wordType && mainTypes.includes(wordType)) {
                            masteredByTypeCounters[wordType]++;
                        } else {
                            masteredByTypeCounters.Otros++;
                        }
                    }
                });

                // 4. Guardar snapshot diario si no existe aún
                const todayStr = today.toISOString().split('T')[0]; // "2026-02-25"
                const dailyStatDocId = `${user.uid}_${todayStr}`;
                const dailyStatRef = doc(db, "dailyStats", dailyStatDocId);

                try {
                    const existingSnap = await getDoc(dailyStatRef);
                    if (!existingSnap.exists()) {
                        // Crear snapshot de hoy
                        await setDoc(dailyStatRef, {
                            userId: user.uid,
                            date: Timestamp.fromDate(new Date(todayStr + 'T00:00:00')),
                            masteredCount: liveMasteredTotal
                        });
                    } else {
                        // Actualizar si el conteo ha cambiado
                        const existingData = existingSnap.data();
                        if (existingData.masteredCount !== liveMasteredTotal) {
                            await setDoc(dailyStatRef, { masteredCount: liveMasteredTotal }, { merge: true });
                        }
                    }
                } catch (snapErr) {
                    console.warn("Could not save daily stats snapshot:", snapErr);
                }

                // 5. Cálculo de "Dominadas Hoy" (Delta vs. ayer)
                const yesterdayData = dailyData.length > 0 ? dailyData[dailyData.length - 1] : null;
                // Si el último dato no es de hoy, usamos su valor como base para calcular el delta
                const lastRecordedTotal = yesterdayData ? yesterdayData.value : 0;
                const masteredToday = Math.max(0, liveMasteredTotal - lastRecordedTotal);

                const masteredByType = Object.entries(masteredByTypeCounters).map(([name, value]) => ({ name, value }));

                setStats({
                    dailyData,
                    kpis: {
                        totalWords: totalPlayableWords,
                        masteredToday: masteredToday,
                        masteredTotal: liveMasteredTotal
                    },
                    masteredByType
                });
            } catch (err) {
                console.error("Error loading statistics:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user, timeframe]);

    if (loading) return <div className="p-10 text-center">Cargando estadísticas...</div>;

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.7)', titleFont: { size: 14 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 4 } },
        scales: { x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#a0aec0' } }, y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#a0aec0', stepSize: 5 } } },
        elements: { line: { tension: 0.3 } },
    };

    const lineChartData = {
        labels: stats.dailyData.map(d => d.label),
        datasets: [{ label: 'Palabras Dominadas', data: stats.dailyData.map(d => d.value), fill: true, borderColor: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.2)', pointBackgroundColor: '#34d399', pointHoverBorderColor: '#ffffff', pointHoverBackgroundColor: '#ffffff' }],
    };

    const maxByType = Math.max(...stats.masteredByType.map(d => d.value), 10);
    const yLabelsByType = [0, Math.ceil(maxByType / 2), maxByType];
    const typeTranslations = { noun: 'Sust.', verb: 'Verbos', adjective: 'Adj.', preposition: 'Prep.', Otros: 'Otros' };
    const typeColors = { noun: '#3b82f6', verb: '#ec4899', adjective: '#f59e0b', preposition: '#22c55e', Otros: '#6b7280' };

    const StatCard = ({ title, value, subtext }) => (<div className="bg-gray-800 p-6 rounded-lg text-center sm:text-left"><h3 className="text-sm font-medium text-gray-400">{title}</h3><p className="text-3xl font-bold mt-2">{value}</p>{subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}</div>);
    const TimeframeButton = ({ days, children }) => (<button onClick={() => setTimeframe(days)} className={`px-3 py-1 text-xs rounded-full ${timeframe === days ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{children}</button>);

    return (
        <div className="w-full max-w-4xl mx-auto">
            <h1 className="mb-8 text-3xl font-bold text-gray-300">Dashboard de Progreso</h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <StatCard title="Vocabulario Total" value={stats.kpis.totalWords} subtext="Palabras jugables" />
                <StatCard title="Dominadas (Total)" value={stats.kpis.masteredTotal} subtext="Tiempo real" />
                <StatCard title="Dominadas (Hoy)" value={stats.kpis.masteredToday} subtext="Desde ayer noche" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Evolución</h3>
                        <div className="flex gap-2"><TimeframeButton days={7}>7 D</TimeframeButton><TimeframeButton days={30}>30 D</TimeframeButton><TimeframeButton days={90}>90 D</TimeframeButton></div>
                    </div>
                    {stats.dailyData.length > 1 ? <div className="relative h-60"><Line options={lineChartOptions} data={lineChartData} /></div> : <div className="flex items-center justify-center h-60 text-gray-500"><p>Se necesitan más datos.</p></div>}
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Por Tipo</h3>
                    {stats.kpis.masteredTotal > 0 ? (
                        <div className="flex h-60 gap-3">
                            <div className="flex flex-col-reverse justify-between text-xs text-gray-500 pr-2 border-r border-gray-700">{yLabelsByType.map(label => <span key={`type-${label}`}>{label}</span>)}</div>
                            <div className="flex-1 grid grid-cols-5 gap-4 relative">
                                <div className="absolute top-0 left-0 w-full h-full flex flex-col-reverse justify-between">{yLabelsByType.map((_, i) => <div key={`grid-type-${i}`} className="w-full border-t border-gray-700/50"></div>)}</div>
                                {stats.masteredByType.map((type) => {
                                    const barHeight = (type.value / maxByType) * 100;
                                    return (
                                        <div key={type.name} className="flex flex-col items-center justify-end group z-10" title={`${typeTranslations[type.name] || type.name}: ${type.value}`}>
                                            <div className="w-full flex items-center justify-center rounded-t-sm transition-all duration-500 ease-out" style={{ height: `${barHeight}%`, backgroundColor: typeColors[type.name] || '#6b7280', minHeight: '2px' }}>{barHeight > 15 && <span className="text-sm font-bold text-white/80">{type.value}</span>}</div>
                                            <span className="text-xs text-gray-400 mt-2">{typeTranslations[type.name] || type.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : <div className="flex items-center justify-center h-60 text-gray-500"><p>¡Domina algunas palabras!</p></div>}
                </div>
            </div>
        </div>
    );
}

export default StatsDashboard;