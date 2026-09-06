import { describe, it, expect } from 'vitest';
import { isPlayable, canTriggerExit, canTakeDamage, type TransitionState } from '../src/utils/transitionState';

const ALL: TransitionState[] = ['playing', 'transitioning', 'completing', 'dying'];

describe('transition state guards', () => {
  it('only the playing state is interactive', () => {
    expect(isPlayable('playing')).toBe(true);
    for (const s of ALL.filter((s) => s !== 'playing')) expect(isPlayable(s)).toBe(false);
  });

  it('the exit can only be triggered once, from play', () => {
    // Re-entering the door mid-sequence must not start a second level load.
    expect(canTriggerExit('playing')).toBe(true);
    expect(canTriggerExit('transitioning')).toBe(false);
    expect(canTriggerExit('completing')).toBe(false);
  });

  it('a dying player cannot trigger the exit', () => {
    // Reaching the door on the same frame as a fatal hit must resolve as a death, not a win.
    expect(canTriggerExit('dying')).toBe(false);
  });

  it('a player who has entered the door can no longer be killed', () => {
    // Otherwise a hazard overlapping the doorway could steal an already-earned level.
    expect(canTakeDamage('transitioning')).toBe(false);
    expect(canTakeDamage('completing')).toBe(false);
  });

  it('damage applies during normal play', () => {
    expect(canTakeDamage('playing')).toBe(true);
  });
});
