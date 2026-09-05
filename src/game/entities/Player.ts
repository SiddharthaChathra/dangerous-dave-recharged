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
    (this.sprite.body as Phaser.Physics.Arcade.Body).setSize(20, 30);
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
