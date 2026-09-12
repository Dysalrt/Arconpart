// tts.js — real browser voice (Web Speech API), NOT a from-scratch synthesizer.
// Arcon spelling is transliterated into an English-orthography approximation
// and spoken with a real en-US/en-GB SpeechSynthesisVoice. This sounds like
// an actual human voice (unlike audio-synthesized formants), at the cost of
// not being 100% phonetically precise — English spelling-to-sound rules are
// context-dependent, so some words WILL come out slightly off. That's fixed
// per-word via the `OVERRIDES` table below as they're discovered — same
// pattern used for every language this approach has been tried with so far.

const LETTER_MAP = {
  a: "ah", e: "eh", i: "ee", o: "oh", u: "oo",
  y: "ew", // Arcon y = IPA [y] (like German ü) — "ew" is the closest common English spelling
  b: "b", c: "k", d: "d", f: "f", g: "g",
  h: "kh", // Arcon h = IPA [x] — English has no native equivalent; "kh" reads closer than plain "h"
  j: "zh", // Arcon j = IPA [ʒ] — common transliteration convention
  k: "k", l: "l", m: "m", n: "n", p: "p",
  q: "ky", // Arcon q = IPA [kʲ]
  r: "r", s: "s", t: "t", v: "v",
  w: "v", // Arcon w sounds like v (rare letter, mostly loanwords)
  x: "ks", z: "z",
};

// Point-fixes for specific words a voice reads wrong despite "correct" spelling
// logic above — English TTS engines make word-level guesses (stress, whether
// an "s" is voiced/unvoiced, etc.) that plain letter substitution can't predict.
// Keys are the ORIGINAL Arcon spelling, lowercase.
const OVERRIDES = {
  // "al": "ahl",
};

function transliterate(word) {
  const lower = word.toLowerCase();
  if (lower in OVERRIDES) return OVERRIDES[lower];
  return lower
    .split("")
    .map((ch) => (ch in LETTER_MAP ? LETTER_MAP[ch] : ch))
    .join(" "); // пробелы между "слогами" помогают некоторым голосам не сливать буквы
}

const supported = typeof window !== "undefined" && "speechSynthesis" in window;
let cachedVoice = null;

function pickVoice() {
  if (!supported) return;
  const voices = speechSynthesis.getVoices();
  const enVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  // Предпочитаем голоса Google/естественно звучащие, если есть — иначе любой английский.
  cachedVoice =
    enVoices.find((v) => v.name.toLowerCase().includes("google")) ||
    enVoices.find((v) => v.lang.toLowerCase() === "en-us") ||
    enVoices[0] ||
    null;
}

if (supported) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

export function isSpeakable(text) {
  return typeof text === "string" && /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(text.trim());
}

export function speakArcon(text) {
  if (!supported || !isSpeakable(text)) return false;

  const words = text.trim().split(/\s+/).map(transliterate);
  const utter = new SpeechSynthesisUtterance(words.join(", ")); // короткая пауза между словами фразы
  utter.lang = "en-US";
  if (cachedVoice) utter.voice = cachedVoice;
  utter.rate = 0.85;
  utter.pitch = 1;

  speechSynthesis.cancel(); // прерываем предыдущую фразу, если ещё играет
  speechSynthesis.speak(utter);
  return true;
}

export function stopArcon() {
  if (supported) speechSynthesis.cancel();
}
