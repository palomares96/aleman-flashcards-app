import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

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

// --- SAFETY BARRIER: USE EMULATOR ON LOCALHOST ---
// This automatically connects to the local Firestore emulator if the app is running on localhost.
// This is a critical safety measure to prevent development work from affecting production data and billing.
// To use this, you must have the Firebase Emulator Suite running locally.
// Start it with: `firebase emulators:start`
if (window.location.hostname === 'localhost' && import.meta.env.VITE_USE_EMULATOR === 'true') {
    console.log("--- DEVELOPMENT MODE ---");
    console.log("Connecting to Firestore Emulator on localhost:8080");
    try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log("Successfully connected to Firestore Emulator.");
    } catch (error) {
        console.error("Error connecting to Firestore Emulator. Make sure the emulators are running via 'firebase emulators:start'.", error);
    }
}