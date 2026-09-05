import Phaser from 'phaser';

export class MovingPlatform {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly startX: number;
  private readonly rangePx: number;
  private readonly speedPxPerSec: number;
  private direction = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, widthPx: number, rangePx: number, speedPxPerSec: number) {
    this.sprite = scene.physics.add.sprite(x, y, '__WHITE');
    this.sprite.setDisplaySize(widthPx, 16);
    this.sprite.setTint(0x94a3b8);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.startX = x;
    this.rangePx = rangePx;
    this.speedPxPerSec = speedPxPerSec;
  }

  update(dtMs: number): void {
    const dtSeconds = dtMs / 1000;
    const deltaX = this.direction * this.speedPxPerSec * dtSeconds;
    const nextX = this.sprite.x + deltaX;
    if (nextX > this.startX + this.rangePx || nextX < this.startX - this.rangePx) {
      this.direction *= -1;
    }
    this.sprite.setVelocityX(this.direction * this.speedPxPerSec);
  }
}
