import React from 'react';
import { X, TrendingUp, Flame, Star, Eye } from 'lucide-react';
import { type UserStats } from '../utils/statsHelper';
import { Avatar } from './Avatar';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
  profileName: string;
  profileAvatar: string;
  email: string;
}

const getLevelTitle = (lvl: number): string => {
  const titles: Record<number, string> = {
    1: "Seviye 1: Başlangıç",
    2: "Seviye 2: Gelişen",
    3: "Seviye 3: Orta Seviye",
    4: "Seviye 4: Orta-İleri",
    5: "Seviye 5: İleri Okuyucu",
    6: "Seviye 6: Seçkin (Master)"
  };
  return titles[lvl] || "Seviye 1: Başlangıç";
};

export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  onClose,
  stats,
  profileName,
  profileAvatar
}) => {
  const [selectedExercise, setSelectedExercise] = React.useState<keyof UserStats['highScores']>('schulte');

  if (!isOpen) return null;

  // Eski skorları yeni anahtarlara taşıyarak geriye dönük veri kaybını önleyelim
  const migratedHighScores = { ...stats.highScores };
  const rawHighScores = (stats.highScores || {}) as any;

  if (rawHighScores.letterPuzzle && !migratedHighScores.letter_letters) {
    migratedHighScores.letter_letters = rawHighScores.letterPuzzle;
  }
  if (rawHighScores.wordPuzzle && !migratedHighScores.word_words) {
    migratedHighScores.word_words = rawHighScores.wordPuzzle;
  }
  if (rawHighScores.flashExercise && !migratedHighScores.flash) {
    migratedHighScores.flash = rawHighScores.flashExercise;
  }
  if (rawHighScores.wordMatching && !migratedHighScores.match_words) {
    migratedHighScores.match_words = rawHighScores.wordMatching;
  }

  // Stotik egzersiz listesi tanımlayarak isimlerin boş gelmesini önleyelim
  const scoredKeys: (keyof UserStats['highScores'])[] = [
    'schulte',
    'letter_letters',
    'letter_numbers',
    'word_words',
    'word_numbers',
    'match_words',
    'match_numbers',
    'flash',
    'flash_sentence'
  ];

  // Egzersiz isimlerinin Türkçe etiketleri
  const exerciseNames: Record<keyof UserStats['highScores'], string> = {
    schulte: "Schulte Tablosu",
    letter_letters: "Harf Bulmaca (Harfler)",
    letter_numbers: "Rakam Bulmaca (Sayılar)",
    word_words: "Kelime Bulmaca (Kelimeler)",
    word_numbers: "Sayı Bulmaca (Sayılar)",
    match_words: "Kelime Eşleştirme",
    match_numbers: "Sayı Eşleştirme",
    flash: "Anlık Flaş",
    flash_sentence: "Flaş Cümle"
  };

  // Puansız egzersizlerin isimleri
  const unscoredNames: Record<string, string> = {
    rsvp: "Okuma Motoru (RSVP)",
    flash_unscored: "Flaş Kelime (Puansız)",
    pathtracking: "Rota Takip Egzersizi"
  };

  const getScoreUnit = (key: string): string => {
    if (key === 'schulte') return 'sn';
    return 'Puan';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm transition-all duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden max-h-[98vh] flex flex-col">
        
        {/* Kapatma Butonu */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer z-50"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Üst Kısım: Ortalı Profil ve Seviye Bilgisi */}
        <div className="flex flex-col items-center justify-center text-center space-y-1 pb-2 border-b border-slate-850 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-800 shrink-0">
              <Avatar value={profileAvatar} className="text-lg w-full h-full flex items-center justify-center" />
            </div>
            <h2 className="text-sm font-black text-slate-100">{profileName}</h2>
            <div className="flex items-center gap-0.5 text-[8px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
              <Flame className="w-2.5 h-2.5 fill-current" />
              {stats.streak} Gün
            </div>
          </div>
          <p className="text-[10px] text-teal-400 font-black tracking-wider uppercase">
            {getLevelTitle(stats.currentLevel)}
          </p>
        </div>

        {/* 2. Genel Seans Gelişim Oranları (Sütun Grafik) - Yukarı Taşındı ve Çok Kompaktlaştırıldı */}
        {stats.sessionHistory && stats.sessionHistory.length > 0 && (
          <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-850/80 shrink-0 space-y-1">
            <div className="text-[8px] font-bold text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5 text-teal-450" />
              Genel Seans Performans Gelişimi
            </div>
            <div className="flex items-end justify-between h-12 gap-1.5 px-2">
              {stats.sessionHistory.slice(-8).map((hist, index) => {
                const heightPct = Math.min(100, Math.max(20, hist.improvement * 1.2));
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[7px] font-mono text-emerald-450 font-bold">
                      +{hist.improvement}%
                    </span>
                    <div 
                      className="w-full bg-gradient-to-t from-teal-500/10 to-teal-500/30 rounded-t border-t border-teal-500/30 transition-all duration-300 relative group cursor-help" 
                      style={{ height: `${heightPct}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 border border-slate-800 text-[8px] font-mono text-slate-350 px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10">
                        Skor: {hist.avgScore}
                      </div>
                    </div>
                    <span className="text-[7px] font-mono text-slate-500">{hist.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Puanlı Egzersiz Rekorları (3x3 Grid) - İsimlerin Boş Gelmesi Önlenerek Stratejik Maplendi */}
        <div className="space-y-1 shrink-0">
          <div className="text-[8px] font-bold text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1">
            <Star className="w-2.5 h-2.5 text-amber-400" />
            Puanlı Egzersiz Rekorları
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {scoredKeys.map((key) => {
              const value = migratedHighScores[key] || 0;
              const isSelected = selectedExercise === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedExercise(key)}
                  className={`p-1.5 rounded-lg flex flex-col justify-between text-left transition duration-200 border ${
                    isSelected
                      ? 'bg-indigo-500/10 border-indigo-500/60 shadow shadow-indigo-500/5'
                      : 'bg-slate-950/30 border-slate-850/60 hover:bg-slate-950/50 hover:border-slate-800'
                  }`}
                >
                  <span className={`text-[8px] font-black truncate w-full ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>
                    {exerciseNames[key]}
                  </span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="text-xs font-black text-slate-200 font-mono">
                      {value}
                    </span>
                    <span className="text-[7px] text-slate-550 font-mono">
                      {getScoreUnit(key)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Puansız Egzersizler (3'lü Grid) */}
        <div className="space-y-1 shrink-0">
          <div className="text-[8px] font-bold text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1">
            <Eye className="w-2.5 h-2.5 text-teal-400" />
            Puansız Egzersiz Katılım Sayıları
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.keys(unscoredNames).map((key) => {
              const playCount = stats.unscoredPlayCounts?.[key] || 0;
              return (
                <div key={key} className="bg-slate-950/20 border border-slate-850/50 p-1.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[8px] text-slate-450 font-bold truncate">
                    {unscoredNames[key]}
                  </span>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="text-xs font-black text-slate-350 font-mono">
                      {playCount}
                    </span>
                    <span className="text-[7px] text-slate-550 font-mono">Kez</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Çizgi Grafik Alanı (Son 5 Skor) */}
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-850 flex-grow flex flex-col justify-between min-h-[100px] max-h-[140px] overflow-hidden">
          <div className="text-[8px] font-bold text-indigo-400 font-mono tracking-widest uppercase flex justify-between shrink-0">
            <span>{exerciseNames[selectedExercise]} Gelişim Grafiği (Son 5 Skor)</span>
            {migratedHighScores[selectedExercise] > 0 && (
              <span>En Yüksek: {migratedHighScores[selectedExercise]} {getScoreUnit(selectedExercise)}</span>
            )}
          </div>
          
          <div className="flex-grow flex items-center justify-center relative py-0.5">
            {(() => {
              const historyData = stats.exerciseHistory?.[selectedExercise] || [];
              const displayData = historyData.length > 0
                ? historyData.slice(-5)
                : migratedHighScores[selectedExercise] > 0
                  ? [{ date: 'Rekor', score: migratedHighScores[selectedExercise] }]
                  : [];

              if (displayData.length === 0) {
                return (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Bu egzersiz için henüz kaydedilmiş gelişim verisi bulunmuyor.
                  </div>
                );
              }

              const scores = displayData.map(h => h.score);
              const maxScore = Math.max(...scores, selectedExercise === 'schulte' ? 30 : 100);
              const minScore = Math.min(...scores, 0);
              const scoreRange = maxScore - minScore || 1;

              const points = displayData.map((hist, index) => {
                const x = displayData.length > 1
                  ? 30 + (index / (displayData.length - 1)) * 440
                  : 250;
                // Dikey yüksekliği 60px ile sınırlandırarak dikey taşmayı önlüyoruz
                const y = 65 - ((hist.score - minScore) / scoreRange) * 45;
                return { x, y, score: hist.score, date: hist.date };
              });

              const linePath = points.length > 1
                ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                : '';

              const areaPath = points.length > 1
                ? `${linePath} L ${points[points.length - 1].x} 65 L ${points[0].x} 65 Z`
                : '';

              return (
                <svg viewBox="0 0 500 78" className="w-full h-full max-h-[70px]">
                  <defs>
                    <linearGradient id="selectedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Kılavuz Çizgiler */}
                  <line x1="20" y1="15" x2="480" y2="15" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="40" x2="480" y2="40" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="65" x2="480" y2="65" stroke="#1e293b" strokeWidth="1" />
                  
                  {/* Alan */}
                  {points.length > 1 && (
                    <path d={areaPath} fill="url(#selectedGradient)" />
                  )}
                  
                  {/* Çizgi */}
                  {points.length > 1 && (
                    <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}

                  {/* Noktalar ve Değerler */}
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="3.5" fill="#0f172a" stroke="#6366f1" strokeWidth="2" />
                      <text x={p.x} y={p.y - 6} textAnchor="middle" className="text-[7.5px] font-mono fill-indigo-400 font-bold">
                        {p.score}{getScoreUnit(selectedExercise)}
                      </text>
                      <text x={p.x} y="76" textAnchor="middle" className="text-[7px] font-mono fill-slate-500">
                        {p.date}
                      </text>
                    </g>
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
};
