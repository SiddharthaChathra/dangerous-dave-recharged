import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus, type GameEvents } from '../src/game/core/EventBus';
import { HUD } from '../src/ui/HUD';

describe('HUD', () => {
  let bus: EventBus<GameEvents>;
  let root: HTMLElement;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  beforeEach(() => {
    bus = new EventBus<GameEvents>();
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('renders initial score, lives, and collectible counters', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    expect(root.querySelector('[data-hud="score"]')?.textContent).toBe('000000');
    expect(root.querySelector('[data-hud="lives"]')?.textContent).toBe('3');
    expect(root.querySelector('[data-hud="collectibles"]')?.textContent).toBe('0/0');
  });

  it('updates score when score:changed is emitted', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    bus.emit('score:changed', { score: 40 });
    expect(root.querySelector('[data-hud="score"]')?.textContent).toBe('000040');
  });

  it('updates lives when lives:changed is emitted', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    bus.emit('lives:changed', { lives: 1 });
    expect(root.querySelector('[data-hud="lives"]')?.textContent).toBe('1');
  });

  it('updates collectible count when collectible:changed is emitted', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    bus.emit('collectible:changed', { collected: 3, total: 6 });
    expect(root.querySelector('[data-hud="collectibles"]')?.textContent).toBe('3/6');
  });

  it('emits game:pause when the pause button is clicked', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    let paused = false;
    bus.on('game:pause', () => {
      paused = true;
    });
    (root.querySelector('[data-hud="pause-button"]') as HTMLButtonElement).click();
    expect(paused).toBe(true);
  });

  it('stops updating after destroy()', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    hud.destroy();
    bus.emit('score:changed', { score: 999 });
    expect(root.querySelector('[data-hud="score"]')).toBeNull();
  });
});
