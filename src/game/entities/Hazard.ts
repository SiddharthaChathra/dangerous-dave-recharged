import Phaser from 'phaser';
import type { HazardDef } from '../levels/types';

export class Hazard {
  readonly sprite: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };

  constructor(scene: Phaser.Scene, def: HazardDef) {
    const rect = scene.add.rectangle(def.x + def.width / 2, def.y + def.height / 2, def.width, def.height, 0xef4444);
    scene.physics.add.existing(rect, true);
    this.sprite = rect as unknown as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
  }
}
