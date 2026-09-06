import Phaser from 'phaser';
import type { LevelData } from './types';
import { Player } from '../entities/Player';
import { MovingPlatform } from '../entities/MovingPlatform';
import { FallingPlatform } from '../entities/FallingPlatform';
import { Hazard } from '../entities/Hazard';
import { Collectible } from '../entities/Collectible';
import { WeaponPickup } from '../entities/WeaponPickup';
import { Trophy } from '../entities/Trophy';
import { ensureWeaponTextures, ensureObjectiveTextures } from '../systems/WeaponPlaceholders';
import { EnemyBase } from '../entities/EnemyBase';
import { PatrolEnemy } from '../entities/PatrolEnemy';
import { FlyingEnemy } from '../entities/FlyingEnemy';
import { ChaseEnemy } from '../entities/ChaseEnemy';

const REQUIRED_FIELDS: (keyof LevelData)[] = [
  'id', 'name', 'widthPx', 'heightPx', 'parTimeSeconds', 'playerStart', 'groundY',
  'platforms', 'movingPlatforms', 'fallingPlatforms', 'hazards', 'enemies', 'collectibles',
  'trophy', 'goal', 'backgroundPalette',
];

export interface LevelBuildResult {
  player: Player;
  staticGroup: Phaser.Physics.Arcade.StaticGroup;
  movingPlatforms: MovingPlatform[];
  fallingPlatforms: FallingPlatform[];
  hazards: Hazard[];
  enemies: EnemyBase[];
  collectibles: Collectible[];
  weaponPickups: WeaponPickup[];
  trophy: Trophy;
  totalCollectibles: number;
  level: LevelData;
}

export class LevelLoader {
  static parse(raw: unknown): LevelData {
    if (typeof raw !== 'object' || raw === null) throw new Error('Level data must be an object');
    const data = raw as Record<string, unknown>;
    for (const field of REQUIRED_FIELDS) {
      if (!(field in data)) throw new Error(`Level data missing required field: ${String(field)}`);
    }
    return data as unknown as LevelData;
  }

  static buildInScene(scene: Phaser.Scene, level: LevelData): LevelBuildResult {
    const staticGroup = scene.physics.add.staticGroup();
    for (const platform of level.platforms) {
      // Use platform_tile texture which is 64x64, tileSprite repeats it seamlessly
      const tile = scene.add.tileSprite(
        platform.x + platform.width / 2,
        platform.y + platform.height / 2,
        platform.width,
        platform.height,
        'platform_tile',
      );
      scene.physics.add.existing(tile, true);
      staticGroup.add(tile);
    }

    const movingPlatforms = level.movingPlatforms.map(
      (def) => new MovingPlatform(scene, def.x, def.y, def.width, def.rangePx, def.speedPxPerSec),
    );

    const fallingPlatforms = level.fallingPlatforms.map((def) => new FallingPlatform(scene, def));

    const hazards = level.hazards.map((def) => new Hazard(scene, def));
    const collectibles = level.collectibles.map((def) => new Collectible(scene, def));
    const totalCollectibles = level.collectibles.length;

    // Placeholder art is generated only if the visual owner hasn't defined these textures.
    ensureWeaponTextures(scene);
    ensureObjectiveTextures(scene);
    const trophy = new Trophy(scene, level.trophy);
    const weaponPickups = (level.weaponPickups ?? []).map((def) => new WeaponPickup(scene, def));

    const enemies = level.enemies.map((def) => {
      if (def.kind === 'patrol') {
        return new PatrolEnemy(scene, def.x, def.y, def.rangePx);
      }
      if (def.kind === 'flying') {
        return new FlyingEnemy(scene, def.x, def.y, def.rangePx);
      }
      if (def.kind === 'chase') {
        return new ChaseEnemy(scene, def.x, def.y);
      }
      throw new Error(`Unhandled enemy kind: ${def.kind}`);
    });

    const player = new Player(scene, level.playerStart.x, level.playerStart.y);
    scene.physics.add.collider(player.sprite, staticGroup);
    for (const mp of movingPlatforms) scene.physics.add.collider(player.sprite, mp.sprite);

    return { player, staticGroup, movingPlatforms, fallingPlatforms, hazards, enemies, collectibles, weaponPickups, trophy, totalCollectibles, level };
  }
}
