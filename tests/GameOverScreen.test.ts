import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, type GameEvents } from '../src/game/core/EventBus';
import { GameOverScreen, type GameOverData } from '../src/ui/GameOverScreen';

const data: GameOverData = {
  finalScore: 120,
  bestScore: 300,
  levelReached: 'Neon Caverns',
  levelNumber: 3,
};

describe('GameOverScreen', () => {
  let bus: EventBus<GameEvents>;
  let root: HTMLElement;

  beforeEach(() => {
    bus = new EventBus<GameEvents>();
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('displays the final and best score it was constructed with', () => {
    const screen = new GameOverScreen(bus, data);
    screen.mount(root);
    expect(root.querySelector('[data-gameover="final-score"]')?.textContent).toBe('120');
    expect(root.querySelector('[data-gameover="best-score"]')?.textContent).toBe('300');
  });

  it('reports the level the run ended on', () => {
    const screen = new GameOverScreen(bus, data);
    screen.mount(root);
    expect(root.querySelector('[data-gameover="level-reached"]')?.textContent).toContain('Neon Caverns');
    expect(root.querySelector('[data-gameover="level-reached"]')?.textContent).toContain('3');
  });

  it('shows lives as zero, since Game Over is only reachable with no lives left', () => {
    const screen = new GameOverScreen(bus, data);
    screen.mount(root);
    expect(root.querySelector('[data-gameover="lives"]')?.textContent).toContain('LIVES: 0');
  });

  it('emits game:started with the "restart-new-game" sentinel when Retry is clicked, so the classic rule (Game Over sends the player back to level 1) applies', () => {
    const screen = new GameOverScreen(bus, data);
    screen.mount(root);
    let requestedLevelId: string | null = null;
    bus.on('game:started', ({ levelId }) => (requestedLevelId = levelId));
    (root.querySelector('[data-gameover="retry"]') as HTMLButtonElement).click();
    expect(requestedLevelId).toBe('restart-new-game');
  });
});
