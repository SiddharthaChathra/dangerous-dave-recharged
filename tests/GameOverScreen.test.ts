import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, type GameEvents } from '../src/game/core/EventBus';
import { GameOverScreen } from '../src/ui/GameOverScreen';

describe('GameOverScreen', () => {
  let bus: EventBus<GameEvents>;
  let root: HTMLElement;

  beforeEach(() => {
    bus = new EventBus<GameEvents>();
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('displays the final and best score it was constructed with', () => {
    const screen = new GameOverScreen(bus, { finalScore: 120, bestScore: 300 });
    screen.mount(root);
    expect(root.querySelector('[data-gameover="final-score"]')?.textContent).toBe('120');
    expect(root.querySelector('[data-gameover="best-score"]')?.textContent).toBe('300');
  });

  it('emits game:started when Retry is clicked', () => {
    const screen = new GameOverScreen(bus, { finalScore: 120, bestScore: 300 });
    screen.mount(root);
    let started = false;
    bus.on('game:started', () => (started = true));
    (root.querySelector('[data-gameover="retry"]') as HTMLButtonElement).click();
    expect(started).toBe(true);
  });
});
