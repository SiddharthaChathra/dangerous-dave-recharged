import Phaser from 'phaser';
import { enemyFsmReducer, type EnemyFsmContext, type EnemyCapabilities } from './enemyFsm';

export abstract class EnemyBase {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  context: EnemyFsmContext;
  protected abstract capabilities: EnemyCapabilities;
  protected readonly scene: Phaser.Scene;
  private readonly baseTint: number;

  constructor(scene: Phaser.Scene, x: number, y: number, tint: number) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, '__WHITE');
    this.sprite.setDisplaySize(24, 24);
    this.sprite.setTint(tint);
    this.baseTint = tint;
    this.context = { state: 'patrol', detectionRadius: 150, leashRadius: 300, distanceToPlayer: Infinity, hurtTimerMs: 0 };
  }

  tick(dtMs: number, distanceToPlayer: number): void {
    if (this.context.state === 'dead') return;
    // Guarded above, so reaching 'dead' below always represents a fresh transition this tick.
    this.context = enemyFsmReducer({ ...this.context, distanceToPlayer }, { type: 'TICK', dtMs }, this.capabilities);
    if (this.context.state === 'dead') {
      (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scaleY: 0.2,
        duration: 200,
        onComplete: () => {
          this.sprite.setActive(false).setVisible(false);
        },
      });
    }
    this.onTick(dtMs);
  }

  hit(): void {
    // A HIT event only ever produces 'hurt' (or leaves an already-'dead' enemy alone), so
    // reaching 'hurt' here always represents a genuine hit worth flashing for.
    this.context = enemyFsmReducer(this.context, { type: 'HIT' }, this.capabilities);
    if (this.context.state === 'hurt') {
      this.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(80, () => {
        if (this.sprite.active) this.sprite.setTint(this.baseTint);
      });
    }
  }

  protected abstract onTick(dtMs: number): void;
}
