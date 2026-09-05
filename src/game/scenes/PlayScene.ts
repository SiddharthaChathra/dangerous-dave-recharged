import Phaser from 'phaser';
import { CameraController } from '../systems/CameraController';
import { LevelLoader } from '../levels/LevelLoader';
import { getLevel } from '../levels/registry';
import type { LevelData } from '../levels/types';
import { buildParallaxLayers, type ParallaxController } from '../levels/parallax';
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
import { createLivesState, applyDamage, setCheckpoint, STARTING_LIVES, type LivesState } from '../../utils/livesReducer';
import { createScoreState, collectGem, collectSecret, type ScoreState } from '../../utils/scoring';
import type { MoveInput } from '../../utils/physics';
import { PHYSICS } from '../core/constants';

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
  private parallax!: ParallaxController;
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
  private reducedMotion = false;
  private lastFallSpeed = 0;
  private trailAccumulator = 0;
  private vignette!: Phaser.GameObjects.Graphics;
  /** Glow sprites that track their owner each frame. */
  private glows: Array<{ glow: Phaser.GameObjects.Image; target: { x: number; y: number; visible: boolean } }> = [];

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

    // Build the layered environment first so it renders behind everything
    this.parallax = buildParallaxLayers(this, this.level.backgroundPalette, this.level.widthPx, this.level.heightPx);

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
    this.emitHp();

    // Attach camera controller with bounds matching level dimensions
    this.cameraController = new CameraController();
    this.cameraController.attach(this.cameras.main, this.player.sprite, {
      x: 0,
      y: 0,
      width: this.level.widthPx,
      height: this.level.heightPx,
    });

    // Particle VFX system, gated by the current reduced-motion setting
    const reducedMotion = loadSave(window.localStorage).settings.reducedMotion;
    this.fx = new ParticleFX(this);
    this.fx.setReducedMotion(reducedMotion);
    this.cameraController.setReducedMotion(reducedMotion);
    this.reducedMotion = reducedMotion;
    this.wasOnGround = this.player.isOnGround;

    // Lighting: soft additive glows so collectibles, checkpoints and the exit read as
    // light sources rather than flat sprites.
    for (const collectible of this.collectibles) {
      this.attachGlow(
        collectible.sprite,
        collectible.kind === 'secret' ? 0xff7ae0 : 0xffe98a,
        collectible.kind === 'secret' ? 46 : 34,
        0.5,
      );
    }
    for (const checkpoint of this.checkpoints) {
      this.attachGlow(checkpoint.sprite, 0x4ade80, 52, 0.32);
    }
    for (const hazard of this.hazards) {
      this.attachGlow(hazard.sprite, 0xff4d4d, 40, 0.22);
    }
    this.attachGlow(this.player.sprite, 0x6ff0ff, 44, 0.22, false);

    // Damage vignette overlay, screen-fixed and invisible until the player is hit.
    this.vignette = this.add.graphics().setScrollFactor(0).setDepth(70);
    this.vignette.fillStyle(0xff2b2b, 1);
    this.vignette.fillRect(0, 0, this.scale.width, this.scale.height);
    this.vignette.setAlpha(0);

    this.cameraController.introFade();
    this.showLevelIntro();

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
          this.fx.scorePopup(
            collectible.sprite.x,
            collectible.sprite.y,
            collectible.kind === 'secret' ? '+100' : '+10',
            collectible.kind === 'secret' ? '#ff7ae0' : '#ffe98a',
          );
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
    // Phaser reuses this Scene instance across restarts, so drop anything we track by hand.
    this.parallax?.destroy();
    this.glows = [];
  }

  getInputController(): InputController {
    return this.inputController;
  }

  update(_time: number, delta: number): void {
    this.parallax.update(this.cameras.main, delta);
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
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    const onGround = this.player.isOnGround;
    const horizontalSpeed = Math.abs(body.velocity.x);
    if (!this.wasOnGround && onGround) {
      this.fx.landingDust(this.player.sprite.x, this.player.sprite.y + 16);
      this.cameraController.landingImpact(this.lastFallSpeed, PHYSICS.MAX_FALL_SPEED);
    }
    // Remember downward speed while airborne so the landing impact can scale with it.
    if (!onGround) this.lastFallSpeed = Math.max(0, body.velocity.y);

    // Keep entity glows locked to their owners (and hidden with them once collected).
    for (const { glow, target } of this.glows) {
      glow.setPosition(target.x, target.y);
      if (glow.visible !== target.visible) glow.setVisible(target.visible);
    }

    // Camera looks further ahead the faster the player runs.
    this.cameraController.update(body.velocity.x, PHYSICS.MAX_RUN_SPEED, delta);
    if (onGround && horizontalSpeed > 10) {
      this.dustAccumulator += delta;
      if (this.dustAccumulator >= 150) {
        this.dustAccumulator -= 150;
        this.fx.dustAt(this.player.sprite.x, this.player.sprite.y + 16);
      }
    } else {
      this.dustAccumulator = 0;
    }

    // Speed trail: only near top speed, so it reads as momentum rather than smear.
    if (horizontalSpeed > PHYSICS.MAX_RUN_SPEED * 0.8) {
      this.trailAccumulator += delta;
      if (this.trailAccumulator >= 55) {
        this.trailAccumulator -= 55;
        this.fx.motionTrail(this.player.sprite);
      }
    } else {
      this.trailAccumulator = 0;
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

  /**
   * The HUD's INTEGRITY bar previously listened for an `hp:changed` event that nothing
   * emitted, so it sat permanently at 100%. Lives are the game's real health resource,
   * so drive the bar from them (3 lives = full, 0 = empty).
   */
  private emitHp(): void {
    gameEvents.emit('hp:changed', { hp: this.livesState.lives, maxHp: STARTING_LIVES });
  }

  /**
   * Attaches a soft additive glow behind a sprite. `pulse` gives collectibles/checkpoints
   * a slow breathing rhythm so the world never looks completely static.
   */
  private attachGlow(
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Visible,
    color: number,
    size: number,
    alpha: number,
    pulse = true,
  ): void {
    if (this.reducedMotion) return;
    const glow = this.add
      .image(target.x, target.y, 'ddr_mote')
      .setTint(color)
      .setAlpha(alpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(5);
    glow.setDisplaySize(size, size);
    if (pulse) {
      this.tweens.add({
        targets: glow,
        alpha: alpha * 1.7,
        scale: glow.scale * 1.18,
        duration: 1100 + Math.random() * 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.glows.push({ glow, target: target as unknown as { x: number; y: number; visible: boolean } });
  }

  /** Red screen pulse on taking damage — instant, readable feedback. */
  private flashDamage(): void {
    if (this.reducedMotion || !this.vignette) return;
    this.tweens.killTweensOf(this.vignette);
    this.vignette.setAlpha(0.34);
    this.tweens.add({
      targets: this.vignette,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
    });
  }

  /** Brief level title card so entering a level feels like arriving somewhere. */
  private showLevelIntro(): void {
    const label = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 40, this.level.name.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '34px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(80)
      .setAlpha(0);
    this.tweens.add({
      targets: label,
      alpha: 1,
      y: label.y - 14,
      duration: 420,
      ease: 'Cubic.easeOut',
      hold: 900,
      yoyo: true,
      onComplete: () => label.destroy(),
    });
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
    this.cameraController.celebrate();
  }

  private handleDamageSource(): void {
    const now = this.time.now;
    if (now - this.lastDamageTime >= this.invulnerabilityWindowMs) {
      this.lastDamageTime = now;
      this.livesState = applyDamage(this.livesState);
      gameEvents.emit('lives:changed', { lives: this.livesState.lives });
      this.emitHp();
      this.fx.damageBurst(this.player.sprite.x, this.player.sprite.y);
      this.flashDamage();
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

