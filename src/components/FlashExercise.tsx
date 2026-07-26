import React, { useState, useEffect, useRef } from 'react';
import { Eye, Play, Clock, Award, Check, AlertCircle } from 'lucide-react';
import { getStats, updateHighScore } from '../utils/statsHelper';
import { TURKISH_WORDS } from '../utils/wordPool';

interface FlashExerciseProps {
  onComplete?: (score?: number) => void;
  onStartActive?: () => void;
  isScored?: boolean;
  level?: number;
}

export const FlashExercise: React.FC<FlashExerciseProps> = ({ onComplete, onStartActive, isScored = true, level }) => {
  const [length, setLength] = useState<number>(isScored ? 3 : 4);
  const [duration, setDuration] = useState<number>(isScored ? 250 : 350);
  
  const [currentValue, setCurrentValue] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [isFlashed, setIsFlashed] = useState<boolean>(false);
  const [showValue, setShowValue] = useState<boolean>(false);
  const [result, setResult] = useState<'correct' | 'wrong' | 'none'>('none');
  
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const gameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stats = getStats();
    setHighScore(stats.highScores.flash);
  }, []);

  const generateNewValue = () => {
    const wordLen = Math.min(8, Math.max(3, length));
    const subset = TURKISH_WORDS.filter(w => w.length === wordLen);
    const pool = subset.length > 0 ? subset : TURKISH_WORDS;
    const word = pool[Math.floor(Math.random() * pool.length)] || 'BİLGİ';
    setCurrentValue(word);
    setUserInput('');
    setIsFlashed(false);
    setShowValue(false);
    setResult('none');
  };

  const startCountdown = () => {
    if (onStartActive) onStartActive();
    const activeLevel = level || getStats().currentLevel;
    
    // Seviyeye göre başlangıç uzunluğu ve süresi (Seviye arttıkça kelimeler uzar, ekranda kalma süresi kısalır)
    const startLen = isScored ? Math.min(8, 2 + activeLevel) : Math.min(8, 3 + activeLevel);
    const startDur = isScored ? Math.max(120, 320 - (activeLevel * 35)) : Math.max(150, 420 - (activeLevel * 35));

    setCountdown(3);
    setScore(0);
    setTimeLeft(60);
    setLength(startLen);
    setDuration(startDur);
    setCorrectCount(0);
    setCurrentValue('');
    setUserInput('');
    setIsFlashed(false);
    setShowValue(false);
    setResult('none');

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setCountdown(null);
          setIsStarted(true);
          setTimeout(() => generateNewValue(), 50);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Sadece unmount durumunda tüm zamanlayıcıları temizle
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isStarted && timeLeft > 0) {
      gameIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsStarted(false);
            clearInterval(gameIntervalRef.current!);
            if (isScored) {
              updateHighScore('flash', score);
              setHighScore(getStats().highScores.flash);
            }
            if (onComplete) {
              setTimeout(() => onComplete(isScored ? score : 100), 1000);
            }
            return 0;
          }
          if (!isScored && prev % 10 === 0) {
            setLength(l => Math.min(8, l + 1));
            setDuration(d => Math.max(150, d - 40));
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
    };
  }, [isStarted, score, onComplete, isScored]);

  useEffect(() => {
    if (currentValue && !isFlashed && isStarted) {
      setShowValue(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShowValue(false);
        setIsFlashed(true);
        if (!isScored) {
          timeoutRef.current = setTimeout(() => {
            generateNewValue();
          }, 500);
        } else {
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }, duration);
    }
  }, [currentValue, isFlashed, duration, isStarted, isScored]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStarted || !isFlashed || result !== 'none') return;

    const isCorrect = userInput.trim().toUpperCase() === currentValue.toUpperCase();
    if (isCorrect) {
      setResult('correct');
      setScore(prev => prev + 15);
      const nextCount = correctCount + 1;
      setCorrectCount(nextCount);
      if (nextCount % 3 === 0) {
        setLength(prev => Math.min(8, prev + 1));
        setDuration(prev => Math.max(120, prev - 30));
      }
      setTimeout(() => generateNewValue(), 800);
    } else {
      setResult('wrong');
      setScore(prev => Math.max(0, prev - 5));
      setTimeout(() => generateNewValue(), 1200);
    }
  };

  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md max-w-xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent flex items-center gap-2">
          <Eye className="w-5 h-5 text-pink-400" />
          {isScored ? 'Anlık Flaş Egzersizi' : 'Flaş Kelime (Puansız)'}
        </h2>
        <span className="text-xs text-slate-500 font-mono">Görsel Hafıza Hızı</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Clock className="w-4 h-4 text-pink-400" />
            SÜRE
          </div>
          <span className="text-sm font-black text-slate-200">{timeLeft} sn</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Award className="w-4 h-4 text-yellow-500" />
            {isScored ? 'EN YÜKSEK' : 'MOD'}
          </div>
          <span className="text-sm font-black text-yellow-400">
            {isScored ? `${highScore} Puan` : 'Göz Takibi'}
          </span>
        </div>
      </div>

      <div className="relative h-44 bg-slate-950/80 rounded-2xl border border-slate-850 flex flex-col items-center justify-center overflow-hidden">
        {countdown !== null ? (
          <div className="text-6xl font-black text-pink-500 animate-ping font-mono">
            {countdown}
          </div>
        ) : isStarted ? (
          showValue ? (
            <div className="text-4xl md:text-5xl font-black tracking-widest text-slate-200 font-mono uppercase">
              {currentValue}
            </div>
          ) : (
            <div className="text-slate-600 text-xs font-mono tracking-widest">
              {isScored ? 'GÖRDÜĞÜNÜZÜ ALTA YAZIN VE ENTER\'A BASIN' : 'KONSANTRE OLUN...'}
            </div>
          )
        ) : (
          <div className="text-slate-500 text-xs text-center px-6 leading-relaxed">
            {isScored 
              ? 'Ekranda anlık görünüp kaybolacak olan karakterleri görerek hafızanızda tutmaya çalışın.'
              : 'Ekranda hızlıca yanıp sönen kelimeleri sadece gözlerinizle okumaya odaklanın. Yazma yapılmaz.'
            }
          </div>
        )}
      </div>

      {isScored && isStarted && countdown === null && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={showValue || result !== 'none'}
              placeholder={showValue ? 'Lütfen bekleyin...' : 'Hafızanızdaki değeri yazın...'}
              className={`w-full px-5 py-4 bg-slate-950/80 border text-center font-black tracking-widest text-xl rounded-2xl outline-none transition uppercase ${
                result === 'correct'
                  ? 'border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                  : result === 'wrong'
                  ? 'border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10 animate-shake'
                  : 'border-slate-800 focus:border-pink-500/50 text-slate-200'
              }`}
              autoComplete="off"
              autoFocus
            />
            {result === 'correct' && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400">
                <Check className="w-6 h-6" />
              </div>
            )}
            {result === 'wrong' && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-1">
            <span>KARAKTER UZUNLUĞU: <strong className="text-slate-400">{length} hane</strong></span>
            <span>GÖSTERİM SÜRESİ: <strong className="text-slate-400">{duration} ms</strong></span>
          </div>
        </form>
      )}

      {!isScored && isStarted && countdown === null && (
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-1">
          <span>KELİME UZUNLUĞU: <strong className="text-slate-400">{length} harf</strong></span>
          <span>GÖSTERİM SÜRESİ: <strong className="text-slate-400">{duration} ms</strong></span>
        </div>
      )}

      {!isStarted && countdown === null && (
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          {timeLeft === 0 && (
            <div className="text-sm font-bold text-slate-200">
              Egzersiz Tamamlandı! {isScored && `Puanınız: ${score}`}
            </div>
          )}
          <button
            onClick={startCountdown}
            className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-500 text-slate-950 font-black rounded-xl text-sm transition active:scale-95 shadow-lg shadow-pink-500/20"
          >
            <Play className="w-4 h-4 fill-current" />
            {timeLeft === 0 ? 'Yeniden Başlat' : 'Egzersizi Başlat'}
          </button>
        </div>
      )}

    </div>
  );
};
