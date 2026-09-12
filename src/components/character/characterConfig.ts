export type CharacterId = 'duong' | 'chuc';
export type AnimatedCharacterState = 'idle' | 'wave';

interface AnimationDefinition {
  frames: number[];
  durationMs: number;
  reducedMotionFrame: number;
}

interface CharacterDefinition {
  atlasUrl: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  atlasWidth: number;
  animations: Record<AnimatedCharacterState, AnimationDefinition>;
}

const createDefinition = (
  definition: Omit<CharacterDefinition, 'atlasWidth'>
): CharacterDefinition => ({
  ...definition,
  atlasWidth: definition.frameWidth * definition.frameCount,
});

export const CHARACTER_DEFINITIONS: Record<
  CharacterId,
  CharacterDefinition
> = {
  duong: createDefinition({
    atlasUrl: '/characters/duong_character_atlas.png',
    frameWidth: 320,
    frameHeight: 512,
    frameCount: 10,
    animations: {
      idle: {
        frames: [0, 2, 0],
        durationMs: 3200,
        reducedMotionFrame: 0,
      },
      wave: {
        frames: [4, 5, 6, 7, 8, 9],
        durationMs: 2050,
        reducedMotionFrame: 6,
      },
    },
  }),
  chuc: createDefinition({
    atlasUrl: '/characters/chuc_character_atlas.png',
    frameWidth: 320,
    frameHeight: 512,
    frameCount: 14,
    animations: {
      idle: {
        frames: [0, 2, 0],
        durationMs: 3500,
        reducedMotionFrame: 0,
      },
      wave: {
        frames: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        durationMs: 2640,
        reducedMotionFrame: 9,
      },
    },
  }),
};

export const getFramePosition = (
  frame: number,
  frameCount: number
): string => `${(frame / (frameCount - 1)) * 100}% 50%`;
