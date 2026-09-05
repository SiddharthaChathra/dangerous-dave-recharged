export interface LevelSaveEntry {
  bestScore: number;
  bestTimeSeconds: number | null;
  unlocked: boolean;
}

export interface SaveData {
  version: 1;
  highScore: number;
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
  levels: {
    level001: { bestScore: 0, bestTimeSeconds: null, unlocked: true },
    level002: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level003: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level004: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level005: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
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
    return isValidSaveData(parsed) ? parsed : DEFAULT_SAVE;
  } catch {
    return DEFAULT_SAVE;
  }
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
