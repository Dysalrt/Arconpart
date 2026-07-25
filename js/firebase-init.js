// firebase-init.js
// Единственная задача этого файла — один раз инициализировать Firebase
// и отдать наружу готовый объект `db`, чтобы остальным файлам (storage.js)
// не нужно было думать про apiKey и прочий конфиг.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBtQaM8iFAdS9U1JPTOLZe5PvnQ55DsGIg",
  authDomain: "arconparte.firebaseapp.com",
  projectId: "arconparte",
  storageBucket: "arconparte.firebasestorage.app",
  messagingSenderId: "587363631203",
  appId: "1:587363631203:web:70f86c32577de22f6f3856",
  measurementId: "G-50PVTPJG7C",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
