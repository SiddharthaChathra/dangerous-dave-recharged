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
      <div class="screen__panel" style="background: transparent; border: none; box-shadow: none; text-align: left; padding: 0 var(--ddr-space-12); align-items: flex-start; max-width: 600px; margin-top: auto; margin-bottom: 15vh;">
        <h1 class="stagger-1" style="font-size: 4rem; text-align: left; line-height: 1; text-shadow: 0 10px 30px rgba(0,0,0,0.8); margin-bottom: 0;">DANGEROUS<br><span style="color: var(--ddr-accent-primary);">DAVE</span></h1>
        <p class="stagger-2" style="color: var(--ddr-text-secondary); font-size: 1.2rem; letter-spacing: 0.2em; text-transform: uppercase; margin-top: var(--ddr-space-2); margin-bottom: var(--ddr-space-8); text-shadow: 0 2px 10px rgba(0,0,0,0.8);">Recharged</p>
        
        <div class="stagger-3" style="display: flex; gap: var(--ddr-space-4); margin-bottom: var(--ddr-space-8);">
          <button data-menu="play" class="btn--primary" style="font-size: 1.4rem; padding: var(--ddr-space-4) var(--ddr-space-12);">▶ PLAY</button>
          <button data-menu="settings" class="btn--secondary">⚙ SETTINGS</button>
        </div>

        <div class="stagger-4" style="width: 100%; max-width: 450px;">
          <h2 style="font-size: 1rem; color: var(--ddr-text-secondary); margin-bottom: var(--ddr-space-3);">LEVEL SELECT</h2>
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
        </div>
      </div>
      <style>
        .stagger-1 { animation: staggerSlideUp 800ms var(--ddr-ease-out) 200ms both; }
        .stagger-2 { animation: staggerSlideUp 800ms var(--ddr-ease-out) 400ms both; }
        .stagger-3 { animation: staggerSlideUp 800ms var(--ddr-ease-out) 600ms both; }
        .stagger-4 { animation: staggerSlideUp 800ms var(--ddr-ease-out) 800ms both; }
        @keyframes staggerSlideUp {
          from { opacity: 0; transform: translateY(30px); filter: blur(5px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      </style>
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
