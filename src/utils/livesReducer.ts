export interface LivesState {
  lives: number;
  isGameOver: boolean;
}

/** Lives a new run starts with; also the denominator for the HUD health bar. */
export const STARTING_LIVES = 3;

/**
 * Lives are a *run*-level resource, not a per-level one: a level attempt starts with whatever
 * the run has left, so three deaths end the run no matter which levels they happened on.
 */
export function createLivesState(lives: number = STARTING_LIVES): LivesState {
  return { lives, isGameOver: lives <= 0 };
}

export function applyDamage(state: LivesState): LivesState {
  const lives = Math.max(0, state.lives - 1);
  return { ...state, lives, isGameOver: lives === 0 };
}
