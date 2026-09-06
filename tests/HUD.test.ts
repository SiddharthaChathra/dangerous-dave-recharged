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

  describe('key indicator', () => {
    it('starts every level telling the player a key is still required', () => {
      const hud = new HUD(bus);
      hud.mount(root);
      const indicator = root.querySelector('[data-hud="key"]')!;
      expect(indicator).not.toBeNull();
      expect(indicator.textContent).toContain('KEY REQUIRED');
      expect(indicator.getAttribute('data-key-state')).toBe('required');
    });

    it('switches to acquired when the key is collected', () => {
      const hud = new HUD(bus);
      hud.mount(root);
      bus.emit('key:collected', { x: 0, y: 0 });
      const indicator = root.querySelector('[data-hud="key"]')!;
      expect(indicator.textContent).toContain('KEY ACQUIRED');
      expect(indicator.getAttribute('data-key-state')).toBe('acquired');
    });

    it('resets to required when the next level starts', () => {
      // Otherwise a level restarted after a death would claim the key was already held,
      // and the HUD would contradict the locked door.
      const hud = new HUD(bus);
      hud.mount(root);
      bus.emit('key:collected', { x: 0, y: 0 });
      bus.emit('game:started', { levelId: 'level002' });
      const indicator = root.querySelector('[data-hud="key"]')!;
      expect(indicator.getAttribute('data-key-state')).toBe('required');
    });
  });

  describe('during the between-levels corridor', () => {
    it('hides itself once the level is complete', () => {
      // The corridor is a cutscene. Leaving the gameplay HUD on top of it puts a health bar,
      // a pause button and a stale timer over the shot it is trying to compose.
      const hud = new HUD(bus);
      hud.mount(root);
      bus.emit('game:started', { levelId: 'level001' });
      expect(root.querySelector('.hud')!.classList.contains('hud--hidden')).toBe(false);

      bus.emit('level:complete', {
        levelId: 'level001', score: 10, timeSeconds: 5, collected: 1, total: 5,
      });
      expect(root.querySelector('.hud')!.classList.contains('hud--hidden')).toBe(true);
    });

    it('comes back when the next level starts', () => {
      const hud = new HUD(bus);
      hud.mount(root);
      bus.emit('level:complete', {
        levelId: 'level001', score: 10, timeSeconds: 5, collected: 1, total: 5,
      });
      bus.emit('game:started', { levelId: 'level002' });
      expect(root.querySelector('.hud')!.classList.contains('hud--hidden')).toBe(false);
    });
  });

  describe('level name', () => {
    it('names the level the game reports it actually loaded', () => {
      // The run continues through sentinels like 'next-level', which are main.ts's private
      // vocabulary and name no level at all. The HUD has to be told the resolved level, or it
      // sits there naming the level the player just finished for the whole of the next one.
      const hud = new HUD(bus);
      hud.mount(root);
      bus.emit('game:started', { levelId: 'level001' });
      bus.emit('level:started', { levelId: 'level002' });
      expect(root.querySelector('[data-hud="level-name"]')?.textContent).toBe('Industrial Ruins');
    });

    it('is not confused by a sentinel level id', () => {
      const hud = new HUD(bus);
      hud.mount(root);
      bus.emit('level:started', { levelId: 'level002' });
      bus.emit('game:started', { levelId: 'next-level' });
      expect(root.querySelector('[data-hud="level-name"]')?.textContent).toBe('Industrial Ruins');
    });
  });
});
