/**
 * AudioManager.js — High-Fidelity Procedural Gunshot Synthesis
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -15;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 8;
      this.compressor.attack.value = 0.002;
      this.compressor.release.value = 0.15;
      
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playGunshot(weaponName) {
    const ctx = this._ensureContext();
    const now = ctx.currentTime;
    const config = this._getGunshotConfig(weaponName);

    // 1. Transient Punch (Kick drum style pitch envelope)
    const kickOsc = ctx.createOscillator();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(config.thumpFreq * 1.5, now);
    kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    const kickGain = ctx.createGain();
    kickGain.gain.setValueAtTime(config.thumpVolume * 1.5, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    kickOsc.connect(kickGain);
    kickGain.connect(this.masterGain);
    kickOsc.start(now);
    kickOsc.stop(now + 0.12);

    // 2. The Bang (White noise burst)
    const bufferSize = ctx.sampleRate * config.duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, config.decay);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = config.filterFreq;
    noiseFilter.Q.value = 0.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(config.volume * 2.0, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + config.duration);
  }

  playReload() {
    const ctx = this._ensureContext();
    const now = ctx.currentTime;

    [0, 0.2, 0.6].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = i === 1 ? 1200 : 800;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 1.0;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.1);
    });
  }

  _getGunshotConfig(weaponName) {
    switch (weaponName) {
      case 'AK-47':
        return { 
          duration: 0.35, decay: 2.0, 
          filterFreq: 800, volume: 0.8, 
          thumpFreq: 140, thumpVolume: 0.9
        };
      case 'M9 Pistol':
        return { 
          duration: 0.15, decay: 3.5, 
          filterFreq: 1800, volume: 0.5, 
          thumpFreq: 180, thumpVolume: 0.4
        };
      case 'MP5 SMG':
        return { 
          duration: 0.12, decay: 4.5, 
          filterFreq: 2200, volume: 0.4, 
          thumpFreq: 200, thumpVolume: 0.3
        };
      default:
        return { 
          duration: 0.2, decay: 3.0, 
          filterFreq: 1200, volume: 0.6, 
          thumpFreq: 150, thumpVolume: 0.5
        };
    }
  }
}
