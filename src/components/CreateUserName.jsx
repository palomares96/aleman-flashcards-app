import React, { useState } from 'react';
import { db } from '../firebase.js'; // Ajusta la ruta
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, limit } from "firebase/firestore";

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
        const q = query(usersRef, where("displayName", "==", username.trim()), limit(1));
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
                displayName_lowercase: username.trim().toLowerCase(),
                tier: 'free', // Default tier
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

export default CreateUsername;