class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.updateVolume();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol: number) {
    this.volume = vol;
    this.updateVolume();
  }

  private updateVolume() {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx?.currentTime || 0);
    }
  }

  playAmbience() {
    this.init();
    if (this.ambientOsc) return;

    // Low frequency drone (Fan/Electrical hum)
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, this.ctx!.currentTime);
    
    // Lowpass filter to make it muddy/distant
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, this.ctx!.currentTime);

    gain.gain.setValueAtTime(0.05, this.ctx!.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();

    this.ambientOsc = osc;
    this.ambientGain = gain;
  }

  stopAmbience() {
    if (this.ambientOsc) {
      this.ambientOsc.stop();
      this.ambientOsc = null;
    }
  }

  playClick() {
    this.init();
    const t = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(t + 0.1);
  }

  playLeverPull() {
    this.init();
    const t = this.ctx!.currentTime;
    // Mechanical heavy ratchet sound
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.linearRampToValueAtTime(40, t + 0.5);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(t + 0.5);
  }

  playSpin() {
    this.init();
    const t = this.ctx!.currentTime;
    // High tech clicking/whirring
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, t);
    // Randomize slightly for texture
    osc.frequency.linearRampToValueAtTime(600, t + 0.1);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(t + 0.1);
  }

  playJackpot() {
    this.init();
    const t = this.ctx!.currentTime;
    // 8-bit Win Arpeggio
    const notes = [440, 554, 659, 880, 440, 554, 659, 880];
    let noteTime = t;
    
    notes.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(noteTime);
      osc.stop(noteTime + 0.15);
      noteTime += 0.1;
    });
  }

  playLose() {
    this.init();
    const t = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.5);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(t + 0.5);
  }

  playWarning() {
    this.init();
    const t = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.setValueAtTime(0, t + 0.1);
    gain.gain.setValueAtTime(0.2, t + 0.2);
    gain.gain.setValueAtTime(0, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(t + 0.4);
  }

  playJumpscare() {
    this.init();
    const t = this.ctx!.currentTime;
    
    // Noise burst
    const bufferSize = this.ctx!.sampleRate * 1.5; // 1.5 seconds
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx!.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

    noise.connect(gain);
    gain.connect(this.masterGain!);
    noise.start();

    // Screech
    const osc = this.ctx!.createOscillator();
    const oscGain = this.ctx!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1000, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 1.0);
    
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.linearRampToValueAtTime(0, t + 1.0);
    
    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start();
    osc.stop(t + 1.0);
  }
}

export const soundEngine = new SoundEngine();