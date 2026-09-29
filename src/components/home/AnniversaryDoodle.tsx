import React from 'react';
import { Calendar, Camera, Heart, Sparkles, X } from 'lucide-react';

import { formatDateVN } from '../../utils/formatDate';

interface AnniversaryDoodleProps {
  anniversaryDate?: string;
  daysTogether: number;
  duongName: string;
  chucName: string;
  onOpenSecretStats: () => void;
}

interface AnniversaryMoment {
  daysUntil: number;
  years: number;
}

const getLocalDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const getAnniversaryMoment = (
  anniversaryDate?: string,
  now = new Date(),
): AnniversaryMoment | null => {
  if (!anniversaryDate || !/^\d{4}-\d{2}-\d{2}/.test(anniversaryDate)) return null;

  const startedAt = getLocalDate(anniversaryDate);
  if (Number.isNaN(startedAt.getTime())) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let nextAnniversary = new Date(today.getFullYear(), startedAt.getMonth(), startedAt.getDate());

  if (nextAnniversary < today) {
    nextAnniversary = new Date(today.getFullYear() + 1, startedAt.getMonth(), startedAt.getDate());
  }

  const daysUntil = Math.round((nextAnniversary.getTime() - today.getTime()) / 86_400_000);
  if (daysUntil > 7) return null;

  return {
    daysUntil,
    years: nextAnniversary.getFullYear() - startedAt.getFullYear(),
  };
};

const CountdownDigit = ({ digit }: { digit: string }) => (
  <span className="anniversary-flip-digit" aria-hidden="true">
    <span>{digit}</span>
  </span>
);

export const AnniversaryDoodle: React.FC<AnniversaryDoodleProps> = ({
  anniversaryDate,
  daysTogether,
  duongName,
  chucName,
  onOpenSecretStats,
}) => {
  const moment = React.useMemo(
    () => getAnniversaryMoment(anniversaryDate),
    [anniversaryDate],
  );
  const [showMemory, setShowMemory] = React.useState(false);
  const [captureMode, setCaptureMode] = React.useState(false);
  const pressTimer = React.useRef<number | null>(null);

  const clearPressTimer = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const startSecretPress = () => {
    clearPressTimer();
    pressTimer.current = window.setTimeout(onOpenSecretStats, 800);
  };

  React.useEffect(() => clearPressTimer, []);

  if (!moment) {
    return (
      <div className="bg-gradient-to-br from-rose-50 to-pink-50/50 rounded-2xl p-6 border border-rose-100/80 text-center">
        <span className="text-xs font-bold text-rose-500 uppercase tracking-wider block mb-1">
          Số Ngày Bên Nhau
        </span>
        <div
          className="text-5xl font-black text-rose-600 tracking-tight my-2 select-none touch-manipulation"
          onPointerDown={startSecretPress}
          onPointerUp={clearPressTimer}
          onPointerCancel={clearPressTimer}
          onPointerLeave={clearPressTimer}
          onContextMenu={(event) => event.preventDefault()}
          role="button"
          tabIndex={0}
          aria-label={`${daysTogether} ngày bên nhau`}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onOpenSecretStats();
            }
          }}
        >
          {daysTogether} <span className="text-xl font-bold text-rose-400">ngày</span>
        </div>
        <div className="mt-4 pt-3 border-t border-rose-100/80 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Calendar className="w-4 h-4 text-rose-400" />
          <span>Ngày bắt đầu:</span>
          <span className="font-bold text-slate-700">{formatDateVN(anniversaryDate)}</span>
        </div>
      </div>
    );
  }

  const isAnniversary = moment.daysUntil === 0;
  const countdown = String(moment.daysUntil).padStart(2, '0');
  const stageTitle = isAnniversary ? `Hôm nay là ${moment.years} năm` : `Còn ${moment.daysUntil} ngày nữa`;

  return (
    <section
      className={`anniversary-doodle relative overflow-hidden rounded-3xl border border-rose-200/70 bg-[#170b1b] ${captureMode ? 'anniversary-capture' : ''}`}
      aria-label={isAnniversary ? `Kỷ niệm ${moment.years} năm yêu nhau` : `Đếm ngược ${moment.daysUntil} ngày tới kỷ niệm`}
    >
      <style>{`
        @keyframes anniversary-float { 0%,100%{transform:translate3d(0,0,0) scale(1);opacity:.35} 50%{transform:translate3d(0,-24px,0) scale(1.2);opacity:1} }
        @keyframes anniversary-twinkle { 0%,100%{opacity:.25;transform:scale(.7)} 45%{opacity:1;transform:scale(1.4)} }
        @keyframes anniversary-flip { 0%,70%,100%{transform:rotateX(0)} 35%{transform:rotateX(-18deg)} }
        @keyframes anniversary-orbit { to { transform:rotate(360deg); } }
        .anniversary-doodle:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 18% 20%,rgba(255,153,198,.42),transparent 32%),radial-gradient(circle at 82% 75%,rgba(255,191,102,.26),transparent 34%),linear-gradient(145deg,#210d26,#5b193e 54%,#29132e);}
        .anniversary-flip-digit{display:inline-grid;place-items:center;width:clamp(64px,18vw,104px);height:clamp(80px,22vw,126px);overflow:hidden;border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,.25),rgba(255,255,255,.06));border:1px solid rgba(255,255,255,.32);box-shadow:inset 0 1px rgba(255,255,255,.25),0 22px 45px rgba(0,0,0,.24);font-size:clamp(54px,15vw,90px);font-weight:900;line-height:1;color:#fff7ed;text-shadow:0 5px 16px rgba(80,13,50,.65);animation:anniversary-flip 1.8s ease-in-out infinite;}
      `}</style>

      {Array.from({ length: 22 }, (_, index) => (
        <span
          key={index}
          className="absolute z-0 h-1.5 w-1.5 rounded-full bg-white"
          style={{
            left: `${(index * 37) % 100}%`,
            top: `${(index * 61) % 90}%`,
            animation: `anniversary-twinkle ${1.6 + (index % 4) * 0.7}s ease-in-out ${index * 0.12}s infinite`,
          }}
        />
      ))}

      <div className="relative z-10 min-h-[390px] px-5 py-6 sm:px-9 sm:py-8 text-center text-white flex flex-col items-center justify-between">
        {!captureMode && (
          <div className="w-full flex items-center justify-between text-[10px] font-bold tracking-[0.2em] uppercase text-rose-100/80">
            <span>Us Doodle</span>
            <button type="button" onClick={() => setCaptureMode(true)} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 tracking-normal normal-case text-xs text-white backdrop-blur hover:bg-white/20 transition">
              <Camera className="mr-1 inline h-3.5 w-3.5" /> Chụp khung
            </button>
          </div>
        )}

        {captureMode && (
          <button type="button" onClick={() => setCaptureMode(false)} className="absolute right-4 top-4 z-20 rounded-full bg-white/15 p-2 text-white/80 hover:bg-white/25" aria-label="Thoát chế độ chụp">
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1 flex flex-col items-center justify-center py-5">
          <div className="relative mb-5 h-16 w-36" aria-hidden="true">
            <div className="absolute left-2 top-5 h-9 w-9 rounded-full border border-rose-200/50 bg-rose-300/20 blur-[1px]" style={{ animation: 'anniversary-float 3.8s ease-in-out infinite' }} />
            <div className="absolute right-2 top-0 h-14 w-14 rounded-full border border-amber-100/35 bg-amber-200/15" style={{ animation: 'anniversary-float 4.4s ease-in-out .4s infinite' }} />
            <div className="absolute inset-0 rounded-full border border-white/15" style={{ animation: 'anniversary-orbit 12s linear infinite' }} />
            <Heart className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 fill-rose-300 text-rose-100" />
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-100/80">{stageTitle}</p>

          {isAnniversary ? (
            <div className="my-5">
              <p className="text-5xl sm:text-6xl font-black tracking-tight text-[#fff3df] drop-shadow-[0_8px_22px_rgba(255,130,167,.4)]">{moment.years} NĂM</p>
              <p className="mt-2 text-sm font-medium text-rose-100">vẫn là tụi mình, vẫn chọn nhau.</p>
            </div>
          ) : (
            <button type="button" onClick={() => setShowMemory((current) => !current)} className="group my-5 focus:outline-none" aria-label="Mở đoạn phim kỷ niệm">
              <div className="flex gap-2 justify-center">
                {[...countdown].map((digit, index) => (
                  <React.Fragment key={`${digit}-${index}`}>
                    <CountdownDigit digit={digit} />
                  </React.Fragment>
                ))}
              </div>
              <span className="mt-3 block text-[11px] text-rose-100/75 group-hover:text-white transition">chạm vào để đánh thức một mảnh ký ức</span>
            </button>
          )}

          <div className={`max-w-xs transition-all duration-700 ${showMemory || isAnniversary ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
            <Sparkles className="mx-auto mb-2 h-4 w-4 text-amber-200" />
            <p className="text-sm leading-relaxed text-rose-50">
              {isAnniversary
                ? `${duongName} × ${chucName} — ${daysTogether} ngày đã thành một thế giới nhỏ.`
                : `Từng ngày một đang được nối lại, để tới đúng hôm đó mình cùng mở chương thứ ${moment.years}.`}
            </p>
          </div>
        </div>

        <div className="w-full border-t border-white/15 pt-4 text-xs text-rose-100/75 flex items-center justify-center gap-2">
          <span>{formatDateVN(anniversaryDate)}</span><span className="opacity-40">•</span><span>{daysTogether} ngày bên nhau</span>
        </div>
      </div>
    </section>
  );
};
