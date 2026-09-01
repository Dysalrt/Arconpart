const manualOverrides={
  // Add entries such as: "qite": "kee-te"
};
const map={ū:"you",j:"y",q:"kee",c:"k",e:"eh",i:"ee",a:"ah",o:"oh",u:"oo",
b:"b",d:"d",f:"f",g:"g",h:"h",k:"k",r:"r",s:"s",t:"t",v:"v",z:"z"};
export function isSpeakable(text){return typeof text==="string"&&/^[A-Za-zū]+$/.test(text.trim())}
function transliterate(text){return [...text.toLowerCase()].map(c=>map[c]??c).join("")}
export function speakArcon(text){
 if(!isSpeakable(text))return false;
 const u=new SpeechSynthesisUtterance(manualOverrides[text.toLowerCase()]??transliterate(text));
 const vs=speechSynthesis.getVoices();
 u.voice=vs.find(v=>/^en-US$/i.test(v.lang))||vs.find(v=>/^en-GB$/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null;
 u.lang=u.voice?.lang||"en-US";u.rate=.78;speechSynthesis.cancel();speechSynthesis.speak(u);return true;
}