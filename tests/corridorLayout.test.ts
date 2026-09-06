import { describe, it, expect } from 'vitest';
import {
  corridorLayout,
  walkDurationMs,
  MIN_WALK_MS,
  MAX_WALK_MS,
} from '../src/utils/corridorLayout';

describe('corridor layout', () => {
  const layout = corridorLayout(960, 540);

  it('puts the exit door on the left and the next-level door on the right', () => {
    // The whole point of the scene: two doors, and which is which must be unambiguous.
    expect(layout.leftDoorX).toBeLessThan(480);
    expect(layout.rightDoorX).toBeGreaterThan(480);
  });

  it('keeps both doors fully on screen', () => {
    expect(layout.leftDoorX - layout.doorWidth / 2).toBeGreaterThan(0);
    expect(layout.rightDoorX + layout.doorWidth / 2).toBeLessThan(960);
  });

  it('starts the walk at the left door and ends it at the right door', () => {
    expect(layout.walkStartX).toBeCloseTo(layout.leftDoorX, 0);
    expect(layout.walkEndX).toBeCloseTo(layout.rightDoorX, 0);
    expect(layout.walkStartX).toBeLessThan(layout.walkEndX);
  });

  it('stands the doors and the walker on the same floor', () => {
    // A door floating off the floor would break the illusion of a real corridor.
    expect(layout.floorY).toBeGreaterThan(layout.ceilingY);
    expect(layout.doorBaseY).toBeCloseTo(layout.floorY, 0);
  });

  it('places the message clear of the doors and the walker', () => {
    // Requirement: the banner must never overlap the character or either door.
    const walkerTop = layout.floorY - layout.walkerHeight;
    expect(layout.messageY).toBeGreaterThan(layout.floorY);
    expect(layout.messageY).toBeGreaterThan(walkerTop);
  });

  it('renders the walker large enough to read as the subject of the shot', () => {
    expect(layout.walkerHeight).toBeGreaterThan(80);
  });

  it('makes the doorway taller than the walker, so he can walk through it', () => {
    // He enters the right-hand door on his feet. A door shorter than he is would make the
    // exit look like he is squeezing into a cupboard.
    expect(layout.doorHeight).toBeGreaterThan(layout.walkerHeight);
  });

  it('keeps the doorway clear of the ceiling', () => {
    expect(layout.floorY - layout.doorHeight).toBeGreaterThan(layout.ceilingY);
  });
});

describe('walk duration', () => {
  it('takes between two and four seconds on a typical canvas', () => {
    const { walkDistance } = corridorLayout(960, 540);
    const ms = walkDurationMs(walkDistance);
    expect(ms).toBeGreaterThanOrEqual(2000);
    expect(ms).toBeLessThanOrEqual(4000);
  });

  it('takes longer to cross a wider corridor', () => {
    // "Adjust timing based on actual screen width" — a fixed duration would make a wide
    // corridor a sprint and a narrow one a crawl.
    const narrow = walkDurationMs(corridorLayout(700, 540).walkDistance);
    const wide = walkDurationMs(corridorLayout(1400, 540).walkDistance);
    expect(wide).toBeGreaterThan(narrow);
  });

  it('never rushes below the minimum, however narrow the screen', () => {
    expect(walkDurationMs(10)).toBe(MIN_WALK_MS);
    expect(MIN_WALK_MS).toBeGreaterThanOrEqual(2000);
  });

  it('never drags past the maximum, however wide the screen', () => {
    expect(walkDurationMs(100000)).toBe(MAX_WALK_MS);
    expect(MAX_WALK_MS).toBeLessThanOrEqual(4000);
  });
});
