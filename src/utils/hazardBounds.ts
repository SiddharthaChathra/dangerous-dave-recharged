export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HazardInset {
  /** Fraction of the hazard's width removed from each side. */
  sideRatio: number;
  /** Fraction of the hazard's height removed from the top. */
  topRatio: number;
  /** Never shrink a hazard below this many pixels on an axis. */
  minSizePx: number;
}

/**
 * Hazards are drawn as spikes — pointed, with gaps and empty air above the tips — but their
 * collision was the full bounding rectangle, so a player could die to a pixel of visual nothing.
 */
export const HAZARD_INSET: HazardInset = {
  sideRatio: 0.18,
  topRatio: 0.3,
  minSizePx: 4,
};

/**
 * The area of a hazard that actually deals damage: inset from the sides and the top so the
 * player must meaningfully enter the spikes, while the base stays flush with the floor so
 * there is no safe pocket to stand in at the bottom.
 *
 * Visual bounds and damage bounds are deliberately different things — this is the gameplay one.
 */
export function computeHazardDamageBox(visual: Rect, inset: HazardInset): Rect {
  const sideInset = Math.min(visual.width * inset.sideRatio, Math.max(0, (visual.width - inset.minSizePx) / 2));
  const topInset = Math.min(visual.height * inset.topRatio, Math.max(0, visual.height - inset.minSizePx));

  return {
    x: visual.x + sideInset,
    y: visual.y + topInset,
    width: Math.max(inset.minSizePx, visual.width - sideInset * 2),
    height: Math.max(inset.minSizePx, visual.height - topInset),
  };
}
