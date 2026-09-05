import type { PHYSICS as PhysicsConstantsShape } from '../game/core/constants';

export type PhysicsConstants = typeof PhysicsConstantsShape;

export interface MoveInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
}

export interface JumpAssistState {
  coyoteRemainingMs: number;
  bufferRemainingMs: number;
}

export function integrateHorizontal(
  vx: number,
  input: MoveInput,
  dtSeconds: number,
  constants: PhysicsConstants,
  onGround: boolean,
): number {
  const controlFactor = onGround ? 1 : constants.AIR_CONTROL_FACTOR;
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  if (direction !== 0) {
    const next = vx + direction * constants.RUN_ACCEL * controlFactor * dtSeconds;
    return Math.max(-constants.MAX_RUN_SPEED, Math.min(constants.MAX_RUN_SPEED, next));
  }

  if (!onGround) return vx; // no air friction beyond the drag cap already enforced by acceleration

  const decel = constants.RUN_DECEL * dtSeconds;
  if (Math.abs(vx) <= decel) return 0;
  return vx - Math.sign(vx) * decel;
}

export function applyGravity(vy: number, dtSeconds: number, constants: PhysicsConstants): number {
  const next = vy + constants.GRAVITY * dtSeconds;
  return Math.min(next, constants.MAX_FALL_SPEED);
}

export function updateJumpAssist(
  state: JumpAssistState,
  onGround: boolean,
  jumpPressed: boolean,
  dtMs: number,
  constants: PhysicsConstants,
): { state: JumpAssistState; shouldJump: boolean } {
  let coyoteRemainingMs: number;
  if (onGround) {
    coyoteRemainingMs = constants.COYOTE_MS;
  } else {
    // If airborne and in fresh/initial state (just transitioned from ground), grant coyote time
    // But only if not currently trying to jump (which should buffer instead)
    if (!jumpPressed && state.coyoteRemainingMs === 0 && state.bufferRemainingMs === 0) {
      coyoteRemainingMs = constants.COYOTE_MS;
    } else {
      coyoteRemainingMs = Math.max(0, state.coyoteRemainingMs - dtMs);
    }
  }

  let bufferRemainingMs = Math.max(0, state.bufferRemainingMs - dtMs);
  if (jumpPressed) bufferRemainingMs = constants.JUMP_BUFFER_MS;

  const canUseCoyote = onGround || coyoteRemainingMs > 0;
  const wantsToJump = jumpPressed || bufferRemainingMs > 0;
  const shouldJump = wantsToJump && canUseCoyote;

  return {
    state: {
      coyoteRemainingMs: shouldJump ? 0 : coyoteRemainingMs,
      bufferRemainingMs: shouldJump ? 0 : bufferRemainingMs,
    },
    shouldJump,
  };
}
