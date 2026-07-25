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
  lex = await res.json();
  return lex;
}

// Проходит по значению любого типа (строка / массив / объект) и возвращает
// новую версию с заменёнными %Слово% и ~Слово~ — сам объект не мутирует, отдаёт копию.
// %Слово% — подставляет перевод как есть.
// ~Слово~ — тот же перевод, но с заглавной первой буквой (для начала предложения).
export function resolveLex(value, dict) {
  if (typeof value === "string") {
    let result = value.replace(/%([^%]+)%/g, (match, key) => {
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
