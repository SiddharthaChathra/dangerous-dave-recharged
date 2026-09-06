import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/game/core/EventBus';

interface TestEvents extends Record<string, unknown> {
  'ping': { count: number };
}

describe('EventBus', () => {
  it('calls subscribed handlers with the emitted payload', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.emit('ping', { count: 3 });
    expect(handler).toHaveBeenCalledWith({ count: 3 });
  });

  it('stops calling a handler after off()', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.off('ping', handler);
    bus.emit('ping', { count: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('on() returns an unsubscribe function', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const unsubscribe = bus.on('ping', handler);
    unsubscribe();
    bus.emit('ping', { count: 1 });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('once', () => {
  it('delivers exactly one event then stops listening', () => {
    const bus = new EventBus<{ ping: { n: number } }>();
    const seen: number[] = [];
    bus.once('ping', ({ n }) => seen.push(n));
    bus.emit('ping', { n: 1 });
    bus.emit('ping', { n: 2 });
    expect(seen).toEqual([1]);
  });

  it('can be cancelled before it ever fires', () => {
    const bus = new EventBus<{ ping: Record<string, never> }>();
    let fired = false;
    const cancel = bus.once('ping', () => (fired = true));
    cancel();
    bus.emit('ping', {});
    expect(fired).toBe(false);
  });

  it('does not re-enter itself if the handler re-emits the same event', () => {
    // A handler that starts the next level can cause the same event to fire again; a listener
    // that removed itself only *after* running would recurse.
    const bus = new EventBus<{ ping: { n: number } }>();
    let calls = 0;
    bus.once('ping', () => {
      calls += 1;
      if (calls < 5) bus.emit('ping', { n: calls });
    });
    bus.emit('ping', { n: 0 });
    expect(calls).toBe(1);
  });
});
