import React, { useState, useEffect } from 'react';

// 1. Importaciones de tus componentes
import AppLayout from './components/AppLayout.jsx';
import Login from './components/Login.jsx';
import CreateUsername from './components/CreateUsername.jsx';

// 2. Importaciones de Firebase (solo lo que App.jsx necesita)
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from './firebase.js'; // Importa desde tu archivo centralizado

// =================================================================================
// COMPONENTE RAÍZ: Gestiona la autenticación y el estado general
// =================================================================================
function App() {
const [user, setUser] = useState(null);
const [userProfile, setUserProfile] = useState(null);
const [loading, setLoading] = useState(true);

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
return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Conectando...</div>;
}

 if (user && !userProfile) {
 return <CreateUsername user={user} onProfileCreated={() => fetchUserProfile(user)} />;
 }

 return user && userProfile ? <AppLayout user={user} userProfile={userProfile} /> : <Login />;
}

export default App;
