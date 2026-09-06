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
 * Placeholder art for the level key, the locked door and the fire/lava hazards, on the same
 * terms as the weapon
 * textures: generated only when the key is absent, so defining them in PreloadScene replaces
 * these outright and this becomes a no-op.
 */
export function ensureObjectiveTextures(scene: Phaser.Scene): void {
  // The level key. Drawn side-on so the turn animation — which flips it through zero width —
  // reads as a key rotating about its shaft rather than a card spinning.
  if (!scene.textures.exists('level_key')) {
    const w = 40;
    const h = 22;
    const canvas = scene.textures.createCanvas('level_key', w, h);
    const ctx = canvas?.getContext();
    if (ctx) {
      const gold = ctx.createLinearGradient(0, 2, 0, h - 2);
      gold.addColorStop(0, '#fff2ba');
      gold.addColorStop(0.45, '#ffcf3d');
      gold.addColorStop(1, '#b8791a');

      ctx.strokeStyle = gold;
      ctx.fillStyle = gold;

      // Bow: a ring, left. Drawn as a stroke so the hole stays genuinely transparent.
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(10, h / 2, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Shaft and teeth.
      ctx.fillRect(16, h / 2 - 2.5, 21, 5);
      ctx.fillRect(28, h / 2 + 2, 4, 6);
      ctx.fillRect(34, h / 2 + 2, 3, 5);

      // Specular highlight along the top edge — what makes it read as metal rather than paint.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(17, h / 2 - 2.5, 19, 1.5);
      ctx.beginPath();
      ctx.arc(10, h / 2, 7, Math.PI * 1.15, Math.PI * 1.6);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.stroke();
      canvas!.refresh();
    }
  }

  // Classic mode's key: the same silhouette on a pixel grid, flat fills, hard shadow.
  if (!scene.textures.exists('classic__level_key')) {
    const w = 40;
    const h = 22;
    const canvas = scene.textures.createCanvas('classic__level_key', w, h);
    const ctx = canvas?.getContext();
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      const draw = (colour: string, dx: number, dy: number) => {
        ctx.fillStyle = colour;
        // Bow, as a square ring of blocks.
        ctx.fillRect(3 + dx, 5 + dy, 14, 4);
        ctx.fillRect(3 + dx, 13 + dy, 14, 4);
        ctx.fillRect(3 + dx, 5 + dy, 4, 12);
        ctx.fillRect(13 + dx, 5 + dy, 4, 12);
        // Shaft and teeth.
        ctx.fillRect(17 + dx, 9 + dy, 20, 4);
        ctx.fillRect(28 + dx, 13 + dy, 4, 5);
        ctx.fillRect(34 + dx, 13 + dy, 3, 4);
      };
      draw('#8a5a10', 2, 2);
      draw('#ffd700', 0, 0);
      ctx.fillStyle = '#fff6c9';
      ctx.fillRect(17, 9, 18, 2);
      canvas!.refresh();
    }
  }

  // A locked variant of the exit door for every skin that has a door, swapped back to the
  // unlocked art once the key is taken. Generated per mode so classic mode's locked door is
  // its own art rather than silently falling back to the modern one.
  for (const prefix of ['', 'classic__']) {
    const base = `${prefix}goal_door`;
    const locked = `${prefix}goal_door_locked`;
    if (scene.textures.exists(locked) || !scene.textures.exists(base)) continue;
    const src = scene.textures.get(base).getSourceImage() as HTMLCanvasElement;
    const canvas = scene.textures.createCanvas(locked, src.width, src.height);
    const ctx = canvas?.getContext();
    if (!ctx) continue;
    ctx.drawImage(src, 0, 0);

    // A padlock hanging on the door, so "locked" reads at a glance without needing a caption,
    // and so the moment it disappears is legible as the door being opened by the key.
    const cx = src.width / 2;
    const cy = src.height / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(cx - 10, cy - 9, 20, 24);
    ctx.strokeStyle = '#ff5b5b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 5, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(cx - 7, cy - 2, 14, 12);
    // Keyhole: the shape of the thing the player is looking for.
    ctx.fillStyle = '#7a0f0f';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 1, cy + 2, 2, 5);
    canvas!.refresh();
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
