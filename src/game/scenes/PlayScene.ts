import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { MovingPlatform } from '../entities/MovingPlatform';
import { CameraController } from '../systems/CameraController';
import type { MoveInput } from '../../utils/physics';

export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private movingPlatform!: MovingPlatform;
  private movingPlatformGroup!: Phaser.Physics.Arcade.Group;
  private cameraController!: CameraController;

  constructor() {
    super('Play');
  }

  create(): void {
    this.physics.world.gravity.y = 0; // gravity is applied manually in Player.update
    this.ground = this.physics.add.staticGroup();
    const groundRect = this.add.rectangle(960, 520, 1920, 40, 0x333344);
    this.physics.add.existing(groundRect, true);
    this.ground.add(groundRect);

    this.movingPlatformGroup = this.physics.add.group();
    this.movingPlatform = new MovingPlatform(this, 300, 350, 80, 100, 100);
    this.movingPlatformGroup.add(this.movingPlatform.sprite);

    this.player = new Player(this, 100, 400);
    this.physics.add.collider(this.player.sprite, this.ground);
    this.physics.add.collider(this.player.sprite, this.movingPlatformGroup);

    this.cameraController = new CameraController();
    this.cameraController.attach(this.cameras.main, this.player.sprite, { x: 0, y: 0, width: 1920, height: 540 });

    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  update(_time: number, delta: number): void {
    const input: MoveInput = {
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.cursors.up),
      jumpHeld: this.cursors.up.isDown,
    };
    this.player.update(delta, input);
    this.movingPlatform.update(delta);
  }
}

