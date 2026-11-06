import React, { useEffect } from 'react';
import { Heart, Trophy, User, X } from 'lucide-react';
import { TabType } from './LightHomeScreen';

interface MoreMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  onOpenMessages: () => void;
}

export const MoreMenuSheet: React.FC<MoreMenuSheetProps> = ({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
  onOpenMessages,
}) => {
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
    { id: 'messages' as const, title: 'Lời nhắn', icon: Heart },
    { id: 'achievements' as TabType, title: 'Thành tích', icon: Trophy },
    { id: 'profile' as TabType, title: 'Hồ sơ & Cài đặt', icon: User },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="app-modal-backdrop"
        onClick={onClose}
        aria-label="Đóng"
      />

      <div
        className="app-sheet relative z-10 w-full max-w-lg overflow-hidden rounded-t-[24px] sm:rounded-[24px]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="app-sheet-header">
          <h3 className="app-section-title">Thêm</h3>
          <button
            type="button"
            onClick={onClose}
            className="app-icon-button h-9 w-9"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 px-4 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const selected = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'messages') {
                    onOpenMessages();
                    onClose();
                    return;
                  }

                  onNavigate(item.id);
                  onClose();
                }}
                className="flex w-full items-center gap-3 py-3.5 text-left"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    selected
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <span
                  className={`min-w-0 flex-1 text-sm font-semibold ${
                    selected ? 'text-rose-700' : 'text-slate-800'
                  }`}
                >
                  {item.title}
                </span>

                {selected && (
                  <span className="text-[10px] font-semibold text-rose-500">
                    Đang mở
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
