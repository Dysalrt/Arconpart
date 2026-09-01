export const $=(s,r=document)=>r.querySelector(s);
export function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
export function normalizeAnswer(v){return String(v).toLowerCase().normalize("NFKC").replace(/[.,!?;:'"“”‘’()]/g,"").replace(/\s+/g," ").trim()}
export function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}