import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Eye } from 'lucide-react';
import { getStats, addWordsRead } from '../utils/statsHelper';
import { LEVEL_PASSAGES } from '../utils/wordPool';

interface RSVPEngineProps {
  onComplete?: (score?: number) => void;
  onStartActive?: () => void;
  level?: number;
}

export const RSVPEngine: React.FC<RSVPEngineProps> = ({ onComplete, onStartActive, level }) => {
  const [passageTitle, setPassageTitle] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [wpm, setWpm] = useState<number>(300);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Seviyeye göre WPM hızını ve okuma parçasını otomatik ata
  useEffect(() => {
    const activeLevel = level || getStats().currentLevel;
    const levelMap: Record<number, number> = {
      1: 200,
      2: 300,
      3: 450,
      4: 600,
      5: 800,
      6: 1000
    };
    setWpm(levelMap[activeLevel] || 300);

    const passages = LEVEL_PASSAGES[activeLevel] || LEVEL_PASSAGES[1];
    const selectedPassage = passages[Math.floor(Math.random() * passages.length)];
    setPassageTitle(selectedPassage.title);
    setText(selectedPassage.content);
  }, [level]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (text) {
      const cleanedWords = text.trim().split(/\s+/).filter(w => w.length > 0);
      setWords(cleanedWords);
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [text]);

  const getOrpIndex = (word: string): number => {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    if (len <= 13) return 3;
    return 4;
  };

  const splitWord = (word: string) => {
    if (!word) return { left: '', pivot: '', right: '' };
    const pivotIdx = getOrpIndex(word);
    return {
      left: word.substring(0, pivotIdx),
      pivot: word.charAt(pivotIdx),
      right: word.substring(pivotIdx + 1),
    };
  };

  const calculateDelay = useCallback((word: string): number => {
    const baseDelay = (60 * 1000) / wpm;
    let multiplier = 1.0;

    if (word.length > 8) {
      multiplier += 0.25;
    } else if (word.length < 4) {
      multiplier -= 0.15;
    }

    const lastChar = word.charAt(word.length - 1);
    if (['.', '?', '!'].includes(lastChar)) {
      multiplier += 0.6;
    } else if ([',', ';', ':'].includes(lastChar)) {
      multiplier += 0.3;
    }

    return baseDelay * multiplier;
  }, [wpm]);

  useEffect(() => {
    if (isPlaying && currentIndex < words.length) {
      const currentWord = words[currentIndex];
      const delay = calculateDelay(currentWord);

      timerRef.current = setTimeout(() => {
        setCurrentIndex(prev => {
          const next = prev + 1;
          if (next >= words.length) {
            setIsPlaying(false);
            addWordsRead(words.length);
            if (onComplete) {
              setTimeout(() => onComplete(wpm), 500);
            }
            return prev;
          }
          return next;
        });
      }, delay);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, words, calculateDelay, onComplete, wpm]);

  const togglePlay = () => {
    if (!isPlaying && currentIndex === 0) {
      if (onStartActive) onStartActive();
      setCountdown(3);
      
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            setCountdown(null);
            setIsPlaying(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setCountdown(null);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const currentWord = words[currentIndex] || '';
  const { left, pivot, right } = splitWord(currentWord);

  return (
    <div className={`transition-all duration-300 ${isFocusMode ? 'bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6' : 'p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md'}`}>
      <div className="max-w-2xl w-full mx-auto space-y-8">
        
        {!isFocusMode && (
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
              <Eye className="w-5 h-5 text-teal-400" />
              Okuma Motoru (RSVP)
            </h2>
            <button
              onClick={() => setIsFocusMode(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm transition"
            >
              <Eye className="w-4 h-4" />
              Odak Modu
            </button>
          </div>
        )}

        {isFocusMode && (
          <button
            onClick={() => setIsFocusMode(false)}
            className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 text-sm transition"
          >
            Odak Modundan Çık
          </button>
        )}

        {/* Bilgilendirme Rozeti */}
        <div className="flex justify-between items-center bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-850 text-xs font-mono">
          <span className="text-slate-400 truncate max-w-[70%]">Parça: {passageTitle}</span>
          <span className="text-teal-400 font-bold shrink-0">{wpm} Kelime/Dakika</span>
        </div>

        {/* RSVP Ekranı */}
        <div className="relative h-48 bg-slate-950/80 rounded-2xl border border-slate-800/60 flex items-center justify-center overflow-hidden">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-teal-500/80 rounded-full"></div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-teal-500/80 rounded-full"></div>

          {countdown !== null ? (
            <div className="text-6xl font-black text-teal-400 animate-ping font-mono">
              {countdown}
            </div>
          ) : words.length > 0 ? (
            <div className="text-4xl md:text-5xl font-mono font-medium flex w-full justify-center select-none">
              <span className="w-1/2 text-right text-slate-400 pr-0.5 break-all">
                {left}
              </span>
              <span className="text-teal-400 font-extrabold px-0.5">
                {pivot}
              </span>
              <span className="w-1/2 text-left text-slate-400 pl-0.5 break-all">
                {right}
              </span>
            </div>
          ) : (
            <span className="text-slate-600 text-sm font-sans">Lütfen bekleyin...</span>
          )}
        </div>

        {/* İlerleme Çubuğu */}
        {words.length > 0 && (
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full transition-all duration-150"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            ></div>
          </div>
        )}

        {/* İlerleme İstatistikleri */}
        <div className="flex justify-between text-xs text-slate-500 font-mono">
          <span>Kelime: {currentIndex + 1} / {words.length}</span>
          <span>Oran: {words.length > 0 ? Math.round(((currentIndex + 1) / words.length) * 100) : 0}%</span>
        </div>

        {/* Kontrol Butonları */}
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-xl text-sm transition"
          >
            <RotateCcw className="w-4 h-4" />
            Sıfırla
          </button>
          <button
            onClick={togglePlay}
            className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl text-sm transition shadow ${isPlaying ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-500/10' : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/10'}`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isPlaying ? 'Durdur' : 'Başlat'}
          </button>
        </div>

      </div>
    </div>
  );
};
