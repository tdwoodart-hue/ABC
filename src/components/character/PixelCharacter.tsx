import React from 'react';
import {
  CHARACTER_DEFINITIONS,
  CharacterId,
  getFramePosition,
} from './characterConfig';

export type CharacterState =
  | 'idle'
  | 'wave'
  | 'happy'
  | 'love'
  | 'hungry'
  | 'sleepy'
  | 'sad';

interface PixelCharacterProps {
  character?: CharacterId;
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
  character: CharacterId;
  name: string;
  state: 'idle' | 'wave';
}> = ({ character, name, state }) => {
  const definition = CHARACTER_DEFINITIONS[character];
  const animation = definition.animations[state];
  const reducedPosition = getFramePosition(
    animation.reducedMotionFrame,
    definition.frameCount
  );

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

        @keyframes chuc-atlas-idle {
          0%, 79% { background-position: 0% 50%; }
          80%, 85% { background-position: 15.3846154% 50%; }
          86%, 100% { background-position: 0% 50%; }
        }

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

        .shared-pixel-character {
          width: 100%;
          height: 100%;
          background-repeat: no-repeat;
          background-position: 0% 50%;
          image-rendering: pixelated;
          will-change: background-position;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        @media (prefers-reduced-motion: reduce) {
          .shared-pixel-character {
            animation: none !important;
            background-position: var(--reduced-position) !important;
          }
        }
      `}</style>

      <div
        className="shared-pixel-character"
        style={{
          backgroundImage: `url('${definition.atlasUrl}')`,
          backgroundSize: `${definition.frameCount * 100}% 100%`,
          animationName: `${character}-atlas-${state}`,
          animationDuration: `${animation.durationMs}ms`,
          animationTimingFunction: 'steps(1, end)',
          animationIterationCount: state === 'idle' ? 'infinite' : 1,
          animationFillMode: state === 'wave' ? 'forwards' : 'none',
          '--reduced-position': reducedPosition,
        } as React.CSSProperties}
      />
    </div>
  );
};

export const PixelCharacter: React.FC<PixelCharacterProps> = ({
  character = 'duong',
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
          character={character}
          name={name}
          state={state}
        />
      </div>
    );
  }

  if (character === 'duong') return (
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

  return (
    <PixelCharacter
      character="chuc"
      state="idle"
      name={name}
      className={className}
    />
  );
};
