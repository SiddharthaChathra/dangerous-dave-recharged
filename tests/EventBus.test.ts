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
