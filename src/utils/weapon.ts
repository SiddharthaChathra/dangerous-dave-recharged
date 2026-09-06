export interface WeaponState {
  hasGun: boolean;
}

/**
 * Only one shot may be in flight at a time. This is the original game's constraint and it is
 * what gives shooting its rhythm: you commit to a shot and wait for it to land or expire,
 * rather than spraying. It also caps the per-frame cost of projectile collision checks.
 */
export const MAX_CONCURRENT_SHOTS = 1;

export function createWeaponState(hasGun = false): WeaponState {
  return { hasGun };
}

export function pickUpWeapon(state: WeaponState): WeaponState {
  return state.hasGun ? state : { ...state, hasGun: true };
}

export function canFire(state: WeaponState, activeShots: number): boolean {
  return state.hasGun && activeShots < MAX_CONCURRENT_SHOTS;
}

export function projectileVelocityX(facingLeft: boolean, speed: number): number {
  return facingLeft ? -speed : speed;
}

/**
 * True once a shot has travelled its maximum range and should be reaped.
 *
 * Range is capped at roughly a screen width rather than the level's edge: with only one shot
 * allowed at a time, waiting for a miss to cross an entire 2400px level would leave the gun
 * unusable for several seconds. Firing off-screen and immediately being able to fire again is
 * the original game's behaviour.
 */
export function hasExceededRange(spawnX: number, currentX: number, maxRangePx: number): boolean {
  return Math.abs(currentX - spawnX) >= maxRangePx;
}
