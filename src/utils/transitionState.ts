/**
 * The level's lifecycle, as one explicit value.
 *
 * This replaces the pair of booleans PlayScene used to juggle (`dying`, `doorSequenceStarted`,
 * `levelCompleted`), which could in principle disagree with each other. One enum makes the
 * illegal combinations unrepresentable and gives every guard a single thing to read.
 */
export type TransitionState =
  | 'playing'
  /** The exit was legitimately triggered; the door sequence is running. */
  | 'transitioning'
  /** The completion message is up and the next level is being prepared. */
  | 'completing'
  /** A death is playing out; the level is about to restart or the run is over. */
  | 'dying';

/** Whether normal gameplay input and simulation should run. */
export function isPlayable(state: TransitionState): boolean {
  return state === 'playing';
}

/**
 * Whether the exit may be triggered right now. Everything except `playing` refuses, which is
 * what makes a second door touch — from a rapid keypress, a lingering overlap, or a physics
 * step landing mid-animation — a no-op instead of a second level load.
 */
export function canTriggerExit(state: TransitionState): boolean {
  return state === 'playing';
}

/**
 * Whether the player can still be hurt. Once the exit sequence starts the player is committed:
 * a hazard they were overlapping at the door must not steal the completed level.
 */
export function canTakeDamage(state: TransitionState): boolean {
  return state === 'playing';
}
