import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Apple, BookOpen, Home, MoreHorizontal, Wallet } from 'lucide-react';
import { TabType } from './LightHomeScreen';
import { MoreMenuSheet } from './MoreMenuSheet';
import { ScheduledMessagesModal } from './ScheduledMessagesModal';

interface BottomNavigationProps {
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
}

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

      // Important on iOS:
      // while the keyboard is closing, visualViewport is still short for a
      // few frames. Do NOT reveal the fixed nav during that interval or
      // Safari can pin its composited layer at the old keyboard top.
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
      // iOS keyboard dismissal is animated and often finishes well after
      // focusout. Keep the nav hidden until visualViewport is restored.
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
    `flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 min-h-[48px] select-none transition ${
      active
        ? 'bg-[var(--app-brand-soft)] font-semibold text-[var(--app-brand)]'
        : 'font-medium text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]'
    }`;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--app-border)] bg-[#fffdfb] px-2 pt-1.5 shadow-[0_-8px_28px_rgba(58,46,40,0.055)] sm:px-4 ${
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
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1.5">
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
