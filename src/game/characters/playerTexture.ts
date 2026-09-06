import type { VisualMode } from '../core/visualMode';
import { classicTextureKey } from '../systems/VisualSkinner';
import { getCharacter, DEFAULT_CHARACTER_ID } from './roster';

/** Player states that have their own texture. */
export type PlayerTextureState = 'idle' | 'run' | 'jump' | 'fall';

/**
 * Picks the texture for a player state, combining the chosen character with the active visual
 * mode and degrading gracefully at every step:
 *
 *   1. classic art for this character   (classic mode only)
 *   2. modern art for this character
 *   3. classic art for Dave             (classic mode only)
 *   4. Dave's modern art                (always registered, so this always resolves)
 *
 * The cascade is what lets a character be added to the roster before its sprites exist, and
 * lets classic-mode art land per-character rather than all at once.
 */
export function resolvePlayerTextureKey(
  state: PlayerTextureState,
  characterId: string | undefined,
  mode: VisualMode,
  hasTexture: (key: string) => boolean,
): string {
  const prefix = getCharacter(characterId).texturePrefix;
  const fallbackPrefix = getCharacter(DEFAULT_CHARACTER_ID).texturePrefix;

  const candidates = [
    ...(mode === 'classic' ? [classicTextureKey(`${prefix}_${state}`)] : []),
    `${prefix}_${state}`,
    ...(mode === 'classic' ? [classicTextureKey(`${fallbackPrefix}_${state}`)] : []),
    `${fallbackPrefix}_${state}`,
  ];

  return candidates.find(hasTexture) ?? `${fallbackPrefix}_${state}`;
}
