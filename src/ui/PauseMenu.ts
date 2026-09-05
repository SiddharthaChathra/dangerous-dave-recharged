import type { EventBus, GameEvents } from '../game/core/EventBus';

export class PauseMenu {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>Paused</h2>
        <button data-pause="resume">Resume</button>
        <button data-pause="restart">Restart</button>
        <button data-pause="settings">Settings</button>
        <button data-pause="exit">Exit to Menu</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;
    container.querySelector('[data-pause="resume"]')!.addEventListener('click', () => this.bus.emit('game:resume', {}));
    container.querySelector('[data-pause="restart"]')!.addEventListener('click', () => this.bus.emit('game:started', { levelId: 'restart' }));
    container.querySelector('[data-pause="exit"]')!.addEventListener('click', () => this.bus.emit('game:started', { levelId: 'menu' }));
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
