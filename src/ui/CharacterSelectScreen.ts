import { audioSystem } from '../game/core/audio';
import { CHARACTERS, isCharacterUnlocked, type CharacterDef } from '../game/characters/roster';
import { getSelectedCharacterId, setSelectedCharacter } from '../game/characters/selection';
import { CharacterShowcase, SHOWCASE_CONFIGS } from './CharacterShowcase';

/**
 * The character roster.
 *
 * This is the *integration mount point* for character selection, not a finished visual design:
 * it owns the behaviour (which characters exist, which are locked, what a click does, keeping
 * the active marker in sync) and nothing else. Gemini owns how it looks — restyle via the
 * `.roster-*` / `.character-card*` classes or rebuild the markup entirely.
 *
 * Two things must survive a redesign:
 *   - the `data-character-card="<id>"` / `data-character-select="panel|close"` hooks (tests and
 *     game logic select on them), and
 *   - selection going through `setSelectedCharacter`, which refuses locked ids.
 */
export class CharacterSelectScreen {
  private container: HTMLElement | null = null;
  private unsubscribers: (() => void)[] = [];
  private showcase: CharacterShowcase | null = null;
  private infoNameEl: HTMLElement | null = null;
  private infoBlurbEl: HTMLElement | null = null;
  private showcaseWrap: HTMLElement | null = null;

  constructor(
    /** Levels the player has cleared, which decides what is unlocked. */
    private readonly completedLevelIds: readonly string[],
    private readonly onClose?: () => void,
  ) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="roster-layout" data-character-select="panel">
        <div class="roster-showcase-side">
          <div class="roster-info">
            <div class="roster-info__name" data-roster="name"></div>
            <div class="roster-info__blurb" data-roster="blurb"></div>
          </div>
          <div class="roster-showcase-wrap" data-roster="showcase"></div>
        </div>
        <div class="roster-cards-side">
          <h2>👥 Roster</h2>
          <p class="roster__hint">Every character plays identically — pick the one you like.</p>
          <div class="roster-grid">
            ${CHARACTERS.map((c) => this.cardMarkup(c)).join('')}
          </div>
          <button data-character-select="close" class="btn--secondary">✕ Close</button>
        </div>
      </div>
    `;
    root.appendChild(container);
    this.container = container;

    this.infoNameEl = container.querySelector('[data-roster="name"]');
    this.infoBlurbEl = container.querySelector('[data-roster="blurb"]');
    this.showcaseWrap = container.querySelector('[data-roster="showcase"]');

    // Create and mount the canvas showcase
    this.showcase = new CharacterShowcase();
    if (this.showcaseWrap) {
      this.showcaseWrap.appendChild(this.showcase.getElement());
      // Size the canvas to fill its container
      this.resizeShowcase();
    }

    // Show the currently selected character in the showcase
    const selectedId = getSelectedCharacterId();
    this.updateShowcase(selectedId);

    for (const character of CHARACTERS) {
      const card = container.querySelector(`[data-character-card="${character.id}"]`) as HTMLElement | null;
      if (!card) continue;
      const handler = () => this.select(character);
      card.addEventListener('click', handler);
      this.unsubscribers.push(() => card.removeEventListener('click', handler));
    }

    const closeButton = container.querySelector('[data-character-select="close"]') as HTMLButtonElement;
    const closeHandler = () => {
      audioSystem.playSfx('uiClick');
      this.destroy();
      this.onClose?.();
    };
    closeButton.addEventListener('click', closeHandler);
    this.unsubscribers.push(() => closeButton.removeEventListener('click', closeHandler));
    closeButton.focus();

    // Handle resize
    const resizeHandler = () => this.resizeShowcase();
    window.addEventListener('resize', resizeHandler);
    this.unsubscribers.push(() => window.removeEventListener('resize', resizeHandler));
  }

  private resizeShowcase(): void {
    if (!this.showcaseWrap || !this.showcase) return;
    const rect = this.showcaseWrap.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, 400);
    this.showcase.resize(size, size);
  }

  private updateShowcase(characterId: string): void {
    // Update the showcase canvas
    const phaserGame = (window as unknown as { __ddrDebugGame: Phaser.Game }).__ddrDebugGame;
    if (this.showcase && phaserGame) {
      this.showcase.setCharacter(characterId, phaserGame);
    }

    // Update the info panel with slide animation
    const config = SHOWCASE_CONFIGS[characterId] ?? SHOWCASE_CONFIGS['dave'];
    if (this.infoNameEl && this.infoBlurbEl) {
      // Trigger re-animation by removing and re-adding the class
      this.infoNameEl.classList.remove('roster-info--visible');
      this.infoBlurbEl.classList.remove('roster-info--visible');
      // Force reflow
      void this.infoNameEl.offsetWidth;
      this.infoNameEl.textContent = config.name;
      this.infoBlurbEl.textContent = config.blurb;
      this.infoNameEl.classList.add('roster-info--visible');
      this.infoBlurbEl.classList.add('roster-info--visible');
    }
  }

  private cardMarkup(character: CharacterDef): string {
    const unlocked = isCharacterUnlocked(character, this.completedLevelIds);
    const active = unlocked && character.id === getSelectedCharacterId();
    const state = active ? 'active' : unlocked ? 'unlocked' : 'locked';
    const requirement = character.unlockAfterLevelId
      ? `🔒 Clear ${character.unlockAfterLevelId} to unlock`
      : '';

    return `
      <div class="character-card character-card--${state}"
           data-character-card="${character.id}"
           data-character-state="${state}"
           role="button"
           tabindex="${unlocked ? '0' : '-1'}"
           aria-disabled="${unlocked ? 'false' : 'true'}"
           aria-label="${character.name}${unlocked ? '' : ' (locked)'}">
        <div class="character-card__name">${character.name}</div>
        <div class="character-card__blurb">${unlocked ? character.blurb : requirement}</div>
        ${active ? '<div class="character-card__badge">SELECTED</div>' : ''}
      </div>`;
  }

  private select(character: CharacterDef): void {
    // Locked characters are inert. Checked here rather than relying on styling, so a card that
    // is merely *drawn* as disabled can never hand out an unearned character.
    if (!isCharacterUnlocked(character, this.completedLevelIds)) return;
    if (character.id === getSelectedCharacterId()) return;

    setSelectedCharacter(character.id);
    audioSystem.playSfx('uiClick');
    this.refreshCards();
    this.updateShowcase(character.id);
  }

  /** Repaints the card states so the active marker follows the selection. */
  private refreshCards(): void {
    if (!this.container) return;
    const selected = getSelectedCharacterId();
    for (const character of CHARACTERS) {
      const card = this.container.querySelector(`[data-character-card="${character.id}"]`) as HTMLElement | null;
      if (!card) continue;
      const unlocked = isCharacterUnlocked(character, this.completedLevelIds);
      const state = unlocked && character.id === selected ? 'active' : unlocked ? 'unlocked' : 'locked';
      card.dataset.characterState = state;
      card.className = `character-card character-card--${state}`;
      const badge = card.querySelector('.character-card__badge');
      if (state === 'active' && !badge) {
        const el = document.createElement('div');
        el.className = 'character-card__badge';
        el.textContent = 'SELECTED';
        card.appendChild(el);
      } else if (state !== 'active' && badge) {
        badge.remove();
      }
    }
  }

  destroy(): void {
    // Clean up the showcase rAF loop FIRST — before removing the DOM
    this.showcase?.destroy();
    this.showcase = null;

    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    this.container?.remove();
    this.container = null;
    this.infoNameEl = null;
    this.infoBlurbEl = null;
    this.showcaseWrap = null;
  }
}
