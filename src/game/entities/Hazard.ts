import Phaser from 'phaser';
import type { HazardDef, HazardKind } from '../levels/types';
import { computeHazardDamageBox, HAZARD_INSET } from '../../utils/hazardBounds';

export class Hazard {
  readonly sprite: Phaser.GameObjects.TileSprite & { body: Phaser.Physics.Arcade.StaticBody };
  /** Which hazard this is. Selects presentation only — every kind deals identical damage. */
  readonly kind: HazardKind;

  constructor(scene: Phaser.Scene, def: HazardDef) {
    this.kind = def.kind;
    // TileSprite repeats the 64x40 spike texture horizontally to fill the hazard area
    // Texture per kind; behaviour is identical for all of them, so a level's difficulty never
    // depends on which hazard art was chosen. Falls back to spikes if the art isn't registered.
    const textureKey = scene.textures.exists(def.kind) ? def.kind : 'spike';
    const tile = scene.add.tileSprite(def.x + def.width / 2, def.y + def.height / 2, def.width, def.height, textureKey);
    scene.physics.add.existing(tile, true);
    this.sprite = tile as unknown as Phaser.GameObjects.TileSprite & { body: Phaser.Physics.Arcade.StaticBody };

    // The sprite is drawn as spikes — pointed tips with gaps and empty air above them — so the
    // damage area is deliberately smaller than the drawing. Colliding on the full rectangle is
    // what made hazards kill the player for grazing visually empty space.
    const damage = computeHazardDamageBox(def, HAZARD_INSET);
    const body = this.sprite.body;
    body.setSize(damage.width, damage.height);
    // StaticBody positions by its top-left corner and needs its cached centre refreshed.
    body.position.set(damage.x, damage.y);
    body.updateCenter();
  }
}
