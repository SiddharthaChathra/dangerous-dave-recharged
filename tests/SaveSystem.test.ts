import { describe, it, expect } from 'vitest';
import { markTutorialSeen } from '../src/game/systems/SaveSystem';
import {
  DEFAULT_SAVE,
  loadSave,
  writeSave,
  updateHighScore,
  unlockLevel,
  recordLevelResult,
} from '../src/game/systems/SaveSystem';

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const store = { ...initial };
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('SaveSystem', () => {
  it('returns DEFAULT_SAVE when no save exists', () => {
    const storage = fakeStorage();
    expect(loadSave(storage)).toEqual(DEFAULT_SAVE);
  });

  it('returns DEFAULT_SAVE when the stored value is corrupt JSON', () => {
    const storage = fakeStorage({ 'ddr:save:v1': '{not json' });
    expect(loadSave(storage)).toEqual(DEFAULT_SAVE);
  });

  it('round-trips a written save', () => {
    const storage = fakeStorage();
    const data = updateHighScore(DEFAULT_SAVE, 500);
    writeSave(storage, data);
    expect(loadSave(storage).highScore).toBe(500);
  });

  it('updateHighScore only raises the score, never lowers it', () => {
    const withHigh = updateHighScore(DEFAULT_SAVE, 500);
    const unchanged = updateHighScore(withHigh, 100);
    expect(unchanged.highScore).toBe(500);
  });

  it('unlockLevel marks a level unlocked without clobbering others', () => {
    const next = unlockLevel(DEFAULT_SAVE, 'level002');
    expect(next.levels.level002.unlocked).toBe(true);
    expect(next.levels.level001.unlocked).toBe(true); // level001 starts unlocked by default
  });

  it('recordLevelResult keeps the best score and best (lowest) time per level', () => {
    let data = recordLevelResult(DEFAULT_SAVE, 'level001', 100, 60);
    data = recordLevelResult(data, 'level001', 80, 40);
    expect(data.levels.level001.bestScore).toBe(100);
    expect(data.levels.level001.bestTimeSeconds).toBe(40);
  });
});

describe('tutorial progress', () => {
  it('a new player has not seen the tutorial yet', () => {
    expect(DEFAULT_SAVE.tutorialSeen).toBe(false);
  });

  it('remembers once the tutorial has been shown, so it never nags on replays', () => {
    const seen = markTutorialSeen(DEFAULT_SAVE);
    expect(seen.tutorialSeen).toBe(true);
    // Must not disturb progression.
    expect(seen.levels).toEqual(DEFAULT_SAVE.levels);
    expect(seen.highScore).toBe(DEFAULT_SAVE.highScore);
  });
});
