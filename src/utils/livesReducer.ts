export interface LivesState {
  lives: number;
  checkpointId: string | null;
  isGameOver: boolean;
}

/** Lives the player starts a level with; also the denominator for the HUD health bar. */
export const STARTING_LIVES = 3;

export function createLivesState(): LivesState {
  return { lives: STARTING_LIVES, checkpointId: null, isGameOver: false };
}

export function applyDamage(state: LivesState): LivesState {
  const lives = Math.max(0, state.lives - 1);
  return { ...state, lives, isGameOver: lives === 0 };
}

export function setCheckpoint(state: LivesState, checkpointId: string): LivesState {
  return { ...state, checkpointId };
}
