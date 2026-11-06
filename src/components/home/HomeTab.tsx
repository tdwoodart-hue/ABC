import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, BookOpen, CalendarDays, ChevronRight, Heart, Plus, Settings2, ChartNoAxesCombined, Trophy, Apple, Wallet } from 'lucide-react';
import type { CoupleData, JournalEntry, UserProfile, WakeUpLog } from '../../types';
import { formatDateVN } from '../../utils/formatDate';
import { getRelationshipTimeline } from '../../utils/relationshipTimeline';
import { CouplePixelCard } from '../character/CouplePixelCard';
import { WakeUpChallengeCard } from '../WakeUpChallengeCard';
import { SecretStatsModal } from './SecretStatsModal';
import { useHomeSecretStats } from './hooks/useHomeSecretStats';
import { MemoryCarousel } from './MemoryCarousel';

interface HomeTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  wakeUpLogs: WakeUpLog[];
  journals: JournalEntry[];
  onNavigate: (tab: 'achievements' | 'finance' | 'journal' | 'nutrition' | 'profile') => void;
  onOpenJournal: (journal: JournalEntry) => void;
  onCreateJournal?: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ userProfile, coupleData, wakeUpLogs, journals, onNavigate, onOpenJournal, onCreateJournal }) => {
  const [showStats, setShowStats] = React.useState(false);
  const [introReady, setIntroReady] = React.useState(false);
  const reduced = useReducedMotion();
  // Home mounts behind the splash. Coordinate the entrance with its removal.
  React.useEffect(() => {
    const ready = () => !document.querySelector('.us-snake-loader');
    if (ready()) { setIntroReady(true); return; }
    const observer = new MutationObserver(() => { if (ready()) { setIntroReady(true); observer.disconnect(); } });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  const isU1 = coupleData?.user1Id === userProfile.uid || coupleData?.user1Uid === userProfile.uid || userProfile.email?.toLowerCase().includes('duong');
  const isU2 = coupleData?.user2Id === userProfile.uid || coupleData?.user2Uid === userProfile.uid || userProfile.email?.toLowerCase().includes('chucga');
  const u1Name = (isU1 ? userProfile.displayName : '') || coupleData?.user1Name || 'Dương';
  const u2Name = (isU2 ? userProfile.displayName : '') || coupleData?.user2Name || 'Chúc Gà';
  const now = new Date();
  const timeline = getRelationshipTimeline(coupleData?.anniversaryDate, now);
  const stats = useHomeSecretStats(journals, timeline?.days ?? 0);
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayLog = wakeUpLogs.find(log => log.date === dateKey) || null;
  const createJournal = onCreateJournal || (() => onNavigate('journal'));
  const shortcuts = [
    { label: 'Nhật ký', description: 'Cất một kỷ niệm', icon: BookOpen, action: () => onNavigate('journal') },
    { label: 'Dinh dưỡng', description: 'Khỏe cùng nhau', icon: Apple, action: () => onNavigate('nutrition') },
    { label: 'Quỹ chung', description: 'Góp cho ngày mai', icon: Wallet, action: () => onNavigate('finance') },
    { label: 'Thành tích', description: 'Những điều đã làm', icon: Trophy, action: () => onNavigate('achievements') },
  ];

  return <div className="home-v2">
    <header className="home-topbar">
      <div><p className="home-today">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}</p><h1>{greeting}, <span>{userProfile.displayName || 'bạn'}!</span></h1></div>
      <button type="button" className="home-settings" aria-label="Mở hồ sơ và cài đặt" onClick={() => onNavigate('profile')}><Settings2 size={20} /></button>
    </header>

    <section className="home-welcome" aria-label="Không gian của hai đứa">
      <motion.div className="home-welcome-copy" initial={false} animate={introReady ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : 16 }} transition={{ duration: reduced ? 0 : .5, ease: [.22, 1, .36, 1] }}>

        <h2>Không gian<br />{' '}của hai đứa.</h2>
        <p>Nhật ký, những ngày đặc biệt<br />{' '}và các kế hoạch chung.</p>
        <button type="button" className="home-primary" onClick={createJournal}><Plus size={19} /> Viết nhật ký</button>
      </motion.div>
      <motion.div className="home-characters" initial={false} animate={introReady ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduced ? 1 : .94 }} transition={{ duration: reduced ? 0 : .6, delay: reduced ? 0 : .1, ease: [.22, 1, .36, 1] }}>
        <CouplePixelCard duongName={u1Name} chucName={u2Name} isDuongCurrentUser={!!isU1} isChucCurrentUser={!!isU2} />
      </motion.div>
      <div className="home-together">
        <span className="together-icon"><CalendarDays size={21} /></span>
        {timeline && timeline.untilStart === 0 ? <><button type="button" onClick={() => setShowStats(true)} className="together-days" aria-label={`Xem hành trình ${timeline.days} ngày bên nhau`}><strong>{timeline.days.toLocaleString('vi-VN')}</strong><span>ngày bên nhau <ChevronRight size={14} /></span></button><span className="together-since">Từ {formatDateVN(coupleData?.anniversaryDate)}</span><div className="together-milestone"><span>{timeline.remaining === 0 ? `Chạm mốc ${timeline.nextMilestone} ngày!` : `Còn ${timeline.remaining} ngày đến mốc ${timeline.nextMilestone.toLocaleString('vi-VN')}`}</span><span className="together-track"><motion.span initial={false} animate={{ width: `${timeline.progress * 100}%` }} transition={{ duration: reduced ? 0 : .8 }} /></span></div></> : <button type="button" className="together-setup" onClick={() => onNavigate('profile')}>{timeline ? `Còn ${timeline.untilStart} ngày đến ngày của mình` : 'Thêm ngày bắt đầu của hai đứa'}<ChevronRight size={17} /></button>}
      </div>
    </section>

    <nav className="home-shortcuts" aria-label="Lối tắt của hai đứa">
      {shortcuts.map(item => <motion.button type="button" key={item.label} className="home-shortcut" onClick={item.action} whileHover={reduced ? undefined : { y: -2 }} whileTap={reduced ? undefined : { scale: .985 }}><span className="shortcut-icon"><item.icon size={22} strokeWidth={1.75} aria-hidden="true" /></span><span><strong>{item.label}</strong></span><ArrowUpRight size={17} className="shortcut-arrow" /></motion.button>)}
    </nav>

    <div className="home-daily-grid">
      <MemoryCarousel journals={journals} onOpenJournal={onOpenJournal} onCreateJournal={createJournal} />
      <aside className="home-daily">
        <div className="home-section-heading"><div><h2>Mỗi ngày một chút</h2></div></div>
        <div className="home-wake"><WakeUpChallengeCard compact userProfile={userProfile} coupleData={coupleData} todayLog={todayLog} allLogs={wakeUpLogs} onNavigateToFinance={() => onNavigate('finance')} /></div>
        <button type="button" className="home-journey" onClick={() => setShowStats(true)}><span className="journey-icon"><ChartNoAxesCombined size={23} /></span><span><strong>Hành trình của hai đứa</strong><small>{stats.journalCount} trang nhật ký, {stats.totalPhotos} tấm ảnh</small></span><ArrowUpRight size={19} /></button>
        <p className="home-small-note"><Heart size={13} /> Chẳng cần ngày đặc biệt để thương nhau.</p>
      </aside>
    </div>
    <SecretStatsModal isOpen={showStats} stats={stats} onClose={() => setShowStats(false)} />
  </div>;
};
