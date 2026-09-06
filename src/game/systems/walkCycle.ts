/**
 * A procedural walk cycle.
 *
 * The character art in this game is a single static frame per state — there are no walk frames
 * to play, so a corridor walk driven by texture swaps would only ever be a sprite sliding along
 * a floor. This module supplies the missing animation as maths: given a normalised phase
 * through the gait, it returns the pose of each limb, which the corridor's rig draws.
 *
 * Everything here is unitless. Angles are radians, offsets are fractions of a limb or of the
 * bob height, so one pose serves any size of walker.
 */

/** Peak thigh swing, fore and aft. Roughly a natural walking stride rather than a march. */
export const THIGH_SWING = 0.52;
/** Hip-to-heel as a fraction of total height. The rig is built to this, and so is the stride. */
export const LEG_LENGTH_RATIO = 0.42;
/** Peak knee flexion, reached as the leg passes under the body to clear the floor. */
const KNEE_FLEX = 0.62;
/** Arms swing less than legs. */
const ARM_SWING = 0.38;

export interface WalkPose {
  /** Thigh angle in radians; positive swings the leg forward. */
  leftThigh: number;
  rightThigh: number;
  /** Knee flexion in radians. Never negative — knees do not bend forwards. */
  leftKnee: number;
  rightKnee: number;
  /** Shoulder angle in radians; positive swings the arm forward. */
  leftArm: number;
  rightArm: number;
  /** Vertical bob, 0 at the top of the stride to 1 at the bottom. Positive is downward. */
  bodyBobY: number;
  /** Slight forward lean, in radians — walkers lead with the chest. */
  torsoLean: number;
}

const TAU = Math.PI * 2;

/**
 * The pose at a point in the gait. `phase` is in cycles and wraps, so callers can accumulate
 * it without bound.
 *
 * One full cycle is two steps: at phase 0 the left leg is passing under the body, at 0.25 it
 * is at full forward stride, at 0.5 the roles are exactly reversed.
 */
export function walkPose(phase: number): WalkPose {
  const p = phase - Math.floor(phase);
  const a = TAU * p;

  const leftThigh = Math.sin(a) * THIGH_SWING;
  const rightThigh = Math.sin(a + Math.PI) * THIGH_SWING;

  // Flexion peaks as the leg swings through and is zero across the whole stance half, so the
  // leg bearing weight stays straight — the difference between walking and crouch-shuffling.
  const leftKnee = Math.max(0, Math.cos(a)) * KNEE_FLEX;
  const rightKnee = Math.max(0, Math.cos(a + Math.PI)) * KNEE_FLEX;

  return {
    leftThigh,
    rightThigh,
    leftKnee,
    rightKnee,
    // Contralateral: the arm opposes the leg on its own side.
    leftArm: -leftThigh * (ARM_SWING / THIGH_SWING),
    rightArm: -rightThigh * (ARM_SWING / THIGH_SWING),
    // Twice per cycle: the body rides high over a straight supporting leg and dips each time
    // the legs are apart and neither is vertical.
    bodyBobY: (1 - Math.cos(2 * a)) / 2,
    torsoLean: 0.05,
  };
}

/**
 * How many steps per second a walker must take to cover ground at `speedPxPerSec` without its
 * feet sliding: each step has to advance the body by exactly one step length.
 */
export function stepFrequencyHz(speedPxPerSec: number, stepLengthPx: number): number {
  if (stepLengthPx <= 0) return 0;
  return speedPxPerSec / stepLengthPx;
}

/**
 * The distance one step covers, for a walker of this rendered height.
 *
 * Measured off the rig itself — the horizontal gap between the two feet at full stride — rather
 * than picked to look right. That is what makes `stepFrequencyHz` actually prevent sliding: the
 * cadence is derived from the stride the legs genuinely open, so each foot is set down exactly
 * where the ground arrives under it.
 */
export function stepLengthFor(walkerHeight: number): number {
  return 2 * walkerHeight * LEG_LENGTH_RATIO * Math.sin(THIGH_SWING);
}
