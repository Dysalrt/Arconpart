// Arcon TTS — phoneme-driven browser synthesizer
// Does NOT use an English (or any other language) pronunciation model.
// The spelling is converted directly to Arcon phonemes and synthesized
// with Web Audio. `y` is the Arcon /y/ vowel (IPA close front rounded vowel).
//
// v2 — softened synthesis. The original version sounded harsh/uncanny
// because of three things at once: a perfectly flat pitch (0 variation),
// very narrow resonant formant filters (high Q → metallic "ringing"),
// and phonemes switching on/off abruptly with no overlap between them.
// Real speech has pitch that drifts and wobbles slightly, wider/softer
// resonances, and sounds that blend into each other. Fixing those three
// things (without touching the overall architecture) removes most of
// the "horror movie" quality while keeping this fully self-contained —
// no voice model, no network call, same phoneme table as before.

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
const VOWEL_MS = 150;
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

function envelope(gain, start, duration, attack = 0.018, release = 0.035) {
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

let voiceWave = null;
function getVoiceWave(ctx) {
  if (voiceWave) return voiceWave;
  // Кастомный спектр вместо резкой пилы: гармоники спадают быстрее
  // (примерно как 1/n^1.6 вместо 1/n у пилы) — звучит теплее и менее
  // "гудяще", ближе к настоящему голосовому источнику.
  const harmonics = 16;
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n++) {
    imag[n] = 1 / Math.pow(n, 1.6);
  }
  voiceWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  return voiceWave;
}

function makeVoiceOsc(ctx) {
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(getVoiceWave(ctx));
  return osc;
}

// Небольшое естественное "плавание" высоты тона внутри звука — вместо
// идеально ровной частоты. Реальный голос никогда не держит тон абсолютно
// неподвижным, и именно эта неподвижность звучит механически / жутковато.
function applyPitchWobble(osc, start, duration, basePitch) {
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const t = start + (duration * i) / steps;
    const jitter = 1 + (Math.random() - 0.5) * 0.025; // ±2.5%
    osc.frequency.linearRampToValueAtTime(basePitch * jitter, t);
  }
}

function addVowel(ctx, destination, phoneme, start, duration, pitch) {
  const output = ctx.createGain();
  envelope(output, start, duration);
  output.connect(destination);

  const fundamental = makeVoiceOsc(ctx);
  fundamental.frequency.setValueAtTime(pitch, start);
  applyPitchWobble(fundamental, start, duration, pitch);
  fundamental.start(start);
  fundamental.stop(start + duration);
  activeSources.push(fundamental);

  // Мягкий низкочастотный срез самого источника — убирает часть резких
  // высоких гармоник пилообразной волны до того, как они попадут в форманты.
  const preShape = ctx.createBiquadFilter();
  preShape.type = 'lowpass';
  preShape.frequency.setValueAtTime(3200, start);
  preShape.Q.setValueAtTime(0.5, start);
  fundamental.connect(preShape);

  // Три формантных фильтра — ниже Q, чем раньше (было 8/10/12) —
  // шире полоса пропускания, меньше "звона".
  for (const [frequency, q, gain] of [
    [phoneme.f1, 4, 1.0],
    [phoneme.f2, 5, 0.6],
    [phoneme.f3, 6, 0.3]
  ]) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.setValueAtTime(q, start);
    const formantGain = ctx.createGain();
    formantGain.gain.setValueAtTime(gain, start);
    preShape.connect(filter);
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
  filter.Q.setValueAtTime(phoneme.place === 'postalveolar' ? 1.2 : 0.7, start);

  const gain = ctx.createGain();
  envelope(gain, start, duration, 0.008, 0.022);
  gain.gain.setValueAtTime(0.11, start + 0.01);
  source.connect(filter).connect(gain).connect(destination);
  source.start(start);
  source.stop(start + duration);
  activeSources.push(source);

  if (phoneme.voiced) {
    const osc = makeVoiceOsc(ctx);
    const voiceGain = ctx.createGain();
    osc.frequency.setValueAtTime(pitch, start);
    applyPitchWobble(osc, start, duration, pitch);
    envelope(voiceGain, start, duration, 0.01, 0.022);
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
  // Мягкий верхний срез шума — без этого белый шум звучит как радиопомехи,
  // человеческое ухо очень чувствительно к энергии выше ~8 кГц.
  const noiseTame = ctx.createBiquadFilter();
  noiseTame.type = 'lowpass';
  noiseTame.frequency.setValueAtTime(7500, start);
  const gain = ctx.createGain();
  // Короткий подъём в начале вместо мгновенного скачка громкости —
  // резкий старт с нуля создавал слышимый "щелчок".
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.16, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  burst.connect(filter).connect(noiseTame).connect(gain).connect(destination);
  burst.start(start);
  burst.stop(start + duration);
  activeSources.push(burst);

  if (phoneme.voiced) {
    const osc = makeVoiceOsc(ctx);
    const voiceGain = ctx.createGain();
    osc.frequency.setValueAtTime(pitch, start);
    envelope(voiceGain, start, duration, 0.006, 0.022);
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

// Высота тона плавно снижается к концу слова — как в естественной речи
// (declination), а не держится на одном значении всё время.
function pitchForPosition(basePitch, index, total) {
  if (total <= 1) return basePitch;
  const drop = 18; // Гц, на сколько тон опускается к концу слова
  return basePitch - (drop * index) / (total - 1);
}

function scheduleWord(ctx, destination, word, start, basePitch) {
  let t = start;
  for (let i = 0; i < word.length; i++) {
    const letter = word[i];
    const p = PHONEMES[letter];
    if (!p) continue;
    const duration = phonemeDuration(p);
    const pitch = pitchForPosition(basePitch, i, word.length);
    if (p.type === 'vowel') addVowel(ctx, destination, p, t, duration, pitch);
    else if (p.type === 'stop') addStop(ctx, destination, p, t, duration, pitch);
    else addNoiseConsonant(ctx, destination, p, t, duration, pitch);
    // Последовательно, без наплыва — плавность даём другим способом
    // (питч + форма волны), а не сокращением времени звучания.
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

  // Лимитер на выходе — страхует от щелчков/треска, если несколько звуков
  // случайно наложатся по громкости (например, гласная + окрашивающий тон /y/).
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-12, ctx.currentTime);
  limiter.knee.setValueAtTime(6, ctx.currentTime);
  limiter.ratio.setValueAtTime(12, ctx.currentTime);
  limiter.attack.setValueAtTime(0.003, ctx.currentTime);
  limiter.release.setValueAtTime(0.05, ctx.currentTime);

  // Общий мягкий срез верхов на выходе — убирает остаточную резкость/шипение.
  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.setValueAtTime(4500, ctx.currentTime);
  warmth.Q.setValueAtTime(0.4, ctx.currentTime);

  master.connect(limiter);
  limiter.connect(warmth);
  warmth.connect(ctx.destination);

  let t = ctx.currentTime + 0.025;
  const words = tokenize(text);
  for (const word of words) {
    // Небольшой случайный разброс базовой высоты тона между словами —
    // тоже часть "не звучать как робот".
    const basePitch = 125 + (Math.random() - 0.5) * 8;
    t = scheduleWord(ctx, master, word, t, basePitch);
    t += 0.09;
  }

  return true;
}

export function stopArcon() {
  stopPlayback();
}
