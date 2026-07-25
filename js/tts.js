// tts.js
// Автоматическая озвучка без записанного голоса — транслитерация Arcon
// в кириллицу и проигрывание через системный русский голос (Web Speech API).
// Полностью независим от Telegram — работает в любом браузере.

const LETTER_MAP = {
  a: "а", b: "б", c: "к", d: "д", e: "э", f: "ф", g: "г",
  h: "х", i: "и", j: "ж", k: "к", l: "л", m: "м", n: "н",
  o: "о", p: "п", q: "к", r: "р", s: "с", t: "т", u: "у",
  "ū": "ю", v: "в", w: "в", x: "кс", y: "и", z: "з",
};

// Точечные исключения для слов, которые синтезатор читает криво по общим правилам.
// Ключ — слово Arcon в нижнем регистре.
const OVERRIDES = {
  // "vūs": "вус",
};

function transliterate(word) {
  const lower = word.toLowerCase();
  if (lower in OVERRIDES) return OVERRIDES[lower];
  return lower
    .split("")
    .map((ch) => (ch in LETTER_MAP ? LETTER_MAP[ch] : ch))
    .join("");
}

const supported = "speechSynthesis" in window;
let ruVoice = null;

function pickVoice() {
  if (!supported) return;
  const voices = speechSynthesis.getVoices();
  const ruVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("ru"));
  ruVoice = ruVoices.find((v) => v.name.toLowerCase().includes("google")) || ruVoices[0] || null;
}

if (supported) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

export function speak(text, isArconWord = true) {
  if (!supported) return;
  const toSay = isArconWord ? transliterate(text) : text;
  const utter = new SpeechSynthesisUtterance(toSay);
  utter.lang = "ru-RU";
  if (ruVoice) utter.voice = ruVoice;
  utter.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

export function isSpeakable(text) {
  return /^[A-Za-zŪū]+$/.test(text.trim());
}

export { transliterate };
export const isSupported = supported;
