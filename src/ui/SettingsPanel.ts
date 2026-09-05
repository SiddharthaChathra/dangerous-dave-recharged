import type { EventBus, GameEvents } from '../game/core/EventBus';
import type { SaveData } from '../game/systems/SaveSystem';
import { audioSystem } from '../game/core/audio';

export class SettingsPanel {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>, private readonly initial: SaveData['settings']) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>⚙ Settings</h2>
        <div class="settings-group">
          <div class="settings-row">
            <label for="settings-music">🎵 Music</label>
            <input type="range" id="settings-music" min="0" max="1" step="0.05" data-settings="music" value="${this.initial.musicVolume}" />
          </div>
          <div class="settings-row">
            <label for="settings-sfx">🔊 SFX</label>
            <input type="range" id="settings-sfx" min="0" max="1" step="0.05" data-settings="sfx" value="${this.initial.sfxVolume}" />
          </div>
          <div class="divider"></div>
          <div class="settings-row">
            <label for="settings-muted">🔇 Mute All</label>
            <input type="checkbox" id="settings-muted" data-settings="muted" ${this.initial.muted ? 'checked' : ''}/>
          </div>
          <div class="settings-row">
            <label for="settings-motion">♿ Reduced Motion</label>
            <input type="checkbox" id="settings-motion" data-settings="reducedMotion" ${this.initial.reducedMotion ? 'checked' : ''}/>
          </div>
          <div class="divider"></div>
          <div class="settings-row">
            <label for="settings-theme">🎨 Theme</label>
            <select id="settings-theme" data-settings="theme">
              <option value="dark" ${this.initial.theme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="light" ${this.initial.theme === 'light' ? 'selected' : ''}>Light</option>
            </select>
          </div>
        </div>
        <div class="divider"></div>
        <button data-settings="close">✓ Done</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;

    const emitChange = () => {
      this.bus.emit('settings:changed', {
        musicVolume: Number((container.querySelector('[data-settings="music"]') as HTMLInputElement).value),
        sfxVolume: Number((container.querySelector('[data-settings="sfx"]') as HTMLInputElement).value),
        muted: (container.querySelector('[data-settings="muted"]') as HTMLInputElement).checked,
        reducedMotion: (container.querySelector('[data-settings="reducedMotion"]') as HTMLInputElement).checked,
        theme: (container.querySelector('[data-settings="theme"]') as HTMLSelectElement).value as 'dark' | 'light',
      });
    };

    container.querySelectorAll('input, select').forEach((el) => el.addEventListener('input', emitChange));
    container.querySelector('[data-settings="close"]')!.addEventListener('click', () => {
      audioSystem.playSfx('uiClick');
      this.destroy();
    });
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
