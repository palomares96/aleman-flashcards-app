import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Tu configuración de Firebase que estaba en App.jsx
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inicializa Firebase y exporta las instancias
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- SAFETY BARRIER: USE EMULATORS ON LOCALHOST ---
// Connects to local Firebase Emulators during development to prevent
// accidental production data access, Cloud Function invocations, and billing.
// Start emulators with: `firebase emulators:start`
const isNativePlatform = !!window.Capacitor;
if (!isNativePlatform && window.location.hostname === 'localhost' && import.meta.env.VITE_USE_EMULATOR === 'true') {
    console.log("--- 🛡️ DEVELOPMENT MODE: Using Firebase Emulators ---");
    try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log("✅ Connected to Firestore Emulator (localhost:8080)");
    } catch (error) {
        console.error("❌ Firestore Emulator connection failed:", error);
    }
    try {
        const functions = getFunctions(app, "europe-west1");
        connectFunctionsEmulator(functions, 'localhost', 5001);
        console.log("✅ Connected to Functions Emulator (localhost:5001)");
    } catch (error) {
        console.error("❌ Functions Emulator connection failed:", error);
    }
}