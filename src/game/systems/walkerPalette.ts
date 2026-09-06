import type { VisualMode } from '../core/visualMode';
import { DEFAULT_CHARACTER_ID } from '../characters/roster';

/**
 * Colours for the corridor's articulated walker.
 *
 * The in-level characters are single flattened canvases, so their limbs cannot be taken apart
 * and posed. The corridor rebuilds the character out of separate limbs instead, which means it
 * needs the colours as data. These match the art in PreloadScene deliberately: the figure that
 * walks the corridor has to be recognisably the one the player was just playing.
 */
export interface WalkerPalette {
  hat: number;
  skin: number;
  torso: number;
  legs: number;
  boots: number;
  /** Visor, goggles or eye colour — the one bright accent on the figure. */
  accent: number;
  /** Limbs, drawn a shade darker than the torso so they read against it. */
  limb: number;
}

const CLASSIC: Record<string, WalkerPalette> = {
  dave: { hat: 0xd32f2f, skin: 0xffccaa, torso: 0xd32f2f, legs: 0x1976d2, boots: 0x5d4037, accent: 0x000000, limb: 0xb71c1c },
  delta: { hat: 0xe65100, skin: 0xffccaa, torso: 0xf57c00, legs: 0xffb300, boots: 0x5d4037, accent: 0x000000, limb: 0xbf360c },
  nova: { hat: 0x4a148c, skin: 0xffccaa, torso: 0x8e24aa, legs: 0xe53935, boots: 0x5d4037, accent: 0x000000, limb: 0x6a1b9a },
  rex: { hat: 0x004d40, skin: 0xffccaa, torso: 0x00897b, legs: 0x00acc1, boots: 0x5d4037, accent: 0x000000, limb: 0x00695c },
};

const MODERN: Record<string, WalkerPalette> = {
  dave: { hat: 0x059669, skin: 0x34d399, torso: 0x10b981, legs: 0x1e293b, boots: 0x0f172a, accent: 0x00f0ff, limb: 0x047857 },
  delta: { hat: 0xc2410c, skin: 0xfb923c, torso: 0xfb923c, legs: 0x1e293b, boots: 0x0f172a, accent: 0xffd166, limb: 0x9a3412 },
  nova: { hat: 0x7e22ce, skin: 0xc084fc, torso: 0xc084fc, legs: 0x1e293b, boots: 0x0f172a, accent: 0xf0abfc, limb: 0x6b21a8 },
  rex: { hat: 0x0f766e, skin: 0x2dd4bf, torso: 0x2dd4bf, legs: 0x1e293b, boots: 0x0f172a, accent: 0x99f6e4, limb: 0x115e59 },
};

/** The walker's colours for a character in a presentation mode; Dave's if the id is unknown. */
export function walkerPalette(characterId: string | undefined, mode: VisualMode): WalkerPalette {
  const table = mode === 'classic' ? CLASSIC : MODERN;
  return table[characterId ?? ''] ?? table[DEFAULT_CHARACTER_ID];
}
