import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, syncUserProfile, OUR_COUPLE_ID } from './lib/firebase';
import { UserProfile } from './types';
import { AuthCard } from './components/AuthCard';
import { LightHomeScreen } from './components/LightHomeScreen';
import { Heart, Loader2, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchProfile = async (firebaseUser: any) => {
    if (firebaseUser) {
      try {
        setLoadError(null);
        const profile = await syncUserProfile(firebaseUser);
        setCurrentUser(profile);
      } catch (error: any) {
        console.error('Lỗi đồng bộ hồ sơ:', error);
        // Resilient fallback user so app never gets stuck on white screen
        const email = (firebaseUser.email || '').toLowerCase().trim();
        const isD = email.includes('duong') || email === 'tdwoodart@gmail.com';
        const fallbackProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || (isD ? 'Dương' : 'Chúc Gà'),
          coupleId: OUR_COUPLE_ID,
          roleTitle: isD ? 'Anh' : 'Em',
          gender: isD ? 'male' : 'female',
          createdAt: new Date().toISOString()
        };
        setCurrentUser(fallbackProfile);
      }
    } else {
      setCurrentUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Timeout safeguard: If loading takes longer than 6 seconds, force loading to false so user is never stuck
    const timer = setTimeout(() => {
      setLoading(false);
    }, 6000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timer);
      if (user) {
        await fetchProfile(user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const handleRefreshProfile = () => {
    if (auth.currentUser) {
      fetchProfile(auth.currentUser);
    }
  };

  const handleForceReload = () => {
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn(e);
    }
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 space-y-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-500 animate-pulse">
            <Heart className="w-7 h-7 fill-rose-500" />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
          </div>
        </div>
        <p className="text-xs font-semibold text-slate-500 tracking-wide">
          Đang kết nối không gian yêu thương...
        </p>
        <button
          type="button"
          onClick={handleForceReload}
          className="text-[11px] text-slate-400 hover:text-rose-600 underline transition cursor-pointer pt-4"
        >
          Nếu tải quá lâu, bấm vào đây để làm mới
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-rose-100 selection:text-rose-700">
      {!currentUser ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-rose-50 via-slate-50 to-pink-50 relative overflow-hidden">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

          {/* Login Container */}
          <div className="w-full relative z-10">
            <AuthCard onSuccess={() => handleRefreshProfile()} />
          </div>

          <footer className="mt-8 text-center text-xs text-slate-400 font-medium">
            Us — Couple App 💕
          </footer>
        </div>
      ) : (
        <LightHomeScreen 
          userProfile={currentUser} 
          onRefreshProfile={handleRefreshProfile} 
        />
      )}
    </div>
  );
}
