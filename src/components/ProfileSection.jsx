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

            {/* TIER STATUS CARD - REDISEÑADO (MÁS DISCRETO) */}
            <div className="px-4 sm:px-0 mb-6 font-sans">
                {userProfile?.tier === 'premium' ? (
                    <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-4 rounded-2xl border-l-4 border-amber-500 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-900/40">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-black">
                                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c.887-.76 1.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-amber-100 font-bold text-base">Miembro Premium</h2>
                                <p className="text-amber-500/70 text-[10px] uppercase font-black tracking-widest leading-none">Acceso total habilitado</p>
                            </div>
                        </div>
                        <span className="text-[10px] text-amber-500/50 font-bold border border-amber-500/20 px-2 py-1 rounded-lg">ACTIVO</span>
                    </div>
                ) : (
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-700/50 p-2 rounded-xl border border-white/5">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 00-2.25 2.25z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-gray-300 font-bold text-base">Plan Gratuito</h2>
                                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider leading-none">IA local limitada</p>
                            </div>
                        </div>
                        <button className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">Upgrade</button>
                    </div>
                )}
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