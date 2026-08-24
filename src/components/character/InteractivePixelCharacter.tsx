import React from 'react';
import { CharacterState, PixelCharacter } from './PixelCharacter';

interface InteractivePixelCharacterProps {
  name: string;
  isCurrentUser: boolean;
}

const STORAGE_KEY = 'us:duong-pixel-character:v1';
const WELCOME_SESSION_KEY = 'us:duong-wave-welcome:v1';
const HUNGRY_AFTER_MS = 6 * 60 * 60 * 1000;
const REACTION_DURATION_MS = 4200;
const WELCOME_DELAY_MS = 350;
const WELCOME_ANIMATION_MS = 2150;

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
    // localStorage chỉ là persistence nhẹ cho V1.
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

export const InteractivePixelCharacter: React.FC<
  InteractivePixelCharacterProps
> = ({
  name,
  isCurrentUser,
}) => {
  const [stored, setStored] = React.useState<StoredCharacterState>(
    () => readStoredState()
  );
  const [temporaryState, setTemporaryState] =
    React.useState<CharacterState | null>(null);
  const [showActions, setShowActions] = React.useState(false);
  const [clock, setClock] = React.useState(() => Date.now());

  const reactionTimerRef = React.useRef<number | null>(null);
  const welcomeStartTimerRef = React.useRef<number | null>(null);
  const welcomeEndTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(Date.now());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  // Dương is this component. If isCurrentUser is false, Chúc is viewing.
  // Greet once per browser-tab session, then return to the normal state.
  React.useEffect(() => {
    if (isCurrentUser || typeof window === 'undefined') return;

    try {
      if (window.sessionStorage.getItem(WELCOME_SESSION_KEY)) {
        return;
      }
      window.sessionStorage.setItem(WELCOME_SESSION_KEY, '1');
    } catch {
      // If sessionStorage is blocked, the greeting still works.
    }

    welcomeStartTimerRef.current = window.setTimeout(() => {
      setShowActions(false);
      setTemporaryState('wave');
    }, WELCOME_DELAY_MS);

    welcomeEndTimerRef.current = window.setTimeout(() => {
      setTemporaryState(null);
      setClock(Date.now());
    }, WELCOME_DELAY_MS + WELCOME_ANIMATION_MS);

    return () => {
      if (welcomeStartTimerRef.current !== null) {
        window.clearTimeout(welcomeStartTimerRef.current);
      }
      if (welcomeEndTimerRef.current !== null) {
        window.clearTimeout(welcomeEndTimerRef.current);
      }
    };
  }, [isCurrentUser]);

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

  const state = temporaryState || automaticState;

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

      <button
        type="button"
        onClick={() => setShowActions((value) => !value)}
        className="absolute inset-0 pt-14 pb-6 w-full flex items-center justify-center cursor-pointer touch-manipulation"
        aria-label={`Tương tác với ${name}`}
      >
        <PixelCharacter
          state={state}
          name={name}
          className="h-48 sm:h-56 w-full transition-transform duration-200 active:scale-95"
        />
      </button>

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
