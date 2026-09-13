// tts.js — Arcon phonetic browser TTS (German-based Engine v3)
//
// Keeps the same API used by lesson.js:
//   isSpeakable(text)
//   speakArcon(text)
//   stopArcon()
//
// IMPORTANT:
// Browser SpeechSynthesis does not have a standard way to receive IPA.
// Therefore this file uses carefully chosen German phonetic spellings instead
// of letting the German voice read Arcon spelling directly.
//
// v3 note: Fully migrated from English to German TTS engine.
// German text normalizer is much more predictable. Standalone letters
// are still padded with a trailing silent or short vowel where needed
// to prevent the engine from spelling out the letter names.

const LETTER_MAP = {
  a: "a",
  b: "b",
  c: "k",
  d: "d",

  // Pure open /ɛ/ — perfect in German as "e" or "ä"
  e: "e",

  f: "f",
  g: "g",

  // Arcon /x/ — German "ch" gives a perfect harsh 'kh' sound
  h: "ch",

  i: "i",

  // Arcon /ʒ/ — Your genius "jh" hack for pure [ж] sound
  j: "jh",

  k: "k",
  l: "l",
  m: "m",
  n: "n",

  o: "o",
  p: "p",

  // Arcon /kʲ/ (soft k) — approximated with "kj" in German
  q: "kj",

  r: "r",
  s: "s",
  t: "t",

  // Arcon /u/ — pure "u" in German
  u: "u",
  v: "v",

  // Kept for compatibility with older Arcon material.
  w: "v",

  // Arcon /ks/ — "ks" or "x" in German
  x: "ks",

  // Arcon /y/ — German native "ü"
  y: "ü",

  z: "z",
};


// ============================================================
// COMMON ARCON WORD PHONETIC FORMS
// ============================================================
const WORD_MAP = {
  // Lesson 1 / basic phonology — standalone letters
  // Padded with a trailing "ha" or vowel to force the German engine
  // to pronounce the sound instead of saying the alphabet letter name (e.g., "jot", "ka").
  j: "jha",   // Reads as a short [жа]
  h: "cha",   // Reads as [ха]
  q: "kja",   // Reads as soft [кя]
  x: "ksa",   // Reads as [кса]
  y: "ü",     // German reads standalone "ü" perfectly as a sound
  e: "ä",     // Forces open /ɛ/ sound
  u: "uh",    // Deep pure [у]

  // Lesson 2
  qite: "kjite",  // Soft [кь]-и-те
  vy: "vü",       // Perfect [вю]
  es: "es",       // Short German [эс]

  // Lesson 3
  ro: "ro",
  jy: "jhü",      // Clean [жю] / [ж] + немецкий ü
  ane: "ane",     // Clean German pronunciation [а-не]

  // Lesson 4
  al: "al",
  ul: "ul",
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
// VOICE SELECTION (SWITCHED TO GERMAN)
// ============================================================

function pickVoice() {
  if (!supported) return;

  const voices = speechSynthesis.getVoices();

  if (!voices || voices.length === 0) {
    return;
  }

  // Look for German voices now
  const germanVoices = voices.filter(
    (voice) =>
      voice.lang &&
      voice.lang.toLowerCase().startsWith("de")
  );

  // Fallback cascade for German locales
  cachedVoice =
    germanVoices.find(
      (voice) =>
        voice.lang.toLowerCase() === "de-de"
    ) ||
    germanVoices.find(
      (voice) =>
        voice.lang.toLowerCase() === "de-at"
    ) ||
    germanVoices[0] ||
    voices[0] ||
    null;
}


if (supported) {
  pickVoice();

  // Chrome loads voices asynchronously
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

  // First use a known exception map.
  if (Object.prototype.hasOwnProperty.call(WORD_MAP, lower)) {
    return WORD_MAP[lower];
  }

  // Otherwise build the pronunciation letter-by-letter using German phonetics.
  let result = "";
  let i = 0;

  while (i < lower.length) {
    const char = lower[i];

    if (Object.prototype.hasOwnProperty.call(LETTER_MAP, char)) {
      result += LETTER_MAP[char];
    } else {
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

  // CHANGED: The browser now reads our text using German phonetic rules
  utterance.lang = "de-DE";

  // Slightly slower to keep the synthetic voice clear
  utterance.rate = 0.84;

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
