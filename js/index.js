import{storage}from"./storage.js";import{escapeHtml,$}from"./common.js";
const course=await fetch("./data/course.json").then(r=>r.json()),done=storage.get("completedLessons")||[];
const all=course.modules.flatMap(m=>m.lessons),pct=all.length?Math.round(done.length/all.length*100):0;
$("#progressText").textContent=`${pct}% complete`;$("#progressFill").style.width=pct+"%";
$("#modules").innerHTML=course.modules.map(m=>`<section class="module"><div class="eyebrow">Module ${+m.id+1}</div><h2>${escapeHtml(m.title)}</h2><div class="lesson-list">${
m.lessons.map(l=>`<button class="lesson-card ${done.includes(l.id)?"done":""}" data-id="${l.id}"><span class="lesson-icon">${done.includes(l.id)?"✓":"→"}</span><span class="lesson-copy"><strong>${escapeHtml(l.title)}</strong><small>${escapeHtml(l.subtitle)}</small></span><span class="lesson-status">${done.includes(l.id)?"Completed":"Start"}</span></button>`).join("")
}</div></section>`).join("");
document.querySelectorAll(".lesson-card").forEach(b=>b.onclick=()=>{sessionStorage.setItem("arcon.lessonId",b.dataset.id);location.href="./lesson.html"});