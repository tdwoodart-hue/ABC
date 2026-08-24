import React from 'react';

export type CharacterState =
  | 'idle'
  | 'wave'
  | 'happy'
  | 'love'
  | 'hungry'
  | 'sleepy'
  | 'sad';

interface PixelCharacterProps {
  state?: CharacterState;
  name?: string;
  className?: string;
}

const DUONG_STATE_IMAGES: Record<
  Exclude<CharacterState, 'idle' | 'wave'>,
  string
> = {
  happy: '/characters/male_happy.png',
  love: '/characters/male_love.png',
  hungry: '/characters/male_hungry.png',
  sleepy: '/characters/male_sleepy.png',
  sad: '/characters/male_sad.png',
};

const SPRITE_ASPECT_RATIO = '5 / 8';

/*
 * ONE atlas, ONE DOM node for both idle and wave.
 *
 * Atlas = 10 equal 320x512 cells:
 *   0..3 = idle
 *   4..9 = wave
 *
 * This avoids the old IdleSprite -> WaveSprite unmount/remount and
 * avoids changing background-image between states, which caused the
 * visible one-frame "giật" during the transition.
 */
const AnimatedCharacterSprite: React.FC<{
  name: string;
  state: 'idle' | 'wave';
}> = ({ name, state }) => {
  return (
    <div
      className="relative h-full max-h-full overflow-hidden shrink-0"
      style={{
        aspectRatio: SPRITE_ASPECT_RATIO,
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
        @keyframes duong-atlas-idle {
          0%, 78% {
            background-position: 0% 50%;
          }
          79%, 84% {
            background-position: 22.2222222% 50%;
          }
          85%, 100% {
            background-position: 0% 50%;
          }
        }

        @keyframes duong-atlas-wave {
          0%, 10% {
            background-position: 44.4444444% 50%;
          }
          11%, 27% {
            background-position: 55.5555556% 50%;
          }
          28%, 44% {
            background-position: 66.6666667% 50%;
          }
          45%, 62% {
            background-position: 77.7777778% 50%;
          }
          63%, 80% {
            background-position: 88.8888889% 50%;
          }
          81%, 100% {
            background-position: 100% 50%;
          }
        }

        .duong-character-atlas {
          width: 100%;
          height: 100%;
          background-image: url('/characters/duong_character_atlas.png');
          background-repeat: no-repeat;
          background-size: 1000% 100%;
          background-position: 0% 50%;
          image-rendering: pixelated;
          will-change: background-position;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        .duong-character-atlas--idle {
          animation: duong-atlas-idle 3.2s steps(1, end) infinite;
        }

        .duong-character-atlas--wave {
          animation: duong-atlas-wave 2.05s steps(1, end) 1 forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .duong-character-atlas--idle,
          .duong-character-atlas--wave {
            animation: none;
          }

          .duong-character-atlas--idle {
            background-position: 0% 50%;
          }

          .duong-character-atlas--wave {
            background-position: 66.6666667% 50%;
          }
        }
      `}</style>

      <div
        className={`duong-character-atlas ${
          state === 'wave'
            ? 'duong-character-atlas--wave'
            : 'duong-character-atlas--idle'
        }`}
      />
    </div>
  );
};

export const PixelCharacter: React.FC<PixelCharacterProps> = ({
  state = 'idle',
  name = 'Dương',
  className = '',
}) => {
  if (state === 'idle' || state === 'wave') {
    return (
      <div
        className={`relative flex items-end justify-center overflow-hidden ${className}`}
        aria-label={`${name} - ${state}`}
      >
        <AnimatedCharacterSprite
          name={name}
          state={state}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-end justify-center overflow-hidden ${className}`}
      aria-label={`${name} - ${state}`}
    >
      <img
        src={DUONG_STATE_IMAGES[state]}
        alt={`${name} pixel character`}
        draggable={false}
        className="max-h-full max-w-full object-contain select-none pointer-events-none"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
