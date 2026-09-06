import type { LevelData } from './types';
import { level001 } from './level001';
import { level002 } from './level002';
import { level003 } from './level003';
import { level004 } from './level004';
import { level005 } from './level005';
import { level006 } from './level006';
import { level007 } from './level007';
import { level008 } from './level008';
import { level009 } from './level009';
import { level010 } from './level010';

/**
 * Single source of truth for available levels, keyed by level id.
 */
export const LEVELS: Record<string, LevelData> = {
  level001,
  level002,
  level003,
  level004,
  level005,
  level006,
  level007,
  level008,
  level009,
  level010,
};

export const LEVEL_ORDER: string[] = [
  'level001', 'level002', 'level003', 'level004', 'level005',
  'level006', 'level007', 'level008', 'level009', 'level010',
];

export const DEFAULT_LEVEL_ID = 'level001';

/** Resolves a level id to its LevelData, falling back to the default level if unrecognized. */
export function getLevel(levelId: string | undefined): LevelData {
  if (levelId && LEVELS[levelId]) return LEVELS[levelId];
  return LEVELS[DEFAULT_LEVEL_ID];
}

/**
 * Resolves the `game:started` event's requested level id sentinel to the actual level to load.
 *
 * - 'restart' (Pause Menu "Restart Level", and the restart after a life is lost): replay
 *   whatever level is currently running.
 * - 'next-level' (Level Complete "Next Level"): advance in sequence, staying on the last level
 *   if there is nothing after it.
 * - 'restart-new-game' (Game Over "Try Again"): classic-arcade rule — losing all lives sends
 *   the player back to the first level, not back to the level they died on.
 * - anything else: an explicit level id, passed through unchanged.
 */
export function resolveRequestedLevelId(requestedLevelId: string, currentLevelId: string): string {
  if (requestedLevelId === 'restart') return currentLevelId;
  if (requestedLevelId === 'next-level') return getNextLevelId(currentLevelId) ?? currentLevelId;
  if (requestedLevelId === 'restart-new-game') return DEFAULT_LEVEL_ID;
  return requestedLevelId;
}

/**
 * The level to advance to after completing the given level, or null if it was the last one.
 */
const NEXT_LEVEL_ID: Record<string, string | null> = {
  level001: 'level002',
  level002: 'level003',
  level003: 'level004',
  level004: 'level005',
  level005: 'level006',
  level006: 'level007',
  level007: 'level008',
  level008: 'level009',
  level009: 'level010',
  level010: null,
};

export function getNextLevelId(levelId: string): string | null {
  return NEXT_LEVEL_ID[levelId] ?? null;
}
