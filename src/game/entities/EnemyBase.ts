import Phaser from 'phaser';
import { enemyFsmReducer, type EnemyFsmContext, type EnemyCapabilities } from './enemyFsm';

export abstract class EnemyBase {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  context: EnemyFsmContext;
  protected abstract capabilities: EnemyCapabilities;

  constructor(scene: Phaser.Scene, x: number, y: number, tint: number) {
    this.sprite = scene.physics.add.sprite(x, y, '__WHITE');
    this.sprite.setDisplaySize(24, 24);
    this.sprite.setTint(tint);
    this.context = { state: 'patrol', detectionRadius: 150, leashRadius: 300, distanceToPlayer: Infinity, hurtTimerMs: 0 };
  }

  tick(dtMs: number, distanceToPlayer: number): void {
    if (this.context.state === 'dead') return;
    this.context = enemyFsmReducer({ ...this.context, distanceToPlayer }, { type: 'TICK', dtMs }, this.capabilities);
    if (this.context.state === 'dead') {
      this.sprite.setActive(false).setVisible(false);
      (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    }
    this.onTick(dtMs);
  }

  hit(): void {
    this.context = enemyFsmReducer(this.context, { type: 'HIT' }, this.capabilities);
  }

  protected abstract onTick(dtMs: number): void;
}
