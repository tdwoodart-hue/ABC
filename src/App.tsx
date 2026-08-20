import React, { useState, useEffect, useCallback } from 'react';
import { auth, onAuthStateChanged, syncUserProfile } from './lib/firebase';
import { UserProfile } from './types';
import { AuthCard } from './components/AuthCard';
import { LightHomeScreen } from './components/LightHomeScreen';
import { LoadingSplash } from './components/LoadingSplash';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const fetchProfile = async (firebaseUser: any) => {
    if (firebaseUser) {
      try {
        const profile = await syncUserProfile(firebaseUser);
        setCurrentUser(profile);
      } catch (error) {
        console.error('Lỗi đồng bộ hồ sơ:', error);
      }
    } else {
      setCurrentUser(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchProfile(user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleRefreshProfile = () => {
    if (auth.currentUser) {
      fetchProfile(auth.currentUser);
    }
  };

  const handleSplashFinished = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-rose-100 selection:text-rose-700">
      {!loading && (
        !currentUser ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-rose-50 via-slate-50 to-pink-50 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

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
        )
      )}

      {showSplash && (
        <LoadingSplash
          ready={!loading}
          onFinished={handleSplashFinished}
        />
      )}
    </div>
  );
}