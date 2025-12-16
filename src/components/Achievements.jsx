import React, { useEffect, useState } from 'react';
import { TROPHIES, TROPHY_CATEGORIES, useAchievementCheck } from '../hooks/useAchievementCheck.js';

function Achievements({ user, onUnlock }) {
  const [unlocked, setUnlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const checkAchievements = useAchievementCheck(user, (t) => {
    if (onUnlock) onUnlock(t);
  });

  useEffect(() => {
    if (!user) return;
    const fetchAndCompute = async () => {
      setLoading(true);
      try {
        const unlockedList = await checkAchievements();
        setUnlocked(unlockedList || []);
      } catch (err) {
        console.error('Error cargando logros', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndCompute();
  }, [user, checkAchievements]);

  if (!user) return <div className="p-6 text-center text-gray-400">Inicia sesión para ver tus logros.</div>;

  const getCategoryColor = (color) => {
    const colors = {
      blue: 'from-blue-600 to-blue-700',
      amber: 'from-amber-600 to-amber-700',
      red: 'from-red-600 to-red-700',
      green: 'from-green-600 to-green-700',
      pink: 'from-pink-600 to-pink-700',
      purple: 'from-purple-600 to-purple-700'
    };
    return colors[color] || 'from-gray-600 to-gray-700';
  };

  const getTrophyColor = (id) => {
    // Palabras
    if (id.includes('add') || id.includes('bibliotecario') || id === 'first_word') return 'from-blue-600 to-blue-700';
    // Maestría
    if (id.includes('master') || id.includes('aprendiz') || id.includes('debutante') || id.includes('estudiante') || id.includes('experto') || id.includes('virtuoso') || id.includes('sprachgelehrter') || id.includes('sprachmeister') || id.includes('maestro_')) return 'from-amber-600 to-amber-700';
    // Especiales
    if (id === 'wortmeister') return 'from-purple-600 to-purple-700';
    if (id.includes('first_month') || id.includes('trilingual')) return 'from-violet-600 to-violet-700';
    // Rachas
    if (id.includes('daily') || id.includes('streak') || id.includes('marathon')) return 'from-red-600 to-red-700';
    // Amigos
    if (id.includes('friend')) return 'from-green-600 to-green-700';
    // Prefijos
    if (id.includes('prefix')) return 'from-cyan-600 to-cyan-700';
    // Frases
    if (id.includes('sentence') || id.includes('good_sentences')) return 'from-pink-600 to-pink-700';
    // Explorador - Aciertos y palabras jugadas
    if (id.includes('correct_') || id.includes('played_') || id.includes('versatile')) return 'from-teal-600 to-teal-700';
    // Dedicación
    if (id.includes('day_') || id.includes('principiante') || id.includes('dedicado') || id.includes('veterano') || id.includes('imparable')) return 'from-orange-600 to-orange-700';
    // Perfeccionista
    if (id.includes('perfect_') || id.includes('accuracy_') || id.includes('traductor')) return 'from-indigo-600 to-indigo-700';
    // Coleccionista
    if (id.includes('noun_') || id.includes('verb_') || id.includes('adjective_') || id.includes('type_') || id.includes('word_5')) return 'from-yellow-600 to-yellow-700';
    
    return 'from-gray-600 to-gray-700';

  };

  // VISTA DE CATEGORÍAS
  if (!selectedCategory) {
    return (
      <div className="w-full max-w-3xl mx-auto pb-20 px-4">
        <h1 className="text-3xl font-bold mb-2">🏆 Logros</h1>
        <p className="text-sm text-gray-400 mb-8">Selecciona una categoría para ver los detalles.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TROPHY_CATEGORIES.map(cat => {
            const trophiesInCat = TROPHIES.filter(t => t.category === cat.id);
            const unlockedInCat = trophiesInCat.filter(t => unlocked.includes(t.id)).length;
            const colorGradient = getCategoryColor(cat.color);
            
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative p-6 rounded-2xl border-2 bg-gradient-to-br ${colorGradient} border-white/40 shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer transition-all duration-300 group overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none rounded-2xl"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-5xl group-hover:scale-110 transition-transform">{cat.icon}</div>
                    <div className="bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-white font-bold text-sm">
                      {unlockedInCat}/{trophiesInCat.length}
                    </div>
                  </div>
                  
                  <div className="font-bold text-lg text-white">{cat.name}</div>
                  <div className="text-sm text-white/80 mt-1">{trophiesInCat.length} trofeos disponibles</div>
                  
                  <div className="mt-4 w-full bg-black/30 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-white/80 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(unlockedInCat / trophiesInCat.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // VISTA DE DETALLE DE CATEGORÍA
  const category = TROPHY_CATEGORIES.find(c => c.id === selectedCategory);
  const trophiesInCategory = TROPHIES.filter(t => t.category === selectedCategory);
  const unlockedCount = trophiesInCategory.filter(t => unlocked.includes(t.id)).length;

  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-4">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all shadow-lg hover:shadow-xl"
              title="Volver al menú principal"
            >
              ← Volver
            </button>
            <span className="text-3xl">{category.icon}</span>
          </div>
          <h1 className="text-3xl font-bold">{category.name}</h1>
        </div>
        <div className="text-center bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 p-4 rounded-lg border border-yellow-400/50 backdrop-blur-sm">
          <div className="text-2xl font-bold text-yellow-300">{unlockedCount}/{trophiesInCategory.length}</div>
          <div className="text-xs text-yellow-200">Desbloqueados</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {trophiesInCategory.map(t => {
          const isUnlocked = unlocked.includes(t.id);
          const colorGradient = getTrophyColor(t.id);
          
          return (
            <div 
              key={t.id} 
              className={`relative p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden group ${
                isUnlocked 
                  ? `bg-gradient-to-br ${colorGradient} border-white/40 shadow-lg hover:shadow-2xl hover:scale-105` 
                  : 'bg-slate-800/40 border-gray-600 opacity-60 grayscale hover:opacity-80'
              }`}
            >
              {isUnlocked && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
              )}
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className={`text-4xl ${isUnlocked ? 'group-hover:scale-110 transition-transform' : 'opacity-50'}`}>
                    {t.icon}
                  </div>
                  {isUnlocked ? (
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-green-600 font-bold text-sm">✓</div>
                  ) : (
                    <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 text-sm">🔒</div>
                  )}
                </div>
                
                <div className={`font-bold text-sm ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>{t.title}</div>
                <div className={`text-xs mt-1 ${isUnlocked ? 'text-white/80' : 'text-gray-500'}`}>{t.desc}</div>
                
                {isUnlocked && (
                  <div className="mt-3 inline-block px-2 py-1 bg-white/20 rounded text-xs font-bold text-white">
                    Desbloqueado ⭐
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Achievements;
