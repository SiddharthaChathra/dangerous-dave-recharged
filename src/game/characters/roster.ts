export interface CharacterDef {
  id: string;
  /** Shown in the selection UI. */
  name: string;
  /** One-line flavour for the selection UI. */
  blurb: string;
  /**
   * Texture key prefix. The player's four movement textures are `<prefix>_idle|run|jump|fall`,
   * and classic-mode art is `classic__<prefix>_<state>` — the same convention as the rest of
   * the world's skinning. Missing art falls back to Dave's, so characters can ship gradually.
   */
  texturePrefix: string;
  /** Characters after the first unlock as the player clears levels. */
  unlockedByDefault: boolean;
  /** Level that must be completed to unlock, or null when available from the start. */
  unlockAfterLevelId: string | null;
}

/**
 * The playable roster.
 *
 * Characters are deliberately **cosmetic only** — identical hitbox, speed, jump and damage.
 * A character that moved differently would change level difficulty, and the levels are
 * validated against one fixed set of physics constants. Picking a look must never be picking
 * an easier game.
 */
export const CHARACTERS: CharacterDef[] = [
  {
    id: 'dave',
    name: 'Dangerous Dave',
    blurb: 'The original treasure hunter.',
    texturePrefix: 'player',
    unlockedByDefault: true,
    unlockAfterLevelId: null,
  },
  {
    id: 'delta',
    name: 'Delta',
    blurb: 'Foundry engineer. Unlocked by clearing the Industrial Ruins.',
    texturePrefix: 'char_delta',
    unlockedByDefault: false,
    unlockAfterLevelId: 'level002',
  },
  {
    id: 'nova',
    name: 'Nova',
    blurb: 'Cavern diver. Unlocked by clearing the Neon Caverns.',
    texturePrefix: 'char_nova',
    unlockedByDefault: false,
    unlockAfterLevelId: 'level003',
  },
  {
    id: 'rex',
    name: 'Rex',
    blurb: 'Sky-fortress veteran. Unlocked by clearing the Sky Fortress.',
    texturePrefix: 'char_rex',
    unlockedByDefault: false,
    unlockAfterLevelId: 'level004',
  },
];

export const DEFAULT_CHARACTER_ID = 'dave';

export function getCharacter(characterId: string | undefined): CharacterDef {
  return CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
}

export function isCharacterId(value: unknown): value is string {
  return typeof value === 'string' && CHARACTERS.some((c) => c.id === value);
}

/**
 * Whether a character is available, given the levels the player has completed.
 * Completion is read from the save's per-level best time, which is only set on a clear.
 */
export function isCharacterUnlocked(character: CharacterDef, completedLevelIds: readonly string[]): boolean {
  if (character.unlockedByDefault) return true;
  return character.unlockAfterLevelId !== null && completedLevelIds.includes(character.unlockAfterLevelId);
}

export function unlockedCharacters(completedLevelIds: readonly string[]): CharacterDef[] {
  return CHARACTERS.filter((c) => isCharacterUnlocked(c, completedLevelIds));
}
