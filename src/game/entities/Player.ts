import Phaser from 'phaser';
import { PHYSICS, JUMP_VELOCITY } from '../core/constants';
import { integrateHorizontal, applyGravity, updateJumpAssist, type MoveInput, type JumpAssistState } from '../../utils/physics';

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private jumpAssist: JumpAssistState = { coyoteRemainingMs: 0, bufferRemainingMs: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, '__WHITE');
    this.sprite.setDisplaySize(24, 32);
    this.sprite.setTint(0x4ade80);
    this.sprite.setDamping(false);
    this.sprite.setMaxVelocity(PHYSICS.MAX_RUN_SPEED, PHYSICS.MAX_FALL_SPEED);
    // Arcade Body.setSize() treats its args as "source" dims and re-multiplies by the
    // GameObject's current scale every frame (Phaser Body.js setSize/preUpdate) — since
    // setDisplaySize(24,32) on the 4x4 '__WHITE' texture already set scale to (6,8), the
    // desired final body size must be pre-divided by that scale or it balloons to 120x240.
    (this.sprite.body as Phaser.Physics.Arcade.Body).setSize(20 / this.sprite.scaleX, 30 / this.sprite.scaleY);
  }

  get isOnGround(): boolean {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  update(dtMs: number, input: MoveInput): void {
    const dtSeconds = dtMs / 1000;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    const vx = integrateHorizontal(body.velocity.x, input, dtSeconds, PHYSICS, this.isOnGround);
    const vy = applyGravity(body.velocity.y, dtSeconds, PHYSICS);
    this.sprite.setVelocity(vx, vy);

    const { state, shouldJump } = updateJumpAssist(this.jumpAssist, this.isOnGround, input.jumpPressed, dtMs, PHYSICS);
    this.jumpAssist = state;
    if (shouldJump) this.sprite.setVelocityY(-JUMP_VELOCITY);

    if (input.right) this.sprite.setFlipX(false);
    else if (input.left) this.sprite.setFlipX(true);
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
  }
}
