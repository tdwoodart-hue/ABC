// App.tsx — FAST START VERSION
import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  auth,
  checkIsAdmin,
  isChucGaAccount,
  isDuongAccount,
  onAuthStateChanged,
  OUR_COUPLE_ID,
  syncUserProfile,
} from './lib/firebase';

import type { UserProfile } from './types';

import { AuthCard } from './components/AuthCard';
import { LoadingSplash } from './components/LoadingSplash';

/*
 * IMPORTANT:
 * LightHomeScreen is intentionally NOT statically imported.
 *
 * It pulls in Finance, Nutrition, Achievements, Admin, Maps,
 * Lightbox, Camera, Journal, etc. Splitting it into a lazy chunk
 * lets the splash render immediately while the heavy app code
 * downloads in parallel.
 */
const loadLightHomeScreen = () =>
  import('./components/LightHomeScreen');

const LazyLightHomeScreen = lazy(async () => {
  const module = await loadLightHomeScreen();

  return {
    default: module.LightHomeScreen,
  };
});

function makeInstantProfile(firebaseUser: any): UserProfile {
  const email = (firebaseUser?.email || '')
    .toLowerCase()
    .trim();

  const isDuong = isDuongAccount(email);
  const isChucGa = isChucGaAccount(email);

  let displayName = '';

  if (
    firebaseUser?.displayName &&
    !firebaseUser.displayName.includes('@')
  ) {
    displayName = firebaseUser.displayName;
  } else if (isDuong) {
    displayName = 'Dương';
  } else if (isChucGa) {
    displayName = 'Chúc Gà';
  } else if (email) {
    displayName = email.split('@')[0];
  } else {
    displayName = 'Người dùng';
  }

  const gender: UserProfile['gender'] = isDuong
    ? 'male'
    : isChucGa
      ? 'female'
      : undefined;

  const roleTitle = isDuong
    ? 'Anh'
    : isChucGa
      ? 'Em'
      : undefined;

  const instantProfile: UserProfile = {
    uid: firebaseUser.uid,
    email,
    displayName,
    photoURL: firebaseUser.photoURL || undefined,
    avatarUrl: firebaseUser.photoURL || undefined,

    // This app already uses one fixed couple space.
    // Do not wait for Firestore just to learn this value.
    coupleId: OUR_COUPLE_ID,

    createdAt: new Date().toISOString(),

    gender,
    roleTitle,
  };

  instantProfile.isAdmin =
    checkIsAdmin(instantProfile);

  return instantProfile;
}

export default function App() {
  const [currentUser, setCurrentUser] =
    useState<UserProfile | null>(null);

  /*
   * authResolved means Firebase Auth has told us whether
   * somebody is signed in.
   *
   * It does NOT wait for syncUserProfile().
   */
  const [authResolved, setAuthResolved] =
    useState(false);

  /*
   * Heavy Home code is loaded during the splash.
   * The splash will not reveal the page before this chunk is ready.
   */
  const [homeCodeReady, setHomeCodeReady] =
    useState(false);

  const [showSplash, setShowSplash] =
    useState(true);

  /*
   * Preload the heavy Home module as soon as the app starts.
   * This runs in parallel with Firebase Auth.
   */
  useEffect(() => {
    let alive = true;

    loadLightHomeScreen()
      .then(() => {
        if (alive) {
          setHomeCodeReady(true);
        }
      })
      .catch((error) => {
        console.error(
          'Không thể tải giao diện chính:',
          error
        );

        /*
         * Avoid trapping the user behind the splash forever.
         * Suspense will still handle the component import.
         */
        if (alive) {
          setHomeCodeReady(true);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  /*
   * Auth state:
   *
   * BEFORE:
   *   Auth -> wait Firestore user -> wait Firestore couple
   *   -> maybe wait writes -> finally render app.
   *
   * NOW:
   *   Auth -> immediately render with a safe local profile.
   *   Firestore synchronization happens in the background.
   */
  useEffect(() => {
    let alive = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (!alive) return;

        if (!firebaseUser) {
          setCurrentUser(null);
          setAuthResolved(true);
          return;
        }

        // Immediate profile: no Firestore round-trip.
        const instantProfile =
          makeInstantProfile(firebaseUser);

        setCurrentUser(instantProfile);
        setAuthResolved(true);

        // Background profile repair/sync.
        void syncUserProfile(firebaseUser)
          .then((syncedProfile) => {
            if (alive) {
              setCurrentUser(syncedProfile);
            }
          })
          .catch((error) => {
            /*
             * Keep using instantProfile.
             * A temporary Firestore problem should not block startup.
             */
            console.warn(
              'Đồng bộ hồ sơ nền chưa hoàn tất:',
              error
            );
          });
      }
    );

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const handleRefreshProfile = useCallback(() => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) return;

    /*
     * Do not put the whole app back into loading state.
     * Refresh quietly in the background.
     */
    void syncUserProfile(firebaseUser)
      .then((profile) => {
        setCurrentUser(profile);
      })
      .catch((error) => {
        console.warn(
          'Không thể làm mới hồ sơ:',
          error
        );
      });
  }, []);

  const handleSplashFinished =
    useCallback(() => {
      setShowSplash(false);
    }, []);

  /*
   * Logged-out users do not need the heavy Home chunk.
   * Logged-in users wait only for:
   *   1) Auth resolution
   *   2) Home JavaScript chunk
   *
   * They no longer wait for profile Firestore reads/writes.
   */
  const splashReady = useMemo(() => {
    if (!authResolved) return false;

    if (!currentUser) return true;

    return homeCodeReady;
  }, [
    authResolved,
    currentUser,
    homeCodeReady,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-rose-100 selection:text-rose-700">
      {authResolved && (
        !currentUser ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-rose-50 via-slate-50 to-pink-50 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full relative z-10">
              <AuthCard
                onSuccess={handleRefreshProfile}
              />
            </div>

            <footer className="mt-8 text-center text-xs text-slate-400 font-medium">
              Us — Couple App 💕
            </footer>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="min-h-screen bg-slate-50" />
            }
          >
            <LazyLightHomeScreen
              userProfile={currentUser}
              onRefreshProfile={
                handleRefreshProfile
              }
            />
          </Suspense>
        )
      )}

      {showSplash && (
        <LoadingSplash
          ready={splashReady}
          onFinished={handleSplashFinished}
        />
      )}
    </div>
  );
}