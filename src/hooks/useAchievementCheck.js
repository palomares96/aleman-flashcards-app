import { useState, useCallback } from 'react';
import { db } from '../firebase.js';
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { MASTERY_CRITERIA } from '../config.js';
import { useTrophyNotification } from './useGlobalTrophyNotification.js';

// Categorías de trofeos 33
const TROPHY_CATEGORIES = [
  {
    id: 'words',
    name: 'Palabras Añadidas',
    icon: '📚',
    color: 'blue'
  },
  {
    id: 'mastery',
    name: 'Maestría',
    icon: '⭐',
    color: 'amber'
  },
  {
    id: 'streaks',
    name: 'Rachas',
    icon: '🔥',
    color: 'red'
  },
  {
    id: 'friends',
    name: 'Social',
    icon: '👥',
    color: 'green'
  },
  {
    id: 'sentences',
    name: 'Modo Frase',
    icon: '📝',
    color: 'pink'
  },
  {
    id: 'explorer',
    name: 'Explorador',
    icon: '🗺️',
    color: 'cyan'
  },
  {
    id: 'dedication',
    name: 'Dedicación',
    icon: '💪',
    color: 'violet'
  },
  {
    id: 'perfection',
    name: 'Perfeccionista',
    icon: '💎',
    color: 'indigo'
  },
  {
    id: 'collector',
    name: 'Coleccionista',
    icon: '🎯',
    color: 'orange'
  },
  {
    id: 'other',
    name: 'Especiales',
    icon: '✨',
    color: 'purple'
  }
];

const TROPHIES = [
  // === PALABRAS AÑADIDAS ===
  { id: 'first_word', category: 'words', title: 'Primera palabra', desc: 'Añade tu primera palabra al vocabulario', icon: '📝' },
  { id: 'add_10', category: 'words', title: 'Coleccionista: 10', desc: 'Añade 10 palabras', icon: '📚' },
  { id: 'add_50', category: 'words', title: 'Bibliotecario: 50', desc: 'Añade 50 palabras', icon: '🏛️' },
  { id: 'bibliotecario_2', category: 'words', title: 'Bibliotecario II', desc: 'Añade 100 palabras', icon: '📖' },
  { id: 'bibliotecario_3', category: 'words', title: 'Bibliotecario III', desc: 'Añade 200 palabras', icon: '📚' },
  { id: 'bibliotecario_4', category: 'words', title: 'Bibliotecario IV', desc: 'Añade 500 palabras', icon: '🏰' },
  { id: 'bibliotecario_5', category: 'words', title: 'Bibliotecario V', desc: 'Añade 1000 palabras', icon: '🏛️' },
  { id: 'bibliotecario_6', category: 'words', title: 'Bibliotecario VI', desc: 'Añade 1500 palabras', icon: '👑' },
  { id: 'bibliotecario_7', category: 'words', title: 'Bibliotecario VII', desc: 'Añade 2000 palabras', icon: '🌟' },
  { id: 'wortmeister', category: 'other', title: 'Wortmeister', desc: 'Añade 2500 palabras - ¡Maestro de palabras!', icon: '🏆' },

  // === MAESTRÍA ===
  { id: 'first_master', category: 'mastery', title: 'Primer Dominio', desc: 'Domina tu primera palabra', icon: '✨' },
  { id: 'aprendiz_5', category: 'mastery', title: 'Aprendiz', desc: 'Domina 5 palabras', icon: '🌱' },
  { id: 'debutante_10', category: 'mastery', title: 'Debutante', desc: 'Domina 10 palabras', icon: '⭐' },
  { id: 'estudiante_25', category: 'mastery', title: 'Estudiante', desc: 'Domina 25 palabras', icon: '📖' },
  { id: 'experto_50', category: 'mastery', title: 'Experto', desc: 'Domina 50 palabras', icon: '🎓' },
  { id: 'maestro_100', category: 'mastery', title: 'Maestro', desc: 'Domina 100 palabras', icon: '🎯' },
  { id: 'maestro_250', category: 'mastery', title: 'Gran Maestro', desc: 'Domina 250 palabras', icon: '👑' },
  { id: 'virtuoso', category: 'mastery', title: 'Virtuoso', desc: 'Domina 500 palabras - ¡Eres un virtuoso del idioma!', icon: '✨' },
  { id: 'sprachgelehrter', category: 'mastery', title: 'Sprachgelehrter', desc: 'Domina 1000 palabras - ¡Eres un erudito del idioma!', icon: '🔮' },
  { id: 'sprachmeister', category: 'mastery', title: 'Sprachmeister', desc: 'Domina 1500 palabras - ¡Eres el maestro absoluto del lenguaje!', icon: '👑' },

  // === RACHAS DE DÍAS Y ACIERTOS ===
  { id: 'daily_7', category: 'streaks', title: 'Racha: 7 días', desc: 'Conéctate y juega 7 días seguidos', icon: '🔥' },
  { id: 'daily_14', category: 'streaks', title: 'Racha: 14 días', desc: 'Conéctate y juega 14 días seguidos', icon: '🌡️' },
  { id: 'daily_30', category: 'streaks', title: 'Racha: 30 días', desc: 'Conéctate y juega 30 días seguidos', icon: '⚡' },
  { id: 'streak_5', category: 'streaks', title: 'Racha: 5 aciertos', desc: 'Consigue 5 aciertos seguidos', icon: '🎯' },
  { id: 'streak_10', category: 'streaks', title: 'Racha: 10 aciertos', desc: 'Consigue 10 aciertos seguidos', icon: '🔝' },
  { id: 'streak_25', category: 'streaks', title: 'Racha: 25 aciertos', desc: 'Consigue 25 aciertos seguidos', icon: '💥' },
  { id: 'streak_50', category: 'streaks', title: 'Racha: 50 aciertos', desc: 'Consigue 50 aciertos seguidos', icon: '🚀' },

  // === AMIGOS ===
  { id: 'friend_1', category: 'friends', title: 'Social', desc: 'Conecta con al menos 1 amigo', icon: '👥' },
  { id: 'friend_5', category: 'friends', title: 'Networking: 5', desc: 'Conecta con 5 amigos', icon: '👫' },
  { id: 'friend_10', category: 'friends', title: 'Influencer', desc: 'Conecta con 10 amigos', icon: '🌐' },

  // === MODO FRASE ===
  { id: 'perfect_sentence', category: 'sentences', title: 'Perfección Lingüística', desc: 'Consigue un 10/10 en una frase', icon: '📋' },
  { id: 'sentences_5', category: 'sentences', title: 'Practicante de Frases', desc: 'Juega 5 frases', icon: '📝' },
  { id: 'sentences_25', category: 'sentences', title: 'Maestro de Frases', desc: 'Juega 25 frases', icon: '🎓' },
  { id: 'sentences_100', category: 'sentences', title: 'Erudito de Frases', desc: 'Juega 100 frases', icon: '📚' },
  { id: 'sentences_250', category: 'sentences', title: 'Poliglota de Frases', desc: 'Juega 250 frases', icon: '🗣️' },
  { id: 'good_sentences_5', category: 'sentences', title: 'Fluidez: 5 frases', desc: 'Consigue más de 7/10 en 5 frases seguidas', icon: '⭐' },
  { id: 'good_sentences_10', category: 'sentences', title: 'Fluidez: 10 frases', desc: 'Consigue más de 7/10 en 10 frases seguidas', icon: '✨' },

  // === PALABRAS EXTRA ===
  { id: 'bibliotecario_8', category: 'words', title: 'Bibliotecario VIII', desc: 'Añade 3000 palabras', icon: '🏛️' },
  { id: 'bibliotecario_9', category: 'words', title: 'Bibliotecario IX', desc: 'Añade 4000 palabras', icon: '🏰' },
  { id: 'bibliotecario_maestro', category: 'words', title: 'Bibliotecario Supremo', desc: 'Añade 5000 palabras', icon: '👑' },

  // === MAESTRÍA EXTRA ===
  { id: 'maestro_2000', category: 'mastery', title: 'Polímata', desc: 'Domina 2000 palabras', icon: '🧠' },
  { id: 'maestro_3000', category: 'mastery', title: 'Enciclopedia Viviente', desc: 'Domina 3000 palabras', icon: '📕' },

  // === EXPLORADOR ===
  { id: 'correct_50', category: 'explorer', title: 'Acertador: 50', desc: 'Consigue 50 respuestas correctas totales', icon: '✅' },
  { id: 'correct_100', category: 'explorer', title: 'Acertador: 100', desc: 'Consigue 100 respuestas correctas totales', icon: '🎯' },
  { id: 'correct_500', category: 'explorer', title: 'Acertador: 500', desc: 'Consigue 500 respuestas correctas totales', icon: '🔥' },
  { id: 'correct_1000', category: 'explorer', title: 'Acertador: 1000', desc: 'Consigue 1000 respuestas correctas totales', icon: '⚡' },
  { id: 'played_50', category: 'explorer', title: 'Jugador Activo', desc: 'Juega 50 palabras (intentos)', icon: '🎮' },
  { id: 'played_200', category: 'explorer', title: 'Jugador Incansable', desc: 'Juega 200 palabras (intentos)', icon: '👾' },
  { id: 'sentence_scholar', category: 'explorer', title: 'Erudito de Frases', desc: 'Completa 50 frases', icon: '📚' },
  { id: 'versatile_learner', category: 'explorer', title: 'Aprendiz Versátil', desc: 'Usa todas las funciones principales', icon: '🎯' },

  // === DEDICACIÓN ===
  { id: 'day_3', category: 'dedication', title: 'Principiante Comprometido', desc: 'Juega 3 días en total', icon: '📅' },
  { id: 'day_10', category: 'dedication', title: 'Jugador Dedicado', desc: 'Juega 10 días en total', icon: '🗓️' },
  { id: 'day_30', category: 'dedication', title: 'Veterano', desc: 'Juega 30 días en total', icon: '⏳' },
  { id: 'day_100', category: 'dedication', title: 'Hombre de Hierro', desc: 'Juega 100 días en total', icon: '🛡️' },
  { id: 'streak_60', category: 'dedication', title: 'Imparable', desc: 'Consigue 60 aciertos seguidos', icon: '⚡' },
  { id: 'marathon', category: 'dedication', title: 'Maratón Linguístico', desc: 'Juega 100 veces seguidas', icon: '🏃' },

  // === PERFECCIONISTA ===
  { id: 'perfect_start', category: 'perfection', title: 'Inicio Perfecto', desc: 'Gana tu primer juego sin errores', icon: '✨' },
  { id: 'perfect_game', category: 'perfection', title: 'Juego Impecable', desc: 'Gana una partida completa sin errores', icon: '💯' },
  { id: 'accuracy_90', category: 'perfection', title: 'Precision Master', desc: 'Alcanza 90% de precisión acumulada', icon: '🎯' },
  { id: 'sentences_perfect_5', category: 'perfection', title: 'Traductor Perfecto', desc: 'Consigue 10/10 en 5 frases', icon: '📜' },

  // === COLECCIONISTA ===
  { id: 'noun_master', category: 'collector', title: 'Maestro de Sustantivos', desc: 'Domina 50 sustantivos', icon: '📦' },
  { id: 'verb_master', category: 'collector', title: 'Maestro de Verbos', desc: 'Domina 50 verbos', icon: '⚡' },
  { id: 'adjective_master', category: 'collector', title: 'Maestro de Adjetivos', desc: 'Domina 25 adjetivos', icon: '🎨' },
  { id: 'type_master', category: 'collector', title: 'Coleccionista Épico', desc: 'Domina al menos 30 palabras de cada tipo', icon: '🏆' },
  { id: 'word_5000', category: 'collector', title: 'Mega Coleccionista', desc: 'Colecciona un total de 5000 palabras', icon: '📊' },

  // === ESPECIALES ===
  { id: 'prefixes_5', category: 'other', title: 'Prefijador', desc: 'Añade 5 prefijos separables', icon: '⚙️' },
  { id: 'prefixes_50', category: 'other', title: 'Rey de Prefijos', desc: 'Añade 50 prefijos separables', icon: '👑' },
  { id: 'first_month', category: 'other', title: 'Primer Mes', desc: 'Completa tu primer mes en la app', icon: '🎂' },
  { id: 'trilingual_ambition', category: 'other', title: 'Ambición Trilingüe', desc: 'Crea 3 categorías de palabras personalizadas', icon: '🌍' }
];

export function useAchievementCheck(user, onNewTrophy) {
  const { emitTrophy } = useTrophyNotification();
  
  const checkAchievements = useCallback(async () => {
    if (!user) return [];
    
    try {
      const [wordsSnap, progressSnap, friendsSnap, sentencesSnap] = await Promise.all([
        getDocs(collection(db, `users/${user.uid}/words`)),
        getDocs(collection(db, `users/${user.uid}/progress`)),
        getDocs(collection(db, `users/${user.uid}/friends`)),
        getDocs(collection(db, `users/${user.uid}/sentenceAttempts`))
      ]);

      const words = wordsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const progress = progressSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const friends = friendsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sentences = sentencesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      let totalPrefixes = 0;
      words.forEach(w => {
        if (w.type === 'verb' && w.attributes?.separablePrefixes) {
          totalPrefixes += w.attributes.separablePrefixes.length;
        }
      });

      let masteredCount = 0;
      progress.forEach(p => {
        const totalPlays = (p.correct || 0) + (p.incorrect || 0);
        const errorRate = totalPlays > 0 ? (p.incorrect || 0) / totalPlays : 0;
        const isMastered = (totalPlays >= MASTERY_CRITERIA.MIN_PLAYS && errorRate < MASTERY_CRITERIA.MAX_ERROR_RATE) || (p.correctStreak || 0) >= MASTERY_CRITERIA.STREAK_NEEDED;
        if (isMastered) masteredCount++;
      });

      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      const recentDaily = (await getDocs(collection(db, 'dailyStats'))).docs
        .map(d => d.data())
        .filter(d => d.userId === user.uid && d.date && d.date.toDate() >= sevenDaysAgo);

      // Calcular racha más larga de días consecutivos (para "Maratón Linguístico")
      const allDailyStats = (await getDocs(collection(db, 'dailyStats'))).docs
        .map(d => d.data())
        .filter(d => d.userId === user.uid && d.date)
        .map(d => ({ date: d.date.toDate() }))
        .sort((a, b) => a.date - b.date);

      let longestStreak = 0;
      let currentStreak = 1;
      for (let i = 1; i < allDailyStats.length; i++) {
        const prevDate = new Date(allDailyStats[i - 1].date);
        const currDate = new Date(allDailyStats[i].date);
        const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentStreak);

      // Calcular lógica de frases
      let sentenceStreak = 0;
      const sentencesSorted = sentences.sort((a, b) => new Date(a.createdAt?.toDate?.() || 0) - new Date(b.createdAt?.toDate?.() || 0));
      for (let i = sentencesSorted.length - 1; i >= 0; i--) {
        if ((sentencesSorted[i].score || 0) > 7) {
          sentenceStreak++;
        } else {
          break;
        }
      }

      // Filtrar palabras: solo las propias (no importadas) para trofeos de "palabras añadidas"
      const ownWords = words.filter(w => !w.importedFrom);

      console.log('Achievement Check Debug:', {
        wordsCount: words.length,
        ownWordsCount: ownWords.length,
        progressCount: progress.length,
        friendsCount: friends.length,
        masteredCount,
        totalPrefixes,
        recentDaily: recentDaily.length,
        longestStreak,
        sentencesCount: sentences.length,
        sentenceStreak
      });

      // Cargar logros persistidos desde el documento del usuario
      const userDocRef = doc(db, `users/${user.uid}`);
      const userSnap = await getDoc(userDocRef);
      const persisted = userSnap.exists() ? (userSnap.data().achievements?.unlocked || []) : [];
      const currentUnlocked = new Set(persisted);

      const checks = {
        // Palabras añadidas (sin importadas)
        first_word: () => ownWords.length >= 1,
        add_10: () => ownWords.length >= 10,
        add_50: () => ownWords.length >= 50,
        bibliotecario_2: () => ownWords.length >= 100,
        bibliotecario_3: () => ownWords.length >= 200,
        bibliotecario_4: () => ownWords.length >= 500,
        bibliotecario_5: () => ownWords.length >= 1000,
        bibliotecario_6: () => ownWords.length >= 1500,
        bibliotecario_7: () => ownWords.length >= 2000,
        wortmeister: () => ownWords.length >= 2500,
        
        // Maestría
        first_master: () => masteredCount >= 1,
        aprendiz_5: () => masteredCount >= 5,
        debutante_10: () => masteredCount >= 10,
        estudiante_25: () => masteredCount >= 25,
        experto_50: () => masteredCount >= 50,
        maestro_100: () => masteredCount >= 100,
        maestro_250: () => masteredCount >= 250,
        virtuoso: () => masteredCount >= 500,
        sprachgelehrter: () => masteredCount >= 1000,
        sprachmeister: () => masteredCount >= 1500,
        maestro_2000: () => masteredCount >= 2000,
        maestro_3000: () => masteredCount >= 3000,
        
        // Rachas de días
        daily_7: () => recentDaily.length >= 7,
        daily_14: () => recentDaily.length >= 14,
        daily_30: () => recentDaily.length >= 30,
        
        // Rachas de aciertos
        streak_5: () => progress.some(p => (p.correctStreak || 0) >= 5),
        streak_10: () => progress.some(p => (p.correctStreak || 0) >= 10),
        streak_25: () => progress.some(p => (p.correctStreak || 0) >= 25),
        streak_50: () => progress.some(p => (p.correctStreak || 0) >= 50),
        streak_60: () => progress.some(p => (p.correctStreak || 0) >= 60),
        
        // Amigos
        friend_1: () => friends.length >= 1,
        friend_5: () => friends.length >= 5,
        friend_10: () => friends.length >= 10,
        
        // Prefijos
        prefixes_5: () => totalPrefixes >= 5,
        prefixes_50: () => totalPrefixes >= 50,

        // Modo Frase
        perfect_sentence: () => sentences.some(s => (s.score || 0) === 10),
        sentences_5: () => sentences.length >= 5,
        sentences_25: () => sentences.length >= 25,
        sentences_100: () => sentences.length >= 100,
        sentences_250: () => sentences.length >= 250,
        good_sentences_5: () => sentenceStreak >= 5,
        good_sentences_10: () => sentenceStreak >= 10,
        
        // Palabras extra
        bibliotecario_8: () => words.length >= 3000,
        bibliotecario_9: () => words.length >= 4000,
        bibliotecario_maestro: () => words.length >= 5000,
        
        // Explorador - Aciertos y palabras jugadas
        correct_50: () => {
          const totalCorrect = progress.reduce((sum, p) => sum + (p.correct || 0), 0);
          return totalCorrect >= 50;
        },
        correct_100: () => {
          const totalCorrect = progress.reduce((sum, p) => sum + (p.correct || 0), 0);
          return totalCorrect >= 100;
        },
        correct_500: () => {
          const totalCorrect = progress.reduce((sum, p) => sum + (p.correct || 0), 0);
          return totalCorrect >= 500;
        },
        correct_1000: () => {
          const totalCorrect = progress.reduce((sum, p) => sum + (p.correct || 0), 0);
          return totalCorrect >= 1000;
        },
        played_50: () => {
          const totalPlayed = progress.reduce((sum, p) => sum + ((p.correct || 0) + (p.incorrect || 0)), 0);
          return totalPlayed >= 50;
        },
        played_200: () => {
          const totalPlayed = progress.reduce((sum, p) => sum + ((p.correct || 0) + (p.incorrect || 0)), 0);
          return totalPlayed >= 200;
        },
        sentence_scholar: () => sentences.length >= 50,
        versatile_learner: () => true,
        
        // Dedicación
        day_3: () => recentDaily.length >= 3 || true,
        day_10: () => recentDaily.length >= 10 || true,
        day_30: () => recentDaily.length >= 30 || true,
        day_100: () => recentDaily.length >= 100 || true,
        marathon: () => longestStreak >= 100,
        
        // Perfeccionista
        perfect_start: () => true,
        perfect_game: () => true,
        accuracy_90: () => {
          const totalPlays = progress.reduce((sum, p) => sum + ((p.correct || 0) + (p.incorrect || 0)), 0);
          const totalCorrect = progress.reduce((sum, p) => sum + (p.correct || 0), 0);
          return totalPlays > 0 && (totalCorrect / totalPlays) >= 0.9;
        },
        sentences_perfect_5: () => sentences.filter(s => (s.score || 0) === 10).length >= 5,
        
        // Coleccionista
        noun_master: () => {
          const nounProgress = progress.filter(p => {
            const word = words.find(w => w.id === p.id || w.id.split('_')[0] === p.id);
            return word && word.type === 'noun';
          });
          return nounProgress.filter(p => (p.correctStreak || 0) >= MASTERY_CRITERIA.STREAK_NEEDED || ((p.correct || 0) >= MASTERY_CRITERIA.MIN_PLAYS && ((p.incorrect || 0) / ((p.correct || 0) + (p.incorrect || 0))) < MASTERY_CRITERIA.MAX_ERROR_RATE)).length >= 50;
        },
        verb_master: () => {
          const verbProgress = progress.filter(p => {
            const word = words.find(w => w.id === p.id || w.id.split('_')[0] === p.id);
            return word && word.type === 'verb';
          });
          return verbProgress.filter(p => (p.correctStreak || 0) >= MASTERY_CRITERIA.STREAK_NEEDED || ((p.correct || 0) >= MASTERY_CRITERIA.MIN_PLAYS && ((p.incorrect || 0) / ((p.correct || 0) + (p.incorrect || 0))) < MASTERY_CRITERIA.MAX_ERROR_RATE)).length >= 50;
        },
        adjective_master: () => {
          const adjectiveProgress = progress.filter(p => {
            const word = words.find(w => w.id === p.id || w.id.split('_')[0] === p.id);
            return word && word.type === 'adjective';
          });
          return adjectiveProgress.filter(p => (p.correctStreak || 0) >= MASTERY_CRITERIA.STREAK_NEEDED || ((p.correct || 0) >= MASTERY_CRITERIA.MIN_PLAYS && ((p.incorrect || 0) / ((p.correct || 0) + (p.incorrect || 0))) < MASTERY_CRITERIA.MAX_ERROR_RATE)).length >= 25;
        },
        type_master: () => masteredCount >= 120,
        word_5000: () => words.length >= 5000,
        
        // Especiales
        first_month: () => recentDaily.length >= 30,
        trilingual_ambition: () => true // Placeholder
      };

      const newlyUnlocked = [];
      for (const t of TROPHIES) {
        const ok = checks[t.id] && checks[t.id]();
        if (ok && !currentUnlocked.has(t.id)) {
          newlyUnlocked.push(t);
          currentUnlocked.add(t.id);
        }
      }

      // IMPORTANTE: Actualizar SIEMPRE en Firebase, incluso si no hay nuevos
      const unlockedArray = Array.from(currentUnlocked);
      await setDoc(userDocRef, { 
        achievements: { 
          unlocked: unlockedArray, 
          updatedAt: serverTimestamp() 
        } 
      }, { merge: true });
      
      // Notificar los nuevos desbloqueados - TANTO al callback como globalmente
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach(t => {
          // Callback local (si existe)
          if (onNewTrophy) onNewTrophy(t);
          // Emitir evento global para que aparezca en cualquier pestaña
          emitTrophy(t);
        });
      }
      
      // RETORNAR SIEMPRE la lista completa de desbloqueados
      return unlockedArray;
    } catch (err) {
      console.error('Error checking achievements', err);
      return [];
    }
  }, [user, onNewTrophy, emitTrophy]);

  return { checkAchievements };
}