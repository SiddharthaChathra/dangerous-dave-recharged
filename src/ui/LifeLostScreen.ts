import { STARTING_LIVES } from '../utils/livesReducer';

export interface LifeLostData {
  livesRemaining: number;
}

/**
 * The brief "LIFE LOST" beat between dying and the current level restarting. It exists to make
 * the life loss unmistakable — the player sees which life went and how many are left — so it is
 * deliberately short and has no buttons: main.ts dismisses it and restarts the level.
 */
export class LifeLostScreen {
  private container: HTMLElement | null = null;

  constructor(private readonly data: LifeLostData) {}

  mount(root: HTMLElement): void {
    const { livesRemaining } = this.data;
    const hearts = Array.from({ length: STARTING_LIVES }, (_, i) =>
      i < livesRemaining
        ? '<span class="life-pip life-pip--held">❤</span>'
        : '<span class="life-pip life-pip--lost">♡</span>',
    ).join('');

    const container = document.createElement('div');
    container.className = 'screen screen--overlay screen--flash';
    container.innerHTML = `
      <div class="screen__panel screen__panel--compact" role="status" aria-live="assertive">
        <h2 class="life-lost__title" data-lifelost="title">LIFE LOST</h2>
        <div class="life-lost__pips" data-lifelost="pips" aria-label="${livesRemaining} of ${STARTING_LIVES} lives remaining">
          ${hearts}
        </div>
        <p class="life-lost__hint" data-lifelost="remaining">
          ${livesRemaining === 1 ? 'LAST LIFE' : `${livesRemaining} LIVES LEFT`}
        </p>
        <p class="life-lost__sub">Restarting level…</p>
      </div>
    `;
    root.appendChild(container);
    this.container = container;
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
