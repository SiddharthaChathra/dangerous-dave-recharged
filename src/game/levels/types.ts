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

/**
 * Environmental hazards. All are lethal on contact and share one damage path; the kind only
 * selects presentation (texture + particle flavour), never behaviour, so difficulty stays a
 * property of placement rather than of which art was chosen.
 */
export type HazardKind = 'spike' | 'fire' | 'lava';

export interface HazardDef {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: HazardKind;
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
  /**
   * Gun pickups. Optional: a level without one is played unarmed, so enemies must be avoided
   * rather than fought.
   */
  weaponPickups?: Vec2[];
  /**
   * The level's key. It must be collected before the exit door will open — the classic
   * Dangerous Dave rule. Every level has exactly one.
   */
  key: Vec2;
  goal: Vec2;
  backgroundPalette: string;
}
