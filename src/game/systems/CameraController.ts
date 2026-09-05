import Phaser from 'phaser';

export interface CameraBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CameraController {
  private camera!: Phaser.Cameras.Scene2D.Camera;

  attach(camera: Phaser.Cameras.Scene2D.Camera, target: Phaser.GameObjects.GameObject, bounds: CameraBounds): void {
    this.camera = camera;
    camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    camera.startFollow(target, true, 0.12, 0.12); // smooth interpolation (lerp)
    camera.setDeadzone(80, 40);
    camera.setFollowOffset(0, -20); // slight look-ahead upward for jump readability
  }

  shake(durationMs = 150, intensity = 0.006): void {
    this.camera.shake(durationMs, intensity);
  }
}
