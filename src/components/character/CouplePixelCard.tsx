import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Heart } from 'lucide-react';
import { CharacterState, PixelCharacter } from './PixelCharacter';

interface CouplePixelCardProps {
  duongName: string;
  chucName: string;
  isDuongCurrentUser: boolean;
  isChucCurrentUser: boolean;
}

const DUONG_WELCOME_MS = 2050;
const CHUC_WELCOME_MS = 2640;

let duongWelcomePlayedThisPageLoad = false;
let chucWelcomePlayedThisPageLoad = false;

type ChucVisualState = 'idle' | 'wave';

const ChucAnimatedSprite: React.FC<{
  name: string;
  state: ChucVisualState;
}> = ({ name, state }) => {
  return (
    <div
      className="relative h-full max-h-full overflow-hidden shrink-0"
      style={{
        aspectRatio: '5 / 8',
        maxWidth: '100%',
      }}
      role="img"
      aria-label={
        state === 'wave'
          ? `${name} đang vẫy chào`
          : `${name} pixel character`
      }
    >
      <style>{`
        /*
         * Atlas layout = 14 equal cells:
         * 0..3  : Chúc idle
         * 4..13 : Chúc wave (10 frames)
         */
        @keyframes chuc-atlas-idle {
          0%, 79% { background-position: 0% 50%; }
          80%, 85% { background-position: 15.3846154% 50%; }
          86%, 100% { background-position: 0% 50%; }
        }

        /*
         * Slower first lift: frame 4->5->6 get more time,
         * then the wave can move more freely.
         */
        @keyframes chuc-atlas-wave {
          0%, 12%   { background-position: 30.7692308% 50%; }
          13%, 24%  { background-position: 38.4615385% 50%; }
          25%, 35%  { background-position: 46.1538462% 50%; }
          36%, 45%  { background-position: 53.8461538% 50%; }
          46%, 54%  { background-position: 61.5384615% 50%; }
          55%, 63%  { background-position: 69.2307692% 50%; }
          64%, 71%  { background-position: 76.9230769% 50%; }
          72%, 79%  { background-position: 84.6153846% 50%; }
          80%, 89%  { background-position: 92.3076923% 50%; }
          90%, 100% { background-position: 100% 50%; }
        }

        .chuc-character-atlas {
          width: 100%;
          height: 100%;
          background-image: url('/characters/chuc_character_atlas.png');
          background-repeat: no-repeat;
          background-size: 1400% 100%;
          background-position: 0% 50%;
          image-rendering: pixelated;
          will-change: background-position;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        .chuc-character-atlas--idle {
          animation: chuc-atlas-idle 3.5s steps(1, end) infinite;
        }

        .chuc-character-atlas--wave {
          animation: chuc-atlas-wave 2.64s steps(1, end) 1 forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .chuc-character-atlas--idle,
          .chuc-character-atlas--wave {
            animation: none;
          }

          .chuc-character-atlas--idle {
            background-position: 0% 50%;
          }

          .chuc-character-atlas--wave {
            background-position: 69.2307692% 50%;
          }
        }
      `}</style>

      <div
        className={`chuc-character-atlas ${
          state === 'wave'
            ? 'chuc-character-atlas--wave'
            : 'chuc-character-atlas--idle'
        }`}
      />
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
  const [duongState, setDuongState] =
    React.useState<CharacterState>('idle');
  const [chucState, setChucState] =
    React.useState<ChucVisualState>('idle');
  const [clock, setClock] = React.useState(() => Date.now());

  const duongWelcomeStartTimerRef = React.useRef<number | null>(null);
  const duongWelcomeEndTimerRef = React.useRef<number | null>(null);
  const chucWelcomeStartTimerRef = React.useRef<number | null>(null);
  const chucWelcomeEndTimerRef = React.useRef<number | null>(null);

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
    setDuongState((prev) =>
      prev === 'wave' ? prev : getAutomaticState(clock)
    );
  }, [clock, getAutomaticState]);

  React.useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return;
    }

    let disposed = false;
    let observer: MutationObserver | null = null;

    const introIsGone = () =>
      !document.querySelector('.us-snake-loader');

    const runAfterIntro = (callback: () => void) => {
      if (introIsGone()) {
        callback();
      } else {
        observer = new MutationObserver(() => {
          if (introIsGone()) {
            observer?.disconnect();
            observer = null;
            callback();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    };

    if (isChucCurrentUser && !duongWelcomePlayedThisPageLoad) {
      runAfterIntro(() => {
        if (disposed || duongWelcomePlayedThisPageLoad) return;

        duongWelcomePlayedThisPageLoad = true;

        duongWelcomeStartTimerRef.current = window.setTimeout(() => {
          if (disposed) return;
          setDuongState('wave');

          duongWelcomeEndTimerRef.current = window.setTimeout(() => {
            if (disposed) return;
            setDuongState(getAutomaticState());
            setClock(Date.now());
          }, DUONG_WELCOME_MS);
        }, 120);
      });
    }

    if (isDuongCurrentUser && !chucWelcomePlayedThisPageLoad) {
      runAfterIntro(() => {
        if (disposed || chucWelcomePlayedThisPageLoad) return;

        chucWelcomePlayedThisPageLoad = true;

        chucWelcomeStartTimerRef.current = window.setTimeout(() => {
          if (disposed) return;
          setChucState('wave');

          chucWelcomeEndTimerRef.current = window.setTimeout(() => {
            if (disposed) return;
            setChucState('idle');
          }, CHUC_WELCOME_MS);
        }, 120);
      });
    }

    return () => {
      disposed = true;
      observer?.disconnect();

      if (duongWelcomeStartTimerRef.current !== null) {
        window.clearTimeout(duongWelcomeStartTimerRef.current);
      }
      if (duongWelcomeEndTimerRef.current !== null) {
        window.clearTimeout(duongWelcomeEndTimerRef.current);
      }
      if (chucWelcomeStartTimerRef.current !== null) {
        window.clearTimeout(chucWelcomeStartTimerRef.current);
      }
      if (chucWelcomeEndTimerRef.current !== null) {
        window.clearTimeout(chucWelcomeEndTimerRef.current);
      }
    };
  }, [getAutomaticState, isChucCurrentUser, isDuongCurrentUser]);

  const reduced = useReducedMotion();
  const [heartBurst, setHeartBurst] = React.useState(0);
  const [burstVisible, setBurstVisible] = React.useState(false);
  const burstTimer = React.useRef<number | null>(null);
  React.useEffect(() => () => {
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
  }, []);

  const waveDuong = () => {
    if (duongWelcomeEndTimerRef.current !== null) window.clearTimeout(duongWelcomeEndTimerRef.current);
    setDuongState('wave');
    duongWelcomeEndTimerRef.current = window.setTimeout(() => setDuongState(getAutomaticState()), DUONG_WELCOME_MS);
  };
  const waveChuc = () => {
    if (chucWelcomeEndTimerRef.current !== null) window.clearTimeout(chucWelcomeEndTimerRef.current);
    setChucState('wave');
    chucWelcomeEndTimerRef.current = window.setTimeout(() => setChucState('idle'), CHUC_WELCOME_MS);
  };
  const dropHeart = () => {
    setHeartBurst(value => value + 1);
    setBurstVisible(true);
    waveDuong();
    waveChuc();
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurstVisible(false), 1500);
  };

  return (
    <div className="couple-playground">
      <motion.button type="button" className="couple-person couple-person-duong" onClick={waveDuong} aria-label={`Chào ${duongName}`} whileTap={reduced ? undefined : { scale: .96 }}>
        <span className="couple-sprite couple-sprite-duong"><PixelCharacter state={duongState} name={duongName} className="h-full w-full" /></span>
        <span className="couple-name">{duongName}</span>
        <span className="couple-hint">{duongState === 'wave' ? 'Chào bạn nè!' : 'Chạm để chào'}</span>
      </motion.button>
      <div className="couple-heart-wrap">
        <motion.button type="button" className="couple-heart" onClick={dropHeart} aria-label="Thả tim cho hai đứa" whileHover={reduced ? undefined : { scale: 1.05 }} whileTap={reduced ? undefined : { scale: .85 }}>
          <Heart size={32} fill="currentColor" strokeWidth={1.5} />
        </motion.button>
        {burstVisible && <span className="couple-heart-feedback" role="status">Thương nè!</span>}
        {burstVisible && !reduced && <span className="couple-burst" key={heartBurst} aria-hidden="true">
          {[-65, -30, 0, 35, 68].map((x, index) => <motion.span key={x} initial={{ opacity: 1, x: 0, y: 0, scale: .4 }} animate={{ opacity: [1, 1, 0], x, y: -75 - (index % 2) * 35, scale: [0.4, 1.1, .7], rotate: x / 2 }} transition={{ duration: 1.2, ease: 'easeOut' }}><Heart size={14 + index * 2} fill="currentColor" /></motion.span>)}
        </span>}
      </div>
      <motion.button type="button" className="couple-person couple-person-chuc" onClick={waveChuc} aria-label={`Chào ${chucName}`} whileTap={reduced ? undefined : { scale: .96 }}>
        <span className="couple-sprite couple-sprite-chuc"><ChucAnimatedSprite state={chucState} name={chucName} /></span>
        <span className="couple-name">{chucName}</span>
        <span className="couple-hint">{chucState === 'wave' ? 'Chào bạn nè!' : 'Chạm để chào'}</span>
      </motion.button>
    </div>
  );
};
