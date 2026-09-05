import Phaser from 'phaser';
import type { CollectibleDef } from '../levels/types';

export class Collectible {
  readonly kind: CollectibleDef['kind'];
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private collected = false;

  constructor(scene: Phaser.Scene, def: CollectibleDef) {
    this.kind = def.kind;
    this.sprite = scene.physics.add.sprite(def.x, def.y, '__WHITE');
    this.sprite.setDisplaySize(14, 14);
    this.sprite.setTint(def.kind === 'secret' ? 0xf472b6 : 0xfacc15);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }

  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;
    this.sprite.setActive(false).setVisible(false);
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    return true;
  }
}
