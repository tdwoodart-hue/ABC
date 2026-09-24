import React, { useEffect } from 'react';
import { ChevronRight, Heart, Sparkles, Trophy, User, X } from 'lucide-react';
import { TabType } from './LightHomeScreen';

interface MoreMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
}

export const MoreMenuSheet: React.FC<MoreMenuSheetProps> = ({ isOpen, onClose, activeTab, onNavigate }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose();
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

  const menuItems = [
    {
      id: 'achievements' as TabType,
      title: 'Thành tích & Kỷ lục',
      description: 'Cột mốc ngày yêu, huy hiệu & thử thách',
      icon: Trophy,
      colorClass: 'bg-amber-50 text-amber-600 border-amber-200/80 group-hover:bg-amber-100',
      iconClass: 'text-amber-600',
      badge: 'Mới',
    },
    {
      id: 'profile' as TabType,
      title: 'Tài khoản & Đôi lứa',
      description: 'Thông tin cá nhân, địa chỉ nhà & câu chuyện tình yêu',
      icon: User,
      colorClass: 'bg-rose-50 text-rose-500 border-rose-100 group-hover:bg-rose-100',
      iconClass: 'text-rose-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div onClick={onClose} className="fixed inset-0 cursor-pointer bg-slate-900/40 backdrop-blur-xs" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-rose-100 bg-white shadow-2xl" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex justify-center pb-1 pt-2.5"><div className="h-1.5 w-10 rounded-full bg-slate-200" /></div>
        <div className="flex items-center justify-between border-b border-rose-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500"><Sparkles className="h-3.5 w-3.5" /></div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Thêm tiện ích</h3>
              <p className="text-[11px] font-medium text-slate-400">Các tính năng bổ sung</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-2.5 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const selected = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => { onNavigate(item.id); onClose(); }} className={`group flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${selected ? 'border-rose-300 bg-rose-50/80 ring-2 ring-rose-200/70 shadow-xs' : 'border-slate-200/80 bg-white shadow-2xs hover:border-rose-100 hover:bg-rose-50/30'}`}>
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${selected ? 'border-rose-600 bg-rose-500 text-white shadow-xs' : item.colorClass}`}>
                    <Icon className={`h-5 w-5 ${selected ? 'text-white' : item.iconClass}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm font-bold ${selected ? 'text-rose-700' : 'text-slate-800'}`}>{item.title}</span>
                      {item.badge && <span className="rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">{item.badge}</span>}
                    </div>
                    <p className="mt-0.5 truncate text-xs font-normal text-slate-500">{item.description}</p>
                  </div>
                </div>
                <div className={`ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-rose-200/80 text-rose-700' : 'bg-slate-100 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500'}`}><ChevronRight className="h-4 w-4" /></div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t border-rose-50 bg-rose-50/25 px-5 py-2.5 text-[11px] text-slate-400"><Heart className="h-3 w-3 fill-rose-400 text-rose-400" /><span>Ứng dụng lưu giữ kỷ niệm tình yêu</span></div>
      </div>
    </div>
  );
};
