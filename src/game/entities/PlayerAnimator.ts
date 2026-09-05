import Phaser from 'phaser';

export type PlayerAnimState = 'idle' | 'run' | 'jump' | 'fall' | 'hurt' | 'death';

export class PlayerAnimator {
  private runCycleSeconds = 0;
  private currentState: PlayerAnimState = 'idle';
  private readonly baseScale = 0.333; // Sprite is 72x96, logic expects 24x32 (1/3 scale)

  constructor(private readonly scene: Phaser.Scene, private readonly sprite: Phaser.Physics.Arcade.Sprite) {
    this.sprite.setScale(this.baseScale);
  }

  update(dtMs: number, state: PlayerAnimState): void {
    if (state !== this.currentState) this.onStateEnter(state);
    this.currentState = state;

    if (state === 'run') {
      this.runCycleSeconds += dtMs / 1000;
      const bob = Math.abs(Math.sin(this.runCycleSeconds * 12)) * 3;
      this.sprite.setScale(this.baseScale, this.baseScale * (1 - bob * 0.02));
      // Optionally spawn dust particles occasionally while running? 
      // Handled in PlayScene or Player logic is better.
    } else if (state === 'idle') {
      // Very slow breathing
      this.runCycleSeconds += dtMs / 1000;
      const breathe = Math.sin(this.runCycleSeconds * 2);
      this.sprite.setScale(this.baseScale * (1 + breathe * 0.01), this.baseScale * (1 - breathe * 0.01));
    }
  }

  private onStateEnter(state: PlayerAnimState): void {
    // Switch texture if available
    if (['idle', 'run', 'jump', 'fall'].includes(state)) {
      this.sprite.setTexture(`player_${state}`);
    }

    switch (state) {
      case 'jump':
        this.scene.tweens.add({
          targets: this.sprite,
          scaleX: this.baseScale * 0.8,
          scaleY: this.baseScale * 1.3,
          duration: 120,
          yoyo: true,
          ease: 'Quad.Out',
        });
        break;
      case 'fall':
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.setScale(this.baseScale * 1.05, this.baseScale * 0.95);
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
        this.sprite.setTexture('player_fall'); // looks dramatic
        this.scene.tweens.killTweensOf(this.sprite);
        this.scene.tweens.add({ targets: this.sprite, angle: 360, alpha: 0, scale: 0, duration: 600, ease: 'Back.In' });
        break;
      default:
        break;
    }
  }

  playLandAnim(): void {
    // Satisfying squash and stretch on landing
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScale * 1.3,
      scaleY: this.baseScale * 0.7,
      duration: 100,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => this.sprite.setScale(this.baseScale)
    });
  }
}
