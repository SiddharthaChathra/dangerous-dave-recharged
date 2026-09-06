import { DEFAULT_VISUAL_MODE, isVisualMode, type VisualMode } from '../core/visualMode';
import { DEFAULT_CHARACTER_ID, isCharacterId } from '../characters/roster';

export interface LevelSaveEntry {
  bestScore: number;
  bestTimeSeconds: number | null;
  unlocked: boolean;
}

export interface SaveData {
  version: 1;
  highScore: number;
  /**
   * Presentation mode. Kept at the top level rather than inside `settings` so the Settings
   * panel's `settings:changed` payload can never accidentally drop it.
   */
  visualMode: VisualMode;
  /** Whether onboarding prompts have been shown, so they appear once and never nag on replays. */
  tutorialSeen: boolean;
  /** Chosen playable character. Cosmetic — never affects physics or difficulty. */
  selectedCharacterId: string;
  levels: Record<string, LevelSaveEntry>;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    muted: boolean;
    theme: 'dark' | 'light';
    reducedMotion: boolean;
  };
}

const SAVE_KEY = 'ddr:save:v1';

export const DEFAULT_SAVE: SaveData = {
  version: 1,
  highScore: 0,
  visualMode: DEFAULT_VISUAL_MODE,
  tutorialSeen: false,
  selectedCharacterId: DEFAULT_CHARACTER_ID,
  levels: {
    level001: { bestScore: 0, bestTimeSeconds: null, unlocked: true },
    level002: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level003: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level004: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level005: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level006: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level007: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level008: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level009: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level010: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
  },
  settings: {
    musicVolume: 0.6,
    sfxVolume: 0.8,
    muted: false,
    theme: 'dark',
    reducedMotion: false,
  },
};

function isValidSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Partial<SaveData>;
  return data.version === 1 && typeof data.highScore === 'number' && typeof data.levels === 'object' && typeof data.settings === 'object';
}

export function loadSave(storage: Storage): SaveData {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return DEFAULT_SAVE;
  try {
    const parsed = JSON.parse(raw);
    if (!isValidSaveData(parsed)) return DEFAULT_SAVE;
    // Saves written before theme modes existed (or with a corrupted value) fall back to the
    // default rather than being discarded — progress and high scores are worth keeping.
    return {
      ...parsed,
      visualMode: isVisualMode(parsed.visualMode) ? parsed.visualMode : DEFAULT_VISUAL_MODE,
      tutorialSeen: parsed.tutorialSeen === true,
      selectedCharacterId: isCharacterId(parsed.selectedCharacterId)
        ? parsed.selectedCharacterId
        : DEFAULT_CHARACTER_ID,
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

export function updateVisualMode(data: SaveData, visualMode: VisualMode): SaveData {
  return { ...data, visualMode };
}

export function updateSelectedCharacter(data: SaveData, selectedCharacterId: string): SaveData {
  return { ...data, selectedCharacterId };
}

/**
 * Levels the player has actually completed, used to decide which characters are unlocked.
 * A level only gets a best time when it is cleared, so that is the completion marker.
 */
export function completedLevelIds(data: SaveData): string[] {
  return Object.entries(data.levels)
    .filter(([, entry]) => entry.bestTimeSeconds !== null)
    .map(([id]) => id);
}

/** Records that onboarding has been shown. UI may call this after dismissing the tutorial. */
export function markTutorialSeen(data: SaveData): SaveData {
  return { ...data, tutorialSeen: true };
}

export function writeSave(storage: Storage, data: SaveData): void {
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function updateHighScore(data: SaveData, score: number): SaveData {
  if (score <= data.highScore) return data;
  return { ...data, highScore: score };
}

export function unlockLevel(data: SaveData, levelId: string): SaveData {
  const existing = data.levels[levelId] ?? { bestScore: 0, bestTimeSeconds: null, unlocked: false };
  return { ...data, levels: { ...data.levels, [levelId]: { ...existing, unlocked: true } } };
}

export function recordLevelResult(data: SaveData, levelId: string, score: number, timeSeconds: number): SaveData {
  const existing = data.levels[levelId] ?? { bestScore: 0, bestTimeSeconds: null, unlocked: true };
  const bestScore = Math.max(existing.bestScore, score);
  const bestTimeSeconds =
    existing.bestTimeSeconds === null ? timeSeconds : Math.min(existing.bestTimeSeconds, timeSeconds);
  return { ...data, levels: { ...data.levels, [levelId]: { bestScore, bestTimeSeconds, unlocked: existing.unlocked } } };
}
