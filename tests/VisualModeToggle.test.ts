import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VisualModeToggle } from '../src/ui/VisualModeToggle';
import { DEFAULT_VISUAL_MODE, getVisualMode, setVisualMode } from '../src/game/core/visualMode';

describe('VisualModeToggle', () => {
  let root: HTMLElement;
  let toggle: VisualModeToggle;

  beforeEach(() => {
    setVisualMode(DEFAULT_VISUAL_MODE);
    root = document.createElement('div');
    document.body.appendChild(root);
    toggle = new VisualModeToggle();
    toggle.mount(root);
  });

  afterEach(() => {
    toggle.destroy();
    root.remove();
    setVisualMode(DEFAULT_VISUAL_MODE);
  });

  const label = () => root.querySelector('[data-visual-toggle="label"]')?.textContent;
  const button = () => root.querySelector('[data-visual-toggle="button"]') as HTMLButtonElement;

  it('shows the active mode', () => {
    expect(label()).toBe('CURRENT VISUAL');
  });

  it('switches mode when clicked and reflects it in the label', () => {
    button().click();
    expect(getVisualMode()).toBe('classic');
    expect(label()).toBe('CLASSIC DAVE');
  });

  it('switches back on a second click', () => {
    button().click();
    button().click();
    expect(getVisualMode()).toBe('current');
    expect(label()).toBe('CURRENT VISUAL');
  });

  it('follows mode changes made elsewhere, rather than tracking its own copy of the state', () => {
    setVisualMode('classic');
    expect(label()).toBe('CLASSIC DAVE');
  });

  it('toggles on the T shortcut', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    expect(getVisualMode()).toBe('classic');
  });

  it('ignores the shortcut while typing in a field', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
    expect(getVisualMode()).toBe('current');
    input.remove();
  });

  it('stops responding once destroyed, leaving no orphaned listeners', () => {
    toggle.destroy();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    expect(getVisualMode()).toBe('current');
  });
});
