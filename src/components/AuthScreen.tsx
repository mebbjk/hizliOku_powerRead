import React, { useState, useEffect } from 'react';
import { authService, type UserProfile, AVATARS } from '../services/authService';
import { AboutModal } from './AboutModal';
import { Avatar } from './Avatar';
import { type UserStats } from '../utils/statsHelper';
import { 
  Brain, ShieldCheck, LogIn, 
  Plus, Check, Edit2, Info, LogOut,
  Trash2, Download, Upload, FolderInput, AlertTriangle,
  Users
} from 'lucide-react';
import { isFirebaseConfigured } from '../firebase';

interface AuthScreenProps {
  onProfileSelected: (user: { uid: string; email: string }, profile: UserProfile, allProfiles: UserProfile[]) => void;
  onLogout?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onProfileSelected, onLogout }) => {
  const [authState, setAuthState] = useState<{
    user: { uid: string; email: string } | null;
    profiles: UserProfile[];
  }>({ user: null, profiles: [] });

  const [loading, setLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Profil Oluşturma/Düzenleme Durumları
  const [showAddProfile, setShowAddProfile] = useState<boolean>(false);
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [avatarTab, setAvatarTab] = useState<'male' | 'female' | 'animal' | 'classic'>('male');

  // Cihazdaki Kayıtlı Hesaplar & Yedekleme Durumları
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [importedStats, setImportedStats] = useState<UserStats | null>(null);

  // Hakkında Modalı Durumu
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);

  // Organik Ziyaretçi/Giriş Sayaç Verisi
  const [counterData, setCounterData] = useState<{ totalLogins: number; googleLogins: number; localLogins: number } | null>(null);

  useEffect(() => {
    if (isFirebaseConfigured) {
      authService.getSessionCounter().then((data) => {
        if (data) {
          setCounterData(data);
        }
      });
    }
  }, []);

  useEffect(() => {
    // Cihaza kayıtlı hesapları yükle
    setSavedAccounts(authService.getSavedAccounts());

    // Auth dinleyicisini bağla
    const unsubscribe = authService.onStateChange((state) => {
      setAuthState({
        user: state.user,
        profiles: state.profiles
      });
      
      // Eğer kullanıcı giriş yapmışsa ve zaten önceden seçilmiş bir profil varsa otomatik başlat
      if (state.user && state.activeProfile) {
        onProfileSelected(state.user, state.activeProfile, state.profiles);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [onProfileSelected]);

  // Tek Tıkla Giriş Yapma
  const handleSavedAccountClick = async (accName: string) => {
    setLoading(true);
    setError("");
    try {
      await authService.loginSavedAccount(accName);
    } catch (err: any) {
      setError(err.message || "Giriş başarısız oldu.");
      setLoading(false);
    }
  };

  // Kayıtlı Hesabı Cihazdan Kaldırma
  const handleRemoveSavedAccount = (accName: string) => {
    authService.removeSavedAccount(accName);
    setSavedAccounts(authService.getSavedAccounts());
  };

  // Profil Verilerini JSON Olarak Dışa Aktarma (Yedek Alma)
  const handleExportProfile = () => {
    if (!editingProfileId) return;
    const profile = authState.profiles.find(p => p.id === editingProfileId);
    if (!profile) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `hizlioku-yedek-${profile.name}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // JSON Dosyasından İçe Aktarma / Birleştirme
  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>, mode: 'restore' | 'merge') => {
    const file = e.target.files?.[0];
    if (!file || !editingProfileId || !authState.user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        if (!importedData.name || !importedData.stats) {
          alert("Geçersiz yedek dosyası! Dosyanın doğru formatta olduğundan emin olun.");
          return;
        }

        const currentProfile = authState.profiles.find(p => p.id === editingProfileId);
        if (!currentProfile) return;

        let updatedStats = { ...currentProfile.stats };

        if (mode === 'restore') {
          updatedStats = { ...importedData.stats };
          setNewProfileName(importedData.name);
          setSelectedAvatar(importedData.avatar || currentProfile.avatar);
          alert("Yedek başarıyla yüklendi! Lütfen kaydetmek için alttaki 'Kaydet' butonuna basın.");
        } else if (mode === 'merge') {
          updatedStats = {
            ...currentProfile.stats,
            streak: Math.max(currentProfile.stats.streak || 0, importedData.stats.streak || 0),
            totalWordsRead: (currentProfile.stats.totalWordsRead || 0) + (importedData.stats.totalWordsRead || 0),
            bestWpm: Math.max(currentProfile.stats.bestWpm || 0, importedData.stats.bestWpm || 0),
            hasDoneInitialTest: currentProfile.stats.hasDoneInitialTest || importedData.stats.hasDoneInitialTest || false,
            highScores: {
              letterPuzzle: Math.max(currentProfile.stats.highScores.letterPuzzle || 0, importedData.stats.highScores?.letterPuzzle || 0),
              wordPuzzle: Math.max(currentProfile.stats.highScores.wordPuzzle || 0, importedData.stats.highScores?.wordPuzzle || 0),
              wordMatching: Math.max(currentProfile.stats.highScores.wordMatching || 0, importedData.stats.highScores?.wordMatching || 0),
              flashExercise: Math.max(currentProfile.stats.highScores.flashExercise || 0, importedData.stats.highScores?.flashExercise || 0),
              pathTracking: Math.max(currentProfile.stats.highScores.pathTracking || 0, importedData.stats.highScores?.pathTracking || 0)
            }
          };
          alert("Veriler başarıyla birleştirildi! Lütfen kaydetmek için alttaki 'Kaydet' butonuna basın.");
        }

        setImportedStats(updatedStats);
      } catch (err) {
        alert("Dosya okunurken hata oluştu: " + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Lütfen kullanıcı adı girin.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authService.login(username);
    } catch (err: any) {
      setError(err.message || "Giriş işlemi başarısız oldu.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await authService.loginWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google ile giriş başarısız oldu.");
      setLoading(false);
    }
  };



  const handleLogout = async () => {
    if (authState.user) {
      setLoading(true);
      await authService.logout(authState.user.uid);
      setAuthState({ user: null, profiles: [] });
      if (onLogout) onLogout();
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authState.user || !newProfileName.trim()) return;

    setLoading(true);
    try {
      const updated = await authService.addProfile(
        authState.user.uid,
        newProfileName,
        selectedAvatar,
        authState.profiles
      );
      setAuthState(prev => ({ ...prev, profiles: updated }));
      setShowAddProfile(false);
      setNewProfileName('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authState.user || !newProfileName.trim() || !editingProfileId) return;

    setLoading(true);
    try {
      const updated = await authService.updateProfile(
        authState.user.uid,
        editingProfileId,
        newProfileName,
        selectedAvatar,
        authState.profiles,
        importedStats || undefined
      );
      setAuthState(prev => ({ ...prev, profiles: updated }));
      setEditingProfileId(null);
      setImportedStats(null);
      setNewProfileName('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = (profile: UserProfile) => {
    if (!authState.user) return;
    authService.selectProfile(authState.user.uid, profile.id);
    onProfileSelected(authState.user, profile, authState.profiles);
  };

  if (loading && authState.profiles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-500 flex items-center justify-center animate-spin">
          <Brain className="w-6 h-6 text-slate-950" />
        </div>
        <div className="text-slate-400 text-xs font-mono tracking-widest uppercase">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-950 p-4 md:p-6">
      
      {/* Üst Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-500 flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Hızlı Okuma
            </h1>
          </div>
        </div>
        
        <button
          onClick={() => setIsAboutOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <Info className="w-4 h-4 text-teal-400" />
          Hakkında & Destek
        </button>
      </header>

      {/* Ana Gövde */}
      <main className="flex-1 flex items-center justify-center py-8">
        {!authState.user ? (
          // GİRİŞ EKRANI
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-teal-500/5 rounded-full blur-2xl"></div>
            
            <div className="text-center space-y-1.5">
              <h2 className="text-xl font-black text-slate-200">
                Giriş Yapın
              </h2>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Platformda kaldığınız yerden devam etmek veya yeni profil oluşturmak için bir kullanıcı adı girin.
              </p>
            </div>

            {/* Depolama Uyarısı */}
            <div className="p-3.5 bg-amber-400 border border-amber-300 rounded-2xl text-[11px] text-slate-200 leading-relaxed space-y-1.5 shadow-lg shadow-amber-500/5">
              <div className="font-black flex items-center gap-1.5 text-slate-100 text-[12px]">
                <AlertTriangle className="w-4 h-4 text-slate-100 shrink-0 animate-bounce" />
                Veri Güvenliği ve Kayıp Uyarısı
              </div>
              <p className="font-semibold text-slate-200">
                Yerel hesaplar ile açılan oturumların verileri sadece tarayıcınızın belleğinde saklanır. <strong className="text-slate-100 underline decoration-slate-100 decoration-1.5">Tarayıcı geçmişini temizleme, gizli sekme kullanımı veya temizlik araçları (CCleaner vb.)</strong> verilerinizi kalıcı olarak silebilir.
              </p>
              <div className="bg-slate-100/10 px-2 py-1.5 rounded-lg text-slate-100 font-black text-[10.5px]">
                🚀 Google ile Giriş yaparsanız verileriniz bulut veritabanımızda (Firebase) güvenle saklanır; cihaz temizliklerinden etkilenmez ve asla kaybolmaz.
              </div>
            </div>

            {/* Kayıtlı Hesaplar (Tek Tıkla Giriş) */}
            {savedAccounts.length > 0 && (
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-500 tracking-wider font-mono uppercase block">CİHAZDAKİ KAYITLI HESAPLAR (TEK TIKLA GİRİŞ)</label>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {savedAccounts.map((accName) => (
                    <div key={accName} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-850 hover:border-slate-800 transition">
                      <button
                        type="button"
                        onClick={() => handleSavedAccountClick(accName)}
                        className="flex-1 text-left text-xs font-semibold text-slate-300 hover:text-teal-400 transition cursor-pointer truncate"
                        title="Tek tıkla giriş yap"
                      >
                        👤 {accName}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSavedAccount(accName)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition cursor-pointer"
                        title="Bu cihazdan kaldır"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl font-semibold leading-relaxed">
                {error}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 tracking-wider font-mono">KULLANICI ADI</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınızı girin..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-xs font-semibold text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-500/10"
              >
                <LogIn className="w-4 h-4" />
                Giriş Yap
              </button>
            </form>

            {/* Google ile Giriş Butonu */}
            <div className="space-y-3">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-850"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-600 font-mono tracking-wider">VEYA</span>
                <div className="flex-grow border-t border-slate-850"></div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-slate-200 hover:text-white font-bold rounded-xl text-xs transition active:scale-98 flex items-center justify-center gap-3.5 cursor-pointer border border-slate-800 hover:border-slate-700 shadow-lg shadow-black/25"
              >
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google ile Giriş Yap
              </button>
            </div>
          </div>
        ) : (
          // ÇOKLU PROFİL SEÇİM EKRANI
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-teal-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center justify-between border-b border-slate-850 pb-4">
              <div className="text-left space-y-1">
                <h2 className="text-lg font-black text-slate-200">Kim Çalışıyor?</h2>
                <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                  Hesap: {authState.user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 text-xs font-bold text-rose-400 hover:text-rose-350 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Çıkış Yap
              </button>
            </div>

            {/* Profil Listesi */}
            {!showAddProfile && editingProfileId === null ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {authState.profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="group relative bg-slate-950/60 hover:bg-slate-950 border border-slate-850 hover:border-teal-500/30 p-5 rounded-2xl flex flex-col items-center justify-center space-y-3 transition-all duration-200 cursor-pointer shadow hover:shadow-teal-500/5"
                      onClick={() => handleSelectProfile(profile)}
                    >
                      {/* Profil Düzenle Butonu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProfileId(profile.id);
                          setNewProfileName(profile.name);
                          setSelectedAvatar(profile.avatar);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                        title="Profili Düzenle"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-800">
                        <Avatar value={profile.avatar} className="text-3xl w-full h-full flex items-center justify-center" />
                      </div>
                      <div className="text-xs font-bold text-slate-200 truncate w-full text-center">
                        {profile.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono tracking-widest">
                        SEVİYE {profile.level}
                      </div>
                    </div>
                  ))}

                  {/* Yeni Profil Ekleme Butonu */}
                  <button
                    onClick={() => {
                      setShowAddProfile(true);
                      setNewProfileName('');
                      setSelectedAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
                    }}
                    className="bg-slate-950/20 hover:bg-slate-950 border border-dashed border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col items-center justify-center space-y-2 transition cursor-pointer text-slate-500 hover:text-slate-400"
                  >
                    <Plus className="w-8 h-8" />
                    <span className="text-xs font-bold font-mono">YENİ PROFİL</span>
                  </button>
                </div>
              </div>
            ) : (
              // PROFİL OLUŞTURMA VEYA DÜZENLEME FORMU
              <form onSubmit={editingProfileId ? handleUpdateProfile : handleCreateProfile} className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-slate-350">
                    {editingProfileId ? 'Profili Düzenle' : 'Yeni Profil Oluştur'}
                  </h3>
                </div>
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-slate-850 flex items-center justify-center shadow-inner relative overflow-hidden">
                    <Avatar value={selectedAvatar} className="text-4xl w-full h-full flex items-center justify-center" />
                  </div>
                </div>

                {/* Avatar Seçim Listesi (Kategorilendirilmiş) */}
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-slate-500 tracking-wider font-mono">AVATAR SEÇİN</label>
                  
                  {/* Kategori Seçici Sekmeler */}
                  <div className="flex bg-slate-950 p-1 rounded-xl text-[10px] font-mono border border-slate-850 justify-between gap-1">
                    {(['male', 'female', 'animal', 'classic'] as const).map((tab) => {
                      const titles = {
                        male: "ERKEK",
                        female: "KADIN",
                        animal: "HAYVAN",
                        classic: "EMOJİ"
                      };
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setAvatarTab(tab)}
                          className={`flex-1 py-1 rounded-lg font-bold text-center transition cursor-pointer ${
                            avatarTab === tab ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-500 hover:text-slate-355'
                          }`}
                        >
                          {titles[tab]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Seçilen Kategori Avatarları Grid */}
                  <div className="grid grid-cols-5 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-850 h-36 overflow-y-auto">
                    {(() => {
                      const getAvatarList = () => {
                        switch (avatarTab) {
                          case 'male':
                            return Array.from({ length: 24 }, (_, i) => `path:/Avatar/Erkek/${String(i + 1).padStart(2, '0')}.png`);
                          case 'female':
                            return Array.from({ length: 20 }, (_, i) => `path:/Avatar/Kadın/${String(i + 1).padStart(2, '0')}.png`);
                          case 'animal':
                            return Array.from({ length: 24 }, (_, i) => `path:/Avatar/Hayvan/${String(i + 1).padStart(2, '0')}.png`);
                          case 'classic':
                            return AVATARS;
                        }
                      };
                      return getAvatarList().map((avatarVal) => (
                        <button
                          key={avatarVal}
                          type="button"
                          onClick={() => setSelectedAvatar(avatarVal)}
                          className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer bg-slate-900 border ${
                            selectedAvatar === avatarVal ? 'border-teal-500 bg-teal-500/10 shadow shadow-teal-500/15' : 'border-slate-800'
                          }`}
                        >
                          <Avatar value={avatarVal} className="text-2xl w-full h-full flex items-center justify-center" />
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                <div className="space-y-1 mt-4">
                  <label className="text-[9px] font-bold text-slate-500 tracking-wider font-mono">PROFİL ADI</label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Örn: Mehmet..."
                    maxLength={15}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-xs font-semibold text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
                    required
                  />
                </div>

                {editingProfileId && (
                  <div className="space-y-2 border-t border-slate-855 pt-4">
                    <label className="text-[9px] font-bold text-slate-500 tracking-wider font-mono">VERİ YÖNETİMİ (YEDEK AL & YÜKLE)</label>
                    
                    {authState.user?.uid.startsWith('local-') ? (
                      <p className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-xl leading-relaxed">
                        ⚠️ <strong>Yerel Giriş:</strong> İstatistikleriniz yalnızca bu tarayıcıda saklanır. Tarayıcı geçmişini temizlerseniz verileriniz kaybolur. Kayıp yaşamamak için düzenli olarak <strong>Yedek Al</strong> butonunu kullanmanız önerilir.
                      </p>
                    ) : (
                      <p className="text-[10px] text-teal-400 bg-teal-500/5 border border-teal-500/10 p-2.5 rounded-xl leading-relaxed">
                        ☁️ <strong>Google Girişi:</strong> Verileriniz bulutta (Firebase) güvenle saklanmaktadır. Yedek alma ve yükleme işlemlerini verilerinizi farklı cihazlara aktarmak veya yedeklemek için kullanabilirsiniz.
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={handleExportProfile}
                        className="py-2.5 px-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:text-slate-200 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                        title="Profil istatistiklerinizi dosya olarak yedekleyin."
                      >
                        <Download className="w-4 h-4 text-teal-400 animate-pulse" />
                        Yedek Al
                      </button>

                      <label className="py-2.5 px-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:text-slate-200 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
                        <Upload className="w-4 h-4 text-indigo-400" />
                        Yükle
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => handleImportProfile(e, 'restore')}
                          className="hidden"
                        />
                      </label>

                      <label className="py-2.5 px-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:text-slate-200 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
                        <FolderInput className="w-4 h-4 text-orange-400" />
                        Birleştir
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => handleImportProfile(e, 'merge')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddProfile(false);
                      setEditingProfileId(null);
                    }}
                    className="flex-1 py-3 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition shadow-lg shadow-teal-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Kaydet
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Organik Sayaç */}
      {isFirebaseConfigured && counterData && (
        <div className="max-w-6xl w-full mx-auto flex justify-center mb-1">
          <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-full border border-slate-900/60 text-[10px] font-mono text-slate-500 shadow-sm shadow-black/5">
            <Users className="w-3.5 h-3.5 text-teal-500/70 animate-pulse" />
            <span>Toplam Oturum: <strong className="text-slate-300 font-bold">{counterData.totalLogins}</strong></span>
            <span className="text-slate-800">|</span>
            <span className="text-[9px]">Google: <strong className="text-slate-450">{counterData.googleLogins}</strong></span>
            <span className="text-slate-800">|</span>
            <span className="text-[9px]">Kullanıcı Adı: <strong className="text-slate-450">{counterData.localLogins}</strong></span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center py-4 border-t border-slate-900 text-[10px] text-slate-650 font-mono flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>&copy; {new Date().getFullYear()} Hızlı Okuma. Her hakkı saklıdır.</div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
          <span>Mebbjk tarafından Antigravity ile geliştirilmiştir.</span>
        </div>
      </footer>

      {/* Hakkında Modalı */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
};
