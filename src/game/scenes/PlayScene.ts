import Phaser from 'phaser';
import { Player } from '../entities/Player';
import type { MoveInput } from '../../utils/physics';

export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private ground!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super('Play');
  }

  create(): void {
    this.physics.world.gravity.y = 0; // gravity is applied manually in Player.update
    this.ground = this.physics.add.staticGroup();
    const groundRect = this.add.rectangle(480, 520, 960, 40, 0x333344);
    this.physics.add.existing(groundRect, true);
    this.ground.add(groundRect);

    this.player = new Player(this, 100, 400);
    this.physics.add.collider(this.player.sprite, this.ground);

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
  }
}

