// NOTE: `Phaser` is imported as a type only. Touching the Phaser namespace as a *value*
// (e.g. `Phaser.Input.Keyboard.JustDown`, `Phaser.Input.Keyboard.KeyCodes.ESC`) would pull the
// entire Phaser runtime (renderer, WebGL, audio, device-capability probing) into any module
// that imports this file, including tests/InputController.test.ts's unit tests for the pure
// `mergeInputState` function below. That runtime is unsafe to evaluate under Vitest/jsdom (it
// crashes probing a real 2D canvas context and requires optional native deps like
// phaser3spectorjs). All Phaser access here therefore goes through the `scene` instance
// (constructor-injected, itself typed only) rather than the imported namespace, and the ESC
// key code is inlined as a literal instead of referencing `Phaser.Input.Keyboard.KeyCodes.ESC`.
import type Phaser from 'phaser';

const ESC_KEY_CODE = 27; // Phaser.Input.Keyboard.KeyCodes.ESC

export interface FullInputState {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  pausePressed: boolean;
}

export function mergeInputState(keyboard: FullInputState, virtual: Partial<FullInputState>): FullInputState {
  return {
    left: keyboard.left || !!virtual.left,
    right: keyboard.right || !!virtual.right,
    jumpPressed: keyboard.jumpPressed || !!virtual.jumpPressed,
    jumpHeld: keyboard.jumpHeld || !!virtual.jumpHeld,
    pausePressed: keyboard.pausePressed || !!virtual.pausePressed,
  };
}

export class InputController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private escKey: Phaser.Input.Keyboard.Key;
  private virtual: Partial<FullInputState> = {};
  private wasJumpKeyDown = false;
  private wasEscKeyDown = false;

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      left: scene.input.keyboard!.addKey('A'),
      right: scene.input.keyboard!.addKey('D'),
    };
    this.escKey = scene.input.keyboard!.addKey(ESC_KEY_CODE);
  }

  setVirtualState(partial: Partial<FullInputState>): void {
    this.virtual = { ...this.virtual, ...partial };
  }

  getState(): FullInputState {
    const jumpIsDown = this.cursors.up.isDown;
    const jumpPressed = jumpIsDown && !this.wasJumpKeyDown;
    this.wasJumpKeyDown = jumpIsDown;

    const escIsDown = this.escKey.isDown;
    const escPressed = escIsDown && !this.wasEscKeyDown;
    this.wasEscKeyDown = escIsDown;

    const keyboard: FullInputState = {
      left: this.cursors.left.isDown || this.wasd.left.isDown,
      right: this.cursors.right.isDown || this.wasd.right.isDown,
      jumpPressed,
      jumpHeld: jumpIsDown,
      pausePressed: escPressed,
    };
    const merged = mergeInputState(keyboard, this.virtual);
    // Edge-triggered virtual jump/pause is consumed once per read so a held touch button
    // doesn't repeat-jump or repeat-pause.
    if (this.virtual.jumpPressed) this.virtual.jumpPressed = false;
    if (this.virtual.pausePressed) this.virtual.pausePressed = false;
    return merged;
  }
}
