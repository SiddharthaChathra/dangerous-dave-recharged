import Phaser from 'phaser';
import type { Vec2 } from '../levels/types';

export const TROPHY_TEXTURE = 'trophy';

/**
 * On-screen size of the trophy, in world px. Matched to the collectibles (~18px) so it reads as
 * a pickup sitting in the level rather than a piece of UI dropped into the world — it was
 * noticeably larger than the gems and pulled the eye away from the platforming.
 *
 * Set as a display size rather than a scale so it stays consistent no matter what dimensions
 * the art is authored at.
 */
const TROPHY_DISPLAY_SIZE = 18;

/**
 * The level's trophy. Collecting it is what unlocks the exit door, so it is the one pickup a
 * level cannot be finished without — the classic Dangerous Dave rule.
 */
export class Trophy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private collected = false;

  constructor(scene: Phaser.Scene, def: Vec2) {
    this.sprite = scene.physics.add.sprite(def.x, def.y, TROPHY_TEXTURE);
    // Keep the aspect ratio of whatever art is registered, sized to sit alongside the gems.
    const source = this.sprite.texture.getSourceImage() as { width: number; height: number };
    const aspect = source?.width && source?.height ? source.width / source.height : 1;
    this.sprite.setDisplaySize(
      aspect >= 1 ? TROPHY_DISPLAY_SIZE : TROPHY_DISPLAY_SIZE * aspect,
      aspect >= 1 ? TROPHY_DISPLAY_SIZE / aspect : TROPHY_DISPLAY_SIZE,
    );
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.sprite.setDepth(9);

    // A slow hover so the objective reads as important rather than as scenery.
    scene.tweens.add({
      targets: this.sprite,
      y: def.y - 6,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  get isCollected(): boolean {
    return this.collected;
  }

  /** Idempotent: only the first contact counts. */
  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    return true;
  }
}
