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

const IdleSprite: React.FC<{ name: string }> = ({ name }) => {
  return (
    <div
      className="relative h-full max-h-full overflow-hidden shrink-0"
      style={{
        aspectRatio: '1 / 2',
        maxWidth: '100%',
      }}
      role="img"
      aria-label={`${name} pixel character`}
    >
      <style>{`
        @keyframes duong-idle-blink {
          0%, 78% {
            background-position: 0% 50%;
          }
          79%, 84% {
            background-position: 66.6666667% 50%;
          }
          85%, 100% {
            background-position: 0% 50%;
          }
        }

        .duong-idle-frame {
          width: 100%;
          height: 100%;
          background-image: url('/characters/duong_idle_strip.png');
          background-repeat: no-repeat;
          background-size: 400% 100%;
          background-position: 0% 50%;
          image-rendering: pixelated;
          animation: duong-idle-blink 3.2s steps(1, end) infinite;
          will-change: background-position;
        }

        @media (prefers-reduced-motion: reduce) {
          .duong-idle-frame {
            animation: none;
            background-position: 0% 50%;
          }
        }
      `}</style>

      <div className="duong-idle-frame" />
    </div>
  );
};

const WaveSprite: React.FC<{ name: string }> = ({ name }) => {
  return (
    <div
      className="relative h-full max-h-full overflow-hidden shrink-0"
      style={{
        aspectRatio: '1 / 2',
        maxWidth: '100%',
      }}
      role="img"
      aria-label={`${name} đang vẫy chào`}
    >
      <style>{`
        @keyframes duong-wave-frames {
          0%, 10% {
            background-position: 0% 50%;
          }
          11%, 27% {
            background-position: 20% 50%;
          }
          28%, 44% {
            background-position: 40% 50%;
          }
          45%, 62% {
            background-position: 60% 50%;
          }
          63%, 80% {
            background-position: 80% 50%;
          }
          81%, 100% {
            background-position: 100% 50%;
          }
        }

        .duong-wave-frame {
          width: 100%;
          height: 100%;
          background-image: url('/characters/duong_wave_strip.png');
          background-repeat: no-repeat;
          background-size: 600% 100%;
          background-position: 0% 50%;
          image-rendering: pixelated;
          animation: duong-wave-frames 2.05s steps(1, end) 1 forwards;
          will-change: background-position;
        }

        @media (prefers-reduced-motion: reduce) {
          .duong-wave-frame {
            animation: none;
            background-position: 40% 50%;
          }
        }
      `}</style>

      <div className="duong-wave-frame" />
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
        {state === 'wave' ? (
          <WaveSprite name={name} />
        ) : (
          <IdleSprite name={name} />
        )}
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
