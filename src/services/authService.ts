import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  increment
} from 'firebase/firestore';
import { db, auth, googleProvider, isFirebaseConfigured } from '../firebase';
import { type UserStats, getStats } from '../utils/statsHelper';

// Profil Arayüzü
export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // Emoji
  level: number;
  stats: UserStats;
}

// Oturum Durumu Arayüzü
export interface AuthState {
  user: {
    uid: string;
    email: string;
    displayName?: string;
  } | null;
  activeProfile: UserProfile | null;
  profiles: UserProfile[];
  loading: boolean;
}

// Varsayılan Avatarlar (Emojiler)
export const AVATARS = [
  "🦉", "🦁", "🦊", "🐼", "🐻", "🦄", "🦅", "🐬", "🐯", "🐆", "🦈", "🦖",
  "👨‍🎓", "👩‍🎓", "🧠", "🚀", "🎯", "📚", "⚡", "💡", "🌟", "🏆", "🔥", "🎨",
  "🎭", "🎒", "🎓", "🧩", "👾", "🤖", "🐱", "🐶", "🐰", "🐸", "🐵", "🐨", 
  "🐘", "🛸", "🌍", "🌈", "💻", "🎮", "🖊️", "🔑", "🍿", "🥑", "🍕", "🎈"
];

// Yerel veri depolama anahtarları
const LOCAL_USERS_KEY = "hizlioku_local_users"; // { username: password }
const LOCAL_PROFILES_KEY_PREFIX = "hizlioku_profiles_"; // local_profiles_username
const SAVED_ACCOUNTS_KEY = "hizlioku_saved_accounts"; // ["username1", "username2"]

// Giriş yapılan hesabı kayıtlı listeye ekle
const saveAccountToSavedList = (username: string) => {
  const saved = authService.getSavedAccounts();
  if (!saved.includes(username)) {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify([...saved, username]));
  }
};

// Firebase aktif değilse yerel kullanıcı listesini getir
const getLocalUsers = (): Record<string, string> => {
  const data = localStorage.getItem(LOCAL_USERS_KEY);
  return data ? JSON.parse(data) : {};
};

// Yerel profilleri getir
const getLocalProfiles = (username: string): UserProfile[] => {
  const data = localStorage.getItem(LOCAL_PROFILES_KEY_PREFIX + username);
  return data ? JSON.parse(data) : [];
};

// Yerel profilleri kaydet
const saveLocalProfiles = (username: string, profiles: UserProfile[]) => {
  localStorage.setItem(LOCAL_PROFILES_KEY_PREFIX + username, JSON.stringify(profiles));
};

let localListeners: ((state: AuthState) => void)[] = [];

const notifyLocalListeners = () => {
  const rememberedSession = localStorage.getItem("hizlioku_local_session");
  let state: AuthState;
  if (rememberedSession) {
    const username = rememberedSession;
    const profiles = getLocalProfiles(username);
    const rememberedProfileId = localStorage.getItem(`active_profile_${username}`);
    const activeProfile = profiles.find(p => p.id === rememberedProfileId) || null;
    state = {
      user: { uid: 'local-' + username, email: username },
      profiles,
      activeProfile,
      loading: false
    };
  } else {
    state = {
      user: null,
      profiles: [],
      activeProfile: null,
      loading: false
    };
  }
  localListeners.forEach(cb => cb(state));
};

export const authService = {
  // Cihaza kayıtlı hesapları getir
  getSavedAccounts: (): string[] => {
    const data = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    try {
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Cihazdan kayıtlı bir hesabı sil
  removeSavedAccount: (username: string) => {
    const saved = authService.getSavedAccounts();
    const updated = saved.filter(u => u !== username);
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  },
  // Dinleyici: Oturum ve Profil durumunu dinler
  onStateChange: (callback: (state: AuthState) => void) => {
    // Her durumda yerel dinleyicilere ekle (Böylece local- girişler notifyLocalListeners ile anında tetiklenir)
    localListeners.push(callback);

    let unsubscribeFirebase = () => {};

    if (isFirebaseConfigured && auth) {
      unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const uid = firebaseUser.uid;
          const email = firebaseUser.email || firebaseUser.displayName || 'user';
          
          // Firestore'dan profilleri çek (5 saniye zaman aşımı ile)
          let profiles: UserProfile[] = [];
          try {
            const userDocRef = doc(db, 'users', uid);
            
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error("Firestore timeout")), 5000)
            );
            
            const userSnap = await Promise.race([
              getDoc(userDocRef),
              timeoutPromise
            ]);
            
            if (userSnap.exists()) {
              const data = userSnap.data();
              profiles = data.profiles || [];
            } else {
              // Yeni Firestore kullanıcısı oluştur
              const defaultProfile: UserProfile = {
                id: 'p1',
                name: firebaseUser.displayName || email.split('@')[0],
                avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
                level: 1,
                stats: getStats()
              };
              profiles = [defaultProfile];
              await Promise.race([
                setDoc(userDocRef, { email, profiles }),
                timeoutPromise
              ]);
            }
          } catch (e) {
            console.error("Firestore profilleri yüklenirken hata veya zaman aşımı, oturum kapatılıyor:", e);
            alert("Firestore veritabanı erişim izni bulunamadı veya bağlantı zaman aşımına uğradı. Google ile giriş yapabilmek için Firestore veritabanının aktif olması gerekmektedir. Giriş sayfasına yönlendiriliyorsunuz.");
            await signOut(auth);
            callback({
              user: null,
              profiles: [],
              activeProfile: null,
              loading: false
            });
            return;
          }

          // LocalStorage'dan aktif profili hatırla
          const rememberedProfileId = localStorage.getItem(`active_profile_${uid}`);
          const activeProfile = profiles.find(p => p.id === rememberedProfileId) || null;

          // Oturum sayacını artır (Google girişi)
          authService.incrementSessionCounter('google');

          callback({
            user: { uid, email, displayName: firebaseUser.displayName || undefined },
            profiles,
            activeProfile,
            loading: false
          });
        } else {
          // Firebase kullanıcısı yoksa, yerel oturum var mı kontrol et
          const rememberedSession = localStorage.getItem("hizlioku_local_session");
          if (rememberedSession) {
            const username = rememberedSession;
            const profiles = getLocalProfiles(username);
            const rememberedProfileId = localStorage.getItem(`active_profile_${username}`);
            const activeProfile = profiles.find(p => p.id === rememberedProfileId) || null;

            // Oturum sayacını artır (Yerel giriş)
            authService.incrementSessionCounter('local');

            callback({
              user: { uid: 'local-' + username, email: username },
              profiles,
              activeProfile,
              loading: false
            });
          } else {
            callback({
              user: null,
              profiles: [],
              activeProfile: null,
              loading: false
            });
          }
        }
      });
    }

    // İlk yüklemede veya Firebase aktif değilse yerel oturumu başlat
    const rememberedSession = localStorage.getItem("hizlioku_local_session");
    if (rememberedSession) {
      const username = rememberedSession;
      const profiles = getLocalProfiles(username);
      const rememberedProfileId = localStorage.getItem(`active_profile_${username}`);
      const activeProfile = profiles.find(p => p.id === rememberedProfileId) || null;

      // Oturum sayacını artır (Yerel giriş)
      authService.incrementSessionCounter('local');

      callback({
        user: { uid: 'local-' + username, email: username },
        profiles,
        activeProfile,
        loading: false
      });
    } else if (!isFirebaseConfigured || !auth) {
      callback({
        user: null,
        profiles: [],
        activeProfile: null,
        loading: false
      });
    }

    // Listener temizleme fonksiyonu
    return () => {
      localListeners = localListeners.filter(cb => cb !== callback);
      unsubscribeFirebase();
    };
  },

  // E-Posta / Şifre Kayıt (Sadece Yerel Mod)
  register: async (username: string): Promise<string> => {
    const u = username.trim();
    if (!u) {
      throw new Error("Lütfen geçerli bir kullanıcı adı girin!");
    }
    const usernameKey = u;
    
    // Varsayılan ilk profili oluştur (yoksa)
    const profiles = getLocalProfiles(usernameKey);
    if (profiles.length === 0) {
      const defaultProfile: UserProfile = {
        id: 'p1',
        name: u,
        avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
        level: 1,
        stats: getStats()
      };
      saveLocalProfiles(usernameKey, [defaultProfile]);
    }
    
    saveAccountToSavedList(usernameKey);
    localStorage.setItem("hizlioku_local_session", usernameKey);
    authService.incrementSessionCounter('local');
    notifyLocalListeners();
    return 'local-' + usernameKey;
  },

  // E-Posta / Şifre Giriş (Sadece Yerel Mod)
  login: async (username: string): Promise<string> => {
    const u = username.trim();
    if (!u) {
      throw new Error("Lütfen geçerli bir kullanıcı adı girin!");
    }
    const usernameKey = u;
    
    // Varsayılan ilk profili oluştur (yoksa)
    const profiles = getLocalProfiles(usernameKey);
    if (profiles.length === 0) {
      const defaultProfile: UserProfile = {
        id: 'p1',
        name: u,
        avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
        level: 1,
        stats: getStats()
      };
      saveLocalProfiles(usernameKey, [defaultProfile]);
    }

    localStorage.setItem("hizlioku_local_session", usernameKey);
    saveAccountToSavedList(usernameKey);
    authService.incrementSessionCounter('local');
    notifyLocalListeners();
    return 'local-' + usernameKey;
  },

  // Google ile Giriş (Firebase varsa gerçek, yoksa Simüle Modu)
  loginWithGoogle: async (): Promise<string> => {
    if (isFirebaseConfigured && auth && googleProvider) {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user.email) {
        saveAccountToSavedList(cred.user.email);
      }
      return cred.user.uid;
    } else {
      // Çevrimdışı/Simüle Google Girişi
      const simEmail = "google-test-user@gmail.com";
      const simUid = "local-google-test";
      
      const users = getLocalUsers();
      if (!users[simEmail]) {
        users[simEmail] = "google-oauth-simulated";
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        
        const defaultProfile: UserProfile = {
          id: 'p1',
          name: "Google Kullanıcısı",
          avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
          level: 1,
          stats: getStats()
        };
        saveLocalProfiles(simEmail, [defaultProfile]);
      }
      
      localStorage.setItem("hizlioku_local_session", simEmail);
      saveAccountToSavedList(simEmail);
      notifyLocalListeners();
      return simUid;
    }
  },

  // Çıkış Yap
  logout: async (usernameOrUid: string) => {
    localStorage.removeItem("hizlioku_local_session");
    localStorage.removeItem(`active_profile_${usernameOrUid}`);
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    } else {
      notifyLocalListeners();
    }
  },

  // Tek Tıkla Giriş
  loginSavedAccount: async (username: string): Promise<string> => {
    localStorage.setItem("hizlioku_local_session", username);
    authService.incrementSessionCounter('local');
    notifyLocalListeners();
    return 'local-' + username;
  },

  // Profil Seç
  selectProfile: (usernameOrUid: string, profileId: string) => {
    localStorage.setItem(`active_profile_${usernameOrUid}`, profileId);
    if (!isFirebaseConfigured) {
      notifyLocalListeners();
    }
  },

  // Yeni Profil Ekle (Tek Mail ile Çoklu Profil)
  addProfile: async (usernameOrUid: string, name: string, avatar: string, currentProfiles: UserProfile[]): Promise<UserProfile[]> => {
    const newProfile: UserProfile = {
      id: 'p-' + Date.now(),
      name,
      avatar,
      level: 1,
      stats: getStats()
    };
    const updated = [...currentProfiles, newProfile];

    if (isFirebaseConfigured && auth && !usernameOrUid.startsWith('local-')) {
      try {
        const userDocRef = doc(db, 'users', usernameOrUid);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Firestore timeout")), 5000)
        );
        await Promise.race([
          updateDoc(userDocRef, { profiles: updated }),
          timeoutPromise
        ]);
      } catch (e) {
        console.warn("Firestore'a profil eklenirken hata veya zaman aşımı, yerel depolanıyor:", e);
        saveLocalProfiles(usernameOrUid, updated);
      }
    } else {
      const username = usernameOrUid.replace('local-', '');
      saveLocalProfiles(username, updated);
      notifyLocalListeners();
    }
    return updated;
  },

  // Profil Güncelle (İsim, Avatar ve İstatistik Değiştirme)
  updateProfile: async (usernameOrUid: string, profileId: string, name: string, avatar: string, currentProfiles: UserProfile[], stats?: UserStats): Promise<UserProfile[]> => {
    const updated = currentProfiles.map(p => {
      if (p.id === profileId) {
        return { 
          ...p, 
          name, 
          avatar,
          stats: stats || p.stats,
          level: stats ? stats.currentLevel : p.level
        };
      }
      return p;
    });

    if (isFirebaseConfigured && auth && !usernameOrUid.startsWith('local-')) {
      try {
        const userDocRef = doc(db, 'users', usernameOrUid);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Firestore timeout")), 5000)
        );
        await Promise.race([
          updateDoc(userDocRef, { profiles: updated }),
          timeoutPromise
        ]);
      } catch (e) {
        console.warn("Firestore'da profil güncellenirken hata veya zaman aşımı, yerel depolanıyor:", e);
        saveLocalProfiles(usernameOrUid, updated);
      }
    } else {
      const username = usernameOrUid.replace('local-', '');
      saveLocalProfiles(username, updated);
      notifyLocalListeners();
    }
    return updated;
  },

  // İstatistikleri Profile Kaydet (Egzersiz bittiğinde anlık yedekleme)
  saveProfileStats: async (usernameOrUid: string, profileId: string, stats: UserStats, currentProfiles: UserProfile[]) => {
    const updated = currentProfiles.map(p => {
      if (p.id === profileId) {
        return { ...p, stats, level: stats.currentLevel };
      }
      return p;
    });

    if (isFirebaseConfigured && auth && !usernameOrUid.startsWith('local-')) {
      try {
        const userDocRef = doc(db, 'users', usernameOrUid);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Firestore timeout")), 5000)
        );
        await Promise.race([
          updateDoc(userDocRef, { profiles: updated }),
          timeoutPromise
        ]);
      } catch (e) {
        console.warn("Firestore'a skorlar yazılırken hata veya zaman aşımı, yerel depolanıyor:", e);
        saveLocalProfiles(usernameOrUid, updated);
      }
    } else {
      const username = usernameOrUid.replace('local-', '');
      saveLocalProfiles(username, updated);
    }
  },

  // Organik Sayaç Artırma (Tekil oturum korumalı)
  incrementSessionCounter: async (method: 'google' | 'local') => {
    if (!isFirebaseConfigured || !db) return;
    
    // Aynı tarayıcı oturumunda mükerrer sayımı engelle
    const alreadyIncremented = sessionStorage.getItem('hizlioku_session_counted');
    if (alreadyIncremented) return;
    
    try {
      sessionStorage.setItem('hizlioku_session_counted', 'true');
      const counterDocRef = doc(db, 'system', 'counters');
      const counterSnap = await getDoc(counterDocRef);
      
      if (counterSnap.exists()) {
        await updateDoc(counterDocRef, {
          totalLogins: increment(1),
          [method === 'google' ? 'googleLogins' : 'localLogins']: increment(1)
        });
      } else {
        // İlk kurulum: 43 değerinden başla
        await setDoc(counterDocRef, {
          totalLogins: 43,
          googleLogins: method === 'google' ? 20 : 19,
          localLogins: method === 'local' ? 24 : 23
        });
      }
    } catch (e) {
      console.warn("Sayaç güncellenemedi:", e);
      // Hata durumunda sessionStorage'ı temizleyelim ki bir sonraki denemede tekrar denesin
      sessionStorage.removeItem('hizlioku_session_counted');
    }
  },

  // Sayaç Değerini Getir
  getSessionCounter: async (): Promise<{ totalLogins: number; googleLogins: number; localLogins: number } | null> => {
    if (!isFirebaseConfigured || !db) return null;
    try {
      const counterDocRef = doc(db, 'system', 'counters');
      const counterSnap = await getDoc(counterDocRef);
      if (counterSnap.exists()) {
        const data = counterSnap.data();
        return {
          totalLogins: data.totalLogins || 43,
          googleLogins: data.googleLogins || 20,
          localLogins: data.localLogins || 23
        };
      }
      return { totalLogins: 43, googleLogins: 20, localLogins: 23 };
    } catch (e) {
      console.warn("Sayaç okunamadı:", e);
      return null;
    }
  }
};
