// home.js
// Точка входа для index.html. При клике на урок — не переключаем экран
// внутри страницы, а переходим на отдельную страницу lesson.html.
// Чтобы lesson.html знал, какой именно урок открывать (без параметра в URL),
// кладём id урока в sessionStorage прямо перед переходом.

import { load as loadProgress, getState, getPercent } from "./progress.js";
import { loadCourse, renderModuleList, getTotalLessonsCount } from "./lessons.js";

function openLesson(moduleId, lessonMeta) {
  sessionStorage.setItem("arcon_open_lesson_id", lessonMeta.id);
  window.location.href = "lesson.html";
}

async function renderHome() {
  const state = getState();
  const total = getTotalLessonsCount();
  const percent = getPercent(total);
  document.getElementById("streak-line").textContent =
    `Пройдено: ${percent}% курса (${state.completedLessons.length} из ${total} уроков)`;
  renderModuleList(document.getElementById("module-list"), openLesson);
}

await loadProgress();
await loadCourse();
await renderHome();
