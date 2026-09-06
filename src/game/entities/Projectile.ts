import Phaser from 'phaser';
import { PROJECTILE_TEXTURE } from '../systems/WeaponPlaceholders';
import { hasExceededRange } from '../../utils/weapon';

/** Vertical reach of a shot's collision box, in px. See the note in the constructor. */
const PROJECTILE_HITBOX_HEIGHT = 20;

/**
 * Dave's shot. Travels horizontally at a constant speed, ignoring gravity, and is destroyed on
 * the first thing it touches (enemy, platform) or when it leaves the level.
 */
export class Projectile {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private destroyed = false;
  private readonly spawnX: number;

  constructor(scene: Phaser.Scene, x: number, y: number, velocityX: number) {
    this.spawnX = x;
    this.sprite = scene.physics.add.sprite(x, y, PROJECTILE_TEXTURE);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    // The shot's collision box is deliberately taller than the 6px sprite. Fired from the
    // player's centre, a pixel-accurate bullet passes *under* an enemy standing on the same
    // ground by a couple of pixels — which made the gun useless against exactly the enemies
    // you most want to shoot. A forgiving vertical box makes hits read the way they look.
    body.setSize(body.width, PROJECTILE_HITBOX_HEIGHT, true);
    this.sprite.setVelocity(velocityX, 0);
    this.sprite.setFlipX(velocityX < 0);
    this.sprite.setDepth(12);
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /** True once the shot has left the level or flown its maximum range, and should be reaped. */
  isSpent(levelWidthPx: number, levelHeightPx: number, maxRangePx: number): boolean {
    const { x, y } = this.sprite;
    if (x < 0 || x > levelWidthPx || y < 0 || y > levelHeightPx) return true;
    return hasExceededRange(this.spawnX, x, maxRangePx);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.sprite.destroy();
  }
}
