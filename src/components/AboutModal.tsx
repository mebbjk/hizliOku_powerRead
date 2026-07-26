import React from 'react';
import { Coffee, Heart, ShieldCheck, Star, X, Link as LinkIcon } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md transition-all duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Kapatma Butonu */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer z-50 shadow-md hover:scale-105 active:scale-95"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ana Destek Gövdesi (Yeşil Alan) */}
        <div className="bg-gradient-to-br from-teal-400 via-emerald-400 to-emerald-500 border border-emerald-300 rounded-2xl p-6 md:p-8 text-slate-100 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-44 h-44 bg-black/5 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 rounded-full border-4 border-emerald-300/40 overflow-hidden shadow-xl bg-slate-950 hover:scale-105 transition-all duration-300">
              <img src="/profile.png" alt="Profil Resmi" className="w-full h-full object-cover" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-100">Hakkında & Destek Ol</h2>
            <p className="text-slate-200 text-xs md:text-sm leading-relaxed max-w-md font-bold">
              Bu uygulama okuma hızınızı, çevre görüş açınızı ve anlık odaklanma reflekslerinizi bilimsel egzersizlerle geliştirmek için özenle kodlandı. Gelişime katkıda bulunmak isterseniz bir çay veya kahve ısmarlayabilirsiniz! 🥤☕
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full justify-center max-w-sm">
              <a 
                href="https://www.shopier.com/mebbjk/45722046" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-950 px-5 py-3 rounded-xl text-xs font-black hover:scale-105 active:scale-95 transition-all shadow-md w-full sm:w-auto cursor-pointer"
              >
                <Coffee className="w-4 h-4 text-emerald-600" /> İçecek Ismarla ☕
              </a>
              <a 
                href="https://linktr.ee/mebbjk" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center justify-center gap-2 bg-slate-200/40 border border-slate-800/10 text-slate-100 px-5 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all w-full sm:w-auto cursor-pointer shadow-md"
              >
                <LinkIcon className="w-4 h-4" /> İletişim & Projeler
              </a>
            </div>
          </div>
        </div>

        {/* 3'lü Değer Kartı */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-center hover:border-teal-500/20 transition-all">
            <Heart className="w-8 h-8 mx-auto text-teal-400 mb-2" />
            <h3 className="font-bold text-xs text-slate-200 mb-1">Sürekli Gelişim</h3>
            <p className="text-[10px] text-slate-500 leading-normal">Destekleriniz uygulamanın daha da akıllı hale gelmesini sağlar.</p>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-center hover:border-indigo-500/20 transition-all">
            <ShieldCheck className="w-8 h-8 mx-auto text-indigo-400 mb-2" />
            <h3 className="font-bold text-xs text-slate-200 mb-1">Sunucu Desteği</h3>
            <p className="text-[10px] text-slate-500 leading-normal">Uygulamanın uzun yıllar kesintisiz çalışması için destek olun.</p>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-center hover:border-orange-500/20 transition-all">
            <Star className="w-8 h-8 mx-auto text-orange-400 mb-2" />
            <h3 className="font-bold text-xs text-slate-200 mb-1">Özel Geliştirme</h3>
            <p className="text-[10px] text-slate-500 leading-normal">Size özel yeni ekranlar/özellikler tasarlanması için destek olun.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
