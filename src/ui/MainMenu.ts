import type { EventBus, GameEvents } from '../game/core/EventBus';
import { audioSystem } from '../game/core/audio';

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
    container.querySelector('[data-menu="play"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('game:started', { levelId: 'level001' });
    });
    container.querySelector('[data-menu="settings"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('settings:open', {});
    });
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
