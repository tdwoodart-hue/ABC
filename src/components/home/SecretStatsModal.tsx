import React from 'react';
import {
  BookOpen,
  CalendarDays,
  Crown,
  Images,
  MapPinned,
  MessageCircle,
  Plane,
  X,
} from 'lucide-react';

import { useHomeSecretStats } from './hooks/useHomeSecretStats';

type SecretStats = ReturnType<typeof useHomeSecretStats>;

interface SecretStatsModalProps {
  isOpen: boolean;
  stats: SecretStats;
  onClose: () => void;
}

export const SecretStatsModal: React.FC<SecretStatsModalProps> = ({
  isOpen,
  stats,
  onClose,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[32px] border border-white/70 bg-white shadow-2xl sm:rounded-[32px]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-5 pb-4 pt-5 backdrop-blur-xl sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500">
              Bí mật nhỏ của Us
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {stats.daysTogether.toLocaleString('vi-VN')} ngày bên nhau
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Không có nút thống kê đâu, chỉ ai biết mới mở được.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Đóng thống kê bí mật"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {[
              {
                label: 'Địa điểm',
                value: stats.locationCount,
                icon: MapPinned,
              },
              {
                label: 'Nhật ký',
                value: stats.journalCount,
                icon: BookOpen,
              },
              {
                label: 'Ảnh',
                value: stats.totalPhotos,
                icon: Images,
              },
              {
                label: 'Bình luận',
                value: stats.totalComments,
                icon: MessageCircle,
              },
              {
                label: 'Chuyến đi',
                value: stats.travelCount,
                icon: Plane,
              },
              {
                label: 'Video',
                value: stats.totalVideos,
                icon: CalendarDays,
              },
            ].map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-rose-500 shadow-xs">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {stat.value.toLocaleString('vi-VN')}
                  </div>

                  <div className="mt-0.5 text-[11px] font-semibold text-slate-400">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-extrabold text-slate-800">
                Mấy điều hai đứa không để ý
              </h3>
            </div>

            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              <div className="flex items-center justify-between gap-4 p-4">
                <span className="text-xs font-medium text-slate-500">
                  Tháng chụp ảnh nhiều nhất
                </span>

                <span className="text-right text-xs font-bold text-slate-900">
                  {stats.busiestPhotoMonth
                    ? `${stats.busiestPhotoMonth.label} · ${stats.busiestPhotoMonth.count} ảnh`
                    : 'Chưa đủ dữ liệu'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-4">
                <span className="text-xs font-medium text-slate-500">
                  Nơi quay lại nhiều nhất
                </span>

                <span className="max-w-[58%] truncate text-right text-xs font-bold text-slate-900">
                  {stats.topLocation
                    ? `${stats.topLocation.label} · ${stats.topLocation.count} lần`
                    : 'Chưa có địa điểm'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-4">
                <span className="text-xs font-medium text-slate-500">
                  Người đăng nhật ký nhiều hơn
                </span>

                <span className="text-right text-xs font-bold text-slate-900">
                  {stats.topAuthor
                    ? `${stats.topAuthor.label} · ${stats.topAuthor.count} bài`
                    : 'Chưa đủ dữ liệu'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-4">
                <span className="text-xs font-medium text-slate-500">
                  Người hay bình luận hơn
                </span>

                <span className="text-right text-xs font-bold text-slate-900">
                  {stats.topCommenter
                    ? `${stats.topCommenter.label} · ${stats.topCommenter.count} bình luận`
                    : 'Chưa có bình luận'}
                </span>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] font-medium text-slate-300">
            Psst… giữ số ngày yêu nhau để quay lại đây.
          </p>
        </div>
      </div>
    </div>
  );
};