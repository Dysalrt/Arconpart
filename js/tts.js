// tts.js — Arcon phonetic browser TTS (German Base Engine v9)
//
// API:
//   isSpeakable(text)
//   speakArcon(text)
//   stopArcon()
//
// v9:
// - Added stress support using apostrophe '
// - Example: a'ne
// - Apostrophe is NOT pronounced
// - Stress is simulated by speaking the stressed syllable/part
//   slightly slower and with a slightly higher pitch.
// - German browser TTS engine remains the base engine.
// - Existing v8 phonetic mapping is preserved.

const LETTER_MAP = {
  a: "a",
  b: "b",
  c: "k",
  d: "d",
  e: "ä",
  f: "f",
  g: "g",
  h: "h",
  i: "i",
  j: "sch",
  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "o",
  p: "p",
  q: "ki",
  r: "r",
  s: "s",
  t: "t",
  u: "u",
  v: "w",
  w: "w",
  x: "x",
  y: "ü",
  z: "z",
};

const WORD_MAP = {
  j: "scha",
  h: "h",
  e: "ä",
  q: "ki",
  x: "x",
  y: "ü",
  u: "u",

  qite: "kie'tä",
  ese: "esse",
  hul: "huhl",
  vi: "w",
  qo: "qö",
  cofe: "Kaffee",
  dezert: "däsärt",
  xer: "ksähr",
  von: "woon",
  var: "wahr",
  atejaj: "a'teschasch"
};

const supported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

let cachedVoice = null;

// ------------------------------------------------------------
// Voice selection
// ------------------------------------------------------------

function pickVoice() {
  if (!supported) return;

  const voices = speechSynthesis.getVoices();

  if (!voices || voices.length === 0) return;

  const germanVoices = voices.filter(
    (voice) =>
      voice.lang &&
      voice.lang.toLowerCase().startsWith("de")
  );

  if (germanVoices.length > 0) {
    const maleVoice = germanVoices.find((voice) => {
      const name = voice.name.toLowerCase();

      return (
        name.includes("stefan") ||
        name.includes("markus") ||
        name.includes("male") ||
        name.includes("premium") ||
        name.includes("guy")
      );
    });

    cachedVoice = maleVoice || germanVoices[0];
  } else {
    cachedVoice = voices[0] || null;
  }
}

if (supported) {
  pickVoice();

  speechSynthesis.onvoiceschanged = () => {
    pickVoice();
  };
}

// ------------------------------------------------------------
// Text validation
// ------------------------------------------------------------
//
// Apostrophe ' is now allowed because it marks stress.
//
// Examples:
//   ane
//   a'ne
//   v'our
//
// Spaces are still allowed between words.
//

export function isSpeakable(text) {
  return (
    typeof text === "string" &&
    /^[A-Za-z]+(?:'[A-Za-z]+)*(?:\s+[A-Za-z]+(?:'[A-Za-z]+)*)*$/.test(
      text.trim()
    )
  );
}

// ------------------------------------------------------------
// Basic Arcon -> German phonetic transliteration
// ------------------------------------------------------------

function pronounceWord(word) {
  const lower = word.toLowerCase();

  // Remove stress markers before checking WORD_MAP.
  const cleanWord = lower.replace(/'/g, "");

  if (
    Object.prototype.hasOwnProperty.call(
      WORD_MAP,
      cleanWord
    )
  ) {
    return WORD_MAP[cleanWord];
  }

  let result = "";

  for (let i = 0; i < cleanWord.length; i++) {
    const char = cleanWord[i];

    if (
      Object.prototype.hasOwnProperty.call(
        LETTER_MAP,
        char
      )
    ) {
      result += LETTER_MAP[char];
    } else {
      result += char;
    }
  }

  return result;
}

// ------------------------------------------------------------
// Stress parsing
// ------------------------------------------------------------
//
// The apostrophe means:
//
//   abc'def
//
// = stress the part after the apostrophe.
//
// The apostrophe itself disappears.
//
// Example:
//
//   a'ne
//
// becomes:
//
//   before = "a"
//   stressed = "ne"
//
// If there is no apostrophe, the whole word is spoken normally.
//

function parseStressWord(word) {
  const clean = word.trim();

  const stressIndex = clean.indexOf("'");

  if (stressIndex === -1) {
    return {
      hasStress: false,
      before: "",
      stressed: pronounceWord(clean),
      after: ""
    };
  }

  const beforeRaw = clean.slice(0, stressIndex);
  const afterRaw = clean.slice(stressIndex + 1);

  // Only the first apostrophe is treated as the stress marker.
  // Any additional apostrophes are removed.
  const before = pronounceWord(
    beforeRaw.replace(/'/g, "")
  );

  const stressed = pronounceWord(
    afterRaw.replace(/'/g, "")
  );

  return {
    hasStress: true,
    before,
    stressed,
    after: ""
  };
}

// ------------------------------------------------------------
// Speech helper
// ------------------------------------------------------------

function createUtterance(
  text,
  rate = 0.83,
  pitch = 0.95
) {
  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "de-DE";

  if (cachedVoice) {
    utterance.voice = cachedVoice;
  }

  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 1.0;

  return utterance;
}

// ------------------------------------------------------------
// Speak one word
// ------------------------------------------------------------
//
// Normal word:
//
//   ane
//
// -> one utterance
//
// Stressed word:
//
//   a'ne
//
// -> three parts:
//
//   "a"
//   "ne"  <- stressed
//
// This lets the browser TTS give the stressed part slightly
// more acoustic prominence.
//

function speakWord(word, done) {
  const parsed = parseStressWord(word);

  // No explicit stress marker.
  if (!parsed.hasStress) {
    const utterance = createUtterance(
      parsed.stressed,
      0.83,
      0.95
    );

    utterance.onend = () => {
      if (done) done();
    };

    utterance.onerror = () => {
      if (done) done();
    };

    speechSynthesis.speak(utterance);
    return;
  }

  const parts = [];

  if (parsed.before) {
    parts.push({
      text: parsed.before,
      rate: 0.83,
      pitch: 0.95
    });
  }

  if (parsed.stressed) {
    parts.push({
      text: parsed.stressed,
      // Slightly slower and higher.
      // This is the actual stress simulation.
      rate: 0.68,
      pitch: 1.08
    });
  }

  if (parsed.after) {
    parts.push({
      text: parsed.after,
      rate: 0.83,
      pitch: 0.95
    });
  }

  let index = 0;

  function speakNextPart() {
    if (index >= parts.length) {
      if (done) done();
      return;
    }

    const part = parts[index++];

    const utterance = createUtterance(
      part.text,
      part.rate,
      part.pitch
    );

    utterance.onend = () => {
      // Tiny pause between pieces prevents them from
      // becoming completely merged by some browsers.
      setTimeout(speakNextPart, 15);
    };

    utterance.onerror = () => {
      speakNextPart();
    };

    speechSynthesis.speak(utterance);
  }

  speakNextPart();
}

// ------------------------------------------------------------
// Main Arcon TTS
// ------------------------------------------------------------

export function speakArcon(text) {
  if (!supported || !isSpeakable(text)) {
    return false;
  }

  speechSynthesis.cancel();

  const words = text.trim().split(/\s+/);

  let index = 0;

  function speakNextWord() {
    if (index >= words.length) {
      return;
    }

    const word = words[index++];

    speakWord(word, () => {
      // Small natural pause between words.
      setTimeout(speakNextWord, 25);
    });
  }

  speakNextWord();

  return true;
}

// ------------------------------------------------------------
// Stop
// ------------------------------------------------------------

export function stopArcon() {
  if (supported) {
    speechSynthesis.cancel();
  }
}
