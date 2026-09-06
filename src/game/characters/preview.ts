import type { VisualMode } from '../core/visualMode';
import { getVisualMode } from '../core/visualMode';
import { resolvePlayerTextureKey, type PlayerTextureState } from './playerTexture';

/**
 * Minimal view of Phaser's texture manager — just what a preview needs. Declared structurally
 * so UI code never has to import Phaser or reach for a debug global.
 */
export interface PreviewTextureSource {
  exists(key: string): boolean;
  get(key: string): { getSourceImage(): unknown } | undefined;
}

let textureSource: PreviewTextureSource | null = null;

/** Called once at boot with the running game's texture manager. */
export function registerPreviewTextureSource(source: PreviewTextureSource): void {
  textureSource = source;
}

/**
 * The drawable image for a character in a given state, ready to blit into a UI canvas.
 *
 * Goes through the same resolution cascade the in-game player uses, so a preview always shows
 * exactly what will appear in the level — including the fallback to Dave's art for a character
 * whose sprites don't exist yet. Returns null before the game has booted, or if nothing
 * resolves; callers should render a placeholder rather than assume an image.
 */
export function getCharacterPreviewImage(
  characterId: string,
  state: PlayerTextureState = 'idle',
  mode: VisualMode = getVisualMode(),
): CanvasImageSource | null {
  if (!textureSource) return null;

  const key = resolvePlayerTextureKey(state, characterId, mode, (k) => textureSource!.exists(k));
  const image = textureSource.get(key)?.getSourceImage();

  // Phaser hands back an HTMLImageElement for loaded art and an HTMLCanvasElement for the
  // procedurally generated textures this game uses; both are drawable, anything else is not.
  return image instanceof HTMLCanvasElement || image instanceof HTMLImageElement ? image : null;
}
