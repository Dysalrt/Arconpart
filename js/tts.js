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
  e: "ä", // Официальный [э]
  f: "f",
  g: "g",
  h: "gch", // Глубокий [х] внутри слов
  i: "i",
  j: "j",   // Внутри слов 'j' перед гласными работает как надо

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

  // ХАК ДЛЯ V: В немецком буква 'v' коварно читается как [ф].
  // Перенаправляем её на немецкую 'w', которая ВСЕГДА читается как чистый звонкий [в]!
  v: "w",
  
  // Сохраняем совместимость для старых материалов
  w: "w",
  
  x: "ks",
  y: "ü",
  z: "z",
};


// ============================================================
// COMMON ARCON WORD PHONETIC FORMS
// ============================================================
const WORD_MAP = {
  // Изолированные буквы (Урок 1)
  j: "zsch",   // Наш победный жужжащий [ж]!
  h: "ach",    
  e: "ä",     
  q: "ki",     
  x: "eks",    
  y: "ü",      
  u: "u",      

  //Lesson 1
  vi: "wui", // или "widd" — надо заставить его споткнуться и сказать коротко
  // Lesson 2
  // ХАК ДЛЯ QITE: Переписали на "kjitä". 
  // 'kj' дает идеальное мягкое [кь], 'i' звучит как чистая [и], 'tä' дает строгое [тэ]. 
  qite: "kjitä",  
  
  // Автоматически подхватит 'w' из LETTER_MAP и превратится в звонкое [вю]
  vy: "wü",       
  es: "äs",       

  // Lesson 3
  ro: "ro",
  jy: "jü",      
  ane: "anä",    

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
