// js/tts.js
// Arcon pronunciation layer.
// Browser SpeechSynthesis cannot consume IPA directly, so playback uses
// explicit phonetic approximations while lesson IPA remains canonical.

const manualOverrides = {
  alis: "AH-liss",
  "vys": "vys"
};

const map = {
  a: "ah", e: "eh", i: "ee", o: "oh", u: "oo",
  y: "you",
  b: "b", c: "k", d: "d", f: "f", g: "g", h: "h",
  j: "zh", k: "k", q: "kee", r: "r", s: "s", t: "t",
  v: "v", z: "z"
};

export function isSpeakable(text) {
  return typeof text === "string" && /^[A-Za-z]+$/.test(text.trim());
}

function transliterate(text) {
  return [...text.toLowerCase()]
    .map(char => map[char] ?? char)
    .join(" ");
}

function speechText(text) {
  const key = text.toLowerCase();
  return manualOverrides[key] ?? transliterate(text);
}

function chooseVoice(voices) {
  return (
    voices.find(v => /^en-US$/i.test(v.lang)) ||
    voices.find(v => /^en-GB$/i.test(v.lang)) ||
    voices.find(v => /^en/i.test(v.lang)) ||
    null
  );
}

export function speakArcon(text) {
  if (!("speechSynthesis" in window)) return false;
  if (!isSpeakable(text)) return false;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(speechText(text));
  const voice = chooseVoice(speechSynthesis.getVoices());

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-US";
  }

  utterance.rate = 0.72;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
  return true;
}

speechSynthesis.addEventListener("voiceschanged", () => {});
