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
const data = docSnap.data();
if (typeof docSnap !== 'undefined' && docSnap.exists()) {
  console.log("Document data:", docSnap.data());
  if (currentIP in data){
    console.log(currentIP)
    user_data = data[currentIP]
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
async function loadJSON(path) {
  try {
    const response = await fetch(path); // Path to your file
    const data = await response.json(); // Parses the JSON string into an object
    return (data);
  } catch (error) {
    console.error("Error reading JSON file:", error);
  }
}

let course = await loadJSON("data/course.json");

function isLessonDone(lessonId) {
     return user_data.completed_lessons.includes(lessonId);
}

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
renderModuleList(document.getElementById("module-list"), )