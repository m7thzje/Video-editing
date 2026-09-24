// Audio: laadt geluiden uit public/assets/sounds. Ontbreekt een bestand,
// dan valt het terug op een eenvoudig gesynthetiseerd placeholder-geluid.
// De AudioContext wordt pas gestart na de eerste gebruikersinteractie.

const SOUND_DIR = `${import.meta.env.BASE_URL}assets/sounds/`;
const EXTENSIONS = ['mp3', 'ogg', 'wav'];

export const SOUND_NAMES = [
  'npc-praat', 'radio-russisch',
  'nut', 'box', 'hop', 'level-complete', 'feather', 'fries', 'secret', 'splash', 'squeak', 'star', 'door', 'checkpoint',
  'puck-praat-1', 'puck-praat-2', 'puck-praat-3', 'puck-praat-4', 'puck-praat-5', 'puck-dans', 'puck-lekker',
  'puck-geluid-1', 'puck-geluid-2', 'puck-geluid-3', 'puck-geluid-4', 'puck-geluid-5', 'puck-geluid-6', 'puck-geluid-7',
  'puck-wauw', 'puck-hallo', 'alert', 'caught',
  'puck-geluid-10', 'puck-hallo-2', 'puck-watskecola',
  'puck-lach', 'puck-tok', 'puck-klik',
  'puck-praat-6', 'puck-praat-7', 'puck-praat-8', 'puck-praat-9', 'puck-praat-10', 'puck-praat-11',
];

// Groepen: de varianten gaan op roulatie (geschud, elk geluidje komt aan de beurt voor er één terugkomt).
const GROUPS = {
  // Praatjes (zonder de schelle piepjes)
  talk: ['puck-praat-1', 'puck-praat-2', 'puck-praat-3', 'puck-praat-6', 'puck-praat-7', 'puck-praat-8', 'puck-praat-9', 'puck-praat-10', 'puck-praat-11'],
  // Leuke fluitjes (zuivere toon, 1-1,7 kHz)
  fluit: ['puck-geluid-1', 'puck-geluid-3', 'puck-geluid-4', 'puck-geluid-5', 'puck-geluid-7'],
  // Mix: vooral fluitjes, af en toe een hoog piepje
  // Mix van fluitjes en praatjes
  chirp: ['puck-geluid-1', 'puck-geluid-3', 'puck-geluid-4', 'puck-geluid-5', 'puck-geluid-7', 'puck-praat-6', 'puck-praat-8', 'puck-praat-10'],
  // Hoge piepjes: alleen als de buurvrouw je betrapt
  piep: ['puck-geluid-2', 'puck-geluid-6', 'puck-praat-4', 'puck-praat-5', 'puck-geluid-10'],
  hallo: ['puck-hallo', 'puck-hallo-2'],
  lach: ['puck-lach'],
};

// Volume per opname (de hoge krijsjes zijn fel)
const VOLUMES = {
  'puck-geluid-1': 0.55,
  'puck-geluid-2': 0.55,
  'puck-geluid-3': 0.55,
  'puck-geluid-4': 0.55,
  'puck-geluid-5': 0.55,
  'puck-geluid-6': 0.55,
  'puck-geluid-7': 0.55,
  'puck-wauw': 0.8,
  'puck-geluid-10': 0.75,
};

// Ontbreekt een eigen bestand (bijv. box.mp3), gebruik dan eerst een geluidje van Puck zelf.
const FALLBACKS = {
  box: 'fluit',
  feather: 'fluit',
  star: 'puck-wauw',
  secret: 'puck-wauw',
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buffers = new Map();
    this.unlocked = false;
    this.muted = false;
  }

  /** Aanroepen vanuit een klik/tik/toets-handler. */
  unlock() {
    if (this.unlocked) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    // Aparte volumes: effecten, Puck's stem en muziek
    this.sfxOut = this.ctx.createGain();
    this.voiceOut = this.ctx.createGain();
    this.musicOut = this.ctx.createGain();
    [this.sfxOut, this.voiceOut, this.musicOut].forEach((g) => g.connect(this.master));
    // Gesynthetiseerde piepjes (placeholders) een stuk zachter dan echte opnames
    this.synthOut = this.ctx.createGain();
    this.synthOut.gain.value = 0.35;
    this.synthOut.connect(this.sfxOut);
    this.setVolumes(this.volumes || {});
    if (this.onUnlock) this.onUnlock();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.unlocked = true;
    SOUND_NAMES.forEach((name) => this.load(name));
  }

  async load(name) {
    for (const ext of EXTENSIONS) {
      try {
        const res = await fetch(`${SOUND_DIR}${name}.${ext}`);
        if (!res.ok) continue;
        const type = res.headers.get('content-type') || '';
        // Dev-servers geven soms index.html terug voor onbekende paden.
        if (type.includes('text/html')) continue;
        const data = await res.arrayBuffer();
        const buffer = await this.ctx.decodeAudioData(data);
        this.buffers.set(name, buffer);
        return;
      } catch {
        // volgende extensie proberen
      }
    }
    console.info(`[audio] ${name}: geen bestand gevonden, placeholder-geluid wordt gebruikt.`);
  }

  play(name, { volume = 1, rate = 1, freq } = {}) {
    if (!this.unlocked || this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.buffers.has(name) && FALLBACKS[name]) {
      const fb = FALLBACKS[name];
      if (this.buffers.has(fb) || (GROUPS[fb] || []).some((n) => this.buffers.has(n))) name = fb;
    }
    if (GROUPS[name]) {
      const pick = this.nextInGroup(name);
      if (pick) name = pick;
    }
    const buffer = this.buffers.get(name);
    if (buffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      const gain = this.ctx.createGain();
      gain.gain.value = volume * (VOLUMES[name] ?? 1);
      src.connect(gain).connect(name.startsWith('puck-') ? this.voiceOut : this.sfxOut);
      src.start();
      return;
    }
    const synth = PLACEHOLDERS[name] || (name.startsWith('puck-') || GROUPS[name] ? PLACEHOLDERS.talk : null);
    if (synth) synth(this.ctx, this.synthOut, volume, freq);
  }

  /** Roulatie: schud de groep, speel ze één voor één af, en begin nooit met de laatst gespeelde. */
  nextInGroup(group) {
    this.bags = this.bags || {};
    this.lastPick = this.lastPick || {};
    let bag = this.bags[group];
    if (!bag || !bag.length) {
      bag = [...new Set(GROUPS[group].filter((n) => this.buffers.has(n)))];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1] === this.lastPick[group]) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      this.bags[group] = bag;
    }
    const pick = bag.pop();
    this.lastPick[group] = pick;
    return pick;
  }

  /** Speelt een kort willekeurig stukje van een lang geluid (NPC-gebrabbel), met zachte in- en uitfade. */
  playSlice(name, dur = 0.7, { volume = 1, rate = 1 } = {}) {
    if (!this.unlocked || this.muted || !this.ctx) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return this.play('talk', { volume: 0.25, rate: 0.7 });
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const offset = Math.random() * Math.max(0, buffer.duration - dur - 0.45);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.04);
    g.gain.setValueAtTime(volume, t + dur - 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(g).connect(this.sfxOut);
    src.start(t, offset, dur + 0.05);
  }

  /** Doorlopend geluid (radio); het volume wordt per frame gezet met setLoopVolume. */
  setLoopVolume(name, volume) {
    this.loops = this.loops || {};
    let l = this.loops[name];
    if (!l) {
      if (volume <= 0.001 || !this.unlocked || !this.ctx || !this.buffers.has(name)) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers.get(name);
      src.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(this.sfxOut);
      src.start();
      l = this.loops[name] = { src, gain };
    }
    const v = this.muted ? 0 : volume;
    l.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.15);
  }

  /**
   * Achtergrondgeluid per plek: 'buiten' (stadsgeruis + vogels), 'binnen' (tikkende klok), 'lift' (zoem) of null.
   * Alles wordt hier gemaakt, er zijn geen extra bestanden nodig.
   */
  setAmbience(kind) {
    if (!this.ctx || !this.unlocked) return;
    const ctx = this.ctx;
    if (!this.amb) {
      // Bruine ruis als basis voor stadsgeruis en liftzoem
      const len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.sfxOut);
      src.start();
      this.amb = { src, filter, gain, kind: null, next: 0 };
    }
    this.amb.kind = kind;
    const target = kind === 'buiten' ? 0.1 : kind === 'lift' ? 0.07 : kind === 'galerij' ? 0.12 : 0;
    this.amb.filter.frequency.setTargetAtTime(kind === 'lift' ? 180 : kind === 'galerij' ? 700 : 450, ctx.currentTime, 0.2);
    this.amb.gain.gain.setTargetAtTime(this.muted ? 0 : target, ctx.currentTime, 0.4);
  }

  /** Per frame: losse geluidjes van de omgeving (vogels buiten, klok binnen, soms een fietsbel of meeuw). */
  updateAmbience(time) {
    const a = this.amb;
    if (!a || !a.kind || this.muted || time < a.next) return;
    const ctx = this.ctx;
    const out = this.sfxOut;
    if (a.kind === 'buiten' || a.kind === 'galerij') {
      const r = Math.random();
      if (r < 0.7) {
        // Vogeltje: een paar snelle fluitjes
        const base = 2200 + Math.random() * 1800;
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) tone(ctx, out, { type: 'sine', from: base * (1 + Math.random() * 0.3), to: base * (0.8 + Math.random() * 0.5), start: i * 0.09, dur: 0.07, vol: 0.035 });
      } else if (r < 0.85) {
        // Meeuw in de verte
        tone(ctx, out, { type: 'sawtooth', from: 1400, to: 900, dur: 0.35, vol: 0.012 });
        tone(ctx, out, { type: 'sawtooth', from: 1300, to: 850, start: 0.4, dur: 0.3, vol: 0.01 });
      } else {
        // Fietsbel verderop
        [0, 0.14].forEach((st) => tone(ctx, out, { type: 'sine', from: 2600, start: st, dur: 0.25, vol: 0.02 }));
      }
      a.next = time + 1.5 + Math.random() * 4;
    } else if (a.kind === 'binnen') {
      tone(ctx, out, { type: 'square', from: 3000, to: 2500, dur: 0.012, vol: 0.02 });
      a.next = time + 1;
    } else a.next = time + 1;
  }

  /** Stopt een lopend lang geluid (bijv. de dans). */
  playLong(name) {
    this.stopLong();
    if (!this.unlocked || this.muted || !this.ctx) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return this.play('talk');
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.voiceOut);
    src.start();
    this.long = src;
  }

  stopLong() {
    if (this.long) {
      try {
        this.long.stop();
      } catch {
        /* al gestopt */
      }
      this.long = null;
    }
  }

  setVolumes({ music = 0.5, sfx = 0.8, voice = 1 } = {}) {
    this.volumes = { music, sfx, voice };
    if (!this.ctx) return;
    this.sfxOut.gain.value = sfx;
    this.voiceOut.gain.value = voice;
    this.musicOut.gain.value = music * 1.5;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.amb) this.setAmbience(this.amb.kind);
    return this.muted;
  }
}

// ---------- Placeholder-geluiden (Web Audio synthese) ----------

function tone(ctx, out, { type = 'sine', from, to = from, start = 0, dur = 0.15, vol = 0.3 }) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const PLACEHOLDERS = {
  // Vrolijk "pling" bij een nootje
  nut(ctx, out, v) {
    tone(ctx, out, { type: 'triangle', from: 880, to: 1320, dur: 0.12, vol: 0.35 * v });
    tone(ctx, out, { type: 'triangle', from: 1320, to: 1760, start: 0.08, dur: 0.16, vol: 0.3 * v });
  },
  // Blij papegaaien-kwetteren in de doos
  box(ctx, out, v) {
    const notes = [900, 1400, 1100, 1700, 1300];
    notes.forEach((f, i) =>
      tone(ctx, out, { type: 'square', from: f, to: f * 1.35, start: i * 0.07, dur: 0.06, vol: 0.12 * v }),
    );
  },
  // Klein "boing" bij een hop
  hop(ctx, out, v) {
    tone(ctx, out, { type: 'sine', from: 320, to: 620, dur: 0.12, vol: 0.25 * v });
  },
  feather(ctx, out, v) {
    tone(ctx, out, { type: 'sine', from: 1200, to: 1800, dur: 0.18, vol: 0.25 * v });
    tone(ctx, out, { type: 'sine', from: 1600, to: 2400, start: 0.1, dur: 0.2, vol: 0.2 * v });
  },
  fries(ctx, out, v) {
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(ctx, out, { type: 'square', from: f, to: f * 1.02, start: i * 0.06, dur: 0.09, vol: 0.12 * v }));
  },
  secret(ctx, out, v) {
    [784, 988, 1175, 1568].forEach((f, i) => tone(ctx, out, { type: 'triangle', from: f, start: i * 0.09, dur: 0.2, vol: 0.22 * v }));
  },
  splash(ctx, out, v) {
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2000, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.4);
    const g = ctx.createGain();
    g.gain.value = 0.5 * v;
    src.connect(f).connect(g).connect(out);
    src.start();
  },
  squeak(ctx, out, v) {
    tone(ctx, out, { type: 'square', from: 1400, to: 900, dur: 0.12, vol: 0.12 * v });
    tone(ctx, out, { type: 'square', from: 1500, to: 1000, start: 0.15, dur: 0.12, vol: 0.12 * v });
  },
  star(ctx, out, v) {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(ctx, out, { type: 'triangle', from: f, start: i * 0.08, dur: 0.25, vol: 0.25 * v }));
  },
  door(ctx, out, v) {
    tone(ctx, out, { type: 'sine', from: 220, to: 140, dur: 0.18, vol: 0.3 * v });
  },
  checkpoint(ctx, out, v) {
    tone(ctx, out, { type: 'triangle', from: 988, to: 1319, dur: 0.12, vol: 0.25 * v });
  },
  whistle(ctx, out, v, freq = 1400) {
    // Fluittoon met een klein glijdje en vibrato, zoals Puck fluit
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 0.9, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
    lfo.frequency.value = 7;
    lg.gain.value = freq * 0.012;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3 * v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g).connect(out);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.36);
    lfo.stop(t + 0.36);
  },
  note(ctx, out, v, freq = 660) {
    tone(ctx, out, { type: 'sine', from: freq, to: freq * 1.03, dur: 0.32, vol: 0.3 * v });
    tone(ctx, out, { type: 'triangle', from: freq * 2, dur: 0.12, vol: 0.06 * v });
  },
  talk(ctx, out, v) {
    [700, 1100, 850, 1300].forEach((f, i) => tone(ctx, out, { type: 'sawtooth', from: f, to: f * 1.2, start: i * 0.09, dur: 0.08, vol: 0.06 * v }));
  },
  meow(ctx, out, v) {
    tone(ctx, out, { type: 'sawtooth', from: 520, to: 880, dur: 0.18, vol: 0.08 * v });
    tone(ctx, out, { type: 'sawtooth', from: 880, to: 420, start: 0.18, dur: 0.3, vol: 0.08 * v });
  },
  bell(ctx, out, v) {
    [1568, 2093].forEach((f, i) => tone(ctx, out, { type: 'sine', from: f, start: i * 0.12, dur: 0.5, vol: 0.2 * v }));
  },
  crunch(ctx, out, v) {
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2) * (Math.random() < 0.3 ? 1 : 0.3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, t);
    const g = ctx.createGain();
    g.gain.value = 0.7 * v;
    src.connect(f).connect(g).connect(out);
    src.start();
  },
  // Buurvrouw vermoedt iets
  alert(ctx, out, v) {
    tone(ctx, out, { type: 'triangle', from: 520, to: 780, dur: 0.14, vol: 0.25 * v });
    tone(ctx, out, { type: 'triangle', from: 520, to: 780, start: 0.18, dur: 0.14, vol: 0.25 * v });
  },
  // Buurvrouw zet je buiten: boos "hmpf"
  caught(ctx, out, v) {
    tone(ctx, out, { type: 'sawtooth', from: 180, to: 110, dur: 0.35, vol: 0.2 * v });
    tone(ctx, out, { type: 'sawtooth', from: 150, to: 90, start: 0.35, dur: 0.4, vol: 0.2 * v });
  },
  // Fanfare bij level voltooid
  'level-complete'(ctx, out, v) {
    const melody = [523, 659, 784, 1047, 784, 1047];
    melody.forEach((f, i) =>
      tone(ctx, out, { type: 'triangle', from: f, start: i * 0.13, dur: i === melody.length - 1 ? 0.5 : 0.14, vol: 0.3 * v }),
    );
  },
};

// ---------- Achtergrondmuziek (procedureel, per plek een eigen sfeer) ----------

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const TRACKS = {
  // grondtoon, bpm, akkoorden (intervallen), golfvorm, toonladder
  thuis: { root: 57, bpm: 80, prog: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], pad: 'sine', lead: 'triangle', scale: [0, 2, 4, 7, 9], swing: 0 },
  galerij: { drums: 1, root: 55, bpm: 96, prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], pad: 'triangle', lead: 'sine', scale: [0, 2, 4, 7, 9], swing: 0.1 },
  buiten: { drums: 2, root: 60, bpm: 112, prog: [[0, 4, 7], [5, 9, 12], [9, 12, 16], [7, 11, 14]], pad: 'triangle', lead: 'square', scale: [0, 2, 4, 7, 9], swing: 0.15 },
  bakkerij: { drums: 1, root: 53, bpm: 88, prog: [[0, 4, 7, 10], [5, 9, 12], [7, 10, 14], [0, 4, 7]], pad: 'sine', lead: 'triangle', scale: [0, 2, 4, 5, 7, 9], swing: 0.2 },
  pistachehuis: { root: 50, bpm: 104, prog: [[0, 3, 7], [0, 3, 7], [5, 8, 12], [7, 10, 14]], pad: 'triangle', lead: 'triangle', scale: [0, 3, 5, 7, 10], swing: 0, staccato: true },
  // Liftmuzak: zoete bossa met maj7-akkoorden
  lift: { root: 58, bpm: 92, prog: [[0, 4, 7, 11], [2, 5, 9, 12], [7, 11, 14, 17], [0, 4, 7, 11]], pad: 'sine', lead: 'sine', scale: [0, 2, 4, 7, 9, 11], swing: 0.25, bossa: true },
  feest: { drums: 1, root: 62, bpm: 128, prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], pad: 'square', lead: 'square', scale: [0, 2, 4, 7, 9], swing: 0 },
};

export class MusicPlayer {
  constructor(audio) {
    this.audio = audio;
    this.track = null;
    this.pending = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  play(name) {
    if (!TRACKS[name] || name === this.track) return;
    if (!this.audio.ctx) {
      this.pending = name;
      return;
    }
    const ctx = this.audio.ctx;
    const out = this.audio.musicOut;
    const start = () => {
      this.track = name;
      this.t = TRACKS[name];
      this.step = 0;
      this.nextTime = ctx.currentTime + 0.1;
      this.makeMelody();
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime((this.audio.volumes?.music ?? 0.5) * 1.5, ctx.currentTime, 0.3);
      if (!this.timer) this.timer = setInterval(() => this.tick(), 30);
    };
    if (this.track) {
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      this.track = null;
      setTimeout(start, 400);
    } else start();
  }

  stop() {
    this.track = null;
    this.pending = null;
  }

  resume() {
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      this.play(p);
    }
  }

  makeMelody() {
    // 4 maten melodie die zich herhaalt (herkenbaar deuntje per plek)
    let seed = this.track.length * 7919;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    this.melody = [];
    let idx = 2;
    for (let i = 0; i < 32; i++) {
      if (rnd() < 0.55) {
        idx = Math.max(0, Math.min(this.t.scale.length * 2 - 1, idx + Math.floor(rnd() * 5) - 2));
        this.melody.push(idx);
      } else this.melody.push(null);
    }
  }

  note(freq, time, dur, type, vol) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g).connect(this.audio.musicOut);
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  tick() {
    const ctx = this.audio.ctx;
    if (!this.track || !ctx || this.audio.muted) return;
    const t = this.t;
    const eighth = 60 / t.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.15) {
      const s = this.step;
      const bar = Math.floor(s / 8) % t.prog.length;
      const chord = t.prog[bar];
      const time = this.nextTime + (s % 2 ? t.swing * eighth : 0);
      // Bas
      if (s % 8 === 0 || (s % 8 === 4 && !t.bossa) || (t.bossa && s % 8 === 3)) this.note(midi(t.root - 12 + chord[0]), time, eighth * 1.8, 'triangle', 0.09);
      // Zachte akkoordklank aan het begin van de maat
      if (s % 8 === 0) chord.forEach((iv) => this.note(midi(t.root + iv), time, eighth * 7, t.pad, 0.018));
      // Arpeggio
      if (!t.staccato || s % 2 === 0) this.note(midi(t.root + 12 + chord[s % chord.length]), time, t.staccato ? eighth * 0.4 : eighth * 0.9, 'sine', 0.025);
      // Melodie
      const m = this.melody[s % 32];
      if (m !== null && m !== undefined) {
        const oct = Math.floor(m / t.scale.length);
        const deg = t.scale[m % t.scale.length];
        this.note(midi(t.root + 12 + oct * 12 + deg), time, eighth * (t.staccato ? 0.5 : 1.4), t.lead, t.lead === 'square' ? 0.018 : 0.035);
      }
      // Lichte beat: zachte bassdrum op 1 en 3, hihat op de achtsten
      if (t.drums) {
        if (s % 4 === 0) this.kick(time, 0.22);
        if (s % 2 === 1) this.hat(time, 0.025);
        if (s % 8 === 4 && t.drums > 1) this.clap(time);
      }
      // Feest: klap op 2 en 4
      if (this.track === 'feest' && s % 4 === 2) this.clap(time);
      this.nextTime += eighth;
      this.step++;
    }
  }

  kick(time, vol) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(120, time);
    o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    o.connect(g).connect(this.audio.musicOut);
    o.start(time);
    o.stop(time + 0.2);
  }

  hat(time, vol) {
    const ctx = this.audio.ctx;
    if (!this.hatBuf) {
      this.hatBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const d = this.hatBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = this.hatBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.audio.musicOut);
    src.start(time);
  }

  clap(time) {
    const ctx = this.audio.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(g).connect(this.audio.musicOut);
    src.start(time);
  }
}
