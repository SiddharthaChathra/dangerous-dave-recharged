import { describe, it, expect } from 'vitest';
import { LEVEL_ORDER } from '../src/game/levels/registry';
import {
  levelNumber,
  remainingLevelsAfter,
  completionMessage,
  isFinalLevel,
} from '../src/utils/levelProgress';

describe('levelNumber', () => {
  it('is 1-based and matches campaign order', () => {
    expect(levelNumber('level001')).toBe(1);
    expect(levelNumber('level010')).toBe(10);
  });

  it('falls back to 1 for an unknown id rather than producing NaN in the UI', () => {
    expect(levelNumber('nonsense')).toBe(1);
  });
});

describe('remainingLevelsAfter', () => {
  it('counts the levels still to play', () => {
    expect(remainingLevelsAfter('level001')).toBe(9);
    expect(remainingLevelsAfter('level005')).toBe(5);
    expect(remainingLevelsAfter('level009')).toBe(1);
  });

  it('is zero after the final level, never negative', () => {
    expect(remainingLevelsAfter('level010')).toBe(0);
    expect(remainingLevelsAfter('nonsense')).toBeGreaterThanOrEqual(0);
  });

  it('is derived from the campaign, not a hardcoded total', () => {
    // If levels are added or removed, the message must follow automatically.
    expect(remainingLevelsAfter(LEVEL_ORDER[0])).toBe(LEVEL_ORDER.length - 1);
  });
});

describe('completionMessage', () => {
  it('reads like the original after an ordinary level', () => {
    expect(completionMessage('level001')).toEqual({
      title: 'GOOD WORK!',
      subtitle: 'ONLY 9 MORE TO GO.',
      isVictory: false,
    });
  });

  it('uses the singular when one level remains', () => {
    // "ONLY 1 MORE TO GO." — not "1 MORE LEVELS".
    expect(completionMessage('level009').subtitle).toBe('ONLY 1 MORE TO GO.');
  });

  it('switches to a victory message after the final level', () => {
    const message = completionMessage('level010');
    expect(message.isVictory).toBe(true);
    expect(message.title).toBe('LEVEL 10 COMPLETE!');
    expect(message.subtitle).toContain('ALL 10 LEVELS');
  });

  it('never announces a negative or zero countdown', () => {
    for (const id of LEVEL_ORDER) {
      const { subtitle, isVictory } = completionMessage(id);
      if (!isVictory) expect(subtitle).not.toMatch(/-|\b0 MORE\b/);
    }
  });
});

describe('isFinalLevel', () => {
  it('is true only for the last level in the campaign', () => {
    expect(isFinalLevel('level010')).toBe(true);
    expect(isFinalLevel('level009')).toBe(false);
  });
});
