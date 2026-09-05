import type { LevelData } from './types';
import { level001 } from './level001';
import { level002 } from './level002';
import { level003 } from './level003';
import { level004 } from './level004';
import { level005 } from './level005';

/**
 * Single source of truth for available levels, keyed by level id.
 */
export const LEVELS: Record<string, LevelData> = {
  level001,
  level002,
  level003,
  level004,
  level005,
};

export const LEVEL_ORDER: string[] = ['level001', 'level002', 'level003', 'level004', 'level005'];

export const DEFAULT_LEVEL_ID = 'level001';

/** Resolves a level id to its LevelData, falling back to the default level if unrecognized. */
export function getLevel(levelId: string | undefined): LevelData {
  if (levelId && LEVELS[levelId]) return LEVELS[levelId];
  return LEVELS[DEFAULT_LEVEL_ID];
}

/**
 * The level to advance to after completing the given level, or null if it was the last one.
 */
const NEXT_LEVEL_ID: Record<string, string | null> = {
  level001: 'level002',
  level002: 'level003',
  level003: 'level004',
  level004: 'level005',
  level005: null,
};

export function getNextLevelId(levelId: string): string | null {
  return NEXT_LEVEL_ID[levelId] ?? null;
}
