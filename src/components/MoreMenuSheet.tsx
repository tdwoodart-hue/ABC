import React, { useEffect } from 'react';
import { TabType } from './LightHomeScreen';
import {
  Trophy,
  Apple,
  User,
  X,
  ChevronRight,
  Sparkles,
  Heart
} from 'lucide-react';

interface MoreMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
}

export const MoreMenuSheet: React.FC<MoreMenuSheetProps> = ({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems: {
    id: TabType;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    iconClass: string;
    badge?: string;
  }[] = [
    {
      id: 'achievements',
      title: 'Thành tích & Kỷ lục',
      description: 'Cột mốc ngày yêu, huy hiệu & thử thách',
      icon: Trophy,
      colorClass: 'bg-amber-50 text-amber-600 border-amber-200/80 group-hover:bg-amber-100',
      iconClass: 'text-amber-600',
      badge: 'Mới',
    },
    {
      id: 'nutrition',
      title: 'Dinh dưỡng & Bữa ăn',
      description: 'Nhật ký thực đơn, calo & món ngon mỗi ngày',
      icon: Apple,
      colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-200/80 group-hover:bg-emerald-100',
      iconClass: 'text-emerald-600',
    },
    {
      id: 'profile',
      title: 'Tài khoản & Đôi lứa',
      description: 'Thông tin cá nhân, địa chỉ nhà & câu chuyện tình yêu',
      icon: User,
      colorClass: 'bg-sky-50 text-sky-600 border-sky-200/80 group-hover:bg-sky-100',
      iconClass: 'text-sky-600',
    },
  ];

  const handleSelect = (tab: TabType) => {
    onNavigate(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
        aria-hidden="true"
      />

      {/* Bottom Sheet Container */}
      <div
        className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl border-t border-slate-200/90 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[85vh] overflow-hidden"
        style={{
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Drag Pill Handle */}
        <div className="pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Thêm tiện ích</h3>
              <p className="text-[11px] text-slate-400 font-medium">Khám phá các tính năng bổ sung</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
            title="Đóng menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Items List */}
        <div className="p-4 space-y-2.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isSelected = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full group p-3.5 rounded-2xl border transition-all flex items-center justify-between text-left cursor-pointer ${
                  isSelected
                    ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200/70 shadow-xs'
                    : 'bg-white hover:bg-slate-50/90 border-slate-200/80 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                        : `${item.colorClass}`
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isSelected ? 'text-white' : item.iconClass
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold truncate ${
                          isSelected ? 'text-rose-700' : 'text-slate-800'
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-rose-200/80 text-rose-700'
                        : 'bg-slate-100 text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
          <span>Ứng dụng lưu giữ kỷ niệm tình yêu</span>
        </div>
      </div>
    </div>
  );
};
