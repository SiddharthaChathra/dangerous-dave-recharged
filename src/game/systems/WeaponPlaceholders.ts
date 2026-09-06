import type Phaser from 'phaser';

/**
 * Texture keys for the weapon entities. These are part of the visual contract — see
 * THEME_INTEGRATION.md — and follow the same `classic__<key>` skinning convention as the rest
 * of the world.
 */
export const PROJECTILE_TEXTURE = 'projectile';
export const WEAPON_PICKUP_TEXTURE = 'weapon_pickup';

/**
 * Draws *placeholder* art for the weapon entities, and only for keys that don't already exist.
 *
 * Shooting is gameplay, so it can't wait on art to exist — but the art itself belongs to the
 * visual owner. Defining `projectile` / `weapon_pickup` in PreloadScene overrides these
 * completely (this generator then does nothing), which keeps PreloadScene wholly Gemini's file
 * while gameplay stays playable in the meantime.
 */
/**
 * Placeholder art for the trophy and the fire/lava hazards, on the same terms as the weapon
 * textures: generated only when the key is absent, so defining them in PreloadScene replaces
 * these outright and this becomes a no-op.
 */
export function ensureObjectiveTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists('trophy')) {
    const w = 26;
    const h = 30;
    const canvas = scene.textures.createCanvas('trophy', w, h);
    const ctx = canvas?.getContext();
    if (ctx) {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(5, 3, 16, 12); // cup
      ctx.fillRect(11, 15, 4, 8); // stem
      ctx.fillRect(7, 23, 12, 4); // base
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(7, 5, 4, 8); // highlight
      canvas!.refresh();
    }
  }

  // A locked variant of the exit door, swapped back to `goal_door` once the trophy is taken.
  if (!scene.textures.exists('goal_door_locked') && scene.textures.exists('goal_door')) {
    const src = scene.textures.get('goal_door').getSourceImage() as HTMLCanvasElement;
    const canvas = scene.textures.createCanvas('goal_door_locked', src.width, src.height);
    const ctx = canvas?.getContext();
    if (ctx) {
      ctx.drawImage(src, 0, 0);
      // Red padlock so "locked" reads at a glance rather than needing a caption.
      const cx = src.width / 2;
      const cy = src.height / 2;
      ctx.fillStyle = '#ff3b3b';
      ctx.fillRect(cx - 7, cy - 2, 14, 12);
      ctx.strokeStyle = '#ff3b3b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 5, Math.PI, 0);
      ctx.stroke();
      canvas!.refresh();
    }
  }

  // The between-levels corridor's brick, matching the original's bright blue passage. Kept
  // separate from `platform_tile` so the interstitial can read boldly without changing how
  // in-level platforms look.
  if (!scene.textures.exists('transition_brick')) {
    const w = 64;
    const h = 24;
    const canvas = scene.textures.createCanvas('transition_brick', w, h);
    const ctx = canvas?.getContext();
    if (ctx) {
      ctx.fillStyle = '#0a0a2a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1414ff';
      // Offset courses, mortar lines left dark, as in the reference.
      for (let row = 0; row < 2; row++) {
        const offset = row % 2 === 0 ? 0 : 16;
        for (let x = -16; x < w; x += 32) {
          ctx.fillRect(x + offset + 1, row * 12 + 1, 30, 10);
        }
      }
      ctx.fillStyle = '#4d4dff';
      for (let row = 0; row < 2; row++) {
        const offset = row % 2 === 0 ? 0 : 16;
        for (let x = -16; x < w; x += 32) ctx.fillRect(x + offset + 1, row * 12 + 1, 30, 3);
      }
      canvas!.refresh();
    }
  }

  // Fire and lava are drawn as warm blocks; the damage box is inset by the hazard geometry.
  const hazardArt: Record<string, [string, string]> = {
    fire: ['#ff6b1a', '#ffd166'],
    lava: ['#e63946', '#ff8500'],
  };
  for (const [key, [base, hot]] of Object.entries(hazardArt)) {
    if (scene.textures.exists(key)) continue;
    const w = 64;
    const h = 40;
    const canvas = scene.textures.createCanvas(key, w, h);
    const ctx = canvas?.getContext();
    if (!ctx) continue;
    ctx.fillStyle = base;
    ctx.fillRect(0, 8, w, h - 8);
    ctx.fillStyle = hot;
    for (let i = 0; i < w; i += 16) {
      ctx.fillRect(i + 2, 2, 12, 14); // flame tips
    }
    canvas!.refresh();
  }
}

export function ensureWeaponTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(PROJECTILE_TEXTURE)) {
    const w = 10;
    const h = 6;
    const canvas = scene.textures.createCanvas(PROJECTILE_TEXTURE, w, h);
    const ctx = canvas?.getContext();
    if (ctx) {
      ctx.fillStyle = '#ffe98a';
      ctx.fillRect(0, 2, w, 2);
      ctx.fillStyle = '#fff6d0';
      ctx.fillRect(w - 4, 1, 4, 4);
      canvas!.refresh();
    }
  }

  if (!scene.textures.exists(WEAPON_PICKUP_TEXTURE)) {
    const w = 22;
    const h = 14;
    const canvas = scene.textures.createCanvas(WEAPON_PICKUP_TEXTURE, w, h);
    const ctx = canvas?.getContext();
    if (ctx) {
      ctx.fillStyle = '#9aa3b8';
      ctx.fillRect(2, 4, 16, 5); // barrel
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(4, 9, 6, 5); // grip
      ctx.fillStyle = '#ffe98a';
      ctx.fillRect(17, 5, 4, 3); // muzzle highlight
      canvas!.refresh();
    }
  }
}
