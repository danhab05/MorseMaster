export class MorseAudio {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private frequency: number = 700;

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);
    }
  }

  start() {
    this.init();
    if (!this.audioCtx || !this.gainNode) return;

    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
    }

    this.oscillator = this.audioCtx.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(this.frequency, this.audioCtx.currentTime);
    this.oscillator.connect(this.gainNode);
    this.oscillator.start();

    this.gainNode.gain.setTargetAtTime(0.1, this.audioCtx.currentTime, 0.005);
  }

  stop() {
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.005);
    }
  }

  playCorrect() {
    this.init();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const t = ctx.currentTime;

    // Two quick ascending tones — pleasant "ding ding"
    [[880, 0, 0.06], [1320, 0.07, 0.12]].forEach(([freq, start, end]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + start);
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(0.18, t + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + start);
      osc.stop(t + end + 0.01);
    });
  }

  playWrong() {
    this.init();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const t = ctx.currentTime;

    // Low buzz — two short descending tones
    [[220, 0, 0.08], [180, 0.1, 0.22]].forEach(([freq, start, end]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + start);
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(0.12, t + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + start);
      osc.stop(t + end + 0.01);
    });
  }

  playSequence(sequence: string, dotDuration: number = 100) {
    this.init();
    if (!this.audioCtx || !this.gainNode) return;

    let currentTime = this.audioCtx.currentTime;
    const dashDuration = dotDuration * 3;
    const gapDuration = dotDuration;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.frequency, currentTime);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    gain.gain.setValueAtTime(0, currentTime);

    osc.start(currentTime);

    sequence.split('').forEach((char) => {
      const duration = char === '.' ? dotDuration : dashDuration;
      gain.gain.setValueAtTime(0.1, currentTime);
      currentTime += duration / 1000;
      gain.gain.setValueAtTime(0, currentTime);
      currentTime += gapDuration / 1000;
    });

    osc.stop(currentTime);
  }
}

export const morseAudio = new MorseAudio();
