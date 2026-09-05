import { describe, it, expect } from 'vitest';
import { mergeInputState } from '../src/game/systems/InputController';

describe('mergeInputState', () => {
  it('is true for a direction if either keyboard or virtual reports it held', () => {
    const merged = mergeInputState(
      { left: false, right: false, jumpPressed: false, jumpHeld: false, pausePressed: false },
      { left: true },
    );
    expect(merged.left).toBe(true);
    expect(merged.right).toBe(false);
  });

  it('keyboard-only state passes through unchanged with no virtual overrides', () => {
    const keyboard = { left: true, right: false, jumpPressed: true, jumpHeld: true, pausePressed: false };
    expect(mergeInputState(keyboard, {})).toEqual(keyboard);
  });
});
