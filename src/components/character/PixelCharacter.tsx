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

const DUONG_STATE_IMAGES: Record<CharacterState, string> = {
  idle: '/characters/duong/male_idle_flower.png',
  happy: '/characters/duong/male_happy.png',
  love: '/characters/duong/male_love.png',
  hungry: '/characters/duong/male_hungry.png',
  sleepy: '/characters/duong/male_sleepy.png',
  sad: '/characters/duong/male_sad.png',
};

export const PixelCharacter: React.FC<PixelCharacterProps> = ({
  state = 'idle',
  name = 'Dương',
  className = '',
}) => {
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
