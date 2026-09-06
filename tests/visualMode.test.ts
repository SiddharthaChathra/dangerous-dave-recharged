import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameEvents } from '../src/game/core/EventBus';
import {
  DEFAULT_VISUAL_MODE,
  VISUAL_MODE_TRANSITION_MS,
  getVisualMode,
  setVisualMode,
  toggleVisualMode,
  nextVisualMode,
  isVisualMode,
  type VisualMode,
} from '../src/game/core/visualMode';

describe('visualMode', () => {
  beforeEach(() => {
    setVisualMode(DEFAULT_VISUAL_MODE);
  });

  it('defaults to the current (non-classic) presentation so existing visuals are unchanged', () => {
    expect(DEFAULT_VISUAL_MODE).toBe('current');
    expect(getVisualMode()).toBe('current');
  });

  it('toggles between the two modes', () => {
    expect(nextVisualMode('current')).toBe('classic');
    expect(nextVisualMode('classic')).toBe('current');
  });

  it('toggleVisualMode flips and returns the new mode', () => {
    expect(toggleVisualMode()).toBe('classic');
    expect(getVisualMode()).toBe('classic');
    expect(toggleVisualMode()).toBe('current');
  });

  it('announces the change so visual code can react without polling', () => {
    const seen: Array<{ mode: VisualMode; previousMode: VisualMode }> = [];
    const off = gameEvents.on('visual-mode:changed', (payload) => seen.push(payload));
    setVisualMode('classic');
    off();
    expect(seen).toEqual([{ mode: 'classic', previousMode: 'current' }]);
  });

  it('brackets the change with transition start/complete events for crossfades', () => {
    vi.useFakeTimers();
    const order: string[] = [];
    const offStart = gameEvents.on('visual-mode:transition:start', () => order.push('start'));
    const offChanged = gameEvents.on('visual-mode:changed', () => order.push('changed'));
    const offComplete = gameEvents.on('visual-mode:transition:complete', () => order.push('complete'));

    setVisualMode('classic');
    expect(order).toEqual(['start', 'changed']);

    vi.advanceTimersByTime(VISUAL_MODE_TRANSITION_MS);
    expect(order).toEqual(['start', 'changed', 'complete']);

    offStart();
    offChanged();
    offComplete();
    vi.useRealTimers();
  });

  it('is a no-op when set to the mode already active (no redundant re-skin work)', () => {
    let changes = 0;
    const off = gameEvents.on('visual-mode:changed', () => (changes += 1));
    setVisualMode('current');
    off();
    expect(changes).toBe(0);
  });

  it('validates persisted values so a corrupt save cannot inject a bogus mode', () => {
    expect(isVisualMode('classic')).toBe(true);
    expect(isVisualMode('current')).toBe(true);
    expect(isVisualMode('retro')).toBe(false);
    expect(isVisualMode(undefined)).toBe(false);
  });
});
