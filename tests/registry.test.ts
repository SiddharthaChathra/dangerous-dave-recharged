import { describe, it, expect } from 'vitest';
import { resolveRequestedLevelId, DEFAULT_LEVEL_ID } from '../src/game/levels/registry';

describe('resolveRequestedLevelId', () => {
  it('resolves "restart" to the level currently playing (Pause Menu "Restart Level")', () => {
    expect(resolveRequestedLevelId('restart', 'level003')).toBe('level003');
  });

  it('resolves "restart-new-game" to the default (first) level regardless of current level (Game Over "Try Again")', () => {
    expect(resolveRequestedLevelId('restart-new-game', 'level003')).toBe(DEFAULT_LEVEL_ID);
  });

  it('passes through any other level id unchanged', () => {
    expect(resolveRequestedLevelId('level004', 'level003')).toBe('level004');
  });

  it('resolves "next-level" to the level after the current one, so a run continues in sequence', () => {
    expect(resolveRequestedLevelId('next-level', 'level003')).toBe('level004');
  });

  it('resolves "next-level" on the final level to that same level rather than to nothing', () => {
    expect(resolveRequestedLevelId('next-level', 'level010')).toBe('level010');
  });

  it('advances through the whole ten-level campaign in order', () => {
    expect(resolveRequestedLevelId('next-level', 'level005')).toBe('level006');
    expect(resolveRequestedLevelId('next-level', 'level009')).toBe('level010');
  });
});
