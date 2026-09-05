import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import type { EnemyCapabilities } from './enemyFsm';

export class PatrolEnemy extends EnemyBase {
  protected capabilities: EnemyCapabilities = { canChase: false };
  private readonly startX: number;
  private readonly rangePx: number;
  private direction = 1;
  private readonly speedPxPerSec = 60;

  constructor(scene: Phaser.Scene, x: number, y: number, rangePx: number) {
    super(scene, x, y, 'enemy_patrol');
    this.startX = x;
    this.rangePx = rangePx;
  }

  protected onTick(dtMs: number): void {
    if (this.context.state === 'hurt') {
      this.sprite.setVelocityX(0);
      return;
    }
    const dtSeconds = dtMs / 1000;
    const nextX = this.sprite.x + this.direction * this.speedPxPerSec * dtSeconds;
    if (nextX > this.startX + this.rangePx || nextX < this.startX - this.rangePx) this.direction *= -1;
    this.sprite.setVelocityX(this.direction * this.speedPxPerSec);
    this.sprite.setFlipX(this.direction < 0);
  }
}
