export interface ScoreState {
  score: number;
  collected: number;
  total: number;
}

export const GEM_SCORE = 10;
export const SECRET_SCORE = 100;
export const ENEMY_DEFEAT_SCORE = 50;

/**
 * Score is a *run* total carried across levels, while `collected`/`total` are per-level (they
 * drive the end-of-level rating), so a level attempt starts from the run's score so far.
 */
export function createScoreState(total: number, startingScore = 0): ScoreState {
  return { score: startingScore, collected: 0, total };
}

export function collectGem(state: ScoreState): ScoreState {
  return { ...state, score: state.score + GEM_SCORE, collected: state.collected + 1 };
}

export function collectSecret(state: ScoreState): ScoreState {
  return { ...state, score: state.score + SECRET_SCORE, collected: state.collected + 1 };
}

/**
 * Enemies score points but are deliberately *not* counted as collectibles: `collected`/`total`
 * drive the end-of-level rating, and shooting enemies must not inflate a collection percentage.
 */
export function defeatEnemy(state: ScoreState): ScoreState {
  return { ...state, score: state.score + ENEMY_DEFEAT_SCORE };
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
