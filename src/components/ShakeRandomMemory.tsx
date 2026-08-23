import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  MapPin,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';

import type { JournalEntry } from '../types';
import {
  db,
  OUR_COUPLE_ID,
  collection,
  onSnapshot,
  orderBy,
  query,
} from '../lib/firebase';
import { isVideoUrl } from '../utils/mediaHelper';
import type { TabType } from './LightHomeScreen';

interface ShakeRandomMemoryProps {
  onNavigate: (tab: TabType) => void;
}

type MotionPermissionState =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'unsupported';

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

const SHAKE_DELTA_THRESHOLD = 22;
const SHAKE_REQUIRED_PEAKS = 2;
const SHAKE_PEAK_WINDOW_MS = 700;
const SHAKE_COOLDOWN_MS = 2500;

/**
 * IMPORTANT:
 * iOS exposes DeviceMotionEvent.requestPermission() but does not expose
 * a standard Permissions API entry that lets us query the current motion
 * permission without prompting.
 *
 * The old implementation called requestPermission() again on the first
 * pointer-up after EVERY app launch. That is why the user kept seeing the
 * Motion & Orientation confirmation.
 *
 * We remember the user's decision at app level. After the first grant:
 * - future mounts attach the devicemotion listener immediately;
 * - requestPermission() is NOT called again by this component;
 * - therefore opening/using the app no longer creates a new permission prompt.
 *
 * Browser/OS permission is still controlled by iOS. If the user clears website
 * data or resets Safari permissions, web code cannot bypass that OS decision.
 */
const MOTION_PERMISSION_STORAGE_KEY =
  'us:shake-random-memory:motion-permission:v1';

const readStoredMotionPermission = (): MotionPermissionState => {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  try {
    const value = window.localStorage.getItem(
      MOTION_PERMISSION_STORAGE_KEY
    );

    if (value === 'granted' || value === 'denied') {
      return value;
    }
  } catch {
    // Storage may be unavailable in private/restricted browsing.
  }

  return 'unknown';
};

const storeMotionPermission = (
  permission: 'granted' | 'denied'
) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      MOTION_PERMISSION_STORAGE_KEY,
      permission
    );
  } catch {
    // Failure to persist must not break the Easter egg.
  }
};

const getJournalMedia = (journal: JournalEntry): string[] => {
  if (journal.images && journal.images.length > 0) {
    return journal.images.filter(Boolean);
  }

  if (journal.imageUrl) {
    return [journal.imageUrl];
  }

  return [];
};

export const ShakeRandomMemory: React.FC<ShakeRandomMemoryProps> = ({
  onNavigate,
}) => {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [selectedJournal, setSelectedJournal] =
    useState<JournalEntry | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const [motionPermission, setMotionPermission] =
    useState<MotionPermissionState>(() =>
      readStoredMotionPermission()
    );

  const lastSelectedJournalIdRef = useRef('');
  const lastShakeTriggeredAtRef = useRef(0);

  const lastVectorRef = useRef<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  const shakePeaksRef = useRef<number[]>([]);
  const motionListenerAttachedRef = useRef(false);

  useEffect(() => {
    const journalsRef = collection(
      db,
      'couples',
      OUR_COUPLE_ID,
      'journals'
    );

    const journalsQuery = query(
      journalsRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      journalsQuery,
      (snapshot) => {
        const items: JournalEntry[] = [];

        snapshot.forEach((snapshotDoc) => {
          items.push({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          } as JournalEntry);
        });

        setJournals(items);
      },
      (error) => {
        console.warn(
          'Không thể tải dữ liệu cho Random Memory:',
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  const eligibleJournals = useMemo(
    () =>
      journals.filter(
        (journal) => getJournalMedia(journal).length > 0
      ),
    [journals]
  );

  const showRandomMemory = useCallback(() => {
    if (eligibleJournals.length === 0) {
      return;
    }

    let candidates = eligibleJournals;

    if (
      eligibleJournals.length > 1 &&
      lastSelectedJournalIdRef.current
    ) {
      const withoutPrevious = eligibleJournals.filter(
        (journal) =>
          journal.id !== lastSelectedJournalIdRef.current
      );

      if (withoutPrevious.length > 0) {
        candidates = withoutPrevious;
      }
    }

    const randomJournal =
      candidates[
        Math.floor(Math.random() * candidates.length)
      ];

    const media = getJournalMedia(randomJournal);

    const randomMediaIndex =
      media.length > 1
        ? Math.floor(Math.random() * media.length)
        : 0;

    lastSelectedJournalIdRef.current = randomJournal.id;
    setSelectedJournal(randomJournal);
    setSelectedMediaIndex(randomMediaIndex);

    if ('vibrate' in navigator) {
      navigator.vibrate?.([35, 45, 35]);
    }
  }, [eligibleJournals]);

  const handleDeviceMotion = useCallback(
    (event: DeviceMotionEvent) => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const activeElement =
        document.activeElement as HTMLElement | null;

      if (
        activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          activeElement.tagName
        )
      ) {
        return;
      }

      const acceleration =
        event.accelerationIncludingGravity ||
        event.acceleration;

      if (
        !acceleration ||
        acceleration.x == null ||
        acceleration.y == null ||
        acceleration.z == null
      ) {
        return;
      }

      const current = {
        x: acceleration.x,
        y: acceleration.y,
        z: acceleration.z,
      };

      const previous = lastVectorRef.current;
      lastVectorRef.current = current;

      if (!previous) {
        return;
      }

      const delta =
        Math.abs(current.x - previous.x) +
        Math.abs(current.y - previous.y) +
        Math.abs(current.z - previous.z);

      if (delta < SHAKE_DELTA_THRESHOLD) {
        return;
      }

      const now = Date.now();

      if (
        now - lastShakeTriggeredAtRef.current <
        SHAKE_COOLDOWN_MS
      ) {
        return;
      }

      const recentPeaks = shakePeaksRef.current
        .filter(
          (timestamp) =>
            now - timestamp <= SHAKE_PEAK_WINDOW_MS
        )
        .concat(now);

      shakePeaksRef.current = recentPeaks;

      if (recentPeaks.length < SHAKE_REQUIRED_PEAKS) {
        return;
      }

      shakePeaksRef.current = [];
      lastShakeTriggeredAtRef.current = now;

      showRandomMemory();
    },
    [showRandomMemory]
  );

  const attachMotionListener = useCallback(() => {
    if (
      motionListenerAttachedRef.current ||
      typeof window === 'undefined' ||
      !('DeviceMotionEvent' in window)
    ) {
      return;
    }

    /**
     * Do not call requestPermission() here.
     *
     * If iOS still has permission for this origin, events start flowing.
     * If the browser/OS has reset that permission, it simply will not emit
     * sensor events; importantly we still do NOT interrupt app startup with
     * another automatic permission dialog.
     */
    window.addEventListener(
      'devicemotion',
      handleDeviceMotion,
      { passive: true }
    );

    motionListenerAttachedRef.current = true;
  }, [handleDeviceMotion]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('DeviceMotionEvent' in window)
    ) {
      setMotionPermission('unsupported');
      return;
    }

    const MotionEvent =
      window.DeviceMotionEvent as DeviceMotionEventWithPermission;

    const cleanupMotionListener = () => {
      if (motionListenerAttachedRef.current) {
        window.removeEventListener(
          'devicemotion',
          handleDeviceMotion
        );

        motionListenerAttachedRef.current = false;
      }
    };

    /**
     * Android / browsers that do not require explicit permission.
     */
    if (
      typeof MotionEvent.requestPermission !== 'function'
    ) {
      attachMotionListener();
      setMotionPermission('granted');

      return cleanupMotionListener;
    }

    /**
     * iPhone / iPad:
     *
     * If this device has already granted motion permission once for this app,
     * NEVER call requestPermission() again automatically on future launches.
     * Attach the listener directly and let Safari deliver events if the
     * origin-level permission is still valid.
     */
    const storedPermission = readStoredMotionPermission();

    if (storedPermission === 'granted') {
      setMotionPermission('granted');
      attachMotionListener();

      return cleanupMotionListener;
    }

    /**
     * Respect a previous denial too. The old implementation would keep asking
     * again after every new app launch. We deliberately do not do that.
     */
    if (storedPermission === 'denied') {
      setMotionPermission('denied');

      return cleanupMotionListener;
    }

    /**
     * First time only:
     * Apple requires requestPermission() to run from a real user gesture.
     * We keep the existing invisible Easter-egg behavior: the first normal
     * pointer-up in the app requests access once, then stores the decision.
     */
    let permissionRequestStarted = false;

    const requestIOSMotionPermission = async () => {
      if (permissionRequestStarted) {
        return;
      }

      permissionRequestStarted = true;

      try {
        const result =
          await MotionEvent.requestPermission?.();

        if (result === 'granted') {
          storeMotionPermission('granted');
          setMotionPermission('granted');
          attachMotionListener();
        } else {
          storeMotionPermission('denied');
          setMotionPermission('denied');
        }
      } catch (error) {
        console.warn(
          'Không thể xin quyền cảm biến chuyển động:',
          error
        );

        /**
         * A thrown error can happen if Safari loses transient activation.
         * Do not permanently store "denied" for that technical failure,
         * otherwise the user would never get another legitimate first-time
         * request.
         */
        permissionRequestStarted = false;
        setMotionPermission('unknown');
      }
    };

    window.addEventListener(
      'pointerup',
      requestIOSMotionPermission,
      { once: true }
    );

    return () => {
      window.removeEventListener(
        'pointerup',
        requestIOSMotionPermission
      );

      cleanupMotionListener();
    };
  }, [
    attachMotionListener,
    handleDeviceMotion,
  ]);

  if (!selectedJournal) {
    return null;
  }

  const media = getJournalMedia(selectedJournal);

  const safeMediaIndex = Math.min(
    Math.max(0, selectedMediaIndex),
    Math.max(0, media.length - 1)
  );

  const activeMedia = media[safeMediaIndex];

  const mediaIsVideo =
    Boolean(activeMedia) && isVideoUrl(activeMedia);

  const openFullJournal = () => {
    const journalId = selectedJournal.id;

    setSelectedJournal(null);
    onNavigate('journal');

    window.setTimeout(() => {
      const url =
        `/journal?post=${encodeURIComponent(journalId)}`;

      window.history.replaceState(
        null,
        '',
        url
      );

      window.dispatchEvent(
        new PopStateEvent('popstate')
      );
    }, 40);
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={() => setSelectedJournal(null)}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl border border-white/20 animate-in zoom-in-95 fade-in duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-rose-500">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-[0.14em]">
                Random Memory
              </span>
            </div>

            <p className="text-[10px] text-slate-400 mt-0.5">
              Một kỷ niệm bất ngờ của hai đứa
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedJournal(null)}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center shrink-0"
            aria-label="Đóng Random Memory"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mx-3 rounded-2xl overflow-hidden bg-slate-100 aspect-[4/5] relative">
          {activeMedia ? (
            mediaIsVideo ? (
              <video
                key={activeMedia}
                src={activeMedia}
                className="w-full h-full object-contain bg-black"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={activeMedia}
                alt={selectedJournal.title}
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              Không có ảnh/video
            </div>
          )}

          {media.length > 1 && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/55 text-white text-[10px] font-bold backdrop-blur-sm">
              {safeMediaIndex + 1}/{media.length}
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-base font-black text-slate-900 leading-snug">
            {selectedJournal.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
            {selectedJournal.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-rose-400" />
                {selectedJournal.date}
              </span>
            )}

            {selectedJournal.location && (
              <span className="flex items-center gap-1 min-w-0">
                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">
                  {selectedJournal.location}
                </span>
              </span>
            )}
          </div>

          {selectedJournal.content && (
            <p className="mt-3 text-xs text-slate-600 leading-relaxed line-clamp-3">
              {selectedJournal.content}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              onClick={showRandomMemory}
              className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Kỷ niệm khác
            </button>

            <button
              type="button"
              onClick={openFullJournal}
              className="h-10 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
            >
              Xem bài viết
            </button>
          </div>
        </div>
      </div>

      {motionPermission === 'denied' && (
        <span className="sr-only">
          Quyền cảm biến chuyển động đang bị tắt.
        </span>
      )}
    </div>
  );
};