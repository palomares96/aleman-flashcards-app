// src/components/SentenceMode.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

// --- ICONOS ---
const SpinnerIcon = () => <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 15.5" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const LightbulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;

// --- UTILIDAD DE ESTILOS PARA PALABRAS (Glassmorphism) ---
const getWordStyle = (type, gender) => {
    const base = "bg-opacity-20 border border-opacity-40 backdrop-blur-sm shadow-sm";
    
    if (type === 'noun') {
        if (gender === 'm') return `${base} bg-blue-500 border-blue-400 text-blue-200`;
        if (gender === 'f') return `${base} bg-pink-500 border-pink-400 text-pink-200`;
        if (gender === 'n') return `${base} bg-emerald-500 border-emerald-400 text-emerald-200`;
        return `${base} bg-indigo-500 border-indigo-400 text-indigo-200`;
    }
    if (type === 'verb') return `${base} bg-orange-500 border-orange-400 text-orange-200`;
    if (type === 'adjective') return `${base} bg-purple-500 border-purple-400 text-purple-200`;
    if (type === 'preposition') return `${base} bg-teal-500 border-teal-400 text-teal-200`;
    
    return `${base} bg-gray-600 border-gray-500 text-gray-300`;
};

// --- NUEVA UTILIDAD DE ESTILOS PARA LA PUNTUACIÓN (0-10) ---
const getScoreColor = (score) => {
    if (score === undefined || score === null) return { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-600', title: '...' };
    
    if (score >= 9) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/50', badge: 'bg-green-500 text-white', title: '¡Excelente!' };
    if (score >= 7) return { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/50', badge: 'bg-lime-600 text-white', title: '¡Buen trabajo!' };
    if (score >= 5) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/50', badge: 'bg-yellow-600 text-white', title: 'Aceptable' };
    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/50', badge: 'bg-red-600 text-white', title: 'Necesita mejorar' };
};

// --- VISUALIZADOR DE FRASES ---
const SentenceRenderer = ({ sentence }) => {
    if (!sentence) return null;
    const parts = sentence.split(/(\[[^\]]+\])/g);

    return (
        <div className="text-xl sm:text-2xl font-medium text-white leading-loose flex flex-wrap justify-center gap-x-1.5 items-center">
            {parts.map((part, i) => {
                const match = part.match(/^\[(.*?)\|(.*?)\]$/);
                if (match) {
                    const [_, typeTag, text] = match;
                    
                    let type = 'other';
                    let gender = null;

                    if (typeTag.includes('noun')) type = 'noun';
                    if (typeTag.includes('noun-m')) gender = 'm';
                    if (typeTag.includes('noun-f')) gender = 'f';
                    if (typeTag.includes('noun-n')) gender = 'n';
                    if (typeTag.includes('verb')) type = 'verb';
                    if (typeTag.includes('adj')) type = 'adjective';
                    if (typeTag.includes('prep')) type = 'preposition';

                    const style = getWordStyle(type, gender);

                    return <span key={i} className={`px-2 py-0.5 rounded-md font-semibold border-b-2 transition-all duration-200 cursor-default ${style}`}>{text}</span>;
                }
                return <span key={i} className="opacity-90">{part}</span>;
            })}
        </div>
    );
};

function SentenceMode({ user }) {
    const [allWords, setAllWords] = useState([]);
    const [categories, setCategories] = useState([]);
    const [direction, setDirection] = useState('de-es');
    const [wordCounts, setWordCounts] = useState({ noun: 1, verb: 1, adjective: 1, preposition: 0 });
    const [filters, setFilters] = useState({ categoryId: '', difficulty: '', performance: '' });
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const [currentSentence, setCurrentSentence] = useState('');
    const [selectedWordsList, setSelectedWordsList] = useState([]);
    const [userTranslation, setUserTranslation] = useState('');
    const [evaluation, setEvaluation] = useState(null); // { score: 8, feedback: "...", betterTranslation: "..." }
    const [loading, setLoading] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const [wordsSnap, catsSnap, progressSnap] = await Promise.all([
                    getDocs(collection(db, `users/${user.uid}/words`)),
                    getDocs(collection(db, "categories")),
                    getDocs(collection(db, `users/${user.uid}/progress`))
                ]);

                const progressMap = {};
                progressSnap.forEach(doc => progressMap[doc.id] = doc.data());

                const baseWords = wordsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    progress: progressMap[doc.id] || { totalPlays: 0, errorRate: 0 }
                }));

                const expandedWords = [];
                baseWords.forEach(word => {
                    expandedWords.push(word); 
                    if (word.type === 'verb' && word.attributes?.separablePrefixes) {
                        word.attributes.separablePrefixes.forEach(p => {
                            expandedWords.push({
                                ...word,
                                id: `${word.id}_${p.prefix}`,
                                german: p.prefix + word.german,
                                spanish: p.meaning,
                                isDerived: true
                            });
                        });
                    }
                });

                setAllWords(expandedWords);
                setCategories(catsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error(e); setError("Error al cargar datos."); }
        };
        fetchData();
    }, [user]);

    const generateSentence = async () => {
        setLoading(true);
        setError('');
        setEvaluation(null);
        setUserTranslation('');
        setCurrentSentence('');

        let pool = allWords.filter(w => {
            if (filters.categoryId && w.categoryId !== filters.categoryId) return false;
            if (filters.difficulty && w.difficulty !== parseInt(filters.difficulty)) return false;
            if (filters.performance === 'new' && w.progress.totalPlays >= 3) return false;
            return true;
        });

        const selected = [];
        const pickRandom = (type, count) => {
            const typePool = pool.filter(w => w.type === type);
            for (let i = 0; i < count; i++) {
                if (typePool.length > 0) selected.push(typePool[Math.floor(Math.random() * typePool.length)]);
            }
        };

        pickRandom('noun', wordCounts.noun);
        pickRandom('verb', wordCounts.verb);
        pickRandom('adjective', wordCounts.adjective);
        pickRandom('preposition', wordCounts.preposition);

        if (selected.length === 0) {
            setError("No hay suficientes palabras con estos filtros.");
            setLoading(false);
            return;
        }

        setSelectedWordsList(selected);

        const targetGenLang = direction === 'de-es' ? 'DE' : 'ES';
        const wordsPayload = selected.map(w => ({
            term: targetGenLang === 'DE' ? w.german : w.spanish,
            type: w.type,
            gender: w.attributes?.gender || null
        }));

        try {
            const functions = getFunctions(getApp(), "europe-west1");
            const generateFunc = httpsCallable(functions, 'generateSentence');
            const result = await generateFunc({ words: wordsPayload, targetLang: targetGenLang });
            setCurrentSentence(result.data.sentence);
        } catch (err) {
            console.error(err);
            setError("Error conectando con la IA.");
        } finally {
            setLoading(false);
        }
    };

    const checkTranslation = async (e) => {
        e.preventDefault();
        if (!userTranslation.trim()) return;
        setEvaluating(true);
        try {
            const functions = getFunctions(getApp(), "europe-west1");
            const evalFunc = httpsCallable(functions, 'evaluateTranslation');
            const sourceLang = direction === 'de-es' ? 'Alemán' : 'Español';
            const targetLang = direction === 'de-es' ? 'Español' : 'Alemán';

            const result = await evalFunc({
                originalSentence: currentSentence,
                userTranslation: userTranslation,
                sourceLang,
                targetLang
            });
            setEvaluation(result.data);
            
            // Guardar el intento de frase en Firestore
            if (user) {
                await addDoc(collection(db, `users/${user.uid}/sentenceAttempts`), {
                    sentence: currentSentence,
                    userTranslation: userTranslation,
                    score: result.data.score,
                    direction,
                    feedback: result.data.feedback,
                    betterTranslation: result.data.betterTranslation,
                    createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            console.error(err);
            setError("Error al evaluar.");
        } finally {
            setEvaluating(false);
        }
    };

    const Counter = ({ label, field }) => (
        <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">{label}</span>
            <div className="flex items-center gap-2 bg-gray-700 rounded px-2">
                <button onClick={() => setWordCounts(p => ({...p, [field]: Math.max(0, p[field]-1)}))} className="text-red-400 font-bold hover:bg-gray-600 px-2">-</button>
                <span className="w-4 text-center text-sm font-mono">{wordCounts[field]}</span>
                <button onClick={() => setWordCounts(p => ({...p, [field]: Math.min(3, p[field]+1)}))} className="text-green-400 font-bold hover:bg-gray-600 px-2">+</button>
            </div>
        </div>
    );

    // Variables de estilo calculadas para la evaluación
    const scoreStyle = evaluation ? getScoreColor(evaluation.score) : {};

    return (
        <div className="w-full max-w-3xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-300">Modo Frase</h1>
                <button onClick={() => setIsConfigOpen(!isConfigOpen)} className={`p-2 rounded-lg transition-colors ${isConfigOpen ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}><SettingsIcon /></button>
            </div>

            {isConfigOpen && (
                <div className="bg-gray-800 p-5 rounded-xl mb-6 border border-gray-700 shadow-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Juego</h4>
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => setDirection('de-es')} className={`flex-1 py-2 text-sm rounded-lg ${direction === 'de-es' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>🇩🇪 → 🇪🇸</button>
                                <button onClick={() => setDirection('es-de')} className={`flex-1 py-2 text-sm rounded-lg ${direction === 'es-de' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>🇪🇸 → 🇩🇪</button>
                            </div>
                            <div className="space-y-3">
                                <select value={filters.difficulty} onChange={e => setFilters({...filters, difficulty: e.target.value})} className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300"><option value="">Cualquier Nivel</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>Nivel {n}</option>)}</select>
                                <select value={filters.categoryId} onChange={e => setFilters({...filters, categoryId: e.target.value})} className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300"><option value="">Cualquier Categoría</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name_es}</option>)}</select>
                            </div>
                        </div>
                        <div><h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Estructura</h4><Counter label="Sustantivos" field="noun" /><Counter label="Verbos" field="verb" /><Counter label="Adjetivos" field="adjective" /><Counter label="Preposiciones" field="preposition" /></div>
                    </div>
                </div>
            )}

            <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
                
                {/* --- PISTAS SUPERIORES (Consistentes) --- */}
                {selectedWordsList.length > 0 && (
                    <div className="bg-gray-900/50 p-4 border-b border-gray-700">
                        <p className="text-xs text-gray-500 mb-3 uppercase tracking-widest text-center">Palabras a utilizar</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {selectedWordsList.map((w, i) => {
                                const style = getWordStyle(w.type, w.attributes?.gender);
                                return (
                                    <span key={i} className={`px-3 py-1 text-sm font-medium rounded-full border-b-2 ${style}`}>
                                        {direction === 'de-es' ? w.german : w.spanish}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="p-8 bg-gradient-to-b from-gray-800 to-gray-900 min-h-[180px] flex flex-col justify-center items-center text-center">
                    {loading ? <div className="flex flex-col items-center text-blue-400 animate-pulse"><SpinnerIcon /><span className="mt-2 text-sm">Creando frase...</span></div> : 
                     currentSentence ? <div className="w-full"><p className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">Traduce</p><SentenceRenderer sentence={currentSentence} /></div> : 
                     <div className="text-gray-500 italic">Configura y pulsa generar.</div>}
                </div>

                {currentSentence && (
                    <div className="p-6 bg-gray-800 border-t border-gray-700">
                        {!evaluation && (
                            <form onSubmit={checkTranslation}>
                                <div className="relative">
                                    <textarea 
                                        rows={3}
                                        value={userTranslation}
                                        onChange={(e) => setUserTranslation(e.target.value)}
                                        placeholder={direction === 'de-es' ? "Escribe la traducción..." : "Schreibe die Übersetzung..."}
                                        className="w-full p-4 bg-gray-900 text-white text-lg rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none placeholder-gray-600"
                                        autoFocus
                                        disabled={evaluating}
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button type="submit" disabled={evaluating || !userTranslation.trim()} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold rounded-lg flex items-center transition-colors">
                                            {evaluating ? <SpinnerIcon /> : <><CheckIcon /> Comprobar</>}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {evaluation && (
                            <div className={`animate-fade-in`}>
                                <div className="mb-4 p-4 bg-gray-900 rounded-xl border border-gray-700 text-gray-300 italic text-lg">
                                    "{userTranslation}"
                                </div>

                                {/* CAJA DE EVALUACIÓN MEJORADA */}
                                <div className={`p-5 rounded-xl border-l-4 shadow-lg transition-colors duration-500 ${scoreStyle.bg} ${scoreStyle.border}`}>
                                    <div className="flex items-start gap-4">
                                        {/* Nota Numérica */}
                                        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-full shrink-0 shadow-md ${scoreStyle.badge}`}>
                                            <span className="text-2xl font-bold">{evaluation.score}</span>
                                            <span className="text-[10px] uppercase font-bold opacity-80">/ 10</span>
                                        </div>

                                        <div className="flex-1">
                                            <h4 className={`font-bold text-lg mb-1 ${scoreStyle.text}`}>
                                                {scoreStyle.title}
                                            </h4>
                                            <p className="text-gray-300 text-sm leading-relaxed mb-3">{evaluation.feedback}</p>
                                            
                                            {evaluation.betterTranslation && (
                                                <div className="bg-black/20 p-3 rounded-lg mt-2 border border-gray-700/50">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase mb-1"><LightbulbIcon /> Solución ideal</div>
                                                    <p className="text-blue-100 font-medium text-lg">{evaluation.betterTranslation}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button onClick={generateSentence} className="flex items-center gap-2 text-sm font-bold text-white bg-gray-700 hover:bg-gray-600 px-5 py-2.5 rounded-lg transition-all border border-gray-600 hover:shadow-lg">
                                            <RefreshIcon /> Siguiente Frase
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {!currentSentence && !loading && (
                <button onClick={generateSentence} className="mt-8 mx-auto flex items-center gap-2 text-white font-bold bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-full shadow-lg transform hover:-translate-y-1 transition-all">
                    <RefreshIcon /> Generar Primera Frase
                </button>
            )}
            
            {error && <div className="mt-4 text-center p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300">{error}</div>}
        </div>
    );
}

export default SentenceMode;