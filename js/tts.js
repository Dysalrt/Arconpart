// tts.js — Arcon phonetic browser TTS
//
// Keeps the same API used by lesson.js:
//   isSpeakable(text)
//   speakArcon(text)
//   stopArcon()
//
// IMPORTANT:
// Browser SpeechSynthesis does not have a standard way to receive IPA.
// Therefore this file uses carefully chosen phonetic spellings instead
// of letting the English voice read Arcon spelling directly.
//
// v2 note: standalone letters/short clusters with no vowel (zh, kh, ky, ks)
// or a bare lone vowel ("oo") get read as spelled-out letter names or as
// an interjection with its own pitch contour — NOT as the intended sound.
// This happens because the browser's text normalizer doesn't recognize
// them as real English words. Fix: pad these specific standalone cases
// with a neutral trailing vowel sound ("uh") so they read as ordinary
// short words instead of triggering that fallback. This only matters for
// the handful of entries that are taught as single isolated letters
// (alphabet lesson) — anything embedded inside a longer real word already
// has vowels around it and doesn't need this.

const LETTER_MAP = {
  a: "ah",
  b: "b",
  c: "k",
  d: "d",

  // Open /ɛ/, not English "ee"
  e: "eh",

  f: "f",
  g: "g",

  // Arcon /x/ — approximate with "kh"
  h: "kh",

  i: "ee",

  // Arcon /ʒ/ — "zh"
  j: "zh",

  k: "k",
  l: "l",
  m: "m",
  n: "n",

  o: "oh",
  p: "p",

  // Arcon /kʲ/ — approximate with "ky"
  q: "ky",

  r: "r",
  s: "s",
  t: "t",

  u: "oo",
  v: "v",

  // Kept for compatibility with older Arcon material.
  w: "v",

  // Arcon /ks/
  x: "ks",

  // Arcon /y/ — German ü-like vowel.
  //
  // Some browser voices pronounce literal "ü" more naturally
  // than an English spelling such as "ew".
  y: "ü",

  z: "z",
};


// ============================================================
// COMMON ARCON WORD PHONETIC FORMS
// ============================================================
//
// These are not translations.
// They are pronunciation spellings.
//
// The purpose is to prevent the browser from interpreting short
// Arcon words as ordinary English words or letter names.
//
// Importantly, this list contains ONLY the forms that are known
// to be problematic enough to justify a lexical pronunciation.
// New ordinary words still fall through to LETTER_MAP.
//
// NOTE on the standalone single-letter entries below (j, h, q, x, u):
// these are padded with a trailing "uh" specifically because a bare
// vowel-less (or lone-vowel) token gets misread by the browser's text
// normalizer (spelled out as letter names, or read with interjection
// intonation) instead of pronounced as a plain sound. The padding is
// only needed here — inside real multi-letter words the surrounding
// vowels already prevent this, so qite/jy/etc. don't need it.

const WORD_MAP = {
  // Lesson 1 / basic phonology — standalone letters, padded to avoid
  // the browser reading them as spelled-out letter names
  j: "zhuh",
  h: "khuh",
  q: "kyuh",
  x: "ksuh",
  y: "ü",
  e: "eh",
  u: "ooh", // bare "oo" was read with interjection-style pitch drift; try "ooh" instead

  // Lesson 2
  qite: "kyee-teh",
  vy: "vü",
  es: "ehss",

  // Lesson 3
  ro: "roh",
  jy: "zhoo",
  ane: "ah-neh",

  // Lesson 4
  al: "ahl",
  ul: "ool",
};


// ============================================================
// SPEECH SYNTHESIS SUPPORT
// ============================================================

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

let cachedVoice = null;


// ============================================================
// VOICE SELECTION
// ============================================================

function pickVoice() {
  if (!supported) return;

  const voices = speechSynthesis.getVoices();

  if (!voices || voices.length === 0) {
    return;
  }

  const englishVoices = voices.filter(
    (voice) =>
      voice.lang &&
      voice.lang.toLowerCase().startsWith("en")
  );

  // Prefer a normal English voice because our input is already
  // converted into an English-readable phonetic approximation.
  //
  // We intentionally do NOT ask the browser to pronounce IPA.
  cachedVoice =
    englishVoices.find(
      (voice) =>
        voice.lang.toLowerCase() === "en-us"
    ) ||
    englishVoices.find(
      (voice) =>
        voice.lang.toLowerCase() === "en-gb"
    ) ||
    englishVoices[0] ||
    voices[0] ||
    null;
}


if (supported) {
  pickVoice();

  // Chrome and some other browsers load voices asynchronously.
  speechSynthesis.onvoiceschanged = () => {
    pickVoice();
  };
}


// ============================================================
// PUBLIC CHECK
// ============================================================

export function isSpeakable(text) {
  return (
    typeof text === "string" &&
    /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(
      text.trim()
    )
  );
}


// ============================================================
// WORD → PHONETIC SPELLING
// ============================================================

function pronounceWord(word) {
  const lower = word.toLowerCase();

  // First use a known pronunciation.
  if (Object.prototype.hasOwnProperty.call(WORD_MAP, lower)) {
    return WORD_MAP[lower];
  }

  // Otherwise build the pronunciation from Arcon letters.
  let result = "";
  let i = 0;

  while (i < lower.length) {
    const char = lower[i];

    if (Object.prototype.hasOwnProperty.call(LETTER_MAP, char)) {
      result += LETTER_MAP[char];
    } else {
      // Preserve unknown characters rather than crashing.
      result += char;
    }

    i++;
  }

  return result;
}


// ============================================================
// TEXT → SPEECH TEXT
// ============================================================

function transliterate(text) {
  return text
    .trim()
    .split(/\s+/)
    .map(pronounceWord)
    .join(", ");
}


// ============================================================
// SPEAK ARCON
// ============================================================

export function speakArcon(text) {
  if (!supported || !isSpeakable(text)) {
    return false;
  }

  const phoneticText = transliterate(text);

  // Stop anything currently speaking.
  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      phoneticText
    );

  if (cachedVoice) {
    utterance.voice = cachedVoice;
  }

  // The browser is reading our phonetic approximation as English.
  utterance.lang = "en-US";

  // Slightly slower gives the unusual Arcon sounds more room.
  utterance.rate = 0.86;

  utterance.pitch = 1.0;

  utterance.volume = 1.0;

  speechSynthesis.speak(utterance);

  return true;
}


// ============================================================
// STOP
// ============================================================

export function stopArcon() {
  if (supported) {
    speechSynthesis.cancel();
  }
}
