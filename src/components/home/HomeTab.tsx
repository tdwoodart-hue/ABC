import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

import { CoupleData, JournalEntry, UserProfile, WakeUpLog } from '../../types';
import { UI_ASSETS } from '../../config/uiAssets';
import { formatDateVN } from '../../utils/formatDate';
import { CouplePixelCard } from '../character/CouplePixelCard';
import { WakeUpChallengeCard } from '../WakeUpChallengeCard';
import { MemoryOfTheDayCard } from './MemoryOfTheDayCard';
import { SecretStatsModal } from './SecretStatsModal';
import { useHomeSecretStats } from './hooks/useHomeSecretStats';

interface HomeTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  wakeUpLogs: WakeUpLog[];
  journals: JournalEntry[];
  onNavigate: (tab: 'achievements' | 'finance') => void;
  onOpenJournal: (journal: JournalEntry) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  userProfile,
  coupleData,
  wakeUpLogs,
  journals,
  onNavigate,
  onOpenJournal,
}) => {
  const [showSecretStats, setShowSecretStats] = React.useState(false);
  const secretPressTimerRef = React.useRef<number | null>(null);
  const secretPressTriggeredRef = React.useRef(false);

  const isU1 =
    coupleData?.user1Id === userProfile.uid ||
    coupleData?.user1Uid === userProfile.uid ||
    userProfile.email?.toLowerCase().includes('duong');

  const isU2 =
    coupleData?.user2Id === userProfile.uid ||
    coupleData?.user2Uid === userProfile.uid ||
    userProfile.email?.toLowerCase().includes('chucga');

  const u1Name = isU1
    ? userProfile.displayName || coupleData?.user1Name || 'Dương'
    : coupleData?.user1Name || 'Dương';

  const u2Name = isU2
    ? userProfile.displayName || coupleData?.user2Name || 'Chúc Gà'
    : coupleData?.user2Name || 'Chúc Gà';

  const getDaysTogether = (): number => {
    if (!coupleData?.anniversaryDate) return 1;

    const start = new Date(coupleData.anniversaryDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays + 1;
  };

  const daysTogether = getDaysTogether();

  const todayLocalDate = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  })();

  const todayLog =
    wakeUpLogs.find((log) => log.date === todayLocalDate) || null;

  const secretStats = useHomeSecretStats(journals, daysTogether);

  const clearSecretPressTimer = () => {
    if (secretPressTimerRef.current !== null) {
      window.clearTimeout(secretPressTimerRef.current);
      secretPressTimerRef.current = null;
    }
  };

  const handleSecretPressStart = () => {
    clearSecretPressTimer();
    secretPressTriggeredRef.current = false;

    secretPressTimerRef.current = window.setTimeout(() => {
      secretPressTriggeredRef.current = true;
      setShowSecretStats(true);

      if (
        typeof navigator !== 'undefined' &&
        'vibrate' in navigator
      ) {
        navigator.vibrate?.(35);
      }
    }, 800);
  };

  const handleSecretPressEnd = () => {
    clearSecretPressTimer();
  };

  return (
    <div className="space-y-4">
      <CouplePixelCard
        duongName={u1Name}
        chucName={u2Name}
        isDuongCurrentUser={isU1}
        isChucCurrentUser={isU2}
      />

      <section className="home-days-card px-5 py-5 text-center sm:px-6">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--app-muted)]">
          Số ngày bên nhau
        </span>

        <div
          className="my-1.5 select-none touch-manipulation text-[3.35rem] font-semibold leading-none tracking-[-0.04em] text-[var(--app-brand)]"
          onPointerDown={handleSecretPressStart}
          onPointerUp={handleSecretPressEnd}
          onPointerCancel={handleSecretPressEnd}
          onPointerLeave={handleSecretPressEnd}
          onContextMenu={(event) => event.preventDefault()}
          role="button"
          tabIndex={0}
          aria-label={`${daysTogether} ngày bên nhau`}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setShowSecretStats(true);
            }
          }}
        >
          {daysTogether}
          <span className="ml-2 text-lg font-semibold text-[var(--app-muted)]">
            ngày
          </span>
        </div>

        <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 border-t border-[var(--app-divider)] pt-3 text-xs text-[var(--app-muted)]">
          <Calendar className="h-4 w-4 text-[var(--app-brand)]" />
          <span>Ngày bắt đầu</span>
          <span className="font-semibold text-[var(--app-text)]">
            {formatDateVN(coupleData?.anniversaryDate)}
          </span>
        </div>
      </section>

      <MemoryOfTheDayCard
        journals={journals}
        onOpenJournal={onOpenJournal}
      />

      <button
        type="button"
        onClick={() => onNavigate('achievements')}
        className="app-card app-list-row flex w-full items-center justify-between gap-3 p-3.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--app-surface-soft)]">
            <img
              src={UI_ASSETS.home.achievement}
              alt=""
              aria-hidden="true"
              width={128}
              height={128}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>

          <span className="truncate text-sm font-semibold text-[var(--app-text)]">
            Thành tích & Điểm thưởng
          </span>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-faint)]" />
      </button>

      <WakeUpChallengeCard
        compact
        userProfile={userProfile}
        coupleData={coupleData}
        todayLog={todayLog}
        allLogs={wakeUpLogs}
        onNavigateToFinance={() => onNavigate('finance')}
      />

      <SecretStatsModal
        isOpen={showSecretStats}
        stats={secretStats}
        onClose={() => setShowSecretStats(false)}
      />
    </div>
  );
};
