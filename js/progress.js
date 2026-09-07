// progress.js
// Бизнес-логика прогресса (какие уроки пройдены). Сам не знает про Firestore/IP —
// это знает только storage.js. progress.js просто держит состояние в памяти
// и синхронизирует его через loadUserData/saveUserData.

import { loadUserData, saveUserData } from "./storage.js";

let state = { completedLessons: [] };

export async function load() {
  state = await loadUserData();
  return state;
}

export function isLessonDone(lessonId) {
  return state.completedLessons.includes(lessonId);
}

export async function completeLesson(lessonId) {
  if (!isLessonDone(lessonId)) {
    state.completedLessons.push(lessonId);
    await saveUserData(state);
  }
}

export function getState() {
  return state;
}

export function getPercent(totalLessons) {
  if (!totalLessons) return 0;
  return Math.round((state.completedLessons.length / totalLessons) * 100);
}
