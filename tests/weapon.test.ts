import { describe, it, expect } from 'vitest';
import {
  createWeaponState,
  pickUpWeapon,
  canFire,
  projectileVelocityX,
  hasExceededRange,
  MAX_CONCURRENT_SHOTS,
} from '../src/utils/weapon';

describe('weapon state', () => {
  it('starts unarmed — Dave must find the gun first, as in the original', () => {
    expect(createWeaponState().hasGun).toBe(false);
  });

  it('is armed after picking the gun up', () => {
    expect(pickUpWeapon(createWeaponState()).hasGun).toBe(true);
  });

  it('picking up a second gun changes nothing', () => {
    const armed = pickUpWeapon(createWeaponState());
    expect(pickUpWeapon(armed)).toEqual(armed);
  });
});

describe('canFire', () => {
  it('refuses to fire while unarmed', () => {
    expect(canFire(createWeaponState(), 0)).toBe(false);
  });

  it('fires when armed with no shot in flight', () => {
    expect(canFire(pickUpWeapon(createWeaponState()), 0)).toBe(true);
  });

  it('allows only one shot on screen at a time (the classic constraint)', () => {
    const armed = pickUpWeapon(createWeaponState());
    expect(MAX_CONCURRENT_SHOTS).toBe(1);
    expect(canFire(armed, MAX_CONCURRENT_SHOTS)).toBe(false);
  });

  it('can fire again once the previous shot is gone', () => {
    const armed = pickUpWeapon(createWeaponState());
    expect(canFire(armed, 0)).toBe(true);
  });
});

describe('hasExceededRange', () => {
  it('is false while the shot is still within range', () => {
    expect(hasExceededRange(100, 400, 640)).toBe(false);
  });

  it('is true once the shot has travelled its full range', () => {
    // Without this the gun stays locked until the shot exits the whole level — several
    // seconds on a wide level — which makes firing feel broken.
    expect(hasExceededRange(100, 800, 640)).toBe(true);
  });

  it('measures distance travelled, not direction', () => {
    expect(hasExceededRange(1000, 300, 640)).toBe(true);
    expect(hasExceededRange(1000, 700, 640)).toBe(false);
  });
});

describe('projectileVelocityX', () => {
  it('travels right when facing right', () => {
    expect(projectileVelocityX(false, 480)).toBe(480);
  });

  it('travels left when facing left', () => {
    expect(projectileVelocityX(true, 480)).toBe(-480);
  });
});
