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
    // A dedicated corridor brick so the interstitial can read boldly (the original's bright
    // blue passage) without changing how in-level platforms look. Falls back to the platform
    // tile if the art has not been registered.
    const brickKey = this.textures.exists('transition_brick')
      ? resolveTextureKey('transition_brick', mode, (k) => this.textures.exists(k))
      : resolveTextureKey('platform_tile', mode, (k) => this.textures.exists(k));
    const doorKey = resolveTextureKey('goal_door', mode, (k) => this.textures.exists(k));

    this.cameras.main.setBackgroundColor('#000000');

    // --- Corridor: brick ceiling and floor with a dark passage between them ---
    const corridorTop = height * 0.34;
    const corridorHeight = height * 0.2;
    const bandHeight = 72;
    this.add.tileSprite(width / 2, corridorTop - bandHeight / 2, width, bandHeight, brickKey).setOrigin(0.5);
    this.add
      .tileSprite(width / 2, corridorTop + corridorHeight + bandHeight / 2, width, bandHeight, brickKey)
      .setOrigin(0.5);

    const floorY = corridorTop + corridorHeight;

    // --- The next level's door, at the far left, as in the original ---
    const door = this.add.sprite(96, floorY - 34, doorKey).setOrigin(0.5, 1);
    door.setDisplaySize(64, 84);

    // --- Dave, entering from the right ---
    const characterId = getSelectedCharacterId();
    const textureFor = (state: 'idle' | 'run') =>
      resolvePlayerTextureKey(state, characterId, mode, (k) => this.textures.exists(k));
    const dave = this.add.sprite(width * 0.62, floorY - 4, textureFor('idle')).setOrigin(0.5, 1);
    dave.setDisplaySize(38, 50);
    dave.setFlipX(true); // facing the door

    // --- Banner ---
    const banner = this.add
      .text(width / 2, corridorTop - bandHeight - 34, this.transitionData.title, {
        fontFamily: 'monospace',
        fontSize: '30px',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const sub = this.add
      .text(width / 2, corridorTop - bandHeight + 4, this.transitionData.subtitle, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: [banner, sub], alpha: 1, duration: 260, ease: 'Quad.Out' });

    // Any input skips straight to the next level — never trap a player in a cutscene.
    this.input.keyboard?.once('keydown', () => this.finish());
    this.input.once('pointerdown', () => this.finish());

    // --- Choreography: pause, walk to the door, step through ---
    this.time.delayedCall(HOLD_BEFORE_WALK_MS, () => {
      if (this.finished) return;
      dave.setTexture(textureFor('run'));
      audioSystem.playSfx('jump');

      this.tweens.add({
        targets: dave,
        x: door.x + 6,
        duration: WALK_MS,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (this.finished) return;
          audioSystem.playSfx('levelComplete');
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

    // Failsafe: if any beat above never lands (a missing texture, an interrupted tween, a
    // backgrounded tab), this still releases the game rather than leaving it stuck here.
    this.failsafe = this.time.delayedCall(
      HOLD_BEFORE_WALK_MS + WALK_MS + DOOR_ENTER_MS + 1200,
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
