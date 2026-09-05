import type { EventBus, GameEvents } from '../game/core/EventBus';
import { audioSystem } from '../game/core/audio';
import { LEVELS, LEVEL_ORDER } from '../game/levels/registry';
import { loadSave } from '../game/systems/SaveSystem';

export class MainMenu {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>) {}

  mount(root: HTMLElement): void {
    const save = loadSave(window.localStorage);

    const container = document.createElement('div');
    container.className = 'screen screen--menu';
    container.innerHTML = `
      <div class="screen__panel">
        <h1>Dangerous Dave: Recharged</h1>
        <p style="color: var(--ddr-text-muted); font-size: 0.75rem; margin: -0.25rem 0 0.25rem;">A retro platformer reimagined</p>
        <button data-menu="play">▶ Start Game</button>
        <div class="divider"></div>
        <h2 style="font-size: 0.85rem; margin-bottom: 0;">Select Level</h2>
        <div class="level-grid">
          ${LEVEL_ORDER.map((id, index) => {
            const level = LEVELS[id];
            const unlocked = save.levels[id]?.unlocked ?? false;
            const best = save.levels[id]?.bestScore ?? 0;
            return `
              <div class="level-card ${unlocked ? '' : 'level-card--locked'}" data-level="${id}" ${!unlocked ? 'aria-disabled="true"' : ''} tabindex="${unlocked ? '0' : '-1'}" role="button" aria-label="${unlocked ? `Play ${level.name}` : `${level.name} (locked)`}">
                ${unlocked
                  ? `<div class="level-card__number">${index + 1}</div>
                     <div class="level-card__name">${level.name}</div>
                     ${best > 0 ? `<div class="level-card__name" style="color: var(--ddr-gold);">★ ${best}</div>` : ''}`
                  : `<div class="level-card__lock">🔒</div>
                     <div class="level-card__name">${level.name}</div>`}
              </div>`;
          }).join('')}
        </div>
        <div class="divider"></div>
        <button data-menu="settings" class="btn--secondary">⚙ Settings</button>
        <p style="font-size: 0.6rem; color: var(--ddr-text-muted); margin-top: 0.25rem;">
          Arrow keys / WASD to move • Up to jump • ESC to pause
        </p>
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
      this.bus.emit('settings:open', {} as Record<string, never>);
    });

    // Level select cards
    container.querySelectorAll('.level-card:not(.level-card--locked)').forEach((card) => {
      const handler = () => {
        const levelId = card.getAttribute('data-level');
        if (levelId) {
          audioSystem.playSfx('uiClick');
          this.bus.emit('game:started', { levelId });
        }
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
