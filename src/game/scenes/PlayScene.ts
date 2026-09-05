import Phaser from 'phaser';
import { CameraController } from '../systems/CameraController';
import { LevelLoader } from '../levels/LevelLoader';
import { level001 } from '../levels/level001';
import { buildParallaxLayers } from '../levels/parallax';
import { Player } from '../entities/Player';
import { MovingPlatform } from '../entities/MovingPlatform';
import { Hazard } from '../entities/Hazard';
import { EnemyBase } from '../entities/EnemyBase';
import { ChaseEnemy } from '../entities/ChaseEnemy';
import { Checkpoint } from '../entities/Checkpoint';
import { Collectible } from '../entities/Collectible';
import { gameEvents } from '../core/EventBus';
import { createLivesState, applyDamage, setCheckpoint, type LivesState } from '../../utils/livesReducer';
import { createScoreState, collectGem, collectSecret, type ScoreState } from '../../utils/scoring';
import type { MoveInput } from '../../utils/physics';

export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private movingPlatforms: MovingPlatform[] = [];
  private hazards: Hazard[] = [];
  private enemies: EnemyBase[] = [];
  private checkpoints: Checkpoint[] = [];
  private collectibles: Collectible[] = [];
  private cameraController!: CameraController;
  private livesState!: LivesState;
  private scoreState!: ScoreState;
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
    this.enemies = levelBuild.enemies;
    this.checkpoints = levelBuild.checkpoints;
    this.collectibles = levelBuild.collectibles;

    // Initialize lives state
    this.livesState = createLivesState();
    // Initialize lastDamageTime to negative so first damage always applies
    this.lastDamageTime = -this.invulnerabilityWindowMs;

    // Initialize score state
    this.scoreState = createScoreState(levelBuild.totalCollectibles);

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
        if (this.livesState.isGameOver) return;
        this.handleDamageSource();
      });
    }

    // Set up enemy overlaps with invulnerability window (same damage path as hazards)
    for (const enemy of this.enemies) {
      this.physics.add.overlap(this.player.sprite, enemy.sprite, () => {
        if (this.livesState.isGameOver) return;
        if (enemy.context.state === 'dead') return;
        this.handleDamageSource();
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

    // Set up collectible overlaps
    for (const collectible of this.collectibles) {
      this.physics.add.overlap(this.player.sprite, collectible.sprite, () => {
        if (collectible.collect()) {
          if (collectible.kind === 'gem') {
            this.scoreState = collectGem(this.scoreState);
          } else if (collectible.kind === 'secret') {
            this.scoreState = collectSecret(this.scoreState);
          }
          gameEvents.emit('score:changed', { score: this.scoreState.score });
          gameEvents.emit('collectible:changed', { collected: this.scoreState.collected, total: this.scoreState.total });
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
    for (const enemy of this.enemies) {
      if (enemy instanceof ChaseEnemy) {
        enemy.setPlayerX(this.player.sprite.x);
      }
      const distanceToPlayer = Phaser.Math.Distance.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        this.player.sprite.x,
        this.player.sprite.y,
      );
      enemy.tick(delta, distanceToPlayer);
    }
  }

  private handleDamageSource(): void {
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
        gameEvents.emit('game:over', { finalScore: this.scoreState.score, bestScore: 0 });
      }
    }
  }
}

