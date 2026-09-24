// App.tsx — WAIT FOR REAL HOME PAINT
// IMPORTANT: LoadingSplash.tsx is NOT changed by this fix.
import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  auth,
  checkIsAdmin,
  isChucGaAccount,
  isDuongAccount,
  onAuthStateChanged,
  OUR_COUPLE_ID,
  signOut,
  syncUserProfile,
} from './lib/firebase';

import type { UserProfile } from './types';

import { AuthCard } from './components/AuthCard';
import { LoadingSplash } from './components/LoadingSplash';

/*
 * Private app access whitelist.
 * Keep this list in sync with firestore.rules.
 */
const ALLOWED_EMAILS = [
  'tdwoodart@gmail.com',
  'duong@gmail.com',
  'chucga@gmail.com',
] as const;

const isAllowedEmail = (email?: string | null) => {
  const normalized = (email || '').toLowerCase().trim();
  return ALLOWED_EMAILS.some((allowed) => allowed === normalized);
};

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
    coupleId: OUR_COUPLE_ID,
    createdAt: new Date().toISOString(),
    gender,
    roleTitle,
  };

  instantProfile.isAdmin =
    checkIsAdmin(instantProfile);

  return instantProfile;
}

interface HomePaintGateProps {
  userProfile: UserProfile;
  onRefreshProfile: () => void;
  onPainted: () => void;
}

/*
 * This component is the important part of the fix.
 *
 * React does not commit this component while LazyLightHomeScreen
 * is still suspended. Therefore this layout effect can only run
 * after the heavy Home module has loaded AND React has committed it.
 *
 * Then we wait TWO requestAnimationFrame cycles:
 *   frame 1 = let the committed DOM reach the browser
 *   frame 2 = confirm at least one real paint opportunity happened
 *
 * Only after that do we tell the splash it is allowed to exit.
 */
const HomePaintGate: React.FC<HomePaintGateProps> = ({
  userProfile,
  onRefreshProfile,
  onPainted,
}) => {
  const reportedRef = useRef(false);

  useLayoutEffect(() => {
    if (reportedRef.current) return;

    let frame1 = 0;
    let frame2 = 0;

    frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        reportedRef.current = true;
        onPainted();
      });
    });

    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
    };
  }, [onPainted]);

  return (
    <LazyLightHomeScreen
      userProfile={userProfile}
      onRefreshProfile={onRefreshProfile}
    />
  );
};

export default function App() {
  const [currentUser, setCurrentUser] =
    useState<UserProfile | null>(null);

  const [authResolved, setAuthResolved] =
    useState(false);

  /*
   * This is different from "code downloaded".
   * It becomes true only after Home has actually committed
   * and had two browser paint opportunities.
   */
  const [homePainted, setHomePainted] =
    useState(false);

  const [showSplash, setShowSplash] =
    useState(true);

  /*
   * Start downloading the heavy Home chunk immediately,
   * while the existing intro is still running.
   *
   * No state from this preload is used to dismiss the splash.
   * Downloaded !== painted.
   */
  useEffect(() => {
    void loadLightHomeScreen().catch((error) => {
      console.error(
        'Không thể preload giao diện chính:',
        error
      );
    });
  }, []);

  useEffect(() => {
    let alive = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (!alive) return;

        if (!firebaseUser) {
          setCurrentUser(null);
          setHomePainted(false);
          setAuthResolved(true);
          return;
        }

        // Security: reject an unknown/stale Firebase session before Home mounts.
        if (!isAllowedEmail(firebaseUser.email)) {
          setCurrentUser(null);
          setHomePainted(false);
          setAuthResolved(true);

          void signOut(auth).catch((error) => {
            console.warn(
              'Không thể đăng xuất session không hợp lệ:',
              error
            );
          });

          return;
        }

        const instantProfile =
          makeInstantProfile(firebaseUser);

        /*
         * A fresh auth resolution means Home must prove that it has
         * painted before the splash is allowed to leave.
         */
        setHomePainted(false);
        setCurrentUser(instantProfile);
        setAuthResolved(true);

        /*
         * Firestore profile sync remains background work.
         * It must NOT control splash dismissal.
         */
        void syncUserProfile(firebaseUser)
          .then((syncedProfile) => {
            if (alive) {
              setCurrentUser(syncedProfile);
            }
          })
          .catch((error) => {
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

    // Security: never sync an unauthorized restored session.
    if (!isAllowedEmail(firebaseUser.email)) {
      setCurrentUser(null);
      setHomePainted(false);
      void signOut(auth);
      return;
    }

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

  const handleHomePainted = useCallback(() => {
    setHomePainted(true);
  }, []);

  const handleSplashFinished =
    useCallback(() => {
      setShowSplash(false);
    }, []);

  /*
   * CRITICAL:
   *
   * OLD:
   *   splashReady = authResolved && homeCodeReady
   *
   * NEW:
   *   splashReady = authResolved && homePainted
   *
   * So the existing LoadingSplash keeps covering the screen
   * until the actual Home UI is already painted underneath.
   */
  const splashReady = useMemo(() => {
    if (!authResolved) return false;

    if (!currentUser) {
      // Login screen is lightweight and already rendered below.
      return true;
    }

    return homePainted;
  }, [
    authResolved,
    currentUser,
    homePainted,
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
              /*
               * This remains behind the splash during startup.
               * The splash is NOT allowed to leave while this
               * fallback is what React is showing.
               */
              <div className="min-h-screen bg-slate-50" />
            }
          >
            <HomePaintGate
              userProfile={currentUser}
              onRefreshProfile={
                handleRefreshProfile
              }
              onPainted={
                handleHomePainted
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