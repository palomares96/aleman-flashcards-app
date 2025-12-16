import React, { useEffect } from 'react';

function TrophyBanner({ trophy, onClose }) {
    useEffect(() => {
        if (!trophy) return;
        const t = setTimeout(() => onClose && onClose(), 4000);
        return () => clearTimeout(t);
    }, [trophy, onClose]);

    if (!trophy) return null;

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
            <div className="flex items-center gap-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 p-4 rounded-xl shadow-xl border border-yellow-200">
                <div className="w-12 h-12 flex items-center justify-center bg-white/80 rounded-full text-2xl">🏆</div>
                <div className="flex-1">
                    <div className="font-bold">¡Trofeo desbloqueado!</div>
                    <div className="text-sm opacity-90">{trophy.title}</div>
                </div>
                <button onClick={() => onClose && onClose()} className="text-slate-900/60 font-bold">✕</button>
            </div>
        </div>
    );
}

export default TrophyBanner;