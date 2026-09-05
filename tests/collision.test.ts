import { describe, it, expect } from 'vitest';
import { intersectAABB, resolveAABBCollision, type AABB } from '../src/utils/collision';

describe('intersectAABB', () => {
  it('detects overlap and reports overlap depth on each axis', () => {
    const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
    const b: AABB = { x: 5, y: 5, width: 10, height: 10 };
    const result = intersectAABB(a, b);
    expect(result.collided).toBe(true);
    expect(result.overlapX).toBe(5);
    expect(result.overlapY).toBe(5);
  });

  it('reports no collision for separated boxes', () => {
    const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
    const b: AABB = { x: 20, y: 20, width: 10, height: 10 };
    expect(intersectAABB(a, b).collided).toBe(false);
  });
});

describe('resolveAABBCollision', () => {
  it('lands the moving box on top of a static box when falling', () => {
    const moving: AABB = { x: 0, y: 90, width: 10, height: 10 };
    const staticBox: AABB = { x: 0, y: 95, width: 10, height: 10 };
    const result = resolveAABBCollision(moving, { vx: 0, vy: 50 }, staticBox);
    expect(result.landedOnTop).toBe(true);
    expect(result.y).toBe(85); // pushed up to sit exactly on top of staticBox
    expect(result.vy).toBe(0);
  });

  it('stops upward motion when hitting a ceiling', () => {
    const moving: AABB = { x: 0, y: 10, width: 10, height: 10 };
    const staticBox: AABB = { x: 0, y: 5, width: 10, height: 10 };
    const result = resolveAABBCollision(moving, { vx: 0, vy: -50 }, staticBox);
    expect(result.hitCeiling).toBe(true);
    expect(result.vy).toBe(0);
  });

  it('stops horizontal motion when hitting a wall', () => {
    const moving: AABB = { x: 90, y: 0, width: 10, height: 10 };
    const staticBox: AABB = { x: 95, y: 0, width: 10, height: 10 };
    const result = resolveAABBCollision(moving, { vx: 50, vy: 0 }, staticBox);
    expect(result.hitWall).toBe(true);
    expect(result.vx).toBe(0);
  });
});
