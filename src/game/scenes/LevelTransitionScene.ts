import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { audioSystem } from '../core/audio';
import { getVisualMode } from '../core/visualMode';
import { resolveTextureKey } from '../systems/VisualSkinner';
import { getSelectedCharacterId } from '../characters/selection';
import { resolvePlayerTextureKey } from '../characters/playerTexture';
import { ensureObjectiveTextures } from '../systems/WeaponPlaceholders';

export interface LevelTransitionData {
  levelId: string;
  /** Headline, e.g. "GOOD WORK!" — supplied by the caller from real game state. */
  title: string;
  /** e.g. "ONLY 9 MORE TO GO." */
  subtitle: string;
  isVictory: boolean;
  /**
   * Where this level sits in the campaign, for a progress indicator. Supplied rather than
   * recomputed so the interstitial never derives progression itself.
   */
  levelNumber: number;
  totalLevels: number;
  /** Run stats, if the presentation wants to show them inside the corridor. */
  score: number;
  gemsCollected: number;
  gemsTotal: number;
  timeSeconds: number;
}

/** Beat lengths. Kept tight: this sits between the player and their next level. */
const WALK_MS = 1150;
const HOLD_BEFORE_WALK_MS = 450;
const DOOR_ENTER_MS = 380;

/**
 * The between-levels corridor, recreating the original's interstitial: a brick passage with the
 * next level's door at the far left, Dave walking into it, and the "GOOD WORK! ONLY N MORE TO
 * GO." banner overhead.
 *
 * It is a real scene rather than a DOM card because the player is *in* it — Dave walks the
 * corridor. It renders through the same texture-resolution path as the game, so it inherits the
 * active visual mode and the chosen character automatically.
 *
 * Contract: it always finishes. Every path — animation completed, player skipped, or a beat
 * failing — ends in `finish()` exactly once, so the game can never wedge here.
 */
export class LevelTransitionScene extends Phaser.Scene {
  private transitionData!: LevelTransitionData;
  private finished = false;
  private failsafe?: Phaser.Time.TimerEvent;

  constructor() {
    super('LevelTransition');
  }

  init(data: LevelTransitionData): void {
    this.transitionData = data;
    this.finished = false;
  }

  create(): void {
    ensureObjectiveTextures(this);
    const { width, height } = this.scale;
    const mode = getVisualMode();
    const isClassic = mode === 'classic';
    const brickKey = this.textures.exists('transition_brick')
      ? resolveTextureKey('transition_brick', mode, (k) => this.textures.exists(k))
      : resolveTextureKey('platform_tile', mode, (k) => this.textures.exists(k));
    const doorKey = resolveTextureKey('goal_door', mode, (k) => this.textures.exists(k));

    this.cameras.main.setBackgroundColor('#000000');
    
    // Background
    if (!isClassic && this.textures.exists('transition_bg_gradient')) {
      const bg = this.add.image(width / 2, height / 2, 'transition_bg_gradient');
      bg.setDisplaySize(width, height);
      bg.setAlpha(0.6);
      
      // Floating atmospheric motes
      if (this.textures.exists('particle')) {
        this.add.particles(0, 0, 'particle', {
          x: { min: 0, max: width },
          y: { min: 0, max: height },
          speed: { min: 5, max: 15 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.2, end: 0 },
          alpha: { start: 0.3, end: 0 },
          lifespan: 4000,
          frequency: 200,
          blendMode: Phaser.BlendModes.ADD
        }).setDepth(0);
      }
    }

    const corridorTop = height * 0.34;
    const corridorHeight = height * 0.2;
    const bandHeight = 72;
    
    // Bricks
    // Added to the scene for rendering; nothing needs to reference them afterwards.
    this.add.tileSprite(width / 2, corridorTop - bandHeight / 2, width, bandHeight, brickKey).setOrigin(0.5);
    this.add
      .tileSprite(width / 2, corridorTop + corridorHeight + bandHeight / 2, width, bandHeight, brickKey)
      .setOrigin(0.5);

    const floorY = corridorTop + corridorHeight;

    // Door
    const door = this.add.sprite(96, floorY - 34, doorKey).setOrigin(0.5, 1);
    door.setDisplaySize(64, 84);
    
    // Light rays coming from the door
    let lightRays: Phaser.GameObjects.Image | null = null;
    if (!isClassic && this.textures.exists('transition_light_ray')) {
      lightRays = this.add.image(door.x + 10, door.y - 42, 'transition_light_ray');
      lightRays.setOrigin(0, 0.5); // Origin at the door
      lightRays.setDisplaySize(width * 0.6, 120);
      lightRays.setAlpha(0);
      lightRays.setBlendMode(Phaser.BlendModes.ADD);
      lightRays.setTint(0x00f0ff);
      lightRays.setDepth(10);
    }

    // Dave
    const characterId = getSelectedCharacterId();
    const textureFor = (state: 'idle' | 'run') =>
      resolvePlayerTextureKey(state, characterId, mode, (k) => this.textures.exists(k));
    const dave = this.add.sprite(width * 0.62, floorY - 4, textureFor('idle')).setOrigin(0.5, 1);
    dave.setDisplaySize(38, 50);
    dave.setFlipX(true);
    dave.setDepth(5);

    // Dynamic drop shadow
    const shadow = this.add.ellipse(dave.x, floorY - 2, 24, 6, 0x000000, 0.6);
    shadow.setDepth(4);

    // Typography & Stats
    const textGroup = this.add.group();
    const yCenter = corridorTop - bandHeight - 40;
    
    const banner = this.add.text(width / 2, yCenter, this.transitionData.title, {
      fontFamily: isClassic ? 'monospace' : '"Share Tech Mono", monospace',
      fontSize: isClassic ? '30px' : '36px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 6,
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setScale(0.5);
    textGroup.add(banner);

    const sub = this.add.text(width / 2, yCenter + 36, this.transitionData.subtitle, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);
    textGroup.add(sub);
    
    // Inline Stats (Folded in)
    const statsText = `SCORE: ${this.transitionData.score}  |  TIME: ${Math.floor(this.transitionData.timeSeconds)}s  |  GEMS: ${this.transitionData.gemsCollected}/${this.transitionData.gemsTotal}`;
    const stats = this.add.text(width / 2, corridorTop + corridorHeight + bandHeight + 30, statsText, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#a1a1aa',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    textGroup.add(stats);

    // Progress Indicator
    let progressStr = '';
    for(let i=1; i<=this.transitionData.totalLevels; i++) {
       progressStr += (i <= this.transitionData.levelNumber) ? '● ' : '○ ';
    }
    const progress = this.add.text(width / 2, yCenter - 30, progressStr.trim(), {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#00f0ff',
      stroke: '#000000',
      strokeThickness: 3,
      letterSpacing: 4
    }).setOrigin(0.5).setAlpha(0);
    textGroup.add(progress);

    // Setup skip events
    this.input.keyboard?.once('keydown', () => this.finish());
    this.input.once('pointerdown', () => this.finish());

    // --- Choreography ---
    this.time.delayedCall(HOLD_BEFORE_WALK_MS, () => {
      if (this.finished) return;
      
      // Dave starts walking
      dave.setTexture(textureFor('run'));
      
      // Text reveals sequentially
      audioSystem.playSfx('textReveal');
      this.tweens.add({
        targets: banner,
        alpha: 1, scaleX: 1, scaleY: 1,
        duration: 300, ease: 'Back.Out'
      });
      this.time.delayedCall(200, () => {
        if (this.finished) return;
        audioSystem.playSfx('textReveal');
        this.tweens.add({ targets: [sub, progress, stats], alpha: 1, y: '+=5', duration: 400, ease: 'Power2' });
      });

      // Walk to door
      this.tweens.add({
        targets: [dave, shadow],
        x: door.x + 6,
        duration: WALK_MS,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          // Footstep dust in modern
          if (!isClassic && Math.random() < 0.15) {
             const dust = this.add.circle(dave.x + (Math.random()*10-5), floorY-2, 2, 0xffffff, 0.4);
             this.tweens.add({
                targets: dust, y: '-=15', alpha: 0, scale: 2, duration: 400, onComplete: () => dust.destroy()
             });
          }
        },
        onComplete: () => {
          if (this.finished) return;
          audioSystem.playSfx('levelComplete');
          
          if (lightRays) {
             this.tweens.add({ targets: lightRays, alpha: 0.8, scaleX: 1.2, duration: DOOR_ENTER_MS, ease: 'Power2' });
             dave.setTintFill(0x00f0ff);
             shadow.destroy();
          }

          this.tweens.add({ targets: door, scaleY: door.scaleY * 1.12, duration: 160, yoyo: true });
          this.tweens.add({
            targets: dave,
            alpha: 0,
            scaleX: dave.scaleX * 0.4,
            duration: DOOR_ENTER_MS,
            ease: 'Back.In',
            onComplete: () => this.finish(),
          });
        },
      });
    });

    this.failsafe = this.time.delayedCall(
      HOLD_BEFORE_WALK_MS + WALK_MS + DOOR_ENTER_MS + 1500,
      () => this.finish(),
    );
  }

  /** Ends the interstitial exactly once, whatever got us here. */
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.failsafe?.remove(false);
    this.scene.stop();
    gameEvents.emit('transition:finished', { levelId: this.transitionData.levelId });
  }
}
