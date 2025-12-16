import React, { useState } from 'react';
import StatsDashboard from './Statistics.jsx';
import FriendsManager from './FriendsManager.jsx';
import { signOut } from "firebase/auth";
import { auth } from '../firebase.js';

// Icono Logout
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

function ProfileSection({ user, userProfile }) {
    const [mode, setMode] = useState('stats'); // 'stats' | 'friends' | 'settings'

    const handleLogout = () => {
        signOut(auth);
    };

    return (
        <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                <h1 className="text-3xl font-bold text-white tracking-tight">Perfil</h1>
                <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 transition-colors">
                    <LogoutIcon />
                </button>
            </div>

            {/* Segmented Control */}
            <div className="bg-gray-800/50 p-1 rounded-xl flex mb-6 mx-4 sm:mx-0 backdrop-blur-sm border border-white/10">
                <button 
                    onClick={() => setMode('stats')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${mode === 'stats' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    Estadísticas
                </button>
                <button 
                    onClick={() => setMode('friends')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${mode === 'friends' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    Amigos
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-1">
                {mode === 'stats' && <StatsDashboard user={user} />}
                {mode === 'friends' && <FriendsManager user={user} userProfile={userProfile} />}
            </div>
        </div>
    );
}

export default ProfileSection;