import React from 'react';
import { X, TrendingUp, Flame, BookOpen, Award, BarChart2, Star } from 'lucide-react';
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
  profileAvatar,
  email
}) => {
  if (!isOpen) return null;

  // Egzersiz isimlerinin Türkçe etiketleri
  const exerciseNames: Record<keyof UserStats['highScores'], string> = {
    letterPuzzle: "Harf Bulmaca",
    wordPuzzle: "Kelime Bulmaca",
    wordMatching: "Kelime Eşleştirme",
    flashExercise: "Anlık Flaş",
    pathTracking: "Rota Takip"
  };

  // Egzersiz skorlarının birimlerini alma
  const getScoreUnit = (key: string): string => {
    if (key === 'schulte') return 'sn';
    return 'Puan';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md transition-all duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* Kapatma Butonu */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer z-50 shadow-md hover:scale-105 active:scale-95"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Başlık Alanı */}
        <div className="flex items-center gap-3 pb-2 border-b border-slate-850">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-teal-500/20 text-slate-950">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Gelişim Paneli
            </h2>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-0.5">
              Kişisel Performans & Rekorlar
            </p>
          </div>
        </div>

        {/* Profil ve Özet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sol: Profil Kartı */}
          <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-800">
              <Avatar value={profileAvatar} className="text-3xl w-full h-full flex items-center justify-center" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-200 truncate max-w-[150px]">{profileName}</h3>
              <p className="text-[9px] text-slate-500 font-mono truncate max-w-[150px]">{email}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
              <Flame className="w-3.5 h-3.5 fill-current" />
              {stats.streak} Gün Seri
            </div>
          </div>

          {/* Sağ: İstatistik Özet Kutuları */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                Okunan Kelime
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-100 font-mono">{stats.totalWordsRead.toLocaleString('tr-TR')}</span>
                <span className="text-[10px] text-slate-400 ml-1">Kelime</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 leading-normal">
                Hızlı okuma egzersizleri boyunca gözlerinizle okuduğunuz toplam kelime sayısı.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-400" />
                En Yüksek Hız
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-100 font-mono">{stats.bestWpm}</span>
                <span className="text-[10px] text-slate-400 ml-1">K/D</span>
              </div>
              <div className="text-[10px] text-teal-400 font-bold mt-1 leading-none">
                {getLevelTitle(stats.currentLevel)}
              </div>
            </div>
          </div>
        </div>

        {/* Egzersiz Rekorları (High Scores) */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            Egzersiz Rekorlarınız
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(stats.highScores).map(([key, value]) => (
              <div key={key} className="bg-slate-950/40 border border-slate-850/80 p-3 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-bold truncate">
                  {exerciseNames[key as keyof UserStats['highScores']] || key}
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-black text-slate-200 font-mono">
                    {value || 0}
                  </span>
                  <span className="text-[8px] text-slate-500">
                    {getScoreUnit(key)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tarihsel Gelişim Grafiği */}
        {stats.sessionHistory && stats.sessionHistory.length > 0 ? (
          <div className="space-y-6">
            {/* Çizgi Grafik: Seans Ortalama Skor Trendi */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                Seans Başarı Skor Trendi (Çizgi Grafik)
              </div>
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850">
                <div className="w-full overflow-x-auto">
                  <svg viewBox="0 0 500 130" className="w-full h-auto min-w-[400px]">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Kılavuz Çizgiler */}
                    <line x1="30" y1="20" x2="470" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="30" y1="65" x2="470" y2="65" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="30" y1="110" x2="470" y2="110" stroke="#1e293b" strokeDasharray="3 3" />
                    
                    {/* Eksen Değerleri */}
                    {(() => {
                      const historyData = stats.sessionHistory.slice(-8);
                      const scores = historyData.map(h => h.avgScore);
                      const maxScore = Math.max(...scores, 100);
                      const minScore = Math.min(...scores, 0);
                      const scoreRange = maxScore - minScore || 1;

                      const points = historyData.map((hist, index) => {
                        const x = historyData.length > 1 
                          ? 30 + (index / (historyData.length - 1)) * 440
                          : 250;
                        const y = 110 - ((hist.avgScore - minScore) / scoreRange) * 90;
                        return { x, y, score: hist.avgScore, date: hist.date };
                      });

                      const linePath = points.length > 1
                        ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                        : '';

                      const areaPath = points.length > 1
                        ? `${linePath} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z`
                        : '';

                      return (
                        <>
                          {/* Alan Doldurma */}
                          {points.length > 1 && (
                            <path d={areaPath} fill="url(#chartGradient)" />
                          )}
                          
                          {/* Çizgi */}
                          {points.length > 1 && (
                            <path d={linePath} fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          )}

                          {/* Noktalar ve Etiketler */}
                          {points.map((p, i) => (
                            <g key={i} className="group cursor-pointer">
                              <circle cx={p.x} cy={p.y} r="5" fill="#0f172a" stroke="#14b8a6" strokeWidth="2.5" />
                              <circle cx={p.x} cy={p.y} r="8" fill="#14b8a6" className="opacity-0 hover:opacity-20 transition-all duration-200" />
                              
                              {/* Değer Etiketi */}
                              <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[9px] font-mono fill-teal-400 font-bold bg-slate-900">
                                {p.score}
                              </text>
                              
                              {/* Tarih Etiketi */}
                              <text x={p.x} y="125" textAnchor="middle" className="text-[8px] font-mono fill-slate-500">
                                {p.date}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <p className="text-[9px] text-slate-500 text-center leading-normal mt-2">
                  Seanslar boyunca elde ettiğiniz ortalama egzersiz başarı skorlarınızın seyri.
                </p>
              </div>
            </div>

            {/* Sütun Grafik: Seans Ortalama Gelişim Oranı */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-teal-400" />
                Seans Performans Gelişimi (Sütun Grafik)
              </div>
              
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 space-y-4">
                <div className="flex items-end justify-between h-32 gap-3 pt-2">
                  {stats.sessionHistory.slice(-8).map((hist, index) => {
                    const heightPct = Math.min(100, Math.max(15, hist.improvement * 2));
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[8px] font-mono text-emerald-400 font-bold">
                          {hist.improvement >= 0 ? `+${hist.improvement}%` : `${hist.improvement}%`}
                        </span>
                        <div 
                          className="w-full bg-gradient-to-t from-teal-500/20 to-teal-500/40 hover:from-teal-500/35 hover:to-teal-500/55 rounded-t border-t border-teal-500/40 transition-all duration-300 relative group cursor-help" 
                          style={{ height: `${heightPct}%` }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 border border-slate-800 text-[8px] font-mono text-slate-350 px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                            Skor: {hist.avgScore} Puan
                          </div>
                        </div>
                        <span className="text-[8px] font-mono text-slate-500 truncate w-full text-center">{hist.date}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] text-slate-500 text-center leading-normal">
                  Son seanslardaki egzersizlerin 1. ve 2. denemeleri arasındaki ortalama gelişim oranınız.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-2xl text-center text-xs text-slate-500">
            Henüz tamamlanmış seans geçmişi bulunmuyor. Egzersizleri 8 adımlık Eğitim Programı ile tamamladıkça burası güncellenecektir.
          </div>
        )}

      </div>
    </div>
  );
};
