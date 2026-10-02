import React from 'react';

import { db, doc, onSnapshot, updateDoc } from '../../../lib/firebase';

export type HomeHeroMode = 'characters' | 'vietnam' | 'custom';

export interface HomeAppearance {
  heroMode: HomeHeroMode;
  customImageUrl?: string;
  updatedAt?: string;
}

const DEFAULT_HOME_APPEARANCE: HomeAppearance = {
  heroMode: 'characters',
};

const normalizeAppearance = (raw: any): HomeAppearance => {
  const mode: HomeHeroMode =
    raw?.heroMode === 'vietnam' || raw?.heroMode === 'custom'
      ? raw.heroMode
      : 'characters';

  return {
    heroMode: mode,
    customImageUrl:
      typeof raw?.customImageUrl === 'string' && raw.customImageUrl.trim()
        ? raw.customImageUrl.trim()
        : undefined,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
};

export function useHomeAppearance(userUid?: string) {
  const [appearance, setAppearance] = React.useState<HomeAppearance>(
    DEFAULT_HOME_APPEARANCE
  );

  React.useEffect(() => {
    if (!userUid) {
      setAppearance(DEFAULT_HOME_APPEARANCE);
      return;
    }

    const userRef = doc(db, 'users', userUid);

    return onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setAppearance(DEFAULT_HOME_APPEARANCE);
          return;
        }

        setAppearance(normalizeAppearance(snapshot.data()?.homeAppearance));
      },
      (error) => {
        console.warn('Không thể đọc giao diện Trang chủ:', error);
      }
    );
  }, [userUid]);

  const setHeroMode = React.useCallback(
    async (heroMode: HomeHeroMode) => {
      if (!userUid) return;

      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, 'users', userUid), {
        'homeAppearance.heroMode': heroMode,
        'homeAppearance.updatedAt': updatedAt,
      });

      setAppearance((current) => ({
        ...current,
        heroMode,
        updatedAt,
      }));
    },
    [userUid]
  );

  const setCustomImageUrl = React.useCallback(
    async (customImageUrl: string) => {
      if (!userUid || !customImageUrl.trim()) return;

      const updatedAt = new Date().toISOString();
      const cleanUrl = customImageUrl.trim();

      await updateDoc(doc(db, 'users', userUid), {
        'homeAppearance.customImageUrl': cleanUrl,
        'homeAppearance.heroMode': 'custom',
        'homeAppearance.updatedAt': updatedAt,
      });

      setAppearance({
        heroMode: 'custom',
        customImageUrl: cleanUrl,
        updatedAt,
      });
    },
    [userUid]
  );

  return {
    appearance,
    setHeroMode,
    setCustomImageUrl,
  };
}
