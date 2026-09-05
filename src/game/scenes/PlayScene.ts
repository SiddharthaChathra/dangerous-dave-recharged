import Phaser from 'phaser';
import { CameraController } from '../systems/CameraController';
import { LevelLoader } from '../levels/LevelLoader';
import { getLevel } from '../levels/registry';
import type { LevelData } from '../levels/types';
import { buildParallaxLayers } from '../levels/parallax';
import { Player } from '../entities/Player';
import { MovingPlatform } from '../entities/MovingPlatform';
import { FallingPlatform } from '../entities/FallingPlatform';
import { Hazard } from '../entities/Hazard';
import { EnemyBase } from '../entities/EnemyBase';
import { ChaseEnemy } from '../entities/ChaseEnemy';
import { Checkpoint } from '../entities/Checkpoint';
import { Collectible } from '../entities/Collectible';
import { InputController } from '../systems/InputController';
import { gameEvents } from '../core/EventBus';
import { audioSystem } from '../core/audio';
import { ParticleFX } from '../systems/ParticleFX';
import { loadSave } from '../systems/SaveSystem';
import { createLivesState, applyDamage, setCheckpoint, type LivesState } from '../../utils/livesReducer';
import { createScoreState, collectGem, collectSecret, type ScoreState } from '../../utils/scoring';
import type { MoveInput } from '../../utils/physics';

export class PlayScene extends Phaser.Scene {
  private level!: LevelData;
  private player!: Player;
  private inputController!: InputController;
  private movingPlatforms: MovingPlatform[] = [];
  private fallingPlatforms: FallingPlatform[] = [];
  private hazards: Hazard[] = [];
  private enemies: EnemyBase[] = [];
  private checkpoints: Checkpoint[] = [];
  private collectibles: Collectible[] = [];
  private goalZone!: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
  private cameraController!: CameraController;
  private fx!: ParticleFX;
  private livesState!: LivesState;
  private scoreState!: ScoreState;
  private lastDamageTime = 0;
  private invulnerabilityWindowMs = 1000;
  private elapsedSeconds = 0;
  private timerAccumulator = 0;
  private dustAccumulator = 0;
  private wasOnGround = false;
  private levelCompleted = false;

  constructor() {
    super('Play');
  }

  init(data: { levelId: string }): void {
    this.level = getLevel(data?.levelId);
    this.levelCompleted = false;
    this.elapsedSeconds = 0;
    this.timerAccumulator = 0;
  }

  create(): void {
    this.physics.world.gravity.y = 0; // gravity is applied manually in Player.update

    // Build parallax background layers first so they render behind everything
    buildParallaxLayers(this, this.level.backgroundPalette, this.level.widthPx, this.level.heightPx);

    // Load and build the level, creating platforms, player, and moving platforms
    const levelBuild = LevelLoader.buildInScene(this, this.level);
    this.player = levelBuild.player;
    this.movingPlatforms = levelBuild.movingPlatforms;
    this.fallingPlatforms = levelBuild.fallingPlatforms;
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

    // Emit initial state for HUD display
    gameEvents.emit('lives:changed', { lives: this.livesState.lives });
    gameEvents.emit('score:changed', { score: this.scoreState.score });
    gameEvents.emit('collectible:changed', { collected: this.scoreState.collected, total: this.scoreState.total });

    // Attach camera controller with bounds matching level dimensions
    this.cameraController = new CameraController();
    this.cameraController.attach(this.cameras.main, this.player.sprite, {
      x: 0,
      y: 0,
      width: this.level.widthPx,
      height: this.level.heightPx,
    });

    // Particle VFX system, gated by the current reduced-motion setting
    this.fx = new ParticleFX(this);
    this.fx.setReducedMotion(loadSave(window.localStorage).settings.reducedMotion);
    this.wasOnGround = this.player.isOnGround;

    // Set up falling platform colliders to trigger on player contact
    for (const fallingPlatform of this.fallingPlatforms) {
      this.physics.add.collider(this.player.sprite, fallingPlatform.sprite, () => {
        if (this.player.sprite.body?.touching.down) {
          fallingPlatform.trigger(this);
        }
      });
    }

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
          audioSystem.playSfx('checkpoint');
          this.fx.checkpointPulse(checkpoint.sprite.x, checkpoint.sprite.y);
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
          audioSystem.playSfx('collect');
          this.fx.sparkle(collectible.sprite.x, collectible.sprite.y);
        }
      });
    }

    // Set up the goal portal
    const goalRect = this.add.sprite(this.level.goal.x, this.level.goal.y - 40, 'goal_door');
    this.physics.add.existing(goalRect, true);
    this.goalZone = goalRect as unknown as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
    this.physics.add.overlap(this.player.sprite, this.goalZone, () => {
      this.handleLevelComplete();
    });

    this.inputController = new InputController(this);

    audioSystem.startMusic();

    // Test seam: expose a deterministic way for Playwright/E2E tests to trigger the exact
    // same level-complete path a real goal-touch would trigger, without depending on
    // pixel-perfect play. Guarded so it only ever attaches once (module-level check on the
    // global, since PlayScene is re-created every time a level (re)starts).
    const globalWindow = window as unknown as Record<string, unknown>;
    if (!globalWindow.__ddrTestHooks) {
      globalWindow.__ddrTestHooks = {
        completeLevel: () => this.handleLevelComplete(),
      };
    }
  }

  shutdown(): void {
    audioSystem.stopMusic();
  }

  getInputController(): InputController {
    return this.inputController;
  }

  update(_time: number, delta: number): void {
    const state = this.inputController.getState();
    if (state.pausePressed) gameEvents.emit('game:pause', {});
    const input: MoveInput = {
      left: state.left,
      right: state.right,
      jumpPressed: state.jumpPressed,
      jumpHeld: state.jumpHeld,
    };
    const { jumped } = this.player.update(delta, input);
    if (jumped) {
      audioSystem.playSfx('jump');
      this.fx.jumpBurst(this.player.sprite.x, this.player.sprite.y);
    }
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
      const wasAlive = enemy.context.state !== 'dead';
      enemy.tick(delta, distanceToPlayer);
      if (wasAlive && enemy.context.state === 'dead') {
        this.fx.enemyDefeat(enemy.sprite.x, enemy.sprite.y);
      }
    }

    // Ground-transition and run-dust particle effects
    const onGround = this.player.isOnGround;
    const horizontalSpeed = Math.abs((this.player.sprite.body as Phaser.Physics.Arcade.Body).velocity.x);
    if (!this.wasOnGround && onGround) {
      this.fx.landingDust(this.player.sprite.x, this.player.sprite.y + 16);
    }
    if (onGround && horizontalSpeed > 10) {
      this.dustAccumulator += delta;
      if (this.dustAccumulator >= 150) {
        this.dustAccumulator -= 150;
        this.fx.dustAt(this.player.sprite.x, this.player.sprite.y + 16);
      }
    } else {
      this.dustAccumulator = 0;
    }
    this.wasOnGround = onGround;

    // Accumulate time and emit timer/progress events once per second
    this.timerAccumulator += delta;
    if (this.timerAccumulator >= 1000) {
      this.timerAccumulator -= 1000;
      this.elapsedSeconds += 1;
      gameEvents.emit('timer:tick', { seconds: this.elapsedSeconds });
      const progress = this.player.sprite.x / this.level.widthPx;
      gameEvents.emit('level:progress', { percent: progress });
    }
  }

  private handleLevelComplete(): void {
    if (this.levelCompleted || this.livesState.isGameOver) return;
    this.levelCompleted = true;
    gameEvents.emit('level:complete', {
      levelId: this.level.id,
      score: this.scoreState.score,
      timeSeconds: this.elapsedSeconds,
      collected: this.scoreState.collected,
      total: this.scoreState.total,
    });
    audioSystem.playSfx('levelComplete');
    this.fx.levelCompleteBurst(this.player.sprite.x, this.player.sprite.y);
  }

  private handleDamageSource(): void {
    const now = this.time.now;
    if (now - this.lastDamageTime >= this.invulnerabilityWindowMs) {
      this.lastDamageTime = now;
      this.livesState = applyDamage(this.livesState);
      gameEvents.emit('lives:changed', { lives: this.livesState.lives });
      this.cameraController.shake();
      gameEvents.emit('player:died', { livesRemaining: this.livesState.lives });
      this.player.playHurt();
      audioSystem.playSfx('damage');

      // Respawn at last checkpoint or level start
      const respawnPos = this.livesState.checkpointId
        ? this.checkpoints.find((cp) => cp.id === this.livesState.checkpointId)
        : null;
      if (respawnPos) {
        this.player.setPosition(respawnPos.sprite.x, respawnPos.sprite.y);
      } else {
        this.player.setPosition(this.level.playerStart.x, this.level.playerStart.y);
      }

      // Check if game is over
      if (this.livesState.isGameOver) {
        this.player.playDeath();
        gameEvents.emit('game:over', { finalScore: this.scoreState.score, bestScore: 0 });
      }
    }
  }
}

