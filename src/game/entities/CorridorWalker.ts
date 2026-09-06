import Phaser from 'phaser';
import { walkPose, stepFrequencyHz, stepLengthFor, LEG_LENGTH_RATIO, type WalkPose } from '../systems/walkCycle';
import { walkerPalette, type WalkerPalette } from '../systems/walkerPalette';
import type { VisualMode } from '../core/visualMode';

/**
 * An articulated figure that can actually walk.
 *
 * The characters in this game are drawn as one flattened canvas per state, so there are no
 * limbs to pose and no walk frames to play — a character crossing the corridor by tweening its
 * x would be a sprite sliding on ice, which is exactly what this scene must not look like. So
 * the corridor rebuilds the figure out of separate limbs and drives them from `walkCycle`.
 *
 * Proportions are fractions of the rendered height, so one rig serves any screen size, and the
 * leg length is the same constant the stride length is derived from — that shared number is
 * what keeps the feet planted rather than skating.
 */

/** Proportions, as fractions of total height. */
const TORSO_H = 0.26;
const HEAD_H = 0.225;
const BODY_W = 0.23;
const LIMB_W = 0.085;
const ARM_L = 0.29;
/** Vertical travel of the body over a stride. Small: he is walking, not bouncing. */
const BOB = 0.028;

/** Limbs at rest, for the beats at either end of the corridor where he is standing still. */
const STANDING: WalkPose = {
  leftThigh: 0,
  rightThigh: 0,
  leftKnee: 0,
  rightKnee: 0,
  leftArm: 0,
  rightArm: 0,
  bodyBobY: 0,
  torsoLean: 0.02,
};

function darken(colour: number, factor: number): number {
  const r = Math.floor(((colour >> 16) & 0xff) * factor);
  const g = Math.floor(((colour >> 8) & 0xff) * factor);
  const b = Math.floor((colour & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

export class CorridorWalker {
  /** Root, positioned at the walker's feet. Move this to move him. */
  readonly root: Phaser.GameObjects.Container;

  private readonly body: Phaser.GameObjects.Container;
  private readonly nearLeg: Phaser.GameObjects.Container;
  private readonly farLeg: Phaser.GameObjects.Container;
  private readonly nearKnee: Phaser.GameObjects.Container;
  private readonly farKnee: Phaser.GameObjects.Container;
  private readonly nearBoot: Phaser.GameObjects.Rectangle;
  private readonly farBoot: Phaser.GameObjects.Rectangle;
  private readonly nearArm: Phaser.GameObjects.Container;
  private readonly farArm: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  private readonly height: number;
  private readonly stepLength: number;
  private phase = 0;
  private walking = false;
  private onFootfall?: (x: number) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    floorY: number,
    height: number,
    characterId: string | undefined,
    mode: VisualMode,
  ) {
    this.height = height;
    this.stepLength = stepLengthFor(height);
    const p = walkerPalette(characterId, mode);
    const isClassic = mode === 'classic';

    const legLength = height * LEG_LENGTH_RATIO;
    const hipY = -legLength;
    const shoulderY = hipY - height * TORSO_H;

    // Contact shadow. Outside the bobbing body, so it stays welded to the floor.
    this.shadow = scene.add
      .ellipse(0, 0, height * 0.42, height * 0.075, 0x000000, isClassic ? 0.45 : 0.35)
      .setOrigin(0.5);

    this.body = scene.add.container(0, 0);

    // Far side first, and it stays far: consistent depth reads as a body seen from the side,
    // whereas swapping the legs over each step reads as a glitch.
    this.farArm = this.buildArm(shoulderY, darken(p.limb, 0.62), height);
    this.farLeg = this.buildLeg(hipY, darken(p.legs, 0.62), darken(p.boots, 0.7), legLength, height);
    this.farKnee = this.farLeg.getAt(1) as Phaser.GameObjects.Container;
    this.farBoot = this.farKnee.getAt(1) as Phaser.GameObjects.Rectangle;

    const torso = scene.add
      .rectangle(0, hipY, height * BODY_W, height * TORSO_H, p.torso)
      .setOrigin(0.5, 1);
    if (!isClassic) torso.setStrokeStyle(1, darken(p.torso, 0.55));

    // A belt, so the torso has an internal landmark instead of reading as a slab.
    const belt = scene.add
      .rectangle(0, hipY - height * 0.01, height * BODY_W * 1.04, height * 0.03, darken(p.legs, 0.8))
      .setOrigin(0.5, 1);

    this.head = this.buildHead(shoulderY, p, height, isClassic);

    this.nearLeg = this.buildLeg(hipY, p.legs, p.boots, legLength, height);
    this.nearKnee = this.nearLeg.getAt(1) as Phaser.GameObjects.Container;
    this.nearBoot = this.nearKnee.getAt(1) as Phaser.GameObjects.Rectangle;
    this.nearArm = this.buildArm(shoulderY, p.limb, height);

    this.body.add([this.farArm, this.farLeg, torso, belt, this.head, this.nearLeg, this.nearArm]);

    this.root = scene.add.container(x, floorY, [this.shadow, this.body]);
    this.applyPose();
  }

  /** A thigh with a knee container hanging off it, so the shin follows the thigh. */
  private buildLeg(
    hipY: number,
    legColour: number,
    bootColour: number,
    legLength: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const segment = legLength / 2;
    const thigh = this.scene.add
      .rectangle(0, 0, height * LIMB_W, segment, legColour)
      .setOrigin(0.5, 0);
    const shin = this.scene.add
      .rectangle(0, 0, height * LIMB_W * 0.88, segment, legColour)
      .setOrigin(0.5, 0);
    const boot = this.scene.add
      .rectangle(0, segment, height * LIMB_W * 1.7, height * 0.055, bootColour)
      .setOrigin(0.35, 0);
    const knee = this.scene.add.container(0, segment, [shin, boot]);
    return this.scene.add.container(0, hipY, [thigh, knee]);
  }

  private buildArm(shoulderY: number, colour: number, height: number): Phaser.GameObjects.Container {
    const upper = this.scene.add
      .rectangle(0, 0, height * LIMB_W * 0.85, height * ARM_L, colour)
      .setOrigin(0.5, 0);
    const hand = this.scene.add
      .rectangle(0, height * ARM_L, height * LIMB_W * 1.05, height * LIMB_W * 1.05, darken(colour, 0.6))
      .setOrigin(0.5, 0);
    return this.scene.add.container(0, shoulderY + height * 0.02, [upper, hand]);
  }

  private buildHead(
    shoulderY: number,
    p: WalkerPalette,
    height: number,
    isClassic: boolean,
  ): Phaser.GameObjects.Container {
    const size = height * HEAD_H;
    const face = this.scene.add.rectangle(0, 0, size * 0.85, size, p.skin).setOrigin(0.5, 1);
    // The brim points the way he is going, which is most of what sells "facing right".
    const hat = this.scene.add
      .rectangle(0, -size, size * 0.95, size * 0.3, p.hat)
      .setOrigin(0.5, 0.6);
    const brim = this.scene.add
      .rectangle(size * 0.28, -size * 0.98, size * 0.62, size * 0.14, p.hat)
      .setOrigin(0.5, 0.5);
    const eye = this.scene.add
      .rectangle(size * 0.22, -size * 0.55, size * 0.3, size * 0.16, p.accent)
      .setOrigin(0.5);
    if (!isClassic) eye.setBlendMode('ADD');
    return this.scene.add.container(0, shoulderY + height * 0.02, [face, hat, brim, eye]);
  }

  /** Called as each foot is planted — used for footstep dust and sound. */
  setFootfallHandler(handler: (x: number) => void): void {
    this.onFootfall = handler;
  }

  setWalking(walking: boolean): void {
    this.walking = walking;
  }

  get x(): number {
    return this.root.x;
  }

  set x(value: number) {
    this.root.x = value;
  }

  setDepth(depth: number): this {
    this.root.setDepth(depth);
    return this;
  }

  setAlpha(alpha: number): this {
    this.root.setAlpha(alpha);
    return this;
  }

  /**
   * Advances the gait. `speedPxPerSec` is how fast he is crossing the floor right now, and
   * cadence is derived from it, so however the walk is paced each foot is set down where the
   * ground has arrived under it rather than scuffing along.
   */
  update(dtMs: number, speedPxPerSec: number): void {
    if (this.walking && speedPxPerSec > 0) {
      const stepsPerSecond = stepFrequencyHz(speedPxPerSec, this.stepLength);
      const previous = this.phase;
      // Two steps to a full cycle.
      this.phase += (dtMs / 1000) * (stepsPerSecond / 2);
      this.reportFootfalls(previous, this.phase);
    }
    this.applyPose();
  }

  /** A foot is planted at each full stride — phase .25 and .75. */
  private reportFootfalls(from: number, to: number): void {
    if (!this.onFootfall) return;
    for (const mark of [0.25, 0.75]) {
      if (Math.floor(from - mark) !== Math.floor(to - mark)) this.onFootfall(this.root.x);
    }
  }

  private applyPose(): void {
    const pose = this.walking ? walkPose(this.phase) : STANDING;

    // Phaser rotates clockwise with y pointing down, so a limb hanging from its top swings
    // *forwards* when rotated negative. Negating here lets walkPose stay in ordinary terms.
    this.nearLeg.rotation = -pose.leftThigh;
    this.farLeg.rotation = -pose.rightThigh;
    this.nearKnee.rotation = pose.leftKnee;
    this.farKnee.rotation = pose.rightKnee;
    this.nearArm.rotation = -pose.leftArm;
    this.farArm.rotation = -pose.rightArm;

    // Keep the soles roughly level with the floor rather than pointing wherever the shin does.
    this.nearBoot.rotation = (pose.leftThigh - pose.leftKnee) * 0.75;
    this.farBoot.rotation = (pose.rightThigh - pose.rightKnee) * 0.75;

    this.body.y = pose.bodyBobY * this.height * BOB;
    this.body.rotation = pose.torsoLean * 0.35;
    this.head.rotation = -pose.torsoLean * 0.5;

    // The shadow tightens as he rises, which is what makes the bob read as vertical movement
    // instead of the whole figure drifting up the screen.
    const lift = 1 - pose.bodyBobY * 0.25;
    this.shadow.setScale(lift, lift);
  }

  destroy(): void {
    this.root.destroy();
  }
}
