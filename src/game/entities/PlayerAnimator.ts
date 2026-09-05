import Phaser from 'phaser';

export type PlayerAnimState = 'idle' | 'run' | 'jump' | 'fall' | 'hurt' | 'death';

export class PlayerAnimator {
  private runCycleSeconds = 0;
  private currentState: PlayerAnimState = 'idle';
  // Captured at construction time (after Player's constructor calls setDisplaySize(24,32) on
  // the 4x4 '__WHITE' texture, giving scale (6,8)) — every animation-driven scale below must
  // be relative to THIS base, not an assumed base of (1,1), or the sprite shrinks to its raw
  // 4x4 texture size the instant any animation state runs.
  private readonly baseScaleX: number;
  private readonly baseScaleY: number;

  constructor(private readonly scene: Phaser.Scene, private readonly sprite: Phaser.Physics.Arcade.Sprite) {
    this.baseScaleX = sprite.scaleX;
    this.baseScaleY = sprite.scaleY;
  }

  update(dtMs: number, state: PlayerAnimState): void {
    if (state !== this.currentState) this.onStateEnter(state);
    this.currentState = state;

    if (state === 'run') {
      this.runCycleSeconds += dtMs / 1000;
      const bob = Math.abs(Math.sin(this.runCycleSeconds * 10)) * 3;
      this.sprite.setScale(this.baseScaleX, this.baseScaleY * (1 - bob * 0.01));
    } else if (state === 'idle') {
      this.sprite.setScale(this.baseScaleX, this.baseScaleY);
    }
  }

  private onStateEnter(state: PlayerAnimState): void {
    switch (state) {
      case 'jump':
        this.scene.tweens.add({
          targets: this.sprite,
          scaleX: this.baseScaleX * 0.8,
          scaleY: this.baseScaleY * 1.2,
          duration: 120,
          yoyo: true,
          ease: 'Quad.Out',
        });
        break;
      case 'fall':
        this.sprite.setScale(this.baseScaleX * 1.05, this.baseScaleY * 0.95);
        break;
      case 'hurt':
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0.3,
          duration: 80,
          yoyo: true,
          repeat: 3,
          onComplete: () => this.sprite.setAlpha(1),
        });
        break;
      case 'death':
        this.scene.tweens.add({ targets: this.sprite, angle: 360, alpha: 0, duration: 500, ease: 'Cubic.In' });
        break;
      default:
        break;
    }
  }
}
