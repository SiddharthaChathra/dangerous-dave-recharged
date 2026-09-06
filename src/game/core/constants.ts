export const SCREEN = {
  WIDTH: 960,
  HEIGHT: 540,
};

export const PHYSICS = {
  RUN_ACCEL: 1800,
  RUN_DECEL: 1600,
  MAX_RUN_SPEED: 220,
  AIR_CONTROL_FACTOR: 0.6,
  GRAVITY: 1400,
  JUMP_APEX_SECONDS: 0.4,
  MAX_FALL_SPEED: 700,
  COYOTE_MS: 100,
  JUMP_BUFFER_MS: 120,
  // Floor of 20fps: caps any single-frame delta spike (tab-switch, GC pause) so physics can't
  // take one huge step that tunnels through thin hazards/platforms.
  MAX_DELTA_MS: 50,
  // Levels have no floor collider, so a player who walks off a ledge with nothing below falls
  // forever. This margin (past the level's bottom edge) is how far they fall before it counts
  // as a death, matching classic Dangerous Dave's fall-into-a-pit hazard.
  FALL_DEATH_MARGIN_PX: 100,
  // Shots outrun the player comfortably so firing reads as instant at arm's length.
  PROJECTILE_SPEED: 520,
  // Spawn offset from the player's centre, so a shot never starts inside Dave's own body.
  MUZZLE_OFFSET_X: 16,
  // Roughly a screen width. With one shot allowed at a time, a miss must expire promptly or
  // the gun feels locked; waiting for the level edge would take seconds on a wide level.
  PROJECTILE_MAX_RANGE_PX: 640,
};

// v^2 = 2 * g * h form solved for the launch velocity that reaches apex in JUMP_APEX_SECONDS:
// v = g * t
export const JUMP_VELOCITY = PHYSICS.GRAVITY * PHYSICS.JUMP_APEX_SECONDS;
