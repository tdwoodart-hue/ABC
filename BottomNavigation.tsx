import React, { useState } from 'react';
import type { TabType } from './LightHomeScreen';
import { MoreMenuSheet } from './MoreMenuSheet';
import { ShakeRandomMemory } from './ShakeRandomMemory';
import {
  Home,
  BookOpen,
  Wallet,
  MoreHorizontal
} from 'lucide-react';

interface BottomNavigationProps {
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onNavigate,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

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
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-rose-100/90 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-2 sm:px-4 pt-1.5"
        style={{
          paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        }}
        aria-label="Thanh điều hướng chính"
      >
        <div className="max-w-md sm:max-w-lg md:max-w-xl mx-auto grid grid-cols-4 gap-1">
          {/* Tab 1: Home (Trang chủ) */}
          <button
            type="button"
            onClick={() => handleTabClick('home')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-2xl transition cursor-pointer min-h-[50px] select-none ${
              activeTab === 'home'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-medium'
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span className="text-[11px] sm:text-xs leading-none truncate whitespace-nowrap">
              Trang chủ
            </span>
          </button>

          {/* Tab 2: Journal (Nhật ký) */}
          <button
            type="button"
            onClick={() => handleTabClick('journal')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-2xl transition cursor-pointer min-h-[50px] select-none ${
              activeTab === 'journal'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-medium'
            }`}
          >
            <BookOpen className="w-5 h-5 shrink-0" />
            <span className="text-[11px] sm:text-xs leading-none truncate whitespace-nowrap">
              Nhật ký
            </span>
          </button>

          {/* Tab 3: Finance (Tài chính) */}
          <button
            type="button"
            onClick={() => handleTabClick('finance')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-2xl transition cursor-pointer min-h-[50px] select-none ${
              activeTab === 'finance'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-medium'
            }`}
          >
            <Wallet className="w-5 h-5 shrink-0" />
            <span className="text-[11px] sm:text-xs leading-none truncate whitespace-nowrap">
              Tài chính
            </span>
          </button>

          {/* Tab 4: More (Thêm) */}
          <button
            type="button"
            onClick={() => handleTabClick('more')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-2xl transition cursor-pointer min-h-[50px] relative select-none ${
              isMoreActive
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-medium'
            }`}
            aria-expanded={isMoreMenuOpen}
            aria-haspopup="dialog"
          >
            <div className="relative">
              <MoreHorizontal className="w-5 h-5 shrink-0" />
              {(activeTab === 'achievements' || activeTab === 'nutrition' || activeTab === 'profile') && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </div>
            <span className="text-[11px] sm:text-xs leading-none truncate whitespace-nowrap">
              Thêm
            </span>
          </button>
        </div>
      </nav>

      {/* Hidden global Easter egg: shake phone -> random Journal memory */}
      <ShakeRandomMemory onNavigate={onNavigate} />

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