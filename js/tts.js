// js/tts.js

const manualOverrides = {
  // Explicit pronunciation for alis: Arcon [alis]
  alis: "ah-lees"
};

const map = {
  ū: "you",
  j: "y",
  q: "kee",
  c: "k",

  // Arcon vowels
  a: "ah",
  e: "eh",
  i: "ee",
  o: "oh",
  u: "oo",

  b: "b",
  d: "d",
  f: "f",
  g: "g",
  h: "h",
  k: "k",
  r: "r",
  s: "s",
  t: "t",
  v: "v",
  z: "z"
};

const isSpeakable = text =>
  /^[A-Za-zū]+$/.test(text);

function arconToSpeech(text) {
  const key = text.toLowerCase();

  // Word-specific pronunciation has priority.
  if (manualOverrides[key]) {
    return manualOverrides[key];
  }

  return [...key]
    .map(char => map[char] ?? char)
    .join("");
}

export function speak(text) {
  if (!("speechSynthesis" in window)) return;
  if (!isSpeakable(text)) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(
    arconToSpeech(text)
  );

  // English voice because the browser TTS understands
  // the pronunciation hints such as "ee" better.
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  utterance.pitch = 1;

  const voices = speechSynthesis.getVoices();

  const voice =
    voices.find(v => v.lang === "en-US") ||
    voices.find(v => v.lang.startsWith("en-")) ||
    voices.find(v => v.lang.startsWith("en"));

  if (voice) {
    utterance.voice = voice;
  }

  speechSynthesis.speak(utterance);
}

// Some browsers load voices asynchronously.
speechSynthesis.addEventListener("voiceschanged", () => {});
