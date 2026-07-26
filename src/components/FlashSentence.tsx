import React, { useState, useEffect, useRef } from 'react';
import { Eye, Play, Check, AlertCircle, ChevronRight, Award } from 'lucide-react';
import { getStats, updateHighScore } from '../utils/statsHelper';
import { TURKISH_SENTENCES } from '../utils/wordPool';

interface FlashSentenceProps {
  onComplete?: (score?: number) => void;
  onStartActive?: () => void;
  level?: number;
}

export const FlashSentence: React.FC<FlashSentenceProps> = ({ onComplete, onStartActive, level: levelProp }) => {
  const [level, setLevel] = useState<number>(1);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [showSentence, setShowSentence] = useState<boolean>(false);
  const [isFlashed, setIsFlashed] = useState<boolean>(false);
  const [result, setResult] = useState<'correct' | 'wrong' | 'none'>('none');
  
  const [score, setScore] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stats = getStats();
    setLevel(levelProp || stats.currentLevel);
  }, [levelProp]);

  // Flaş Kalma Süresi (milisaniye) - Seviye arttıkça kısalır
  const getFlashDuration = () => {
    if (level === 1) return 1800;
    if (level === 2) return 1400;
    if (level === 3) return 1100;
    if (level === 4) return 800;
    if (level === 5) return 550;
    return 350; // Seviye 6
  };

  const startNextSentence = (idx: number) => {
    if (idx >= 5) {
      // 5 cümle bitti! Egzersizi tamamla
      setIsStarted(false);
      updateHighScore('flash_sentence', score); // Kaydet
      if (onComplete) {
        onComplete(score);
      }
      return;
    }

    setCurrentSentenceIndex(idx);
    setUserInput('');
    setResult('none');
    setIsFlashed(false);
    setShowSentence(false);

    // Cümle seçimi: Cümleleri karakter uzunluğuna göre sıralayıp adım indeksine (idx: 0-4) göre kademeli uzatıyoruz
    const sortedPool = [...(TURKISH_SENTENCES[level] || TURKISH_SENTENCES[1])].sort((a, b) => a.length - b.length);
    const slotSize = Math.max(1, Math.floor(sortedPool.length / 5));
    const startIdx = idx * slotSize;
    const endIdx = idx === 4 ? sortedPool.length : Math.min(sortedPool.length, (idx + 1) * slotSize);
    const subset = sortedPool.slice(startIdx, endIdx);
    const randomSent = subset[Math.floor(Math.random() * subset.length)] || sortedPool[0];
    setCurrentSentence(randomSent);

    // Geri sayımı başlat
    setCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setCountdown(null);
          // Flaşlamayı tetikle
          triggerFlash();
          return null;
        }
        return prev - 1;
      });
    }, 800);
  };

  const triggerFlash = () => {
    setShowSentence(true);
    const duration = getFlashDuration();

    timerRef.current = setTimeout(() => {
      setShowSentence(false);
      setIsFlashed(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }, duration);
  };

  const startGame = () => {
    if (onStartActive) onStartActive();
    setScore(0);
    setIsStarted(true);
    startNextSentence(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStarted || !isFlashed || result !== 'none') return;

    // Türkçe karakterleri toparlayıp kıyasla
    const cleanString = (str: string) => str.trim().toLowerCase()
      .replace(/[.,?!]/g, "")
      .replace(/\s+/g, " ");

    const isCorrect = cleanString(userInput) === cleanString(currentSentence);
    
    if (isCorrect) {
      setResult('correct');
      setScore(prev => prev + 25);
    } else {
      setResult('wrong');
      setScore(prev => Math.max(0, prev - 5));
    }
  };

  const handleNext = () => {
    startNextSentence(currentSentenceIndex + 1);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md max-w-xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent flex items-center gap-2">
          <Eye className="w-5 h-5 text-pink-400" />
          Flaş Cümle Egzersizi
        </h2>
        <span className="text-xs text-slate-500 font-mono">Görsel Cümle Belleği</span>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <ChevronRight className="w-3.5 h-3.5 text-pink-400" />
            CÜMLE ADIMI
          </div>
          <span className="text-xs font-black text-slate-200">{isStarted ? `${currentSentenceIndex + 1} / 5` : '0 / 5'}</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Award className="w-3.5 h-3.5 text-yellow-500" />
            SKOR
          </div>
          <span className="text-xs font-black text-pink-400">{score} Puan</span>
        </div>
      </div>

      {/* Oyun Alanı */}
      <div className="relative min-h-[220px] bg-slate-950/85 border border-slate-850 rounded-2xl flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        
        {!isStarted ? (
          <div className="space-y-4 max-w-md mx-auto z-10">
            <h3 className="font-bold text-slate-200 text-sm">Flaş Cümle Egzersizi</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ekranda anlık belirecek olan cümleyi dikkatle okuyun. Cümle kaybolduktan sonra aşağıdaki kutuya aynısını yazın. Toplam <strong>5 cümle</strong> sorulacaktır.
            </p>
            <div className="text-[10px] text-teal-400 bg-teal-500/5 border border-teal-500/10 p-2 rounded-lg">
              🎯 Seviyeniz: {level} (Cümle Görünüm Süresi: {getFlashDuration()} ms)
            </div>
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-500 text-slate-950 font-black rounded-xl text-sm transition active:scale-95 shadow-lg shadow-pink-500/20 mx-auto"
            >
              <Play className="w-4 h-4 fill-current animate-pulse" />
              Egzersizi Başlat
            </button>
          </div>
        ) : countdown !== null ? (
          <div className="text-5xl font-black text-pink-500 animate-ping font-mono">{countdown}</div>
        ) : showSentence ? (
          <div className="text-lg font-bold text-slate-100 px-4 py-2 border-b border-pink-500/30 max-w-md animate-fade-in">
            {currentSentence}
          </div>
        ) : isFlashed ? (
          <div className="w-full space-y-4 max-w-md mx-auto">
            {result === 'none' ? (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Gördüğünüz cümleyi yazın..."
                  className="flex-grow px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-pink-500 outline-none text-slate-250 text-sm transition"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-slate-950 font-bold rounded-xl text-xs transition active:scale-95"
                >
                  Onayla
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {result === 'correct' ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                    <Check className="w-4 h-4" />
                    Doğru Cevap! (+25 Puan)
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-rose-400 text-sm font-bold bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
                      <AlertCircle className="w-4 h-4" />
                      Hatalı Cevap! (-5 Puan)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Doğrusu: <span className="text-slate-300 font-semibold">{currentSentence}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleNext}
                  className="px-5 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl transition active:scale-95"
                >
                  {currentSentenceIndex === 4 ? 'Egzersizi Tamamla' : 'Sıradaki Cümle'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-slate-500 text-xs">Cümle yükleniyor...</div>
        )}

      </div>

    </div>
  );
};
