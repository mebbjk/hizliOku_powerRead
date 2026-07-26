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
    letterPuzzle: number;
    wordPuzzle: number;
    wordMatching: number;
    flashExercise: number;
  };
  exerciseHistory?: Record<string, { date: string; score: number }[]>;
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
    letterPuzzle: 0,
    wordPuzzle: 0,
    wordMatching: 0,
    flashExercise: 0
  },
  exerciseHistory: {}
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
      programScores: stats.programScores || [0, 0, 0, 0, 0, 0, 0, 0],
      sessionHistory: stats.sessionHistory || [],
      exerciseHistory: stats.exerciseHistory || {}
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

export const updateHighScore = (game: keyof UserStats['highScores'], score: number): boolean => {
  const stats = getStats();
  const today = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

  // Initialize history if needed
  if (!stats.exerciseHistory) stats.exerciseHistory = {};
  if (!stats.exerciseHistory[game]) stats.exerciseHistory[game] = [];

  // Add to history
  stats.exerciseHistory[game].push({ date: today, score });
  if (stats.exerciseHistory[game].length > 10) {
    stats.exerciseHistory[game].shift();
  }

  let isNewHigh = false;
  if (game === 'schulte') {
    // Schulte için daha düşük süre daha iyidir (0 hariç)
    if (stats.highScores.schulte === 0 || score < stats.highScores.schulte) {
      stats.highScores.schulte = score;
      isNewHigh = true;
    }
  } else {
    if (score > stats.highScores[game]) {
      stats.highScores[game] = score;
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
