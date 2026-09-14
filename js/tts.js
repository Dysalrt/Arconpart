// tts.js — Arcon phonetic browser TTS (German Base Engine v8 - LANGUAGE UPDATE)
//
// API remains the same: isSpeakable(text), speakArcon(text), stopArcon()
//
// v8: Returned to German engine. Applied core language update: 
// Letter 'j' now officially produces the [ʃ] (sh) sound.
// Fully automated phonetic building, NO MORE manual WORD_MAP hacks needed.

const LETTER_MAP = {
  a: "a",
  b: "b",
  c: "k",
  d: "d",
  
  // Официальный строгий [э] через немецкий умляут
  e: "ä", 
  
  f: "f",
  g: "g",
  
  // Глубокий немецкий [х] внутри слов (как в Bach)
  h: "h", 
  i: "i",
  
  // ОБНОВЛЕНИЕ ЯЗЫКА: Теперь 'j' — это немецкий чистейший "sch" [ʃ] (ш)
  j: "sch",   
  
  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "o",
  p: "p",
  q: "ki",   // Мягкий [кь]
  r: "r",
  s: "s",
  t: "t",
  u: "u",    // Чистый [у]
  
  // Настоящий звонкий [в] через немецкую 'w'
  v: "w",
  w: "w",
  x: "x",
  
  // Твой звук [уь/ю] через нативный немецкий умляут
  y: "ü", 
  z: "z",
};

// WORD_MAP теперь пустой — немецкая автоматика сама прочитает всё как пишется!
const WORD_MAP = {
  // Изолированные буквы (Урок 1) — добавляем короткий гласный хвостик, 
  // чтобы движок не читал алфавитные названия букв ("ха", "у", "ку").
  j: "scha",   // Чистый короткий звук [ш]
  h: "h",    // Чистый короткий звук [х]
  e: "ä",      // Официальный [э]
  q: "ki",     
  x: "x",    
  y: "ü",      
  u: "u",      

  // Исключение для слова "vi", чтобы оно звучало отрывисто и без затягивания:
  vi: "w",
};

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

let cachedVoice = null;

// Ищем качественный МУЖСКОЙ немецкий голос
function pickVoice() {
  if (!supported) return;
  const voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return;

  const germanVoices = voices.filter(
    (voice) => voice.lang && voice.lang.toLowerCase().startsWith("de")
  );

  if (germanVoices.length > 0) {
    // Ищем мужские немецкие голоса (Stefan, Markus, Google Deutsch, Male, etc.)
    const maleVoice = germanVoices.find((voice) => {
      const name = voice.name.toLowerCase();
      return name.includes("stefan") || 
             name.includes("markus") || 
             name.includes("male") ||
             name.includes("premium") ||
             name.includes("guy");
    });
    cachedVoice = maleVoice || germanVoices[0];
  } else {
    cachedVoice = voices[0] || null;
  }
}

if (supported) {
  pickVoice();
  speechSynthesis.onvoiceschanged = () => { pickVoice(); };
}

export function isSpeakable(text) {
  return typeof text === "string" && /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(text.trim());
}

function pronounceWord(word) {
  const lower = word.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(WORD_MAP, lower)) {
    return WORD_MAP[lower];
  }

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

function transliterate(text) {
  return text.trim().split(/\s+/).map(pronounceWord).join(" ");
}

export function speakArcon(text) {
  if (!supported || !isSpeakable(text)) return false;
  
  const phoneticText = transliterate(text);
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(phoneticText);
  utterance.lang = "de-DE"; 

  if (cachedVoice) utterance.voice = cachedVoice;

  utterance.rate = 0.83; // Размеренный, строгий мужской темп
  utterance.pitch = 0.95; // Солидный низкий тон
  utterance.volume = 1.0;

  speechSynthesis.speak(utterance);
  return true;
}

export function stopArcon() {
  if (supported) speechSynthesis.cancel();
}
