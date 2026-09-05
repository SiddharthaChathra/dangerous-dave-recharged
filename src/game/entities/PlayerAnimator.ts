import Phaser from 'phaser';

export type PlayerAnimState = 'idle' | 'run' | 'jump' | 'fall' | 'hurt' | 'death';

export class PlayerAnimator {
  private runCycleSeconds = 0;
  private currentState: PlayerAnimState = 'idle';

  constructor(private readonly scene: Phaser.Scene, private readonly sprite: Phaser.Physics.Arcade.Sprite) {}

  update(dtMs: number, state: PlayerAnimState): void {
    if (state !== this.currentState) this.onStateEnter(state);
    this.currentState = state;

    if (state === 'run') {
      this.runCycleSeconds += dtMs / 1000;
      const bob = Math.abs(Math.sin(this.runCycleSeconds * 10)) * 3;
      this.sprite.setScale(1, 1 - bob * 0.01);
      this.sprite.y -= 0; // bob is visual-only via scale, position stays physics-driven
    } else if (state === 'idle') {
      this.sprite.setScale(1, 1);
    }
  }

  private onStateEnter(state: PlayerAnimState): void {
    switch (state) {
      case 'jump':
        this.scene.tweens.add({ targets: this.sprite, scaleX: 0.8, scaleY: 1.2, duration: 120, yoyo: true, ease: 'Quad.Out' });
        break;
      case 'fall':
        this.sprite.setScale(1.05, 0.95);
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
