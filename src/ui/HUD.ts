import type { EventBus, GameEvents } from '../game/core/EventBus';
import { LEVELS } from '../game/levels/registry';

export class HUD {
  private container: HTMLElement | null = null;
  private unsubscribers: (() => void)[] = [];
  
  private scoreEl!: HTMLElement;
  private gemsEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private livesEl!: HTMLElement;
  private healthFillEl!: HTMLElement;
  private levelNameEl!: HTMLElement;
  private progressFillEl!: HTMLElement;
  private leftPanelEl!: HTMLElement;

  constructor(private readonly bus: EventBus<GameEvents>) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'hud hud--hidden';
    container.innerHTML = `
      <div class="hud-left hud-panel" id="hud-left-panel">
        <div class="health-container">
          <div class="avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ddr-accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div class="health-bar-wrap">
            <div class="health-label">INTEGRITY</div>
            <div class="health-track">
              <div class="health-fill" id="hud-health-fill" style="width: 100%;"></div>
            </div>
          </div>
        </div>
        <div class="lives-wrap">
          <span style="color: var(--ddr-danger);">❤</span> <span id="hud-lives">3</span>
        </div>
      </div>

      <div class="hud-center">
        <div class="level-name" id="hud-level-name">TRAINING GROUNDS</div>
        <div class="progress-track">
          <div class="progress-fill" id="hud-progress-fill"></div>
        </div>
      </div>

      <div class="hud-right">
        <div class="stat-group hud-panel">
          <div class="stat-item">
            <span class="stat-label">SCORE</span>
            <span class="stat-value" id="hud-score">000000</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">GEMS</span>
            <span class="stat-value" id="hud-gems">0/0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">TIME</span>
            <span class="stat-value" id="hud-timer">00:00</span>
          </div>
        </div>
        <button class="hud-pause-btn" id="hud-pause" aria-label="Pause game">⏸</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;

    this.scoreEl = container.querySelector('#hud-score')!;
    this.gemsEl = container.querySelector('#hud-gems')!;
    this.timerEl = container.querySelector('#hud-timer')!;
    this.livesEl = container.querySelector('#hud-lives')!;
    this.healthFillEl = container.querySelector('#hud-health-fill')!;
    this.levelNameEl = container.querySelector('#hud-level-name')!;
    this.progressFillEl = container.querySelector('#hud-progress-fill')!;
    this.leftPanelEl = container.querySelector('#hud-left-panel')!;

    const pauseButton = container.querySelector('#hud-pause') as HTMLButtonElement;
    const pauseHandler = () => this.bus.emit('game:pause', {} as Record<string, never>);
    pauseButton.addEventListener('click', pauseHandler);
    this.unsubscribers.push(() => pauseButton.removeEventListener('click', pauseHandler));

    this.bindEvents();
  }

  private bindEvents(): void {
    let lastScore = 0;
    
    this.unsubscribers.push(
      this.bus.on('score:changed', ({ score }) => {
        this.scoreEl.textContent = score.toString().padStart(6, '0');
        if (score > lastScore) {
          this.triggerPop(this.scoreEl);
        }
        lastScore = score;
      }),
      this.bus.on('lives:changed', ({ lives }) => {
        this.livesEl.textContent = String(lives);
      }),
      // Handle custom health event (to be added to event bus later)
      // For now we'll listen to damage events or just rely on a new hp:changed event
      this.bus.on('hp:changed', ({ hp, maxHp }) => {
        const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        this.healthFillEl.style.width = `${pct}%`;
        if (pct <= 30) {
          this.leftPanelEl.classList.add('health-low');
        } else {
          this.leftPanelEl.classList.remove('health-low');
        }
      }),
      this.bus.on('collectible:changed', ({ collected, total }) => {
        this.gemsEl.textContent = `${collected}/${total}`;
        this.triggerPop(this.gemsEl);
      }),
      this.bus.on('timer:tick', ({ seconds }) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        this.timerEl.textContent = `${m}:${s}`;
      }),
      this.bus.on('level:progress', ({ percent }) => {
        this.progressFillEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
      }),
      this.bus.on('game:started', ({ levelId }) => {
        if (levelId === 'menu') {
          this.hide();
        } else {
          const level = LEVELS[levelId];
          if (level) {
            this.levelNameEl.textContent = level.name;
          }
          // Reset progress bar
          this.progressFillEl.style.width = '0%';
          this.healthFillEl.style.width = '100%';
          this.leftPanelEl.classList.remove('health-low');
          this.show();
        }
      })
    );
  }

  private triggerPop(element: HTMLElement): void {
    element.classList.remove('stat-pop');
    // Force reflow
    void element.offsetWidth;
    element.classList.add('stat-pop');
    
    // Clean up class after animation
    setTimeout(() => {
      element.classList.remove('stat-pop');
    }, 150);
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
