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
};

// v^2 = 2 * g * h form solved for the launch velocity that reaches apex in JUMP_APEX_SECONDS:
// v = g * t
export const JUMP_VELOCITY = PHYSICS.GRAVITY * PHYSICS.JUMP_APEX_SECONDS;
