// Every sound in Emberkeeper is synthesized with WebAudio — no audio files.
// A low drone plus slow plucked notes makes the night ambience; short blips mark
// banishes, pickups, dashes, flares, hearth hits and the dawn.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let droneNodes = null;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** Resume the context after a user gesture; also starts the night drone. */
  function unlock() {
    if (!ensure()) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    startDrone();
  }

  function startDrone() {
    if (droneNodes || !context) return;
    const gain = context.createGain();
    gain.gain.value = 0.05;
    gain.connect(master);
    const oscillators = [];
    for (const [frequency, type] of [[55, 'sine'], [82.4, 'sine'], [110.3, 'triangle']]) {
      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start();
      oscillators.push(oscillator);
    }
    droneNodes = { gain, oscillators };
  }

  function tone({ frequency, endFrequency, duration, type = 'sine', volume = 0.2, delay = 0 }) {
    if (!ensure() || muted) return;
    try {
      const now = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (endFrequency !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.05);
    } catch {
      // Audio is decoration; a failure must never break the game.
    }
  }

  function noise({ duration, volume = 0.15, delay = 0, lowpass = 1200 }) {
    if (!ensure() || muted) return;
    try {
      const now = context.currentTime + delay;
      const length = Math.max(1, Math.floor(context.sampleRate * duration));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = context.createGain();
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(now);
    } catch {
      // Audio is decoration; a failure must never break the game.
    }
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    /** Pitch climbs with the combo, so a streak sounds like a streak. */
    banish(combo) {
      const base = 420 * Math.pow(1.059, Math.min(combo, 12));
      tone({ frequency: base, endFrequency: base * 1.6, duration: 0.18, type: 'triangle', volume: 0.22 });
      tone({ frequency: base * 2, duration: 0.1, type: 'sine', volume: 0.08, delay: 0.02 });
    },
    pickup() {
      tone({ frequency: 880, endFrequency: 1320, duration: 0.12, type: 'sine', volume: 0.14 });
    },
    dash() {
      noise({ duration: 0.18, volume: 0.12, lowpass: 2400 });
    },
    flare() {
      tone({ frequency: 220, endFrequency: 660, duration: 0.35, type: 'sawtooth', volume: 0.1 });
      noise({ duration: 0.3, volume: 0.1, lowpass: 3200 });
    },
    hearthHit() {
      tone({ frequency: 140, endFrequency: 60, duration: 0.4, type: 'sawtooth', volume: 0.2 });
      noise({ duration: 0.25, volume: 0.12, lowpass: 500 });
    },
    boon() {
      [523, 659, 784].forEach((frequency, i) => tone({ frequency, duration: 0.3, type: 'triangle', volume: 0.14, delay: i * 0.07 }));
    },
    /** A coin chime for a shop purchase. */
    buy() {
      tone({ frequency: 1047, duration: 0.12, type: 'sine', volume: 0.16 });
      tone({ frequency: 1319, duration: 0.2, type: 'sine', volume: 0.16, delay: 0.08 });
    },
    /** The Gloomlord's roar: a low sawtooth fall under a burst of noise. */
    boss() {
      tone({ frequency: 90, endFrequency: 42, duration: 0.8, type: 'sawtooth', volume: 0.22 });
      noise({ duration: 0.5, volume: 0.1, lowpass: 400 });
      tone({ frequency: 55, endFrequency: 38, duration: 0.9, type: 'triangle', volume: 0.18, delay: 0.1 });
    },
    nightStart() {
      tone({ frequency: 330, endFrequency: 330, duration: 0.2, type: 'triangle', volume: 0.14 });
      tone({ frequency: 495, duration: 0.25, type: 'triangle', volume: 0.12, delay: 0.12 });
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((frequency, i) => tone({ frequency, duration: 0.5, type: 'triangle', volume: 0.16, delay: i * 0.12 }));
    },
    lose() {
      [392, 330, 262, 196].forEach((frequency, i) => tone({ frequency, duration: 0.6, type: 'sine', volume: 0.14, delay: i * 0.16 }));
    },
  };
}
