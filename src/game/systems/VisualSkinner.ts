import type { VisualMode } from '../core/visualMode';

/** Prefix visual code registers classic-mode art under (see THEME_INTEGRATION.md). */
export const CLASSIC_TEXTURE_PREFIX = 'classic__';

export function classicTextureKey(baseKey: string): string {
  return `${CLASSIC_TEXTURE_PREFIX}${baseKey}`;
}

/**
 * Picks the texture to draw for a logical object in the given mode, falling back to the base
 * texture whenever classic art for it does not exist. The fallback is what lets the classic
 * skin land piece by piece without ever producing a missing-texture object.
 */
export function resolveTextureKey(
  baseKey: string,
  mode: VisualMode,
  hasTexture: (key: string) => boolean,
): string {
  if (mode !== 'classic') return baseKey;
  if (baseKey.startsWith(CLASSIC_TEXTURE_PREFIX)) return baseKey;
  const classicKey = classicTextureKey(baseKey);
  return hasTexture(classicKey) ? classicKey : baseKey;
}

/** The only capability the skinner needs from a game object — deliberately not Phaser-typed. */
export interface Skinnable {
  setTexture(key: string): unknown;
  /** Present on Phaser game objects; used to skip swaps that would be a no-op. */
  texture?: { key: string };
  /**
   * TileSprites render through an internally generated fill canvas, so their `texture.key` is a
   * throwaway UUID while the *source* texture — the one worth skinning — is here.
   */
  displayTexture?: { key: string };
}

interface Entry {
  target: Skinnable;
  /** The mode-independent key this object is drawn from; the source of truth for re-skinning. */
  baseKey: string;
}

/**
 * Swaps textures on already-existing game objects when the presentation mode changes.
 *
 * This is the mechanism that makes theme switching safe mid-level: it only ever calls
 * `setTexture`, so positions, velocities, physics bodies, collision boxes, AI state, score,
 * lives and timers are untouched. Nothing here may read or write gameplay state.
 */
export class VisualSkinner {
  private entries: Entry[] = [];

  constructor(private readonly hasTexture: (key: string) => boolean) {}

  /** Registers an object to be re-skinned, keyed by its mode-independent base texture. */
  register(target: Skinnable, baseKey: string): void {
    this.entries.push({ target, baseKey });
  }

  /** Drops all registrations — call on scene shutdown so restarts don't touch dead sprites. */
  clear(): void {
    this.entries = [];
  }

  /**
   * Points an already-registered object at a different base texture, and re-applies it.
   *
   * Needed whenever an object's art changes because its *game state* changed — the exit door
   * going from locked to unlocked, say. Without this the skinner keeps the key it saw at
   * registration, so the next visual-mode switch would redraw an unlocked door as locked:
   * the art would contradict what the game will actually let the player do.
   */
  rekey(target: Skinnable, baseKey: string, mode: VisualMode): void {
    const entry = this.entries.find((e) => e.target === target);
    if (entry) entry.baseKey = baseKey;
    else this.entries.push({ target, baseKey });

    const nextKey = this.keyFor(baseKey, mode);
    if (this.baseKeyOf(target) === nextKey) return;
    try {
      target.setTexture(nextKey);
    } catch (error) {
      console.warn(`[theme] could not apply texture "${nextKey}"`, error);
    }
  }

  keyFor(baseKey: string, mode: VisualMode): string {
    return resolveTextureKey(baseKey, mode, this.hasTexture);
  }

  /**
   * The mode-independent texture key an object is currently drawn from, or null if it has no
   * texture to skin. Prefers `displayTexture` so TileSprites report their source art rather
   * than the generated fill canvas they render through.
   */
  baseKeyOf(target: Skinnable): string | null {
    return target.displayTexture?.key ?? target.texture?.key ?? null;
  }

  applyMode(mode: VisualMode): void {
    for (const { target, baseKey } of this.entries) {
      const nextKey = this.keyFor(baseKey, mode);

      // Skip no-op swaps. Besides being wasted work on every object of every switch, Phaser's
      // TileSprite re-renders its fill canvas on setTexture and throws if that canvas is not
      // sized yet — which is exactly what a redundant swap during scene create() hits.
      // Compared against the *source* key, since a TileSprite's own texture.key is a UUID.
      if (this.baseKeyOf(target) === nextKey) continue;

      try {
        target.setTexture(nextKey);
      } catch (error) {
        // A missing or malformed skin is a presentation problem: log it and keep skinning the
        // rest of the world rather than letting one bad texture break the running game.
        console.warn(`[theme] could not apply texture "${nextKey}"`, error);
      }
    }
  }
}
