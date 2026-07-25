// lesson.js
// Точка входа для lesson.html. Какой именно урок показать — читаем
// из sessionStorage (его туда положил home.js перед переходом сюда).

import { load as loadProgress, completeLesson, getPercent } from "./progress.js";
import { loadCourse, loadLesson, findLessonMeta, getTotalLessonsCount } from "./lessons.js";
import * as Exercises from "./exercises.js";
import { speak, isSpeakable } from "./tts.js";

const screens = {
  lesson: document.getElementById("screen-lesson"),
  complete: document.getElementById("screen-complete"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

let activeLesson = null;
let itemIndex = 0;
let hearts = 3;
let correctCount = 0;
let exerciseTotal = 0;

const contentEl = document.getElementById("lesson-content");
const actionBtn = document.getElementById("lesson-action-btn");
const feedbackEl = document.getElementById("lesson-feedback");
const heartsEl = document.getElementById("lesson-hearts");
const progressFill = document.getElementById("lesson-progress-fill");

// ---------- Озвучка слов в теории ----------
function speakSpan(word) {
  if (!isSpeakable(word)) return word;
  return `<span>${word}</span> <button class="speak-btn" data-word="${word}" type="button">🔊</button>`;
}

function renderWord(wordStr) {
  if (wordStr.includes("→")) {
    const [left, right] = wordStr.split("→").map((s) => s.trim());
    return `${speakSpan(left)} → ${speakSpan(right)}`;
  }
  return speakSpan(wordStr);
}

contentEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".speak-btn");
  if (btn) speak(btn.dataset.word);
});

// ---------- Рендер карточки теории ----------
function renderTheoryItem(item) {
  const examplesHtml = (item.examples || []).map((ex) => `
    <div class="example-card">
      <div>
        <div class="word">${renderWord(ex.word)}</div>
        ${ex.translation ? `<div class="translation">${ex.translation}</div>` : ""}
      </div>
      <div class="ipa">${ex.ipa}</div>
    </div>
  `).join("");

  contentEl.innerHTML = `
    <h2>${item.title}</h2>
    <p>${item.theory}</p>
    ${examplesHtml}
  `;
}

function updateHeartsDisplay() {
  heartsEl.textContent = "❤️".repeat(hearts) + "🖤".repeat(3 - hearts);
}

// ---------- Рендер текущего элемента урока (теория ИЛИ задание) ----------
function renderCurrentItem() {
  const item = activeLesson.lesson[itemIndex];
  const pct = Math.round((itemIndex / activeLesson.lesson.length) * 100);
  progressFill.style.width = pct + "%";
  feedbackEl.classList.add("hidden");

  if (item.type === "T") {
    heartsEl.classList.add("hidden");
    actionBtn.textContent = "Продолжить";
    actionBtn.disabled = false;
    actionBtn.dataset.mode = "theory-next";
    renderTheoryItem(item);
  } else {
    heartsEl.classList.remove("hidden");
    updateHeartsDisplay();
    actionBtn.textContent = "Проверить";
    actionBtn.disabled = true;
    actionBtn.dataset.mode = "check";
    Exercises.render(contentEl, item, () => {
      actionBtn.disabled = !Exercises.isReady();
    });
  }
}

function advance() {
  itemIndex++;
  if (itemIndex >= activeLesson.lesson.length) {
    finishLesson();
  } else {
    renderCurrentItem();
  }
}

actionBtn.onclick = () => {
  const mode = actionBtn.dataset.mode;

  if (mode === "theory-next" || mode === "exercise-next") {
    advance();
    return;
  }

  const item = activeLesson.lesson[itemIndex];
  const correct = Exercises.check();
  feedbackEl.classList.remove("hidden", "ok", "fail");
  if (correct) {
    correctCount++;
    feedbackEl.classList.add("ok");
    feedbackEl.textContent = "Верно! 🎉";
  } else {
    hearts = Math.max(0, hearts - 1);
    updateHeartsDisplay();
    feedbackEl.classList.add("fail");
    feedbackEl.textContent = item.Etype === "write"
      ? `Не совсем. Верный ответ: ${item.answers[0]}`
      : "Не совсем — посмотри на подсветку правильного варианта.";
  }
  actionBtn.textContent = "Дальше";
  actionBtn.dataset.mode = "exercise-next";
};

// Кнопка "назад" — просто уходим на главную страницу целиком (это уже
// не переключение экрана внутри страницы, а настоящий переход по файлам).
document.getElementById("lesson-exit").onclick = () => {
  window.location.href = "index.html";
};

document.getElementById("complete-continue").onclick = () => {
  window.location.href = "index.html";
};

// ---------- Завершение урока ----------
async function finishLesson() {
  await completeLesson(activeLesson.id);
  const total = getTotalLessonsCount();
  const percent = getPercent(total);
  document.getElementById("complete-stats").textContent =
    `Правильно: ${correctCount} из ${exerciseTotal} · Курс пройден на ${percent}%`;
  showScreen("complete");
}

// ---------- Старт: разбираемся, какой урок открыть ----------
async function init() {
  await loadProgress();
  await loadCourse(); // нужно, чтобы findLessonMeta/getTotalLessonsCount знали структуру курса

  const lessonId = sessionStorage.getItem("arcon_open_lesson_id");
  const lessonMeta = lessonId && findLessonMeta(lessonId);

  if (!lessonMeta) {
    // Например, если зайти на lesson.html напрямую, минуя главную страницу
    contentEl.innerHTML = "<p>Урок не выбран. Вернись на главную и выбери урок из списка.</p>";
    showScreen("lesson");
    return;
  }

  activeLesson = await loadLesson(null, lessonMeta);
  itemIndex = 0;
  hearts = 3;
  correctCount = 0;
  exerciseTotal = activeLesson.lesson.filter((it) => it.type === "E").length;
  showScreen("lesson");
  renderCurrentItem();
}

init();
