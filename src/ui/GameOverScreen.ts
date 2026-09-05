import type { EventBus, GameEvents } from '../game/core/EventBus';
import { audioSystem } from '../game/core/audio';

export interface GameOverData {
  finalScore: number;
  bestScore: number;
}

export class GameOverScreen {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>, private readonly data: GameOverData) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>Game Over</h2>
        <p>Score: <span data-gameover="final-score">${this.data.finalScore}</span></p>
        <p>Best: <span data-gameover="best-score">${this.data.bestScore}</span></p>
        <button data-gameover="retry">Retry</button>
        <button data-gameover="menu">Main Menu</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;
    container.querySelector('[data-gameover="retry"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('game:started', { levelId: 'level001' });
    });
    container.querySelector('[data-gameover="menu"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('game:started', { levelId: 'menu' });
    });
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
