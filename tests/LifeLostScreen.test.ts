import { describe, it, expect, beforeEach } from 'vitest';
import { LifeLostScreen } from '../src/ui/LifeLostScreen';

describe('LifeLostScreen', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('announces that a life was lost', () => {
    const screen = new LifeLostScreen({ livesRemaining: 2 });
    screen.mount(root);
    expect(root.querySelector('[data-lifelost="title"]')?.textContent).toContain('LIFE LOST');
  });

  it('shows one filled pip per remaining life and an empty pip per life spent', () => {
    const screen = new LifeLostScreen({ livesRemaining: 2 });
    screen.mount(root);
    const pips = root.querySelector('[data-lifelost="pips"]')!;
    expect(pips.querySelectorAll('.life-pip--held')).toHaveLength(2);
    expect(pips.querySelectorAll('.life-pip--lost')).toHaveLength(1);
  });

  it('calls out the final life explicitly rather than just showing a count', () => {
    const screen = new LifeLostScreen({ livesRemaining: 1 });
    screen.mount(root);
    expect(root.querySelector('[data-lifelost="remaining"]')?.textContent).toContain('LAST LIFE');
  });

  it('removes itself from the DOM when destroyed', () => {
    const screen = new LifeLostScreen({ livesRemaining: 2 });
    screen.mount(root);
    screen.destroy();
    expect(root.querySelector('[data-lifelost="title"]')).toBeNull();
  });
});
