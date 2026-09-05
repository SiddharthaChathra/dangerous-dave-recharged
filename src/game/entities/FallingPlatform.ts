import Phaser from 'phaser';
import type { FallingPlatformDef } from '../levels/types';

export class FallingPlatform {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private triggered = false;
  private readonly fallDelayMs: number;

  constructor(scene: Phaser.Scene, def: FallingPlatformDef) {
    this.sprite = scene.physics.add.sprite(def.x + def.width / 2, def.y + def.height / 2, '__WHITE');
    this.sprite.setDisplaySize(def.width, def.height);
    this.sprite.setTint(0xb45309);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.fallDelayMs = def.fallDelayMs;
  }

  trigger(scene: Phaser.Scene): void {
    if (this.triggered) return;
    this.triggered = true;
    this.sprite.setTint(0xef4444);
    scene.time.delayedCall(this.fallDelayMs, () => {
      (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
      (this.sprite.body as Phaser.Physics.Arcade.Body).setImmovable(false);
    });
  }
}
