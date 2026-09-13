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

  // Строгое официальное [Э] через А-умляут для всего языка
  e: "ä",

  f: "f",
  g: "g",

  // Глубокий [Х] внутри слов
  h: "gch",

  i: "i",

  // Буква j внутри слов перед гласными (в сочетаниях вроде jü)
  j: "j",

  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "o",
  p: "p",
  q: "ki",
  r: "r",
  s: "s",
  t: "t",
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
// ============================================================
// COMMON ARCON WORD PHONETIC FORMS
// ============================================================
const WORD_MAP = {
  // ============================================================
  // Урок 1: Изолированные буквы (Стабильные фонетические маркеры)
  // ============================================================

  // Чистый [ж]. Слово "Gend" немецкий TTS читает по французской модели. 
  // Звучит как чистый [ж], плавно переходящий в короткий носовой выдох. Никаких "гало".
  j: "Gend",   

  // Возвращаем рабочий вариант: дает четкий, глубокий звук [х]
  h: "ach",    

  // Изолированное официальное [Э] через А-умляут
  e: "ä",     

  q: "ki",     
  x: "eks",    
  y: "ü",      
  u: "u",      

  // ============================================================
  // Остальные уроки (Внутри слов всё работает отлично)
  // ============================================================
  qite: "kite",  
  vy: "vü",       
  es: "äs",       

  ro: "ro",
  jy: "jü",      // Внутри слова 'j' + 'ü' дает идеальное [жю]
  ane: "anä",    

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
