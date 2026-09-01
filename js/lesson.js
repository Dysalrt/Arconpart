import{storage}from"./storage.js";import{resolveLesson}from"./placeholders.js";import{isSpeakable,speakArcon}from"./tts.js";import{$,escapeHtml,normalizeAnswer,shuffle}from"./common.js";
let i=0,checked=false,hearts=3,lesson,selected=null,match=null;
const id=sessionStorage.getItem("arcon.lessonId");if(!id)location.href="./index.html";
const course=await fetch("./data/course.json").then(r=>r.json()),meta=course.modules.flatMap(m=>m.lessons).find(x=>x.id===id);
const lex=await fetch("./data/LEX.json").then(r=>r.json());lesson=resolveLesson(await fetch("./data/lessons/"+meta.file).then(r=>r.json()),lex);
$("#lessonTitle").textContent=lesson.title;
function audio(t){return isSpeakable(t)?`<button class="sound" data-speak="${escapeHtml(t)}">🔊</button>`:""}
function progress(){$("#progressFill").style.width=Math.round(i/lesson.lesson.length*100)+"%";$("#stepText").textContent=`${Math.min(i+1,lesson.lesson.length)} / ${lesson.lesson.length}`;$("#hearts").textContent="♥".repeat(hearts)+"♡".repeat(3-hearts)}
function render(){
 checked=false;selected=null;match=null;progress();
 if(i>=lesson.lesson.length){complete();return}
 const x=lesson.lesson[i],c=$("#lessonContent");
 if(x.type==="T")c.innerHTML=`<article class="card"><div class="eyebrow">Theory</div><h2>${x.title}</h2><div class="theory-body">${x.theory}</div><div class="examples">${x.examples.map(e=>`<div class="example"><div class="example-word">${escapeHtml(e.word)} ${audio(e.word)}</div><div class="example-meta">${escapeHtml(e.ipa||"—")}</div><div>${escapeHtml(e.translation)}</div></div>`).join("")}</div></article>`;
 else if(x.Etype==="choice")c.innerHTML=`<article class="card"><div class="eyebrow">Exercise</div><h2>${x.prompt}</h2><div class="options">${shuffle(x.options).map(o=>`<button class="option" data-o="${escapeHtml(o)}">${escapeHtml(o)} ${audio(o)}</button>`).join("")}</div></article>`;
 else if(x.Etype==="match"){const l=shuffle(x.pairs.map(p=>p[0])),r=shuffle(x.pairs.map(p=>p[1]));match={pairs:x.pairs,first:null,matched:[]};c.innerHTML=`<article class="card"><div class="eyebrow">Exercise</div><h2>Match each Arcon word with its English meaning.</h2><div class="match-grid"><div>${l.map(v=>`<button class="match-item" data-side="l" data-v="${escapeHtml(v)}">${escapeHtml(v)} ${audio(v)}</button>`).join("")}</div><div>${r.map(v=>`<button class="match-item" data-side="r" data-v="${escapeHtml(v)}">${escapeHtml(v)}</button>`).join("")}</div></div></article>`}
 else c.innerHTML=`<article class="card"><div class="eyebrow">Exercise</div><h2>${x.prompt}</h2>${x.speak?`<div class="speak-line">${escapeHtml(x.speak)} ${audio(x.speak)}</div>`:""}${x.ipaHint?`<div class="hint">${escapeHtml(x.ipaHint)}</div>`:""}<input id="writeInput" class="write-input" placeholder="Type your answer…" autocomplete="off" autocapitalize="none" spellcheck="false"></article>`;
 $("#action").textContent=x.type==="T"?"Next":"Check";$("#action").disabled=false;bind();
}
function bind(){
 document.querySelectorAll("[data-speak]").forEach(b=>b.onclick=e=>{e.stopPropagation();speakArcon(b.dataset.speak)});
 document.querySelectorAll(".option").forEach(b=>b.onclick=()=>{if(!checked){document.querySelectorAll(".option").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selected=b.dataset.o}});
 document.querySelectorAll(".match-item").forEach(b=>b.onclick=()=>{
  if(checked||b.classList.contains("matched"))return;const side=b.dataset.side,v=b.dataset.v;
  if(side==="l"){match.first=v;b.classList.add("selected")}
  else if(match.first){const ok=match.pairs.some(p=>p[0]===match.first&&p[1]===v);if(ok){document.querySelectorAll(".match-item").forEach(x=>{if(x.dataset.v===match.first||x.dataset.v===v)x.classList.add("matched")});match.matched.push([match.first,v])}else hearts=Math.max(0,hearts-1);match.first=null;progress()}
 });
}
function check(){
 const x=lesson.lesson[i];if(x.type==="T"){i++;render();return}
 let ok=false;if(x.Etype==="choice"){if(selected===null)return;ok=normalizeAnswer(selected)===normalizeAnswer(x.answer);document.querySelectorAll(".option").forEach(b=>{if(normalizeAnswer(b.dataset.o)===normalizeAnswer(x.answer))b.classList.add("correct");else if(b.classList.contains("selected")&&!ok)b.classList.add("incorrect")})}
 if(x.Etype==="match")ok=match.matched.length===x.pairs.length;
 if(x.Etype==="write"){const v=normalizeAnswer($("#writeInput").value);ok=x.answers.some(a=>normalizeAnswer(a)===v);if(!ok){const d=document.createElement("div");d.className="feedback wrong";d.textContent="Answer: "+x.answers[0];$("#lessonContent .card").append(d)}}
 if(!ok)hearts=Math.max(0,hearts-1);checked=true;$("#action").textContent="Next";progress();const d=document.createElement("div");d.className="feedback "+(ok?"right":"wrong");d.textContent=ok?"Correct!":"Not quite.";$("#lessonContent .card").append(d)
}
function complete(){const a=storage.get("completedLessons")||[];if(!a.includes(lesson.id)){a.push(lesson.id);storage.set("completedLessons",a)}$("#progressFill").style.width="100%";$("#stepText").textContent=lesson.lesson.length+" / "+lesson.lesson.length;$("#lessonContent").innerHTML=`<article class="card complete-card"><div class="complete-icon">✓</div><div class="eyebrow">Lesson complete</div><h2>Nice work!</h2><p>You finished <strong>${escapeHtml(lesson.title)}</strong>.</p><p class="muted">There is no hard fail at zero hearts.</p><button id="home" class="primary">Back to course</button></article>`;$("#action").style.display="none";$("#home").onclick=()=>location.href="./index.html"}
$("#action").onclick=()=>checked?(()=>{i++;render()})():check();render();