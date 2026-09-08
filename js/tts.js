// Arcon TTS — phoneme-driven browser synthesizer
// Does NOT use an English (or any other language) pronunciation model.
// The spelling is converted directly to Arcon phonemes and synthesized
// with Web Audio. `y` is the Arcon /y/ vowel (IPA close front rounded vowel).

const PHONEMES = {
  a: { type: 'vowel', f1: 800, f2: 1150, f3: 2850 },
  e: { type: 'vowel', f1: 500, f2: 1900, f3: 2600 },
  i: { type: 'vowel', f1: 300, f2: 2200, f3: 3000 },
  o: { type: 'vowel', f1: 500, f2: 900, f3: 2600 },
  u: { type: 'vowel', f1: 350, f2: 800, f3: 2500 },
  // Arcon y = IPA /y/, NOT "you" and NOT /ju/.
  y: { type: 'vowel', f1: 300, f2: 1750, f3: 2800, rounded: true },

  b: { type: 'stop', voiced: true },
  c: { type: 'stop', voiced: false }, // /k/
  d: { type: 'stop', voiced: true },
  f: { type: 'fricative', voiced: false, place: 'labial' },
  g: { type: 'stop', voiced: true },
  h: { type: 'fricative', voiced: false, place: 'glottal' },
  j: { type: 'fricative', voiced: true, place: 'postalveolar' }, // /ʒ/
  k: { type: 'stop', voiced: false },
  q: { type: 'stop', voiced: false, palatal: true }, // /kʲ/
  r: { type: 'approximant', voiced: true },
  s: { type: 'fricative', voiced: false, place: 'alveolar' },
  t: { type: 'stop', voiced: false },
  v: { type: 'fricative', voiced: true, place: 'labial' },
  z: { type: 'fricative', voiced: true, place: 'alveolar' }
};

const SAMPLE_RATE = 48000;
const PHONEME_MS = 115;
const VOWEL_MS = 145;
const STOP_MS = 75;
const FRICATIVE_MS = 105;

let audioContext = null;
let activeSources = [];

export function isSpeakable(text) {
  return typeof text === 'string' && /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(text.trim());
}

function getAudioContext() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx({ sampleRate: SAMPLE_RATE });
  }
  return audioContext;
}

function stopPlayback() {
  for (const source of activeSources) {
    try { source.stop(); } catch (_) {}
    try { source.disconnect(); } catch (_) {}
  }
  activeSources = [];
}

function envelope(gain, start, duration, attack = 0.012, release = 0.025) {
  const end = start + duration;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.22, start + attack);
  gain.gain.setValueAtTime(0.22, Math.max(start + attack, end - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
}

function makeNoise(ctx, duration) {
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function addVowel(ctx, destination, phoneme, start, duration, pitch) {
  const output = ctx.createGain();
  envelope(output, start, duration);
  output.connect(destination);

  const fundamental = ctx.createOscillator();
  fundamental.type = 'sawtooth';
  fundamental.frequency.setValueAtTime(pitch, start);
  fundamental.connect(output);
  fundamental.start(start);
  fundamental.stop(start + duration);
  activeSources.push(fundamental);

  // Three formant filters create a vowel from the raw source.
  for (const [frequency, q, gain] of [
    [phoneme.f1, 8, 1.0],
    [phoneme.f2, 10, 0.65],
    [phoneme.f3, 12, 0.35]
  ]) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.setValueAtTime(q, start);
    const formantGain = ctx.createGain();
    formantGain.gain.setValueAtTime(gain, start);
    try {
      fundamental.disconnect(output);
      } catch (_) {
  // Already disconnected — ignore.
}
    fundamental.connect(filter);
    filter.connect(formantGain);
    formantGain.connect(output);
  }

  // Rounded /y/ gets a little extra low-frequency energy.
  if (phoneme.rounded) {
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.setValueAtTime(900, start);
    low.Q.setValueAtTime(1, start);
    low.connect(output);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch * 2, start);
    osc.connect(low);
    osc.start(start);
    osc.stop(start + duration);
    activeSources.push(osc);
  }
}

function addNoiseConsonant(ctx, destination, phoneme, start, duration, pitch) {
  const source = ctx.createBufferSource();
  source.buffer = makeNoise(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = phoneme.place === 'glottal' ? 'bandpass' : 'highpass';

  let cutoff = 3000;
  if (phoneme.place === 'labial') cutoff = 1800;
  if (phoneme.place === 'alveolar') cutoff = 4200;
  if (phoneme.place === 'postalveolar') cutoff = 2600;
  if (phoneme.place === 'glottal') cutoff = 1800;
  filter.frequency.setValueAtTime(cutoff, start);
  filter.Q.setValueAtTime(phoneme.place === 'postalveolar' ? 2 : 0.8, start);

  const gain = ctx.createGain();
  envelope(gain, start, duration, 0.006, 0.018);
  gain.gain.setValueAtTime(0.11, start + 0.01);
  source.connect(filter).connect(gain).connect(destination);
  source.start(start);
  source.stop(start + duration);
  activeSources.push(source);

  if (phoneme.voiced) {
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, start);
    envelope(voiceGain, start, duration, 0.008, 0.018);
    voiceGain.gain.setValueAtTime(0.055, start);
    osc.connect(voiceGain).connect(destination);
    osc.start(start);
    osc.stop(start + duration);
    activeSources.push(osc);
  }
}

function addStop(ctx, destination, phoneme, start, duration, pitch) {
  const burst = ctx.createBufferSource();
  burst.buffer = makeNoise(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(phoneme.palatal ? 1800 : 900, start);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.16, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  burst.connect(filter).connect(gain).connect(destination);
  burst.start(start);
  burst.stop(start + duration);
  activeSources.push(burst);

  if (phoneme.voiced) {
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, start);
    envelope(voiceGain, start, duration, 0.004, 0.018);
    voiceGain.gain.setValueAtTime(0.045, start);
    osc.connect(voiceGain).connect(destination);
    osc.start(start);
    osc.stop(start + duration);
    activeSources.push(osc);
  }
}

function phonemeDuration(p) {
  if (p.type === 'vowel') return VOWEL_MS / 1000;
  if (p.type === 'stop') return STOP_MS / 1000;
  return FRICATIVE_MS / 1000;
}

function tokenize(text) {
  return text.toLowerCase().trim().split(/\s+/).map(word => [...word]);
}

function scheduleWord(ctx, destination, word, start, pitch) {
  let t = start;
  for (const letter of word) {
    const p = PHONEMES[letter];
    if (!p) continue;
    const duration = phonemeDuration(p);
    if (p.type === 'vowel') addVowel(ctx, destination, p, t, duration, pitch);
    else if (p.type === 'stop') addStop(ctx, destination, p, t, duration, pitch);
    else addNoiseConsonant(ctx, destination, p, t, duration, pitch);
    t += duration;
  }
  return t;
}

export function speakArcon(text) {
  if (!isSpeakable(text)) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;

  stopPlayback();
  if (ctx.state === 'suspended') ctx.resume();

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.8, ctx.currentTime);
  master.connect(ctx.destination);

  let t = ctx.currentTime + 0.025;
  const words = tokenize(text);
  for (const word of words) {
    t = scheduleWord(ctx, master, word, t, 125);
    t += 0.075;
  }

  return true;
}

export function stopArcon() {
  stopPlayback();
}
