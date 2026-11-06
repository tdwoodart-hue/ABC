import React from 'react';
import {
  Calendar,
  BookOpen,
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
  onNavigate: (tab: 'achievements' | 'finance' | 'journal') => void;
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
  React.useEffect(() => () => {
    if (secretPressTimerRef.current !== null) window.clearTimeout(secretPressTimerRef.current);
  }, []);
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
    <div className="us-days-card flex min-h-[188px] flex-col justify-center p-6 text-center lg:min-h-[340px] lg:p-8">
      <span className="mb-1 block text-sm font-medium text-rose-500">
        Mình đã bên nhau
      </span>

      <div
        className="us-days-count my-2 select-none font-black tracking-tight touch-manipulation"
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
        {daysTogether.toLocaleString('vi-VN')}{' '}
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
      className="us-achievement-link group flex w-full items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-left"
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
          <span className="block truncate text-sm font-bold text-slate-800">Những cột mốc của mình</span>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-400">Xem hành trình và những cột mốc của hai đứa</span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-rose-500" />
    </button>
  );

  return (
    <div className="us-home space-y-6">
      <header className="us-home-header flex items-end justify-between gap-6">
        <div>
          <p className="mb-1 text-sm font-semibold capitalize text-slate-400">{currentDateLabel}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-[-0.035em] text-slate-900">
            {greeting}, {currentUserName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />
            Một góc nhỏ để hai đứa lưu lại những ngày bình thường mà đáng nhớ.
          </p>
        </div>
      </header>

      <div className="space-y-6">
        <div className="us-couple-scene grid overflow-hidden lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.85fr)]">
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
            {journals.length > 0 ? (
              <MemoryOfTheDayCard journals={journals} onOpenJournal={onOpenJournal} />
            ) : (
              <section className="us-memory-empty app-card p-6 sm:p-8">
                <BookOpen className="h-6 w-6 text-rose-500" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-bold text-slate-900">Chuyện của mình bắt đầu từ đây</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Một bức ảnh, một buổi hẹn, hay chỉ là một ngày hai đứa ở bên nhau.</p>
                <button type="button" onClick={() => onNavigate('journal')} className="app-button app-button-primary mt-5">Mở nhật ký</button>
              </section>
            )}
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
