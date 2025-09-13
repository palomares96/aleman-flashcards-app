import React, { useState } from 'react';
import { auth } from '../firebase.js'; // Ajusta la ruta
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

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

export default Login;