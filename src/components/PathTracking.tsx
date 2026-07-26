import React, { useState, useEffect, useRef } from 'react';
import { Play, Clock, Compass } from 'lucide-react';
import { getStats } from '../utils/statsHelper';
import { TURKISH_WORDS } from '../utils/wordPool';

type PathType = 'circle' | 'infinity' | 'zigzag' | 'horizontal' | 'vertical' | 'random';

interface Point {
  x: number;
  y: number;
}

interface PathTrackingProps {
  pathType?: PathType;
  onComplete?: (score?: number) => void;
  onStartActive?: () => void;
}

export const PathTracking: React.FC<PathTrackingProps> = ({ pathType = 'circle', onComplete, onStartActive }) => {
  const [startSpeed, setStartSpeed] = useState<number>(900);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [currentPointIndex, setCurrentPointIndex] = useState<number>(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [randomPoints, setRandomPoints] = useState<Point[]>([]);
  
  const [currentWord, setCurrentWord] = useState<string>('');
  const [personalBestWpm, setPersonalBestWpm] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordsReadRef = useRef<number>(0);

  const wordPool = TURKISH_WORDS;

  const pointsMap: Record<Exclude<PathType, 'random'>, Point[]> = {
    circle: [
      { x: 250, y: 80 }, { x: 340, y: 110 }, { x: 390, y: 200 },
      { x: 340, y: 290 }, { x: 250, y: 320 }, { x: 160, y: 290 },
      { x: 110, y: 200 }, { x: 160, y: 110 }
    ],
    infinity: [
      { x: 250, y: 200 }, { x: 340, y: 110 }, { x: 420, y: 200 },
      { x: 340, y: 290 }, { x: 250, y: 200 }, { x: 160, y: 110 },
      { x: 80, y: 200 }, { x: 160, y: 290 }
    ],
    zigzag: [
      { x: 80, y: 110 }, { x: 160, y: 290 }, { x: 240, y: 110 },
      { x: 320, y: 290 }, { x: 400, y: 110 }
    ],
    horizontal: [
      { x: 80, y: 200 }, { x: 160, y: 200 }, { x: 240, y: 200 },
      { x: 320, y: 200 }, { x: 400, y: 200 }
    ],
    vertical: [
      { x: 250, y: 80 }, { x: 250, y: 140 }, { x: 250, y: 200 },
      { x: 250, y: 260 }, { x: 250, y: 320 }
    ]
  };

  const generateRandomPoints = (): Point[] => {
    const pts: Point[] = [];
    for (let i = 0; i < 8; i++) {
      pts.push({
        x: 80 + Math.random() * 340,
        y: 80 + Math.random() * 240
      });
    }
    return pts;
  };

  const currentPoints = pathType === 'random' ? randomPoints : pointsMap[pathType];

  useEffect(() => {
    const stats = getStats();
    const wpm = stats.bestWpm || 200;
    setPersonalBestWpm(wpm);
    const speed = Math.max(400, Math.min(1200, 60000 / wpm));
    setStartSpeed(speed);
  }, []);

  const startGame = () => {
    if (onStartActive) onStartActive();
    setCountdown(3);
    setTimeLeft(60);
    setCurrentPointIndex(0);
    setDirection('forward');

    if (pathType === 'random') {
      setRandomPoints(generateRandomPoints());
    }

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setCountdown(null);
          setIsStarted(true);
          setCurrentWord(wordPool[Math.floor(Math.random() * wordPool.length)]);
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
            if (jumpRef.current) clearTimeout(jumpRef.current);
            
            if (onComplete) {
              setTimeout(() => onComplete(wordsReadRef.current), 1000);
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
  }, [isStarted, onComplete]);

  useEffect(() => {
    if (!isStarted || timeLeft === 0 || currentPoints.length === 0) return;

    let currentSpeed = startSpeed;
    if (timeLeft <= 40 && timeLeft > 20) {
      currentSpeed = startSpeed * 0.9;
    } else if (timeLeft <= 20) {
      currentSpeed = startSpeed * 0.8;
    }

    const jump = () => {
      const isFinitePath = ['zigzag', 'horizontal', 'vertical', 'random'].includes(pathType);

      if (isFinitePath) {
        if (direction === 'forward') {
          if (currentPointIndex === currentPoints.length - 1) {
            setDirection('backward');
            setCurrentPointIndex(currentPoints.length - 2);
          } else {
            setCurrentPointIndex(prev => prev + 1);
          }
        } else {
          if (currentPointIndex === 0) {
            setDirection('forward');
            setCurrentPointIndex(1);
          } else {
            setCurrentPointIndex(prev => prev - 1);
          }
        }
      } else {
        setCurrentPointIndex(prev => (prev + 1) % currentPoints.length);
      }

      setCurrentWord(wordPool[Math.floor(Math.random() * wordPool.length)]);
      wordsReadRef.current += 1;
    };

    jumpRef.current = setTimeout(jump, currentSpeed);

    return () => {
      if (jumpRef.current) clearTimeout(jumpRef.current);
    };
  }, [isStarted, currentPointIndex, timeLeft, startSpeed, currentPoints, direction, pathType]);

  const activePoint = currentPoints[currentPointIndex] || { x: 250, y: 200 };

  const renderPathLines = () => {
    if (currentPoints.length === 0) return null;
    const lines: React.ReactNode[] = [];
    const isFinitePath = ['zigzag', 'horizontal', 'vertical', 'random'].includes(pathType);

    for (let i = 0; i < currentPoints.length; i++) {
      const p1 = currentPoints[i];
      const p2 = currentPoints[(i + 1) % currentPoints.length];
      
      if (isFinitePath && i === currentPoints.length - 1) {
        continue;
      }

      lines.push(
        <line
          key={i}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          className="stroke-slate-800/80 stroke-[3]"
          strokeDasharray="6,6"
        />
      );
    }
    return lines;
  };

  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md max-w-3xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
          <Compass className="w-5 h-5 text-teal-400" />
          Rota Takip & Okuma
        </h2>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
            Dinamik Hız: {personalBestWpm} Kelime/Dakika Okuyucu
          </span>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="max-w-xs mx-auto">
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            KALAN SÜRE
          </div>
          <span className="text-xs font-black text-slate-200">{timeLeft} sn</span>
        </div>
      </div>

      {/* Rota Takip Paneli */}
      <div className="relative w-full aspect-[5/4] bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden flex items-center justify-center">
        
        {/* Kılavuz Çizgiler */}
        <svg 
          viewBox="0 0 500 400" 
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-1000 ${timeLeft > 30 ? 'opacity-100' : 'opacity-0'}`}
        >
          {renderPathLines()}
        </svg>

        {/* Sıçrayan Büyük Kelime Dairesi */}
        {isStarted && activePoint && (
          <div
            style={{
              position: 'absolute',
              left: `${(activePoint.x / 500) * 100}%`,
              top: `${(activePoint.y / 400) * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
            className="w-24 h-24 rounded-full bg-teal-500 border-2 border-teal-400 text-slate-950 flex items-center justify-center text-center font-black text-xs md:text-sm shadow-2xl transition-all duration-75 shadow-teal-500/20 select-none"
          >
            {currentWord}
          </div>
        )}

        {/* Başlatma / Bitirme Ekranı - Görsel çakışmalar düzeltildi */}
        {!isStarted && countdown === null && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center space-y-4 p-6 text-center z-10">
            <Compass className="w-10 h-10 text-teal-400 animate-spin-slow" />
            <div className="max-w-md space-y-2">
              <h3 className="font-bold text-slate-200 text-sm md:text-base">Göz Sıçrama ve Okuma Antrenmanı</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Egzersiz 60 saniye sürer. <strong>İlk 30 saniye</strong> rotayı oluşturan kılavuz çizgiler görünür, <strong>son 30 saniye</strong> ise kaybolur. Sıçrayan büyük dairenin merkezindeki kelimeyi takip ederek okuyun. Süre azaldıkça atlama hızı giderek artacaktır.
              </p>
              <div className="text-[10px] text-teal-400 bg-teal-500/5 border border-teal-500/10 p-2 rounded-xl mt-2">
                💡 Kişisel Hız Ayarı: Platformdaki en yüksek okuma hızınız ({personalBestWpm} Kelime/Dakika) baz alınarak egzersiz hızınız otomatik olarak ayarlanmıştır.
              </div>
            </div>
            {timeLeft === 0 && (
              <div className="text-sm font-bold text-slate-200">
                Egzersiz Tamamlandı!
              </div>
            )}
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-sm transition active:scale-95 shadow-lg shadow-teal-500/25"
            >
              <Play className="w-4 h-4 fill-current animate-pulse" />
              Egzersizi Başlat
            </button>
          </div>
        )}

        {/* Geri Sayım Örtüsü */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-slate-950/98 rounded-2xl flex items-center justify-center z-50">
            <div className="text-7xl font-black text-teal-400 animate-ping font-mono">{countdown}</div>
          </div>
        )}
      </div>
    </div>
  );
};
