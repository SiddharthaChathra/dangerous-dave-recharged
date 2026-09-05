export type SfxName = 'jump' | 'collect' | 'damage' | 'enemyDefeat' | 'checkpoint' | 'levelComplete' | 'uiClick';

const SFX_PROFILE: Record<SfxName, { freq: number; durationSeconds: number; type: OscillatorType }> = {
  jump: { freq: 520, durationSeconds: 0.12, type: 'square' },
  collect: { freq: 880, durationSeconds: 0.1, type: 'sine' },
  damage: { freq: 140, durationSeconds: 0.25, type: 'sawtooth' },
  enemyDefeat: { freq: 260, durationSeconds: 0.18, type: 'triangle' },
  checkpoint: { freq: 660, durationSeconds: 0.2, type: 'sine' },
  levelComplete: { freq: 990, durationSeconds: 0.4, type: 'sine' },
  uiClick: { freq: 400, durationSeconds: 0.06, type: 'square' },
};

export class AudioSystem {
  private musicVolume = 0.6;
  private sfxVolume = 0.8;
  private muted = false;

  constructor(private readonly context: AudioContext) {}

  setMusicVolume(value: number): void {
    this.musicVolume = Math.max(0, Math.min(1, value));
  }
  getMusicVolume(): number {
    return this.musicVolume;
  }
  setSfxVolume(value: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, value));
  }
  getSfxVolume(): number {
    return this.sfxVolume;
  }
  setMuted(value: boolean): void {
    this.muted = value;
  }

  playSfx(name: SfxName): void {
    // Browsers create AudioContext in a 'suspended' state until a user gesture resumes it.
    // Resuming here (fire-and-forget) lets the context unlock naturally on the first real
    // sound-triggering action, without needing a dedicated first-click handler elsewhere.
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    if (this.muted) return;
    const profile = SFX_PROFILE[name];
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.type = profile.type;
    oscillator.frequency.value = profile.freq;
    gainNode.gain.setValueAtTime(this.sfxVolume * 0.5, this.context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + profile.durationSeconds);
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + profile.durationSeconds);
  }

  // Background "music" is a slow, quiet arpeggio loop synthesized per level mood — kept intentionally
  // simple (procedural, not a sample) to satisfy the no-external-audio-assets constraint.
  private musicIntervalId: ReturnType<typeof setInterval> | null = null;

  startMusic(moodNotes: number[] = [220, 277, 330, 277]): void {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    this.stopMusic();
    if (this.muted) return;
    let step = 0;
    this.musicIntervalId = setInterval(() => {
      if (this.muted) return;
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = moodNotes[step % moodNotes.length];
      gainNode.gain.setValueAtTime(this.musicVolume * 0.15, this.context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.8);
      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + 0.8);
      step += 1;
    }, 900);
  }

  stopMusic(): void {
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }
}
