import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import type { EnemyCapabilities } from './enemyFsm';

export class FlyingEnemy extends EnemyBase {
  protected capabilities: EnemyCapabilities = { canChase: false };
  private readonly baseY: number;
  private readonly amplitudePx: number;
  private elapsedSeconds = 0;
  private readonly periodSeconds = 2.5;

  constructor(scene: Phaser.Scene, x: number, y: number, amplitudePx: number) {
    super(scene, x, y, 'enemy_flying');
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.baseY = y;
    this.amplitudePx = amplitudePx;
  }

  protected onTick(dtMs: number): void {
    if (this.context.state === 'hurt') return;
    this.elapsedSeconds += dtMs / 1000;
    const offset = Math.sin((this.elapsedSeconds / this.periodSeconds) * Math.PI * 2) * this.amplitudePx;
    this.sprite.y = this.baseY + offset;
  }
}
