import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase.js';
import { collection, query, getDocs, writeBatch, doc, serverTimestamp, limit, orderBy, startAfter, where } from 'firebase/firestore';

const PAGE_SIZE = 20;

// --- Iconos ---
const SpinnerIcon = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

function ImportModal({ user, friend, onClose }) {
    const [step, setStep] = useState('loading'); // loading, ready, importing, done
    const [words, setWords] = useState([]);
    const [selectedWords, setSelectedWords] = useState(new Set());
    const [duplicateWords, setDuplicateWords] = useState(new Set());
    const [lastVisible, setLastVisible] = useState(null);
    const [isLastPage, setIsLastPage] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [page, setPage] = useState(1);
    const [firstVisible, setFirstVisible] = useState(null);
    const [pageHistory, setPageHistory] = useState([]);


    const fetchWords = useCallback(async (direction = 'next') => {
        setStep('loading');
        if (!friend) return;
    
        const friendWordsRef = collection(db, `users/${friend.id}/words`);
        let q;
    
        if (direction === 'next') {
            q = query(friendWordsRef, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(PAGE_SIZE));
            if (lastVisible) {
                setPageHistory(prev => [...prev, lastVisible]);
            }
        } else { // 'prev'
            const prevPageStart = pageHistory.length > 1 ? pageHistory[pageHistory.length - 2] : null;
            q = query(friendWordsRef, orderBy('createdAt', 'desc'), startAfter(prevPageStart), limit(PAGE_SIZE));
            setPageHistory(prev => prev.slice(0, prev.length - 1));
        }
    
        try {
            const documentSnapshots = await getDocs(q);
            const newWords = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
            if (newWords.length > 0) {
                const myWordsRef = collection(db, `users/${user.uid}/words`);
                const germanWordsFromFriend = newWords.map(word => word.german.toLowerCase().trim()).filter(Boolean);
    
                let userGermanWords = new Set();
                if (germanWordsFromFriend.length > 0) {
                    const duplicateQuery = query(myWordsRef, where('german', 'in', germanWordsFromFriend));
                    const duplicateSnapshot = await getDocs(duplicateQuery);
                    userGermanWords = new Set(duplicateSnapshot.docs.map(doc => doc.data().german.toLowerCase().trim()));
                }
    
                setDuplicateWords(userGermanWords);
                setWords(newWords);
                setFirstVisible(documentSnapshots.docs[0]);
                setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
                setIsLastPage(newWords.length < PAGE_SIZE);
            } else {
                if (direction === 'next') setIsLastPage(true);
                setWords([]);
            }
    
            setSelectedWords(new Set());
            setStep('ready');
    
        } catch (error) {
            console.error("Error fetching words: ", error);
            setFeedback("Error al cargar las palabras.");
            setStep('ready');
        }
    }, [friend, user, lastVisible, pageHistory]);

    useEffect(() => {
        const fetchInitialWords = async () => {
            setStep('loading');
            if (!friend) return;
    
            const friendWordsRef = collection(db, `users/${friend.id}/words`);
            const q = query(friendWordsRef, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    
            try {
                const documentSnapshots = await getDocs(q);
                const newWords = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
                if (newWords.length > 0) {
                    const myWordsRef = collection(db, `users/${user.uid}/words`);
                    const germanWordsFromFriend = newWords.map(word => word.german.toLowerCase().trim()).filter(Boolean);
                    
                    let userGermanWords = new Set();
                    if (germanWordsFromFriend.length > 0) {
                        const duplicateQuery = query(myWordsRef, where('german', 'in', germanWordsFromFriend));
                        const duplicateSnapshot = await getDocs(duplicateQuery);
                        userGermanWords = new Set(duplicateSnapshot.docs.map(doc => doc.data().german.toLowerCase().trim()));
                    }
                    
                    setDuplicateWords(userGermanWords);
                    setWords(newWords);
                    setFirstVisible(documentSnapshots.docs[0]);
                    setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
                    setIsLastPage(newWords.length < PAGE_SIZE);
                } else {
                    setIsLastPage(true);
                    setWords([]);
                }
    
                setStep('ready');
            } catch (error) {
                console.error("Error fetching initial words: ", error);
                setFeedback("Error al cargar las palabras.");
                setStep('ready');
            }
        };
    
        fetchInitialWords();
    }, [friend, user]);

    const handleNextPage = () => {
        if (!isLastPage) {
            setPage(p => p + 1);
            fetchWords('next');
        }
    };

    const handlePrevPage = () => {
        if (page > 1) {
            setPage(p => p - 1);
            fetchWords('prev');
        }
    };
    
    const handleToggleSelection = (word) => {
        const newSelection = new Set(selectedWords);
        if (newSelection.has(word.id)) {
            newSelection.delete(word.id);
        } else {
            newSelection.add(word.id);
        }
        setSelectedWords(newSelection);
    };

    const handleImport = async () => {
        setStep('importing');
        const wordsToImport = words.filter(word => selectedWords.has(word.id));

        if (wordsToImport.length === 0) {
            setFeedback("No words selected to import.");
            setStep('ready');
            return;
        }

        const batch = writeBatch(db);
        const myWordsCollectionRef = collection(db, `users/${user.uid}/words`);

        wordsToImport.forEach(wordData => {
            const newWordRef = doc(myWordsCollectionRef);
            const { id, ...dataToSave } = wordData;
            
            dataToSave.createdAt = serverTimestamp();
            dataToSave.importedFrom = {
                uid: friend.id,
                displayName: friend.displayName
            };
            batch.set(newWordRef, dataToSave);
        });

        try {
            await batch.commit();
            setStep('done');
        } catch (error) {
            console.error("Error importing words: ", error);
            setFeedback("Error al importar las palabras.");
            setStep('ready');
        }
    };
    
    const renderContent = () => {
        switch (step) {
            case 'loading':
                return (
                    <div className="text-center h-96 flex flex-col justify-center">
                        <SpinnerIcon />
                        <p className="mt-2 text-lg">Cargando palabras de {friend.displayName}...</p>
                    </div>
                );
            case 'ready':
                const newWordsOnPage = words.filter(w => !duplicateWords.has(w.german.toLowerCase().trim()));
                return (
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Importar de {friend.displayName}</h3>
                        <p className="text-gray-400 mb-4">Selecciona las palabras que quieres importar. Las que ya tienes están deshabilitadas.</p>
                        
                        <div className="space-y-2 bg-gray-900/50 p-4 rounded-lg h-80 overflow-y-auto">
                            {words.length > 0 ? words.map(word => {
                                const isDuplicate = duplicateWords.has(word.german.toLowerCase().trim());
                                return (
                                    <div key={word.id} className={`flex items-center p-2 rounded ${isDuplicate ? 'opacity-50' : 'hover:bg-gray-700'}`}>
                                        <input
                                            type="checkbox"
                                            id={word.id}
                                            checked={selectedWords.has(word.id)}
                                            disabled={isDuplicate}
                                            onChange={() => handleToggleSelection(word)}
                                            className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-600 disabled:cursor-not-allowed"
                                        />
                                        <label htmlFor={word.id} className={`ml-3 flex-grow ${isDuplicate ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                            <span className="font-semibold text-white">{word.german}</span>
                                            <span className="text-gray-400"> - {word.spanish}</span>
                                        </label>
                                        {isDuplicate && <span className="text-xs text-yellow-500 font-bold">DUPLICADO</span>}
                                    </div>
                                );
                            }) : <p className="text-center text-gray-500 py-4">No hay más palabras para mostrar.</p>}
                        </div>

                        <div className="flex justify-between items-center mt-4">
                           <button onClick={() => {
                               const newWordsToSelect = newWordsOnPage.map(w => w.id);
                               setSelectedWords(new Set(newWordsToSelect));
                           }}
                           className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50"
                           disabled={newWordsOnPage.length === 0}
                           >Seleccionar {newWordsOnPage.length} nuevas</button>
                           
                           <div className="flex gap-2 items-center">
                                <button onClick={handlePrevPage} disabled={page <= 1 || step === 'loading'} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                    ← Anterior
                                </button>
                                <span className="text-sm text-gray-400 w-16 text-center">Página {page}</span>
                                <button onClick={handleNextPage} disabled={isLastPage || step === 'loading'} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                    Siguiente →
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Cancelar</button>
                            <button onClick={handleImport} disabled={selectedWords.size === 0 || step === 'loading'} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg font-bold">
                                Importar ({selectedWords.size})
                            </button>
                        </div>
                        {feedback && <p className="text-red-400 text-center mt-2">{feedback}</p>}
                    </div>
                );
             case 'importing':
                 return (
                    <div className="text-center h-96 flex flex-col justify-center">
                        <SpinnerIcon />
                        <p className="mt-2 text-lg">Importando {selectedWords.size} palabras...</p>
                    </div>
                );
            case 'done':
                 return (
                    <div className="text-center h-96 flex flex-col items-center justify-center">
                        <CheckCircleIcon />
                        <h3 className="text-2xl font-bold text-green-400 mt-4">¡Éxito!</h3>
                        <p className="text-lg mt-2">Se han importado {selectedWords.size} palabras nuevas.</p>
                        <button onClick={onClose} className="mt-8 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold">Cerrar</button>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                {renderContent()}
            </div>
        </div>
    );
}

export default ImportModal;
