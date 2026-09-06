import Phaser from 'phaser';
import { getVisualMode } from '../core/visualMode';
import { getSelectedCharacterId } from '../characters/selection';
import { resolvePlayerTextureKey, type PlayerTextureState } from '../characters/playerTexture';

export type PlayerAnimState = 'idle' | 'run' | 'jump' | 'fall' | 'hurt' | 'death';

/** States that have their own texture; the rest are pure tween effects on the current one. */
const TEXTURED_STATES: PlayerAnimState[] = ['idle', 'run', 'jump', 'fall'];

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
      const isClassic = getVisualMode() === 'classic';
      if (!isClassic) {
          const bob = Math.abs(Math.sin(this.runCycleSeconds * 12)) * 3;
          this.sprite.setScale(this.baseScale, this.baseScale * (1 - bob * 0.02));
      }
    } else if (state === 'idle') {
      // Very slow breathing
      this.runCycleSeconds += dtMs / 1000;
      const isClassic = getVisualMode() === 'classic';
      if (!isClassic) {
          const breathe = Math.sin(this.runCycleSeconds * 2);
          this.sprite.setScale(this.baseScale * (1 + breathe * 0.01), this.baseScale * (1 - breathe * 0.01));
      }
    }
  }

  /**
   * The texture for a state in the active presentation mode, falling back to the base art when
   * no classic variant is registered. Visual-only: the sprite's body/hitbox never changes.
   */
  private textureKeyFor(state: PlayerAnimState): string {
    return resolvePlayerTextureKey(
      state as PlayerTextureState,
      getSelectedCharacterId(),
      getVisualMode(),
      (key) => this.scene.textures.exists(key),
    );
  }

  /** Re-applies the current state's texture — used when the presentation mode changes. */
  refreshSkin(): void {
    if (TEXTURED_STATES.includes(this.currentState)) {
      this.sprite.setTexture(this.textureKeyFor(this.currentState));
    }
  }

  private onStateEnter(state: PlayerAnimState): void {
    const isClassic = getVisualMode() === 'classic';
    // Switch texture if available
    if (TEXTURED_STATES.includes(state)) {
      this.sprite.setTexture(this.textureKeyFor(state));
    }

    switch (state) {
      case 'jump':
        if (!isClassic) {
          this.scene.tweens.add({
            targets: this.sprite,
            scaleX: this.baseScale * 0.8,
            scaleY: this.baseScale * 1.3,
            duration: 120,
            yoyo: true,
            ease: 'Quad.Out',
          });
        }
        break;
      case 'fall':
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.setScale(this.baseScale * 1.05, this.baseScale * 0.95);
        break;
      case 'hurt':
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0.3,
          duration: isClassic ? 40 : 80,
          yoyo: true,
          repeat: isClassic ? 6 : 3,
          ease: isClassic ? 'Stepped' : 'Linear',
          onComplete: () => this.sprite.setAlpha(1),
        });
        break;
      case 'death':
        this.sprite.setTexture(this.textureKeyFor('fall')); // looks dramatic
        this.scene.tweens.killTweensOf(this.sprite);
        if (isClassic) {
            this.scene.tweens.add({ targets: this.sprite, angle: 360, alpha: 0, duration: 400, ease: 'Linear' });
        } else {
            this.scene.tweens.add({ targets: this.sprite, angle: 360, alpha: 0, scale: 0, duration: 600, ease: 'Back.In' });
        }
        break;
      default:
        break;
    }
  }

  /**
   * Firing kickback: a short nudge opposite the shot, purely on the sprite's rendered offset.
   * Gemini owns this tween's feel; it must stay visual — never touch the body or velocity.
   */
  playRecoil(_facingLeft: boolean): void {
    // Scale, not position: the sprite's x/y is owned by the physics body every frame, so
    // tweening position here would fight physics and genuinely displace Dave. Arcade body size
    // is unscaled (see Player's constructor), so scaling is guaranteed hitbox-neutral.
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScale * 0.88,
      scaleY: this.baseScale * 1.08,
      duration: 70,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => this.sprite.setScale(this.baseScale),
    });
  }

  playLandAnim(): void {
    const isClassic = getVisualMode() === 'classic';
    if (isClassic) return;
    
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
