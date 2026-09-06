import Phaser from 'phaser';
import { enemyFsmReducer, type EnemyFsmContext, type EnemyCapabilities } from './enemyFsm';
import { computeHitboxGeometry, type HitboxConfig } from '../../utils/hitbox';

/** Enemy damage box in world pixels — constant, regardless of idle/hurt animation scaling. */
const ENEMY_HITBOX: HitboxConfig = {
  textureWidth: 64,
  textureHeight: 64,
  hitboxWidth: 24,
  hitboxHeight: 24,
  feetOffsetY: 12,
};

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
    this.syncHitbox();

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

  /**
   * Re-derives the damage box from the sprite's current render scale.
   *
   * Enemies breathe (an idle scale tween) and squash when hurt, and Arcade sizes bodies as
   * `sourceSize × scale` — so without this the enemy's damage box pulsed with its animation,
   * making contact damage subtly inconsistent. Collision is gameplay; animation must not move it.
   */
  protected syncHitbox(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    // See Player.syncHitbox: refresh the cached scale before sizing, or the first frames run
    // with an oversized damage box.
    body.updateBounds();
    const { sizeWidth, sizeHeight, offsetX, offsetY } = computeHitboxGeometry(
      this.sprite.scaleX,
      this.sprite.scaleY,
      ENEMY_HITBOX,
    );
    body.setSize(sizeWidth, sizeHeight, false);
    body.setOffset(offsetX, offsetY);
  }

  tick(dtMs: number, distanceToPlayer: number): void {
    if (this.context.state === 'dead') return;

    // Keep the damage box constant while the idle/hurt tweens scale the sprite.
    this.syncHitbox();

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
