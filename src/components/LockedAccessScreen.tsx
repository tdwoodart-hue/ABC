import React, { useEffect } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { auth, signOut } from '../lib/firebase';

export const LockedAccessScreen: React.FC = () => {
  useEffect(() => {
    // Đảm bảo đăng xuất mọi phiên đăng nhập còn sót lại
    if (auth.currentUser) {
      void signOut(auth).catch(() => {
        // Bỏ qua lỗi nếu mạng yếu khi đăng xuất
      });
    }
  }, []);

  return (
    <main
      id="locked-access-screen"
      className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 via-rose-50/40 to-slate-100 text-slate-800 selection:bg-rose-100 selection:text-rose-800 relative overflow-hidden"
    >
      {/* Background soft ambient blurs */}
      <div
        className="absolute -top-24 -left-24 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -right-24 w-96 h-96 bg-slate-200/40 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-md relative z-10 mx-auto">
        <div
          id="locked-status-card"
          className="bg-white/90 backdrop-blur-md rounded-2xl p-8 sm:p-10 border border-rose-100/80 shadow-xl shadow-rose-950/5 text-center flex flex-col items-center"
        >
          {/* Lock Icon */}
          <div
            id="locked-icon-wrapper"
            className="w-20 h-20 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-6 shadow-inner"
          >
            <Lock className="w-9 h-9 stroke-[2.2]" aria-hidden="true" />
          </div>

          {/* Status Badge */}
          <div
            id="locked-badge"
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/70 border border-rose-200 text-xs font-semibold text-rose-700 uppercase tracking-wider mb-4"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Đã dừng hoạt động
          </div>

          {/* Main Title */}
          <h1
            id="locked-title"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3"
          >
            Truy cập hiện đã dừng hoạt động
          </h1>

          {/* Explanation Text */}
          <p
            id="locked-description"
            className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-sm mb-6 font-normal"
          >
            Ứng dụng đã được khóa và ngừng toàn bộ hoạt động truy cập. Hiện tại không ai có thể vào hệ thống.
          </p>

          {/* Information box */}
          <div
            id="locked-security-note"
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-500 flex items-start gap-3 text-left"
          >
            <ShieldAlert className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-slate-700">Khóa bảo vệ toàn diện</p>
              <p className="leading-normal">
                Toàn bộ cổng đăng nhập và dữ liệu đã được bảo mật khóa chặt.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p
          id="locked-footer"
          className="mt-6 text-center text-xs text-slate-400 font-medium"
        >
          Us — Couple App
        </p>
      </div>
    </main>
  );
};
