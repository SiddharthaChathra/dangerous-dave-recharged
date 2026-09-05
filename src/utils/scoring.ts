export interface ScoreState {
  score: number;
  collected: number;
  total: number;
}

export const GEM_SCORE = 10;
export const SECRET_SCORE = 100;

export function createScoreState(total: number): ScoreState {
  return { score: 0, collected: 0, total };
}

export function collectGem(state: ScoreState): ScoreState {
  return { ...state, score: state.score + GEM_SCORE, collected: state.collected + 1 };
}

export function collectSecret(state: ScoreState): ScoreState {
  return { ...state, score: state.score + SECRET_SCORE, collected: state.collected + 1 };
}

export type Rating = 'bronze' | 'silver' | 'gold';

export function computeRating(state: ScoreState, elapsedSeconds: number, parTimeSeconds: number): Rating {
  const collectionRatio = state.total === 0 ? 1 : state.collected / state.total;
  const underPar = elapsedSeconds <= parTimeSeconds;
  const withinOneAndHalfPar = elapsedSeconds <= parTimeSeconds * 1.5;

  if (collectionRatio === 1 && underPar) return 'gold';
  if (collectionRatio >= 0.5 && withinOneAndHalfPar) return 'silver';
  return 'bronze';
}
