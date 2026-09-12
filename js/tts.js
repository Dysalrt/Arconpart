// tts.js — Arcon IPA TTS
// The Arcon spelling is converted directly to IPA before being sent
// to the browser's SpeechSynthesis engine.
//
// IMPORTANT:
// This does NOT use English spelling rules.
// Arcon letters are converted to their actual phonetic values.
//
// Arcon:
// a = [a]
// e = [ɛ]
// i = [i]
// o = [o]
// u = [u]
// y = [y]
// j = [ʒ]
// q = [kʲ]
// h = [x]
// x = [ks]
// c = [k]

const IPA_MAP = {
  a: "a",
  b: "b",
  c: "k",
  d: "d",
  e: "ɛ",
  f: "f",
  g: "g",
  h: "x",
  i: "i",
  j: "ʒ",
  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "o",
  p: "p",
  q: "kʲ",
  r: "r",
  s: "s",
  t: "t",
  u: "u",
  v: "v",
  w: "v",
  x: "ks",
  y: "y",
  z: "z",
};

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

let cachedVoice = null;

function pickVoice() {
  if (!supported) return;

  const voices = speechSynthesis.getVoices();

  if (!voices.length) return;

  // Prefer voices that are likely to handle IPA/foreign phonetics
  // reasonably well.
  cachedVoice =
    voices.find(v => v.lang?.toLowerCase() === "en-us") ||
    voices.find(v => v.lang?.toLowerCase().startsWith("en")) ||
    voices[0] ||
    null;
}

if (supported) {
  pickVoice();

  speechSynthesis.onvoiceschanged = () => {
    pickVoice();
  };
}


/**
 * Check whether the text can be pronounced as Arcon.
 */
export function isSpeakable(text) {
  return (
    typeof text === "string" &&
    /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(text.trim())
  );
}


/**
 * Convert Arcon spelling directly into IPA.
 *
 * Example:
 *   es   -> ɛs
 *   ro   -> ro
 *   jy   -> ʒy
 *   ane  -> anɛ
 *   vys  -> vys
 *   x    -> ks
 *   q    -> kʲ
 *   h    -> x
 *   j    -> ʒ
 *   c    -> k
 */
function arconToIPA(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      let result = "";

      for (const char of word) {
        result += IPA_MAP[char] ?? char;
      }

      return result;
    })
    .join(" ");
}


/**
 * Speak Arcon using IPA rather than English spelling.
 */
export function speakArcon(text) {
  if (!supported || !isSpeakable(text)) {
    return false;
  }

  const ipa = arconToIPA(text.trim());

  speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(ipa);

  if (cachedVoice) {
    utter.voice = cachedVoice;
  }

  // Keep it slightly slower than normal English TTS.
  // This gives unusual Arcon phonemes a little more room.
  utter.rate = 0.82;
  utter.pitch = 1.0;

  // We deliberately do NOT set an English spelling approximation here.
  utter.lang = "en-US";

  speechSynthesis.speak(utter);

  return true;
}


/**
 * Stop current Arcon pronunciation.
 */
export function stopArcon() {
  if (supported) {
    speechSynthesis.cancel();
  }
}
