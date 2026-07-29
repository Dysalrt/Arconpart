// lexicon.js
// Общий словарь Английский → Arcon (data/LEX.json).
// В любом текстовом поле урока можно написать %Слово% — прежде чем
// урок покажется на экране, это автоматически заменится на перевод.
// Работает рекурсивно: не важно, в каком поле находится строка —
// theory, title, prompt, options, answers, pairs — где угодно.

let lex = null;

export async function loadLexicon() {
  if (lex) return lex; // грузим один раз за сессию, дальше отдаём из памяти
  const res = await fetch("data/LEX.json", { cache: "no-store" });
  const raw = await res.json();
  // LEX.json теперь разделён на words/verbs (это нужно только переводчику,
  // чтобы знать, какие слова спрягать) — а для %Слово%/~Слово~ в уроках
  // нужен просто один плоский словарь, без разницы, откуда слово.
  lex = { ...raw.words, ...raw.verbs };
  return lex;
}

const VOWELS = new Set(["a", "e", "i", "o", "u", "ū"]);

// Проходит по значению любого типа (строка / массив / объект) и возвращает
// новую версию с заменёнными %Слово%, ~Слово~ и условными суффиксами.
// %Слово% — подставляет перевод как есть.
// ~Слово~ — тот же перевод, но с заглавной первой буквой (для начала предложения).
// %Слово%{если_гласная, если_согласная} — подставляет перевод + один из двух
// суффиксов, в зависимости от того, на какую букву заканчивается САМ ПЕРЕВОД
// (а не английское слово) — это значит, суффикс не переносится вручную,
// а посчитается заново, если слово в LEX.json когда-нибудь изменится.
export function resolveLex(value, dict) {
  if (typeof value === "string") {
    let result = value;

    // Сначала — комбинированный шаблон с условным суффиксом, ДО обычной
    // замены %Слово%/~Слово~, иначе "{если_гласная, если_согласная}"
    // останется висеть в тексте без своего слова.
    result = result.replace(
      /([%~])([^%~]+)\1\{([^,}]*),([^}]*)\}/g,
      (match, marker, key, ifVowel, ifConsonant) => {
        if (!(key in dict)) {
          console.warn(`LEX: слово "${key}" не найдено в словаре — оставляю как есть`);
          return match;
        }
        let word = dict[key];
        if (marker === "~") word = word.charAt(0).toUpperCase() + word.slice(1);
        const lastChar = word.slice(-1).toLowerCase();
        const suffix = VOWELS.has(lastChar) ? ifVowel.trim() : ifConsonant.trim();
        return word + suffix;
      }
    );

    // Обычные %Слово% и ~Слово~ — то, что осталось без условного суффикса
    result = result.replace(/%([^%]+)%/g, (match, key) => {
      if (key in dict) return dict[key];
      console.warn(`LEX: слово "${key}" не найдено в словаре — оставляю как есть`);
      return match;
    });
    result = result.replace(/~([^~]+)~/g, (match, key) => {
      if (key in dict) {
        const word = dict[key];
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      console.warn(`LEX: слово "${key}" не найдено в словаре — оставляю как есть`);
      return match;
    });

    return result;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveLex(v, dict));
  }
  if (value && typeof value === "object") {
    const result = {};
    for (const key in value) {
      result[key] = resolveLex(value[key], dict);
    }
    return result;
  }
  return value; // числа, null, boolean — без изменений
}
