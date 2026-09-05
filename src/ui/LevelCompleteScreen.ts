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

function ratingEmoji(rating: Rating): string {
  switch (rating) {
    case 'gold': return '🥇';
    case 'silver': return '🥈';
    case 'bronze': return '🥉';
  }
}

export class LevelCompleteScreen {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>, private readonly data: LevelCompleteData) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>🎉 Level Complete!</h2>
        <div class="rating-badge rating-badge--${this.data.rating}">
          ${ratingEmoji(this.data.rating)} ${this.data.rating.toUpperCase()}
        </div>
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card__label">Score</div>
            <div class="stat-card__value">${this.data.score}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Time</div>
            <div class="stat-card__value">${Math.floor(this.data.timeSeconds)}s</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Gems</div>
            <div class="stat-card__value">${this.data.collected}/${this.data.total}</div>
          </div>
        </div>
        <button data-levelcomplete="continue">${this.data.nextLevelId ? '▶ Next Level' : '🏠 Back to Menu'}</button>
        ${this.data.nextLevelId ? '<button data-levelcomplete="menu" class="btn--secondary">🏠 Main Menu</button>' : ''}
      </div>
    `;
    root.appendChild(container);
    this.container = container;

    container.querySelector('[data-levelcomplete="continue"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('game:started', { levelId: this.data.nextLevelId ?? 'menu' });
    });

    const menuBtn = container.querySelector('[data-levelcomplete="menu"]');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        audioSystem.playSfx('uiClick');
        this.bus.emit('game:started', { levelId: 'menu' });
      });
    }

    (container.querySelector('[data-levelcomplete="continue"]') as HTMLButtonElement)?.focus();
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
