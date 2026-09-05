import Phaser from 'phaser';
import { PHYSICS, JUMP_VELOCITY } from '../core/constants';
import { integrateHorizontal, applyGravity, updateJumpAssist, type MoveInput, type JumpAssistState } from '../../utils/physics';
import { PlayerAnimator, type PlayerAnimState } from './PlayerAnimator';

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private jumpAssist: JumpAssistState = { coyoteRemainingMs: 0, bufferRemainingMs: 0 };
  private readonly animator: PlayerAnimator;
  private wasOnGround = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player_idle');
    this.sprite.setTint(0xffffff); // Clear any tint from old implementation
    this.sprite.setDamping(false);
    this.sprite.setMaxVelocity(PHYSICS.MAX_RUN_SPEED, PHYSICS.MAX_FALL_SPEED);
    
    // The sprite texture is 72x96 but we scaled it by 0.333 in the animator (so it displays as 24x32).
    // Phaser 3.60+ Arcade physics body size uses unscaled dimensions. 
    // We want a 20x30 collision box in world space.
    // If the sprite scale is 0.333, unscaled size needed is 20 / 0.333 = 60, and 30 / 0.333 = 90.
    const unscaledW = 20 / 0.333;
    const unscaledH = 30 / 0.333;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(unscaledW, unscaledH);
    // Offset slightly so it's centered in the 72x96 texture
    body.setOffset((72 - unscaledW) / 2, 96 - unscaledH);

    this.animator = new PlayerAnimator(scene, this.sprite);
  }

  get isOnGround(): boolean {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  update(dtMs: number, input: MoveInput): { jumped: boolean } {
    const dtSeconds = dtMs / 1000;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    const onGround = this.isOnGround;

    // Trigger land animation if we just touched ground
    if (onGround && !this.wasOnGround && body.velocity.y >= 0) {
      this.animator.playLandAnim();
      // Particles for landing can be emitted via EventBus or directly in PlayScene
      this.sprite.scene.events.emit('player:landed', this.sprite.x, this.sprite.y + 16);
    }
    this.wasOnGround = onGround;

    const vx = integrateHorizontal(body.velocity.x, input, dtSeconds, PHYSICS, onGround);
    const vy = applyGravity(body.velocity.y, dtSeconds, PHYSICS);
    this.sprite.setVelocity(vx, vy);

    const { state, shouldJump } = updateJumpAssist(this.jumpAssist, onGround, input.jumpPressed, dtMs, PHYSICS);
    this.jumpAssist = state;
    if (shouldJump) {
      this.sprite.setVelocityY(-JUMP_VELOCITY);
      this.sprite.scene.events.emit('player:jumped', this.sprite.x, this.sprite.y + 16);
    }

    if (input.right) this.sprite.setFlipX(false);
    else if (input.left) this.sprite.setFlipX(true);

    const currentVelocity = body.velocity;
    let animState: PlayerAnimState;
    if (currentVelocity.y < -20) animState = 'jump';
    else if (currentVelocity.y > 20 && !onGround) animState = 'fall';
    else if (onGround && Math.abs(currentVelocity.x) > 10) animState = 'run';
    else animState = 'idle';
    this.animator.update(dtMs, animState);

    return { jumped: shouldJump };
  }

  playHurt(): void {
    this.animator.update(0, 'hurt');
  }

  playDeath(): void {
    this.animator.update(0, 'death');
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
  }
}
