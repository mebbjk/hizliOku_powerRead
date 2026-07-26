import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Play, CheckCircle, RotateCcw, Clock } from 'lucide-react';
import { getStats, saveWpm } from '../utils/statsHelper';
import { INITIAL_TEST_PASSAGE, LEVEL_PASSAGES, type ReadingPassage } from '../utils/wordPool';

interface SpeedTestProps {
  onComplete?: (score?: number) => void;
  onStartActive?: () => void;
}

export const SpeedTest: React.FC<SpeedTestProps> = ({ onComplete, onStartActive }) => {
  const [level, setLevel] = useState<number>(1);
  const [hasDoneInitial, setHasDoneInitial] = useState<boolean>(false);
  const [availablePassages, setAvailablePassages] = useState<ReadingPassage[]>([]);
  const [selectedPassageIdx, setSelectedPassageIdx] = useState<number>(0);
  
  const [isReading, setIsReading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [wpmResult, setWpmResult] = useState<number | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stats = getStats();
    setLevel(stats.currentLevel);
    setHasDoneInitial(stats.hasDoneInitialTest);

    if (!stats.hasDoneInitialTest) {
      setAvailablePassages([INITIAL_TEST_PASSAGE]);
      setSelectedPassageIdx(0);
    } else {
      const passages = LEVEL_PASSAGES[stats.currentLevel] || LEVEL_PASSAGES[1];
      setAvailablePassages(passages);
      setSelectedPassageIdx(0);
    }
  }, []);

  const getActiveText = () => {
    if (availablePassages.length === 0) return '';
    return availablePassages[selectedPassageIdx].content;
  };

  const getWordCount = () => {
    if (availablePassages.length === 0) return 0;
    return availablePassages[selectedPassageIdx].wordCount;
  };

  const handleStart = () => {
    if (onStartActive) onStartActive();
    setCountdown(3);
    setTimeElapsed(0);
    setWpmResult(null);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setCountdown(null);
          setIsReading(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFinish = () => {
    setIsReading(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const wordCount = getWordCount();
    if (wordCount === 0 || timeElapsed === 0) return;

    const calculatedWpm = Math.round((wordCount / timeElapsed) * 60);
    setWpmResult(calculatedWpm);
    saveWpm(calculatedWpm);
  };

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isReading) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isReading]);

  const handleReset = () => {
    setIsReading(false);
    setTimeElapsed(0);
    setWpmResult(null);
  };

  const getSpeedFeedback = (wpm: number) => {
    if (wpm < 200) return { label: "Seviye 1: Başlangıç Hızı", color: "text-rose-400" };
    if (wpm < 350) return { label: "Seviye 2: Gelişen Hız", color: "text-amber-400" };
    if (wpm < 500) return { label: "Seviye 3: Ortalama Hız", color: "text-blue-400" };
    if (wpm < 700) return { label: "Seviye 4: Orta-İleri Hız", color: "text-teal-400" };
    if (wpm < 900) return { label: "Seviye 5: İleri Hız", color: "text-indigo-400" };
    return { label: "Seviye 6: Seçkin Hız (Uzman)", color: "text-emerald-400" };
  };

  return (
    <div className="relative p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md max-w-2xl mx-auto space-y-6 overflow-hidden">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-400" />
          {hasDoneInitial ? `Seviye Yenileme Hız Testi (Seviye ${level})` : 'İlk Seviye Tespit Sınavı'}
        </h2>
        <span className="text-xs text-slate-500 font-mono">Okuma Hızı Ölçümü</span>
      </div>

      {!isReading && wpmResult === null && countdown === null && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {hasDoneInitial ? 'Seviyenize Ait Okuma Parçası Seçin' : 'Sabit Okuma Parçası'}
            </label>
            <div className="flex gap-2">
              {availablePassages.map((pass, idx) => (
                <button
                  key={pass.id}
                  onClick={() => setSelectedPassageIdx(idx)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${selectedPassageIdx === idx ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200'}`}
                >
                  {pass.title} ({pass.wordCount} Kelime)
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isReading && (
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-850 text-slate-200 text-lg leading-relaxed text-justify select-none font-sans max-h-96 overflow-y-auto custom-scrollbar">
          <h3 className="text-md font-bold mb-3 text-teal-400 border-b border-slate-800 pb-2">
            {availablePassages[selectedPassageIdx]?.title}
          </h3>
          {getActiveText()}
        </div>
      )}

      {countdown === null && (
        <div className="flex items-center justify-between">
          {isReading ? (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-base transition active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle className="w-5 h-5 fill-current" />
              Okumayı Bitirdim
            </button>
          ) : wpmResult === null ? (
            <button
              onClick={handleStart}
              disabled={availablePassages.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-base transition active:scale-95 shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-current" />
              Okumaya Başla
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl text-sm transition font-bold"
              >
                <RotateCcw className="w-4 h-4 text-orange-450" />
                Yeniden Test Et
              </button>
              {onComplete && (
                <button
                  onClick={() => onComplete(wpmResult)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-sm transition shadow-lg shadow-teal-500/10"
                >
                  Sonucu Kaydet ve Devam Et
                </button>
              )}
            </div>
          )}

          {isReading && (
            <div className="flex items-center gap-2 text-slate-400 font-mono text-lg bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-850">
              <Clock className="w-5 h-5 text-teal-400 animate-pulse" />
              <span>{timeElapsed} sn</span>
            </div>
          )}
        </div>
      )}

      {wpmResult !== null && countdown === null && (
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-850 text-center space-y-4">
          <div className="text-xs text-slate-500 font-mono uppercase tracking-widest">Test Sonuçlarınız</div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-500">Kelime Sayısı</div>
              <div className="text-xl font-black text-slate-200 mt-1">{getWordCount()}</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-500">Süre</div>
              <div className="text-xl font-black text-slate-200 mt-1">{timeElapsed} sn</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-500">Okuma Hızı (Kelime/Dakika)</div>
              <div className="text-xl font-black text-teal-400 mt-1">{wpmResult}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <span className="text-xs text-slate-500 font-mono">YENİ HIZ KADEMESİ: </span>
            <span className={`font-bold ${getSpeedFeedback(wpmResult).color}`}>{getSpeedFeedback(wpmResult).label}</span>
          </div>
        </div>
      )}

      {countdown !== null && (
        <div className="absolute inset-0 bg-slate-950/98 rounded-3xl flex items-center justify-center z-50">
          <div className="text-7xl font-black text-teal-400 animate-ping font-mono">{countdown}</div>
        </div>
      )}
    </div>
  );
};
