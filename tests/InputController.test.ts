import { describe, it, expect } from 'vitest';
import { mergeInputState, type FullInputState } from '../src/game/systems/InputController';

const idle: FullInputState = {
  left: false,
  right: false,
  jumpPressed: false,
  jumpHeld: false,
  down: false,
  pausePressed: false,
  firePressed: false,
};

describe('mergeInputState', () => {
  it('is true for a direction if either keyboard or virtual reports it held', () => {
    const merged = mergeInputState(idle, { left: true });
    expect(merged.left).toBe(true);
    expect(merged.right).toBe(false);
  });

  it('keyboard-only state passes through unchanged with no virtual overrides', () => {
    const keyboard: FullInputState = { ...idle, left: true, jumpPressed: true, jumpHeld: true };
    expect(mergeInputState(keyboard, {})).toEqual(keyboard);
  });

  it('fire can come from either the keyboard or an on-screen control', () => {
    expect(mergeInputState(idle, { firePressed: true }).firePressed).toBe(true);
    expect(mergeInputState({ ...idle, firePressed: true }, {}).firePressed).toBe(true);
    expect(mergeInputState(idle, {}).firePressed).toBe(false);
  });
});
