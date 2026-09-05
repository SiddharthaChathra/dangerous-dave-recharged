import type { EventBus, GameEvents } from '../game/core/EventBus';
import type { Rating } from '../utils/scoring';
import { audioSystem } from '../game/core/audio';

export interface LevelCompleteData {
  score: number;
  timeSeconds: number;
  collected: number;
  total: number;
  rating: Rating;
  nextLevelId: string | null;
}

export class LevelCompleteScreen {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>, private readonly data: LevelCompleteData) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>Level Complete — ${this.data.rating.toUpperCase()}</h2>
        <p>Score: ${this.data.score}</p>
        <p>Time: ${Math.floor(this.data.timeSeconds)}s</p>
        <p>Gems: ${this.data.collected}/${this.data.total}</p>
        <button data-levelcomplete="continue">${this.data.nextLevelId ? 'Continue' : 'Back to Menu'}</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;
    container.querySelector('[data-levelcomplete="continue"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('game:started', { levelId: this.data.nextLevelId ?? 'menu' });
    });
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
