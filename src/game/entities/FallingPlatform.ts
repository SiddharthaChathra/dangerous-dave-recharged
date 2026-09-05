import Phaser from 'phaser';
import type { FallingPlatformDef } from '../levels/types';

export class FallingPlatform {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private triggered = false;
  private readonly fallDelayMs: number;

  constructor(scene: Phaser.Scene, def: FallingPlatformDef) {
    // Hazard-striped texture reads as "this one drops" at a glance; the flat orange
    // tint it replaced was indistinguishable from a solid slab.
    this.sprite = scene.physics.add.sprite(def.x + def.width / 2, def.y + def.height / 2, 'falling_platform');
    this.sprite.setDisplaySize(def.width, def.height);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.fallDelayMs = def.fallDelayMs;
  }

  trigger(scene: Phaser.Scene): void {
    if (this.triggered) return;
    this.triggered = true;
    this.sprite.setTexture('falling_platform_triggered');
    scene.time.delayedCall(this.fallDelayMs, () => {
      (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
      (this.sprite.body as Phaser.Physics.Arcade.Body).setImmovable(false);
    });
  }
}
