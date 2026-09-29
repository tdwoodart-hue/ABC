import React, { useEffect, useState } from 'react';
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
    let timeoutId: number | null = null;

    const hasTextInputFocus = () => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (!activeEl) return false;
      const tag = activeEl.tagName.toLowerCase();
      if (tag === 'textarea' || activeEl.isContentEditable) return true;
      if (tag !== 'input') return false;
      const type = (activeEl as HTMLInputElement).type?.toLowerCase();
      return !['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset'].includes(type);
    };

    const focusIn = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (hasTextInputFocus()) setIsKeyboardOpen(true);
    };
    const focusOut = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (!hasTextInputFocus()) setIsKeyboardOpen(false);
      }, 120);
    };
    const resize = () => {
      if (!window.visualViewport) return;
      const diff = window.innerHeight - window.visualViewport.height;
      if (diff > 140 && hasTextInputFocus()) setIsKeyboardOpen(true);
      if (diff < 60 && !hasTextInputFocus()) setIsKeyboardOpen(false);
    };

    document.addEventListener('focusin', focusIn);
    document.addEventListener('focusout', focusOut);
    window.visualViewport?.addEventListener('resize', resize);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('focusin', focusIn);
      document.removeEventListener('focusout', focusOut);
      window.visualViewport?.removeEventListener('resize', resize);
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

  return (
    <>
      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 border-t border-rose-100/90 bg-white/95 px-2 pt-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all duration-200 sm:px-4 ${
          isKeyboardOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
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
    </>
  );
};
