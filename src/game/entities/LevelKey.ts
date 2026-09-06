// Type-only: this module is pulled in by LevelLoader, which is imported by data-validation
// tests that have no canvas. Importing Phaser as a value would boot its renderer there.
import type Phaser from 'phaser';
import type { Vec2 } from '../levels/types';
import { getVisualMode } from '../core/visualMode';
import { resolveTextureKey } from '../systems/VisualSkinner';

export const KEY_TEXTURE = 'level_key';

/**
 * On-screen size, in world px. Larger than a gem — the key is the one pickup a level cannot be
 * finished without, so it has to read as an objective rather than as loose change — but still
 * small enough to sit inside the level's geometry honestly.
 */
const KEY_DISPLAY_SIZE = 26;

/**
 * The level's key. Collecting it is what unlocks the exit door, so it is the one pickup a
 * level cannot be finished without — the classic Dangerous Dave rule.
 *
 * Its idle presentation is deliberately louder than any other collectible: it hovers, turns,
 * pulses and sparkles. A player who has wandered the level twice should be able to spot it from
 * across the screen and understand, without being told, that it is the thing they are missing.
 */
export class LevelKey {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  /** Additive halo behind the key. Purely decorative; destroyed with the key. */
  private glow?: Phaser.GameObjects.Image;
  private sparkleTimer?: Phaser.Time.TimerEvent;
  private collected = false;
  private baseScaleX = 1;

  constructor(private readonly scene: Phaser.Scene, def: Vec2) {
    const textureKey = resolveTextureKey(KEY_TEXTURE, getVisualMode(), (k) =>
      scene.textures.exists(k),
    );
    this.sprite = scene.physics.add.sprite(def.x, def.y, textureKey);

    // Keep the aspect ratio of whatever art is registered, sized against KEY_DISPLAY_SIZE.
    const source = this.sprite.texture.getSourceImage() as { width: number; height: number };
    const aspect = source?.width && source?.height ? source.width / source.height : 1;
    this.sprite.setDisplaySize(
      aspect >= 1 ? KEY_DISPLAY_SIZE : KEY_DISPLAY_SIZE * aspect,
      aspect >= 1 ? KEY_DISPLAY_SIZE / aspect : KEY_DISPLAY_SIZE,
    );
    this.baseScaleX = this.sprite.scaleX;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.sprite.setDepth(9);

    this.addHalo(def);
    this.addIdleMotion(def);
  }

  /** The soft aura. Skipped when there is no particle art to build it from. */
  private addHalo(def: Vec2): void {
    if (!this.scene.textures.exists('particle')) return;
    this.glow = this.scene.add
      .image(def.x, def.y, 'particle')
      .setDisplaySize(46, 46)
      .setTint(0xffd24a)
      .setAlpha(0.32)
      .setBlendMode('ADD')
      .setDepth(8);

    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.6,
      scale: this.glow.scale * 1.25,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private addIdleMotion(def: Vec2): void {
    // Hover. The halo follows so the aura never separates from the key.
    this.scene.tweens.add({
      targets: this.glow ? [this.sprite, this.glow] : [this.sprite],
      y: def.y - 7,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // A slow turn. Scaling the width through zero and out the other side reads as a key
    // rotating about its long axis, which a flat sprite cannot do by spinning in the plane.
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: -this.baseScaleX,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // An occasional glint, rather than a constant shower, so it draws the eye without nagging.
    this.sparkleTimer = this.scene.time.addEvent({
      delay: 1600,
      loop: true,
      callback: () => this.emitGlint(),
    });
  }

  private emitGlint(): void {
    if (this.collected || !this.sprite.active) return;
    const glint = this.scene.add
      .image(
        this.sprite.x + (Math.random() * 20 - 10),
        this.sprite.y + (Math.random() * 20 - 10),
        'particle',
      )
      .setDisplaySize(7, 7)
      .setTint(0xfff6c9)
      .setBlendMode('ADD')
      .setDepth(10);
    this.scene.tweens.add({
      targets: glint,
      alpha: 0,
      scale: glint.scale * 2.4,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => glint.destroy(),
    });
  }

  /** Re-resolves the key's art for a presentation mode. Visual only — never touches the body. */
  refreshSkin(): void {
    const next = resolveTextureKey(KEY_TEXTURE, getVisualMode(), (k) => this.scene.textures.exists(k));
    if (this.sprite.texture.key !== next) this.sprite.setTexture(next);
  }

  get isCollected(): boolean {
    return this.collected;
  }

  /** Idempotent: only the first contact counts. */
  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    this.sparkleTimer?.remove();
    this.scene.tweens.killTweensOf(this.sprite);
    if (this.glow) {
      this.scene.tweens.killTweensOf(this.glow);
      this.scene.tweens.add({
        targets: this.glow,
        alpha: 0,
        scale: this.glow.scale * 2.2,
        duration: 260,
        onComplete: () => this.glow?.destroy(),
      });
    }
    return true;
  }
}
