import { describe, it, expect } from 'vitest';
import { PHYSICS, JUMP_VELOCITY } from '../src/game/core/constants';
import {
  integrateHorizontal,
  applyGravity,
  updateJumpAssist,
  clampDelta,
  hasFallenOutOfBounds,
  type MoveInput,
  type JumpAssistState,
} from '../src/utils/physics';

const noInput: MoveInput = { left: false, right: false, jumpPressed: false, jumpHeld: false };

describe('integrateHorizontal', () => {
  it('accelerates toward max speed when holding right', () => {
    const input: MoveInput = { ...noInput, right: true };
    const vx = integrateHorizontal(0, input, 0.1, PHYSICS, true);
    expect(vx).toBeCloseTo(180, 0); // 1800 px/s^2 * 0.1s
    expect(vx).toBeLessThanOrEqual(PHYSICS.MAX_RUN_SPEED);
  });

  it('never exceeds MAX_RUN_SPEED', () => {
    const input: MoveInput = { ...noInput, right: true };
    let vx = 0;
    for (let i = 0; i < 100; i++) vx = integrateHorizontal(vx, input, 0.1, PHYSICS, true);
    expect(vx).toBeLessThanOrEqual(PHYSICS.MAX_RUN_SPEED);
  });

  it('decelerates to zero when no input is held on the ground', () => {
    const vx = integrateHorizontal(100, noInput, 1, PHYSICS, true);
    expect(vx).toBe(0);
  });

  it('applies reduced acceleration in the air', () => {
    const input: MoveInput = { ...noInput, right: true };
    const grounded = integrateHorizontal(0, input, 0.1, PHYSICS, true);
    const airborne = integrateHorizontal(0, input, 0.1, PHYSICS, false);
    expect(airborne).toBeLessThan(grounded);
    expect(airborne).toBeCloseTo(grounded * PHYSICS.AIR_CONTROL_FACTOR, 1);
  });
});

describe('applyGravity', () => {
  it('increases downward velocity over time', () => {
    const vy = applyGravity(0, 0.1, PHYSICS);
    expect(vy).toBeCloseTo(140, 0); // 1400 px/s^2 * 0.1s
  });

  it('caps at MAX_FALL_SPEED', () => {
    const vy = applyGravity(10000, 1, PHYSICS);
    expect(vy).toBe(PHYSICS.MAX_FALL_SPEED);
  });
});

describe('updateJumpAssist', () => {
  const freshState: JumpAssistState = { coyoteRemainingMs: 0, bufferRemainingMs: 0 };

  it('allows a jump while grounded and jump is pressed', () => {
    const { shouldJump } = updateJumpAssist(freshState, true, true, 16, PHYSICS);
    expect(shouldJump).toBe(true);
  });

  it('allows a jump shortly after leaving the ground (coyote time)', () => {
    const grounded = updateJumpAssist(freshState, true, false, 16, PHYSICS).state; // seed: was on ground
    const airborneJustLeft = updateJumpAssist(grounded, false, false, 0, PHYSICS).state; // left ground this frame
    const { shouldJump } = updateJumpAssist(airborneJustLeft, false, true, 50, PHYSICS);
    expect(shouldJump).toBe(true);
  });

  it('rejects a jump once coyote time has fully elapsed', () => {
    let state = updateJumpAssist(freshState, false, false, 0, PHYSICS).state;
    state = updateJumpAssist(state, false, false, PHYSICS.COYOTE_MS + 10, PHYSICS).state;
    const { shouldJump } = updateJumpAssist(state, false, true, 1, PHYSICS);
    expect(shouldJump).toBe(false);
  });

  it('buffers a jump pressed just before landing', () => {
    const state = updateJumpAssist(freshState, false, true, 0, PHYSICS).state; // press while airborne, not grounded
    const result = updateJumpAssist(state, true, false, 50, PHYSICS); // lands within buffer window
    expect(result.shouldJump).toBe(true);
  });

  it('does not buffer a jump pressed too long before landing', () => {
    let state = updateJumpAssist(freshState, false, true, 0, PHYSICS).state;
    state = updateJumpAssist(state, false, false, PHYSICS.JUMP_BUFFER_MS + 10, PHYSICS).state;
    const result = updateJumpAssist(state, true, false, 1, PHYSICS);
    expect(result.shouldJump).toBe(false);
  });
});

describe('clampDelta', () => {
  it('passes through a normal frame delta unchanged', () => {
    expect(clampDelta(16.67, 50)).toBeCloseTo(16.67, 2);
  });

  it('caps a large delta spike (e.g. tab-switch stall) to the max, preventing tunneling through thin hazards', () => {
    expect(clampDelta(400, 50)).toBe(50);
  });
});

describe('hasFallenOutOfBounds', () => {
  it('is false while the player is within the level (even right at the floor)', () => {
    expect(hasFallenOutOfBounds(539, 540, 100)).toBe(false);
    expect(hasFallenOutOfBounds(540, 540, 100)).toBe(false);
  });

  it('is false just past the floor, inside the fall-death margin (e.g. standing on ground that sits below y=0 reference)', () => {
    expect(hasFallenOutOfBounds(600, 540, 100)).toBe(false);
  });

  it('is true once the player has fallen past the level floor by more than the margin (fell into a pit)', () => {
    expect(hasFallenOutOfBounds(641, 540, 100)).toBe(true);
  });
});

it('JUMP_VELOCITY is negative (upward) and reaches configured apex time under gravity', () => {
  expect(JUMP_VELOCITY).toBeGreaterThan(0);
  const framesToApex = JUMP_VELOCITY / (PHYSICS.GRAVITY * (1 / 60)) / 60;
  expect(framesToApex).toBeCloseTo(PHYSICS.JUMP_APEX_SECONDS, 1);
});
