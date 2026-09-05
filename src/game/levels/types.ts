export interface Vec2 {
  x: number;
  y: number;
}

export interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MovingPlatformDef extends PlatformDef {
  rangePx: number;
  speedPxPerSec: number;
}

export interface FallingPlatformDef extends PlatformDef {
  fallDelayMs: number;
}

export interface HazardDef {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'spike';
}

export type EnemyKind = 'patrol' | 'flying' | 'chase';

export interface EnemyDef {
  kind: EnemyKind;
  x: number;
  y: number;
  rangePx: number;
}

export interface CollectibleDef {
  x: number;
  y: number;
  kind: 'gem' | 'secret';
}

export interface CheckpointDef {
  id: string;
  x: number;
  y: number;
}

export interface LevelData {
  id: string;
  name: string;
  widthPx: number;
  heightPx: number;
  parTimeSeconds: number;
  playerStart: Vec2;
  groundY: number;
  platforms: PlatformDef[];
  movingPlatforms: MovingPlatformDef[];
  fallingPlatforms: FallingPlatformDef[];
  hazards: HazardDef[];
  enemies: EnemyDef[];
  collectibles: CollectibleDef[];
  checkpoints: CheckpointDef[];
  goal: Vec2;
  backgroundPalette: string;
}
