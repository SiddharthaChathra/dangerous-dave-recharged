import Phaser from 'phaser';
import type { CollectibleDef } from '../levels/types';

export class Collectible {
  readonly kind: CollectibleDef['kind'];
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private collected = false;

  constructor(scene: Phaser.Scene, def: CollectibleDef) {
    this.kind = def.kind;
    this.sprite = scene.physics.add.sprite(def.x, def.y, def.kind === 'secret' ? 'secret_gem' : 'gem');
    this.sprite.setScale(0.35); // 40x40 to 14x14
    (this.sprite.body as Phaser.Physics.Arcade.Body).setSize(14 / 0.35, 14 / 0.35);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setOffset((40 - 14/0.35) / 2, (40 - 14/0.35) / 2);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    
    scene.tweens.add({
      targets: this.sprite,
      y: def.y - 4,
      duration: 1000 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;
    this.sprite.setActive(false).setVisible(false);
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    return true;
  }
}
