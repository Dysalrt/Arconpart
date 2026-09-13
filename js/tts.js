// tts.js — Arcon phonetic browser TTS (English Base Engine v7 - MALE & STABLE)
//
// API remains the same: isSpeakable(text), speakArcon(text), stopArcon()
//
// v7: Restored MALE voice preference. Kept the stable English engine
// base for 100% cross-device compatibility. Fully automated phonetics.

const LETTER_MAP = {
  a: "ah",   // Чистый открытый [а]
  b: "b",
  c: "k",
  d: "d",
  e: "eh",   // Чистый официальный [э]
  f: "f",
  g: "g",
  h: "kh",   // Глубокий хриплый [х]
  i: "ee",   // Чистый [и]
  
  // Наш проверенный жужжащий [ж] (как в слове vision)
  j: "zh",   
  
  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "o",
  p: "p",
  q: "ky",   // Мягкий [кь]
  r: "r",
  s: "s",
  t: "t",
  u: "oo",   // Мягкий глубокий [у]
  v: "v",
  w: "v",
  x: "ks",
  y: "ew",   // Твой [уь/ю]
  z: "z",
};

// Автоматика сама соберет все нужные слова
const WORD_MAP = {
  // Изолированные буквы (Урок 1) — добавляем "uh" ([э]),
  // чтобы мужской голос не читал одиночные буквы по алфавиту.
  j: "zhuh",   // Четкий короткий [ж]
  h: "khuh",   // Четкий короткий [х]
  e: "eh",     // Чистый [э]
  q: "kyuh",     
  x: "ksuh",    
  y: "ew",      
  u: "ooh",    

  // Исключение для слова "vi", чтобы мужской голос не тянул его:
  vi: "v",
};

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

let cachedVoice = null;

// Фильтруем голоса и принудительно ищем качественный МУЖСКОЙ английский голос
function pickVoice() {
  if (!supported) return;
  const voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return;

  const englishVoices = voices.filter(
    (voice) => voice.lang && voice.lang.toLowerCase().startsWith("en")
  );

  if (englishVoices.length > 0) {
    // Ищем маркеры мужских голосов (David, Mark, George, Google Male, George, etc.)
    const maleVoice = englishVoices.find((voice) => {
      const name = voice.name.toLowerCase();
      return name.includes("david") || 
             name.includes("mark") || 
             name.includes("george") || 
             name.includes("male") ||
             name.includes("premium male") ||
             name.includes("guy");
    });
    // Если мужской нашли — ставим его, если нет — берем первый доступный английский
    cachedVoice = maleVoice || englishVoices[0];
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
  utterance.lang = "en-US"; 

  if (cachedVoice) utterance.voice = cachedVoice;

  utterance.rate = 0.83; // Размеренный, строгий темп для мужского голоса
  utterance.pitch = 0.95; // Чуть-чуть занижаем тон для большей солидности и брутальности
  utterance.volume = 1.0;

  speechSynthesis.speak(utterance);
  return true;
}

export function stopArcon() {
  if (supported) speechSynthesis.cancel();
}
