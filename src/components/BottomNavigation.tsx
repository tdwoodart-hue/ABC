import React, { useState, useEffect } from 'react';
import { TabType } from './LightHomeScreen';
import { MoreMenuSheet } from './MoreMenuSheet';

interface BottomNavigationProps {
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onNavigate,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Detect when virtual keyboard opens or user is typing in an input/textarea to avoid blocking the UI
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: number | null = null;

    const checkInputFocus = () => {
      const activeEl = document.activeElement;
      if (!activeEl) return false;
      const tagName = activeEl.tagName.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea';
      const isContentEditable = (activeEl as HTMLElement).isContentEditable;
      if (tagName === 'input') {
        const type = (activeEl as HTMLInputElement).type?.toLowerCase();
        if (['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset'].includes(type)) {
          return false;
        }
      }
      return isInput || isContentEditable;
    };

    const handleFocusIn = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (checkInputFocus()) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (!checkInputFocus()) {
          setIsKeyboardOpen(false);
        }
      }, 120);
    };

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        if (heightDiff > 140 && checkInputFocus()) {
          setIsKeyboardOpen(true);
        } else if (heightDiff < 60 && !checkInputFocus()) {
          setIsKeyboardOpen(false);
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  // More is active if current tab is in the secondary set (achievements, nutrition, profile) or if sheet is open
  const isMoreActive =
    activeTab === 'achievements' ||
    activeTab === 'nutrition' ||
    activeTab === 'profile' ||
    isMoreMenuOpen;

  const handleTabClick = (tab: 'home' | 'journal' | 'finance' | 'more') => {
    if (tab === 'more') {
      setIsMoreMenuOpen(prev => !prev);
      return;
    }
    setIsMoreMenuOpen(false);
    onNavigate(tab);
  };

  return (
    <>
      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-rose-100/90 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-2 sm:px-4 pt-1.5 transition-all duration-200 ease-in-out ${
          isKeyboardOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
        style={{
          paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        }}
        aria-label="Thanh điều hướng chính"
      >
        <div className="max-w-md sm:max-w-lg md:max-w-xl mx-auto grid grid-cols-4 gap-2">
          {/* Tab 1: Home (Trang chủ) */}
          <button
            type="button"
            onClick={() => handleTabClick('home')}
            className={`flex items-center justify-center p-1 rounded-2xl transition cursor-pointer min-h-[52px] select-none ${
              activeTab === 'home'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-medium'
            }`}
            aria-label="Trang chủ"
            title="Trang chủ"
          >
            <img
              src="/icons/navigation/home-clay.webp"
              alt=""
              aria-hidden="true"
              className={`h-10 w-10 shrink-0 object-contain ${activeTab === 'home' ? 'home-tab-pop' : 'opacity-80'}`}
            />
          </button>

          {/* Tab 2: Journal (Nhật ký) */}
          <button
            type="button"
            onClick={() => handleTabClick('journal')}
            className={`flex items-center justify-center p-1 rounded-2xl transition cursor-pointer min-h-[52px] select-none ${
              activeTab === 'journal'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-medium'
            }`}
            aria-label="Nhật ký"
            title="Nhật ký"
          >
            <img
              src="/icons/navigation/journal-clay.webp"
              alt=""
              aria-hidden="true"
              className={`h-10 w-10 shrink-0 object-contain ${activeTab === 'journal' ? 'home-tab-pop' : 'opacity-80'}`}
            />
          </button>

          {/* Tab 3: Finance (Tài chính) */}
          <button
            type="button"
            onClick={() => handleTabClick('finance')}
            className={`flex items-center justify-center p-1 rounded-2xl transition cursor-pointer min-h-[52px] select-none ${
              activeTab === 'finance'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-medium'
            }`}
            aria-label="Tài chính"
            title="Tài chính"
          >
            <img
              src="/icons/navigation/finance-clay.webp"
              alt=""
              aria-hidden="true"
              className={`h-10 w-10 shrink-0 object-contain ${activeTab === 'finance' ? 'home-tab-pop' : 'opacity-80'}`}
            />
          </button>

          {/* Tab 4: More (Thêm) */}
          <button
            type="button"
            onClick={() => handleTabClick('more')}
            className={`flex items-center justify-center p-1 rounded-2xl transition cursor-pointer min-h-[52px] relative select-none ${
              isMoreActive
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-medium'
            }`}
            aria-expanded={isMoreMenuOpen}
            aria-haspopup="dialog"
            aria-label="Thêm"
            title="Thêm"
          >
            <div className="relative">
              <img
                src="/icons/navigation/more-clay.webp"
                alt=""
                aria-hidden="true"
                className={`h-10 w-10 shrink-0 object-contain ${isMoreActive ? 'home-tab-pop' : 'opacity-80'}`}
              />
              {(activeTab === 'achievements' || activeTab === 'nutrition' || activeTab === 'profile') && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </div>
          </button>
        </div>
      </nav>

      {/* More Options Bottom Sheet */}
      <MoreMenuSheet
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        activeTab={activeTab}
        onNavigate={onNavigate}
      />
    </>
  );
};
