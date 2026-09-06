import { getVisualMode, toggleVisualMode, type VisualMode } from '../game/core/visualMode';
import { gameEvents } from '../game/core/EventBus';

const LABELS: Record<VisualMode, string> = {
  classic: 'CLASSIC DAVE',
  current: 'CURRENT VISUAL',
};

/**
 * The CLASSIC DAVE ↕ CURRENT VISUAL switch.
 *
 * This is the *integration mount point* for theme switching, not a finished visual design:
 * it owns the behaviour (toggling, label/state sync, keyboard shortcut, a11y wiring) and
 * nothing else. Gemini owns how it looks — restyle it freely via `.visual-mode-toggle*` selectors
 * or `[data-visual-mode]`, and if it needs to be rebuilt or moved, the only contract is that
 * something calls `toggleVisualMode()`.
 *
 * See THEME_INTEGRATION.md.
 */
export class VisualModeToggle {
  private container: HTMLElement | null = null;
  private button: HTMLButtonElement | null = null;
  private unsubscribers: (() => void)[] = [];

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'visual-mode-toggle';
    container.innerHTML = `
      <button
        type="button"
        class="visual-mode-toggle__btn"
        data-visual-toggle="button"
        aria-live="polite"
      >
        <span class="visual-mode-toggle__icon" aria-hidden="true">⇅</span>
        <span class="visual-mode-toggle__label" data-visual-toggle="label"></span>
      </button>
    `;
    root.appendChild(container);
    this.container = container;
    this.button = container.querySelector('[data-visual-toggle="button"]');

    const onClick = () => toggleVisualMode();
    this.button?.addEventListener('click', onClick);
    this.unsubscribers.push(() => this.button?.removeEventListener('click', onClick));

    // Keyboard shortcut. Ignored while typing in a field, and never swallows other keys.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 't' && event.key !== 'T') return;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      toggleVisualMode();
    };
    window.addEventListener('keydown', onKeyDown);
    this.unsubscribers.push(() => window.removeEventListener('keydown', onKeyDown));

    this.unsubscribers.push(gameEvents.on('visual-mode:changed', ({ mode }) => this.render(mode)));
    this.render(getVisualMode());
  }

  private render(mode: VisualMode): void {
    if (!this.container || !this.button) return;
    const label = this.container.querySelector('[data-visual-toggle="label"]');
    if (label) label.textContent = LABELS[mode];
    this.container.setAttribute('data-mode', mode);
    // Announce the *action*, not the state, so screen-reader users know what pressing does.
    this.button.setAttribute('aria-label', `Visual theme: ${LABELS[mode]}. Switch to ${LABELS[mode === 'classic' ? 'current' : 'classic']}`);
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    this.container?.remove();
    this.container = null;
    this.button = null;
  }
}
