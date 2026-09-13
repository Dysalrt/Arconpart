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
  e: "e",
  f: "f",
  g: "g",

  // ХАК ДЛЯ Х: "gch" или "x" заставляет немецкий TTS выдать глубокий задненёбный [х] без ухода в "ш"
  h: "gch",

  i: "i",

  // ХАК ДЛЯ Ж: используем "j", но внутри слов она будет работать только перед гласными.
  // Для надежности внутри слов заменим на "g", так как "gi" / "ge" в немецком часто [ʒ]
  j: "j",

  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "o",
  p: "p",

  // ХАК ДЛЯ МЯГКОГО К: "ki" дает мягкий [кь] без ухода в название буквы "ку/кьот"
  q: "ki",

  r: "r",
  s: "s",
  t: "t",

  // ЧИСТЫЙ У: убираем "h", оставляем просто "u"
  u: "u",
  v: "v",
  w: "v",
  x: "ks",
  y: "ü",
  z: "z",
};


// ============================================================
// COMMON ARCON WORD PHONETIC FORMS
// ============================================================
const WORD_MAP = {
  // Изолированные буквы (Урок 1). 
  // Даем движку полноценные французские/короткие слова, чтобы он ЗАБЫЛ про алфавит:
  
  j: "Galo",   // Читается как [Жа] (от слова Jalousie/Garage, движок выдаст чистый [ʒ])
  h: "ach",    // Читается как чистый твердый [Ха] (как в имени Бах)
  q: "ki",     // Читается как мягкий [Кь] 
  x: "eks",    // Читается как [Кс]
  y: "ü",      // Читается как чистый [Уь/Ю]
  e: "ä",      // Открытый [Э]
  u: "u",      // Чистый [У] без всяких "ха" на конце

  // Lesson 2
  qite: "kite",  // [Кьитэ]
  vy: "vü",       // [Вю]
  es: "es",       // [Эс]

  // Lesson 3
  ro: "ro",
  jy: "jü",      // Перед немецкой 'ü' буква 'j' прочитается как французское [Жю]!
  ane: "ane",

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
