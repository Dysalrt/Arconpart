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

// ============================================================
// COMMON ARCON WORD PHONETIC FORMS
// ============================================================
const WORD_MAP = {
  // Изолированные буквы (Урок 1)
  j: "jă",   
  h: "hă",   
  e: "e",    
  q: "k",     
  x: "ks",    
  y: "ü",      
  u: "u",      

  vi: "vii", 
  
  // Lesson 4
  al: "al",
  // ХАК ДЛЯ UL: Дублируем 'u' -> 'uul'. 
  // Женский голос четко пропевает протяжное [у-ул], полностью убирая игнорирование звука!
  ul: "uul", 
};

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

let cachedVoice = null;



// ============================================================
// VOICE SELECTION (FORCE ROMANIAN FEMALE)
// ============================================================

function pickVoice() {
  if (!supported) return;

  const voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return;

  // 1. Ищем все румынские голоса
  const roVoices = voices.filter(
    (voice) => voice.lang && voice.lang.toLowerCase().startsWith("ro")
  );

  if (roVoices.length > 0) {
    // 2. Пытаемся найти среди румынских голосов ЖЕНСКИЙ 
    // (в именах часто содержатся "female", "ioana", "elena" и т.д.)
    const femaleRoVoice = roVoices.find((voice) => {
      const name = voice.name.toLowerCase();
      return name.includes("female") || 
             name.includes("ioana") || 
             name.includes("elena") || 
             name.includes("ziana") ||
             name.includes("girl");
    });

    // Если нашли женский — берем его, если нет — берем любой румынский дефолтный
    cachedVoice = femaleRoVoice || roVoices[0];
  } else {
    // Если румынского нет, берем дефолтный голос устройства
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
