import type { EventBus, GameEvents } from '../game/core/EventBus';

export class HUD {
  private container: HTMLElement | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor(private readonly bus: EventBus<GameEvents>) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'hud hud--hidden';
    container.innerHTML = `
      <div class="hud__item" data-type="score">Score: <span data-hud="score">0</span></div>
      <div class="hud__item" data-type="lives">Lives: <span data-hud="lives">3</span></div>
      <div class="hud__item" data-type="gems">Gems: <span data-hud="collectibles">0/0</span></div>
      <div class="hud__item" data-type="timer">Time: <span data-hud="timer">0</span>s</div>
      <button class="hud__pause" data-hud="pause-button" aria-label="Pause game">⏸</button>
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

    const pauseHandler = () => this.bus.emit('game:pause', {} as Record<string, never>);
    pauseButton.addEventListener('click', pauseHandler);
    this.unsubscribers.push(() => pauseButton.removeEventListener('click', pauseHandler));

    // Listen for game state to show/hide HUD
    this.unsubscribers.push(
      this.bus.on('game:started', ({ levelId }) => {
        if (levelId === 'menu') {
          this.hide();
        } else {
          this.show();
        }
      }),
    );
  }

  show(): void {
    this.container?.classList.remove('hud--hidden');
  }

  hide(): void {
    this.container?.classList.add('hud--hidden');
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    this.container?.remove();
    this.container = null;
  }
}
