import Phaser from 'phaser';

export interface CameraBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Gameplay camera.
 *
 * Beyond smooth follow + deadzone, the camera actively responds to how the player is
 * moving: it looks further ahead the faster they run, dips on landing impacts, shakes on
 * damage, and pushes in for level completion. All of it is subtle and time-based so it
 * reads as weight rather than motion sickness.
 */
export class CameraController {
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private lookAhead = 0;
  private reducedMotion = false;

  /** Horizontal look-ahead in px at full run speed. */
  private static readonly MAX_LOOK_AHEAD = 90;

  attach(camera: Phaser.Cameras.Scene2D.Camera, target: Phaser.GameObjects.GameObject, bounds: CameraBounds): void {
    this.camera = camera;
    camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    camera.startFollow(target, true, 0.12, 0.12); // smooth interpolation (lerp)
    camera.setDeadzone(80, 40);
    camera.setFollowOffset(0, -20); // slight upward bias for jump readability
    this.lookAhead = 0;
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  /**
   * Eases the camera's horizontal offset toward the direction of travel, proportional to
   * speed, so running fast reveals more of what's coming.
   */
  update(velocityX: number, maxSpeed: number, dtMs: number): void {
    if (!this.camera) return;
    if (this.reducedMotion) {
      this.camera.setFollowOffset(0, -20);
      return;
    }
    const normalized = Phaser.Math.Clamp(velocityX / Math.max(1, maxSpeed), -1, 1);
    const target = -normalized * CameraController.MAX_LOOK_AHEAD;
    // Frame-rate independent easing toward the target offset.
    const t = 1 - Math.pow(0.001, dtMs / 1000);
    this.lookAhead += (target - this.lookAhead) * t;
    this.camera.setFollowOffset(this.lookAhead, -20);
  }

  shake(durationMs = 150, intensity = 0.006): void {
    if (this.reducedMotion) return;
    this.camera.shake(durationMs, intensity);
  }

  /** Small vertical kick when the player lands, scaled by fall speed. */
  landingImpact(fallSpeed: number, maxFallSpeed: number): void {
    if (this.reducedMotion || !this.camera) return;
    const strength = Phaser.Math.Clamp(fallSpeed / Math.max(1, maxFallSpeed), 0, 1);
    if (strength < 0.35) return; // ignore gentle step-downs
    this.camera.shake(110, 0.002 + strength * 0.004);
  }

  /** Brief push-in used when a level is completed. */
  celebrate(): void {
    if (!this.camera) return;
    if (this.reducedMotion) return;
    this.camera.zoomTo(1.12, 420, 'Sine.easeInOut');
  }

  /** Fades the view in at level start so entering a level feels deliberate. */
  introFade(durationMs = 420): void {
    if (!this.camera) return;
    this.camera.fadeIn(durationMs, 0, 0, 0);
  }
}
