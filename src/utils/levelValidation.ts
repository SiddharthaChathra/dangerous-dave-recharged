import type { LevelData } from '../game/levels/types';

/**
 * What the player can actually do, derived from the physics constants:
 *   max jump height = JUMP_VELOCITY^2 / (2 * GRAVITY) = 560^2 / 2800 = 112px
 *   airtime for a flat jump ~= 0.8s, so horizontal reach at top speed ~= 176px
 * The limits below sit inside those numbers so a level never demands a frame-perfect maximum.
 */
export interface JumpLimits {
  /** Launch speed of a jump, px/s. */
  jumpVelocity: number;
  /** Downward acceleration, px/s². */
  gravity: number;
  /** Top horizontal speed, px/s. */
  runSpeed: number;
  /**
   * Fraction of the theoretical maximum a level is allowed to demand. Requiring 100% means a
   * frame-perfect, full-speed jump with zero margin — fine as a stunt, wrong as the only route.
   */
  safetyFactor: number;
}

export const JUMP_LIMITS: JumpLimits = {
  jumpVelocity: 560,
  gravity: 1400,
  runSpeed: 220,
  safetyFactor: 0.9,
};

/** Peak height of a jump: v² / 2g. */
export function maxJumpHeight(limits: JumpLimits = JUMP_LIMITS): number {
  return (limits.jumpVelocity * limits.jumpVelocity) / (2 * limits.gravity);
}

/**
 * How far the player can travel horizontally and still be at least `rise` px above take-off.
 *
 * Solves `v·t − ½·g·t² = rise` for the later root (the descending crossing) — the last moment
 * the player is still high enough to land — and multiplies by run speed. A negative rise means
 * dropping, which buys the fall time on top of a full jump arc.
 */
export function maxHorizontalReach(rise: number, limits: JumpLimits = JUMP_LIMITS): number {
  const { jumpVelocity: v, gravity: g, runSpeed } = limits;

  if (rise <= 0) {
    const fallTime = Math.sqrt((2 * Math.abs(rise)) / g);
    return runSpeed * ((2 * v) / g + fallTime);
  }

  const discriminant = v * v - 2 * g * rise;
  if (discriminant < 0) return 0; // higher than the player can ever jump
  const latestTimeAtHeight = (v + Math.sqrt(discriminant)) / g;
  return runSpeed * latestTimeAtHeight;
}

/** A standable top surface: platforms, moving platforms and falling platforms all qualify. */
export interface Surface {
  x1: number;
  x2: number;
  y: number;
  label: string;
}

export function levelSurfaces(level: LevelData): Surface[] {
  const surfaces: Surface[] = level.platforms.map((p, i) => ({
    x1: p.x,
    x2: p.x + p.width,
    y: p.y,
    label: `platform[${i}]`,
  }));

  // Moving platforms sweep horizontally, so treat their whole travel as standable.
  for (const [i, mp] of level.movingPlatforms.entries()) {
    surfaces.push({
      x1: mp.x - mp.rangePx,
      x2: mp.x + mp.width + mp.rangePx,
      y: mp.y,
      label: `movingPlatform[${i}]`,
    });
  }

  for (const [i, fp] of level.fallingPlatforms.entries()) {
    surfaces.push({ x1: fp.x, x2: fp.x + fp.width, y: fp.y, label: `fallingPlatform[${i}]` });
  }

  return surfaces;
}

/** Horizontal distance between two spans; 0 when they overlap. */
function horizontalGap(a: Surface, b: Surface): number {
  if (a.x2 >= b.x1 && b.x2 >= a.x1) return 0;
  return a.x2 < b.x1 ? b.x1 - a.x2 : a.x1 - b.x2;
}

export function canReach(from: Surface, to: Surface, limits: JumpLimits = JUMP_LIMITS): boolean {
  const rise = from.y - to.y; // y grows downward, so positive means `to` is higher
  if (rise >= maxJumpHeight(limits)) return false;

  const gap = horizontalGap(from, to);
  return gap <= maxHorizontalReach(rise, limits) * limits.safetyFactor;
}

function surfaceUnder(x: number, y: number, surfaces: Surface[]): Surface | null {
  const candidates = surfaces
    .filter((s) => x >= s.x1 - 8 && x <= s.x2 + 8 && s.y >= y - 8)
    .sort((a, b) => a.y - b.y);
  return candidates[0] ?? null;
}

/**
 * Every surface reachable from the player's spawn by jumping, as a breadth-first flood.
 * A conservative model: if this says the goal is reachable it genuinely is.
 */
export function reachableSurfaces(level: LevelData, limits: JumpLimits = JUMP_LIMITS): Set<Surface> {
  return floodFrom(levelSurfaces(level), level, limits);
}

/**
 * Flood-fills reachability across one shared surface array.
 *
 * Callers must pass the *same* array they compare results against: the returned Set holds
 * object references, so rebuilding the surfaces separately would make every lookup miss.
 */
function floodFrom(surfaces: Surface[], level: LevelData, limits: JumpLimits): Set<Surface> {
  const start = surfaceUnder(level.playerStart.x, level.playerStart.y, surfaces);
  const reached = new Set<Surface>();
  if (!start) return reached;

  const queue: Surface[] = [start];
  reached.add(start);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of surfaces) {
      if (reached.has(next)) continue;
      if (canReach(current, next, limits)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  return reached;
}

/**
 * Structural and playability problems with a level. An empty list means the level can actually
 * be completed: the player spawns on solid ground and the exit is reachable by jumping.
 */
export function validateLevel(level: LevelData, limits: JumpLimits = JUMP_LIMITS): string[] {
  const errors: string[] = [];
  const surfaces = levelSurfaces(level);

  const start = surfaceUnder(level.playerStart.x, level.playerStart.y, surfaces);
  if (!start) errors.push(`${level.id}: playerStart is not above any platform (player would spawn in a pit)`);

  const goalSurface = surfaceUnder(level.goal.x, level.goal.y, surfaces);
  if (!goalSurface) errors.push(`${level.id}: goal is not above any platform`);

  if (start && goalSurface) {
    // Same `surfaces` array the lookups above used, so reference lookups are meaningful.
    const reached = floodFrom(surfaces, level, limits);
    if (!reached.has(goalSurface)) {
      errors.push(`${level.id}: goal platform is not reachable from the player's spawn by jumping`);
    }
    for (const collectible of level.collectibles) {
      const under = surfaceUnder(collectible.x, collectible.y, surfaces);
      if (under && !reached.has(under)) {
        errors.push(`${level.id}: collectible at (${collectible.x}, ${collectible.y}) sits on an unreachable platform`);
      }
    }

    // The trophy unlocks the exit, so an unreachable trophy makes the level unwinnable — a
    // strictly worse failure than an unreachable bonus gem.
    const trophySurface = surfaceUnder(level.trophy.x, level.trophy.y, surfaces);
    if (!trophySurface) {
      errors.push(`${level.id}: trophy at (${level.trophy.x}, ${level.trophy.y}) is not above any platform`);
    } else if (!reached.has(trophySurface)) {
      errors.push(`${level.id}: trophy is unreachable, so the exit could never be unlocked`);
    }
  }

  if (!level.trophy) {
    errors.push(`${level.id}: has no trophy, so the exit door could never be unlocked`);
  }

  const withinBounds = (x: number, y: number, what: string) => {
    if (x < 0 || x > level.widthPx || y < 0 || y > level.heightPx) {
      errors.push(`${level.id}: ${what} at (${x}, ${y}) is outside the level bounds`);
    }
  };
  for (const [i, e] of level.enemies.entries()) withinBounds(e.x, e.y, `enemy[${i}]`);
  for (const [i, h] of level.hazards.entries()) withinBounds(h.x, h.y, `hazard[${i}]`);
  for (const [i, c] of level.collectibles.entries()) withinBounds(c.x, c.y, `collectible[${i}]`);
  for (const [i, p] of (level.weaponPickups ?? []).entries()) withinBounds(p.x, p.y, `weaponPickup[${i}]`);

  if (level.collectibles.length === 0) errors.push(`${level.id}: has no collectibles`);

  return errors;
}

/**
 * A rough difficulty score used to check the campaign ramps up rather than jumping around.
 * Difficulty comes from geometry and pressure, not from one dial being turned up.
 */
export function difficultyScore(level: LevelData): number {
  const surfaces = levelSurfaces(level);
  const avgPlatformWidth =
    surfaces.reduce((sum, s) => sum + (s.x2 - s.x1), 0) / Math.max(1, surfaces.length);

  return Math.round(
    level.hazards.length * 3 +
      level.enemies.length * 5 +
      level.movingPlatforms.length * 4 +
      level.fallingPlatforms.length * 4 +
      // Narrow footing is harder; 300px-wide ledges are forgiving, 60px ones are not.
      Math.max(0, 300 - avgPlatformWidth) / 10,
  );
}
