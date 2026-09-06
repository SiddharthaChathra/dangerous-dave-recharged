import { LEVEL_ORDER } from '../game/levels/registry';

export interface CompletionMessage {
  title: string;
  subtitle: string;
  /** True after the final level, when there is nothing left to count down to. */
  isVictory: boolean;
}

/** 1-based position of a level in the campaign. Unknown ids fall back to 1. */
export function levelNumber(levelId: string): number {
  const index = LEVEL_ORDER.indexOf(levelId);
  return index >= 0 ? index + 1 : 1;
}

/**
 * How many levels are still to play after finishing this one.
 *
 * Derived from the campaign rather than a constant, so adding or removing a level updates the
 * "only N more to go" message automatically. Never negative.
 */
export function remainingLevelsAfter(levelId: string): number {
  const index = LEVEL_ORDER.indexOf(levelId);
  if (index < 0) return Math.max(0, LEVEL_ORDER.length - 1);
  return Math.max(0, LEVEL_ORDER.length - (index + 1));
}

export function isFinalLevel(levelId: string): boolean {
  return remainingLevelsAfter(levelId) === 0;
}

/**
 * The between-levels message, in the spirit of the original's
 * "GOOD WORK! ONLY 5 MORE TO GO." — with the count computed from real game state.
 */
export function completionMessage(levelId: string): CompletionMessage {
  const remaining = remainingLevelsAfter(levelId);

  if (remaining === 0) {
    return {
      title: `LEVEL ${levelNumber(levelId)} COMPLETE!`,
      subtitle: `YOU CONQUERED ALL ${LEVEL_ORDER.length} LEVELS`,
      isVictory: true,
    };
  }

  return {
    title: 'GOOD WORK!',
    subtitle: `ONLY ${remaining} MORE TO GO.`,
    isVictory: false,
  };
}
