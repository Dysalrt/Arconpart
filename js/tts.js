// tts.js — Arcon phonetic browser TTS (English Base Engine v6 - STABLE & SOFT)
//
// API remains the same: isSpeakable(text), speakArcon(text), stopArcon()
//
// v6: Switched back to English engine to ensure 100% device compatibility.
// Fully automated phonetic translation into English syllables.
// Hard-coded rules force English voices to say soft [ʒ], clean [y/ü] and clear [u].

const LETTER_MAP = {
  a: "ah",   // Чистый открытый [а]
  b: "b",
  c: "k",
  d: "d",
  e: "eh",   // Чистый официальный [э] (как в слове "eh")
  f: "f",
  g: "g",
  h: "kh",   // Глубокий хриплый [х]
  i: "ee",   // Чистый [и]

  // СТАБИЛЬНЫЙ Ж: "zh" заставляет английский TTS выдать чистый, 
  // мягкий, жужжащий звук [ʒ] (как в слове vision / measure)
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
  
  // СТАБИЛЬНЫЙ У: "oo" дает мягкий глубокий звук [у]
  u: "oo",   
  
  v: "v",
  w: "v",
  x: "ks",
  
  // СТАБИЛЬНЫЙ УЬ/Ю: "ew" или "u" в американском английском дает нужный срез [y]
  y: "ew",   
  z: "z",
};

// WORD_MAP теперь пустой — автоматика сама склеит фонемы как нужно!
const WORD_MAP = {
  // Изолированные буквы (Урок 1) — добавляем нейтральный гласный хвост "uh" ([э]),
  // чтобы движок не читал одиночные буквы по алфавиту (как "джей", "эйч").
  j: "zhuh",   // Четкий короткий [ж]
  h: "khuh",   // Четкий короткий [х]
  e: "eh",     // Чистый [э]
  q: "kyuh",     
  x: "ksuh",    
  y: "ew",      
  u: "ooh",    

  // Исключение для слова "vi", чтобы оно не растягивалось:
  vi: "v",
};

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

let cachedVoice = null;

// Ищем качественный женский английский голос (Google, Microsoft, Apple)
function pickVoice() {
  if (!supported) return;
  const voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return;

  const englishVoices = voices.filter(
    (voice) => voice.lang && voice.lang.toLowerCase().startsWith("en")
  );

  if (englishVoices.length > 0) {
    // Ищем женские голоса (Zira, Google US English, Samantha, Hazel, etc.)
    const femaleVoice = englishVoices.find((voice) => {
      const name = voice.name.toLowerCase();
      return name.includes("zira") || 
             name.includes("google us english") || 
             name.includes("samantha") || 
             name.includes("hazel") ||
             name.includes("female") ||
             name.includes("natural");
    });
    cachedVoice = femaleVoice || englishVoices[0];
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

  utterance.rate = 0.82; // Мягкий, размеренный темп для четкости гласных
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  speechSynthesis.speak(utterance);
  return true;
}

export function stopArcon() {
  if (supported) speechSynthesis.cancel();
}
