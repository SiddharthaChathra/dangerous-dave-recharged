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
import { Collectible } from '../entities/Collectible';
import { WeaponPickup } from '../entities/WeaponPickup';
import { Trophy } from '../entities/Trophy';
import { Projectile } from '../entities/Projectile';
import { InputController } from '../systems/InputController';
import { gameEvents } from '../core/EventBus';
import { audioSystem } from '../core/audio';
import { ParticleFX } from '../systems/ParticleFX';
import { VisualSkinner, type Skinnable } from '../systems/VisualSkinner';
import { getVisualMode } from '../core/visualMode';
import { loadSave } from '../systems/SaveSystem';
import { createLivesState, applyDamage, STARTING_LIVES, type LivesState } from '../../utils/livesReducer';
import { createScoreState, collectGem, collectSecret, defeatEnemy, ENEMY_DEFEAT_SCORE, GEM_SCORE, SECRET_SCORE, type ScoreState } from '../../utils/scoring';
import { createWeaponState, pickUpWeapon, canFire, projectileVelocityX, type WeaponState } from '../../utils/weapon';
import { clampDelta, hasFallenOutOfBounds, type MoveInput } from '../../utils/physics';
import { PHYSICS } from '../core/constants';

/**
 * How long the death animation plays before the outcome (level restart / game over) is
 * announced. Long enough to read as a death, short enough not to make the player wait.
 */
const DEATH_ANIM_MS = 650;

export class PlayScene extends Phaser.Scene {
  private level!: LevelData;
  private player!: Player;
  private inputController!: InputController;
  private movingPlatforms: MovingPlatform[] = [];
  private fallingPlatforms: FallingPlatform[] = [];
  private hazards: Hazard[] = [];
  private enemies: EnemyBase[] = [];
  private collectibles: Collectible[] = [];
  private weaponPickups: WeaponPickup[] = [];
  private trophy!: Trophy;
  /** Throttles the locked-door nudge so brushing the door doesn't spam feedback. */
  private lastLockedFeedbackAt = 0;
  /** Paces hazard ember emission so it doesn't spawn particles every frame. */
  private hazardFxAccumulator = 0;
  /** Solid level geometry, kept so projectiles can be made to stop at walls and floors. */
  private staticGroup!: Phaser.Physics.Arcade.StaticGroup;
  private projectiles: Projectile[] = [];
  private weaponState: WeaponState = createWeaponState();
  /** The exit door. A Sprite, so its texture can reflect locked/unlocked state. */
  private goalZone!: Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.StaticBody };
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
  /** True from the moment a death starts until the scene is torn down, freezing the run. */
  private dying = false;
  /** True once the exit sequence starts, so it can never run twice. */
  private doorSequenceStarted = false;
  /** Lives/score this level attempt begins with, carried in from the run by main.ts. */
  private startingLives = STARTING_LIVES;
  private startingScore = 0;
  private reducedMotion = false;
  private lastFallSpeed = 0;
  private trailAccumulator = 0;
  private vignette!: Phaser.GameObjects.Graphics;
  /** Swaps textures on the live world when the presentation mode changes. Visual-only. */
  private skinner!: VisualSkinner;
  /** Unsubscribe for the theme listener, so a scene restart never leaves a duplicate. */
  private offVisualModeChanged: (() => void) | null = null;
  /** Glow sprites that track their owner each frame. */
  private glows: Array<{ glow: Phaser.GameObjects.Image; target: { x: number; y: number; visible: boolean } }> = [];

  constructor() {
    super('Play');
  }

  init(data: { levelId: string; lives?: number; score?: number }): void {
    this.level = getLevel(data?.levelId);
    this.levelCompleted = false;
    this.dying = false;
    this.doorSequenceStarted = false;
    this.startingLives = data?.lives ?? STARTING_LIVES;
    this.startingScore = data?.score ?? 0;
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
    this.collectibles = levelBuild.collectibles;
    this.weaponPickups = levelBuild.weaponPickups;
    this.trophy = levelBuild.trophy;
    this.staticGroup = levelBuild.staticGroup;

    // The gun is per level attempt: a death re-stages the level, so it must be found again.
    this.projectiles = [];
    this.weaponState = createWeaponState();

    // Lives and score belong to the *run*, not the level: a restart after a death (or the next
    // level) continues with what's left, so three deaths end the run wherever they happen.
    this.livesState = createLivesState(this.startingLives);
    // Initialize lastDamageTime to negative so first damage always applies
    this.lastDamageTime = -this.invulnerabilityWindowMs;

    this.scoreState = createScoreState(levelBuild.totalCollectibles, this.startingScore);

    // Emit initial state for HUD display
    gameEvents.emit('lives:changed', { lives: this.livesState.lives });
    gameEvents.emit('score:changed', { score: this.scoreState.score });
    gameEvents.emit('collectible:changed', { collected: this.scoreState.collected, total: this.scoreState.total });
    gameEvents.emit('weapon:changed', { hasGun: this.weaponState.hasGun });
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

    // Set up collectible overlaps
    for (const collectible of this.collectibles) {
      this.physics.add.overlap(this.player.sprite, collectible.sprite, () => {
        if (collectible.collect()) {
          const isSecret = collectible.kind === 'secret';
          this.scoreState = isSecret ? collectSecret(this.scoreState) : collectGem(this.scoreState);
          gameEvents.emit('score:changed', { score: this.scoreState.score });
          // Explicit pickup event so reward UI never has to guess from score deltas.
          gameEvents.emit('collectible:collected', {
            kind: collectible.kind,
            value: isSecret ? SECRET_SCORE : GEM_SCORE,
            x: collectible.sprite.x,
            y: collectible.sprite.y,
            collected: this.scoreState.collected,
            total: this.scoreState.total,
          });
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

    // Picking up the gun arms Dave for the rest of this level attempt.
    for (const pickup of this.weaponPickups) {
      this.physics.add.overlap(this.player.sprite, pickup.sprite, () => {
        if (this.dying || !pickup.collect()) return;
        this.weaponState = pickUpWeapon(this.weaponState);
        gameEvents.emit('weapon:changed', { hasGun: true });
        audioSystem.playSfx('collect');
        this.fx.sparkle(pickup.sprite.x, pickup.sprite.y);
        this.fx.scorePopup(pickup.sprite.x, pickup.sprite.y, 'GUN!', '#ffe98a');
      });
    }

    // Set up the goal portal
    // The exit is drawn locked until the trophy is collected. Which texture is shown is
    // driven by game state here, so the art can never disagree with whether it opens.
    const lockedKey = this.textures.exists('goal_door_locked') ? 'goal_door_locked' : 'goal_door';
    const goalRect = this.add.sprite(this.level.goal.x, this.level.goal.y - 40, lockedKey);
    this.physics.add.existing(goalRect, true);
    this.goalZone = goalRect as unknown as Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.StaticBody };
    this.physics.add.overlap(this.player.sprite, this.goalZone, () => {
      this.handleGoalTouched();
    });

    // The trophy is the level's key: the exit stays shut until it is collected.
    this.physics.add.overlap(this.player.sprite, this.trophy.sprite, () => {
      if (this.dying || !this.trophy.collect()) return;
      gameEvents.emit('trophy:collected', { x: this.trophy.sprite.x, y: this.trophy.sprite.y });
      // Re-key through the skinner, not setTexture: the skinner has to learn the door's new
      // base art, or the next visual-mode switch would redraw this unlocked door as locked.
      this.skinner.rekey(this.goalZone, 'goal_door', getVisualMode());
      this.fx.trophyCollectBurst(this.trophy.sprite.x, this.trophy.sprite.y);
      this.fx.doorUnlockGlow(this.goalZone.x, this.goalZone.y);
      audioSystem.playSfx('checkpoint');
      this.fx.sparkle(this.trophy.sprite.x, this.trophy.sprite.y);
      this.fx.scorePopup(this.trophy.sprite.x, this.trophy.sprite.y, 'DOOR UNLOCKED!', '#ffd700');
      this.tweens.add({
        targets: this.trophy.sprite,
        y: this.trophy.sprite.y - 40,
        alpha: 0,
        scale: 1.6,
        duration: 420,
        ease: 'Back.In',
        onComplete: () => this.trophy.sprite.setVisible(false),
      });
      // The door visibly reacts, so the cause and effect are unmistakable.
      this.tweens.add({ targets: this.goalZone, scale: 1.15, duration: 180, yoyo: true });
    });

    this.setUpVisualSkinning(levelBuild.staticGroup);

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
    // Drop the theme subscription and skin registrations, or every level restart would leave
    // another listener re-skinning destroyed sprites.
    this.offVisualModeChanged?.();
    this.offVisualModeChanged = null;
    this.skinner?.clear();
  }

  getInputController(): InputController {
    return this.inputController;
  }

  update(_time: number, rawDelta: number): void {
    // Clamp so a stall (tab-switch, GC pause) can't produce one huge simulation step that
    // tunnels the player/enemies through thin hazards or fast platforms in a single frame.
    const delta = clampDelta(rawDelta, PHYSICS.MAX_DELTA_MS);
    this.parallax.update(this.cameras.main, delta);

    // Once dead, stop simulating the player entirely: the death animation must play out
    // untouched (Player.update would otherwise overwrite it from velocity on the next frame),
    // and a dead player must not be steerable while the level restart is pending.
    if (this.dying) return;

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

    if (state.firePressed) this.tryFire();
    this.reapProjectiles();

    // Levels have no floor collider: falling into a pit/gap with nothing below must count as a
    // death, or the player just falls forever off-screen while the rest of the game keeps going.
    if (hasFallenOutOfBounds(this.player.sprite.y, this.level.heightPx, PHYSICS.FALL_DEATH_MARGIN_PX)) {
      this.handleDamageSource();
      return;
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

    // Fire and lava flow, and shed embers. Purely cosmetic: the damage box never moves.
    this.hazardFxAccumulator += delta;
    const emitEmbers = this.hazardFxAccumulator >= 90;
    if (emitEmbers) this.hazardFxAccumulator -= 90;
    for (const hazard of this.hazards) {
      if (hazard.kind === 'spike') continue;
      hazard.sprite.tilePositionY -= (hazard.kind === 'lava' ? 0.02 : 0.05) * delta;
      if (emitEmbers && !this.reducedMotion) {
        const spread = hazard.sprite.width / 2;
        this.fx.hazardEmber(
          hazard.sprite.x + (Math.random() * 2 - 1) * spread,
          hazard.sprite.y - hazard.sprite.height / 2,
          hazard.kind === 'lava',
        );
      }
    }

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
   * Fires a shot, if Dave is armed and no shot is already in flight. Every collision the shot
   * can have is registered here, at creation, rather than polled per frame.
   */
  private tryFire(): void {
    if (this.dying || this.levelCompleted) return;
    if (!canFire(this.weaponState, this.projectiles.length)) return;

    const facingLeft = this.player.sprite.flipX;
    const muzzleX = this.player.sprite.x + (facingLeft ? -PHYSICS.MUZZLE_OFFSET_X : PHYSICS.MUZZLE_OFFSET_X);
    const muzzleY = this.player.sprite.y;

    const projectile = new Projectile(this, muzzleX, muzzleY, projectileVelocityX(facingLeft, PHYSICS.PROJECTILE_SPEED));
    this.projectiles.push(projectile);

    // Shots stop at solid geometry so you can't shoot through the level.
    this.physics.add.collider(projectile.sprite, this.staticGroup, () => projectile.destroy());
    for (const mp of this.movingPlatforms) {
      this.physics.add.collider(projectile.sprite, mp.sprite, () => projectile.destroy());
    }

    for (const enemy of this.enemies) {
      this.physics.add.overlap(projectile.sprite, enemy.sprite, () => {
        if (projectile.isDestroyed || enemy.context.state === 'dead' || enemy.context.state === 'hurt') return;
        projectile.destroy();
        enemy.hit();
        this.scoreState = defeatEnemy(this.scoreState);
        gameEvents.emit('score:changed', { score: this.scoreState.score });
        audioSystem.playSfx('enemyDefeat');
        this.fx.scorePopup(enemy.sprite.x, enemy.sprite.y, `+${ENEMY_DEFEAT_SCORE}`, '#9dff8a');
      });
    }

    audioSystem.playSfx('jump');
    this.fx.jumpBurst(muzzleX, muzzleY);
    this.player.recoil(facingLeft);
  }

  /** Drops shots that hit something or left the level, keeping the array (and physics) small. */
  private reapProjectiles(): void {
    if (this.projectiles.length === 0) return;
    for (const projectile of this.projectiles) {
      if (!projectile.isDestroyed && projectile.isSpent(this.level.widthPx, this.level.heightPx, PHYSICS.PROJECTILE_MAX_RANGE_PX)) {
        projectile.destroy();
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.isDestroyed);
  }

  /**
   * Registers the level's visuals with the theme skinner and keeps them in sync with the
   * current presentation mode.
   *
   * Everything here is presentation-only: the skinner just swaps textures on objects that
   * already exist, which is what lets the player switch themes mid-level without the world
   * being rebuilt. No physics body, coordinate, or gameplay value is touched, so the two
   * modes are guaranteed to play identically.
   */
  private setUpVisualSkinning(staticGroup: Phaser.Physics.Arcade.StaticGroup): void {
    this.skinner = new VisualSkinner((key) => this.textures.exists(key));

    // Base keys are read from the freshly-built objects, so adding new world art needs no
    // changes here — it is skinnable as soon as a `classic__<key>` texture is registered.
    const registerSprite = (obj: unknown) => {
      const candidate = obj as Skinnable | null;
      if (!candidate || typeof candidate.setTexture !== 'function') return;
      // baseKeyOf resolves a TileSprite's source art rather than its generated fill canvas —
      // reading `texture.key` directly left every platform in the game un-skinned.
      const baseKey = this.skinner.baseKeyOf(candidate);
      if (baseKey) this.skinner.register(candidate, baseKey);
    };

    for (const tile of staticGroup.getChildren()) registerSprite(tile);
    for (const mp of this.movingPlatforms) registerSprite(mp.sprite);
    for (const fp of this.fallingPlatforms) registerSprite(fp.sprite);
    for (const hazard of this.hazards) registerSprite(hazard.sprite);
    for (const enemy of this.enemies) registerSprite(enemy.sprite);
    for (const collectible of this.collectibles) registerSprite(collectible.sprite);
    for (const pickup of this.weaponPickups) registerSprite(pickup.sprite);
    registerSprite(this.goalZone);

    // Apply immediately: a level entered while classic mode is already active must start skinned.
    this.skinner.applyMode(getVisualMode());
    this.player.refreshSkin();

    this.offVisualModeChanged = gameEvents.on('visual-mode:changed', ({ mode }) => {
      this.skinner.applyMode(mode);
      // The player's texture is owned by its animator (it changes per movement state), so it
      // re-resolves its own key rather than being registered as a static sprite.
      this.player.refreshSkin();
    });
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

  /**
   * The exit door. Locked until the trophy is collected: touching it early gives clear,
   * repeatable feedback and nothing else — there is no way to slip past it, because completion
   * is gated on game state rather than on collision geometry.
   */
  private handleGoalTouched(): void {
    if (this.dying || this.levelCompleted || this.doorSequenceStarted) return;

    if (!this.trophy.isCollected) {
      const now = this.time.now;
      if (now - this.lastLockedFeedbackAt < 1000) return;
      this.lastLockedFeedbackAt = now;

      gameEvents.emit('door:locked', { x: this.goalZone.x, y: this.goalZone.y });
      audioSystem.playSfx('damage');
      this.fx.scorePopup(this.goalZone.x, this.goalZone.y - 30, 'LOCKED — FIND THE TROPHY', '#ff6b6b');
      // A short rattle: the door refuses, rather than silently doing nothing.
      this.tweens.add({ targets: this.goalZone, x: this.goalZone.x + 4, duration: 60, yoyo: true, repeat: 3 });
      this.cameraController.shake();
      return;
    }

    this.startDoorSequence();
  }

  /**
   * The unlocked exit: Dave steps into the doorway and the door closes behind him before the
   * level-complete screen appears, so finishing reads as an action rather than a teleport.
   */
  private startDoorSequence(): void {
    this.doorSequenceStarted = true;

    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    this.player.sprite.setVelocity(0, 0);
    body.enable = false;
    gameEvents.emit('door:opening', { levelId: this.level.id });
    audioSystem.playSfx('levelComplete');

    // Walk into the doorway, then shrink into it as the door shuts.
    this.tweens.add({
      targets: this.player.sprite,
      x: this.goalZone.x,
      duration: 260,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.player.sprite,
          scale: 0,
          alpha: 0,
          duration: 260,
          ease: 'Back.In',
        });
        this.tweens.add({
          targets: this.goalZone,
          scaleY: 1.25,
          duration: 200,
          yoyo: true,
          onComplete: () => this.handleLevelComplete(),
        });
      },
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

  /**
   * Every death costs exactly one life and ends the current level attempt — there is no
   * checkpoint respawn and no respawn-in-place. The death animation plays first, then the
   * outcome is announced (`life:lost` restarts this level from its beginning, `game:over` ends
   * the run); main.ts owns the transition itself, as it does for every other scene change.
   */
  private handleDamageSource(): void {
    if (this.dying || this.levelCompleted) return;
    const now = this.time.now;
    if (now - this.lastDamageTime < this.invulnerabilityWindowMs) return;

    this.lastDamageTime = now;
    this.dying = true;
    this.livesState = applyDamage(this.livesState);

    gameEvents.emit('lives:changed', { lives: this.livesState.lives });
    this.emitHp();
    this.fx.damageBurst(this.player.sprite.x, this.player.sprite.y);
    this.fx.playerDeathBurst(this.player.sprite.x, this.player.sprite.y);
    this.flashDamage();
    this.cameraController.shake();
    audioSystem.playSfx('damage');

    // Freeze the corpse: no input, no gravity, no further collisions while the death plays out.
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    this.player.sprite.setVelocity(0, 0);
    body.enable = false;
    this.player.playDeath();

    const livesRemaining = this.livesState.lives;
    const levelId = this.level.id;
    this.time.delayedCall(DEATH_ANIM_MS, () => {
      if (livesRemaining > 0) {
        gameEvents.emit('life:lost', { livesRemaining, levelId });
      } else {
        gameEvents.emit('game:over', { finalScore: this.scoreState.score, levelId });
      }
    });
  }
}

