export interface AABB {
  x: number; // top-left
  y: number;
  width: number;
  height: number;
}

export interface IntersectResult {
  collided: boolean;
  overlapX: number;
  overlapY: number;
}

export function intersectAABB(a: AABB, b: AABB): IntersectResult {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return { collided: overlapX > 0 && overlapY > 0, overlapX: Math.max(0, overlapX), overlapY: Math.max(0, overlapY) };
}

export interface ResolveResult {
  x: number;
  y: number;
  vx: number;
  vy: number;
  landedOnTop: boolean;
  hitCeiling: boolean;
  hitWall: boolean;
}

export function resolveAABBCollision(
  moving: AABB,
  velocity: { vx: number; vy: number },
  staticBox: AABB,
): ResolveResult {
  const { collided, overlapX, overlapY } = intersectAABB(moving, staticBox);
  if (!collided) {
    return { x: moving.x, y: moving.y, vx: velocity.vx, vy: velocity.vy, landedOnTop: false, hitCeiling: false, hitWall: false };
  }

  // Resolve along the axis of least penetration.
  if (overlapX < overlapY) {
    const movingCenter = moving.x + moving.width / 2;
    const staticCenter = staticBox.x + staticBox.width / 2;
    const pushLeft = movingCenter < staticCenter;
    const x = pushLeft ? staticBox.x - moving.width : staticBox.x + staticBox.width;
    return { x, y: moving.y, vx: 0, vy: velocity.vy, landedOnTop: false, hitCeiling: false, hitWall: true };
  }

  const movingCenterY = moving.y + moving.height / 2;
  const staticCenterY = staticBox.y + staticBox.height / 2;
  const pushUp = movingCenterY < staticCenterY;
  if (pushUp) {
    return {
      x: moving.x,
      y: staticBox.y - moving.height,
      vx: velocity.vx,
      vy: 0,
      landedOnTop: true,
      hitCeiling: false,
      hitWall: false,
    };
  }
  return {
    x: moving.x,
    y: staticBox.y + staticBox.height,
    vx: velocity.vx,
    vy: 0,
    landedOnTop: false,
    hitCeiling: true,
    hitWall: false,
  };
}
