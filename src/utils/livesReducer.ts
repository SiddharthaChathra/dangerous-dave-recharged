export interface LivesState {
  lives: number;
  checkpointId: string | null;
  isGameOver: boolean;
}

export function createLivesState(): LivesState {
  return { lives: 3, checkpointId: null, isGameOver: false };
}

export function applyDamage(state: LivesState): LivesState {
  const lives = Math.max(0, state.lives - 1);
  return { ...state, lives, isGameOver: lives === 0 };
}

export function setCheckpoint(state: LivesState, checkpointId: string): LivesState {
  return { ...state, checkpointId };
}
