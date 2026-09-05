import type { EventBus, GameEvents } from '../game/core/EventBus';
import { audioSystem } from '../game/core/audio';

export class PauseMenu {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>⏸ Paused</h2>
        <button data-pause="resume">▶ Resume</button>
        <button data-pause="restart" class="btn--secondary">↺ Restart Level</button>
        <button data-pause="settings" class="btn--secondary">⚙ Settings</button>
        <div class="divider"></div>
        <button data-pause="exit" class="btn--secondary">✕ Exit to Menu</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;

    container.querySelector('[data-pause="resume"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('game:resume', {} as Record<string, never>);
    });
    container.querySelector('[data-pause="restart"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('game:started', { levelId: 'restart' });
    });
    container.querySelector('[data-pause="settings"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('settings:open', {} as Record<string, never>);
    });
    container.querySelector('[data-pause="exit"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.bus.emit('game:started', { levelId: 'menu' });
    });

    // Auto-focus resume button for keyboard users
    (container.querySelector('[data-pause="resume"]') as HTMLButtonElement)?.focus();
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
