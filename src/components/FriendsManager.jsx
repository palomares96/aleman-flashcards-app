import { db } from '../firebase.js';
import { collection, onSnapshot, query, where, getDocs, addDoc, serverTimestamp, writeBatch, doc, deleteDoc } from "firebase/firestore";
import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app"; 

// --- Iconos (sin cambios) ---
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UserPlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>;

function FriendsManager({ user, userProfile }) {
    const [activeTab, setActiveTab] = useState('friends');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState('');
    
    // --- NUEVO ESTADO PARA LA INTERFAZ DEL BOTÓN 'AÑADIR' ---
    const [pendingSentRequests, setPendingSentRequests] = useState([]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const friendsRef = collection(db, `users/${user.uid}/friends`);
        const friendsUnsubscribe = onSnapshot(friendsRef, (snapshot) => {
            setFriends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const requestsRef = collection(db, "friendRequests");
        const q = query(requestsRef, where("to_uid", "==", user.uid), where("status", "==", "pending"));
        const requestsUnsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => {
            friendsUnsubscribe();
            requestsUnsubscribe();
        };
    }, [user]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchTerm.trim().length < 3) {
            setFeedback("El término de búsqueda debe tener al menos 3 caracteres.");
            return;
        }
        setLoading(true);
        setFeedback('');
        const usersRef = collection(db, "users");
        const searchTermLower = searchTerm.trim().toLowerCase();
        const q = query(
            usersRef,
            where("displayName_lowercase", ">=", searchTermLower),
            where("displayName_lowercase", "<=", searchTermLower + '\uf8ff')
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs
            .map(doc => doc.data())
            .filter(foundUser => foundUser.uid !== user.uid && !friends.some(f => f.id === foundUser.uid));
        setSearchResults(results);
        if (results.length === 0) {
            setFeedback("No se encontraron usuarios.");
        }
        setLoading(false);
    };
    
    // --- FUNCIÓN MODIFICADA CON DEPURACIÓN ---
    const sendFriendRequest = async (targetUser) => {
        if(!user || !userProfile) return;

        // --- CÓDIGO DE DEPURACIÓN ---
        const collectionName = "friendRequests";
        const requestData = {
            from_uid: user.uid,
            from_displayName: userProfile.displayName,
            to_uid: targetUser.uid,
            to_displayName: targetUser.displayName,
            status: 'pending',
            createdAt: serverTimestamp()
        };

        console.log("--- DEBUG: INTENTANDO ENVIAR SOLICITUD ---");
        console.log(`Intentando escribir en la colección: "${collectionName}"`);
        console.log("Con los siguientes datos:", requestData);
        // -----------------------------

        try {
            // Actualizamos la UI para dar feedback inmediato
            setPendingSentRequests(prev => [...prev, targetUser.uid]);

            // Intentamos escribir en la base de datos
            await addDoc(collection(db, collectionName), requestData);

            console.log("--- DEBUG: ESCRITURA EXITOSA ---");
            setFeedback(`¡Solicitud enviada a ${targetUser.displayName}!`);

        } catch (error) {
            // Si hay un error, lo mostramos en la consola
            console.error("--- DEBUG: FALLO LA ESCRITURA ---", error);
            setFeedback("Error al enviar la solicitud. Revisa la consola.");
            // Opcional: revertir el estado del botón si falla para poder reintentar
            setPendingSentRequests(prev => prev.filter(id => id !== targetUser.uid));
        }
    };

    // EN: FriendsManager.jsx

const handleRequest = async (request, action) => {
    console.log(`Llamando a la Cloud Function con action: ${action}, requestId: ${request.id}`);
    setFeedback("Procesando...");

    // --- CAMBIO CLAVE: ESPECIFICAMOS LA REGIÓN ---
    const functions = getFunctions(getApp(), "europe-west1"); 
    const handleFriendRequestFunc = httpsCallable(functions, 'handleFriendRequest');

    try {
        const result = await handleFriendRequestFunc({ requestId: request.id, action: action });
        console.log("Resultado de la Cloud Function:", result.data);
        setFeedback(result.data.message);
    } catch (error) {
        console.error("Error al llamar a la Cloud Function:", error);
        setFeedback("Error: " + error.message);
    }
};

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
                {activeTab === 'search' && (
                    <div>
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nombre de usuario..."
                                className="flex-grow p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="submit" disabled={loading} className="px-6 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">
                                {loading ? '...' : 'Buscar'}
                            </button>
                        </form>
                        <p className="text-center text-sm text-gray-400 h-6 mt-4">{feedback}</p>
                        <div className="mt-2 space-y-3">
                            {/* --- JSX MODIFICADO PARA LA INTERFAZ DEL BOTÓN --- */}
                            {searchResults.map(foundUser => {
                                const isPending = pendingSentRequests.includes(foundUser.uid);
                                return (
                                    <div key={foundUser.uid} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                        <span className="font-semibold">{foundUser.displayName}</span>
                                        <button 
                                            onClick={() => sendFriendRequest(foundUser)} 
                                            disabled={isPending}
                                            className={`flex items-center gap-2 px-3 py-1 text-sm text-white rounded-md transition-colors ${
                                                isPending 
                                                ? 'bg-gray-500 cursor-not-allowed' 
                                                : 'bg-green-600 hover:bg-green-700'
                                            }`}
                                        >
                                            <UserPlusIcon /> {isPending ? 'Enviada' : 'Añadir'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FriendsManager;