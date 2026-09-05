import type { EventBus, GameEvents } from '../game/core/EventBus';

export class HUD {
  private container: HTMLElement | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor(private readonly bus: EventBus<GameEvents>) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'hud';
    container.innerHTML = `
      <div class="hud__item">Score: <span data-hud="score">0</span></div>
      <div class="hud__item">Lives: <span data-hud="lives">3</span></div>
      <div class="hud__item">Gems: <span data-hud="collectibles">0/0</span></div>
      <div class="hud__item">Time: <span data-hud="timer">0</span>s</div>
      <button class="hud__pause" data-hud="pause-button" aria-label="Pause game">II</button>
    `;
    root.appendChild(container);
    this.container = container;

    const scoreEl = container.querySelector('[data-hud="score"]') as HTMLElement;
    const livesEl = container.querySelector('[data-hud="lives"]') as HTMLElement;
    const collectiblesEl = container.querySelector('[data-hud="collectibles"]') as HTMLElement;
    const timerEl = container.querySelector('[data-hud="timer"]') as HTMLElement;
    const pauseButton = container.querySelector('[data-hud="pause-button"]') as HTMLButtonElement;

    this.unsubscribers.push(
      this.bus.on('score:changed', ({ score }) => (scoreEl.textContent = String(score))),
      this.bus.on('lives:changed', ({ lives }) => (livesEl.textContent = String(lives))),
      this.bus.on('collectible:changed', ({ collected, total }) => (collectiblesEl.textContent = `${collected}/${total}`)),
      this.bus.on('timer:tick', ({ seconds }) => (timerEl.textContent = String(Math.floor(seconds)))),
    );
    pauseButton.addEventListener('click', () => this.bus.emit('game:pause', {}));
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    this.container?.remove();
    this.container = null;
  }
}
