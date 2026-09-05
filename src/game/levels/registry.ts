import type { LevelData } from './types';
import { level001 } from './level001';

/**
 * Single source of truth for available levels, keyed by level id.
 * Tasks 14-15 add level002/level003 here — both main.ts and PlayScene
 * import this map so the level list never drifts between the two.
 */
export const LEVELS: Record<string, LevelData> = {
  level001,
};

export const DEFAULT_LEVEL_ID = 'level001';

/** Resolves a level id to its LevelData, falling back to the default level if unrecognized. */
export function getLevel(levelId: string | undefined): LevelData {
  if (levelId && LEVELS[levelId]) return LEVELS[levelId];
  return LEVELS[DEFAULT_LEVEL_ID];
}

/**
 * The level to advance to after completing the given level, or null if it was the last one.
 * Hardcoded per-level progression table; Task 14 will make 'level002' resolve to real content.
 */
const NEXT_LEVEL_ID: Record<string, string | null> = {
  level001: 'level002',
};

export function getNextLevelId(levelId: string): string | null {
  return NEXT_LEVEL_ID[levelId] ?? null;
}
