import type { InputController } from '../game/systems/InputController';

export class TouchControls {
  private container: HTMLElement | null = null;

  constructor(private readonly input: InputController) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'touch-controls';
    container.innerHTML = `
      <div class="touch-controls__dpad">
        <button class="touch-controls__btn" data-touch="left" aria-label="Move left">◀</button>
        <button class="touch-controls__btn" data-touch="right" aria-label="Move right">▶</button>
      </div>
      <button class="touch-controls__btn touch-controls__jump" data-touch="jump" aria-label="Jump">▲</button>
    `;
    root.appendChild(container);
    this.container = container;

    const bind = (selector: string, key: 'left' | 'right' | 'jumpHeld') => {
      const el = container.querySelector(selector) as HTMLButtonElement;
      const press = (e: Event) => {
        e.preventDefault();
        this.input.setVirtualState({ [key]: true, ...(key === 'jumpHeld' ? { jumpPressed: true } : {}) });
      };
      const release = (e: Event) => {
        e.preventDefault();
        this.input.setVirtualState({ [key]: false });
      };
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release);
      el.addEventListener('touchcancel', release);
    };
    bind('[data-touch="left"]', 'left');
    bind('[data-touch="right"]', 'right');
    bind('[data-touch="jump"]', 'jumpHeld');
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
