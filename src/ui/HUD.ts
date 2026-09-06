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
  private keyEl!: HTMLElement;
  // Declared as real fields rather than assigned through `this as any` casts, which tripped
  // the no-explicit-any lint rule and broke CI. Behaviour is unchanged.
  private popupEl: HTMLElement | null = null;
  private tutorialEl: HTMLElement | null = null;

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
          <span style="color: var(--ddr-danger);">❤</span> <span id="hud-lives" data-hud="lives">3</span>
        </div>
      </div>

      <div class="hud-center">
        <div class="level-name" id="hud-level-name" data-hud="level-name">TRAINING GROUNDS</div>
        <div class="progress-track">
          <div class="progress-fill" id="hud-progress-fill"></div>
        </div>
        <div class="hud-key" id="hud-key" data-hud="key" data-key-state="required">
          <span class="hud-key__icon">🔑</span><span class="hud-key__label">KEY REQUIRED</span>
        </div>
      </div>

      <div class="hud-right">
        <div class="stat-group hud-panel">
          <div class="stat-item">
            <span class="stat-label">SCORE</span>
            <span class="stat-value" id="hud-score" data-hud="score">000000</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">GEMS</span>
            <span class="stat-value" id="hud-gems" data-hud="collectibles">0/0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">TIME</span>
            <span class="stat-value" id="hud-timer" data-hud="timer">00:00</span>
          </div>
        </div>
        <button class="hud-pause-btn" id="hud-pause" data-hud="pause-button" aria-label="Pause game">⏸</button>
      </div>

      <div id="hud-tutorial" class="hud-tutorial hud--hidden">
        <h3>HOW TO PLAY</h3>
        <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>ARROWS</kbd> : Move & Jump</p>
        <p><kbd>F</kbd> or <kbd>CTRL</kbd> : Fire Weapon</p>
        <p><kbd>T</kbd> : Switch Visual Mode</p>
        <p>Collect diamonds, avoid red hazards, and reach the exit!</p>
        <button id="hud-tutorial-dismiss">GOT IT</button>
      </div>

      <div id="hud-popup" class="hud-popup hud--hidden"></div>
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
    this.keyEl = container.querySelector('#hud-key')!;
    
    const tutorialEl = container.querySelector('#hud-tutorial') as HTMLElement;
    const tutorialDismiss = container.querySelector('#hud-tutorial-dismiss') as HTMLButtonElement;
    tutorialDismiss.addEventListener('click', () => tutorialEl.classList.add('hud--hidden'));
    
    const popupEl = container.querySelector('#hud-popup') as HTMLElement;
    // We'll store popupEl on the instance to use in bindEvents
    this.popupEl = popupEl;
    this.tutorialEl = tutorialEl;

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
      // Secrets are announced by the game, not inferred from a score delta: +100 is also two
      // enemy defeats in one frame, and the run score jumps on level change and rolls back on
      // death, so a delta check would fire on all of those.
      this.bus.on('collectible:collected', ({ kind, value }) => {
        if (kind === 'secret') {
          this.showPopup(`SECRET COLLECTIBLE! +${value}`, 'var(--ddr-accent-secondary)');
        }
      }),
      // The key is the level's gate, so the HUD always states which side of it the player is
      // on. Driven by the game's own event rather than inferred, so it cannot drift out of
      // step with whether the door will actually open.
      this.bus.on('key:collected', () => {
        this.setKeyState('acquired');
        this.showPopup('🔑 KEY ACQUIRED — EXIT UNLOCKED', 'var(--ddr-warning, #ffd700)');
      }),
      // The name comes from the level that actually loaded, never from `game:started`, whose
      // id may be a sentinel that names no level at all.
      this.bus.on('level:started', ({ levelId }) => {
        const level = LEVELS[levelId];
        if (level) this.levelNameEl.textContent = level.name;
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
          this.tutorialEl?.classList.add('hud--hidden');
        } else {
          const level = LEVELS[levelId];
          if (level) {
            this.levelNameEl.textContent = level.name;
          }
          // Reset progress bar
          this.progressFillEl.style.width = '0%';
          this.setKeyState('required');
          this.healthFillEl.style.width = '100%';
          this.leftPanelEl.classList.remove('health-low');
          this.show();
          
          if (levelId === 'level001') {
              this.tutorialEl?.classList.remove('hud--hidden');
          } else {
              this.tutorialEl?.classList.add('hud--hidden');
          }
        }
      }),
      // The corridor that follows a clear is a cutscene, and the HUD has nothing left to
      // report until the next level begins. It comes back on the next 'game:started'.
      this.bus.on('level:complete', () => {
        this.hide();
        this.tutorialEl?.classList.add('hud--hidden');
      }),
      // Fired after progression is actually written to storage, so the message can't lie.
      this.bus.on('progress:saved', () => {
          this.showPopup('GAME SAVED', 'var(--ddr-success)');
      })
    );
  }

  private setKeyState(state: 'required' | 'acquired'): void {
    if (!this.keyEl) return;
    this.keyEl.setAttribute('data-key-state', state);
    const label = this.keyEl.querySelector('.hud-key__label');
    if (label) label.textContent = state === 'acquired' ? 'KEY ACQUIRED' : 'KEY REQUIRED';
  }

  private showPopup(text: string, color: string): void {
      const popupEl = this.popupEl;
      if (!popupEl) return;
      popupEl.textContent = text;
      popupEl.style.color = color;
      popupEl.classList.remove('hud--hidden');
      popupEl.style.animation = 'none';
      void popupEl.offsetWidth; // trigger reflow
      popupEl.style.animation = 'hud-popup-anim 2s forwards';
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
