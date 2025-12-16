import React, { useState } from 'react';
import WordForm from './WordForm.jsx';
import VocabularyManager from './VocabularyManager.jsx';

function LibrarySection({ user }) {
    const [mode, setMode] = useState('manage'); // 'manage' | 'add'

    return (
        <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                <h1 className="text-3xl font-bold text-white tracking-tight">Biblioteca</h1>
            </div>

            {/* Segmented Control Moderno */}
            <div className="bg-gray-800/50 p-1 rounded-xl flex mb-6 mx-4 sm:mx-0 backdrop-blur-sm border border-white/10">
                <button 
                    onClick={() => setMode('manage')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${mode === 'manage' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    Gestionar
                </button>
                <button 
                    onClick={() => setMode('add')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${mode === 'add' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    + Añadir Nueva
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {mode === 'add' ? <WordForm user={user} /> : <VocabularyManager user={user} />}
            </div>
        </div>
    );
}

export default LibrarySection;