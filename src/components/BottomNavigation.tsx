import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Apple,
  BookOpen,
  Heart,
  Home,
  MessageCircleHeart,
  MoreHorizontal,
  Trophy,
  UserRound,
  Wallet,
} from 'lucide-react';
import appPackage from '../../package.json';
import { TabType } from './LightHomeScreen';
import { MoreMenuSheet } from './MoreMenuSheet';
import { ScheduledMessagesModal } from './ScheduledMessagesModal';

interface BottomNavigationProps {
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
}

const APP_VERSION = appPackage.version;

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onNavigate }) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timers: number[] = [];

    const hasTextInputFocus = () => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (!activeEl) return false;
      const tag = activeEl.tagName.toLowerCase();
      if (tag === 'textarea' || activeEl.isContentEditable) return true;
      if (tag !== 'input') return false;
      const type = (activeEl as HTMLInputElement).type?.toLowerCase();
      return !['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset'].includes(type);
    };

    const getViewportShrink = () => {
      const viewport = window.visualViewport;
      if (!viewport) return 0;
      return Math.max(0, window.innerHeight - viewport.height);
    };

    const syncKeyboardState = () => {
      const viewportShrink = getViewportShrink();
      const textInputFocused = hasTextInputFocus();

      if (viewportShrink > 120) {
        setIsKeyboardOpen(true);
        return;
      }

      if (!textInputFocused || viewportShrink < 80) {
        setIsKeyboardOpen(false);
      }
    };

    const scheduleSync = (...delays: number[]) => {
      delays.forEach((delay) => {
        const id = window.setTimeout(() => {
          window.requestAnimationFrame(syncKeyboardState);
        }, delay);
        timers.push(id);
      });
    };

    const focusIn = () => {
      if (hasTextInputFocus()) {
        setIsKeyboardOpen(true);
        scheduleSync(80, 220);
      }
    };

    const focusOut = () => {
      scheduleSync(80, 220, 420, 700);
    };

    const viewportChanged = () => {
      window.requestAnimationFrame(syncKeyboardState);
    };

    const pageShow = () => {
      scheduleSync(0, 120, 320);
    };

    const visibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleSync(0, 120, 320);
      }
    };

    document.addEventListener('focusin', focusIn);
    document.addEventListener('focusout', focusOut);
    document.addEventListener('visibilitychange', visibilityChange);
    window.addEventListener('resize', viewportChanged);
    window.addEventListener('pageshow', pageShow);
    window.addEventListener('orientationchange', viewportChanged);
    window.visualViewport?.addEventListener('resize', viewportChanged);
    window.visualViewport?.addEventListener('scroll', viewportChanged);

    scheduleSync(0, 120);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      document.removeEventListener('focusin', focusIn);
      document.removeEventListener('focusout', focusOut);
      document.removeEventListener('visibilitychange', visibilityChange);
      window.removeEventListener('resize', viewportChanged);
      window.removeEventListener('pageshow', pageShow);
      window.removeEventListener('orientationchange', viewportChanged);
      window.visualViewport?.removeEventListener('resize', viewportChanged);
      window.visualViewport?.removeEventListener('scroll', viewportChanged);
    };
  }, []);

  const isMoreActive = activeTab === 'achievements' || activeTab === 'profile' || isMoreMenuOpen;

  const navigate = (tab: 'home' | 'journal' | 'nutrition' | 'finance' | 'more') => {
    if (tab === 'more') {
      setIsMoreMenuOpen((value) => !value);
      return;
    }
    setIsMoreMenuOpen(false);
    onNavigate(tab);
  };

  const itemClass = (active: boolean) =>
    `flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1.5 min-h-[50px] select-none transition ${
      active
        ? 'border border-rose-200/80 bg-rose-50 font-bold text-rose-600 shadow-2xs'
        : 'font-medium text-slate-500 hover:bg-slate-50/80 hover:text-slate-800'
    }`;

  const desktopItemClass = (active: boolean) =>
    `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
      active
        ? 'bg-rose-50 font-bold text-rose-700 ring-1 ring-inset ring-rose-100'
        : 'font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`;

  const desktopPrimaryItems: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'journal', label: 'Nhật ký', icon: BookOpen },
    { id: 'nutrition', label: 'Dinh dưỡng', icon: Apple },
    { id: 'finance', label: 'Tài chính', icon: Wallet },
  ];

  const desktopSecondaryItems: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'achievements', label: 'Thành tích', icon: Trophy },
    { id: 'profile', label: 'Hồ sơ & Cài đặt', icon: UserRound },
  ];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <style>{`
        @media (min-width: 1024px) {
          body:has(.us-desktop-sidebar) #root .min-h-screen:has(> main) {
            padding-bottom: 0 !important;
          }

          body:has(.us-desktop-sidebar) #root .min-h-screen:has(> main) > main {
            width: calc(100% - 240px) !important;
            max-width: 1320px !important;
            margin-left: calc(240px + max(0px, (100vw - 240px - 1320px) / 2)) !important;
            margin-right: 0 !important;
            padding: 32px 32px 52px !important;
          }
        }

        @media (min-width: 1280px) {
          body:has(.us-desktop-sidebar) #root .min-h-screen:has(> main) > main {
            width: calc(100% - 252px) !important;
            margin-left: calc(252px + max(0px, (100vw - 252px - 1320px) / 2)) !important;
            padding-left: 40px !important;
            padding-right: 40px !important;
          }
        }
      `}</style>

      <aside
        className="us-desktop-sidebar fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-slate-200/80 bg-white px-4 py-5 shadow-[8px_0_30px_rgba(15,23,42,0.025)] lg:flex xl:w-[252px]"
        data-us-desktop-navigation="true"
        aria-label="Điều hướng desktop"
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-500 text-white shadow-sm shadow-rose-200">
            <Heart className="h-5 w-5 fill-current" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-black tracking-tight text-slate-900">Us</span>
            <span className="block text-[11px] font-semibold text-slate-400">Couple App</span>
          </span>
        </button>

        <nav className="mt-7 space-y-1" aria-label="Điều hướng chính desktop">
          {desktopPrimaryItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={desktopItemClass(active)}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-rose-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="my-5 border-t border-slate-100" />
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">Hai đứa</p>

        <nav className="space-y-1" aria-label="Tiện ích desktop">
          {desktopSecondaryItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={desktopItemClass(active)}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-rose-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMessagesOpen(true)}
            className={desktopItemClass(false)}
          >
            <MessageCircleHeart className="h-[18px] w-[18px] shrink-0 text-slate-400 group-hover:text-slate-600" />
            <span className="truncate">Lời nhắn</span>
          </button>
        </nav>

        <div className="mt-auto px-2 pt-6">
          <div className="rounded-2xl border border-rose-100/80 bg-gradient-to-br from-rose-50/80 to-white p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
              Không gian của hai đứa
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-slate-400">Nhật ký, sức khỏe, tài chính và những điều nhỏ xíu cùng nhau.</p>
          </div>
          <p className="mt-3 px-1 text-[10px] font-semibold text-slate-300">Us v{APP_VERSION}</p>
        </div>
      </aside>

      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 border-t border-rose-100/90 bg-white px-2 pt-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] sm:px-4 lg:hidden ${
          isKeyboardOpen ? 'hidden' : ''
        }`}
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
        }}
        data-us-bottom-navigation="true"
        aria-label="Thanh điều hướng chính"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          <button type="button" onClick={() => navigate('home')} className={itemClass(activeTab === 'home')}>
            <Home className="h-5 w-5 shrink-0" />
            <span className="w-full truncate whitespace-nowrap text-center text-[10px] leading-none sm:text-xs">Trang chủ</span>
          </button>
          <button type="button" onClick={() => navigate('journal')} className={itemClass(activeTab === 'journal')}>
            <BookOpen className="h-5 w-5 shrink-0" />
            <span className="w-full truncate whitespace-nowrap text-center text-[10px] leading-none sm:text-xs">Nhật ký</span>
          </button>
          <button type="button" onClick={() => navigate('nutrition')} className={itemClass(activeTab === 'nutrition')}>
            <Apple className="h-5 w-5 shrink-0" />
            <span className="w-full truncate whitespace-nowrap text-center text-[10px] leading-none sm:text-xs">Dinh dưỡng</span>
          </button>
          <button type="button" onClick={() => navigate('finance')} className={itemClass(activeTab === 'finance')}>
            <Wallet className="h-5 w-5 shrink-0" />
            <span className="w-full truncate whitespace-nowrap text-center text-[10px] leading-none sm:text-xs">Tài chính</span>
          </button>
          <button type="button" onClick={() => navigate('more')} className={`${itemClass(isMoreActive)} relative`} aria-expanded={isMoreMenuOpen} aria-haspopup="dialog">
            <div className="relative">
              <MoreHorizontal className="h-5 w-5 shrink-0" />
              {(activeTab === 'achievements' || activeTab === 'profile') && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
            </div>
            <span className="w-full truncate whitespace-nowrap text-center text-[10px] leading-none sm:text-xs">Thêm</span>
          </button>
        </div>
      </nav>

      <MoreMenuSheet
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        activeTab={activeTab}
        onNavigate={onNavigate}
        onOpenMessages={() => setIsMessagesOpen(true)}
      />
      <ScheduledMessagesModal isOpen={isMessagesOpen} onClose={() => setIsMessagesOpen(false)} />
    </>,
    document.body
  );
};
