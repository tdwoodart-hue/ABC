import React from 'react';
import { CharacterState, PixelCharacter } from './PixelCharacter';

interface CouplePixelCardProps {
  duongName: string;
  chucName: string;
  isDuongCurrentUser: boolean;
  isChucCurrentUser: boolean;
}

const WELCOME_ANIMATION_MS = 2050;

let welcomePlayedThisPageLoad = false;

export const CouplePixelCard: React.FC<
  CouplePixelCardProps
> = ({
  duongName,
  chucName,
  isDuongCurrentUser: _isDuongCurrentUser,
  isChucCurrentUser,
}) => {
  const [duongState, setDuongState] =
    React.useState<CharacterState>('idle');
  const [clock, setClock] = React.useState(() => Date.now());

  const welcomeEndTimerRef = React.useRef<number | null>(null);
  const welcomeStartTimerRef = React.useRef<number | null>(null);

  const getAutomaticState = React.useCallback(
    (now = Date.now()): CharacterState => {
      const hour = new Date(now).getHours();

      if (hour >= 23 || hour < 6) {
        return 'sleepy';
      }

      return 'idle';
    },
    []
  );

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setClock(now);

      setDuongState((prev) =>
        prev === 'wave' ? prev : getAutomaticState(now)
      );
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [getAutomaticState]);

  React.useEffect(() => {
    setDuongState(getAutomaticState(clock));
  }, [clock, getAutomaticState]);

  React.useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !isChucCurrentUser ||
      welcomePlayedThisPageLoad
    ) {
      return;
    }

    let disposed = false;
    let observer: MutationObserver | null = null;

    const playWelcome = () => {
      if (
        disposed ||
        welcomePlayedThisPageLoad ||
        !isChucCurrentUser
      ) {
        return;
      }

      welcomePlayedThisPageLoad = true;

      welcomeStartTimerRef.current = window.setTimeout(() => {
        if (disposed) return;

        setDuongState('wave');

        welcomeEndTimerRef.current = window.setTimeout(() => {
          if (disposed) return;

          setDuongState(getAutomaticState());
          setClock(Date.now());
        }, WELCOME_ANIMATION_MS);
      }, 120);
    };

    const introIsGone = () =>
      !document.querySelector('.us-snake-loader');

    if (introIsGone()) {
      playWelcome();
    } else {
      observer = new MutationObserver(() => {
        if (introIsGone()) {
          observer?.disconnect();
          observer = null;
          playWelcome();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      disposed = true;
      observer?.disconnect();

      if (welcomeStartTimerRef.current !== null) {
        window.clearTimeout(welcomeStartTimerRef.current);
      }

      if (welcomeEndTimerRef.current !== null) {
        window.clearTimeout(welcomeEndTimerRef.current);
      }
    };
  }, [getAutomaticState, isChucCurrentUser]);

  return (
    <div className="relative min-h-[340px] rounded-2xl border border-rose-100/80 bg-gradient-to-b from-rose-50/70 to-white overflow-hidden">
      <div className="absolute inset-0 pt-6 pb-8 px-4 sm:px-6">
        <div className="h-full w-full flex items-end justify-center gap-2 sm:gap-8">
          <div className="w-[42%] sm:w-[38%] max-w-[240px] flex flex-col items-center justify-end">
            <div className="h-56 sm:h-64 w-full flex items-end justify-center">
              <PixelCharacter
                state={duongState}
                name={duongName}
                className="h-full w-full"
              />
            </div>

            <span className="mt-2 text-sm sm:text-base font-semibold text-slate-700 text-center leading-none">
              {duongName}
            </span>
          </div>

          <div className="w-[38%] sm:w-[34%] max-w-[210px] flex flex-col items-center justify-end">
            <div className="h-52 sm:h-60 w-full flex items-end justify-center pointer-events-none">
              <div
                className="relative h-full max-h-full overflow-hidden shrink-0"
                style={{
                  aspectRatio: '5 / 8',
                  maxWidth: '100%',
                }}
                role="img"
                aria-label={`${chucName} pixel character`}
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

            <span className="mt-2 text-sm sm:text-base font-semibold text-slate-700 text-center leading-none">
              {chucName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
