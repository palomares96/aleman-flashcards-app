// src/components/ImportModal.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

// --- Iconos ---
const SpinnerIcon = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


function ImportModal({ user, friend, onClose }) {
    const [step, setStep] = useState('analyzing'); // 'analyzing', 'confirm', 'importing', 'done'
    const [stats, setStats] = useState({ friendTotal: 0, duplicates: 0, toImport: 0 });
    const [wordsToImport, setWordsToImport] = useState([]);

    useEffect(() => {
        const analyzeDecks = async () => {
            if (!user || !friend) return;

            // 1. Obtener todas TUS palabras (solo el término en alemán para comparar)
            const myWordsCollection = collection(db, `users/${user.uid}/words`);
            const myWordsSnapshot = await getDocs(myWordsCollection);
            const myGermanWordsSet = new Set(myWordsSnapshot.docs.map(doc => doc.data().german.toLowerCase().trim()));

            // 2. Obtener todas las palabras del AMIGO
            const friendWordsCollection = collection(db, `users/${friend.id}/words`);
            const friendWordsSnapshot = await getDocs(friendWordsCollection);
            const friendWords = friendWordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Comparar y filtrar para evitar duplicados
            const newWords = friendWords.filter(word => !myGermanWordsSet.has(word.german.toLowerCase().trim()));
            
            setWordsToImport(newWords);
            setStats({
                friendTotal: friendWords.length,
                duplicates: friendWords.length - newWords.length,
                toImport: newWords.length
            });
            setStep('confirm');
        };

        analyzeDecks();
    }, [user, friend]);

    const handleImport = async () => {
        setStep('importing');
        if (wordsToImport.length === 0) {
            setStep('done');
            return;
        }

        const batch = writeBatch(db);
        const myWordsCollectionRef = collection(db, `users/${user.uid}/words`);

        wordsToImport.forEach(wordData => {
            const newWordRef = doc(myWordsCollectionRef); // Firestore genera un ID nuevo
            const { id, ...dataToSave } = wordData; // Quitamos el ID original del amigo
            
            // Añadimos trazabilidad para saber de dónde vino la palabra
            dataToSave.createdAt = serverTimestamp();
            dataToSave.importedFrom = {
                uid: friend.id,
                displayName: friend.displayName
            };
            batch.set(newWordRef, dataToSave);
        });

        await batch.commit();
        setStep('done');
    };

    const renderContent = () => {
        switch (step) {
            case 'analyzing':
                return (
                    <div className="text-center">
                        <SpinnerIcon />
                        <p className="mt-2 text-lg">Analizando mazos...</p>
                        <p className="text-gray-400">Comparando tus palabras con las de {friend.displayName}.</p>
                    </div>
                );
            case 'confirm':
                return (
                    <div>
                        <h3 className="text-xl font-bold text-center text-white mb-4">Importar de {friend.displayName}</h3>
                        <div className="space-y-3 text-lg bg-gray-900/50 p-4 rounded-lg">
                            <p>Palabras totales del amigo: <span className="font-bold text-blue-400">{stats.friendTotal}</span></p>
                            <p>Palabras que ya tienes (duplicados): <span className="font-bold text-yellow-400">{stats.duplicates}</span></p>
                            <hr className="border-gray-600"/>
                            <p>✅ **Nuevas palabras a importar: <span className="font-bold text-green-400">{stats.toImport}</span>**</p>
                        </div>
                        {stats.toImport > 0 ? (
                             <div className="mt-6 p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg text-center">
                                <p className="font-bold text-yellow-300">¡Atención!</p>
                                <p className="text-yellow-400 text-sm">Estás a punto de añadir {stats.toImport} palabras a tu mazo. Esta acción no se puede deshacer.</p>
                             </div>
                        ) : (
                            <p className="text-center mt-6 text-gray-400">No hay palabras nuevas para importar.</p>
                        )}
                        <div className="flex justify-end gap-4 mt-8">
                            <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Cancelar</button>
                            <button onClick={handleImport} disabled={stats.toImport === 0} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg font-bold">
                                Importar
                            </button>
                        </div>
                    </div>
                );
            case 'importing':
                 return (
                    <div className="text-center">
                        <SpinnerIcon />
                        <p className="mt-2 text-lg">Importando {stats.toImport} palabras...</p>
                        <p className="text-gray-400">Esto puede tardar un momento.</p>
                    </div>
                );
            case 'done':
                 return (
                    <div className="text-center flex flex-col items-center">
                        <CheckCircleIcon />
                        <h3 className="text-2xl font-bold text-green-400 mt-4">¡Éxito!</h3>
                        <p className="text-lg mt-2">{stats.toImport > 0 ? `Se han importado ${stats.toImport} palabras nuevas.` : 'Importación completada. No había palabras nuevas.'}</p>
                        <button onClick={onClose} className="mt-8 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold">Cerrar</button>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
                {renderContent()}
            </div>
        </div>
    );
}

export default ImportModal;