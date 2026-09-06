import Phaser from 'phaser';
import { PHYSICS, JUMP_VELOCITY } from '../core/constants';
import { integrateHorizontal, applyGravity, updateJumpAssist, type MoveInput, type JumpAssistState } from '../../utils/physics';
import { PlayerAnimator, type PlayerAnimState } from './PlayerAnimator';
import { computeHitboxGeometry, type HitboxConfig } from '../../utils/hitbox';

/**
 * The player's collision box, in world pixels. This is gameplay and must stay constant no
 * matter how the sprite is rendered, animated or themed.
 */
const HITBOX: HitboxConfig = {
  textureWidth: 72,
  textureHeight: 96,
  hitboxWidth: 20,
  hitboxHeight: 30,
  feetOffsetY: 16,
};

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
    
    this.animator = new PlayerAnimator(scene, this.sprite);
    this.syncHitbox();
  }

  /**
   * Re-derives the physics body from the sprite's *current* render scale so the world-space
   * hitbox stays exactly HITBOX, frame after frame.
   *
   * Arcade sizes a body as `sourceSize × sprite scale`, so the animator's squash/stretch and
   * idle-breathing tweens were silently resizing the collision box — and because the classic
   * theme disables those tweens, the two presentation modes ended up colliding differently.
   * Recomputing here decouples collision from presentation entirely: animation and themes can
   * scale the sprite however they like without touching gameplay.
   */
  private syncHitbox(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    // Refresh the body's cached sprite scale FIRST. Arcade computes a body's world size as
    // `sourceSize × cachedScale`, and that cache is stale (1) until Phaser next updates the
    // body — which left the player with a 3x oversized hitbox for the first frames of every
    // level, long enough to die to a hazard near the spawn.
    body.updateBounds();

    const { sizeWidth, sizeHeight, offsetX, offsetY } = computeHitboxGeometry(
      this.sprite.scaleX,
      this.sprite.scaleY,
      HITBOX,
    );
    body.setSize(sizeWidth, sizeHeight, false);
    body.setOffset(offsetX, offsetY);
  }

  get isOnGround(): boolean {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  update(dtMs: number, input: MoveInput): { jumped: boolean } {
    const dtSeconds = dtMs / 1000;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    // Cosmetic tweens change the sprite's scale between frames; re-assert the hitbox first so
    // this frame's movement and collisions run against the correct, constant box.
    this.syncHitbox();

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

  /** Re-applies the player's texture for the active presentation mode. Visual-only. */
  refreshSkin(): void {
    this.animator.refreshSkin();
  }

  /**
   * Visual kickback when firing. Deliberately does not touch velocity — recoil that actually
   * moved Dave would change platforming distances, and shooting must not alter movement.
   */
  recoil(facingLeft: boolean): void {
    this.animator.playRecoil(facingLeft);
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
  }
}
