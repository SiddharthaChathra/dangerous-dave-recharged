import Phaser from 'phaser';
import { enemyFsmReducer, type EnemyFsmContext, type EnemyCapabilities } from './enemyFsm';

export abstract class EnemyBase {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  context: EnemyFsmContext;
  protected abstract capabilities: EnemyCapabilities;
  protected readonly scene: Phaser.Scene;
  private readonly originalScale = 0.375; // 64x64 texture, 24x24 logic -> 24/64 = 0.375

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setScale(this.originalScale);
    // Unscaled physics body size calculation
    const unscaledSize = 24 / this.originalScale;
    (this.sprite.body as Phaser.Physics.Arcade.Body).setSize(unscaledSize, unscaledSize);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setOffset((64 - unscaledSize) / 2, (64 - unscaledSize) / 2);
    
    // Add subtle idle breathing animation
    scene.tweens.add({
      targets: this.sprite,
      scaleY: this.originalScale * 0.95,
      scaleX: this.originalScale * 1.05,
      duration: 800 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.context = { state: 'patrol', detectionRadius: 150, leashRadius: 300, distanceToPlayer: Infinity, hurtTimerMs: 0 };
  }

  tick(dtMs: number, distanceToPlayer: number): void {
    if (this.context.state === 'dead') return;
    
    const oldState = this.context.state;
    this.context = enemyFsmReducer({ ...this.context, distanceToPlayer }, { type: 'TICK', dtMs }, this.capabilities);
    
    // Animate state transitions (visual cues)
    if (this.context.state !== oldState) {
      // 'chase' is the alert state in the FSM (see enemyFsm.ts's EnemyState union).
      if (this.context.state === 'chase') {
        // Pop scale when alerted
        this.scene.tweens.add({
          targets: this.sprite,
          scale: this.originalScale * 1.2,
          duration: 150,
          yoyo: true,
          ease: 'Bounce.Out'
        });
      }
    }

    if (this.context.state === 'dead') {
      (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
      this.scene.tweens.killTweensOf(this.sprite);
      
      // Emit death particles
      this.scene.events.emit('enemy:died', this.sprite.x, this.sprite.y);
      
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scale: 0,
        angle: 180,
        duration: 300,
        ease: 'Back.In',
        onComplete: () => {
          this.sprite.setActive(false).setVisible(false);
        },
      });
    }
    this.onTick(dtMs);
  }

  hit(): void {
    this.context = enemyFsmReducer(this.context, { type: 'HIT' }, this.capabilities);
    if (this.context.state === 'hurt') {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setTintFill(0xffffff);
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: this.originalScale * 1.3,
        scaleY: this.originalScale * 0.7,
        duration: 100,
        yoyo: true,
        ease: 'Quad.Out',
        onComplete: () => {
          this.sprite.clearTint();
          this.sprite.setScale(this.originalScale);
        }
      });
      this.scene.time.delayedCall(100, () => {
        if (this.sprite.active) this.sprite.clearTint();
      });
    }
  }

  protected abstract onTick(dtMs: number): void;
}
