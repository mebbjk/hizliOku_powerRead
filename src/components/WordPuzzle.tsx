import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Play, RotateCcw, Clock, Award } from 'lucide-react';
import { getStats, updateHighScore } from '../utils/statsHelper';
import { TURKISH_WORDS } from '../utils/wordPool';

interface PlacedWord {
  word: string;
  coords: { r: number; c: number }[];
}

type GameMode = 'words' | 'numbers';

interface WordPuzzleProps {
  mode?: GameMode;
  onComplete?: (score?: number) => void;
  onStartActive?: () => void;
}

export const WordPuzzle: React.FC<WordPuzzleProps> = ({ mode = 'words', onComplete, onStartActive }) => {
  const [grid, setGrid] = useState<string[][]>([]);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [highScore, setHighScore] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gridSize = 10;
  const alphabet = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  const digitPool = '0123456789';

  const wordPool = TURKISH_WORDS.filter(w => w.length >= 5 && w.length <= 8);

  const generateNumberPool = (): string[] => {
    const pool: string[] = [];
    for (let i = 0; i < 20; i++) {
      let numStr = '';
      for (let j = 0; j < Math.floor(Math.random() * 4) + 4; j++) {
        numStr += Math.floor(Math.random() * 10);
      }
      pool.push(numStr);
    }
    return pool;
  };

  useEffect(() => {
    const stats = getStats();
    setHighScore(mode === 'words' ? stats.highScores.word_words : stats.highScores.word_numbers);
  }, [mode]);

  const generatePuzzle = () => {
    const newGrid: string[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
    const sourcePool = mode === 'words' ? wordPool : generateNumberPool();
    const fillPool = mode === 'words' ? alphabet : digitPool;

    // Önceki kelimeleri havuzdan çıkararak her seferinde tamamen farklı kelimeler gelmesini sağla
    const availablePool = sourcePool.filter(w => !targetWords.includes(w));
    const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);
    setTargetWords(selected);

    const placed: PlacedWord[] = [];

    selected.forEach(word => {
      let isPlaced = false;
      let attempts = 0;

      while (!isPlaced && attempts < 100) {
        attempts++;
        const dir = Math.random() > 0.5 ? 'H' : 'V'; // Yatay veya Dikey
        const startR = Math.floor(Math.random() * gridSize);
        const startC = Math.floor(Math.random() * gridSize);

        if (dir === 'H' && startC + word.length <= gridSize) {
          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            if (newGrid[startR][startC + i] !== '' && newGrid[startR][startC + i] !== word[i]) {
              canPlace = false;
              break;
            }
          }

          if (canPlace) {
            const coords = [];
            for (let i = 0; i < word.length; i++) {
              newGrid[startR][startC + i] = word[i];
              coords.push({ r: startR, c: startC + i });
            }
            placed.push({ word, coords });
            isPlaced = true;
          }
        } else if (dir === 'V' && startR + word.length <= gridSize) {
          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            if (newGrid[startR + i][startC] !== '' && newGrid[startR + i][startC] !== word[i]) {
              canPlace = false;
              break;
            }
          }

          if (canPlace) {
            const coords = [];
            for (let i = 0; i < word.length; i++) {
              newGrid[startR + i][startC] = word[i];
              coords.push({ r: startR + i, c: startC });
            }
            placed.push({ word, coords });
            isPlaced = true;
          }
        }
      }
    });

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (newGrid[r][c] === '') {
          newGrid[r][c] = fillPool[Math.floor(Math.random() * fillPool.length)];
        }
      }
    }

    setGrid(newGrid);
    setPlacedWords(placed);
    setFoundWords([]);
  };

  const startGame = () => {
    if (onStartActive) onStartActive();
    setCountdown(3);
    setScore(0);
    setTimeLeft(60);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setCountdown(null);
          
          setIsStarted(true);
          generatePuzzle();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsStarted(false);
            if (timerRef.current) clearInterval(timerRef.current);
            updateHighScore(mode === 'words' ? 'word_words' : 'word_numbers', score);
            const stats = getStats();
            setHighScore(mode === 'words' ? stats.highScores.word_words : stats.highScores.word_numbers);
            
            // Tamamlanma tetikle
            if (onComplete) {
              setTimeout(() => onComplete(score), 1000);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, score, onComplete]);

  const handleCellClick = (r: number, c: number) => {
    if (!isStarted || timeLeft === 0) return;

    const matchingPlaced = placedWords.find(placed => 
      placed.coords.some(coord => coord.r === r && coord.c === c)
    );

    if (matchingPlaced && !foundWords.includes(matchingPlaced.word)) {
      const newFound = [...foundWords, matchingPlaced.word];
      setFoundWords(newFound);
      setScore(prev => prev + 25);

      if (newFound.length === targetWords.length) {
        setScore(prev => prev + 50);
        setTimeout(() => {
          generatePuzzle();
        }, 300);
      }
    }
  };

  const isCellInFoundWord = (r: number, c: number) => {
    return placedWords.some(placed => 
      foundWords.includes(placed.word) && placed.coords.some(coord => coord.r === r && coord.c === c)
    );
  };

  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md max-w-xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          {mode === 'words' ? 'Kelime Bulmaca' : 'Sayı Bulmaca'}
        </h2>
        <span className="text-xs text-slate-500 font-mono">Görsel Alan Genişliği</span>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Clock className="w-4 h-4 text-blue-400" />
            SÜRE
          </div>
          <span className="text-sm font-black text-slate-200">{timeLeft} sn</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Award className="w-4 h-4 text-yellow-500" />
            EN YÜKSEK
          </div>
          <span className="text-sm font-black text-yellow-400">{highScore} Puan</span>
        </div>
      </div>

      {/* Hedef Bilgisi */}
      {isStarted && (
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850 space-y-2">
          <div className="text-xs text-slate-500">BULUNACAK HEDEFLER ({foundWords.length}/{targetWords.length})</div>
          <div className="flex flex-wrap gap-2">
            {targetWords.map((word, idx) => {
              const isFound = foundWords.includes(word);
              return (
                <span 
                  key={idx} 
                  className={`text-xs font-black px-3 py-1 rounded-xl border transition-all ${
                    isFound 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-450 line-through opacity-60' 
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Izgara (10x10 Grid) */}
      <div className="relative">
        <div className="grid grid-cols-10 gap-1 aspect-square bg-slate-950/80 p-3 rounded-2xl border border-slate-850">
          {grid.map((row, rIdx) =>
            row.map((char, cIdx) => {
              const isFound = isCellInFoundWord(rIdx, cIdx);
              const cellClass = isFound
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800/80 text-slate-400 hover:text-slate-200';

              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  disabled={!isStarted}
                  className={`flex items-center justify-center font-mono font-bold text-xs md:text-sm rounded-lg border transition active:scale-95 disabled:cursor-not-allowed select-none ${cellClass}`}
                >
                  {isStarted ? char : '?'}
                </button>
              );
            })
          )}
        </div>

        {/* Başlama/Bitme Örtüsü */}
        {!isStarted && countdown === null && (
          <div className="absolute inset-0 bg-slate-950/90 rounded-2xl flex flex-col items-center justify-center space-y-4 backdrop-blur-sm border border-slate-850 p-6 text-center">
            <p className="text-sm text-slate-400 max-w-xs">
              Yukarıda verilen {mode === 'words' ? 'kelimelerin' : 'sayıların'} ilk veya herhangi bir harfine/rakamına 10x10 ızgarada tıklayarak tek seferde bulun!
            </p>
            {timeLeft === 0 && (
              <div className="text-lg font-bold text-slate-200">
                Süre Bitti! Kazanılan Puan: <span className="text-yellow-400">{score}</span>
              </div>
            )}
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-slate-950 font-black rounded-xl text-sm transition active:scale-95 shadow-lg shadow-blue-500/20"
            >
              {timeLeft === 0 ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current animate-pulse" />}
              {timeLeft === 0 ? 'Yeniden Başlat' : 'Egzersizi Başlat'}
            </button>
          </div>
        )}

        {/* Geri Sayım Örtüsü */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-slate-950/98 rounded-2xl flex items-center justify-center z-50">
            <div className="text-7xl font-black text-blue-450 animate-ping font-mono">{countdown}</div>
          </div>
        )}
      </div>
    </div>
  );
};
