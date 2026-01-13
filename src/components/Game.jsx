import { MASTERY_CRITERIA } from '../config.js';
import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js'; 
import { getDocs, collection, doc, serverTimestamp, increment, setDoc, query, limit } from 'firebase/firestore';
import { useAchievementCheck } from '../hooks/useAchievementCheck.js';

// --- ICONOS ---
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const SwapIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> );
const RotateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;

// =================================================================================
// COMPONENTE VISUAL: CARA DE LA TARJETA
// =================================================================================
const CardFace = ({ palabra, isFront, direction, baseGradientClasses }) => {
    const isGermanSide = (isFront && direction === 'de-es') || (!isFront && direction === 'es-de');
    const mainText = isGermanSide ? palabra.german : palabra.spanish;
    const langLabel = isGermanSide ? 'ALEMÁN' : 'ESPAÑOL';
    
    // Diccionarios para visualización
    const articles = { m: 'der', f: 'die', n: 'das' };
    const genderLabels = { m: 'Masculino', f: 'Femenino', n: 'Neutral' };
    
    let displayMain = mainText;
    let typeInfo = "";

    if (isGermanSide) {
        if (palabra.type === 'noun' && palabra.attributes?.gender) {
            displayMain = `${articles[palabra.attributes.gender]} ${mainText.charAt(0).toUpperCase() + mainText.slice(1)}`;
            typeInfo = `Sustantivo • ${genderLabels[palabra.attributes.gender] || ''}`;
        } else {
            typeInfo = palabra.type.charAt(0).toUpperCase() + palabra.type.slice(1);
        }
    } else {
        typeInfo = "Traducción";
    }

    // Estilo Glossy con corte diagonal nítido
    const sharpReflectionStyle = { 
        background: 'linear-gradient(125deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0) 45.1%, rgba(0,0,0,0.1) 100%)' 
    };

    return (
        <div 
            className={`
                absolute w-full h-full rounded-[2rem] 
                ${baseGradientClasses} 
                backdrop-blur-xl border border-white/20 shadow-2xl 
                flex flex-col p-8 overflow-hidden backface-hidden
            `}
            style={{ 
                backfaceVisibility: 'hidden', 
                transform: isFront ? 'rotateY(0deg)' : 'rotateY(180deg)' 
            }}
        >
            {/* Capa de brillo */}
            <div className="absolute inset-0 pointer-events-none mix-blend-overlay" style={sharpReflectionStyle}></div>
            
            {/* Header */}
            <div className="flex justify-between items-start z-10">
                <span className="text-xs font-bold tracking-[0.2em] text-white/70 uppercase">{langLabel}</span>
                {isFront && <div className="animate-pulse"><RotateIcon /></div>}
            </div>

            {/* Contenido */}
            <div className="flex-1 flex flex-col justify-center z-10 my-4">
                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight leading-tight drop-shadow-md break-words">
                    {displayMain}
                </h2>
                <p className="text-lg text-white/80 font-medium tracking-wide">{typeInfo}</p>
                
                {/* Info extra para verbos (solo cara alemana) */}
                {isGermanSide && palabra.type === 'verb' && !palabra.isDerived && palabra.attributes?.pastTense && (
                    <div className="mt-4 pt-4 border-t border-white/20 w-full">
                        <p className="text-sm text-white/90 opacity-90 font-mono">
                            {palabra.attributes.pastTense}, {palabra.attributes.participle}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="z-10 flex justify-between items-end w-full">
                <span className="text-xs font-bold text-white/90 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                    Nivel {palabra.difficulty}
                </span>
                {!isFront && (
                    <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Reverso</span>
                )}
            </div>
        </div>
    );
};

// =================================================================================
// COMPONENTE VISUAL: STACK DE CARTAS (CON ANIMACIONES AJUSTADAS)
// =================================================================================
const CardStack = ({ palabra, flipped, direction, onClick, cardsLeft, isSwipingOut }) => {
    let baseGradient = "bg-gradient-to-br from-gray-700 to-gray-800";
    let stackColor = "bg-gray-800";

    if (palabra.type === 'noun') {
        if (palabra.attributes?.gender === 'm') { baseGradient = "bg-gradient-to-br from-blue-500 to-blue-700"; stackColor = "bg-blue-900"; }
        if (palabra.attributes?.gender === 'f') { baseGradient = "bg-gradient-to-br from-pink-500 to-pink-700"; stackColor = "bg-pink-900"; }
        if (palabra.attributes?.gender === 'n') { baseGradient = "bg-gradient-to-br from-emerald-500 to-emerald-700"; stackColor = "bg-emerald-900"; }
    } else if(palabra.type === 'verb') {
        baseGradient = "bg-gradient-to-br from-orange-500 to-orange-700"; stackColor = "bg-orange-900";
    } else if (palabra.type === 'adjective') {
        baseGradient = "bg-gradient-to-br from-purple-500 to-purple-700"; stackColor = "bg-purple-900";
    }

    // --- ANIMACIONES DE DESLIZAMIENTO ---
    // duration-150 para salida rápida, duration-200 para entrada suave
    const swipeAnimationClasses = isSwipingOut 
        ? "-translate-x-[120%] rotate-[-15deg] opacity-0 duration-150 ease-in" 
        : "translate-x-0 rotate-0 opacity-100 duration-200 ease-out"; 

    return (
        <div className={`relative w-full h-80 sm:h-96 transition-all ${swipeAnimationClasses}`} style={{ perspective: "1200px" }}>
            
            {/* Cartas decorativas del fondo (Mazo) */}
            {cardsLeft > 1 && (
                <div className={`absolute inset-0 rounded-[2rem] ${stackColor} opacity-30 transform translate-y-8 scale-[0.90] blur-[1px] transition-all duration-300`}></div>
            )}
            {cardsLeft > 0 && (
                <div className={`absolute inset-0 rounded-[2rem] ${stackColor} opacity-50 transform translate-y-4 scale-[0.95] transition-all duration-300 shadow-xl`}></div>
            )}

            {/* Carta Principal */}
            {/* duration-300 para un giro más rápido */}
            <div 
                onClick={onClick}
                className="relative w-full h-full cursor-pointer transition-transform duration-300 transform-style-3d shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
                style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
                <CardFace palabra={palabra} isFront={true} direction={direction} baseGradientClasses={baseGradient} />
                <CardFace palabra={palabra} isFront={false} direction={direction} baseGradientClasses={baseGradient} />
            </div>
        </div>
    );
};


// =================================================================================
// LÓGICA DEL JUEGO (GAME)
// =================================================================================
function Game({ user, onTrophyUnlock }) {
  const [allWords, setAllWords] = useState([]);
  const [myOriginalWords, setMyOriginalWords] = useState([]); 
  const [filteredWords, setFilteredWords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const checkAchievements = useAchievementCheck(user, onTrophyUnlock);
  
  const initialFilters = { type: '', categoryId: '', difficulty: '', performance: '', gender: '', case: '', separablePrefix: '', friendPlay: '' };
  const [filters, setFilters] = useState(initialFilters);
  
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [indice, setIndice] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState('de-es');

  const [gameMode, setGameMode] = useState('random');
  const [reviewDeck, setReviewDeck] = useState([]);
  const [friends, setFriends] = useState([]);

  // Estado para controlar la animación de salida
  const [isSwipingOut, setIsSwipingOut] = useState(false);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
        // Aumentamos el límite para que el "mazo" sea representativo
        const MAX_WORDS = 1000; 
        
        const [wordsSnapshot, categoriesSnapshot, progressSnapshot, friendsSnapshot] = await Promise.all([
            getDocs(query(collection(db, `users/${user.uid}/words`), limit(MAX_WORDS))),
            getDocs(query(collection(db, "categories"), limit(100))),
            getDocs(query(collection(db, `users/${user.uid}/progress`), limit(MAX_WORDS))),
            getDocs(query(collection(db, `users/${user.uid}/friends`), limit(500)))
        ]);

        setFriends(friendsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setCategories(categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const progressData = progressSnapshot.docs.reduce((acc, doc) => { 
            acc[doc.id] = doc.data(); 
            return acc; 
        }, {});

        const baseWords = wordsSnapshot.docs.map(doc => {
            const wordData = doc.data();
            const progress = progressData[doc.id] || { correct: 0, incorrect: 0, correctStreak: 0 };
            const totalPlays = (progress.correct || 0) + (progress.incorrect || 0);
            const errorRate = totalPlays > 0 ? (progress.incorrect || 0) / totalPlays : 0;
            
            const isMastered = (totalPlays >= MASTERY_CRITERIA.MIN_PLAYS && errorRate < MASTERY_CRITERIA.MAX_ERROR_RATE) || (progress.correctStreak || 0) >= MASTERY_CRITERIA.STREAK_NEEDED;

            return { id: doc.id, ...wordData, progress: { ...progress, totalPlays, errorRate, isMastered } };
        });
        
        const playableWords = [];
        baseWords.forEach(word => {
            playableWords.push(word);
            if (word.type === 'verb' && word.attributes?.separablePrefixes) {
                word.attributes.separablePrefixes.forEach(p => {
                    playableWords.push({ 
                        ...word, 
                        id: `${word.id}_${p.prefix}`, 
                        german: p.prefix.toLowerCase() + word.german, 
                        spanish: p.meaning, 
                        isDerived: true 
                    });
                });
            }
        });
        
        setAllWords(playableWords);
        setMyOriginalWords(playableWords);

    } catch (err) { 
        setError("No se pudieron cargar los datos."); 
        console.error(err); 
    } finally { 
        setLoading(false); 
    }
};
    fetchData();
  }, [user]);

  // --- FILTRADO ---
  useEffect(() => {
    const applyFiltersAndLoadFriendWords = async () => {
        let sourceWords = myOriginalWords;

        if (filters.friendPlay) {
            const friendUid = filters.friendPlay;
            const friendWordsSnapshot = await getDocs(query(collection(db, `users/${friendUid}/words`), limit(50)));
            
            sourceWords = friendWordsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                progress: { correct: 0, incorrect: 0, correctStreak: 0, totalPlays: 0, errorRate: 0, isMastered: false }
            }));
            
            const friendPlayableWords = [];
            sourceWords.forEach(word => {
                friendPlayableWords.push(word);
                if (word.type === 'verb' && word.attributes?.separablePrefixes) {
                    word.attributes.separablePrefixes.forEach(p => {
                        friendPlayableWords.push({ ...word, id: `${word.id}_${p.prefix}`, german: p.prefix + word.german, spanish: p.meaning, isDerived: true });
                    });
                }
            });
            sourceWords = friendPlayableWords;
        } else if (allWords !== myOriginalWords) {
            sourceWords = myOriginalWords;
        }

        setAllWords(sourceWords);

        setFilteredWords(sourceWords.filter(w => {
            if (filters.type && w.type !== filters.type) return false;
            if (filters.categoryId && w.categoryId !== filters.categoryId) return false;
            if (filters.difficulty && w.difficulty !== parseInt(filters.difficulty)) return false;
            if (filters.type === 'noun' && filters.gender && w.attributes?.gender !== filters.gender) return false;
            if (filters.type === 'preposition' && filters.case && w.attributes?.case !== filters.case) return false;
            
            if (filters.performance && !filters.friendPlay) {
                const p = w.progress;
                if (filters.performance === 'new' && p.totalPlays >= 3) return false;
                if (filters.performance === 'struggling' && (p.totalPlays < 3 || p.errorRate <= 0.3)) return false;
                if (filters.performance === 'difficult' && (p.totalPlays < 5 || p.errorRate <= 0.5)) return false;
            }
            return true;
        }));
    };

    applyFiltersAndLoadFriendWords();
  }, [filters, myOriginalWords]);

  // --- INICIALIZACIÓN DEL MAZO ---
  useEffect(() => {
    if (filteredWords.length === 0) return;
    setFlipped(false);
    if (gameMode === 'review') {
      const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
      setReviewDeck(shuffled);
    } else {
      setIndice(Math.floor(Math.random() * filteredWords.length));
    }
  }, [filteredWords, gameMode]);

  const palabraActual = gameMode === 'review' ? reviewDeck[0] : filteredWords[indice];

  // --- SELECCIÓN DE SIGUIENTE PALABRA ---
  const selectNextWord = () => {
    if (filteredWords.length <= 1) {
      if (gameMode === 'review') setReviewDeck(prev => prev.slice(1));
      else setIndice(0);
      return;
    }
    switch(gameMode) {
      case 'review':
        setReviewDeck(prevDeck => prevDeck.slice(1));
        break;
      case 'smart':
        const weights = filteredWords.map(word => {
            const p = word.progress;
            const newnessScore = 5 / (p.totalPlays + 1);
            const errorScore = (p.errorRate ** 2) * 10;
            const baseWeight = 0.1;
            return { word, weight: newnessScore + errorScore + baseWeight };
        });
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        let nextWord = filteredWords.find(w => w.id !== palabraActual?.id) || filteredWords[0];
        for (const item of weights) {
            random -= item.weight;
            if (random <= 0) { if (item.word.id !== palabraActual?.id) { nextWord = item.word; break; } }
        }
        setIndice(filteredWords.findIndex(w => w.id === nextWord.id));
        break;
      case 'random':
      default:
        let nuevoIndice;
        do { nuevoIndice = Math.floor(Math.random() * filteredWords.length); } while (filteredWords.length > 1 && nuevoIndice === indice);
        setIndice(nuevoIndice);
        break;
    }
  };

  // --- MANEJO DE RESPUESTA (Con corrección de glitch) ---
  const handleNextWord = async (answeredCorrectly) => {
    if (isAnimating || isSwipingOut || !palabraActual || !user) return;

    // 1. Iniciamos la animación de salida INMEDIATAMENTE
    setIsSwipingOut(true);

    // 2. Guardado en Firebase (sucede en paralelo a la animación)
    if (!filters.friendPlay) {
        const baseWordId = palabraActual.id.split('_')[0];
        const progressRef = doc(db, `users/${user.uid}/progress`, baseWordId);
        const dataToUpdate = { lastReviewed: serverTimestamp() };
      
        if (answeredCorrectly) {
          dataToUpdate.correct = increment(1);
          dataToUpdate.correctStreak = increment(1);

          // Si hay filtros activos, registrar el evento para logros
          if (filters.difficulty || filters.categoryId) {
            const eventsRef = collection(db, `users/${user.uid}/user_events`);
            addDoc(eventsRef, {
                type: 'correct_answer_with_filters',
                filters: {
                    difficulty: filters.difficulty || null,
                    categoryId: filters.categoryId || null,
                },
                timestamp: serverTimestamp()
            });
          }

        } else {
          dataToUpdate.incorrect = increment(1);
          dataToUpdate.correctStreak = 0;
        }
      
        const userDocRef = doc(db, `users`, user.uid);
        // "Fire and forget" para que no bloquee la UI
        setDoc(userDocRef, { lastSeen: serverTimestamp() }, { merge: true });
        setDoc(progressRef, dataToUpdate, { merge: true });
    }

    // 3. Esperamos 200ms (un poco más que los 150ms de la animación de salida CSS)
    // para asegurar que la carta ya no es visible antes de resetearla.
    setTimeout(() => {
        setFlipped(false);      // Reseteamos el giro (ahora es invisible)
        selectNextWord();       // Cambiamos los datos
        setIsSwipingOut(false); // Traemos la nueva carta (animación de entrada)
        // 4. Verificar logros tras actualizar progreso
        setTimeout(() => checkAchievements(), 300);
    }, 200); 
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'type') {
      setFilters(prev => ({ ...initialFilters, [name]: value }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const clearFilters = () => { setFilters(initialFilters); setIsFilterMenuOpen(false); };
  const handleFlip = () => { if (!isAnimating && !isSwipingOut) { setIsAnimating(true); setFlipped(!flipped); setTimeout(() => setIsAnimating(false), 300); }};
  const toggleDirection = () => { setDirection(prev => prev === 'de-es' ? 'es-de' : 'de-es'); setFlipped(false); };
  const handleShuffleReview = () => { const shuffled = [...filteredWords].sort(() => Math.random() - 0.5); setReviewDeck(shuffled); };

  if (loading) return <div className="h-full flex items-center justify-center text-white/50 animate-pulse">Cargando mazo...</div>;
  if (error) return <div className="h-full flex items-center justify-center text-red-400">{error}</div>;

  return ( 
    <div className="h-full flex flex-col relative">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 pt-2">
            <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">Jugar</h1>
            <div className="flex gap-2">
                <button onClick={toggleDirection} className="p-2.5 rounded-full bg-gray-800/60 hover:bg-gray-700 backdrop-blur-md border border-white/5 text-gray-300 transition-colors" title={direction === 'de-es' ? 'Alemán -> Español' : 'Español -> Alemán'}><SwapIcon/></button>
                <button onClick={() => setIsFilterMenuOpen(true)} className="p-2.5 rounded-full bg-gray-800/60 hover:bg-gray-700 backdrop-blur-md border border-white/5 text-gray-300 transition-colors"><FilterIcon/></button>
            </div>
        </div>

        {/* TABS */}
        <div className="bg-gray-800/60 p-1.5 rounded-2xl flex mb-8 backdrop-blur-md border border-white/5 shadow-inner">
            {['random', 'review', 'smart'].map((m) => (
                <button key={m} onClick={() => setGameMode(m)} className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 uppercase tracking-wide ${gameMode === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 transform scale-[1.02]' : 'text-gray-400 hover:text-gray-200'}`}>{m === 'random' ? 'Aleatorio' : m === 'review' ? 'Repaso' : 'Inteligente'}</button>
            ))}
        </div>

        {/* ÁREA DE LA CARTA (STACK) */}
        <div className="flex-1 flex flex-col justify-center relative perspective-1000 mb-8 min-h-[350px]">
            {filteredWords.length > 0 ? (
                gameMode === 'review' && reviewDeck.length === 0 ? (
                    <div className="text-center p-8 bg-gray-800/50 rounded-3xl border border-white/5 backdrop-blur-sm">
                        <p className="text-3xl mb-4">🎉</p>
                        <p className="text-2xl font-bold text-green-400 mb-2">¡Repaso completado!</p>
                        <p className="text-gray-400 mb-6">Has visto todas las palabras.</p>
                        <button onClick={handleShuffleReview} className="px-6 py-3 font-bold bg-blue-600 rounded-xl hover:bg-blue-500 text-white transition-colors">Volver a barajar</button>
                    </div>
                ) : !palabraActual ? (
                    <div className="text-center text-white/50">Cargando palabra...</div>
                ) : (
                    <CardStack 
                        palabra={palabraActual} 
                        flipped={flipped} 
                        direction={direction} 
                        onClick={handleFlip} 
                        cardsLeft={gameMode === 'review' ? reviewDeck.length : filteredWords.length}
                        isSwipingOut={isSwipingOut} 
                    />
                )
            ) : (
                <div className="text-center p-8 bg-gray-800/50 rounded-3xl border border-white/5">
                    <p className="text-xl font-semibold text-gray-300">No hay palabras</p>
                    <p className="text-gray-500 mt-2 text-sm">Prueba a cambiar los filtros.</p>
                </div>
            )}
            
            {/* Contador sutil */}
            {filteredWords.length > 0 && (
                <p className="text-center text-white/30 text-xs mt-8 font-medium tracking-wider uppercase">
                    {gameMode === 'review' ? `${filteredWords.length - reviewDeck.length + 1} de ${filteredWords.length}` : `${filteredWords.length} palabras en el mazo`}
                </p>
            )}
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="grid grid-cols-2 gap-4 mt-auto pt-4">
            <button onClick={() => handleNextWord(false)} className="group py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white hover:border-red-500"><XIcon /> <span>No la sé</span></button>
            <button onClick={() => handleNextWord(true)} className="group py-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-green-500 hover:text-white hover:border-green-500"><CheckIcon /> <span>¡Acertada!</span></button>
        </div>

        {/* MODAL DE FILTROS */}
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isFilterMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsFilterMenuOpen(false)}></div>
            <div className={`absolute top-0 right-0 h-full w-80 bg-slate-900 shadow-2xl border-l border-white/10 transform transition-transform duration-300 p-6 overflow-y-auto ${isFilterMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-bold text-white">Configuración</h3><button onClick={() => setIsFilterMenuOpen(false)} className="text-gray-400 hover:text-white">✕</button></div>
                
                <div className="space-y-6">
                    <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</label><select name="type" value={filters.type} onChange={handleFilterChange} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500 transition-colors"><option value="">Todos</option><option value="noun">Sustantivo</option><option value="verb">Verbo</option><option value="adjective">Adjetivo</option><option value="preposition">Preposición</option></select></div>
                    {filters.type === 'noun' && (<div className="space-y-2 animate-fade-in"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Género</label><select name="gender" value={filters.gender} onChange={handleFilterChange} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500"><option value="">Todos</option><option value="m">Masculino (der)</option><option value="f">Femenino (die)</option><option value="n">Neutro (das)</option></select></div>)}
                    <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría</label><select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500"><option value="">Todas</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name_es}</option>)}</select></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dificultad</label><div className="flex gap-2">{[1, 2, 3, 4, 5].map(lvl => (<button key={lvl} onClick={() => handleFilterChange({target: {name: 'difficulty', value: filters.difficulty === lvl.toString() ? '' : lvl.toString()}})} className={`flex-1 py-2 rounded-lg font-bold text-sm border ${filters.difficulty === lvl.toString() ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>{lvl}</button>))}</div></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modo Amigo</label><select name="friendPlay" value={filters.friendPlay || ''} onChange={handleFilterChange} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-purple-500"><option value="">Jugar solo</option>{friends.map(friend => (<option key={friend.id} value={friend.id}>Mazo de {friend.displayName}</option>))}</select></div>
                </div>

                <div className="mt-10 pt-6 border-t border-white/10 flex flex-col gap-3">
                    <button onClick={() => setIsFilterMenuOpen(false)} className="w-full py-3 bg-blue-600 rounded-xl text-white font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-colors">Aplicar Filtros</button>
                    <button onClick={clearFilters} className="w-full py-3 bg-transparent text-gray-400 text-sm font-medium hover:text-white transition-colors">Restablecer todo</button>
                </div>
            </div>
        </div>
    </div>
  );
}

export default Game;