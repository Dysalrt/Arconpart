// tts.js — Arcon phonetic browser TTS (Romanian-based Engine v5 - CLEAN)
//
// API remains the same: isSpeakable(text), speakArcon(text), stopArcon()
//
// v5: Fully migrated to Romanian TTS engine.
// Romanian has native [ʒ] for 'j', native [v] for 'v', and native strict [e] for 'e'.
// It reads strictly phonetically (as written), eliminating French silent letter issues.

const LETTER_MAP = {
  a: "a",
  b: "b",
  c: "k",
  d: "d",
  
  // В румынском 'e' — это всегда чистое, официальное [э]
  e: "e", 
  
  f: "f",
  g: "g",
  
  // Для глубокого [х] румынская 'h' подходит идеально (звучит как чистый хрип)
  h: "h", 
  
  i: "i",
  
  // Нативная румынская 'j' — это ВСЕГДА чистейший [ж] в любой позиции!
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
  u: "u", 
  v: "v",
  w: "v",
  x: "ks",
  
  // Твой звук [уь/ю] передаем через 'ü', румынский TTS прочитает её правильно
  y: "ü", 
  z: "z",
};

const WORD_MAP = {
  // Одиночные буквы (Урок 1). 
  // Румынский нормализатор на одиночные буквы скажет их названия: "же", "ха", "ве".
  // Поэтому для алфавита МЫ ХАРДКОДИМ чистые звуки, добавляя короткое "а" или "э":
  j: "jă",   // Короткий [ж] с нейтральным выдохом
  h: "hă",   // Короткий [х]
  e: "e",    // Чистый [э]
  q: "k",     
  x: "ks",    
  y: "ü",      
  u: "u",      

  // Специфические слова, где нужно скорректировать румынское произношение:
  
  // В румынском финальное 'i' после согласных укорачивается. 
  // Чтобы "vi" звучало как полноценное, сочное [ви], пишем две 'ii'
  vi: "vii", 
  
  // Твои слова теперь собираются АВТОМАТИЧЕСКИ и без костылей:
  // "jy" соберется как "jü" -> нативный румынский [ж] + [ü] = идеальное [жю/жу]!
  // "jyde" соберется как "jüde" -> идеальное [жюдэ]!
  // "vys" соберется как "wüs" -> прочитаются ВСЕ буквы, включая 's' на конце!
};

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

let cachedVoice = null;

// ============================================================
// VOICE SELECTION (ROMANIAN - FIXED ASSET CONVERSION)
// ============================================================

function pickVoice() {
  if (!supported) return;

  const voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return;

  // Ищем румынские голоса
  const roVoices = voices.filter(
    (voice) => voice.lang && voice.lang.toLowerCase().startsWith("ro")
  );

  if (roVoices.length > 0) {
    // Берем строго ПЕРВЫЙ объект голоса из найденных румынских
    cachedVoice = roVoices.find((voice) => voice.lang.toLowerCase() === "ro-ro") || roVoices[0];
  } else {
    // Если на устройстве вообще нет румынского языка, берем самый первый дефолтный объект
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
  
  // Включаем румынский движок
  utterance.lang = "ro-RO"; 

  if (cachedVoice) utterance.voice = cachedVoice;

  utterance.rate = 0.84; 
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  speechSynthesis.speak(utterance);
  return true;
}

export function stopArcon() {
  if (supported) speechSynthesis.cancel();
}
