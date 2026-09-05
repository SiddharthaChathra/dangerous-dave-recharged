import Phaser from 'phaser';
import { CameraController } from '../systems/CameraController';
import { LevelLoader } from '../levels/LevelLoader';
import { level001 } from '../levels/level001';
import { buildParallaxLayers } from '../levels/parallax';
import { Player } from '../entities/Player';
import { MovingPlatform } from '../entities/MovingPlatform';
import { Hazard } from '../entities/Hazard';
import { Checkpoint } from '../entities/Checkpoint';
import { gameEvents } from '../core/EventBus';
import { createLivesState, applyDamage, setCheckpoint, type LivesState } from '../../utils/livesReducer';
import type { MoveInput } from '../../utils/physics';

export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private movingPlatforms: MovingPlatform[] = [];
  private hazards: Hazard[] = [];
  private checkpoints: Checkpoint[] = [];
  private cameraController!: CameraController;
  private livesState!: LivesState;
  private lastDamageTime = 0;
  private invulnerabilityWindowMs = 1000;

  constructor() {
    super('Play');
  }

  create(): void {
    this.physics.world.gravity.y = 0; // gravity is applied manually in Player.update

    // Build parallax background layers first so they render behind everything
    buildParallaxLayers(this, level001.backgroundPalette, level001.widthPx, level001.heightPx);

    // Load and build the level, creating platforms, player, and moving platforms
    const levelBuild = LevelLoader.buildInScene(this, level001);
    this.player = levelBuild.player;
    this.movingPlatforms = levelBuild.movingPlatforms;
    this.hazards = levelBuild.hazards;
    this.checkpoints = levelBuild.checkpoints;

    // Initialize lives state
    this.livesState = createLivesState();
    this.lastDamageTime = 0;

    // Attach camera controller with bounds matching level dimensions
    this.cameraController = new CameraController();
    this.cameraController.attach(this.cameras.main, this.player.sprite, {
      x: 0,
      y: 0,
      width: level001.widthPx,
      height: level001.heightPx,
    });

    // Set up hazard overlaps with invulnerability window
    for (const hazard of this.hazards) {
      this.physics.add.overlap(this.player.sprite, hazard.sprite, () => {
        const now = this.time.now;
        if (now - this.lastDamageTime >= this.invulnerabilityWindowMs) {
          this.lastDamageTime = now;
          this.livesState = applyDamage(this.livesState);
          gameEvents.emit('lives:changed', { lives: this.livesState.lives });
          this.cameraController.shake();
          gameEvents.emit('player:died', { livesRemaining: this.livesState.lives });

          // Respawn at last checkpoint or level start
          const respawnPos = this.livesState.checkpointId
            ? this.checkpoints.find((cp) => cp.id === this.livesState.checkpointId)
            : null;
          if (respawnPos) {
            this.player.setPosition(respawnPos.sprite.x, respawnPos.sprite.y);
          } else {
            this.player.setPosition(level001.playerStart.x, level001.playerStart.y);
          }

          // Check if game is over
          if (this.livesState.isGameOver) {
            gameEvents.emit('game:over', { finalScore: 0, bestScore: 0 });
          }
        }
      });
    }

    // Set up checkpoint overlaps
    for (const checkpoint of this.checkpoints) {
      this.physics.add.overlap(this.player.sprite, checkpoint.sprite, () => {
        if (checkpoint.activate()) {
          this.livesState = setCheckpoint(this.livesState, checkpoint.id);
          gameEvents.emit('checkpoint:reached', { id: checkpoint.id });
        }
      });
    }

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
    for (const mp of this.movingPlatforms) {
      mp.update(delta);
    }
  }
}

