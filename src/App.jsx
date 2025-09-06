
import React, { useState, useEffect } from 'react';
// --- Importaciones de Firebase ---
import { initializeApp } from "firebase/app";
// --- NUEVAS IMPORTACIONES ---
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut 
} from "firebase/auth";
// En la sección de importaciones, busca esta línea y modifícala:
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    increment, 
    serverTimestamp, 
    query, 
    where, 
    updateDoc, 
    deleteDoc, 
    orderBy, 
    limit, 
    onSnapshot, // <-- Necesaria para FriendsManager
    writeBatch  // <-- Necesaria para FriendsManager
} from "firebase/firestore";// --- Configuración de Firebase ---

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
// --- Iconos SVG ---
const GameIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const StatsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const SwapIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> );
const CheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> );
const XIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> );
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.283.356-1.857m0 0a3.001 3.001 0 01-2.702 0M7 16V9m0 0a3 3 0 100-6 3 3 0 000 6z" /></svg>;
// Iconos para la página de Amigos
const UserPlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// --- Inicialización de Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Criterios de la aplicación ---
const MASTERY_CRITERIA = {
    MIN_PLAYS: 5,
    MAX_ERROR_RATE: 0.2,
    STREAK_NEEDED: 4, // <-- Añade esta línea
};

// =================================================================================
// COMPONENTE #1: El Juego de Flashcards
// =================================================================================
function Game({ user }) {
  const [allWords, setAllWords] = useState([]);
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
          getDocs(collection(db, "words")),
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

// =================================================================================
// COMPONENTE #2: Formulario para añadir palabras
// =================================================================================
const initialFormData = {
    german: '', spanish: '', type: 'noun', category: '', difficulty: '1',
    attributes: { gender: '', isRegular: true, pastTense: '', participle: '', 'case': '', separablePrefixes: [{ prefix: '', meaning: '' }] }
};

function WordForm() {
    const [formData, setFormData] = useState(initialFormData);
    const [categories, setCategories] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => { const fetchCategories = async () => { const snapshot = await getDocs(collection(db, "categories")); setCategories(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name_es }))); }; fetchCategories(); }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target; const [field, index, subfield] = name.split('.');
        if (field === 'separablePrefixes') { const newPrefixes = [...formData.attributes.separablePrefixes]; newPrefixes[index][subfield] = value; setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: newPrefixes }}));
        } else if (name in initialFormData.attributes) { setFormData(p => ({...p, attributes: {...p.attributes, [name]: type === 'checkbox' ? checked : value }}));
        } else { setFormData(p => ({...p, [name]: value })); }
    };
    
    const addPrefix = () => setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: [...p.attributes.separablePrefixes, { prefix: '', meaning: '' }]}}));
    const removePrefix = (index) => setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: p.attributes.separablePrefixes.filter((_, i) => i !== index)}}));

    const handleSubmit = async (e) => {
        e.preventDefault(); setIsSubmitting(true); setFeedback({ type: '', message: '' });
        const duplicateQuery = query(collection(db, "words"), where("german", "==", formData.german.trim()));
        if (!(await getDocs(duplicateQuery)).empty) { setFeedback({ type: 'error', message: 'Esta palabra ya existe.' }); setIsSubmitting(false); return; }

        try {
            const categoryName = formData.category.trim(); let categoryId = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())?.id;
            if (categoryName && !categoryId) { const newCatRef = await addDoc(collection(db, "categories"), { name_es: categoryName, name_de: categoryName }); setCategories(p => [...p, { id: newCatRef.id, name: categoryName }]); categoryId = newCatRef.id; }
            
            const newWord = { 
                german: formData.german.trim(), 
                spanish: formData.spanish.trim(), 
                type: formData.type, 
                difficulty: parseInt(formData.difficulty), 
                ...(categoryId && { categoryId }), 
                attributes: {},
                createdAt: serverTimestamp()
            };

            if (formData.type === 'noun') newWord.attributes.gender = formData.attributes.gender;
            if (formData.type === 'preposition') newWord.attributes.case = formData.attributes.case;
            if (formData.type === 'verb') {
                newWord.attributes.isRegular = formData.attributes.isRegular;
                if (!formData.attributes.isRegular) { newWord.attributes.pastTense = formData.attributes.pastTense; newWord.attributes.participle = formData.attributes.participle; }
                const prefixes = formData.attributes.separablePrefixes.filter(p => p.prefix.trim() && p.meaning.trim());
                if (prefixes.length > 0) newWord.attributes.separablePrefixes = prefixes;
            }

            await addDoc(collection(db, "words"), newWord);
            setFeedback({ type: 'success', message: '¡Palabra guardada!' }); setFormData(initialFormData); setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
        } catch (err) { console.error(err); setFeedback({ type: 'error', message: 'No se pudo guardar.' }); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="w-full max-w-lg mx-auto"><h1 className="mb-8 text-3xl font-bold text-gray-300">Añadir Palabra</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2"><input name="german" value={formData.german} onChange={handleChange} placeholder="Alemán" required className="p-3 bg-gray-700 rounded-md" /><input name="spanish" value={formData.spanish} onChange={handleChange} placeholder="Español" required className="p-3 bg-gray-700 rounded-md" /></div>
                <div className="grid grid-cols-2 gap-6">
                    <div><label className="block mb-2 text-sm text-gray-400">Tipo</label><select name="type" value={formData.type} onChange={handleChange} className="w-full p-3 bg-gray-700 rounded-md"><option value="noun">Sustantivo</option><option value="verb">Verbo</option><option value="adjective">Adjetivo</option><option value="preposition">Preposición</option></select></div>
                    <div><label className="block mb-2 text-sm text-gray-400">Nivel</label><select name="difficulty" value={formData.difficulty} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="1">1 (Fácil)</option><option value="2">2 (Medio)</option><option value="3">3 (Difícil)</option><option value="4">4</option><option value="5">5</option></select></div>
                </div>
                <div><label htmlFor="category" className="block mb-2 text-sm text-gray-400">Categoría</label><input name="category" value={formData.category} onChange={handleChange} list="categories-list" id="category" placeholder="Elige o crea una" className="w-full p-3 bg-gray-700 rounded-md" /><datalist id="categories-list">{categories.map(cat => <option key={cat.id} value={cat.name} />)}</datalist></div>

                {formData.type === 'noun' && <div className="p-4 rounded-lg bg-gray-800/50 space-y-4"><h3 className="font-semibold text-blue-400">Sustantivo</h3><select name="gender" value={formData.attributes.gender} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="">Género...</option><option value="m">der</option><option value="f">die</option><option value="n">das</option></select></div>}
                {formData.type === 'preposition' && <div className="p-4 rounded-lg bg-gray-800/50 space-y-4"><h3 className="font-semibold text-green-400">Preposición</h3><select name="case" value={formData.attributes.case} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="">Caso...</option><option value="Akkusativ">Akkusativ</option><option value="Dativ">Dativ</option><option value="Genitiv">Genitiv</option><option value="Wechselpräposition">Wechselpräposition</option></select></div>}
                {formData.type === 'verb' && <div className="p-4 rounded-lg bg-gray-800/50 space-y-4">
                    <h3 className="font-semibold text-pink-400">Verbo</h3><div className="flex items-center gap-4"><input name="isRegular" checked={formData.attributes.isRegular} onChange={handleChange} id="regular" type="checkbox" className="w-4 h-4" /><label htmlFor="regular">Es regular</label></div>
                    {!formData.attributes.isRegular && (<><input name="pastTense" value={formData.attributes.pastTense} onChange={handleChange} placeholder="Pretérito" required className="w-full p-3 bg-gray-700 rounded-md" /><input name="participle" value={formData.attributes.participle} onChange={handleChange} placeholder="Participio" required className="w-full p-3 bg-gray-700 rounded-md" /></>)}
                    <h4 className="pt-2 font-semibold text-pink-300">Prefijos Separables</h4>
                    {formData.attributes.separablePrefixes.map((p, i) => <div key={i} className="flex items-center gap-2">
                        <input name={`separablePrefixes.${i}.prefix`} value={p.prefix} onChange={handleChange} placeholder="Prefijo" className="w-1/4 p-2 bg-gray-600 rounded-md"/>
                        <span className="text-gray-400">+ {formData.german || '...'} =</span>
                        <input name={`separablePrefixes.${i}.meaning`} value={p.meaning} onChange={handleChange} placeholder="Significado" className="flex-1 p-2 bg-gray-600 rounded-md"/>
                        <button type="button" onClick={() => removePrefix(i)} className="p-1 text-red-500 hover:text-red-400">&times;</button>
                    </div>)}
                    <button type="button" onClick={addPrefix} className="text-sm text-blue-400 hover:text-blue-300">+ Añadir prefijo</button>
                </div>}
                
                <div className="pt-2 h-12"><button type="submit" disabled={isSubmitting} className="w-full p-4 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">{isSubmitting ? 'Guardando...' : 'Guardar'}</button>{feedback.message && <p className={`mt-2 text-sm text-center ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{feedback.message}</p>}</div>
            </form>
        </div>
    );
}


// =================================================================================
// COMPONENTE #3: Gestor de Vocabulario (¡NUEVO!)
// =================================================================================
function VocabularyManager() {
    const [allWords, setAllWords] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filteredWords, setFilteredWords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWord, setSelectedWord] = useState(null);
    const [formData, setFormData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [wordsSnapshot, categoriesSnapshot] = await Promise.all([
                getDocs(collection(db, "words")),
                getDocs(collection(db, "categories"))
            ]);
            const wordsList = wordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllWords(wordsList);
            setFilteredWords(wordsList);
            setCategories(categoriesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name_es })));
            setIsLoading(false);
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredWords(allWords);
        } else {
            setFilteredWords(
                allWords.filter(word =>
                    word.german.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    word.spanish.toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }
    }, [searchTerm, allWords]);
    
    const handleSelectWord = (word) => {
        setSelectedWord(word);
        // Pre-populamos el formulario con los datos de la palabra y valores por defecto
        const wordCategory = categories.find(c => c.id === word.categoryId);
        setFormData({
            ...initialFormData, // Usamos la misma base que el formulario de añadir
            ...word,
            category: wordCategory ? wordCategory.name : '',
            attributes: {
                ...initialFormData.attributes,
                ...word.attributes,
                // Aseguramos que separablePrefixes siempre sea un array
                separablePrefixes: word.attributes?.separablePrefixes || [{ prefix: '', meaning: '' }]
            }
        });
        setFeedback({ type: '', message: '' });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const [field, index, subfield] = name.split('.');

        if (field === 'separablePrefixes') {
            const newPrefixes = [...formData.attributes.separablePrefixes];
            newPrefixes[index][subfield] = value;
            setFormData(p => ({ ...p, attributes: { ...p.attributes, separablePrefixes: newPrefixes } }));
        } else if (Object.keys(initialFormData.attributes).includes(name)) {
            setFormData(p => ({ ...p, attributes: { ...p.attributes, [name]: type === 'checkbox' ? checked : value } }));
        } else {
            setFormData(p => ({ ...p, [name]: value }));
        }
    };
    
    const addPrefix = () => setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: [...p.attributes.separablePrefixes, { prefix: '', meaning: '' }]}}));
    const removePrefix = (index) => setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: p.attributes.separablePrefixes.filter((_, i) => i !== index)}}));

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedWord) return;
        setIsSaving(true);
        try {
            // Lógica para manejar categorías (igual que en WordForm)
            const categoryName = formData.category.trim();
            let categoryId = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())?.id;
            if (categoryName && !categoryId) {
                const newCatRef = await addDoc(collection(db, "categories"), { name_es: categoryName, name_de: categoryName });
                setCategories(p => [...p, { id: newCatRef.id, name: categoryName }]);
                categoryId = newCatRef.id;
            }

            const updatedWord = {
                german: formData.german.trim(),
                spanish: formData.spanish.trim(),
                type: formData.type,
                difficulty: parseInt(formData.difficulty),
                ...(categoryId && { categoryId }),
                attributes: {}
            };
            
            if (formData.type === 'noun') updatedWord.attributes.gender = formData.attributes.gender;
            if (formData.type === 'preposition') updatedWord.attributes.case = formData.attributes.case;
            if (formData.type === 'verb') {
                updatedWord.attributes.isRegular = formData.attributes.isRegular;
                if (!formData.attributes.isRegular) {
                    updatedWord.attributes.pastTense = formData.attributes.pastTense;
                    updatedWord.attributes.participle = formData.attributes.participle;
                }
                const prefixes = formData.attributes.separablePrefixes.filter(p => p.prefix.trim() && p.meaning.trim());
                if (prefixes.length > 0) updatedWord.attributes.separablePrefixes = prefixes;
            }
            
            const wordRef = doc(db, "words", selectedWord.id);
            await updateDoc(wordRef, updatedWord);
            
            // Actualizar la lista local para no tener que recargar
            setAllWords(prev => prev.map(w => w.id === selectedWord.id ? { id: selectedWord.id, ...updatedWord } : w));
            
            setFeedback({ type: 'success', message: '¡Palabra actualizada!' });
            setTimeout(() => {
                setFeedback({ type: '', message: '' });
                setSelectedWord(null); // Cierra el formulario
                setFormData(null);
            }, 2000);

        } catch (err) {
            console.error(err);
            setFeedback({ type: 'error', message: 'Error al actualizar.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!selectedWord || !window.confirm(`¿Seguro que quieres borrar "${selectedWord.german}"? Esta acción no se puede deshacer.`)) {
            return;
        }
        setIsSaving(true);
        try {
            await deleteDoc(doc(db, "words", selectedWord.id));
            setAllWords(prev => prev.filter(w => w.id !== selectedWord.id));
            setSelectedWord(null);
            setFormData(null);
            // Podríamos añadir un feedback de borrado si quisiéramos
        } catch (err) {
            console.error(err);
            setFeedback({ type: 'error', message: 'Error al borrar.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center">Cargando vocabulario...</div>;

    return (
        <div className="w-full max-w-4xl mx-auto flex gap-8">
            {/* Columna de la lista de palabras */}
            <div className="w-1/3">
                <h1 className="mb-4 text-3xl font-bold text-gray-300">Gestionar</h1>
                <input type="text" placeholder="Buscar palabra..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 mb-4 bg-gray-700 rounded-md" />
                <div className="overflow-y-auto h-[70vh] pr-2">
                    {filteredWords.map(word => (
                        <button key={word.id} onClick={() => handleSelectWord(word)} className={`w-full text-center p-3 mb-2 rounded-md transition-colors ${selectedWord?.id === word.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                            <span className="font-bold">{word.german}</span>
                            <span className="text-sm text-gray-400 block">{word.spanish}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Columna del formulario de edición */}
            <div className="w-2/3">
                {!selectedWord ? (
                    // CÓDIGO MODIFICADO
                  <div className="flex items-center justify-center h-full text-gray-600">
                      <p className="text-lg font-light">Selecciona una palabra para editarla.</p>
                  </div>
                ) : (
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-2xl font-bold mb-6">Editando: <span className="text-blue-400">{selectedWord.german}</span></h2>
                        <form onSubmit={handleUpdate} className="space-y-6">
                            {/* Reutilizamos la estructura del WordForm, pero con los datos de la palabra seleccionada */}
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2"><input name="german" value={formData.german} onChange={handleChange} placeholder="Alemán" required className="p-3 bg-gray-700 rounded-md" /><input name="spanish" value={formData.spanish} onChange={handleChange} placeholder="Español" required className="p-3 bg-gray-700 rounded-md" /></div>
                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="block mb-2 text-sm text-gray-400">Tipo</label><select name="type" value={formData.type} onChange={handleChange} className="w-full p-3 bg-gray-700 rounded-md"><option value="noun">Sustantivo</option><option value="verb">Verbo</option><option value="adjective">Adjetivo</option><option value="preposition">Preposición</option></select></div>
                                <div><label className="block mb-2 text-sm text-gray-400">Nivel</label><select name="difficulty" value={formData.difficulty} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></div>
                            </div>
                            <div><label htmlFor="category" className="block mb-2 text-sm text-gray-400">Categoría</label><input name="category" value={formData.category} onChange={handleChange} list="categories-list" id="category" placeholder="Elige o crea una" className="w-full p-3 bg-gray-700 rounded-md" /><datalist id="categories-list">{categories.map(cat => <option key={cat.id} value={cat.name} />)}</datalist></div>
                            {formData.type === 'noun' && <div className="p-4 rounded-lg bg-gray-900/50 space-y-4"><h3 className="font-semibold text-blue-400">Sustantivo</h3><select name="gender" value={formData.attributes.gender} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="">Género...</option><option value="m">der</option><option value="f">die</option><option value="n">das</option></select></div>}
                            {formData.type === 'preposition' && <div className="p-4 rounded-lg bg-gray-900/50 space-y-4"><h3 className="font-semibold text-green-400">Preposición</h3><select name="case" value={formData.attributes.case} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="">Caso...</option><option value="Akkusativ">Akkusativ</option><option value="Dativ">Dativ</option><option value="Genitiv">Genitiv</option><option value="Wechselpräposition">Wechselpräposition</option></select></div>}
                            {formData.type === 'verb' && <div className="p-4 rounded-lg bg-gray-900/50 space-y-4">
                                <h3 className="font-semibold text-pink-400">Verbo</h3><div className="flex items-center gap-4"><input name="isRegular" checked={formData.attributes.isRegular} onChange={handleChange} id="regular" type="checkbox" className="w-4 h-4" /><label htmlFor="regular">Es regular</label></div>
                                {!formData.attributes.isRegular && (<><input name="pastTense" value={formData.attributes.pastTense} onChange={handleChange} placeholder="Pretérito" required className="w-full p-3 bg-gray-700 rounded-md" /><input name="participle" value={formData.attributes.participle} onChange={handleChange} placeholder="Participio" required className="w-full p-3 bg-gray-700 rounded-md" /></>)}
                                <h4 className="pt-2 font-semibold text-pink-300">Prefijos Separables</h4>
                                {formData.attributes.separablePrefixes.map((p, i) => <div key={i} className="flex items-center gap-2">
                                    <input name={`separablePrefixes.${i}.prefix`} value={p.prefix} onChange={handleChange} placeholder="Prefijo" className="w-1/4 p-2 bg-gray-600 rounded-md"/>
                                    <span className="text-gray-400">+ {formData.german || '...'} =</span>
                                    <input name={`separablePrefixes.${i}.meaning`} value={p.meaning} onChange={handleChange} placeholder="Significado" className="flex-1 p-2 bg-gray-600 rounded-md"/>
                                    <button type="button" onClick={() => removePrefix(i)} className="p-1 text-red-500 hover:text-red-400">&times;</button>
                                </div>)}
                                <button type="button" onClick={addPrefix} className="text-sm text-blue-400 hover:text-blue-300">+ Añadir prefijo</button>
                            </div>}
                            
                            <div className="pt-2 flex items-center gap-4">
                                <button type="button" onClick={handleDelete} disabled={isSaving} className="px-6 py-3 font-bold text-red-300 bg-red-800/50 rounded-lg hover:bg-red-800/80 disabled:opacity-50">Borrar</button>
                                <button type="submit" disabled={isSaving} className="flex-1 p-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">{isSaving ? 'Guardando...' : 'Guardar Cambios'}</button>
                            </div>
                            {feedback.message && <p className={`mt-2 text-sm text-center ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{feedback.message}</p>}
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

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

// =================================================================================
// COMPONENTE #5: El Layout principal con el menú
// =================================================================================
function AppLayout({ user, userProfile }) {
    const [view, setView] = useState('game');
    const NavLink = ({ viewName, children }) => (<button onClick={() => setView(viewName)} className={`...`}>{children}</button>);

    // Logout function
    const handleLogout = () => {
        signOut(auth);
    };

    return (
        <div className="flex flex-col h-screen font-sans text-white bg-gray-900 sm:flex-row">
            <nav className="flex order-last justify-around p-2 sm:p-4 sm:w-56 sm:flex-col sm:justify-start sm:order-first gap-2 bg-gray-800">
                <NavLink viewName="game"><GameIcon /> <span className="text-xs sm:text-base">Jugar</span></NavLink>
                <NavLink viewName="add"><AddIcon /> <span className="text-xs sm:text-base">Añadir</span></NavLink>
    <NavLink viewName="manager"><EditIcon /> <span className="text-xs sm:text-base">Gestionar</span></NavLink>
                <NavLink viewName="stats"><StatsIcon /> <span className="text-xs sm:text-base">Estadísticas</span></NavLink>
                <NavLink viewName="friends"><UserGroupIcon /> <span>Amigos</span></NavLink>

                {/* --- BOTÓN DE LOGOUT AÑADIDO --- */}
                <div className="mt-auto"> {/* Pushes logout to the bottom on larger screens */}
                   <button onClick={handleLogout} className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 px-4 py-3 rounded-lg w-full text-left hover:bg-red-800/50 text-red-400">
                       <LogoutIcon />
                       <span className="text-xs sm:text-base">Salir</span>
                   </button>
                </div>
            </nav>
         <main className="flex-1 p-4 overflow-y-auto sm:p-8 flex justify-center">
            {view === 'game' && <Game user={user} />}
            {view === 'add' && <WordForm />}
            {view === 'manager' && <VocabularyManager />}
            {view === 'stats' && <StatsDashboard user={user} />}
            {view === 'friends' && <FriendsManager user={user} userProfile={userProfile} />}
        </main>
    </div>
  );
}

// =================================================================================
// COMPONENTE NUEVO: Pantalla de Login
// =================================================================================
function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError('Failed to log in. Check your email and password.');
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            setError('Failed to sign in with Google.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen text-white bg-gray-900">
            <div className="w-full max-w-xs p-8 space-y-6 bg-gray-800 rounded-lg shadow-xl">
                <div>
                    <h1 className="text-2xl font-bold text-center">Bienvenido</h1>
                    <p className="text-sm text-center text-gray-400">Accede a tus flashcards</p>
                </div>
                <form className="space-y-4">
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {error && <p className="text-xs text-center text-red-400">{error}</p>}
                    <div className="flex gap-2">
                         <button onClick={handleSignIn} className="w-full py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-70d00">Entrar</button>
                         <button onClick={handleSignUp} className="w-full py-2 font-semibold text-blue-300 bg-blue-900/50 rounded-md hover:bg-blue-900/80">Registrar</button>
                    </div>
                </form>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 text-gray-500 bg-gray-800">O</span></div>
                </div>
                <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 py-2 font-semibold bg-white text-gray-800 rounded-md hover:bg-gray-200">
                    <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                    Continuar con Google
                </button>
            </div>
        </div>
    );
}

// Icono para el estado de carga
const SpinnerIcon = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

function CreateUsername({ user, onProfileCreated }) { // <-- CAMBIO 1: Recibimos la nueva prop
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (username.length < 3) {
            setError("El nombre debe tener al menos 3 caracteres.");
            setLoading(false);
            return;
        }

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("displayName", "==", username.trim()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            setError("Este nombre de usuario ya está en uso. Elige otro.");
            setLoading(false);
            return;
        }

        try {
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: username.trim(),
                createdAt: serverTimestamp()
            });
            // <-- CAMBIO 2: Llamamos a la función del padre para que la app se actualice
            onProfileCreated();
        } catch (err) {
            setError("No se pudo guardar el nombre de usuario. Inténtalo de nuevo.");
            console.error(err);
            setLoading(false); // <-- CAMBIO 3: Aseguramos parar la carga en caso de error
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white">¡Casi listo!</h1>
                    <p className="text-gray-400 mt-2">Para continuar, elige tu nombre de usuario único.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="username" className="text-sm font-bold text-gray-400 block mb-2">Nombre de Usuario</label>
                        <input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="tu_usuario_genial"
                            className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-center text-red-400">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full flex justify-center items-center p-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading && <SpinnerIcon />}
                        {loading ? "Guardando..." : "Confirmar y Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}

function FriendsManager({ user, userProfile }) {
    const [activeTab, setActiveTab] = useState('friends');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState(''); // Para mensajes como "Solicitud enviada"

    // --- Carga de datos en tiempo real ---
    useEffect(() => {
        if (!user) return;
        setLoading(true);

        // Listener para la lista de amigos
        const friendsRef = collection(db, `users/${user.uid}/friends`);
        const friendsUnsubscribe = onSnapshot(friendsRef, (snapshot) => {
            setFriends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Listener para las solicitudes de amistad PENDIENTES y RECIBIDAS
        const requestsRef = collection(db, "friendRequests");
        const q = query(requestsRef, where("to_uid", "==", user.uid), where("status", "==", "pending"));
        const requestsUnsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // Limpiamos los listeners cuando el componente se desmonta
        return () => {
            friendsUnsubscribe();
            requestsUnsubscribe();
        };
    }, [user]);

    // --- Lógica de las funciones ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchTerm.trim().length < 3) {
            setFeedback("El término de búsqueda debe tener al menos 3 caracteres.");
            return;
        }
        setLoading(true);
        setFeedback('');

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("displayName", "==", searchTerm.trim()));
        const snapshot = await getDocs(q);
        
        // Excluimos al propio usuario y a los que ya son amigos
        const results = snapshot.docs
            .map(doc => doc.data())
            .filter(foundUser => foundUser.uid !== user.uid && !friends.some(f => f.id === foundUser.uid));

        setSearchResults(results);
        if (results.length === 0) {
            setFeedback("No se encontraron usuarios o ya es tu amigo.");
        }
        setLoading(false);
    };

    const sendFriendRequest = async (targetUser) => {
        setFeedback('');
        // Evitar enviar solicitudes a uno mismo o duplicadas
        if(targetUser.uid === user.uid) return;

        // Comprobación para no enviar una solicitud si ya existe una
        const requestsRef = collection(db, "friendRequests");
        const q1 = query(requestsRef, where("from_uid", "==", user.uid), where("to_uid", "==", targetUser.uid));
        const q2 = query(requestsRef, where("from_uid", "==", targetUser.uid), where("to_uid", "==", user.uid));
        
        const [sentSnapshot, receivedSnapshot] = await Promise.all([getDocs(q1), getDocs(q2)]);

        if (!sentSnapshot.empty || !receivedSnapshot.empty) {
            setFeedback("Ya existe una solicitud de amistad con este usuario.");
            return;
        }

        // Si no hay solicitud, la creamos
        await addDoc(requestsRef, {
            from_uid: user.uid,
            from_displayName: userProfile.displayName,
            to_uid: targetUser.uid,
            to_displayName: targetUser.displayName,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        
        setFeedback(`¡Solicitud enviada a ${targetUser.displayName}!`);
        setSearchResults([]); // Limpiamos la búsqueda
    };

    const handleRequest = async (request, action) => {
        if (action === 'accept') {
            // Usamos un batch para asegurar que todas las operaciones se completen o ninguna
            const batch = writeBatch(db);

            // 1. Referencia a la solicitud
            const requestRef = doc(db, "friendRequests", request.id);
            // 2. Referencia al nuevo amigo en nuestra lista
            const myFriendRef = doc(db, `users/${user.uid}/friends`, request.from_uid);
            // 3. Referencia a nosotros en la lista del nuevo amigo
            const theirFriendRef = doc(db, `users/${request.from_uid}/friends`, user.uid);

            batch.update(requestRef, { status: 'accepted' });
            batch.set(myFriendRef, { displayName: request.from_displayName, since: serverTimestamp() });
            batch.set(theirFriendRef, { displayName: userProfile.displayName, since: serverTimestamp() });

            await batch.commit();

        } else if (action === 'decline') {
            const requestRef = doc(db, "friendRequests", request.id);
            await deleteDoc(requestRef); // O actualiza el estado a 'declined'
        }
    };

    // Componente para las pestañas
    const TabButton = ({ tabName, label }) => (
        <button 
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === tabName ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800/50'}`}
        >
            {label}
        </button>
    );
    
    return (
        <div className="w-full max-w-4xl mx-auto">
            <h1 className="mb-6 text-3xl font-bold text-gray-300">Amigos</h1>
            
            <div className="flex border-b border-gray-700">
                <TabButton tabName="friends" label={`Mis Amigos (${friends.length})`} />
                <TabButton tabName="requests" label={`Solicitudes (${requests.length})`} />
                <TabButton tabName="search" label="Buscar" />
            </div>

            <div className="p-6 bg-gray-800 rounded-b-lg min-h-[300px]">
                {/* Pestaña Mis Amigos */}
                {activeTab === 'friends' && (
                     <div className="space-y-3">
                        {loading ? <p>Cargando...</p> : friends.length > 0 ? friends.map(friend => (
                            <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                <span className="font-semibold">{friend.displayName}</span>
                            </div>
                        )) : (
                             <p className="text-center text-gray-500 py-4">Aún no tienes amigos. ¡Busca a alguien para empezar!</p>
                        )}
                    </div>
                )}

                {/* Pestaña de Solicitudes */}
                {activeTab === 'requests' && (
                    <div className="space-y-3">
                        {loading ? <p>Cargando...</p> : requests.length > 0 ? requests.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                <span className="font-semibold">{req.from_displayName} quiere ser tu amigo.</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRequest(req, 'accept')} className="p-2 text-green-400 rounded-full hover:bg-green-800/50" title="Aceptar"><CheckCircleIcon /></button>
                                    <button onClick={() => handleRequest(req, 'decline')} className="p-2 text-red-400 rounded-full hover:bg-red-800/50" title="Rechazar"><XCircleIcon /></button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 py-4">No tienes solicitudes pendientes.</p>
                        )}
                    </div>
                )}
                
                {/* Pestaña de Búsqueda */}
                {activeTab === 'search' && (
                    <div>
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nombre de usuario exacto..."
                                className="flex-grow p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="submit" disabled={loading} className="px-6 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">
                                {loading ? '...' : 'Buscar'}
                            </button>
                        </form>
                        <p className="text-center text-sm text-gray-400 h-6 mt-4">{feedback}</p>
                        <div className="mt-2 space-y-3">
                            {searchResults.map(foundUser => (
                                <div key={foundUser.uid} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                    <span className="font-semibold">{foundUser.displayName}</span>
                                    <button onClick={() => sendFriendRequest(foundUser)} className="flex items-center gap-2 px-3 py-1 text-sm text-white bg-green-600 rounded-md hover:bg-green-700">
                                        <UserPlusIcon /> Añadir
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// =================================================================================
// COMPONENTE RAÍZ: Gestiona la autenticación y el estado general (MODIFICADO)
// =================================================================================
export default function App() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // <-- CAMBIO 1: Función para recargar el perfil del usuario -->
    const fetchUserProfile = async (currentUser) => {
        if (!currentUser) {
            setUserProfile(null);
            return;
        }
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        setUserProfile(userDocSnap.exists() ? userDocSnap.data() : null);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            await fetchUserProfile(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        // Puedes hacer un componente de carga más bonito aquí también
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Conectando...</div>;
    }

    if (user && !userProfile) {
        // <-- CAMBIO 2: Pasamos la función como prop -->
        return <CreateUsername user={user} onProfileCreated={() => fetchUserProfile(user)} />;
    }

    return user && userProfile ? <AppLayout user={user} userProfile={userProfile} /> : <Login />;
}