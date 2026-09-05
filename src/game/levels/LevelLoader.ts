import Phaser from 'phaser';
import type { LevelData } from './types';
import { Player } from '../entities/Player';
import { MovingPlatform } from '../entities/MovingPlatform';

const REQUIRED_FIELDS: (keyof LevelData)[] = [
  'id', 'name', 'widthPx', 'heightPx', 'parTimeSeconds', 'playerStart', 'groundY',
  'platforms', 'movingPlatforms', 'hazards', 'enemies', 'collectibles', 'checkpoints',
  'goal', 'backgroundPalette',
];

export interface LevelBuildResult {
  player: Player;
  staticGroup: Phaser.Physics.Arcade.StaticGroup;
  movingPlatforms: MovingPlatform[];
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
      const rect = scene.add.rectangle(
        platform.x + platform.width / 2,
        platform.y + platform.height / 2,
        platform.width,
        platform.height,
        0x333344,
      );
      scene.physics.add.existing(rect, true);
      staticGroup.add(rect);
    }

    const movingPlatforms = level.movingPlatforms.map(
      (def) => new MovingPlatform(scene, def.x, def.y, def.width, def.rangePx, def.speedPxPerSec),
    );

    const player = new Player(scene, level.playerStart.x, level.playerStart.y);
    scene.physics.add.collider(player.sprite, staticGroup);
    for (const mp of movingPlatforms) scene.physics.add.collider(player.sprite, mp.sprite);

    return { player, staticGroup, movingPlatforms, level };
  }
}
