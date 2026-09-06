/**
 * Geometry and pacing for the between-levels corridor.
 *
 * Kept as pure arithmetic, separate from the scene, because the two things most easily got
 * wrong here are not rendering problems but *composition* problems: a banner that lands on top
 * of the character, a door that hangs off the edge of a narrow screen, or a walk that becomes a
 * sprint on a wide one. Those are all assertions about numbers, so they belong somewhere a test
 * can hold them still.
 */

/** A deliberate, unhurried pace, in px/sec of corridor crossed. */
export const WALK_SPEED_PX_PER_SEC = 170;

/**
 * The walk is cinematic, so its length is bounded at both ends regardless of screen size: never
 * so quick the animation can't be appreciated, never so long the player is waiting on it.
 */
export const MIN_WALK_MS = 2000;
export const MAX_WALK_MS = 4000;

export interface CorridorLayout {
  /** Centre of the door Dave came out of — the level he just finished. */
  leftDoorX: number;
  /** Centre of the door he is walking towards — the next level. */
  rightDoorX: number;
  doorWidth: number;
  doorHeight: number;
  /** Both doors and the walker stand on this line. */
  doorBaseY: number;
  floorY: number;
  ceilingY: number;
  walkStartX: number;
  walkEndX: number;
  walkDistance: number;
  /** Rendered height of the walker. He is the subject of the shot, so he is drawn large. */
  walkerHeight: number;
  /** Baseline for the "GOOD WORK!" banner, below the corridor so it can never cover anything. */
  messageY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Lays the corridor out for a given canvas.
 *
 * The doors sit at 16% and 84% of the width: far enough apart to read as a passage rather than
 * a vestibule, close enough in that neither is clipped on a narrow screen.
 */
export function corridorLayout(width: number, height: number): CorridorLayout {
  const leftDoorX = width * 0.16;
  const rightDoorX = width * 0.84;

  const ceilingY = height * 0.2;
  const floorY = height * 0.72;

  // Tall enough that the leg and arm movement is legible — the walk is the point of the scene.
  const walkerHeight = clamp(height * 0.26, 110, 168);

  // The doors are sized around the walker rather than around the canvas, because the one thing
  // they must do is be a doorway he fits through on his feet.
  const doorHeight = Math.min(walkerHeight * 1.3, (floorY - ceilingY) * 0.86);
  const doorWidth = doorHeight * 0.62;

  return {
    leftDoorX,
    rightDoorX,
    doorWidth,
    doorHeight,
    doorBaseY: floorY,
    floorY,
    ceilingY,
    walkStartX: leftDoorX,
    walkEndX: rightDoorX,
    walkDistance: rightDoorX - leftDoorX,
    walkerHeight,
    // Below the floor line, so it clears both the doors and the walker's head at every size.
    messageY: Math.min(floorY + 62, height - 34),
  };
}

/**
 * How long the crossing should take. Derived from the distance actually being walked so the
 * pace stays constant across screen sizes, then bounded so it always feels deliberate.
 */
export function walkDurationMs(distance: number, speed = WALK_SPEED_PX_PER_SEC): number {
  return clamp((distance / speed) * 1000, MIN_WALK_MS, MAX_WALK_MS);
}

/* ------------------------------------------------------------------ */
/*  PACING                                                            */
/* ------------------------------------------------------------------ */

/** He opens the door of the level he just cleared and steps out of the light. */
export const LEFT_DOOR_OPEN_MS = 620;
/** A held beat in the doorway before he sets off. */
export const STEP_OUT_MS = 340;
/** The destination door opening once he arrives. */
export const RIGHT_DOOR_OPEN_MS = 300;
/** Walking into the doorway and out of sight. */
export const ENTER_MS = 720;
/**
 * How long after the natural end the backstop fires. Long enough that a slow frame cannot
 * trip it, short enough that a genuinely stuck beat is not a visible hang.
 */
export const FAILSAFE_MARGIN_MS = 1800;

export interface CorridorTimeline {
  leftDoorOpenMs: number;
  stepOutMs: number;
  walkMs: number;
  rightDoorOpenMs: number;
  enterMs: number;
  /** When he starts walking. */
  walkStartsAtMs: number;
  /** When the last beat finishes, if nothing goes wrong. */
  naturalEndMs: number;
  /** The backstop that ends the scene regardless. Always after `naturalEndMs`. */
  failsafeMs: number;
}

/**
 * The corridor's beats, laid end to end.
 *
 * Kept here rather than as loose constants in the scene so the one thing that must never be
 * wrong is checkable: the failsafe has to fire *after* the choreography would naturally
 * finish. If it ever drifts in front, it stops being a backstop and quietly becomes the normal
 * exit — cutting the walk short on every level, on every playthrough, with nothing to see in
 * the logs.
 */
export function corridorTimeline(walkDistance: number): CorridorTimeline {
  const walkMs = walkDurationMs(walkDistance);
  const walkStartsAtMs = LEFT_DOOR_OPEN_MS + STEP_OUT_MS;
  const naturalEndMs = walkStartsAtMs + walkMs + RIGHT_DOOR_OPEN_MS + ENTER_MS;
  return {
    leftDoorOpenMs: LEFT_DOOR_OPEN_MS,
    stepOutMs: STEP_OUT_MS,
    walkMs,
    rightDoorOpenMs: RIGHT_DOOR_OPEN_MS,
    enterMs: ENTER_MS,
    walkStartsAtMs,
    naturalEndMs,
    failsafeMs: naturalEndMs + FAILSAFE_MARGIN_MS,
  };
}
