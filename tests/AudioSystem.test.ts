import { describe, it, expect, vi } from 'vitest';
import { AudioSystem } from '../src/game/systems/AudioSystem';

function fakeAudioContext() {
  const oscillator = { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 }, type: 'sine' };
  const gainNode = { connect: vi.fn(), gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } };
  return {
    currentTime: 0,
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gainNode),
    destination: {},
  } as unknown as AudioContext;
}

describe('AudioSystem', () => {
  it('clamps music volume to [0, 1]', () => {
    const audio = new AudioSystem(fakeAudioContext());
    audio.setMusicVolume(1.5);
    expect(audio.getMusicVolume()).toBe(1);
    audio.setMusicVolume(-0.5);
    expect(audio.getMusicVolume()).toBe(0);
  });

  it('clamps sfx volume to [0, 1]', () => {
    const audio = new AudioSystem(fakeAudioContext());
    audio.setSfxVolume(2);
    expect(audio.getSfxVolume()).toBe(1);
  });

  it('does not play a tone when muted', () => {
    const ctx = fakeAudioContext();
    const audio = new AudioSystem(ctx);
    audio.setMuted(true);
    audio.playSfx('jump');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('plays a tone when not muted', () => {
    const ctx = fakeAudioContext();
    const audio = new AudioSystem(ctx);
    audio.playSfx('jump');
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});
