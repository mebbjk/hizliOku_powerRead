import React, { useState, useEffect, useRef } from 'react';
import { Play, Target } from 'lucide-react';
import { getStats } from '../utils/statsHelper';

interface SchulteTableProps {
  onComplete?: (score?: number) => void;
  onStartActive?: () => void;
  level?: number;
}

export const SchulteTable: React.FC<SchulteTableProps> = ({ onComplete, onStartActive, level }) => {
  const [gridSize, setGridSize] = useState<number>(3);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [nextNumber, setNextNumber] = useState<number>(1);
  
  const [time, setTime] = useState<number>(0);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [feedbackCell, setFeedbackCell] = useState<{ index: number; type: 'correct' | 'wrong' } | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalCells = gridSize * gridSize;

  // Seviyeye göre ızgara boyutunu otomatik ata
  useEffect(() => {
    const activeLevel = level || getStats().currentLevel;
    if (activeLevel <= 2) {
      setGridSize(3); // 3x3
    } else if (activeLevel <= 4) {
      setGridSize(4); // 4x4
    } else {
      setGridSize(5); // 5x5
    }
  }, [level]);

  const shuffleNumbers = () => {
    const arr = Array.from({ length: totalCells }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setNumbers(arr);
  };

  const startGame = () => {
    if (onStartActive) onStartActive();
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          setCountdown(null);
          
          shuffleNumbers();
          setNextNumber(1);
          setTime(0);
          setIsStarted(true);
          setFeedbackCell(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (isStarted) {
      timerRef.current = setInterval(() => {
        setTime(prev => prev + 0.1);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted]);

  const handleCellClick = (num: number, index: number) => {
    if (!isStarted) return;

    if (num === nextNumber) {
      setFeedbackCell({ index, type: 'correct' });
      
      if (nextNumber === totalCells) {
        setIsStarted(false);
        const finalTime = parseFloat(time.toFixed(1));
        if (bestTime === null || finalTime < bestTime) {
          setBestTime(finalTime);
        }
        // Egzersiz bitiminde bir sonraki adıma geçiş için onComplete çağır
        if (onComplete) {
          setTimeout(() => onComplete(finalTime), 1000);
        }
      } else {
        setNextNumber(prev => prev + 1);
      }
    } else {
      setFeedbackCell({ index, type: 'wrong' });
    }
  };

  const getGridColsClass = () => {
    if (gridSize === 3) return 'grid-cols-3';
    if (gridSize === 4) return 'grid-cols-4';
    return 'grid-cols-5';
  };

  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md max-w-xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          Akıllı Schulte Tablosu
        </h2>
        <span className="text-xs text-slate-500 font-mono">Çevre Görüş Egzersizi</span>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-400 font-mono">IZGARA:</span>
          <span className="text-xs font-black text-purple-400">{gridSize}x{gridSize}</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-400 font-mono">SÜRE:</span>
          <span className="text-xs font-black text-slate-200">{time.toFixed(1)} sn</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-400 font-mono">SIRA:</span>
          <span className="text-xs font-black text-teal-400">{nextNumber}</span>
        </div>
      </div>

      {/* Schulte Izgarası */}
      <div className="relative">
        <div className={`grid ${getGridColsClass()} gap-2 aspect-square bg-slate-950/60 p-3 rounded-2xl border border-slate-850`}>
          {numbers.map((num, index) => {
            const isFeedback = feedbackCell?.index === index;
            const isCorrect = isFeedback && feedbackCell?.type === 'correct';
            const isWrong = isFeedback && feedbackCell?.type === 'wrong';

            const cellClass = isCorrect
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              : isWrong
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-shake'
              : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-slate-100';

            return (
              <button
                key={index}
                onClick={() => handleCellClick(num, index)}
                disabled={!isStarted}
                className={`flex items-center justify-center font-mono font-bold text-lg md:text-xl rounded-xl border transition active:scale-95 disabled:cursor-not-allowed select-none ${cellClass}`}
              >
                {isStarted ? num : '?'}
              </button>
            );
          })}
        </div>

        {/* Başlama Örtüsü */}
        {!isStarted && (
          <div className="absolute inset-0 bg-slate-950/95 rounded-2xl flex flex-col items-center justify-center space-y-4 backdrop-blur-sm border border-slate-850 p-6 text-center">
            <p className="text-xs text-slate-400 max-w-xs">
              Merkezdeki odak noktasına bakarak gözlerinizi oynatmadan 1'den {totalCells}'e kadar sayıları sırayla bulun. Çevre görüşünüzü geliştirir.
            </p>
            {bestTime !== null && (
              <div className="text-sm font-bold text-slate-200">
                Tamamlama Süresi: <span className="text-purple-400">{time.toFixed(1)} sn</span> (En İyi: {bestTime} sn)
              </div>
            )}
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-slate-950 font-black rounded-xl text-sm transition active:scale-95 shadow-lg shadow-purple-500/20"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              Egzersizi Başlat
            </button>
          </div>
        )}

        {/* Geri Sayım Örtüsü */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-slate-950/98 rounded-2xl flex items-center justify-center z-50">
            <div className="text-7xl font-black text-purple-450 animate-ping font-mono">{countdown}</div>
          </div>
        )}
      </div>

    </div>
  );
};
