import React from 'react';

export type CharacterState =
  | 'idle'
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

const DUONG_STATE_IMAGES: Record<Exclude<CharacterState, 'idle'>, string> = {
  happy: '/characters/male_happy.png',
  love: '/characters/male_love.png',
  hungry: '/characters/male_hungry.png',
  sleepy: '/characters/male_sleepy.png',
  sad: '/characters/male_sad.png',
};

const IdleSprite: React.FC<{ name: string }> = ({ name }) => {
  return (
    <div className="relative h-full w-full flex items-end justify-center overflow-hidden">
      <style>{`
        @keyframes duong-idle-sprite {
          0%, 42% { transform: translateX(0); }
          48%, 56% { transform: translateX(-25%); }
          62%, 70% { transform: translateX(-50%); }
          76%, 100% { transform: translateX(-75%); }
        }

        .duong-idle-strip {
          width: 400%;
          height: 100%;
          max-width: none;
          object-fit: fill;
          image-rendering: pixelated;
          animation: duong-idle-sprite 2.6s steps(1, end) infinite;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .duong-idle-strip {
            animation: none;
          }
        }
      `}</style>

      <div className="h-full w-full overflow-hidden">
        <img
          src="/characters/duong_idle_strip.png"
          alt={`${name} pixel character`}
          draggable={false}
          className="duong-idle-strip select-none pointer-events-none"
        />
      </div>
    </div>
  );
};

export const PixelCharacter: React.FC<PixelCharacterProps> = ({
  state = 'idle',
  name = 'Dương',
  className = '',
}) => {
  if (state === 'idle') {
    return (
      <div
        className={`relative flex items-end justify-center ${className}`}
        aria-label={`${name} - idle`}
      >
        <IdleSprite name={name} />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-end justify-center ${className}`}
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
