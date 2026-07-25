// storage.js
// Заменяет старый storage.js (который работал через Telegram CloudStorage).
// Идентифицируем пользователя по IP-адресу вместо Telegram user id —
// значит, работает вообще без Telegram, в любом браузере.
//
// Важное архитектурное отличие от твоей первой версии: раньше все пользователи
// хранились ВНУТРИ одного документа "Users/ips" как поля-IP. Точка в IP-адресе —
// зарезервированный символ в путях Firestore (означает вложенность), это могло
// приводить к неожиданному поведению. Вместо этого — отдельный ДОКУМЕНТ на
// каждого пользователя (users/<безопасный-ключ>), а не поле внутри одного документа.
// Так безопаснее и это более стандартный способ хранить данные по пользователям в Firestore.

import { db } from "./firebase-init.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

async function getDeviceKey() {
  const res = await fetch("https://api.ipify.org?format=json");
  const data = await res.json();
  // точки заменяем на "_", чтобы не задумываться про особые символы в путях Firestore
  return data.ip.replaceAll(".", "_");
}

export async function loadUserData() {
  const key = await getDeviceKey();
  const ref = doc(db, "users", key);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data();
  }

  // Пользователя ещё нет — создаём с пустым прогрессом
  const fresh = { completedLessons: [] };
  await setDoc(ref, fresh);
  return fresh;
}

export async function saveUserData(userData) {
  const key = await getDeviceKey();
  const ref = doc(db, "users", key);
  await setDoc(ref, userData);
}
