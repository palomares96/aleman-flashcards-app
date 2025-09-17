import { MASTERY_CRITERIA } from '../config.js';
import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js'; // Usamos ../ para "subir" un nivel de la carpeta components
import { getDocs, collection, doc, serverTimestamp, increment, setDoc } from 'firebase/firestore';

// --- ICONOS NECESARIOS (Copiados de AppLayout.jsx) ---
const SwapIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> );
const CheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> );
const XIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> );
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>;
// --------------------------------------------------------

// =================================================================================
// COMPONENTE #1: El Juego de Flashcards
// =================================================================================
function Game({ user }) {
  const [allWords, setAllWords] = useState([]);
  const [myOriginalWords, setMyOriginalWords] = useState([]); 
  const [filteredWords, setFilteredWords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const initialFilters = { type: '', categoryId: '', difficulty: '', performance: '', gender: '', case: '', separablePrefix: '', friendPlay: '' };
  const [filters, setFilters] = useState(initialFilters);
  
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [indice, setIndice] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState('de-es');

  const [gameMode, setGameMode] = useState('random');
  const [reviewDeck, setReviewDeck] = useState([]);

  // Estado para la lista de amigos
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // <-- CORRECCIÓN 1: Se añade la carga de amigos aquí para que sea más eficiente -->
        const [wordsSnapshot, categoriesSnapshot, progressSnapshot, friendsSnapshot] = await Promise.all([
          getDocs(collection(db, `users/${user.uid}/words`)),
          getDocs(collection(db, "categories")),
          getDocs(collection(db, `users/${user.uid}/progress`)),
          getDocs(collection(db, `users/${user.uid}/friends`)) // Carga los amigos a la vez
        ]);

        // Procesa la lista de amigos
        const friendsList = friendsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFriends(friendsList);

        const categoriesList = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const progressData = progressSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = doc.data(); return acc;
        }, {});

        const baseWords = wordsSnapshot.docs.map(doc => {
            const wordId = doc.id;
            const wordData = doc.data();
            const progress = progressData[wordId] || { correct: 0, incorrect: 0, correctStreak: 0 };
            const totalPlays = (progress.correct || 0) + (progress.incorrect || 0);
            const errorRate = totalPlays > 0 ? (progress.incorrect || 0) / totalPlays : 0;
            
            const isMasteredByPlays = totalPlays >= MASTERY_CRITERIA.MIN_PLAYS && errorRate < MASTERY_CRITERIA.MAX_ERROR_RATE;
            const isMasteredByStreak = (progress.correctStreak || 0) >= MASTERY_CRITERIA.STREAK_NEEDED;
            const isMastered = isMasteredByPlays || isMasteredByStreak;

            return { id: wordId, ...wordData, progress: { ...progress, totalPlays, errorRate, isMastered } };
        });
        
        const playableWords = [];
        baseWords.forEach(word => {
            playableWords.push(word);
            if (word.type === 'verb' && word.attributes?.separablePrefixes) {
                word.attributes.separablePrefixes.forEach(p => {
                    playableWords.push({ ...word, id: `${word.id}_${p.prefix}`, german: p.prefix + word.german, spanish: p.meaning, isDerived: true });
                });
            }
        });
        setAllWords(playableWords);
        setCategories(categoriesList);

      } catch (err) { setError("No se pudieron cargar los datos."); console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user]);
  
  // <-- CORRECCIÓN 2: Este useEffect REEMPLAZA al que tenías. -->
  // Es asíncrono para poder consultar el progreso del amigo.
  useEffect(() => {
    const applyFilters = async () => {
        // Primero, aplicamos todos los filtros síncronos (los que ya tenías)
        let words = allWords.filter(w => {
            if (filters.type && w.type !== filters.type) return false;
            if (filters.categoryId && w.categoryId !== filters.categoryId) return false;
            if (filters.difficulty && w.difficulty !== parseInt(filters.difficulty)) return false;
            if (filters.type === 'noun' && filters.gender && w.attributes?.gender !== filters.gender) return false;
            if (filters.type === 'preposition' && filters.case && w.attributes?.case !== filters.case) return false;
            if (filters.type === 'verb' && filters.separablePrefix) {
                const hasPrefix = w.isDerived 
                    ? w.german.toLowerCase().startsWith(filters.separablePrefix.toLowerCase()) 
                    : w.attributes?.separablePrefixes?.some(p => p.prefix.toLowerCase().includes(filters.separablePrefix.toLowerCase()));
                if (!hasPrefix) return false;
            }
            if (filters.performance) {
                const p = w.progress;
                if (filters.performance === 'new' && p.totalPlays >= 3) return false;
                if (filters.performance === 'struggling' && (p.totalPlays < 3 || p.errorRate <= 0.3)) return false;
                if (filters.performance === 'difficult' && (p.totalPlays < 5 || p.errorRate <= 0.5)) return false;
            }
            return true;
        });

        // Ahora, si hay un amigo seleccionado, aplicamos el filtro de amigo (que es asíncrono)
        if (filters.friendPlay) {
            const friendUid = filters.friendPlay;
            // 1. Obtenemos el progreso del amigo
            const progressRef = collection(db, `users/${friendUid}/progress`);
            const progressSnapshot = await getDocs(progressRef);

            // 2. Filtramos para encontrar las palabras que le cuestan
            const strugglingWordIds = new Set();
            progressSnapshot.forEach(doc => {
                const data = doc.data();
                const total = (data.correct || 0) + (data.incorrect || 0);
                if (total > 3 && (data.incorrect / total) > 0.4) { // Criterio: +40% de error
                    strugglingWordIds.add(doc.id);
                }
            });

            // 3. Filtramos nuestro mazo ya filtrado para que solo incluya esas palabras
            words = words.filter(word => strugglingWordIds.has(word.id.split('_')[0]));
        }

        setFilteredWords(words);
    };

    if (allWords.length > 0) {
        applyFilters();
    } else {
        setFilteredWords([]);
    }

  }, [filters, allWords, db]); // Añadimos 'db' a las dependencias

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

const handleNextWord = async (answeredCorrectly) => {
    if (isAnimating || !palabraActual || !user) return;

    const baseWordId = palabraActual.id.split('_')[0];
    const progressRef = doc(db, `users/${user.uid}/progress`, baseWordId);
  
    // --- CAMBIO ---: Lógica para actualizar la racha de aciertos.
    const dataToUpdate = {
      lastReviewed: serverTimestamp(),
    };
  
    if (answeredCorrectly) {
      dataToUpdate.correct = increment(1);
      dataToUpdate.correctStreak = increment(1);
    } else {
      dataToUpdate.incorrect = increment(1);
      dataToUpdate.correctStreak = 0; // Reinicia la racha si falla
    }
  
    // --- CAMBIO ---: Primera vez que el usuario interactúa, creamos el doc "users"
    const userDocRef = doc(db, `users`, user.uid);
    await setDoc(userDocRef, { lastSeen: serverTimestamp() }, { merge: true });

    await setDoc(progressRef, dataToUpdate, { merge: true });

    setFlipped(false);
    setTimeout(selectNextWord, 150);
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
  const handleFlip = () => { if (!isAnimating) { setIsAnimating(true); setFlipped(!flipped); setTimeout(() => setIsAnimating(false), 600); }};
  const toggleDirection = () => { setDirection(prev => prev === 'de-es' ? 'es-de' : 'de-es'); setFlipped(false); };
  const handleShuffleReview = () => {
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    setReviewDeck(shuffled);
  }

  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  const GameModeButton = ({ mode, children }) => (<button onClick={() => setGameMode(mode)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${gameMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>{children}</button>);

  return ( <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <div className={`fixed inset-0 bg-black/60 z-10 transition-opacity ${isFilterMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsFilterMenuOpen(false)}></div>
        <div className={`fixed top-0 right-0 h-full w-80 bg-gray-800 shadow-xl z-20 transform transition-transform p-6 overflow-y-auto ${isFilterMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <h3 className="text-2xl font-bold mb-6">Filtrar</h3>
            <div className="space-y-4">
                <div><label className="text-sm text-gray-400">Tipo</label><select name="type" value={filters.type} onChange={handleFilterChange} className="w-full mt-1 p-2 bg-gray-700 rounded-md"><option value="">Todos</option><option value="noun">Sustantivo</option><option value="verb">Verbo</option><option value="adjective">Adjetivo</option><option value="preposition">Preposición</option></select></div>
                {filters.type === 'noun' && (<div><label className="text-sm text-gray-400">Género</label><select name="gender" value={filters.gender} onChange={handleFilterChange} className="w-full mt-1 p-2 bg-gray-700 rounded-md"><option value="">Todos</option><option value="m">der</option><option value="f">die</option><option value="n">das</option></select></div>)}
                {filters.type === 'preposition' && (<div><label className="text-sm text-gray-400">Caso</label><select name="case" value={filters.case} onChange={handleFilterChange} className="w-full mt-1 p-2 bg-gray-700 rounded-md"><option value="">Todos</option><option value="Akkusativ">Akkusativ</option><option value="Dativ">Dativ</option><option value="Genitiv">Genitiv</option><option value="Wechselpräposition">Wechselpräposition</option></select></div>)}
                {filters.type === 'verb' && (<div><label className="text-sm text-gray-400">Prefijo Separable</label><input type="text" name="separablePrefix" value={filters.separablePrefix} onChange={handleFilterChange} className="w-full mt-1 p-2 bg-gray-700 rounded-md" placeholder="Ej: ein, auf, an..."/></div>)}
                <div><label className="text-sm text-gray-400">Categoría</label><select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="w-full mt-1 p-2 bg-gray-700 rounded-md"><option value="">Todas</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name_es}</option>)}</select></div>
                <div><label className="text-sm text-gray-400">Nivel (1-5)</label><select name="difficulty" value={filters.difficulty} onChange={handleFilterChange} className="w-full mt-1 p-2 bg-gray-700 rounded-md"><option value="">Todos</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></div>
                <div><label className="text-sm text-gray-400">Rendimiento</label><select name="performance" value={filters.performance} onChange={handleFilterChange} className="w-full mt-1 p-2 bg-gray-700 rounded-md"><option value="">Todas</option><option value="new">Palabras nuevas (&lt; 3 jugadas)</option><option value="struggling">Me cuestan (&gt;30% error)</option><option value="difficult">Muy difíciles (&gt;50% error)</option></select></div>
                <div>
        <label className="text-sm text-gray-400">Jugar con amigos</label>
        <select
            name="friendPlay"
            value={filters.friendPlay || ''}
            onChange={handleFilterChange}
            className="w-full mt-1 p-2 bg-gray-700 rounded-md"
        >
            <option value="">Nadie</option>
            {friends.map(friend => (
                <option key={friend.id} value={friend.id}>
                    Palabras difíciles de {friend.displayName}
                </option>
            ))}
        </select>
    </div>
            </div>
            <button onClick={clearFilters} className="w-full mt-8 py-2 bg-red-600 rounded-md hover:bg-red-700">Limpiar Filtros</button>
        </div>
        <div className="w-full flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-gray-300">Jugar</h1>
            <div><button onClick={toggleDirection} className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 rounded-l-lg hover:bg-gray-600"><SwapIcon/><span>{direction === 'de-es' ? 'DE-ES' : 'ES-DE'}</span></button><button onClick={() => setIsFilterMenuOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 rounded-r-lg hover:bg-gray-600 border-l border-gray-600"><FilterIcon/></button></div>
        </div>
        <div className="w-full flex justify-center gap-2 mb-6">
          <GameModeButton mode="random">Aleatorio</GameModeButton>
          <GameModeButton mode="review">Repaso</GameModeButton>
          <GameModeButton mode="smart">Inteligente</GameModeButton>
        </div>
        {filteredWords.length === 0 ? (
          <div className="text-center p-10 bg-gray-800 rounded-lg">
            <p className="text-xl font-semibold">No hay palabras</p>
            <p className="text-gray-400 mt-2">Prueba a cambiar o limpiar los filtros.</p>
          </div>
        ) : gameMode === 'review' && reviewDeck.length === 0 ? (
          <div className="text-center p-10 bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-green-400">🎉 ¡Repaso completado! 🎉</p>
            <p className="text-gray-400 mt-2 mb-6">Has visto todas las palabras de esta selección.</p>
            <button onClick={handleShuffleReview} className="px-6 py-3 font-semibold bg-blue-600 rounded-lg hover:bg-blue-500">Volver a barajar</button>
          </div>
        ) : !palabraActual ? (
          <div className="p-10 text-center">Cargando palabra...</div>
        ) : (
          <>
            <p className="mb-4 text-center text-gray-500">
              {gameMode === 'review' ? `Palabra ${filteredWords.length - reviewDeck.length + 1} de ${filteredWords.length}` : `${filteredWords.length} palabras en el mazo`}
            </p>
            <div className="w-full h-56 sm:h-64" style={{ perspective: "1200px" }} onClick={handleFlip} key={palabraActual.id}>
                <div className="relative w-full h-full cursor-pointer" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", transition: 'transform 0.6s' }}>
                    <CardFace side="front" palabra={palabraActual} direction={direction} />
                    <CardFace side="back" palabra={palabraActual} direction={direction} />
                </div>
            </div>
            <div className={`mt-8 w-full grid grid-cols-2 gap-4 transition-opacity ${!flipped ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
                <button onClick={() => handleNextWord(false)} className="group flex items-center justify-center gap-3 p-4 bg-red-800/50 text-red-300 font-bold rounded-lg hover:bg-red-800/80"><XIcon/> No la sé</button>
                <button onClick={() => handleNextWord(true)} className="group flex items-center justify-center gap-3 p-4 bg-green-800/50 text-green-300 font-bold rounded-lg hover:bg-green-800/80"><CheckIcon/> ¡Acertada!</button>
            </div>
          </>
        )}
    </div>
  );
}

// =================================================================================
// COMPONENTE CardFace (ACTUALIZADO)
// =================================================================================
function CardFace({ side, palabra, direction }) {
    const isFront = side === 'front';
    const isGerman = (isFront && direction === 'de-es') || (!isFront && direction === 'es-de');
    const lang = isGerman ? 'Alemán' : 'Español';
    
    // Lógica para mostrar el artículo en sustantivos
    const articles = { m: 'der', f: 'die', n: 'das' };
    let text = isGerman ? palabra.german : palabra.spanish;
    if (isGerman && palabra.type === 'noun' && palabra.attributes?.gender) {
        text = `${articles[palabra.attributes.gender]} ${palabra.german.charAt(0).toUpperCase() + palabra.german.slice(1)}`;
    }

    const colores = { m: "from-blue-500 to-blue-700", f: "from-pink-500 to-pink-700", n: "from-green-500 to-green-700" };
    const cardColor = isGerman && palabra.attributes?.gender ? colores[palabra.attributes.gender] : "from-gray-600 to-gray-700";
    const typeTranslations = { noun: 'Sustantivo', verb: 'Verbo', adjective: 'Adjetivo', preposition: 'Preposición' };
    const displayType = palabra.isDerived ? 'Verbo Separable' : typeTranslations[palabra.type] || palabra.type;

    // Contenido de información adicional para la cara alemana
    const AdditionalInfo = () => {
        if (!isGerman) return null;

        if (palabra.type === 'verb' && !palabra.isDerived) {
            const hasForms = palabra.attributes?.pastTense && palabra.attributes?.participle;
            const hasPrefixes = palabra.attributes?.separablePrefixes?.length > 0;
            if (!hasForms && !hasPrefixes) return null;

            return (
                <div className="text-xs text-left w-full px-4 mt-3 bg-black/20 pt-2 pb-3 rounded-b-xl">
                    {hasForms && <p className="font-mono"><span className="opacity-70">Präteritum:</span> {palabra.attributes.pastTense}, <span className="opacity-70">Partizip II:</span> {palabra.attributes.participle}</p>}
                    {hasPrefixes && (
                        <div className="mt-1 border-t border-white/10 pt-1">
                            <p className="opacity-70 mb-1">Derivados:</p>
                            <div className="flex flex-wrap gap-x-3">
                                {palabra.attributes.separablePrefixes.map(p => (
                                    <p key={p.prefix} className="font-mono">{p.prefix}{palabra.german} <span className="opacity-70">({p.meaning})</span></p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (palabra.type === 'preposition' && palabra.attributes?.case) {
            return (
                 <div className="text-xs w-full px-4 mt-3 bg-black/20 py-1 rounded-full">
                    <p>Rige <span className="font-semibold">{palabra.attributes.case}</span></p>
                </div>
            )
        }
        return null;
    }

    return (
        <div className={`absolute w-full h-full flex flex-col items-center justify-center text-center rounded-2xl shadow-2xl bg-gradient-to-br ${cardColor}`} style={{ backfaceVisibility: "hidden", transform: isFront ? 'rotateY(0deg)' : 'rotateY(180deg)' }}>
            <div className="absolute top-4 left-4 text-xs bg-black/20 px-2 py-1 rounded-full">{displayType}</div>
            <div className="absolute top-4 right-4 text-xs bg-black/20 px-2 py-1 rounded-full">Nivel {palabra.difficulty}</div>
            
            <div className="flex-1 flex flex-col justify-center items-center w-full">
                <span className="mb-2 text-sm font-semibold tracking-widest uppercase opacity-80">{lang}</span>
                <p className="px-4 text-4xl font-bold text-center sm:text-5xl">{text}</p>
            </div>
            
            <AdditionalInfo />
        </div>
    );
}

export default Game;