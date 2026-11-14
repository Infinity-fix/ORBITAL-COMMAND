// Procedural Web Audio API sound effects (zero external assets, user-gesture unlocked)
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.06, slideTo?: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playFootstep(lowG = false): void {
    this.tone(lowG ? 95 : 130, 0.06, 'triangle', 0.03, 55);
  }

  playJump(): void {
    this.tone(180, 0.14, 'sine', 0.04, 340);
  }

  playInteract(): void {
    this.tone(520, 0.08, 'sine', 0.05, 760);
  }

  playEquipmentScan(): void {
    this.tone(640, 0.09, 'sine', 0.045, 920);
    setTimeout(() => this.tone(980, 0.11, 'sine', 0.04), 75);
  }

  playAirlock(): void {
    this.tone(240, 0.28, 'sawtooth', 0.035, 80);
  }

  playObjectiveComplete(): void {
    this.tone(523.25, 0.1, 'triangle', 0.055);
    setTimeout(() => this.tone(659.25, 0.1, 'triangle', 0.055), 85);
    setTimeout(() => this.tone(783.99, 0.18, 'triangle', 0.06), 170);
  }

  playWarning(): void {
    this.tone(420, 0.12, 'square', 0.03, 300);
  }
}

export const soundEngine = new SoundEngine();
