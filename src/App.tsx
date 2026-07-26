import { useState, useEffect } from 'react';
import { RSVPEngine } from './components/RSVPEngine';
import { SchulteTable } from './components/SchulteTable';
import { LetterPuzzle } from './components/LetterPuzzle';
import { WordPuzzle } from './components/WordPuzzle';
import { WordMatching } from './components/WordMatching';
import { FlashExercise } from './components/FlashExercise';
import { FlashSentence } from './components/FlashSentence';
import { SpeedTest } from './components/SpeedTest';
import { PathTracking } from './components/PathTracking';

import { getStats, saveStats, type UserStats, registerOnStatsSave, updateHighScore } from './utils/statsHelper';
import { AuthScreen } from './components/AuthScreen';
import { Avatar } from './components/Avatar';
import { AboutModal } from './components/AboutModal';
import { ProgressModal } from './components/ProgressModal';
import { authService, type UserProfile } from './services/authService';
import { 
  Brain, ShieldCheck, Flame, BookOpenCheck, TrendingUp, Award, Play, Info, LogOut, Settings, MessageSquare,
  Users
} from 'lucide-react';
import { isFirebaseConfigured } from './firebase';

type TabType = 'rsvp' | 'schulte' | 'letter_letters' | 'letter_numbers' | 'word_words' | 'word_numbers' | 'match_words' | 'match_numbers' | 'flash' | 'flash_sentence' | 'flash_unscored' | 'pathtracking' | 'speedtest';

// Tüm 11 egzersiz anahtarı ve detaylı Türkçe açıklamaları
const EXERCISE_GUIDES: Record<TabType, { title: string; desc: string; benefit: string; howto: string }> = {
  rsvp: {
    title: "Okuma Motoru (RSVP)",
    desc: "Kelimelerin ekranın tam ortasında tek tek ve hızlıca gösterilmesini sağlayan dinamik okuma motorudur.",
    benefit: "Gözün satır başı ve satır sonu yaparken kaybettiği süreyi ortadan kaldırır, odak genişliğini artırır.",
    howto: "Ekranın ortasındaki kılavuz çizgilere odaklanın. Kelimeler aktıkça gözünüzü sağa sola oynatmadan, kelimelerin bütününe odaklanarak okuyun."
  },
  schulte: {
    title: "Schulte Tablosu",
    desc: "Sayıların rastgele dağıtıldığı ızgara şeklinde bir odak tablosudur.",
    benefit: "Çevre görüş açısını (periferik vizyon) genişletir ve odaklanma refleksini hızlandırır.",
    howto: "Tablonun tam ortasına odaklanın. Gözlerinizi oynatmadan çevre görüşünüzle 1'den başlayarak sayıları sırayla bulun."
  },
  letter_letters: {
    title: "Harf Bulmaca (Harfler)",
    desc: "10x10'luk harf ızgarasında hedef harfleri en kısa sürede bulma egzersizidir.",
    benefit: "Görsel tarama yeteneğinizi hızlandırır ve beyindeki görsel işlemci alanını uyarır.",
    howto: "Yukarıda gösterilen hedef harfleri ızgara üzerinde bulup tıklayın. Hepsini en kısa sürede bulmaya çalışın."
  },
  letter_numbers: {
    title: "Rakam Bulmaca (Sayılar)",
    desc: "10x10'luk rakam ızgarasında hedef rakamları bulma egzersizidir.",
    benefit: "Görsel tarama hızınızı geliştirirken harf dışı sembolleri ayırt etme yeteneğinizi güçlendirir.",
    howto: "Gösterilen hedef rakamları ızgarada bulun ve üzerlerine tıklayın. Hepsini en kısa sürede bulmaya çalışın."
  },
  word_words: {
    title: "Kelime Bulmaca (Kelimeler)",
    desc: "Izgara içerisine dikey/yatay gizlenmiş kelimeleri tek tıkla bulma egzersizidir.",
    benefit: "Blok okuma yeteneğini geliştirerek kelimeleri harf harf değil bütün olarak algılamayı sağlar.",
    howto: "Aranacak kelimeler üstte listelenir. Izgarada bu kelimenin geçtiği herhangi bir harfe tıkladığınızda kelimenin tamamı bulunur."
  },
  word_numbers: {
    title: "Sayı Bulmaca (Sayılar)",
    desc: "Izgara içerisine dikey/yatay gizlenmiş 4-5 haneli sayıları bulma egzersizidir.",
    benefit: "Sayı bloklarını tek bakışta okuma ve işlem algılama hızını artırır.",
    howto: "Aranacak sayıların geçtiği herhangi bir haneye ızgarada tıklayarak gizlenmiş sayıları bulun."
  },
  match_words: {
    title: "Kelime Eşleştirme",
    desc: "24 kelime çifti arasından farklı olanları seçme egzersizidir.",
    benefit: "Çok benzer kelimeler arasındaki ince farkları anlık olarak yakalama refleksini geliştirir.",
    howto: "Listelenen 24 dikey çiftin yarısı tamamen aynı, yarısı farklıdır. Sadece birbirinden farklı olan 8 çifte tıklayın. Yanlış tıklamada tur biter."
  },
  match_numbers: {
    title: "Sayı Eşleştirme",
    desc: "24 sayı çifti arasından farklı olanları seçme egzersizidir.",
    benefit: "Sayısal verilerdeki (Örn: 9283-9213) benzerlik ve farkları anlık olarak tarama hızını artırır.",
    howto: "24 sayı çiftinden birbirinden farklı olan 8 sayı çiftini bulun. Yanlış tıklamada tur biter."
  },
  flash: {
    title: "Anlık Flaş Egzersizi",
    desc: "Ekranda anlık görünüp kaybolan karakterleri hafızada tutup yazma egzersizidir.",
    benefit: "Fotoğrafik hafıza (görsel bellek) ve anlık kavrama hızını geliştirir.",
    howto: "Ekranda flaşlanan karakterleri görerek aşağıdaki kutuya yazıp onaylayın."
  },
  flash_sentence: {
    title: "Flaş Cümle Egzersizi",
    desc: "Ekranda anlık beliren cümleleri hafızada tutup yazma çalışmasıdır.",
    benefit: "Görsel cümle belleği, bütünsel algı ve hızlı okuma ritmi kazandırır.",
    howto: "Ortada belirecek cümleyi dikkatle okuyun. Cümle kaybolduktan sonra aşağıdaki kutuya aynısını yazıp onaylayın."
  },
  flash_unscored: {
    title: "Flaş Kelime (Puansız)",
    desc: "Ekranda saliselik sürelerle yanıp sönen kelimeleri sadece gözlerinizle takip etme egzersizidir.",
    benefit: "Görsel algı hızını ve kısa süreli bellek eşiğini yükseltir, yazma zorunluluğu olmadan göz kaslarını eğitir.",
    howto: "Ekrana odaklanın. Kelimeler flaşlandığında yazmaya çalışmayın, sadece kelimeyi zihninizde okumaya ve yakalamaya odaklanın."
  },
  pathtracking: {
    title: "Rota Takip Egzersizi",
    desc: "Belirli rotalarda sıçrayan dairenin içindeki kelimeleri okuma antrenmanıdır.",
    benefit: "Göz kaslarının esnekliğini artırır, göz sıçrama (saccadic) koordinasyonunu geliştirir.",
    howto: "Sıçrayan büyük dairenin merkezinde beliren kelimeleri okuyarak daireyi gözlerinizle takip edin. Çizgiler yarısında kaybolacak ve nokta hızlanacaktır."
  },
  speedtest: {
    title: "Okuma Hızı Ölçümü",
    desc: "Belirli bir metni okuma sürenizi ölçerek dakikadaki kelime hızınızı (Kelime/Dakika) hesaplayan testtir.",
    benefit: "Genel okuma hızınızı ölçer ve seviyenizin otomatik güncellenmesini sağlar.",
    howto: "Okumaya Başla'ya tıklayıp metni normal hızınızda okuyun. Bittiğinde Okumayı Bitirdim butonuna basın."
  }
};

const SCORED_TABS: TabType[] = ['schulte', 'letter_letters', 'letter_numbers', 'word_words', 'word_numbers', 'match_words', 'match_numbers', 'flash', 'flash_sentence'];
const UNSCORED_TABS: TabType[] = ['rsvp', 'flash_unscored', 'pathtracking'];

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

const getLevelWpmRange = (lvl: number): string => {
  const ranges: Record<number, string> = {
    1: "0 - 200 Kelime/Dakika",
    2: "200 - 350 Kelime/Dakika",
    3: "350 - 500 Kelime/Dakika",
    4: "500 - 700 Kelime/Dakika",
    5: "700 - 900 Kelime/Dakika",
    6: "900+ Kelime/Dakika"
  };
  return ranges[lvl] || "0 - 200 Kelime/Dakika";
};

const getAutoPathTypeByLevel = (level: number): 'circle' | 'infinity' | 'zigzag' | 'horizontal' | 'vertical' | 'random' => {
  if (level === 1) return 'horizontal';
  if (level === 2) return 'vertical';
  if (level === 3) return 'circle';
  if (level === 4) return 'zigzag';
  if (level === 5) return 'infinity';
  return 'random';
};

function App() {
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string } | null>(null);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isProgressOpen, setIsProgressOpen] = useState<boolean>(false);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('rsvp');
  const [restTimeLeft, setRestTimeLeft] = useState<number>(0);
  const [isExerciseRunning, setIsExerciseRunning] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);
  
  const stopExercise = () => {
    setIsExerciseRunning(false);
    setResetKey(prev => prev + 1);
  };
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Organik Sayaç Verisi
  const [counterData, setCounterData] = useState<{ totalLogins: number } | null>(null);

  useEffect(() => {
    if (isFirebaseConfigured) {
      authService.getSessionCounter().then((data) => {
        if (data) {
          setCounterData(data);
        }
      });
    }
  }, []);

  // Otomatik Firebase/Profil senkronizasyonu
  useEffect(() => {
    if (!currentUser || !activeProfile || allProfiles.length === 0) return;

    registerOnStatsSave((updatedStats) => {
      // Egzersiz sonucunda değişen istatistikleri Firestore'a veya local profiles'a yedekle
      authService.saveProfileStats(
        currentUser.uid,
        activeProfile.id,
        updatedStats,
        allProfiles
      );

      // Profil listesini yerelde güncelle
      const updatedProfiles = allProfiles.map(p => {
        if (p.id === activeProfile.id) {
          return { ...p, stats: updatedStats, level: updatedStats.currentLevel };
        }
        return p;
      });
      setAllProfiles(updatedProfiles);
    });
  }, [currentUser, activeProfile, allProfiles]);

  // Profil Seçildiğinde Tetiklenen Fonksiyon
  const handleProfileSelected = (
    user: { uid: string; email: string },
    profile: UserProfile,
    profilesList: UserProfile[]
  ) => {
    setCurrentUser(user);
    setActiveProfile(profile);
    setAllProfiles(profilesList);

    // Profilin istatistiklerini localStorage'a yazarak aktif hale getirelim
    localStorage.setItem('hizli_okuma_stats', JSON.stringify(profile.stats));
    
    // Yükle
    setTimeout(() => loadStats(), 10);
  };

  // Oturumu Kapatma Fonksiyonu
  const handleLogout = async () => {
    if (currentUser) {
      await authService.logout(currentUser.uid);
      setCurrentUser(null);
      setActiveProfile(null);
    }
  };

  const loadStats = () => {
    const s = getStats();

    // Geçici/geriye dönük 9 egzersiz düzeltmesi: Eğer liste 9 ise 8'e düşürelim
    if (s.programList && s.programList.length === 9) {
      s.programList = s.programList.filter(x => x !== 'pathtracking');
      s.programScores = s.programScores.slice(0, s.programList.length);
      if (s.programIndex >= 8) s.programIndex = 7;
      saveStats(s);
    }

    setStats(s);

    // Eğer program listesi yoksa veya boşsa oluştur
    if (s.hasDoneInitialTest && (!s.programList || s.programList.length === 0)) {
      generateNewProgramList(s);
    }

    // Dinlenme kilidini kontrol et
    if (s.restEndTime > Date.now()) {
      setRestTimeLeft(Math.ceil((s.restEndTime - Date.now()) / 1000));
    } else {
      setRestTimeLeft(0);
    }
  };

  useEffect(() => {
    if (!activeProfile) return;
    loadStats();
    
    const interval = setInterval(() => {
      if (stats && stats.restEndTime > Date.now()) {
        const remaining = Math.ceil((stats.restEndTime - Date.now()) / 1000);
        setRestTimeLeft(remaining);
      } else if (restTimeLeft > 0) {
        setRestTimeLeft(0);
        const updated = getStats();
        updated.completedCountThisSession = 0;
        updated.restEndTime = 0;
        saveStats(updated);
        setStats(updated);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stats?.restEndTime, activeProfile]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutsideClick = () => setIsDropdownOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isDropdownOpen]);

  // Seviyeye göre 3'lü aktif egzersiz seçer ve programı (3 Puanlı, 2 Puansız, 3 Puanlı tekrar) şeklinde oluşturur
  const generateNewProgramList = (s: UserStats) => {
    let scoredExercises: TabType[] = [];
    if (s.currentLevel <= 2) {
      scoredExercises = ['schulte', 'letter_letters', 'word_words'];
    } else if (s.currentLevel <= 4) {
      scoredExercises = ['schulte', 'word_words', 'match_words'];
    } else {
      scoredExercises = ['match_numbers', 'word_numbers', 'flash_sentence'];
    }

    // 3 Puanlı (A, B, C) -> 2 Puansız (rsvp, pathtracking) -> 3 Puanlı (A, B, C tekrar) sırasını kur
    s.programList = [
      scoredExercises[0], // Adım 1 (Puanlı A - Attempt 1)
      scoredExercises[1], // Adım 2 (Puanlı B - Attempt 1)
      scoredExercises[2], // Adım 3 (Puanlı C - Attempt 1)
      'rsvp',             // Adım 4 (Puansız D)
      'pathtracking',     // Adım 5 (Puansız E)
      scoredExercises[0], // Adım 6 (Puanlı A - Attempt 2)
      scoredExercises[1], // Adım 7 (Puanlı B - Attempt 2)
      scoredExercises[2]  // Adım 8 (Puanlı C - Attempt 2)
    ];
    s.programIndex = 0;
    s.programScores = [0, 0, 0, 0, 0, 0, 0, 0];
    saveStats(s);
  };

  // Egzersiz başarıyla tamamlandığında tetiklenir
  const handleExerciseComplete = (score?: number) => {
    setIsExerciseRunning(false);
    if (!stats) return;
    const updatedStats = getStats();

    const currentTab = updatedStats.trainingMode === 'program'
      ? updatedStats.programList[updatedStats.programIndex]
      : activeTab;

    // Merkezi istatistik ve rekor kaydı
    if (SCORED_TABS.includes(currentTab as TabType)) {
      updateHighScore(currentTab, score || 0);
    } else if (UNSCORED_TABS.includes(currentTab as TabType)) {
      if (!updatedStats.unscoredPlayCounts) {
        updatedStats.unscoredPlayCounts = { rsvp: 0, flash_unscored: 0, pathtracking: 0 };
      }
      updatedStats.unscoredPlayCounts[currentTab] = (updatedStats.unscoredPlayCounts[currentTab] || 0) + 1;
      saveStats(updatedStats);
    }

    // Hız testi tamamlandığında seviye hesapla
    if (currentTab === 'speedtest') {
      const wpmVal = score || 0;
      let newLvl = 1;
      if (wpmVal >= 900) newLvl = 6;
      else if (wpmVal >= 700) newLvl = 5;
      else if (wpmVal >= 500) newLvl = 4;
      else if (wpmVal >= 350) newLvl = 3;
      else if (wpmVal >= 200) newLvl = 2;

      updatedStats.currentLevel = newLvl;
      updatedStats.hasDoneInitialTest = true;
      if (wpmVal > updatedStats.bestWpm) {
        updatedStats.bestWpm = wpmVal;
      }

      const today = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
      if (!updatedStats.wpmHistory) updatedStats.wpmHistory = [];
      updatedStats.wpmHistory.push({ date: today, wpm: wpmVal });

      // Programı yeni seviyeye göre sıfırla ve yeniden oluştur
      generateNewProgramList(updatedStats);
      updatedStats.programIndex = 0;
      updatedStats.completedCountThisSession = 0;
      stopExercise();

      saveStats(updatedStats);
      setStats(updatedStats);

      const firstTab = updatedStats.programList[0] as TabType;
      setActiveTab(firstTab);
      return;
    }

    // Egzersizden dönen skoru kaydet (Sadece Program Modunda)
    if (updatedStats.trainingMode === 'program') {
      updatedStats.programScores[updatedStats.programIndex] = score || 0;
    }

    // Oturum sayacını artır
    updatedStats.completedCountThisSession += 1;

    // Eğer program modundaysak, program adımını bir ilerlet
    if (updatedStats.trainingMode === 'program') {
      const nextIndex = updatedStats.programIndex + 1;
      updatedStats.programIndex = nextIndex; 
      stopExercise(); // Rapor haritasına dön
      
      if (nextIndex < updatedStats.programList.length) {
        const nextTab = updatedStats.programList[nextIndex] as TabType;
        setActiveTab(nextTab);
      }
    } else {
      // Serbest modda ise direkt 8'de dinlenme kilidine girer
      if (updatedStats.completedCountThisSession >= 8) {
        updatedStats.restEndTime = Date.now() + 30 * 60 * 1000;
        updatedStats.completedCountThisSession = 0;
      }
    }

    saveStats(updatedStats);
    setStats(updatedStats);
  };

  // İlk WPM hız testi başarıyla bittiğinde
  const handleInitialTestComplete = () => {
    loadStats();
  };

  // Çalışma modunu değiştirme
  const handleModeChange = (mode: 'program' | 'free') => {
    if (!stats) return;
    const updated = getStats();
    updated.trainingMode = mode;
    stopExercise();
    if (mode === 'program' && (!updated.programList || updated.programList.length === 0)) {
      generateNewProgramList(updated);
    }
    // Program moduna geçince aktif adımdaki egzersizi seç
    if (mode === 'program') {
      if (updated.programIndex < updated.programList.length) {
        const nextTab = updated.programList[updated.programIndex] as TabType;
        setActiveTab(nextTab);
      }
    }
    saveStats(updated);
    setStats(updated);
  };



  const renderProgramRoadmap = () => {
    if (!stats) return null;
    const currentStepIndex = stats.programIndex;
    const activeItemKey = stats.programList[currentStepIndex];
    const activeInfo = EXERCISE_GUIDES[activeItemKey as TabType] || { title: activeItemKey, desc: '', benefit: '', howto: '' };
    const isScored = activeItemKey !== 'rsvp' && activeItemKey !== 'pathtracking' && activeItemKey !== 'speedtest';

    const progressPercent = Math.round((currentStepIndex / stats.programList.length) * 100);

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Başlık ve İlerleme Kartı */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-md space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] text-teal-400 font-mono tracking-widest uppercase block">BUGÜNKÜ PLAN</span>
              <h2 className="text-xl font-black text-slate-200">Eğitim Yol Haritası</h2>
            </div>
            <span className="text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-850 font-mono text-slate-400">
              Tamamlanan: {currentStepIndex} / {stats.programList.length}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-slate-500">
              <span>Program İlerlemesi</span>
              <span className="text-teal-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-900">
              <div 
                className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Sıradaki Egzersiz Hero Kartı */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden shadow-2xl space-y-5">
          <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex justify-between items-start">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border font-mono ${isScored ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'}`}>
              {isScored ? 'PUANLI AKTİF PRATİK' : 'ODAK & GÖZ EGZERSİZİ'}
            </span>
            <span className="text-xs text-slate-500 font-mono">Adım {currentStepIndex + 1}</span>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-100">{activeInfo.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{activeInfo.desc}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-850 space-y-1">
              <span className="text-[9px] font-mono text-indigo-400 font-bold tracking-wider block">KAZANDIRACAĞI YETENEK</span>
              <p className="text-[11px] text-slate-400 leading-normal">{activeInfo.benefit}</p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-850 space-y-1">
              <span className="text-[9px] font-mono text-amber-400 font-bold tracking-wider block">NASIL UYGULANIR?</span>
              <p className="text-[11px] text-slate-400 leading-normal">{activeInfo.howto}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab(activeItemKey as TabType);
              setIsExerciseRunning(true);
            }}
            className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-2xl text-base transition active:scale-98 shadow-xl shadow-teal-500/15 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            Egzersize Başla
          </button>
        </div>
      </div>
    );
  };
  
  const getActiveLevel = () => {
    if (!stats) return 1;
    // Eğitim modunda 2. deneme adımlarındaysak (programIndex >= 5) seviyeyi bir artırarak zorluğu yükseltiyoruz
    if (stats.trainingMode === 'program' && stats.programIndex >= 5) {
      return Math.min(6, stats.currentLevel + 1);
    }
    return stats.currentLevel;
  };

  const renderActiveTab = () => {
    const startAct = () => setIsExerciseRunning(true);
    const activeLevel = getActiveLevel();
    const k = `${activeTab}-${resetKey}`;
    switch (activeTab) {
      case 'rsvp':
        return <RSVPEngine key={k} onComplete={handleExerciseComplete} onStartActive={startAct} level={activeLevel} />;
      case 'schulte':
        return <SchulteTable key={k} onComplete={handleExerciseComplete} onStartActive={startAct} level={activeLevel} />;
      case 'letter_letters':
        return <LetterPuzzle key={k} mode="letters" onComplete={handleExerciseComplete} onStartActive={startAct} />;
      case 'letter_numbers':
        return <LetterPuzzle key={k} mode="numbers" onComplete={handleExerciseComplete} onStartActive={startAct} />;
      case 'word_words':
        return <WordPuzzle key={k} mode="words" onComplete={handleExerciseComplete} onStartActive={startAct} />;
      case 'word_numbers':
        return <WordPuzzle key={k} mode="numbers" onComplete={handleExerciseComplete} onStartActive={startAct} />;
      case 'match_words':
        return <WordMatching key={k} mode="words" onComplete={handleExerciseComplete} onStartActive={startAct} level={activeLevel} />;
      case 'match_numbers':
        return <WordMatching key={k} mode="numbers" onComplete={handleExerciseComplete} onStartActive={startAct} level={activeLevel} />;
      case 'flash':
        return <FlashExercise key={k} onComplete={handleExerciseComplete} onStartActive={startAct} isScored={true} level={activeLevel} />;
      case 'flash_sentence':
        return <FlashSentence key={k} onComplete={handleExerciseComplete} onStartActive={startAct} level={activeLevel} />;
      case 'flash_unscored':
        return <FlashExercise key={k} onComplete={handleExerciseComplete} onStartActive={startAct} isScored={false} level={activeLevel} />;
      case 'pathtracking':
        return <PathTracking key={k} pathType={getAutoPathTypeByLevel(activeLevel)} onComplete={handleExerciseComplete} onStartActive={startAct} />;
      case 'speedtest':
        return <SpeedTest key={k} onComplete={handleExerciseComplete} onStartActive={startAct} />;
      default:
        return <RSVPEngine key={k} onComplete={handleExerciseComplete} onStartActive={startAct} level={activeLevel} />;
    }
  };

  // Oturum Bitiminde Gösterilecek Karşılaştırma ve Sonuç Raporu Ekranı
  const renderProgramSummary = () => {
    if (!stats) return null;

    // Schulte Table gibi düşük sürenin daha iyi olduğu egzersizlerin tespiti
    const isLowerBetter = (key: string) => key === 'schulte';

    // Program listesinden puanlı egzersizleri ve bunların ilk/ikinci deneme indekslerini dinamik olarak tespit et
    const scoredKeys = Array.from(new Set(stats.programList.filter(item => 
      item !== 'rsvp' && item !== 'pathtracking' && item !== 'speedtest'
    )));

    const exerciseResults = scoredKeys.map(key => {
      const indices: number[] = [];
      stats.programList.forEach((item, idx) => {
        if (item === key) indices.push(idx);
      });
      return {
        title: EXERCISE_GUIDES[key as TabType]?.title || key,
        key,
        attempt1: stats.programScores[indices[0]] || 0,
        attempt2: stats.programScores[indices[1]] || 0
      };
    });

    let totalImprovement = 0;
    let activeCount = 0;

    const mappedResults = exerciseResults.map(res => {
      const isLower = isLowerBetter(res.key);
      let improvement = 0;

      if (res.attempt1 > 0) {
        if (isLower) {
          // Schulte için: Harcanan süre azaldıysa gelişim pozitiftir
          improvement = ((res.attempt1 - res.attempt2) / res.attempt1) * 100;
        } else {
          improvement = ((res.attempt2 - res.attempt1) / res.attempt1) * 100;
        }
      } else if (res.attempt2 > 0 && res.attempt1 === 0) {
        improvement = 100;
      }

      if (res.key !== 'pathtracking') {
        totalImprovement += improvement;
        activeCount++;
      }

      return {
        ...res,
        isLower,
        improvement: Math.round(improvement)
      };
    });

    const averageImprovement = activeCount > 0 ? Math.round(totalImprovement / activeCount) : 0;

    const handleSaveAndStartRest = () => {
      const updated = getStats();
      
      // Sonuçları geçmişe kaydet
      let sumAttempt2 = 0;
      let count = 0;
      exerciseResults.forEach(res => {
        if (res.key !== 'pathtracking') {
          sumAttempt2 += res.attempt2;
          count++;
        }
      });
      const avgScoreVal = count > 0 ? sumAttempt2 / count : 0;

      updated.sessionHistory.push({
        date: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
        avgScore: Math.round(avgScoreVal),
        improvement: Math.round(averageImprovement)
      });

      // Dinlenme süresini başlat (30 Dakika)
      updated.restEndTime = Date.now() + 30 * 60 * 1000;
      updated.programIndex = 0;
      updated.completedCountThisSession = 0;

      // Seviye gelişimine göre bir sonraki programa speedtest dahil edip etmeme kararı
      if (averageImprovement > 0) {
        // Gelişme var! Bir sonraki programın ilk adımı seviye belirleme speedtest olsun
        generateNewProgramList(updated);
        // Toplam adım sayısını 8'de tutmak için 'pathtracking' egzersizini çıkaralım
        updated.programList = ['speedtest', ...updated.programList.filter(x => x !== 'pathtracking')];
        // Program skorları dizisini program listesi boyutuyla eşitle
        updated.programScores = new Array(updated.programList.length).fill(0);
      } else {
        generateNewProgramList(updated);
      }

      saveStats(updated);
      setStats(updated);
    };

    return (
      <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md space-y-6 max-w-xl mx-auto">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto text-teal-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
            Oturum Sonuç Raporu
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            İlk 3 egzersizin dinlenme ve göz rota takibi öncesindeki ile sonrasındaki performans karşılaştırmaları.
          </p>
        </div>

        {/* Genel Gelişim Oranı */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-850 text-center space-y-1">
          <div className="text-[10px] text-slate-500 font-mono tracking-widest">BU OTURUMDAKİ GELİŞİMİNİZ</div>
          <div className={`text-4xl font-black font-mono ${averageImprovement >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {averageImprovement >= 0 ? `+${averageImprovement}%` : `${averageImprovement}%`}
          </div>
        </div>

        {/* Karşılaştırma Listesi */}
        <div className="space-y-4">
          {mappedResults.map((res, idx) => {
            const maxVal = Math.max(res.attempt1, res.attempt2, 1);
            const bar1Width = Math.round((res.attempt1 / maxVal) * 100);
            const bar2Width = Math.round((res.attempt2 / maxVal) * 100);
            
            const formatVal = (val: number) => {
              if (res.key === 'schulte') return `${val} sn`;
              if (res.key === 'rsvp' || res.key === 'speedtest') return `${val} Kelime/Dakika`;
              return `${val} Puan`;
            };

            return (
              <div key={idx} className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/80 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-300">{res.title}</span>
                  <span className={`font-mono font-bold ${res.improvement >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {res.improvement >= 0 ? `+${res.improvement}%` : `${res.improvement}%`}
                  </span>
                </div>
                
                <div className="space-y-2 font-mono text-[10px]">
                  {/* Deneme 1 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>1. Deneme</span>
                      <span>{formatVal(res.attempt1)}</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-700 rounded-full" style={{ width: `${bar1Width}%` }}></div>
                    </div>
                  </div>

                  {/* Deneme 2 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-450">
                      <span>2. Deneme (Göz Egzersizi Sonrası)</span>
                      <span className="text-teal-400 font-bold">{formatVal(res.attempt2)}</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${bar2Width}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toplam Gelişim Geçmişi Grafiği ( SVG Bar ) */}
        {stats.sessionHistory.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">TOPLAM GELİŞİM GEÇMİŞİNİZ</div>
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850 flex items-end justify-between h-24 gap-3">
              {stats.sessionHistory.slice(-6).map((hist, index) => {
                const heightPct = Math.min(100, Math.max(15, hist.improvement * 2));
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[9px] font-mono text-emerald-400 font-bold">+{hist.improvement}%</span>
                    <div 
                      className="w-full bg-teal-500/20 hover:bg-teal-500/40 rounded-t border-t border-teal-500/40 transition-all duration-300" 
                      style={{ height: `${heightPct}%` }}
                      title={`${hist.date}: +${hist.improvement}%`}
                    ></div>
                    <span className="text-[8px] font-mono text-slate-500 truncate w-full text-center">{hist.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dinlenmeyi Başlat */}
        <button
          onClick={handleSaveAndStartRest}
          className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-sm transition active:scale-95 shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
        >
          <Award className="w-4 h-4" />
          Sonuçları Kaydet ve Dinlenme Modunu Başlat
        </button>
      </div>
    );
  };

  // Format dinlenme süresi (MM:SS)
  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentUser || !activeProfile) {
    return (
      <AuthScreen 
        onProfileSelected={handleProfileSelected} 
        onLogout={() => {
          setCurrentUser(null);
          setActiveProfile(null);
        }}
      />
    );
  }

  if (!stats) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Veriler Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      
      {/* Üst Bar - Sadece Egzersiz Çalışmıyorken Göster */}
      {!isExerciseRunning && (
        <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Brain className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent m-0 leading-none">
                  Hızlı Okuma
                </h1>
                <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase m-0 mt-1 leading-none">
                  Yapay Zeka Destekli Akademi
                </p>
              </div>
            </div>
            
            {/* Sağ Kısım Eylemleri */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
              <button
                onClick={() => setIsAboutOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-850 bg-slate-950 hover:bg-slate-900 text-xs font-bold text-slate-400 hover:text-slate-200 transition flex items-center gap-1 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-teal-400" />
                Hakkında
              </button>

              {stats.hasDoneInitialTest && (
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs justify-center">
                  <button
                    onClick={() => handleModeChange('program')}
                    className={`px-3 py-1.5 rounded-lg transition font-bold text-center ${stats.trainingMode === 'program' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Eğitim Programı
                  </button>
                  <button
                    onClick={() => handleModeChange('free')}
                    className={`px-3 py-1.5 rounded-lg transition font-bold text-center ${stats.trainingMode === 'free' ? 'bg-orange-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Serbest Çalışma
                  </button>
                </div>
              )}

              {/* Profil Açılır Menü (Avatar Butonu) */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center cursor-pointer transition select-none shadow-md overflow-hidden"
                >
                  <Avatar value={activeProfile?.avatar} className="text-lg w-full h-full flex items-center justify-center" />
                </button>

                {/* Açılır Menü İçeriği */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Üst Kısım: Profil Adı */}
                    <div className="px-4 py-2 border-b border-slate-850">
                      <div className="text-xs font-black text-slate-200 truncate">{activeProfile?.name}</div>
                      <div className="text-[9px] text-slate-500 font-mono truncate text-slate-400">{currentUser?.email}</div>
                    </div>

                    {/* Ayarla / Profil Değiştir (Profil Seçme Ekranına Atar) */}
                    <button
                      onClick={() => {
                        setActiveProfile(null);
                        localStorage.removeItem(`active_profile_${currentUser?.uid}`);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-slate-100 hover:bg-slate-850 transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-teal-400" />
                      Profil Ayarla / Değiştir
                    </button>

                    {/* Gelişim Paneli */}
                    <button
                      onClick={() => {
                        setIsProgressOpen(true);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-slate-100 hover:bg-slate-850 transition flex items-center gap-2.5 cursor-pointer border-t border-slate-850"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-teal-450" />
                      Gelişim Paneli
                    </button>

                    {/* Sorun / Tavsiye Bildir */}
                    <button
                      onClick={() => {
                        const developerPhone = "905457615008"; 
                        const defaultMessage = "Merhaba, Hızlı Okuma uygulaması hakkında yazıyorum: ";
                        const whatsappUrl = `https://wa.me/${developerPhone}?text=${encodeURIComponent(defaultMessage)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-emerald-455 hover:text-emerald-350 hover:bg-slate-850 transition flex items-center gap-2.5 cursor-pointer border-t border-slate-850"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      Sorun / Tavsiye Bildir
                    </button>

                    {/* Çıkış Yap (Oturumu Kapat) */}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-450 hover:text-rose-350 hover:bg-rose-500/10 transition flex items-center gap-2.5 cursor-pointer border-t border-slate-850"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Egzersizden Çıkış Butonu (Sadece Odak Modunda Göster) */}
      {isExerciseRunning && (
        <button
          onClick={stopExercise}
          className="fixed top-6 right-6 z-50 px-4 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-250 text-xs font-bold rounded-xl transition backdrop-blur active:scale-95 shadow-lg shadow-black/40"
        >
          Egzersizden Çık
        </button>
      )}

      {/* ANA DÜZEN */}
      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 flex flex-col lg:flex-row gap-6 ${isExerciseRunning ? 'max-w-4xl py-16 justify-center items-center' : 'max-w-7xl py-5 sm:py-8'}`}>
        
        {/* SOL SÜTUN: Egzersiz Listesi (Sadece Serbest Çalışmada ve Egzersiz Başlamamışken Gösterilir) */}
        {stats.trainingMode === 'free' && !isExerciseRunning && (
          <div className="w-full lg:w-64 shrink-0">
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">ÇALIŞMA PLANI</h3>
                <p className="text-[10px] text-slate-650 font-mono mt-0.5 font-semibold">
                  Egzersiz seçip başlayın
                </p>
              </div>

              {/* Mobil için Dropdown Seçici */}
              <div className="block lg:hidden">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as TabType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-300 focus:outline-none focus:border-orange-500/80"
                >
                  <optgroup label="Puanlı Egzersizler" className="bg-slate-950 text-slate-100 font-bold">
                    {SCORED_TABS.map((tab) => (
                      <option key={tab} value={tab} className="font-normal">
                        {EXERCISE_GUIDES[tab].title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Puansız Egzersizler" className="bg-slate-950 text-slate-100 font-bold">
                    {UNSCORED_TABS.map((tab) => (
                      <option key={tab} value={tab} className="font-normal">
                        {EXERCISE_GUIDES[tab].title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Seviye Belirleme" className="bg-slate-950 text-slate-100 font-bold">
                    <option value="speedtest" className="font-normal">
                      {EXERCISE_GUIDES.speedtest.title}
                    </option>
                  </optgroup>
                </select>
              </div>

              {/* Masaüstü için Dikey Liste */}
              <div className="hidden lg:flex flex-col space-y-3">
                {/* Puanlı Egzersizler */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 font-mono tracking-wider px-2 pb-1 border-b border-slate-850">
                    PUANLI EGZERSİZLER
                  </div>
                  {SCORED_TABS.map((tab) => {
                    const isActive = activeTab === tab;
                    const tabInfo = EXERCISE_GUIDES[tab];
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition w-full text-left border ${
                          isActive
                            ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow shadow-orange-500/5'
                            : 'bg-slate-950/20 hover:bg-slate-850/40 border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        <span className="truncate">{tabInfo.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Puansız Egzersizler */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 font-mono tracking-wider px-2 pb-1 border-b border-slate-850">
                    PUANSIZ EGZERSİZLER
                  </div>
                  {UNSCORED_TABS.map((tab) => {
                    const isActive = activeTab === tab;
                    const tabInfo = EXERCISE_GUIDES[tab];
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition w-full text-left border ${
                          isActive
                            ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow shadow-orange-500/5'
                            : 'bg-slate-950/20 hover:bg-slate-850/40 border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        <span className="truncate">{tabInfo.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Seviye Ölçümü */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 font-mono tracking-wider px-2 pb-1 border-b border-slate-850">
                    SEVİYE BELİRLEME
                  </div>
                  <button
                    onClick={() => setActiveTab('speedtest')}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition w-full text-left border ${
                      activeTab === 'speedtest'
                        ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow shadow-orange-500/5'
                        : 'bg-slate-950/20 hover:bg-slate-850/40 border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                    <span className="truncate">{EXERCISE_GUIDES.speedtest.title}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORTA SÜTUN: Egzersiz Alanı */}
        <div className="flex-grow min-h-[360px] md:min-h-[460px] w-full">
          {!stats.hasDoneInitialTest ? (
            // İlk Hız Ölçümü Zorunluluk Ekranı
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md text-center max-w-xl mx-auto space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto text-teal-400 animate-pulse">
                <BookOpenCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-200">Seviye Belirleme Testi (İlk Giriş)</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Platformumuzda okuma hızınıza ve dakikadaki kelime hızınıza göre seviyelendirme yapılmaktadır. Eğitim planınızı hazırlayabilmemiz için lütfen ilk hız ölçüm testini tamamlayın.
                </p>
              </div>
              <SpeedTest onComplete={handleInitialTestComplete} />
            </div>
          ) : restTimeLeft > 0 ? (
            // Dinlenme / Göz Yoga Kilidi Ekranı
            <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-md text-center max-w-xl mx-auto space-y-8 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl"></div>
              
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto text-orange-400">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-slate-200">Harika! 8 Egzersiz Tamamlandı</h2>
                  <p className="text-xs text-slate-500">Göz sağlığınızı korumak için 30 dakika dinlenme periyodundasınız.</p>
                </div>
              </div>

              {/* Geri Sayım Sayacı */}
              <div className="bg-slate-950/80 border border-slate-850 p-6 rounded-2xl max-w-xs mx-auto">
                <div className="text-xs text-slate-500 font-mono tracking-widest">DİNLENME SÜRESİ</div>
                <div className="text-4xl font-black text-orange-400 mt-2 font-mono tracking-wider">
                  {formatRestTime(restTimeLeft)}
                </div>
              </div>

              {/* Göz Egzersiz Tavsiyesi */}
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl text-left space-y-3">
                <div className="text-xs font-bold text-slate-400 font-mono flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  ÖNERİLEN GÖZ YOGASI
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4 font-sans">
                  <li>Gözlerinizi sıkıca kapatıp 5 saniye bekleyin, ardından sonuna kadar açıp 5 saniye karşıya bakın. (5 Tekrar)</li>
                  <li>Başınızı hareket ettirmeden gözlerinizi yavaşça en yukarı, sonra en aşağı hareket ettirin.</li>
                  <li>Avuçlarınızı birbirine sürterek ısıtın ve göz kapaklarınızın üstüne koyarak sıcaklığı hissedin.</li>
                </ul>
              </div>


            </div>
          ) : stats.trainingMode === 'program' && stats.programIndex === stats.programList.length ? (
            // Program sonu Sonuç ve Karşılaştırma Ekranı
            renderProgramSummary()
          ) : stats.trainingMode === 'program' && !isExerciseRunning ? (
            // Program Yol Haritası (Dashboard)
            renderProgramRoadmap()
          ) : (
            // Aktif Egzersiz Ekranı
            renderActiveTab()
          )}
        </div>

        {/* SAĞ SÜTUN: Kullanıcı Profil & Bilgilendirme Rehberi - Sadece Egzersiz Çalışmıyorken Göster */}
        {!isExerciseRunning && (
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            
            {/* Profil Kartı */}
            {stats.hasDoneInitialTest && (
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
                {/* Çoklu Profil Aktif Durum ve Değiştirme Alanı */}
                <div className="flex items-center gap-3 border-b border-slate-850 pb-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-slate-950 p-1 border border-slate-850">
                    <Avatar value={activeProfile?.avatar} className="text-2xl w-full h-full flex items-center justify-center" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-200 truncate">{activeProfile?.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono truncate">{currentUser?.email}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setActiveProfile(null);
                        localStorage.removeItem(`active_profile_${currentUser?.uid}`);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-850 text-[10px] font-bold text-slate-300 hover:text-white transition cursor-pointer text-center w-full"
                    >
                      Profil Seç
                    </button>
                    <button
                      onClick={handleLogout}
                      className="px-2.5 py-1.5 rounded-xl border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 text-[10px] font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer text-center w-full"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400 font-mono flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-teal-400" />
                    SEVİYE KARTI
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                    <Flame className="w-3.5 h-3.5" />
                    {stats.streak} Gün Seri
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-850 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-teal-400 tracking-wider">
                    {getLevelTitle(stats.currentLevel)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Zorluk Baremi: {getLevelWpmRange(stats.currentLevel)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/80">
                    <div className="text-[10px] text-slate-500 font-mono">EN YÜKSEK HIZ</div>
                    <div className="text-[11px] font-bold text-slate-200 mt-0.5">{stats.bestWpm} K/D</div>
                  </div>
                  <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/80">
                    <div className="text-[10px] text-slate-500 font-mono">SEANS ADIMI</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">
                      {stats.trainingMode === 'program' ? `${stats.programIndex} / 8` : `${stats.completedCountThisSession} / 8`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dinamik Egzersiz Rehberi */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">EGZERSİZ REHBERİ</h3>
                <p className="text-[10px] text-slate-650 font-mono mt-0.5 font-semibold">
                  {EXERCISE_GUIDES[!stats.hasDoneInitialTest ? 'speedtest' : activeTab]?.title}
                </p>
              </div>

              <div className="space-y-4 text-xs font-sans leading-relaxed">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-teal-400 font-mono uppercase tracking-wider block">Nedir?</span>
                  <p className="text-slate-400 text-[11px]">{EXERCISE_GUIDES[!stats.hasDoneInitialTest ? 'speedtest' : activeTab]?.desc}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider block">Ne İşe Yarar?</span>
                  <p className="text-slate-400 text-[11px]">{EXERCISE_GUIDES[!stats.hasDoneInitialTest ? 'speedtest' : activeTab]?.benefit}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-orange-400 font-mono uppercase tracking-wider block">Nasıl Yapılır?</span>
                  <p className="text-slate-400 text-[11px]">{EXERCISE_GUIDES[!stats.hasDoneInitialTest ? 'speedtest' : activeTab]?.howto}</p>
                </div>
              </div>
            </div>

            {/* Organik Sayaç (Sadece Toplam) */}
            {isFirebaseConfigured && counterData && (
              <div className="flex justify-center">
                <div className="flex items-center gap-1.5 bg-slate-950/40 px-3 py-1.5 rounded-full border border-slate-900/60 text-[9px] font-mono text-slate-500 shadow-sm shadow-black/5">
                  <Users className="w-3 h-3 text-teal-500/70 animate-pulse" />
                  <span>Toplam Oturum Katılımı: <strong className="text-slate-300 font-bold">{counterData.totalLogins}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 font-mono mt-auto space-y-1">
        <div>&copy; {new Date().getFullYear()} Hızlı Okuma. Her hakkı saklıdır.</div>
        <div className="text-[10px] text-slate-500">Mebbjk tarafından Antigravity ile geliştirilmiştir.</div>
      </footer>
      
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      {stats && activeProfile && (
        <ProgressModal
          isOpen={isProgressOpen}
          onClose={() => setIsProgressOpen(false)}
          stats={stats}
          profileName={activeProfile.name}
          profileAvatar={activeProfile.avatar}
          email={currentUser?.email || ''}
        />
      )}
    </div>
  );
}

export default App;
