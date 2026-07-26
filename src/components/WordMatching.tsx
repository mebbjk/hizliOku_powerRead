import React, { useState, useEffect, useRef } from 'react';
import { Layers, Play, RotateCcw, Clock, Award } from 'lucide-react';
import { TURKISH_WORDS } from '../utils/wordPool';

interface WordPair {
  id: number;
  word1: string;
  word2: string;
  isDifferent: boolean;
}

type GameMode = 'words' | 'numbers';

interface WordMatchingProps {
  mode?: GameMode;
  onComplete?: (score?: number) => void;
  onStartActive?: () => void;
  level?: number;
}

export const WordMatching: React.FC<WordMatchingProps> = ({ mode = 'words', onComplete, onStartActive, level }) => {
  const [levelState, setLevel] = useState<number>(level || 1);
  const [pairs, setPairs] = useState<WordPair[]>([]);
  const [foundIds, setFoundIds] = useState<number[]>([]);
  
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [correctRoundStreak, setCorrectRoundStreak] = useState<number>(0);
  const [wrongClickCount, setWrongClickCount] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (level !== undefined) {
      setLevel(level);
    }
  }, [level]);

  const generateSimilarNumberPair = (digits: number): { word1: string; word2: string } => {
    let sameStr = '';
    for (let i = 0; i < digits; i++) {
      sameStr += Math.floor(Math.random() * 10).toString();
    }
    
    const isDifferent = Math.random() > 0.5;
    if (!isDifferent) {
      return { word1: sameStr, word2: sameStr };
    }
    
    const arr = sameStr.split('');
    const idx = Math.floor(Math.random() * digits);
    const original = parseInt(arr[idx]);
    let modified = Math.floor(Math.random() * 10);
    while (modified === original) {
      modified = Math.floor(Math.random() * 10);
    }
    arr[idx] = modified.toString();
    return { word1: sameStr, word2: arr.join('') };
  };

  const generateSimilarWordPair = (len: number): { word1: string; word2: string } => {
    const subset = TURKISH_WORDS.filter(w => w.length === len);
    const baseWord = subset[Math.floor(Math.random() * subset.length)] || 'KARA';
    
    const isDifferent = Math.random() > 0.5;
    if (!isDifferent) {
      return { word1: baseWord, word2: baseWord };
    }

    // %50 ihtimalle veritabanındaki gerçek benzer kelimelerden seçmeye çalış
    if (Math.random() > 0.5) {
      const similarWords = subset.filter(w => {
        if (w === baseWord) return false;
        let diffCount = 0;
        for (let i = 0; i < len; i++) {
          if (w[i] !== baseWord[i]) diffCount++;
        }
        return diffCount <= 2; // En fazla 2 harfi farklı
      });

      if (similarWords.length > 0) {
        const diffWord = similarWords[Math.floor(Math.random() * similarWords.length)];
        return { word1: baseWord, word2: diffWord };
      }
    }

    // Dinamik olarak son derece benzer (yapay) kopya üret (Harf değişimi, yer değişimi, harf ekleme/çıkarma)
    const turkishChars = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
    const rules = ['swap', 'replace', 'insert', 'delete'];
    const selectedRule = rules[Math.floor(Math.random() * rules.length)];
    
    let diffWord = baseWord;
    
    if (selectedRule === 'swap' && baseWord.length > 1) {
      // Harf yer değişimi (Örn: KARTAL -> KATRAL)
      const idx = Math.floor(Math.random() * (baseWord.length - 1));
      const arr = baseWord.split('');
      const temp = arr[idx];
      arr[idx] = arr[idx + 1];
      arr[idx + 1] = temp;
      diffWord = arr.join('');
    } else if (selectedRule === 'replace') {
      // Harf değişimi (Örn: KARA -> KASA)
      const idx = Math.floor(Math.random() * baseWord.length);
      const arr = baseWord.split('');
      let newChar = turkishChars[Math.floor(Math.random() * turkishChars.length)];
      while (newChar === arr[idx]) {
        newChar = turkishChars[Math.floor(Math.random() * turkishChars.length)];
      }
      arr[idx] = newChar;
      diffWord = arr.join('');
    } else if (selectedRule === 'insert' && baseWord.length < 8) {
      // Ekstra harf ekleme (Örn: KASA -> KASAS)
      const idx = Math.floor(Math.random() * (baseWord.length + 1));
      const char = turkishChars[Math.floor(Math.random() * turkishChars.length)];
      diffWord = baseWord.slice(0, idx) + char + baseWord.slice(idx);
    } else if (selectedRule === 'delete' && baseWord.length > 4) {
      // Harf silme (Örn: DEFTER -> DEFER)
      const idx = Math.floor(Math.random() * baseWord.length);
      diffWord = baseWord.slice(0, idx) + baseWord.slice(idx + 1);
    }

    // Güvenlik koruması: Herhangi bir sebeple değişmediyse basitçe bir harfi değiştir
    if (diffWord === baseWord) {
      const idx = Math.floor(Math.random() * baseWord.length);
      const arr = baseWord.split('');
      arr[idx] = arr[idx] === 'A' ? 'E' : 'A';
      diffWord = arr.join('');
    }

    return { word1: baseWord, word2: diffWord };
  };

  const generateRound = (lvl: number) => {
    const diffPairs: WordPair[] = [];
    const identPairs: WordPair[] = [];
    
    const digitOrLen = mode === 'words' ? Math.min(7, 3 + lvl) : Math.min(8, 3 + lvl);

    for (let i = 0; i < 12; i++) {
      if (mode === 'words') {
        const pair = generateSimilarWordPair(digitOrLen);
        if (pair.word1 !== pair.word2) {
          diffPairs.push({ id: i, word1: pair.word1, word2: pair.word2, isDifferent: true });
        } else {
          identPairs.push({ id: i, word1: pair.word1, word2: pair.word2, isDifferent: false });
        }
      } else {
        const pair = generateSimilarNumberPair(digitOrLen);
        if (pair.word1 !== pair.word2) {
          diffPairs.push({ id: i, word1: pair.word1, word2: pair.word2, isDifferent: true });
        } else {
          identPairs.push({ id: i, word1: pair.word1, word2: pair.word2, isDifferent: false });
        }
      }
    }

    const finalPairs = [...diffPairs.slice(0, 6), ...identPairs.slice(0, 6)];
    
    while (finalPairs.length < 12) {
      if (mode === 'words') {
        const pair = generateSimilarWordPair(digitOrLen);
        finalPairs.push({ id: finalPairs.length, word1: pair.word1, word2: pair.word2, isDifferent: pair.word1 !== pair.word2 });
      } else {
        const pair = generateSimilarNumberPair(digitOrLen);
        finalPairs.push({ id: finalPairs.length, word1: pair.word1, word2: pair.word2, isDifferent: pair.word1 !== pair.word2 });
      }
    }

    const shuffled = [...finalPairs].sort(() => Math.random() - 0.5);
    setPairs(shuffled);
    setFoundIds([]);
  };

  const startGame = () => {
    if (onStartActive) onStartActive();
    setCountdown(3);
    setTimeLeft(60);
    setScore(0);
    setCorrectRoundStreak(0);
    setWrongClickCount(0);
    generateRound(levelState);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setIsStarted(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isStarted && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsStarted(false);
            if (onComplete) onComplete(score);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [isStarted, timeLeft, score, onComplete]);

  const handlePairClick = (pair: WordPair) => {
    if (!isStarted || timeLeft === 0 || foundIds.includes(pair.id)) return;
    if (pair.isDifferent) {
      const newFound = [...foundIds, pair.id];
      setFoundIds(newFound);
      setScore(prev => prev + 10);
      if (newFound.length === 6) {
        setScore(prev => prev + 50);
        const nextStreak = correctRoundStreak + 1;
        setCorrectRoundStreak(nextStreak);
        let nextLvl = levelState;
        if (nextStreak >= 3) {
          nextLvl = Math.min(5, levelState + 1);
          setLevel(nextLvl);
          setCorrectRoundStreak(0);
        }
        setTimeout(() => generateRound(nextLvl), 300);
      }
    } else {
      setScore(prev => Math.max(0, prev - 5));
      setCorrectRoundStreak(0);
      const nextWrong = wrongClickCount + 1;
      setWrongClickCount(nextWrong);
      if (nextWrong >= 2) {
        const nextLvl = Math.max(1, levelState - 1);
        setLevel(nextLvl);
        setWrongClickCount(0);
        setTimeout(() => generateRound(nextLvl), 300);
      }
    }
  };

  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent flex items-center gap-2">
          <Layers className="w-5 h-5 text-orange-400" />
          {mode === 'words' ? 'Kelime Eşleştirme' : 'Sayı Eşleştirme'}
        </h2>
        <span className="text-xs text-slate-500 font-mono">Görsel Ayrıştırma Hızı</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            SÜRE
          </div>
          <span className="text-xs font-black text-slate-200">{timeLeft} sn</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-400 font-mono">ZORLUK:</span>
          <span className="text-xs font-black text-orange-400">Seviye {level}</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Award className="w-3.5 h-3.5 text-yellow-500" />
            SKOR
          </div>
          <span className="text-xs font-black text-yellow-400">{score} Puan</span>
        </div>
      </div>

      <div className="relative min-h-[340px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-850 max-h-[380px] overflow-y-auto custom-scrollbar">
          {pairs.map((pair) => {
            const isFound = foundIds.includes(pair.id);
            const cellClass = isFound
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 line-through opacity-60'
              : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800 text-slate-200';
            return (
              <button
                key={pair.id}
                onClick={() => handlePairClick(pair)}
                disabled={!isStarted || isFound}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition active:scale-95 disabled:cursor-not-allowed select-none ${cellClass}`}
              >
                <div className="text-xs font-black tracking-wide font-mono">{pair.word1}</div>
                <div className="h-px w-8 bg-slate-800 my-1"></div>
                <div className="text-xs font-black tracking-wide font-mono">{pair.word2}</div>
              </button>
            );
          })}
        </div>

        {!isStarted && countdown === null && (
          <div className="absolute inset-0 bg-slate-950/95 rounded-2xl flex flex-col items-center justify-center space-y-4 backdrop-blur-sm border border-slate-850 p-6 text-center z-20">
            <h3 className="font-bold text-slate-200 text-sm md:text-base">
              {mode === 'words' ? 'Kelime Eşleştirme Egzersizi' : 'Sayı Eşleştirme Egzersizi'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Dikey olarak alt alta dizilmiş 24 çift listelenir. Bu çiftlerin tam yarısı tamamen aynı, yarısı ise birbirinden ufak farklarla başkadır. <strong>Sadece birbirinden farklı olan 6 çifti</strong> bulun.
            </p>
            <div className="text-[11px] text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-xl max-w-sm">
              ⚠️ Yanlış seçimde tur kaybedilir ve seri sıfırlanır. Hata yapmadan 3 başarılı tur seviyeyi yükseltir, 2 yanlış ise seviyeyi düşürür.
            </div>
            {timeLeft === 0 && (
              <div className="text-sm font-bold text-slate-200">
                Süre Bitti! Kazanılan Puan: <span className="text-yellow-400">{score}</span>
              </div>
            )}
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-slate-950 font-black rounded-xl text-sm transition active:scale-95 shadow-lg shadow-orange-500/20"
            >
              {timeLeft === 0 ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current animate-pulse" />}
              {timeLeft === 0 ? 'Yeniden Başlat' : 'Egzersizi Başlat'}
            </button>
          </div>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 bg-slate-950/98 rounded-2xl flex items-center justify-center z-50">
            <div className="text-7xl font-black text-orange-500 animate-ping font-mono">{countdown}</div>
          </div>
        )}
      </div>
    </div>
  );
};
