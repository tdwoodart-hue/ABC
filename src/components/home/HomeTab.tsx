import React from 'react';
import {
  Calendar,
  ChevronRight,
  Trophy,
} from 'lucide-react';

import { CoupleData, JournalEntry, UserProfile, WakeUpLog } from '../../types';
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
    wakeUpLogs.find(
      (log) => log.date === todayLocalDate
    ) || null;

  const secretStats = useHomeSecretStats(
    journals,
    daysTogether
  );

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
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
        <CouplePixelCard
          duongName={u1Name}
          chucName={u2Name}
          isDuongCurrentUser={isU1}
          isChucCurrentUser={isU2}
        />

        <div className="bg-gradient-to-br from-rose-50 to-pink-50/50 rounded-2xl p-6 border border-rose-100/80 text-center">
          <span className="text-xs font-bold text-rose-500 uppercase tracking-wider block mb-1">
            Số Ngày Bên Nhau
          </span>

          <div
            className="text-5xl font-black text-rose-600 tracking-tight my-2 select-none touch-manipulation"
            onPointerDown={handleSecretPressStart}
            onPointerUp={handleSecretPressEnd}
            onPointerCancel={handleSecretPressEnd}
            onPointerLeave={handleSecretPressEnd}
            onContextMenu={(event) => event.preventDefault()}
            role="button"
            tabIndex={0}
            aria-label={`${daysTogether} ngày bên nhau`}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' ||
                event.key === ' '
              ) {
                event.preventDefault();
                setShowSecretStats(true);
              }
            }}
          >
            {daysTogether}{' '}
            <span className="text-xl font-bold text-rose-400">
              ngày
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-100/80 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Calendar className="w-4 h-4 text-rose-400" />
            <span>Ngày bắt đầu:</span>
            <span className="font-bold text-slate-700">
              {formatDateVN(coupleData?.anniversaryDate)}
            </span>
          </div>
        </div>

        <MemoryOfTheDayCard
          journals={journals}
          onOpenJournal={onOpenJournal}
        />

        <div
          onClick={() => onNavigate('achievements')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-rose-300 transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5 text-rose-500" />
            </div>

            <div className="text-left min-w-0">
              <span className="text-sm font-bold text-slate-800 block truncate">
                Thành Tích & Điểm Thưởng
              </span>
              <p className="text-xs text-slate-500 truncate">
                Huy hiệu, cấp độ tình yêu & kỷ niệm
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition shrink-0" />
        </div>

        <WakeUpChallengeCard
          compact={true}
          userProfile={userProfile}
          coupleData={coupleData}
          todayLog={todayLog}
          allLogs={wakeUpLogs}
          onNavigateToFinance={() => onNavigate('finance')}
        />
      </div>

      <SecretStatsModal
        isOpen={showSecretStats}
        stats={secretStats}
        onClose={() => setShowSecretStats(false)}
      />
    </div>
  );
};
