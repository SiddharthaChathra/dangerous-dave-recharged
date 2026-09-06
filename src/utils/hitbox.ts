export interface HitboxConfig {
  /** Source texture dimensions the sprite is drawn from. */
  textureWidth: number;
  textureHeight: number;
  /** The collision box in world pixels. Constant — this is gameplay, not presentation. */
  hitboxWidth: number;
  hitboxHeight: number;
  /** How far below the sprite's centre the feet (hitbox bottom) sit, in world pixels. */
  feetOffsetY: number;
}

export interface HitboxGeometry {
  /** Unscaled body size to hand to Arcade's `setSize`. */
  sizeWidth: number;
  sizeHeight: number;
  /** Unscaled body offset to hand to Arcade's `setOffset`. */
  offsetX: number;
  offsetY: number;
}

/**
 * Works out the body size/offset that yields a *constant* world-space hitbox for a sprite
 * currently rendered at the given scale.
 *
 * Arcade Physics derives a body's world size from `sourceSize × sprite scale`, so any cosmetic
 * scale tween (squash on landing, idle breathing, firing recoil) silently resizes the collision
 * box — and a theme that disables those tweens then plays with a *different* hitbox than one
 * that keeps them. Dividing the target size by the live scale cancels that out, so animation and
 * presentation can do whatever they like without touching collision.
 */
export function computeHitboxGeometry(scaleX: number, scaleY: number, config: HitboxConfig): HitboxGeometry {
  // A zero/NaN scale would blow up the division; fall back to 1 (identity) instead.
  const sx = Number.isFinite(scaleX) && scaleX !== 0 ? scaleX : 1;
  const sy = Number.isFinite(scaleY) && scaleY !== 0 ? scaleY : 1;

  return {
    sizeWidth: config.hitboxWidth / sx,
    sizeHeight: config.hitboxHeight / sy,
    // Centres the box horizontally on the sprite.
    offsetX: config.textureWidth / 2 - config.hitboxWidth / 2 / sx,
    // Pins the box's bottom edge `feetOffsetY` below the sprite centre, so the feet never drift.
    offsetY: config.textureHeight / 2 - (config.hitboxHeight - config.feetOffsetY) / sy,
  };
}
