import React from 'react';

interface ChucPixelCharacterProps {
  name: string;
  isCurrentUser: boolean;
}

export const ChucPixelCharacter: React.FC<
  ChucPixelCharacterProps
> = ({
  name,
  isCurrentUser,
}) => {
  return (
    <div className="relative h-full min-h-[300px] rounded-2xl border border-rose-100/80 bg-gradient-to-b from-rose-50/70 to-white overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-4">
        <span className="font-bold text-slate-800 text-base sm:text-lg truncate">
          {name}
        </span>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
            isCurrentUser
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          {isCurrentUser ? 'Bạn' : 'Nửa kia'}
        </span>
      </div>

      <div className="absolute inset-0 pt-14 pb-6 flex items-center justify-center pointer-events-none">
        <div className="h-48 sm:h-56 w-full flex items-end justify-center overflow-hidden">
          <div
            className="relative h-full max-h-full overflow-hidden shrink-0"
            style={{
              aspectRatio: '5 / 8',
              maxWidth: '100%',
            }}
            role="img"
            aria-label={`${name} pixel character`}
          >
            <style>{`
              @keyframes chuc-idle-blink {
                0%, 79% {
                  background-position: 0% 50%;
                }
                80%, 85% {
                  background-position: 66.6666667% 50%;
                }
                86%, 100% {
                  background-position: 0% 50%;
                }
              }

              .chuc-idle-frame {
                width: 100%;
                height: 100%;
                background-image: url('/characters/chuc_idle_strip.png');
                background-repeat: no-repeat;
                background-size: 400% 100%;
                background-position: 0% 50%;
                image-rendering: pixelated;
                animation: chuc-idle-blink 3.5s steps(1, end) infinite;
                will-change: background-position;
                transform: translateZ(0);
                backface-visibility: hidden;
              }

              @media (prefers-reduced-motion: reduce) {
                .chuc-idle-frame {
                  animation: none;
                  background-position: 0% 50%;
                }
              }
            `}</style>

            <div className="chuc-idle-frame" />
          </div>
        </div>
      </div>
    </div>
  );
};
