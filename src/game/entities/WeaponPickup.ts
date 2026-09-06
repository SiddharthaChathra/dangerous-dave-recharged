import Phaser from 'phaser';
import type { Vec2 } from '../levels/types';
import { WEAPON_PICKUP_TEXTURE } from '../systems/WeaponPlaceholders';

/**
 * The gun lying in the level. Collecting it arms Dave for the rest of the level attempt; dying
 * re-stages the level, so the gun must be found again — the same bargain as the original.
 */
export class WeaponPickup {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private collected = false;

  constructor(scene: Phaser.Scene, def: Vec2) {
    this.sprite = scene.physics.add.sprite(def.x, def.y, WEAPON_PICKUP_TEXTURE);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.sprite.setDepth(8);

    scene.tweens.add({
      targets: this.sprite,
      y: def.y - 5,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Idempotent: returns true only for the pickup that actually armed the player. */
  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.sprite.setVisible(false);
    return true;
  }
}
