const defaultState = {name:'Schülerin', avatar:'👩‍🎓', xp:0, coins:50, level:1, hearts:5, streak:1, done:[], selected:'freiburg', theme:'light'};
const state = {...defaultState, ...JSON.parse(localStorage.getItem('dq3-state') || '{}')};
let content = null;
let currentQuestion = 0;
const $ = s => document.querySelector(s);
const save = () => localStorage.setItem('dq3-state', JSON.stringify(state));
const toast = msg => { const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); };

async function init(){
  document.documentElement.dataset.theme = state.theme;
  content = await fetch('data/content.json?v=3.1.0').then(r=>r.json()).catch(()=>fallback());
  bindNav(); bindInstall(); renderAll();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js?v=3.1.0');
}
function fallback(){return {version:'offline',cities:[],questions:[],missions:[],badges:[],avatars:['👩‍🎓']};}
function bindNav(){document.querySelectorAll('.nav').forEach(btn=>btn.onclick=()=>show(btn.dataset.view));}
function show(view){document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===view));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===view));$('#viewTitle').textContent={dashboard:`Hallo, ${state.name}!`,map:'DACH-Karte',questpass:'QuestPass',library:'Bibliothek',profile:'Profil',teacher:'Lehrerbereich',settings:'Einstellungen'}[view];}
function updateTop(){ $('#hearts').textContent='❤️'.repeat(state.hearts)+'🖤'.repeat(5-state.hearts); $('#xp').textContent=`${state.xp} XP`; $('#coins').textContent=`🪙 ${state.coins}`; $('#level').textContent=`Level ${state.level}`; $('#streak').textContent=`🔥 ${state.streak}`; }
function renderAll(){updateTop();renderDashboard();renderMap();renderQuestPass();renderLibrary();renderProfile();renderTeacher();renderSettings();show(document.querySelector('.nav.active')?.dataset.view || 'dashboard');}
function progressPct(){return content.cities.length ? Math.min(100, Math.round((state.done.length / content.cities.length) * 100)) : 0;}
function renderDashboard(){
  const pct = progressPct();
  const nextCity = content.cities.find((c,i)=>cityUnlocked(i)&&!state.done.includes(c.id)) || content.cities.at(-1);
  $('#dashboard').innerHTML = `<div class="hero"><div><h2>${state.avatar} Willkommen bei DeutschQuest 3.0</h2><p>Lerne Wortschatz, Grammatik und Kultur. Reise durch Deutschland, Österreich und die Schweiz. Diese Version ist die Sprint-1-Basis mit Dashboard, Profil und Theme-System.</p><button class="primary" id="continueBtn">Lektion fortsetzen</button> <button class="secondary" id="profileBtn">Profil bearbeiten</button></div><div class="visual">🧭</div></div><div class="grid four"><div class="card"><h3>Heute</h3><div class="stat">${state.streak} Tage</div><p>Serie aktiv</p></div><div class="card"><h3>XP</h3><div class="stat">${state.xp}</div><p>Nächster Level bei ${state.level*200} XP</p></div><div class="card"><h3>Coins</h3><div class="stat">${state.coins}</div><p>Für spätere Avatar-Belohnungen</p></div><div class="card"><h3>Nächste Stadt</h3><div class="stat">${nextCity?.image||'✅'}</div><p>${nextCity?.name||'Alles geschafft'}</p></div></div><br><div class="grid three"><div class="card"><h3>Tagesmissionen</h3><ul class="tasks">${content.missions.map(m=>`<li><span>${m}</span><b>+40 XP</b></li>`).join('')}</ul></div><div class="card"><h3>Fortschritt</h3><p>${pct}% abgeschlossen</p><div class="progress"><span style="width:${pct}%"></span></div></div><div class="card"><h3>Nächste Belohnung</h3><div class="visual">🏅</div><p>${content.badges[Math.min(state.done.length,content.badges.length-1)]}</p></div></div>`;
  $('#continueBtn').onclick=()=>show('map');
  $('#profileBtn').onclick=()=>show('profile');
}
function cityUnlocked(i){ return i===0 || state.done.includes(content.cities[i-1].id); }
function renderMap(){
  const selected = content.cities.find(c=>c.id===state.selected) || content.cities[0];
  $('#map').innerHTML = `<div class="mapwrap"><div class="card"><h3>Route DACH</h3><div class="path">${content.cities.map((c,i)=>`<div class="city ${state.done.includes(c.id)?'done':cityUnlocked(i)?'open':'locked'}" data-id="${c.id}" data-i="${i}"><span><b>${c.image} ${c.country} ${c.name}</b><br><small>${c.unit} · ${c.theme}</small></span><span>${state.done.includes(c.id)?'✅':cityUnlocked(i)?'Start':'🔒'}</span></div>`).join('')}</div></div><div class="card"><div class="cityHero" style="background:${selected.hero}"><h2>${selected.image} ${selected.name}</h2></div><h3>${selected.country} ${selected.name}</h3><p>${selected.theme}</p><p><b>${selected.unit}</b></p><button class="primary" id="startPractice">Üben</button><div id="practice" class="practice"></div></div></div>`;
  document.querySelectorAll('.city').forEach(el=>el.onclick=()=>{ if(!cityUnlocked(Number(el.dataset.i))) return toast('Diese Stadt ist noch gesperrt.'); state.selected=el.dataset.id; save(); renderMap(); });
  $('#startPractice').onclick=()=>startPractice(selected.id);
}
function startPractice(city){ currentQuestion=0; showQuestion(city); }
function showQuestion(city){
  const qs = content.questions.filter(q=>q.city===city);
  const box = $('#practice');
  if(!qs.length){box.innerHTML='<p>Für diese Stadt werden die Übungen im nächsten Sprint ergänzt.</p>'; return;}
  if(currentQuestion>=qs.length){ completeCity(city); return; }
  const q = qs[currentQuestion];
  box.innerHTML = `<h3>Aufgabe ${currentQuestion+1}/${qs.length}</h3><p>${q.q}</p><div class="answers">${shuffle(q.options).map(o=>`<button class="answer">${o}</button>`).join('')}</div><p id="feedback"></p>`;
  box.querySelectorAll('.answer').forEach(btn=>btn.onclick=()=>answer(btn,q,city));
}
function answer(btn,q,city){
  if(btn.disabled) return;
  const ok = btn.textContent===q.a; btn.classList.add(ok?'correct':'wrong'); $('#feedback').textContent=ok?'Sehr gut! +20 XP +5 Coins':'Noch einmal üben.';
  if(ok){state.xp+=20; state.coins+=5; if(state.xp>=state.level*200) state.level++;} else state.hearts=Math.max(0,state.hearts-1);
  document.querySelectorAll('.answer').forEach(b=>b.disabled=true);
  save(); updateTop(); setTimeout(()=>{currentQuestion++; showQuestion(city);},800);
}
function completeCity(city){ if(!state.done.includes(city)){state.done.push(city); state.xp+=80; state.coins+=25; toast('Stadt abgeschlossen! +80 XP');} save(); renderAll(); show('questpass'); }
function renderQuestPass(){ $('#questpass').innerHTML = `<div class="card"><h3>Dein Reisepass</h3><p>Jede abgeschlossene Stadt bekommt einen Stempel.</p><div class="passport">${content.cities.map(c=>`<div class="stamp ${state.done.includes(c.id)?'done':''}"><div class="big">${c.image}</div><b>${c.name}</b><p>${state.done.includes(c.id)?'Besucht ✅':'Noch offen'}</p></div>`).join('')}</div></div>`; }
function renderLibrary(){ $('#library').innerHTML = `<div class="grid two">${content.cities.map(c=>`<div class="card library"><h3>${c.image} ${c.name}</h3><p><b>${c.unit}</b></p><ul><li>Wortschatz</li><li>Grammatik</li><li>Kultur</li><li>Challenge</li></ul></div>`).join('')}</div>`; }
function renderProfile(){ $('#profile').innerHTML = `<div class="grid two"><div class="card"><h3>Profil</h3><div class="avatarBox"><div class="avatar">${state.avatar}</div><div><p>Name</p><input id="nameInput" value="${state.name}"><br><br><button class="primary" id="saveProfile">Speichern</button></div></div></div><div class="card"><h3>Avatar wählen</h3><div class="chips">${content.avatars.map(a=>`<button class="chip ${state.avatar===a?'active':''}" data-avatar="${a}">${a}</button>`).join('')}</div></div></div>`; document.querySelectorAll('[data-avatar]').forEach(b=>b.onclick=()=>{state.avatar=b.dataset.avatar;save();renderAll();show('profile')}); $('#saveProfile').onclick=()=>{state.name=$('#nameInput').value.trim()||'Schülerin';save();renderAll();toast('Profil gespeichert.');}; }
function renderTeacher(){ $('#teacher').innerHTML = `<div class="card"><h3>Lehrerbereich</h3><p>Demo-Ansicht für späteres Google-Sheets- oder Firebase-Tracking.</p><table><thead><tr><th>Schülerin</th><th>XP</th><th>Coins</th><th>Level</th><th>Städte</th><th>Hinweis</th></tr></thead><tbody><tr><td>${state.name}</td><td>${state.xp}</td><td>${state.coins}</td><td>${state.level}</td><td>${state.done.length}</td><td>${state.hearts<3?'Braucht Wiederholung':'Aktiv'}</td></tr></tbody></table></div>`; }
function renderSettings(){ $('#settings').innerHTML = `<div class="grid two"><div class="card"><h3>Einstellungen</h3><p>Version: ${content.version}</p><button class="primary" id="themeBtn">${state.theme==='dark'?'Hellmodus':'Dunkelmodus'}</button></div><div class="card"><h3>Entwicklung</h3><p>Nur für Tests: löscht den lokalen Fortschritt.</p><button class="secondary" id="resetBtn">Fortschritt zurücksetzen</button></div></div>`; $('#themeBtn').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=state.theme;save();renderAll();show('settings')}; $('#resetBtn').onclick=()=>{localStorage.removeItem('dq3-state'); location.reload();}; }
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function bindInstall(){let promptEvent; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;$('#installBtn').disabled=false;}); $('#installBtn').onclick=()=>promptEvent?.prompt();}
init();
