import { describe, it, expect } from 'vitest';
import {
  walkPose,
  stepFrequencyHz,
  stepLengthFor,
  LEG_LENGTH_RATIO,
} from '../src/game/systems/walkCycle';

describe('step frequency', () => {
  it('is distance divided by stride, so the feet cannot slide', () => {
    // The anti-slide law. If cadence is ever set independently of speed, the character
    // moonwalks; deriving it here is what keeps each foot planted while it is on the ground.
    expect(stepFrequencyHz(190, 95)).toBeCloseTo(2);
    expect(stepFrequencyHz(100, 50)).toBeCloseTo(2);
  });

  it('doubles when the walker moves twice as fast', () => {
    const slow = stepFrequencyHz(80, 40);
    const fast = stepFrequencyHz(160, 40);
    expect(fast).toBeCloseTo(slow * 2);
  });

  it('never divides by a zero stride', () => {
    expect(Number.isFinite(stepFrequencyHz(190, 0))).toBe(true);
  });

  it('scales the stride with the size of the walker', () => {
    expect(stepLengthFor(120)).toBeGreaterThan(stepLengthFor(60));
  });

  it('measures the stride as the gap the rig actually opens between the feet', () => {
    // The anti-slide law is only worth anything if the stride it divides by is the one the
    // legs really make. Derived from the same leg length and swing the pose uses, so the
    // two can never drift apart.
    const height = 140;
    const legLength = height * LEG_LENGTH_RATIO;
    const pose = walkPose(0.25);
    const expected = legLength * Math.sin(pose.leftThigh) - legLength * Math.sin(pose.rightThigh);
    expect(stepLengthFor(height)).toBeCloseTo(expected, 5);
  });
});

describe('walk pose', () => {
  it('repeats exactly once per cycle', () => {
    expect(walkPose(1)).toEqual(walkPose(0));
    expect(walkPose(2.25)).toEqual(walkPose(0.25));
  });

  it('swings the legs in opposition', () => {
    // Both legs forward at once is the classic broken-rig look.
    for (const p of [0, 0.1, 0.25, 0.4, 0.6]) {
      expect(walkPose(p).rightThigh).toBeCloseTo(walkPose(p + 0.5).leftThigh);
    }
  });

  it('reaches full stride with the legs apart', () => {
    const pose = walkPose(0.25);
    expect(pose.leftThigh).toBeGreaterThan(0.2);
    expect(pose.rightThigh).toBeLessThan(-0.2);
  });

  it('swings each arm opposite the leg on the same side', () => {
    // Contralateral swing. Same-side arm and leg moving together reads as a marching toy.
    const pose = walkPose(0.25);
    expect(Math.sign(pose.leftArm)).toBe(-Math.sign(pose.leftThigh));
    expect(Math.sign(pose.rightArm)).toBe(-Math.sign(pose.rightThigh));
  });

  it('only ever bends knees backwards', () => {
    for (let p = 0; p < 1; p += 0.05) {
      expect(walkPose(p).leftKnee).toBeGreaterThanOrEqual(0);
      expect(walkPose(p).rightKnee).toBeGreaterThanOrEqual(0);
    }
  });

  it('bends the knee of the leg that is swinging through, not the one bearing weight', () => {
    // Mid-swing (phase 0) the left leg is passing under the body and must be bent to clear
    // the floor; at full forward stride it is straight and taking weight.
    expect(walkPose(0).leftKnee).toBeGreaterThan(walkPose(0.25).leftKnee);
  });

  it('bobs the body twice per cycle, dipping when the legs are apart', () => {
    const apart = walkPose(0.25).bodyBobY;
    const together = walkPose(0).bodyBobY;
    expect(apart).toBeGreaterThan(together); // y grows downward
    expect(walkPose(0.75).bodyBobY).toBeCloseTo(apart);
  });

  it('keeps the bob small enough that the walker stays grounded', () => {
    for (let p = 0; p < 1; p += 0.05) {
      expect(Math.abs(walkPose(p).bodyBobY)).toBeLessThanOrEqual(1);
    }
  });
});
