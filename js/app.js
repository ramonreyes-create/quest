const cities = [
  {name:'Freiburg', country:'🇩🇪', theme:'Begrüßung, Schule, Familie und Stadt'},
  {name:'Schwarzwald', country:'🇩🇪', theme:'Natur, Farben und Tiere'},
  {name:'Stuttgart', country:'🇩🇪', theme:'Hobbys und Freizeit'},
  {name:'Heidelberg', country:'🇩🇪', theme:'Schule und Alltag'},
  {name:'Frankfurt', country:'🇩🇪', theme:'Einkaufen und Verkehr'},
  {name:'Köln', country:'🇩🇪', theme:'Feste und Kultur'},
  {name:'Berlin', country:'🇩🇪', theme:'Stadtleben und Geschichte'},
  {name:'Salzburg', country:'🇦🇹', theme:'Musik und Reisen'},
  {name:'Wien', country:'🇦🇹', theme:'Essen und Kaffeehaus'},
  {name:'Zürich', country:'🇨🇭', theme:'Umwelt und Medien'}
];

const questions = [
  {q:'Was bedeutet „die Stadt“?', a:'la ciudad', options:['la ciudad','la escuela','la familia','el libro']},
  {q:'Was bedeutet „die Schule“?', a:'el colegio', options:['el colegio','el tren','la calle','la tarea']},
  {q:'Was bedeutet „die Familie“?', a:'la familia', options:['la familia','la ciudad','la amiga','la ventana']},
  {q:'Was bedeutet „lernen“?', a:'aprender', options:['aprender','jugar','viajar','comprar']},
  {q:'Was bedeutet „sprechen“?', a:'hablar', options:['hablar','leer','escribir','escuchar']},
  {q:'Was bedeutet „das Heft“?', a:'el cuaderno', options:['el cuaderno','el lápiz','el colegio','el mapa']}
];

let state = JSON.parse(localStorage.getItem('dq3-state')) || {xp:0,lives:5,streak:1,level:1,progress:0,current:0,doneCities:[]};
let qIndex = 0;
let deferredPrompt;

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
function save(){ localStorage.setItem('dq3-state', JSON.stringify(state)); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
function updateStats(){
  $('#xp').textContent=state.xp; $('#lives').textContent=state.lives; $('#streak').textContent=state.streak; $('#level').textContent=state.level;
  $('#progressBar').style.width=state.progress+'%'; $('#progressText').textContent=state.progress+'%';
  if(state.progress>=100) $('#badgeText').textContent='Wortschatzmeister: Freiburg abgeschlossen!';
}
function setView(id){
  $$('.view').forEach(v=>v.classList.remove('active-view')); $('#'+id).classList.add('active-view');
  $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===id));
  const titles={dashboard:'Hallo! Bereit für deine Reise?',map:'DACH-Karte',questpass:'Dein QuestPass',bibliothek:'Bibliothek',teacher:'Lehrerbereich'};
  $('#viewTitle').textContent=titles[id];
}
function renderQuestion(){
  const item=questions[qIndex%questions.length];
  $('#questionTitle').textContent=item.q; $('#questionCounter').textContent=(qIndex+1)+'/'+questions.length; $('#feedback').textContent='';
  const shuffled=[...item.options].sort(()=>Math.random()-.5);
  $('#answers').innerHTML=shuffled.map(o=>`<button class="answer-btn">${o}</button>`).join('');
  $$('#answers button').forEach(btn=>btn.onclick=()=>answer(btn,item));
}
function answer(btn,item){
  const correct=btn.textContent===item.a;
  btn.classList.add(correct?'correct':'wrong');
  if(correct){ state.xp+=40; state.progress=Math.min(100,state.progress+17); state.level=1+Math.floor(state.xp/300); $('#feedback').textContent='Sehr gut! +40 XP'; }
  else { state.lives=Math.max(0,state.lives-1); $('#feedback').textContent='Noch einmal!'; }
  save(); updateStats();
  setTimeout(()=>{ qIndex++; if(qIndex>=questions.length){ completeFreiburg(); qIndex=0; } renderQuestion(); },900);
}
function completeFreiburg(){
  if(state.progress>=100 && !state.doneCities.includes('Freiburg')){ state.doneCities.push('Freiburg'); toast('Neue Medaille: Freiburg abgeschlossen!'); save(); renderMap(); renderPassport(); }
}
function renderMap(){
  $('#cityPath').innerHTML=cities.map((c,i)=>{
    const unlocked=i===0 || state.doneCities.includes(cities[i-1].name);
    const done=state.doneCities.includes(c.name);
    return `<div class="city-node ${unlocked?'unlocked':''} ${done?'done':''}" data-city="${c.name}"><span>${c.country} <strong>${c.name}</strong></span><span>${done?'✔':unlocked?'Offen':'🔒'}</span></div>`;
  }).join('');
  $$('.city-node').forEach(n=>n.onclick=()=>{
    const city=cities.find(c=>c.name===n.dataset.city);
    $('#cityInfo').innerHTML=`<h3>${city.country} ${city.name}</h3><p>${city.theme}</p><button class="primary" id="cityPracticeBtn">Üben</button>`;
    $('#cityPracticeBtn').onclick=()=>setView('dashboard');
  });
}
function renderPassport(){
  $('#passport').innerHTML=cities.map(c=>`<div class="stamp ${state.doneCities.includes(c.name)?'done':''}"><div style="font-size:38px">${state.doneCities.includes(c.name)?'✅':'🛂'}</div><strong>${c.name}</strong><p>${state.doneCities.includes(c.name)?'Stempel erhalten':'Noch offen'}</p></div>`).join('');
}
function renderLibrary(){
  const sections=[
    ['Wortschatz','Begrüßung, Schule, Familie, Stadt, Farben, Zahlen'],
    ['Grammatik','sein, haben, Artikel, Akkusativ, Satzbau'],
    ['Hören','Dialoge, Ansagen, kurze Interviews'],
    ['Schreiben','Sätze bauen, Mini-Texte, persönliche Antworten']
  ];
  $('#libraryGrid').innerHTML=sections.map(([t,d])=>`<article class="card library-card"><h3>${t}</h3><p>${d}</p><ul><li>Lernen</li><li>Üben</li><li>Challenge</li></ul></article>`).join('');
}
function renderTeacher(){
  const rows=[['Amelie','Freiburg','420','72%','Artikel'],['Catalina','Freiburg','360','65%','Satzbau'],['Pilar','Schwarzwald','610','88%','Wortschatz'],['Amparo','Freiburg','280','54%','Konjugation']];
  $('#teacherRows').innerHTML=rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('');
}

$$('.nav-btn').forEach(btn=>btn.onclick=()=>setView(btn.dataset.view));
$('#startMission').onclick=()=>{ document.querySelector('.practice').scrollIntoView({behavior:'smooth'}); toast('Mission gestartet!'); };
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; $('#installBtn').disabled=false; });
$('#installBtn').onclick=async()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; $('#installBtn').disabled=true; }};
if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js'); }

updateStats(); renderQuestion(); renderMap(); renderPassport(); renderLibrary(); renderTeacher();
