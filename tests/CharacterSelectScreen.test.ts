import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterSelectScreen } from '../src/ui/CharacterSelectScreen';
import { getSelectedCharacterId, setSelectedCharacter } from '../src/game/characters/selection';
import { DEFAULT_CHARACTER_ID } from '../src/game/characters/roster';

describe('CharacterSelectScreen', () => {
  let root: HTMLElement;
  let screen: CharacterSelectScreen;

  const mountWith = (completedLevelIds: string[]) => {
    screen = new CharacterSelectScreen(completedLevelIds);
    screen.mount(root);
  };
  const card = (id: string) => root.querySelector(`[data-character-card="${id}"]`) as HTMLElement;

  beforeEach(() => {
    setSelectedCharacter(DEFAULT_CHARACTER_ID);
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    screen?.destroy();
    root.remove();
    setSelectedCharacter(DEFAULT_CHARACTER_ID);
  });

  it('lists every character, including ones not yet unlocked', () => {
    // Locked characters must still be visible — they are the reason to keep playing.
    mountWith([]);
    for (const id of ['dave', 'delta', 'nova', 'rex']) expect(card(id)).not.toBeNull();
  });

  it('marks which characters are locked and which are available', () => {
    mountWith(['level002']);
    expect(card('dave').dataset.characterState).toBe('active');
    expect(card('delta').dataset.characterState).toBe('unlocked');
    expect(card('nova').dataset.characterState).toBe('locked');
  });

  it('tells the player how to unlock a locked character', () => {
    mountWith([]);
    expect(card('rex').textContent).toContain('level004');
  });

  it('selects an unlocked character when its card is clicked', () => {
    mountWith(['level002']);
    card('delta').click();
    expect(getSelectedCharacterId()).toBe('delta');
  });

  it('refuses to select a locked character, however the card is clicked', () => {
    // Enforced in logic, not just by styling: a disabled-looking card that still worked would
    // hand out unearned unlocks.
    mountWith([]);
    card('nova').click();
    expect(getSelectedCharacterId()).toBe('dave');
  });

  it('moves the active marker to the newly chosen character', () => {
    mountWith(['level002']);
    card('delta').click();
    expect(card('delta').dataset.characterState).toBe('active');
    expect(card('dave').dataset.characterState).toBe('unlocked');
  });

  it('closes on request without changing the selection', () => {
    mountWith(['level002']);
    card('delta').click();
    (root.querySelector('[data-character-select="close"]') as HTMLButtonElement).click();
    expect(root.querySelector('[data-character-select="panel"]')).toBeNull();
    expect(getSelectedCharacterId()).toBe('delta');
  });
});
