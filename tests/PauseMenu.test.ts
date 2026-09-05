import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, type GameEvents } from '../src/game/core/EventBus';
import { PauseMenu } from '../src/ui/PauseMenu';

describe('PauseMenu', () => {
  let bus: EventBus<GameEvents>;
  let root: HTMLElement;

  beforeEach(() => {
    bus = new EventBus<GameEvents>();
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('emits game:resume when Resume is clicked', () => {
    const menu = new PauseMenu(bus);
    menu.mount(root);
    let resumed = false;
    bus.on('game:resume', () => (resumed = true));
    (root.querySelector('[data-pause="resume"]') as HTMLButtonElement).click();
    expect(resumed).toBe(true);
  });

  it('exposes Restart and Exit-to-menu buttons', () => {
    const menu = new PauseMenu(bus);
    menu.mount(root);
    expect(root.querySelector('[data-pause="restart"]')).not.toBeNull();
    expect(root.querySelector('[data-pause="exit"]')).not.toBeNull();
  });
});
