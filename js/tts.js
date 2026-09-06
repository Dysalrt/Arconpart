const manualOverrides = {
  // Add entries such as: "qite": "kee-te"
};

const map = {
  a: "ah",
  b: "b",
  c: "k",
  d: "d",
  e: "eh",
  f: "f",
  g: "g",
  h: "h",
  i: "ee",
  j: "zh",
  k: "k",
  q: "ky",
  r: "r",
  s: "s",
  t: "t",
  u: "oo",
  v: "v",
  z: "z",
  ū: "y"
};

export function isSpeakable(text) {
  return typeof text === "string" && /^[A-Za-zū]+$/.test(text.trim());
}

function transliterate(text) {
  return [...text.toLowerCase()]
    .map(c => map[c] ?? c)
    .join("");
}

export function speakArcon(text) {
  if (!isSpeakable(text)) return false;

  const key = text.toLowerCase();

  const utterance = new SpeechSynthesisUtterance(
    manualOverrides[key] ?? transliterate(text)
  );

  const voices = speechSynthesis.getVoices();

  utterance.voice =
    voices.find(v => /^en-US$/i.test(v.lang)) ||
    voices.find(v => /^en-GB$/i.test(v.lang)) ||
    voices.find(v => /^en/i.test(v.lang)) ||
    null;

  utterance.lang = utterance.voice?.lang || "en-US";
  utterance.rate = 0.78;

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);

  return true;
}
