import { gameEvents } from '../core/EventBus';
import { DEFAULT_CHARACTER_ID, isCharacterId } from './roster';

/**
 * Which character the player is using. Held here (not in a scene) so it survives level
 * restarts and scene transitions, exactly like the visual mode.
 *
 * Selection is cosmetic: it changes which textures the player is drawn with and nothing else.
 */
let selectedCharacterId: string = DEFAULT_CHARACTER_ID;

export function getSelectedCharacterId(): string {
  return selectedCharacterId;
}

export function setSelectedCharacter(characterId: string): void {
  const next = isCharacterId(characterId) ? characterId : DEFAULT_CHARACTER_ID;
  if (next === selectedCharacterId) return;
  const previousCharacterId = selectedCharacterId;
  selectedCharacterId = next;
  gameEvents.emit('character:changed', { characterId: next, previousCharacterId });
}
