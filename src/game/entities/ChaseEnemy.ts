import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import type { EnemyCapabilities } from './enemyFsm';

export class ChaseEnemy extends EnemyBase {
  protected capabilities: EnemyCapabilities = { canChase: true };
  private readonly speedPxPerSec = 140;
  private targetX = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_chase');
  }

  setPlayerX(x: number): void {
    this.targetX = x;
  }

  protected onTick(): void {
    if (this.context.state === 'hurt') {
      this.sprite.setVelocityX(0);
      return;
    }
    if (this.context.state !== 'chase') {
      this.sprite.setVelocityX(0);
      return;
    }
    const direction = Math.sign(this.targetX - this.sprite.x);
    this.sprite.setVelocityX(direction * this.speedPxPerSec);
    this.sprite.setFlipX(direction < 0);
  }
}
