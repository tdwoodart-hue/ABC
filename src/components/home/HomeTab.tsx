import React from 'react';
import {
  Calendar,
  ChevronRight,
  Heart,
} from 'lucide-react';

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

  const todayLog = wakeUpLogs.find((log) => log.date === todayLocalDate) || null;

  const secretStats = useHomeSecretStats(journals, daysTogether);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const currentUserName = userProfile.displayName || (isU1 ? u1Name : u2Name) || 'bạn';
  const currentDateLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(now);

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

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(35);
      }
    }, 800);
  };

  const handleSecretPressEnd = () => {
    clearSecretPressTimer();
  };

  const daysCard = (
    <div className="flex min-h-[188px] flex-col justify-center rounded-2xl border border-rose-100/80 bg-gradient-to-br from-rose-50 to-pink-50/50 p-6 text-center lg:min-h-[340px] lg:p-8">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-rose-500">
        Số Ngày Bên Nhau
      </span>

      <div
        className="my-2 select-none text-5xl font-black tracking-tight text-rose-600 touch-manipulation lg:text-6xl"
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
        {daysTogether}{' '}
        <span className="text-xl font-bold text-rose-400">ngày</span>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 border-t border-rose-100/80 pt-3 text-xs text-slate-500">
        <Calendar className="h-4 w-4 text-rose-400" />
        <span>Ngày bắt đầu:</span>
        <span className="font-bold text-slate-700">{formatDateVN(coupleData?.anniversaryDate)}</span>
      </div>
    </div>
  );

  const achievementCard = (
    <button
      type="button"
      onClick={() => onNavigate('achievements')}
      className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition-all hover:border-rose-300 hover:shadow-md"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white transition-transform group-hover:scale-105">
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

        <div className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-800">Thành Tích & Điểm Thưởng</span>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-400">Xem hành trình và những cột mốc của hai đứa</span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-rose-500" />
    </button>
  );

  return (
    <div className="space-y-6">
      <header className="hidden items-end justify-between gap-6 lg:flex">
        <div>
          <p className="mb-1 text-sm font-semibold capitalize text-slate-400">{currentDateLabel}</p>
          <h1 className="text-3xl font-black tracking-[-0.035em] text-slate-900">
            {greeting}, {currentUserName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />
            Một góc nhỏ để hai đứa lưu lại những ngày bình thường mà đáng nhớ.
          </p>
        </div>
      </header>

      <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-md sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)] lg:gap-5 lg:space-y-0">
          <div className="min-w-0">
            <CouplePixelCard
              duongName={u1Name}
              chucName={u2Name}
              isDuongCurrentUser={isU1}
              isChucCurrentUser={isU2}
            />
          </div>
          {daysCard}
        </div>

        <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)] lg:items-start lg:gap-5 lg:space-y-0">
          <div className="min-w-0">
            <MemoryOfTheDayCard journals={journals} onOpenJournal={onOpenJournal} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            {achievementCard}
            <WakeUpChallengeCard
              compact={true}
              userProfile={userProfile}
              coupleData={coupleData}
              todayLog={todayLog}
              allLogs={wakeUpLogs}
              onNavigateToFinance={() => onNavigate('finance')}
            />
          </aside>
        </div>
      </div>

      <SecretStatsModal
        isOpen={showSecretStats}
        stats={secretStats}
        onClose={() => setShowSecretStats(false)}
      />
    </div>
  );
};
