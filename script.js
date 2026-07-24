// Import the functions you need from the SDKs using full CDN URLs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, FieldPath, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtQaM8iFAdS9U1JPTOLZe5PvnQ55DsGIg",
  authDomain: "arconparte.firebaseapp.com",
  projectId: "arconparte",
  storageBucket: "arconparte.firebasestorage.app",
  messagingSenderId: "587363631203",
  appId: "1:587363631203:web:70f86c32577de22f6f3856",
  measurementId: "G-50PVTPJG7C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Fetch user IP
const ipRes = await fetch('https://api.ipify.org?format=json');
const ipData = await ipRes.json();
const currentIP = ipData.ip;

let user_data = {};

// Example reference for getting a document (make sure docRef is defined with your collection/doc path)
// const docRef = doc(db, "users", currentIP);
// const docSnap = await getDoc(docRef);
const docRef = doc(db, "Users", "ips");
const docSnap = await getDoc(docRef);

if (typeof docSnap !== 'undefined' && docSnap.exists()) {
  console.log("Document data:", docSnap.data());
  if (currentIP in docSnap){
    console.log(currentIP)
    user_data = docSnap[currentIP]
  }
  else{
    await setDoc(docRef, {
      [currentIP]: {
        "completed_lessons": []
      }
    }, { merge: true });
    user_data = {"completed_lessons": []};
    console.log(`Added ${currentIP}: {} to Firestore.`);
  }
} else {
  console.log("No such document!");
}
const screen_lesson_sh = `<header class="lesson-header">
      <button class="icon-btn" id="theory-back">←</button>
      <div class="lesson-progress-bar"><div id="theory-progress-fill" class="progress-fill"></div></div>
    </header>
    <div id="theory-content" class="theory-content"><!-- рендерится из JS --></div>
    <button id="theory-continue" class="btn-primary">Продолжить</button>`
const screen_exercise_sh = `<div id="screen-exercise" class="screen hidden">
    <header class="lesson-header">
      <button class="icon-btn" id="exercise-close">✕</button>
      <div class="lesson-progress-bar"><div id="exercise-progress-fill" class="progress-fill"></div></div>
      <div id="exercise-hearts">❤️❤️❤️</div>
    </header>
    <div id="exercise-content" class="exercise-content"><!-- рендерится из JS --></div>
    <div id="exercise-feedback" class="exercise-feedback hidden"></div>
    <button id="exercise-check" class="btn-primary" disabled>Проверить</button>
  </div>`
const screen_end = `<div id="screen-complete" class="screen hidden">
    <div class="complete-box">
      <div class="complete-emoji">🎉</div>
      <h2>Урок пройден!</h2>
      <p id="complete-stats"></p>
      <button id="complete-continue" class="btn-primary">Отлично</button>
    </div>
  </div>`
function loadJSON(path) {
  try {
    const response = await fetch(path); // Path to your file
    const data = await response.json(); // Parses the JSON string into an object
    return (data);
  } catch (error) {
    console.error("Error reading JSON file:", error);
  }
}

function flattenLessons(data) {
    const flat = [];
    data.modules.forEach((m) => m.lessons.forEach((l) => flat.push(l)));
    return flat;
}
let course = loadJSON("data/course.json")["total_lessons"]

function renderModuleList(container, onOpenLesson) {
    const flat = flattenLessons();
    container.innerHTML = "";

    course.modules.forEach((mod) => {
      const block = document.createElement("div");
      block.className = "module-block";
      block.innerHTML = `<p class="module-title">Модуль ${mod.id} · ${mod.title}</p>`;

      mod.lessons.forEach((lesson) => {
        const index = flat.findIndex((l) => l.id === lesson.id);
        const unlocked = isUnlocked(flat, index);
        const done = Progress.isLessonDone(lesson.id);

        const row = document.createElement("div");
        row.className = "lesson-row" + (unlocked ? "" : " locked") + (done ? " done" : "");
        row.innerHTML = `
          <div class="lesson-dot">${done ? "✓" : index + 1}</div>
          <div class="lesson-info">
            <div class="t">${lesson.title}</div>
            <div class="s">${lesson.subtitle}</div>
          </div>
        `;
        if (unlocked) row.onclick = () => onOpenLesson(mod.id, lesson);
        block.appendChild(row);
      });

      container.appendChild(block);
    });
  }

  function getTotalLessonsCount() {
    return flattenLessons().length;
  }

  return { loadCourse, loadLesson, renderModuleList, getTotalLessonsCount };
async function openLesson(moduleId, lessonMeta) {
    activeLesson = await Lessons.loadLesson(moduleId, lessonMeta);
    theoryIndex = 0;
    showScreen("theory");
    renderTheoryCard();
  }
async function loadLesson(moduleId, lessonMeta) {
    if (lessonCache[lessonMeta.id]) return lessonCache[lessonMeta.id];
    const res = await fetch(`data/lessons/${lessonMeta.file}`, { cache: "no-store" });
    const data = await res.json();
    lessonCache[lessonMeta.id] = data;
    return data;
  }
async function renderHome() {
    const state = user_data;
    const total = flattenLessons(course);
    const percent = Math.round((state.completedLessons.length / totalLessons) * 100);
    document.getElementById("streak-line").textContent =
      `Пройдено: ${percent}% курса (${state.completedLessons.length} из ${total} уроков)`;
    renderModuleList(document.getElementById("module-list"), openLesson);
    showScreen("home");
  }

