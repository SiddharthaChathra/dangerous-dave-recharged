import Phaser from 'phaser';
import type { CheckpointDef } from '../levels/types';

export class Checkpoint {
  readonly id: string;
  readonly sprite: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
  private activated = false;

  constructor(scene: Phaser.Scene, def: CheckpointDef) {
    this.id = def.id;
    const rect = scene.add.rectangle(def.x, def.y, 16, 40, 0xfbbf24, 0.6);
    scene.physics.add.existing(rect, true);
    this.sprite = rect as unknown as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
  }

  activate(): boolean {
    if (this.activated) return false;
    this.activated = true;
    this.sprite.setFillStyle(0xfbbf24, 1);
    return true;
  }
}
