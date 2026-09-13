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
// The goal is:
//   Arcon spelling → phonetic approximation → natural browser voice
//
// This is intentionally based on Arcon sounds, NOT English spelling rules.


// ============================================================
// BASIC ARCON SOUND MAP
// ============================================================
//
// Arcon:
// a = /a/
// e = /ɛ/
// i = /i/
// o = /o/
// u = /u/
// y = /y/
//
// c = /k/
// j = /ʒ/
// q = /kʲ/
// h = /x/
// x = /ks/

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

const WORD_MAP = {
  // Lesson 1 / basic phonology
  j: "zh",
  h: "kh",
  q: "ky",
  x: "ks",
  y: "ü",
  e: "eh",

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
