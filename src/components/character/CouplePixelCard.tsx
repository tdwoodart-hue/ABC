import React from 'react';
import { CharacterState, PixelCharacter } from './PixelCharacter';

interface CouplePixelCardProps {
  duongName: string;
  chucName: string;
  isDuongCurrentUser: boolean;
  isChucCurrentUser: boolean;
}

const STORAGE_KEY = 'us:duong-pixel-character:v1';
const HUNGRY_AFTER_MS = 6 * 60 * 60 * 1000;
const REACTION_DURATION_MS = 4200;
const WELCOME_ANIMATION_MS = 2050;

let welcomePlayedThisPageLoad = false;

interface StoredCharacterState {
  lastFedAt?: number;
  lastLovedAt?: number;
  lastHuggedAt?: number;
}

const readStoredState = (): StoredCharacterState => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeStoredState = (state: StoredCharacterState) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

const getAutomaticState = (
  stored: StoredCharacterState,
  now = Date.now()
): CharacterState => {
  const hour = new Date(now).getHours();

  if (hour >= 23 || hour < 6) {
    return 'sleepy';
  }

  if (
    stored.lastFedAt &&
    now - stored.lastFedAt >= HUNGRY_AFTER_MS
  ) {
    return 'hungry';
  }

  return 'idle';
};

const ChucIdleSprite: React.FC<{ name: string }> = ({ name }) => {
  return (
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
  );
};

export const CouplePixelCard: React.FC<
  CouplePixelCardProps
> = ({
  duongName,
  chucName,
  isDuongCurrentUser,
  isChucCurrentUser,
}) => {
  const [stored, setStored] = React.useState<StoredCharacterState>(
    () => readStoredState()
  );
  const [temporaryState, setTemporaryState] =
    React.useState<CharacterState | null>(null);
  const [showActions, setShowActions] = React.useState(false);
  const [clock, setClock] = React.useState(() => Date.now());

  const reactionTimerRef = React.useRef<number | null>(null);
  const welcomeEndTimerRef = React.useRef<number | null>(null);
  const welcomeStartTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(Date.now());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

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

        setShowActions(false);
        setTemporaryState('wave');

        welcomeEndTimerRef.current = window.setTimeout(() => {
          if (disposed) return;

          setTemporaryState(null);
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
  }, [isChucCurrentUser]);

  React.useEffect(() => {
    return () => {
      if (reactionTimerRef.current !== null) {
        window.clearTimeout(reactionTimerRef.current);
      }
    };
  }, []);

  const automaticState = React.useMemo(
    () => getAutomaticState(stored, clock),
    [stored, clock]
  );

  const duongState = temporaryState || automaticState;

  const playReaction = (
    nextState: CharacterState,
    patch?: Partial<StoredCharacterState>
  ) => {
    if (patch) {
      const nextStored = {
        ...stored,
        ...patch,
      };

      setStored(nextStored);
      writeStoredState(nextStored);
    }

    setTemporaryState(nextState);
    setShowActions(false);

    if (reactionTimerRef.current !== null) {
      window.clearTimeout(reactionTimerRef.current);
    }

    reactionTimerRef.current = window.setTimeout(() => {
      setTemporaryState(null);
      setClock(Date.now());
    }, REACTION_DURATION_MS);
  };

  const handleFeed = () => {
    playReaction('happy', {
      lastFedAt: Date.now(),
    });
  };

  const handleLove = () => {
    playReaction('love', {
      lastLovedAt: Date.now(),
    });
  };

  const handleHug = () => {
    playReaction('love', {
      lastHuggedAt: Date.now(),
    });
  };

  return (
    <div className="relative min-h-[340px] rounded-2xl border border-rose-100/80 bg-gradient-to-b from-rose-50/70 to-white overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-10 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-base sm:text-lg truncate">
                {duongName}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  isDuongCurrentUser
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isDuongCurrentUser ? 'Bạn' : 'Nửa kia'}
              </span>
            </div>
          </div>

          <div className="min-w-0 text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="font-bold text-slate-800 text-base sm:text-lg truncate">
                {chucName}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  isChucCurrentUser
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isChucCurrentUser ? 'Bạn' : 'Nửa kia'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pt-16 pb-16 px-4 sm:px-6">
        <div className="h-full w-full flex items-end justify-center gap-2 sm:gap-8">
          <button
            type="button"
            onClick={() => setShowActions((value) => !value)}
            className="h-56 sm:h-64 w-[42%] sm:w-[38%] max-w-[240px] flex items-end justify-center transition-transform duration-200 active:scale-95 cursor-pointer touch-manipulation"
            aria-label={`Tương tác với ${duongName}`}
          >
            <PixelCharacter
              state={duongState}
              name={duongName}
              className="h-full w-full"
            />
          </button>

          <div className="h-52 sm:h-60 w-[38%] sm:w-[34%] max-w-[210px] flex items-end justify-center pointer-events-none">
            <ChucIdleSprite name={chucName} />
          </div>
        </div>
      </div>

      <div
        className={`absolute inset-x-3 bottom-3 z-20 transition-all duration-200 ${
          showActions
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-3 opacity-0 pointer-events-none'
        }`}
      >
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={handleFeed}
            className="rounded-xl px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 active:scale-95 transition"
          >
            🍜 Cho ăn
          </button>

          <button
            type="button"
            onClick={handleLove}
            className="rounded-xl px-2 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 active:scale-95 transition"
          >
            ❤️ Thả tim
          </button>

          <button
            type="button"
            onClick={handleHug}
            className="rounded-xl px-2 py-2 text-xs font-semibold text-violet-600 hover:bg-violet-50 active:scale-95 transition"
          >
            🤗 Ôm
          </button>
        </div>
      </div>
    </div>
  );
};
