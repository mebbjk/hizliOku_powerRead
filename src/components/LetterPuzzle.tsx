import React, { useState, useEffect, useRef } from 'react';
import { Target, Play, RotateCcw, Clock, Award } from 'lucide-react';
import { getStats, updateHighScore } from '../utils/statsHelper';

const turkishToLower = (str: string): string => {
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase();
};

const turkishToUpper = (str: string): string => {
  return str
    .replace(/i/g, 'İ')
    .replace(/ı/g, 'I')
    .toUpperCase();
};

type GameMode = 'letters' | 'numbers';

interface LetterPuzzleProps {
  mode?: GameMode;
  onComplete?: (score?: number) => void;
  onStartActive?: () => void;
}

export const LetterPuzzle: React.FC<LetterPuzzleProps> = ({ mode = 'letters', onComplete, onStartActive }) => {
  const [targets, setTargets] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[]>([]);
  const [foundIndices, setFoundIndices] = useState<number[]>([]);
  const [wrongIndices, setWrongIndices] = useState<number[]>([]);
  const [round, setRound] = useState<number>(1);
  
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [highScore, setHighScore] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gridSize = 10; // 10x10 Izgara
  const totalCells = gridSize * gridSize;
  const alphabet = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  const digitPool = '0123456789';

  useEffect(() => {
    const stats = getStats();
    setHighScore(mode === 'letters' ? stats.highScores.letter_letters : stats.highScores.letter_numbers);
  }, [mode]);

  const generateNewPuzzle = (keepTargets = false) => {
    const pool = mode === 'letters' ? alphabet : digitPool;
    
    let activeTargets = targets;
    let nextRound = round;
    
    if (!keepTargets) {
      // Yeni hedefler seç (tümü büyük harf saklanır, render ve grid esnasında cased olur)
      let t1 = pool[Math.floor(Math.random() * pool.length)];
      let t2 = pool[Math.floor(Math.random() * pool.length)];
      while (t1 === t2) {
        t2 = pool[Math.floor(Math.random() * pool.length)];
      }
      activeTargets = [t1, t2];
      setTargets(activeTargets);
      nextRound = 1;
      setRound(1);
    } else {
      nextRound = round + 1;
      setRound(nextRound);
    }

    const newGrid: string[] = [];
    const t1 = activeTargets[0];
    const t2 = activeTargets[1];

    for (let i = 0; i < totalCells; i++) {
      const rand = Math.random();
      let char = '';
      if (rand < 0.12) {
        char = t1;
      } else if (rand < 0.24) {
        char = t2;
      } else {
        let otherChar = pool[Math.floor(Math.random() * pool.length)];
        while (otherChar === t1 || otherChar === t2) {
          otherChar = pool[Math.floor(Math.random() * pool.length)];
        }
        char = otherChar;
      }

      // Harf modunda seviye/tura göre büyüklük-küçüklük ayarla
      if (mode === 'letters') {
        if (nextRound === 1) {
          char = turkishToLower(char);
        } else if (nextRound === 2) {
          char = turkishToUpper(char);
        } else {
          // Tur 3 ve sonrası: Küçük-Büyük karışık
          char = Math.random() > 0.5 ? turkishToLower(char) : turkishToUpper(char);
        }
      }
      newGrid.push(char);
    }

    // Gridde hedeflerin en az bir kez geçtiğini garanti et
    const getCasedChar = (baseChar: string, r: number) => {
      if (mode !== 'letters') return baseChar;
      if (r === 1) return turkishToLower(baseChar);
      if (r === 2) return turkishToUpper(baseChar);
      return Math.random() > 0.5 ? turkishToLower(baseChar) : turkishToUpper(baseChar);
    };

    const hasTarget1 = newGrid.some(c => turkishToUpper(c) === turkishToUpper(t1));
    const hasTarget2 = newGrid.some(c => turkishToUpper(c) === turkishToUpper(t2));

    if (!hasTarget1) {
      newGrid[Math.floor(Math.random() * totalCells)] = getCasedChar(t1, nextRound);
    }
    if (!hasTarget2) {
      let idx = Math.floor(Math.random() * totalCells);
      while (turkishToUpper(newGrid[idx]) === turkishToUpper(t1)) {
        idx = Math.floor(Math.random() * totalCells);
      }
      newGrid[idx] = getCasedChar(t2, nextRound);
    }

    setGrid(newGrid);
    setFoundIndices([]);
    setWrongIndices([]);
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
          generateNewPuzzle(false);
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
            updateHighScore(mode === 'letters' ? 'letter_letters' : 'letter_numbers', score);
            const stats = getStats();
            setHighScore(mode === 'letters' ? stats.highScores.letter_letters : stats.highScores.letter_numbers);
            
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

  // Grid içindeki toplam eşleşen hedefleri hesapla (Büyük/Küçük harf duyarsız)
  const totalTargetsInGrid = grid.filter(char => 
    targets.some(t => turkishToUpper(t) === turkishToUpper(char))
  ).length;

  const remainingTargets = totalTargetsInGrid - foundIndices.length;

  const handleCellClick = (char: string, index: number) => {
    if (!isStarted || timeLeft === 0 || foundIndices.includes(index)) return;

    // Eşleşmeyi büyük/küçük harf duyarsız kontrol et
    const isTarget = targets.some(t => turkishToUpper(t) === turkishToUpper(char));

    if (isTarget) {
      const newFound = [...foundIndices, index];
      setFoundIndices(newFound);
      setScore(prev => prev + 5);

      if (newFound.length === totalTargetsInGrid) {
        setScore(prev => prev + 35);
        setTimeout(() => {
          // Sayfa temizlendiğinde aynı hedefleri koru (keepTargets = true)
          generateNewPuzzle(true);
        }, 200);
      }
    } else {
      if (!wrongIndices.includes(index)) {
        setWrongIndices(prev => [...prev, index]);
        setScore(prev => Math.max(0, prev - 2));
        setTimeout(() => {
          setWrongIndices(prev => prev.filter(i => i !== index));
        }, 500);
      }
    }
  };

  const getTargetLabel = (t: string) => {
    if (mode !== 'letters') return t;
    if (round === 1) return turkishToLower(t);
    if (round === 2) return turkishToUpper(t);
    return `${turkishToLower(t)} / ${turkishToUpper(t)}`;
  };

  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md max-w-xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-400" />
          {mode === 'letters' ? 'Harf Bulmaca' : 'Rakam Bulmaca'}
        </h2>
        <span className="text-xs text-slate-500 font-mono">Görsel Odaklama Hızı</span>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Clock className="w-4 h-4 text-emerald-400" />
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
        <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">
              BULUNACAK {mode === 'letters' ? 'HARFLER' : 'RAKAMLAR'} 
              {mode === 'letters' && ` (Tur ${round})`}
            </div>
            <div className="flex gap-2">
              {targets.map((t, idx) => (
                <span key={idx} className="text-xl font-black text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-xl border border-emerald-500/20 font-mono">
                  {getTargetLabel(t)}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right font-mono space-y-0.5">
            <div className="text-xs text-slate-500">KALAN / SKOR</div>
            <div className="text-sm font-bold text-slate-200">
              <span className="text-emerald-400">{remainingTargets}</span> Kalan | <span className="text-yellow-400">{score}</span> Puan
            </div>
          </div>
        </div>
      )}

      {/* Harf/Sayı Izgarası (10x10 Grid) */}
      <div className="relative">
        <div className="grid grid-cols-10 gap-1 aspect-square bg-slate-950/80 p-3 rounded-2xl border border-slate-850">
          {grid.map((char, index) => {
            const isFound = foundIndices.includes(index);
            const isWrong = wrongIndices.includes(index);

            const cellClass = isFound
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              : isWrong
              ? 'bg-rose-500/25 border-rose-500 text-rose-300 animate-shake'
              : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800/80 text-slate-400 hover:text-slate-200';

            return (
              <button
                key={index}
                onClick={() => handleCellClick(char, index)}
                disabled={!isStarted}
                className={`flex items-center justify-center font-mono font-bold text-xs md:text-sm rounded-lg border transition-all duration-105 select-none active:scale-95 disabled:cursor-not-allowed ${cellClass}`}
              >
                {isStarted ? char : '?'}
              </button>
            );
          })}
        </div>

        {/* Başlama/Bitme Örtüsü */}
        {!isStarted && (
          <div className="absolute inset-0 bg-slate-950/90 rounded-2xl flex flex-col items-center justify-center space-y-4 backdrop-blur-sm border border-slate-850 p-6 text-center">
            <p className="text-sm text-slate-400 max-w-xs">
              Genişletilmiş 10x10 ızgarada 60 saniye içinde hedef {mode === 'letters' ? 'harflerin' : 'sayıların'} hepsini bulun. Ne kadar hızlı bulursanız o kadar çok puan!
            </p>
            {timeLeft === 0 && (
              <div className="text-lg font-bold text-slate-200">
                Süre Bitti! Kazanılan Puan: <span className="text-yellow-400">{score}</span>
              </div>
            )}
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-sm transition active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              {timeLeft === 0 ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current animate-pulse" />}
              {timeLeft === 0 ? 'Yeniden Başlat' : 'Egzersizi Başlat'}
            </button>
          </div>
        )}

        {/* Geri Sayım Örtüsü */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-slate-950/98 rounded-2xl flex items-center justify-center z-50">
            <div className="text-7xl font-black text-emerald-450 animate-ping font-mono">{countdown}</div>
          </div>
        )}
      </div>
    </div>
  );
};
