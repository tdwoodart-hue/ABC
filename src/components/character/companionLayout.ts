export interface CharacterCardLayout {
  minHeight: number;
  speechZoneHeight: number;
}

export const getCharacterCardLayout = (
  hasBubble: boolean
): CharacterCardLayout => ({
  minHeight: hasBubble ? 452 : 340,
  speechZoneHeight: hasBubble ? 112 : 0,
});

export const getCharacterCardMinHeight = (hasBubble: boolean): number =>
  getCharacterCardLayout(hasBubble).minHeight;
