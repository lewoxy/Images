/** Prozedurale Soundeffekte (WebAudio, keine Audiodateien). */

type SfxName = 'coin' | 'buy' | 'step' | 'bell' | 'clean' | 'levelup' | 'click' | 'pay' | 'paper' | 'vip' | 'reward' | 'powerup' | 'error' | 'pop' | 'car';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;
  private last = new Map<SfxName, number>();
  private coinPitch = 0;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, at = 0, slideTo?: number) {
    const c = this.ctx!;
    const t0 = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master!);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq = 1800, at = 0) {
    const c = this.ctx!;
    const t0 = c.currentTime + at;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master!);
    src.start(t0);
  }

  play(name: SfxName) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const now = performance.now();
    const minGap: Partial<Record<SfxName, number>> = { coin: 45, pay: 70, step: 80, paper: 90, clean: 120, pop: 60 };
    const lg = this.last.get(name) ?? 0;
    if (now - lg < (minGap[name] ?? 30)) return;
    this.last.set(name, now);
    switch (name) {
      case 'coin': {
        this.coinPitch = now - lg < 250 ? Math.min(this.coinPitch + 1, 12) : 0;
        const f = 1250 * Math.pow(2, this.coinPitch / 24);
        this.tone(f, 0.09, 'square', 0.05);
        this.tone(f * 1.5, 0.12, 'sine', 0.07, 0.035);
        break;
      }
      case 'pay':
        this.tone(640 + Math.random() * 80, 0.05, 'triangle', 0.06);
        break;
      case 'buy':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.12, i * 0.07));
        this.noise(0.25, 0.06, 3000, 0.25);
        break;
      case 'step':
        this.tone(880, 0.08, 'sine', 0.08);
        this.tone(1320, 0.12, 'sine', 0.07, 0.07);
        break;
      case 'bell':
        this.tone(1760, 0.5, 'sine', 0.1);
        this.tone(2640, 0.35, 'sine', 0.04);
        break;
      case 'clean':
        this.noise(0.18, 0.12, 2400);
        this.tone(1500, 0.1, 'sine', 0.05, 0.1, 2400);
        break;
      case 'levelup':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.22, 'square', 0.06, i * 0.09));
        [1046, 1318, 1568].forEach((f) => this.tone(f, 0.6, 'triangle', 0.07, 0.6));
        break;
      case 'click':
        this.tone(700, 0.05, 'sine', 0.08, 0, 500);
        break;
      case 'paper':
        this.tone(420, 0.07, 'triangle', 0.08, 0, 620);
        break;
      case 'vip':
        [659, 830, 988].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.1, i * 0.1));
        break;
      case 'reward':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.14, 'sine', 0.09, i * 0.06));
        break;
      case 'powerup':
        this.tone(300, 0.4, 'sawtooth', 0.05, 0, 1200);
        this.tone(600, 0.4, 'sine', 0.06, 0.05, 1800);
        break;
      case 'error':
        this.tone(220, 0.14, 'square', 0.06);
        this.tone(180, 0.18, 'square', 0.05, 0.1);
        break;
      case 'pop':
        this.tone(520, 0.08, 'sine', 0.09, 0, 900);
        break;
      case 'car':
        this.tone(160, 0.3, 'sawtooth', 0.03, 0, 90);
        break;
    }
  }
}
