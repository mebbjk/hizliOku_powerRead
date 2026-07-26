export interface UserStats {
  streak: number;
  lastActivityDate: string;
  totalWordsRead: number;
  bestWpm: number;
  hasDoneInitialTest: boolean;
  restEndTime: number; // Dinlenme kilidinin biteceği zaman damgası (milisaniye)
  completedCountThisSession: number; // Bu oturumda tamamlanan egzersiz sayısı (max 8)
  trainingMode: 'program' | 'free';
  currentLevel: number; // 1-6 arası seviye
  programList: string[]; // Aktif 8'li egzersiz listesi
  programIndex: number; // Aktif programdaki adım indeksi (0-8)
  programScores: number[]; // 8 adıma ait skorlar
  sessionHistory: {
    date: string;
    avgScore: number;
    improvement: number; // Yüzdesel gelişim oranı
  }[];
  highScores: {
    schulte: number;
    letter_letters: number;
    letter_numbers: number;
    word_words: number;
    word_numbers: number;
    match_words: number;
    match_numbers: number;
    flash: number;
    flash_sentence: number;
  };
  unscoredPlayCounts?: Record<string, number>;
  exerciseHistory?: Record<string, { date: string; score: number }[]>;
  wpmHistory?: { date: string; wpm: number }[];
}

const DEFAULT_STATS: UserStats = {
  streak: 0,
  lastActivityDate: '',
  totalWordsRead: 0,
  bestWpm: 0,
  hasDoneInitialTest: false,
  restEndTime: 0,
  completedCountThisSession: 0,
  trainingMode: 'program',
  currentLevel: 1,
  programList: [],
  programIndex: 0,
  programScores: [0, 0, 0, 0, 0, 0, 0, 0],
  sessionHistory: [],
  highScores: {
    schulte: 0,
    letter_letters: 0,
    letter_numbers: 0,
    word_words: 0,
    word_numbers: 0,
    match_words: 0,
    match_numbers: 0,
    flash: 0,
    flash_sentence: 0
  },
  unscoredPlayCounts: {
    rsvp: 0,
    flash_unscored: 0,
    pathtracking: 0
  },
  exerciseHistory: {},
  wpmHistory: []
};

let onStatsSaveCallback: ((stats: UserStats) => void) | null = null;

export const registerOnStatsSave = (cb: (stats: UserStats) => void) => {
  onStatsSaveCallback = cb;
};

export const getStats = (): UserStats => {
  const data = localStorage.getItem('hizli_okuma_stats');
  if (!data) return DEFAULT_STATS;
  try {
    const stats = JSON.parse(data);
    return {
      ...DEFAULT_STATS,
      ...stats,
      highScores: {
        ...DEFAULT_STATS.highScores,
        ...(stats.highScores || {})
      },
      unscoredPlayCounts: {
        ...DEFAULT_STATS.unscoredPlayCounts,
        ...(stats.unscoredPlayCounts || {})
      },
      programScores: stats.programScores || [0, 0, 0, 0, 0, 0, 0, 0],
      sessionHistory: stats.sessionHistory || [],
      exerciseHistory: stats.exerciseHistory || {},
      wpmHistory: stats.wpmHistory || []
    };
  } catch {
    return DEFAULT_STATS;
  }
};

export const saveStats = (stats: UserStats) => {
  localStorage.setItem('hizli_okuma_stats', JSON.stringify(stats));
  if (onStatsSaveCallback) {
    onStatsSaveCallback(stats);
  }
};

export const calculateLevelFromWpm = (wpm: number): number => {
  if (wpm < 200) return 1;
  if (wpm < 350) return 2;
  if (wpm < 500) return 3;
  if (wpm < 700) return 4;
  if (wpm < 900) return 5;
  return 6;
};

export const updateHighScore = (game: string, score: number): boolean => {
  const stats = getStats();
  const today = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

  // Map old keys to new keys for backward compatibility
  let resolvedKey = game as keyof UserStats['highScores'];
  if (game === 'letterPuzzle') resolvedKey = 'letter_letters';
  else if (game === 'wordPuzzle') resolvedKey = 'word_words';
  else if (game === 'flashExercise') resolvedKey = 'flash';

  if (!stats.highScores) {
    stats.highScores = { ...DEFAULT_STATS.highScores };
  }

  // Initialize history if needed
  if (!stats.exerciseHistory) stats.exerciseHistory = {};
  if (!stats.exerciseHistory[resolvedKey]) stats.exerciseHistory[resolvedKey] = [];

  // Add to history (Limit to last 5 scores to keep UI compact and avoid scroll)
  stats.exerciseHistory[resolvedKey].push({ date: today, score });
  if (stats.exerciseHistory[resolvedKey].length > 5) {
    stats.exerciseHistory[resolvedKey].shift();
  }

  let isNewHigh = false;
  if (resolvedKey === 'schulte') {
    // Schulte için daha düşük süre daha iyidir (0 hariç)
    if (stats.highScores.schulte === 0 || score < stats.highScores.schulte) {
      stats.highScores.schulte = score;
      isNewHigh = true;
    }
  } else {
    if (score > (stats.highScores[resolvedKey] || 0)) {
      stats.highScores[resolvedKey] = score;
      isNewHigh = true;
    }
  }

  saveStats(stats);
  return isNewHigh;
};

export const addWordsRead = (words: number) => {
  const stats = getStats();
  stats.totalWordsRead += words;
  updateStreak(stats);
  saveStats(stats);
};

export const saveWpm = (wpm: number) => {
  const stats = getStats();
  if (wpm > stats.bestWpm) {
    stats.bestWpm = wpm;
    stats.currentLevel = calculateLevelFromWpm(wpm);
  }
  stats.hasDoneInitialTest = true;

  // WPM gelişim geçmişine ekle
  const today = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  if (!stats.wpmHistory) stats.wpmHistory = [];
  stats.wpmHistory.push({ date: today, wpm });

  saveStats(stats);
};

const updateStreak = (stats: UserStats) => {
  const today = new Date().toISOString().split('T')[0];
  if (stats.lastActivityDate === today) return;
  
  if (stats.lastActivityDate) {
    const lastDate = new Date(stats.lastActivityDate);
    const diffTime = Math.abs(new Date(today).getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      stats.streak += 1;
    } else if (diffDays > 1) {
      stats.streak = 1;
    }
  } else {
    stats.streak = 1;
  }
  stats.lastActivityDate = today;
};
