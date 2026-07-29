// translate.js
// Пайплайн: любой язык → (Google Translate, неофициальный бесплатный эндпоинт) →
// английский текст → (наш алгоритм) → Arcon.
//
// Это НЕ ИИ-перевод. Два уровня обработки английского текста:
// 1) Распознавание базовых времён через глаголы (is/are/am + V-ing,
//    was/were + V-ing, will + V) — тут мы САМИ спрягаем глагол по правилам
//    Arcon (тип 1/2, +de/+da/+do), а не ищем перевод для "is"/"was"/"will" отдельно.
//    Уже проспрягированное слово прячем за временную метку-заглушку (§N§),
//    чтобы следующий шаг не перепутал готовый Arcon-глагол с ненайденным
//    английским словом.
// 2) Всё, что осталось — обычная подстановка слово-в-слово по LEX.json,
//    после чего заглушки разворачиваются обратно в реальные слова.
//
// Известное ограничение: простое настоящее/прошедшее без вспомогательного
// глагола (например "He runs", "He ran") пока не распознаётся — это
// потребовало бы таблицы неправильных английских форм, отдельная задача.

const VOWELS = new Set(["a", "e", "i", "o", "u", "ū"]);

let lexCache = null;

async function loadLex() {
  if (lexCache) return lexCache;
  const res = await fetch("data/LEX.json", { cache: "no-store" });
  lexCache = await res.json(); // { words: {...}, verbs: {...} }
  return lexCache;
}

// ---------- Спряжение по правилам Arcon ----------
function conjugate(infinitive, tense) {
  const lastChar = infinitive.slice(-1).toLowerCase();
  const isType1 = VOWELS.has(lastChar);
  const suffixes = {
    present: isType1 ? "de" : "e",
    past: isType1 ? "da" : "a",
    future: isType1 ? "do" : "o",
  };
  return infinitive + suffixes[tense];
}

// Убирает "ing" и разворачивает удвоенную согласную: running → runn → run.
// Не умеет восстанавливать немое "e" (writing → write) — известное ограничение.
function guessBaseVerb(gerundWithoutIng) {
  let base = gerundWithoutIng;
  if (base.length >= 2) {
    const last = base[base.length - 1].toLowerCase();
    const secondLast = base[base.length - 2].toLowerCase();
    if (last === secondLast && !VOWELS.has(last)) {
      base = base.slice(0, -1);
    }
  }
  return base;
}

function buildVerbLookup(verbs) {
  const lower = {};
  for (const key in verbs) lower[key.toLowerCase()] = verbs[key];
  return lower;
}

// Распознаёт "is/are/am + V-ing", "was/were + V-ing", "will + V" и заменяет
// всю конструкцию на временную метку-заглушку §N§, за которой прячется уже
// готовый проспрягированный Arcon-глагол (сам текст возвращается наружу
// в массиве resolved). Если глагола нет в словаре — конструкция не трогается.
function resolveVerbPhrases(text, verbs) {
  const verbsLower = buildVerbLookup(verbs);
  const resolved = [];

  function stash(word) {
    resolved.push(word);
    return `§${resolved.length - 1}§`;
  }

  text = text.replace(/\b(?:is|are|am)\s+(\w+?)ing\b/gi, (match, stem) => {
    const infinitive = verbsLower[guessBaseVerb(stem).toLowerCase()];
    return infinitive ? stash(conjugate(infinitive, "present")) : match;
  });

  text = text.replace(/\b(?:was|were)\s+(\w+?)ing\b/gi, (match, stem) => {
    const infinitive = verbsLower[guessBaseVerb(stem).toLowerCase()];
    return infinitive ? stash(conjugate(infinitive, "past")) : match;
  });

  text = text.replace(/\bwill\s+(\w+)\b/gi, (match, verb) => {
    const infinitive = verbsLower[verb.toLowerCase()];
    return infinitive ? stash(conjugate(infinitive, "future")) : match;
  });

  return { text, resolved };
}

// ---------- Google Translate (неофициальный эндпоинт) ----------
async function translateToEnglish(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Google Translate не ответил (возможно, эндпоинт временно недоступен).");
  }
  const data = await res.json();
  if (!data || !Array.isArray(data[0])) {
    throw new Error("Не удалось разобрать ответ Google Translate — формат неожиданный.");
  }
  return data[0].map((segment) => segment[0]).join("");
}

// ---------- Обычная подстановка слово-в-слово (для того, что не глагол) ----------
function matchCase(sourceWord, targetWord) {
  const isAllUpper = sourceWord.length > 1 && sourceWord === sourceWord.toUpperCase() && sourceWord !== sourceWord.toLowerCase();
  if (isAllUpper) return targetWord.toUpperCase();
  if (sourceWord[0] === sourceWord[0].toUpperCase()) return targetWord.charAt(0).toUpperCase() + targetWord.slice(1);
  return targetWord;
}

// §N§ — не буквы и не апостроф, поэтому попадает в "не слово" и не трогается.
function tokenize(text) {
  return text.match(/[A-Za-z']+|[^A-Za-z']+/g) || [];
}

function substituteWords(englishText, words) {
  const wordsLower = {};
  for (const key in words) wordsLower[key.toLowerCase()] = words[key];

  const missing = [];
  const tokens = tokenize(englishText).map((tok) => {
    const isWord = /^[A-Za-z']+$/.test(tok);
    if (!isWord) return tok; // включая §N§-заглушки — не трогаем

    const lower = tok.toLowerCase();
    if (lower in wordsLower) {
      return matchCase(tok, wordsLower[lower]);
    }
    missing.push(tok);
    return tok;
  });

  return { arcon: tokens.join(""), missing };
}

export async function translate(inputText) {
  const lex = await loadLex();
  const englishText = await translateToEnglish(inputText);

  const { text: afterVerbs, resolved } = resolveVerbPhrases(englishText, lex.verbs);
  const allWords = { ...lex.words, ...lex.verbs };
  let { arcon, missing } = substituteWords(afterVerbs, allWords);

  // Разворачиваем заглушки §N§ обратно в уже проспрягированные Arcon-слова
  arcon = arcon.replace(/§(\d+)§/g, (match, idx) => resolved[Number(idx)]);

  return { english: englishText, arcon, missing };
}
