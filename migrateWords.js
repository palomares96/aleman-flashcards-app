// migrateWords.js
import 'dotenv/config';

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";

// 1. Pega aquí tu configuración de Firebase (la misma de tu app)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log("Configuración de Firebase leída:", firebaseConfig); 

// 2. Reemplaza esto con TU PROPIO User ID
// Lo puedes encontrar en Firebase > Authentication
const TARGET_USER_ID = "hXJrGqiPJeTAxchdQwbeCvdFA963"; 

// --- No toques el resto del código ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateWords() {

  console.log("Iniciando migración para el usuario:", TARGET_USER_ID);

  const defaultWordsCollection = collection(db, "words");
  const userWordsCollection = collection(db, `users/${TARGET_USER_ID}/words`);

  try {
    console.log("Obteniendo las palabras por defecto de la colección 'words'...");
    const defaultWordsSnapshot = await getDocs(defaultWordsCollection);

    if (defaultWordsSnapshot.empty) {
        console.warn("⚠️ La colección 'words' está vacía. No hay nada que migrar.");
        return;
    }

    console.log(`Se encontraron ${defaultWordsSnapshot.size} palabras para migrar.`);

    // Usamos un batch para hacer todas las escrituras en una sola operación
    const batch = writeBatch(db);

    defaultWordsSnapshot.forEach(wordDoc => {
      const newWordRef = doc(userWordsCollection); // Crea una referencia con un ID nuevo
      batch.set(newWordRef, wordDoc.data());
    });

    console.log("Escribiendo palabras en la subcolección del usuario...");
    await batch.commit();

    console.log("✅ ¡Migración completada con éxito!");

  } catch (error) {
    console.error("❌ Error durante la migración:", error);
  }
}

migrateWords();