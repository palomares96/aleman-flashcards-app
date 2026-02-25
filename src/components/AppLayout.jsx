import React, { useState, useEffect } from 'react';
import Game from './Game.jsx';
import SentenceMode from './SentenceMode.jsx';
// Importamos los nuevos contenedores
import LibrarySection from './LibrarySection.jsx';
import ProfileSection from './ProfileSection.jsx';
import Achievements from './Achievements.jsx';
import TrophyBanner from './TrophyBanner.jsx';
import { useTrophyNotification } from '../hooks/useGlobalTrophyNotification.js';

// --- Iconos Minimalistas (Estilo iOS) ---
const GameIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" className="w-7 h-7" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
);
const SentenceIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" className="w-7 h-7" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
);
const LibraryIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" className="w-7 h-7" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
);
const ProfileIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" className="w-7 h-7" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);
const AchievementsIcon = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" className="w-7 h-7" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12a9 9 0 11-18 0 9 9 0 0118 0m-.5-6.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
);

function AppLayout({ user, userProfile }) {
    const [view, setView] = useState('game');
    const [banner, setBanner] = useState(null);
    const { subscribe } = useTrophyNotification();

    // Escuchar eventos globales de trofeos desbloqueados
    useEffect(() => {
        const unsubscribe = subscribe((trophy) => {
            setBanner(trophy);
            // Auto-cerrar el banner después de 4 segundos
            const timeout = setTimeout(() => setBanner(null), 4000);
            return () => clearTimeout(timeout);
        });

        return unsubscribe;
    }, [subscribe]);

    const NavItem = ({ viewName, label, Icon }) => {
        const isActive = view === viewName;
        return (
            <button
                onClick={() => setView(viewName)}
                className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <div className={`mb-1 transition-transform ${isActive ? '-translate-y-1' : ''} relative`}>
                    <Icon active={isActive} />
                    {viewName === 'profile' && userProfile?.tier === 'premium' && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full border border-slate-950 p-0.5 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-black">
                                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c.887-.76 1.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                </div>
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
            </button>
        );
    };

    return (
        <div className="flex flex-col h-screen font-sans text-white bg-slate-950">
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto pt-10 pb-24 px-6 relative z-0">
                {/* Background decorative blobs */}
                <div className="fixed top-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                <div className="fixed bottom-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

                <div className="relative z-10 h-full">
                    {banner && <TrophyBanner trophy={banner} onClose={() => setBanner(null)} />}
                    {view === 'game' && <Game user={user} onTrophyUnlock={(t) => setBanner(t)} />}
                    {view === 'sentenceMode' && <SentenceMode user={user} userProfile={userProfile} />}
                    {view === 'library' && <LibrarySection user={user} />}
                    {view === 'achievements' && <Achievements user={user} onUnlock={(t) => setBanner(t)} />}
                    {view === 'profile' && <ProfileSection user={user} userProfile={userProfile} />}
                </div>
            </main>

            {/* Modern Bottom Navigation (Glassmorphism) */}
            <nav className="fixed bottom-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 pb-safe pt-2">
                <div className="flex justify-around items-end max-w-md mx-auto px-2">
                    <NavItem viewName="game" label="Jugar" Icon={GameIcon} />
                    <NavItem viewName="sentenceMode" label="Frases" Icon={SentenceIcon} />
                    <NavItem viewName="library" label="Biblioteca" Icon={LibraryIcon} />
                    <NavItem viewName="achievements" label="Logros" Icon={AchievementsIcon} />
                    <NavItem viewName="profile" label="Perfil" Icon={ProfileIcon} />
                </div>
            </nav>
        </div>
    );
}

export default AppLayout;