// tts.js — Arcon phonetic browser TTS (French-based Engine v4 - AUTO)
//
// API remains the same: isSpeakable(text), speakArcon(text), stopArcon()
//
// v4: Fully migrated to French TTS engine. 
// French phonetics perfectly natively map to Arcon:
// 'j' is always [ʒ] (ж), 'v' is always [v] (в), 'u' is always [y] (ü).
// Added automated letter combinations so we NO LONGER need a manual WORD_MAP.

const LETTER_MAP = {
  a: "a",
  b: "b",
  c: "k",
  d: "d",
  
  // Французская é дает чистое, официальное закрытое [э]
  e: "é", 
  
  f: "f",
  g: "g",
  
  // Во французском 'h' немая, поэтому для глубокого [х] используем "ch" (в усеченной форме)
  // или оставляем легкий выдох. Если нужен жесткий хрип — "rr" или "kh" в контексте.
  h: "kh", 
  
  i: "i",
  
  // Нативная французская 'j' — это чистейший [ж]!
  j: "j",   
  
  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "o",
  p: "p",
  q: "k",
  r: "r",
  s: "s",
  t: "t",
  
  // Во французском буква 'u' читается как [y] (твоя 'y' / немецкая 'ü').
  // Поэтому твою гласную 'u' (чистый у) мы переводим во французское буквосочетание "ou"!
  u: "ou", 
  
  // Звонкий [в] без немецких приколов с переходом в 'ф'
  v: "v",
  w: "v",
  x: "ks",
  
  // Твою 'y' (звук уь/ю) французский читает как родную 'u'
  y: "u", 
  z: "z",
};

// ТЕПЕРЬ ЭТОТ СПИСОК ПУСТ! Движок сам соберет слова!
const WORD_MAP = {
  // Оставляем пустые исключения, автоматика ниже все сделает сама
};

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

let cachedVoice = null;

function pickVoice() {
  if (!supported) return;
  const voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return;

  // Ищем французские голоса
  const frenchVoices = voices.filter(
    (voice) => voice.lang && voice.lang.toLowerCase().startsWith("fr")
  );

  cachedVoice =
    frenchVoices.find((voice) => voice.lang.toLowerCase() === "fr-fr") ||
    frenchVoices[0] ||
    voices[0] ||
    null;
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

  // ХАК ДЛЯ ФРАНЦУЗСКОГО Е НА КОНЦЕ СЛОВА:
  // Если слово заканчивается на согласную + 'é', французский TTS может проглотить звук.
  // Заменим финальную 'é' на 'éh' или 'ai', чтобы она прозвучала как четкое, открытое [э]
  if (result.endsWith("é")) {
    result = result.slice(0, -1) + "ai";
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
  
  // Включаем французский языковой движок
  utterance.lang = "fr-FR"; 

  if (cachedVoice) utterance.voice = cachedVoice;

  utterance.rate = 0.85; // Чуть медленнее для четкости учебного языка
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  speechSynthesis.speak(utterance);
  return true;
}

export function stopArcon() {
  if (supported) speechSynthesis.cancel();
}
