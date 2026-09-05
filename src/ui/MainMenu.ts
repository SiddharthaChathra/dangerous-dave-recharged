import type { EventBus, GameEvents } from '../game/core/EventBus';

export class MainMenu {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--menu';
    container.innerHTML = `
      <div class="screen__panel">
        <h1>Dangerous Dave: Recharged</h1>
        <button data-menu="play">Play</button>
        <button data-menu="settings">Settings</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;
    container.querySelector('[data-menu="play"]')!.addEventListener('click', () => this.bus.emit('game:started', { levelId: 'level001' }));
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
