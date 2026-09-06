import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { audioSystem } from '../core/audio';
import { getVisualMode } from '../core/visualMode';
import { resolveTextureKey } from '../systems/VisualSkinner';
import { getSelectedCharacterId } from '../characters/selection';
import { ensureObjectiveTextures } from '../systems/WeaponPlaceholders';
import { CorridorWalker } from '../entities/CorridorWalker';
import { corridorLayout, walkDurationMs, type CorridorLayout } from '../../utils/corridorLayout';

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

/** Beat lengths, in ms. The walk itself is sized from the corridor — see `walkDurationMs`. */
const LEFT_DOOR_OPEN_MS = 620;
/** How long he stands in the doorway before setting off. */
const STEP_OUT_MS = 340;
/** The right-hand door swinging open once he arrives. */
const RIGHT_DOOR_OPEN_MS = 300;
/** Walking into the doorway and out of sight. */
const ENTER_MS = 720;

/** Palette per presentation mode. Structure is identical; only the skin changes. */
interface CorridorSkin {
  background: number;
  ceilingTint: number;
  wallTint: number;
  floorTint: number;
  trim: number;
  /** Light coming through an open door. */
  light: number;
  lightCss: string;
  titleCss: string;
  bodyCss: string;
  titleFont: string;
}

const SKINS: Record<'classic' | 'current', CorridorSkin> = {
  // The original's bright blue brick passage, on black, lit by warm doorway light.
  classic: {
    background: 0x000018,
    ceilingTint: 0xa0a0ff,
    wallTint: 0x5f5fd8,
    floorTint: 0xd6d6ff,
    trim: 0x6b6bff,
    light: 0xffcc55,
    lightCss: '#ffcc55',
    titleCss: '#ffd700',
    bodyCss: '#ffffff',
    titleFont: 'monospace',
  },
  current: {
    background: 0x05060f,
    ceilingTint: 0x77839f,
    wallTint: 0x4c5677,
    floorTint: 0xa7b0c8,
    trim: 0x00f0ff,
    light: 0x7fe9ff,
    lightCss: '#7fe9ff',
    titleCss: '#ffd700',
    bodyCss: '#e6ecff',
    titleFont: '"Share Tech Mono", monospace',
  },
};

/** One doorway: frame, opening, light, and the leaf that swings out of the way. */
interface CorridorDoor {
  open(scene: Phaser.Scene, durationMs: number): void;
  /** Shuts it again — the level he just left closing behind him. */
  close(scene: Phaser.Scene, durationMs: number): void;
  /** 0–1, how close the walker is. Drives the anticipatory glow on the destination door. */
  setApproach(nearness: number): void;
}

/**
 * The between-levels corridor.
 *
 * Structurally this is the original's interstitial: the player leaves the door of the level
 * they just cleared, walks the passage, and steps into the door of the next one, with
 * "GOOD WORK! ONLY N MORE TO GO." underneath. It is a real scene rather than a card because the
 * player is *in* it, and the walk is a real articulated gait rather than a sliding sprite —
 * see `CorridorWalker`.
 *
 * Both presentation modes share this exact structure. Only the palette, the lighting and the
 * particle work differ, which is why the skin is a lookup rather than a branch in the layout.
 *
 * Contract: it always finishes. Every path — the walk completing, the player skipping, or a
 * beat failing — ends in `finish()` exactly once, so the game can never wedge here.
 */
export class LevelTransitionScene extends Phaser.Scene {
  private transitionData!: LevelTransitionData;
  private finished = false;
  private failsafe?: Phaser.Time.TimerEvent;

  private layout!: CorridorLayout;
  private skin!: CorridorSkin;
  private walker?: CorridorWalker;
  private rightDoor?: CorridorDoor;
  private lastWalkerX = 0;
  private isClassic = false;

  constructor() {
    super('LevelTransition');
  }

  init(data: LevelTransitionData): void {
    this.transitionData = data;
    this.finished = false;
    this.walker = undefined;
    this.rightDoor = undefined;
  }

  create(): void {
    ensureObjectiveTextures(this);

    const { width, height } = this.scale;
    const mode = getVisualMode();
    this.isClassic = mode === 'classic';
    this.skin = SKINS[this.isClassic ? 'classic' : 'current'];
    this.layout = corridorLayout(width, height);

    const brickKey = this.textures.exists('transition_brick')
      ? resolveTextureKey('transition_brick', mode, (k) => this.textures.exists(k))
      : resolveTextureKey('platform_tile', mode, (k) => this.textures.exists(k));
    const doorKey = resolveTextureKey('goal_door', mode, (k) => this.textures.exists(k));

    this.cameras.main.setBackgroundColor(this.skin.background);
    this.buildCorridor(brickKey);

    // Two doors, and which is which is the whole point of the shot: the one he came out of,
    // and the one he is going to.
    const data = this.transitionData;
    const leftDoor = this.buildDoor(
      this.layout.leftDoorX,
      doorKey,
      'exit',
      `LEVEL ${data.levelNumber} — CLEARED`,
    );
    this.rightDoor = this.buildDoor(
      this.layout.rightDoorX,
      doorKey,
      'entrance',
      data.isVictory ? 'CAMPAIGN COMPLETE' : `LEVEL ${data.levelNumber + 1} →`,
    );

    this.walker = new CorridorWalker(
      this,
      this.layout.walkStartX,
      this.layout.doorBaseY,
      this.layout.walkerHeight,
      getSelectedCharacterId(),
      mode,
    );
    this.walker.setDepth(30).setAlpha(0);
    this.walker.setFootfallHandler((x) => this.onFootfall(x));
    this.lastWalkerX = this.walker.x;

    const text = this.buildMessage();

    // Skipping is always available, and always lands in the same place as finishing.
    this.input.keyboard?.once('keydown', () => this.finish());
    this.input.once('pointerdown', () => this.finish());

    this.playChoreography(leftDoor, text);
  }

  /* ------------------------------------------------------------------ */
  /*  ARCHITECTURE                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Ceiling, back wall and floor, banded horizontally.
   *
   * The strong horizontal composition is what makes this read as a corridor rather than as a
   * loading screen: a lit floor and ceiling running the full width, a darker recessed wall
   * between them, and the whole thing closed in by shadow at the edges of frame.
   */
  private buildCorridor(brickKey: string): void {
    const { width, height } = this.scale;
    const { ceilingY, floorY } = this.layout;
    const skin = this.skin;

    this.add.rectangle(width / 2, height / 2, width, height, skin.background).setDepth(0);

    // Back wall: the darkest band, so the doors set into it read as openings.
    this.add
      .tileSprite(width / 2, (ceilingY + floorY) / 2, width, floorY - ceilingY, brickKey)
      .setTint(skin.wallTint)
      .setDepth(1);

    // Ceiling and floor, brighter, to bracket the passage.
    this.add
      .tileSprite(width / 2, ceilingY / 2, width, ceilingY, brickKey)
      .setTint(skin.ceilingTint)
      .setDepth(2);
    this.add
      .tileSprite(width / 2, (floorY + height) / 2, width, height - floorY, brickKey)
      .setTint(skin.floorTint)
      .setDepth(2);

    // Trim along both edges of the passage — a hard line where the planes meet.
    for (const y of [ceilingY, floorY]) {
      this.add.rectangle(width / 2, y, width, 3, skin.trim).setAlpha(0.85).setDepth(4);
    }

    // Pilasters: evenly spaced piers down the back wall. They give the corridor a rhythm to
    // walk past, which is most of what sells depth on a flat, side-on background.
    const bays = 7;
    for (let i = 0; i <= bays; i++) {
      const x = (width / bays) * i;
      if (Math.abs(x - this.layout.leftDoorX) < 90 || Math.abs(x - this.layout.rightDoorX) < 90) {
        continue;
      }
      this.add
        .rectangle(x, (ceilingY + floorY) / 2, 16, floorY - ceilingY, 0x000000, 0.32)
        .setDepth(3);
      this.add
        .rectangle(x + 9, (ceilingY + floorY) / 2, 3, floorY - ceilingY, skin.trim, 0.14)
        .setDepth(3);
    }

    // A sheen on the near edge of the floor. Without it the floor band is just more wall:
    // this is the cue that says the plane has turned and is coming towards the viewer.
    const sheen = this.add.graphics().setDepth(3);
    sheen.fillGradientStyle(skin.trim, skin.trim, skin.trim, skin.trim, 0.16, 0.16, 0, 0);
    sheen.fillRect(0, floorY, width, 46);

    this.addAmbientLighting();
    this.addVignette();
  }

  /** Unseen sources overhead, pooling light on the wall and floor. */
  private addAmbientLighting(): void {
    const { width } = this.scale;
    const { ceilingY, floorY } = this.layout;
    const pools = 3;
    for (let i = 1; i <= pools; i++) {
      const x = (width / (pools + 1)) * i;

      // The fixture the light is coming from. Cheap, but without it the pools read as smudges
      // rather than as lamps, and the corridor stops looking like somewhere that was built.
      this.add.rectangle(x, ceilingY, 8, 13, 0x0b0d16).setOrigin(0.5, 0).setDepth(5);
      this.add
        .rectangle(x, ceilingY + 13, 30, 7, this.skin.light, 0.9)
        .setOrigin(0.5, 0)
        .setDepth(5);
      this.add
        .ellipse(x, ceilingY + 17, 54, 20, this.skin.light, 0.3)
        .setBlendMode('ADD')
        .setDepth(5);

      this.add
        .ellipse(x, ceilingY + 14, 190, 52, this.skin.light, this.isClassic ? 0.1 : 0.07)
        .setBlendMode('ADD')
        .setDepth(5);
      this.add
        .ellipse(x, floorY + 16, 150, 26, this.skin.light, this.isClassic ? 0.08 : 0.06)
        .setBlendMode('ADD')
        .setDepth(5);
    }

    // Slow motes drifting through the light. Modern only — classic keeps its flat, hard look.
    if (!this.isClassic && this.textures.exists('particle')) {
      this.add
        .particles(0, 0, 'particle', {
          x: { min: 0, max: width },
          y: { min: ceilingY, max: floorY },
          speedY: { min: -9, max: -2 },
          speedX: { min: -5, max: 5 },
          scale: { start: 0.16, end: 0 },
          alpha: { start: 0.22, end: 0 },
          lifespan: 5200,
          frequency: 220,
          blendMode: 'ADD',
        })
        .setDepth(6);
    }
  }

  /** Shadow closing in on all four sides, so the passage recedes instead of stopping at frame. */
  private addVignette(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(45);
    // Deliberately lighter than a photographic vignette: it has to close the frame in without
    // erasing the brickwork, which is most of what makes the passage look built.
    const fade = 118;

    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.88, 0.88, 0, 0);
    g.fillRect(0, 0, width, this.layout.ceilingY * 0.62);

    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.9, 0.9);
    g.fillRect(0, height - 118, width, 118);

    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.78, 0, 0.78, 0);
    g.fillRect(0, 0, fade, height);

    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.78, 0, 0.78);
    g.fillRect(width - fade, 0, fade, height);
  }

  /**
   * A doorway: stone frame, dark opening, a leaf that slides aside, and the light behind it.
   *
   * Both doors are built the same way and from the same art as the exit door in the level, so
   * the player recognises what they are looking at without being told.
   */
  private buildDoor(
    x: number,
    doorKey: string,
    kind: 'exit' | 'entrance',
    caption: string,
  ): CorridorDoor {
    const { doorWidth, doorHeight, doorBaseY } = this.layout;
    const skin = this.skin;

    // Frame.
    this.add
      .rectangle(x, doorBaseY + 4, doorWidth * 1.22, doorHeight * 1.1, 0x000000, 0.55)
      .setOrigin(0.5, 1)
      .setDepth(9);
    this.add
      .rectangle(x, doorBaseY, doorWidth * 1.16, doorHeight * 1.06, skin.wallTint)
      .setOrigin(0.5, 1)
      .setStrokeStyle(2, skin.trim, 0.6)
      .setDepth(10);

    // The opening, and the light behind it. Dark until the door is opened.
    this.add
      .rectangle(x, doorBaseY, doorWidth, doorHeight, 0x000000)
      .setOrigin(0.5, 1)
      .setDepth(11);
    // Light coming *through* the opening. A soft blob rather than a filled rectangle: a flat
    // panel of colour reads as a painted door, whereas this reads as a lit space beyond it.
    const lightCore = this.textures.exists('particle')
      ? this.add
          .image(x, doorBaseY - doorHeight * 0.5, 'particle')
          .setDisplaySize(doorWidth * 1.15, doorHeight * 1.05)
          .setTint(skin.light)
          .setAlpha(0)
          .setBlendMode('ADD')
          .setDepth(12)
      : this.add
          .rectangle(x, doorBaseY, doorWidth * 0.9, doorHeight * 0.9, skin.light)
          .setOrigin(0.5, 1)
          .setAlpha(0)
          .setDepth(12);

    // A narrow shaft up the middle of the doorway, which gives the light a direction. Built
    // from the soft particle blob rather than a rectangle: a hard-edged bar of colour reads as
    // a strip light bolted to the door, not as light coming through it.
    const beam = this.textures.exists('particle')
      ? this.add
          .image(x, doorBaseY - doorHeight * 0.46, 'particle')
          .setDisplaySize(doorWidth * 0.5, doorHeight * 0.96)
          .setTint(skin.light)
          .setAlpha(0)
          .setBlendMode('ADD')
          .setDepth(12)
      : this.add
          .rectangle(x, doorBaseY, doorWidth * 0.34, doorHeight * 0.82, skin.light)
          .setOrigin(0.5, 1)
          .setAlpha(0)
          .setBlendMode('ADD')
          .setDepth(12);

    // Light thrown forward onto the floor.
    const spill = this.add
      .ellipse(x, doorBaseY + 10, doorWidth * 2.1, 42, skin.light, 1)
      .setAlpha(0)
      .setBlendMode('ADD')
      .setDepth(13);

    // Halo around the frame — used for the destination door's anticipatory glow.
    const halo = this.textures.exists('particle')
      ? this.add
          .image(x, doorBaseY - doorHeight / 2, 'particle')
          .setDisplaySize(doorWidth * 3.2, doorHeight * 2.2)
          .setTint(skin.light)
          .setAlpha(0)
          .setBlendMode('ADD')
          .setDepth(8)
      : null;

    // Signage over the doorway. Without it both doors are the same object and nothing tells
    // the player which one they came out of and which one they are walking towards — the one
    // thing this scene exists to communicate.
    this.add
      .text(x, doorBaseY - doorHeight * 1.06 - 15, caption, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: kind === 'entrance' ? skin.lightCss : '#7b8497',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setAlpha(kind === 'entrance' ? 0.95 : 0.6)
      .setDepth(16);

    // The leaf. Hinged at the left edge of the opening so it slides aside rather than
    // shrinking into its own middle, which is what makes it read as a door and not a fade.
    const leaf = this.add
      .sprite(x - doorWidth / 2, doorBaseY, doorKey)
      .setOrigin(0, 1)
      .setDepth(14);
    leaf.setDisplaySize(doorWidth, doorHeight);
    const leafScaleX = leaf.scaleX;

    // Drawn over the whole doorway and faded in when the door shuts, so the level he has left
    // goes dark behind him. Without it the spent door keeps glowing as brightly as the one he
    // is walking towards, and the composition pulls the eye backwards.
    const spent = this.add
      .rectangle(x, doorBaseY, doorWidth * 1.18, doorHeight * 1.08, 0x000000)
      .setOrigin(0.5, 1)
      .setAlpha(0)
      .setDepth(15);

    return {
      open: (scene, durationMs) => {
        scene.tweens.add({
          targets: leaf,
          scaleX: leafScaleX * 0.09,
          duration: durationMs,
          ease: 'Cubic.easeInOut',
        });
        scene.tweens.add({
          targets: lightCore,
          alpha: kind === 'exit' ? 0.7 : 0.85,
          duration: durationMs,
          ease: 'Sine.easeOut',
        });
        scene.tweens.add({
          targets: beam,
          alpha: kind === 'exit' ? 0.3 : 0.42,
          duration: durationMs * 1.1,
          ease: 'Sine.easeOut',
        });
        scene.tweens.add({
          targets: spill,
          alpha: 0.42,
          scaleY: 1.25,
          duration: durationMs * 1.2,
          ease: 'Sine.easeOut',
        });
        if (halo) {
          scene.tweens.add({ targets: halo, alpha: 0.42, duration: durationMs, ease: 'Sine.easeOut' });
        }
        // Dust knocked loose as it opens.
        if (this.textures.exists('particle')) {
          const dust = this.add.particles(x, doorBaseY, 'particle', {
            speedX: { min: -26, max: 26 },
            speedY: { min: -46, max: -8 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 900,
            quantity: 2,
            frequency: 40,
            blendMode: 'ADD',
            tint: skin.light,
          });
          dust.setDepth(15);
          this.time.delayedCall(420, () => dust.stop());
          this.time.delayedCall(1600, () => dust.destroy());
        }
      },
      close: (scene, durationMs) => {
        scene.tweens.add({
          targets: leaf,
          scaleX: leafScaleX,
          duration: durationMs,
          ease: 'Cubic.easeInOut',
        });
        scene.tweens.add({
          targets: [lightCore, beam, spill, ...(halo ? [halo] : [])],
          alpha: 0,
          duration: durationMs,
          ease: 'Sine.easeIn',
        });
        scene.tweens.add({
          targets: spent,
          alpha: 0.55,
          duration: durationMs * 1.3,
          ease: 'Sine.easeIn',
        });
      },
      setApproach: (nearness) => {
        if (halo) halo.setAlpha(Math.max(Number(halo.alpha), nearness * 0.5));
        lightCore.setAlpha(Math.max(Number(lightCore.alpha), nearness * 0.32));
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  TYPOGRAPHY                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * The banner sits below the floor line and the campaign progress above the ceiling, so
   * neither can ever land on the walker or on a door — the two things the shot is about.
   */
  private buildMessage(): Phaser.GameObjects.GameObject[] {
    const { width } = this.scale;
    const { messageY } = this.layout;
    const data = this.transitionData;
    const skin = this.skin;

    // A scrim, so the text stays legible over whatever the floor is doing behind it.
    this.add
      .rectangle(width / 2, messageY + 18, width, 104, 0x000000, 0.55)
      .setDepth(46);

    const title = this.add
      .text(width / 2, messageY, data.title, {
        fontFamily: skin.titleFont,
        fontSize: this.isClassic ? '32px' : '36px',
        color: skin.titleCss,
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setAlpha(0)
      .setScale(0.82);

    const subtitle = this.add
      .text(width / 2, messageY + 36, data.subtitle, {
        fontFamily: 'monospace',
        fontSize: '21px',
        color: skin.bodyCss,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setAlpha(0);

    // Campaign progress and run stats, kept small and high so they read as chrome.
    let dots = '';
    for (let i = 1; i <= data.totalLevels; i++) dots += i <= data.levelNumber ? '● ' : '○ ';
    const progress = this.add
      .text(width / 2, 26, dots.trim(), {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: skin.lightCss,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setAlpha(0);

    const stats = this.add
      .text(
        width / 2,
        48,
        `SCORE ${data.score}   TIME ${Math.floor(data.timeSeconds)}s   GEMS ${data.gemsCollected}/${data.gemsTotal}`,
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#9aa3b8',
          stroke: '#000000',
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5)
      .setDepth(50)
      .setAlpha(0);

    return [title, subtitle, progress, stats];
  }

  /* ------------------------------------------------------------------ */
  /*  CHOREOGRAPHY                                                      */
  /* ------------------------------------------------------------------ */

  private playChoreography(leftDoor: CorridorDoor, text: Phaser.GameObjects.GameObject[]): void {
    const walker = this.walker;
    if (!walker) return;

    const [title, subtitle, progress, stats] = text;
    const walkMs = walkDurationMs(this.layout.walkDistance);

    // A gentle push in and drift across the walk. Subtle by design: enough to feel like a
    // camera, not enough to be noticed as one.
    this.cameras.main.setZoom(1.05);
    this.cameras.main.setScroll(-5, 0);

    // 1. The door he just came through opens, and he steps out of the light.
    leftDoor.open(this, LEFT_DOOR_OPEN_MS);
    audioSystem.playSfx('checkpoint');

    this.time.delayedCall(LEFT_DOOR_OPEN_MS * 0.45, () => {
      if (this.finished) return;
      this.tweens.add({ targets: walker.root, alpha: 1, duration: 260, ease: 'Sine.easeOut' });
    });

    // 2. He walks. The tween owns his position; his cadence is derived from how fast he is
    //    actually moving each frame (see `update`), so the easing at either end slows his
    //    legs down with him instead of letting the feet skate.
    this.time.delayedCall(LEFT_DOOR_OPEN_MS + STEP_OUT_MS, () => {
      if (this.finished) return;
      walker.setWalking(true);

      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.02,
        scrollX: 5,
        duration: walkMs,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: walker.root,
        x: this.layout.walkEndX,
        duration: walkMs,
        ease: 'Sine.easeInOut',
        onComplete: () => this.enterNextDoor(),
      });

      // The door he came from shuts behind him. It is what makes the left-hand door read as
      // somewhere he has left rather than somewhere he might go back to.
      this.time.delayedCall(520, () => {
        if (this.finished) return;
        leftDoor.close(this, 460);
      });

      this.revealMessage([title, subtitle, progress, stats]);
    });

    this.failsafe = this.time.delayedCall(
      LEFT_DOOR_OPEN_MS + STEP_OUT_MS + walkMs + RIGHT_DOOR_OPEN_MS + ENTER_MS + 1800,
      () => this.finish(),
    );
  }

  private revealMessage(text: Phaser.GameObjects.GameObject[]): void {
    const [title, subtitle, progress, stats] = text;
    audioSystem.playSfx('textReveal');
    this.tweens.add({
      targets: title,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 380,
      ease: 'Back.Out',
    });
    this.time.delayedCall(220, () => {
      if (this.finished) return;
      audioSystem.playSfx('textReveal');
      this.tweens.add({
        targets: [subtitle, progress, stats],
        alpha: 1,
        y: '+=4',
        duration: 420,
        ease: 'Power2',
      });
    });
  }

  /** He arrives, the destination door opens, and he walks into it rather than fading out. */
  private enterNextDoor(): void {
    if (this.finished) return;
    const walker = this.walker;
    if (!walker) return;

    this.rightDoor?.open(this, RIGHT_DOOR_OPEN_MS);
    audioSystem.playSfx('levelComplete');

    this.time.delayedCall(RIGHT_DOOR_OPEN_MS, () => {
      if (this.finished) return;
      // Still walking, still on his feet: he goes *through* the doorway and the light takes
      // him, which is the beat that says "into the next level" rather than "scene over".
      this.tweens.add({
        targets: walker.root,
        x: this.layout.walkEndX + this.layout.doorWidth * 0.34,
        alpha: 0,
        scaleX: 0.86,
        scaleY: 0.86,
        duration: ENTER_MS,
        ease: 'Sine.easeIn',
        onComplete: () => this.finish(),
      });
    });
  }

  /** Dust kicked up as a foot lands, plus the soft heel-thud. */
  private onFootfall(x: number): void {
    if (this.finished) return;
    audioSystem.playSfx('footstep');
    if (!this.textures.exists('particle')) return;

    const puff = this.add
      .image(x + Phaser.Math.Between(-6, 6), this.layout.doorBaseY - 2, 'particle')
      .setDisplaySize(12, 7)
      .setTint(this.skin.floorTint)
      .setAlpha(this.isClassic ? 0.4 : 0.32)
      .setDepth(29);
    this.tweens.add({
      targets: puff,
      y: puff.y - 12,
      x: puff.x - 14,
      alpha: 0,
      scaleX: 2.4,
      scaleY: 1.8,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => puff.destroy(),
    });
  }

  update(_time: number, delta: number): void {
    const walker = this.walker;
    if (!walker || this.finished) return;

    // Cadence comes from the distance actually covered this frame, so the gait stays locked to
    // the movement under every easing curve the choreography uses.
    const x = walker.x;
    const speed = delta > 0 ? Math.abs(x - this.lastWalkerX) / (delta / 1000) : 0;
    this.lastWalkerX = x;
    walker.update(delta, speed);

    // The destination door notices him coming.
    const reach = Math.max(1, this.layout.walkDistance * 0.55);
    const nearness = Phaser.Math.Clamp(1 - Math.abs(this.layout.rightDoorX - x) / reach, 0, 1);
    this.rightDoor?.setApproach(nearness);
  }

  /** Ends the interstitial exactly once, whatever got us here. */
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.failsafe?.remove(false);
    this.walker = undefined;
    this.rightDoor = undefined;
    this.cameras.main.setZoom(1).setScroll(0, 0);
    this.scene.stop();
    gameEvents.emit('transition:finished', { levelId: this.transitionData.levelId });
  }
}
