import Phaser from 'phaser';
import type { HazardDef } from '../levels/types';

export class Hazard {
  readonly sprite: Phaser.GameObjects.TileSprite & { body: Phaser.Physics.Arcade.StaticBody };

  constructor(scene: Phaser.Scene, def: HazardDef) {
    // TileSprite repeats the 64x40 spike texture horizontally to fill the hazard area
    const tile = scene.add.tileSprite(def.x + def.width / 2, def.y + def.height / 2, def.width, def.height, 'spike');
    scene.physics.add.existing(tile, true);
    this.sprite = tile as unknown as Phaser.GameObjects.TileSprite & { body: Phaser.Physics.Arcade.StaticBody };
    // Adjust physics body to only cover the bottom solid part or sharp tips?
    // The physics rect matches def sizes which is fine.
  }
}
