import { signOut } from "firebase/auth";
import { auth } from '../firebase.js';

import React, { useState, useEffect } from 'react';
import Game from './Game.jsx';
import WordForm from './WordForm.jsx';
import VocabularyManager from './VocabularyManager.jsx';
import StatsDashboard from './Statistics.jsx'; // Asegúrate que el archivo se llame así
import FriendsManager from './FriendsManager.jsx';
import SentenceMode from './SentenceMode.jsx';

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
const SentenceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

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
            <nav className="sticky bottom-0 w-full flex order-last justify-around p-2 bg-gray-800 sm:relative sm:w-56 sm:p-4 sm:flex-col sm:justify-start sm:order-first gap-2 z-10">
                <NavLink viewName="game"><GameIcon /> <span className="text-xs sm:text-base">Jugar</span></NavLink>
                <NavLink viewName="sentenceMode"><SentenceIcon /> <span className="...">Frases</span></NavLink>
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
            {view === 'sentenceMode' && <SentenceMode user={user} />}
            {view === 'add' && <WordForm user={user} />}
            {view === 'manager' && <VocabularyManager user={user} />}
            {view === 'stats' && <StatsDashboard user={user} />}
            {view === 'friends' && <FriendsManager user={user} userProfile={userProfile} />}
        </main>
    </div>
  );
}

export default AppLayout;