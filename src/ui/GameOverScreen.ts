import type { EventBus, GameEvents } from '../game/core/EventBus';
import { audioSystem } from '../game/core/audio';

export interface GameOverData {
  finalScore: number;
  bestScore: number;
  /** Human-readable name of the level the run ended on, e.g. "Neon Caverns". */
  levelReached: string;
  /** 1-based position of that level in the campaign, e.g. 3. */
  levelNumber: number;
}

export class GameOverScreen {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>, private readonly data: GameOverData) {}

  mount(root: HTMLElement): void {
    const isNewBest = this.data.finalScore >= this.data.bestScore && this.data.finalScore > 0;
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>💀 Game Over</h2>
        ${isNewBest ? '<p style="color: var(--ddr-gold); font-weight: 600;">🏆 New High Score!</p>' : ''}
        <div class="gameover__lives" data-gameover="lives">
          <span class="life-pip life-pip--lost">♡</span>
          <span class="life-pip life-pip--lost">♡</span>
          <span class="life-pip life-pip--lost">♡</span>
          <span class="gameover__lives-label">LIVES: 0</span>
        </div>
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card__label">Level Reached</div>
            <div class="stat-card__value stat-card__value--text" data-gameover="level-reached">${this.data.levelNumber}. ${this.data.levelReached}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Score</div>
            <div class="stat-card__value" data-gameover="final-score">${this.data.finalScore}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__label">Best</div>
            <div class="stat-card__value" data-gameover="best-score">${this.data.bestScore}</div>
          </div>
        </div>
        <button data-gameover="retry">↺ Try Again</button>
        <button data-gameover="menu" class="btn--secondary">✕ Main Menu</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;

    container.querySelector('[data-gameover="retry"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('game:started', { levelId: 'restart-new-game' });
    });
    container.querySelector('[data-gameover="menu"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('game:started', { levelId: 'menu' });
    });

    (container.querySelector('[data-gameover="retry"]') as HTMLButtonElement)?.focus();
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
