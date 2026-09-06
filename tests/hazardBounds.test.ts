import { describe, it, expect } from 'vitest';
import { computeHazardDamageBox, HAZARD_INSET } from '../src/utils/hazardBounds';

const visual = { x: 100, y: 400, width: 200, height: 40 };

describe('computeHazardDamageBox', () => {
  it('is strictly smaller than the hazard it is drawn as', () => {
    // Spikes are drawn with pointed tips and gaps; damaging on the full bounding rectangle is
    // what makes a hazard kill you for touching visually empty air.
    const box = computeHazardDamageBox(visual, HAZARD_INSET);
    expect(box.width).toBeLessThan(visual.width);
    expect(box.height).toBeLessThan(visual.height);
  });

  it('stays centred horizontally within the hazard', () => {
    const box = computeHazardDamageBox(visual, HAZARD_INSET);
    expect(box.x + box.width / 2).toBeCloseTo(visual.x + visual.width / 2, 6);
  });

  it('keeps the damage area flush with the hazard base, insetting only from the top', () => {
    // The dangerous mass sits at the bottom; a player brushing the tips should survive, but
    // one standing in the spikes must not be able to hide in an inset gap at floor level.
    const box = computeHazardDamageBox(visual, HAZARD_INSET);
    expect(box.y + box.height).toBeCloseTo(visual.y + visual.height, 6);
    expect(box.y).toBeGreaterThan(visual.y);
  });

  it('never collapses to nothing on a very thin hazard', () => {
    const thin = { x: 0, y: 0, width: 8, height: 6 };
    const box = computeHazardDamageBox(thin, HAZARD_INSET);
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  it('a graze at the hazard\'s outer edge no longer overlaps the damage area', () => {
    const box = computeHazardDamageBox(visual, HAZARD_INSET);
    const playerAtLeftEdge = { left: visual.x - 10, right: visual.x + 2 };
    expect(playerAtLeftEdge.right).toBeLessThan(box.x);
  });
});
