const state = {
  xp: Number(localStorage.getItem('dq_xp') || 1240),
  lives: Number(localStorage.getItem('dq_lives') || 5),
  streak: Number(localStorage.getItem('dq_streak') || 7),
  selectedCity: localStorage.getItem('dq_city') || 'stuttgart',
  cities: [],
  missions: [],
  learning: {},
  currentModule: 'wortschatz',
  currentQuestion: 0
};

const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

async function init(){
  state.cities = await fetch('data/cities.json').then(r=>r.json()).catch(()=>[]);
  state.missions = await fetch('data/missions.json').then(r=>r.json()).catch(()=>[]);
  state.learning = await fetch('data/learning.json').then(r=>r.json()).catch(()=>({}));
  const savedCities = localStorage.getItem('dq_cities');
  if(savedCities) state.cities = JSON.parse(savedCities);
  bindNavigation();
  bindTheme();
  renderAll();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}

function persist(){
  localStorage.setItem('dq_xp', state.xp);
  localStorage.setItem('dq_lives', state.lives);
  localStorage.setItem('dq_streak', state.streak);
  localStorage.setItem('dq_city', state.selectedCity);
  localStorage.setItem('dq_cities', JSON.stringify(state.cities));
}

function bindNavigation(){
  $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));
  $$('[data-go]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.go)));
  $('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#completeCityBtn').addEventListener('click',completeSelectedCity);
  document.addEventListener('click', handleLearningClick);
}

function showView(id){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#'+id).classList.add('active');
  $$('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.view === id));
  const titles={dashboard:'Dashboard',map:'DACH Karte',questpass:'QuestPass',lernen:'Lernen',missionen:'Missionen',profil:'Profil'};
  $('#pageTitle').textContent=titles[id]||'DeutschQuest';
  $('#sidebar').classList.remove('open');
  renderAll();
}

function bindTheme(){
  if(localStorage.getItem('dq_theme')==='dark') document.body.classList.add('dark');
  $('#themeToggle').textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  $('#themeToggle').addEventListener('click',()=>{
    document.body.classList.toggle('dark');
    localStorage.setItem('dq_theme', document.body.classList.contains('dark')?'dark':'light');
    $('#themeToggle').textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  });
}

function renderAll(){
  $('#xp').textContent=state.xp;
  $('#lives').textContent=state.lives;
  $('#streak').textContent=state.streak;
  const completed=state.cities.filter(c=>c.status==='completed').length;
  const overall=Math.round(state.cities.reduce((a,c)=>a+c.progress,0)/(state.cities.length||1));
  $('#overallProgress').textContent=overall+'%';
  $('#visitedCount').textContent=completed;
  $('#stampCount').textContent=completed;
  renderCurrentCity(); renderMissions(); renderMap(); renderCityPanel(); renderPassport(); renderLearning();
}

function renderCurrentCity(){
  const c = getSelectedCity();
  $('#currentCityCard').innerHTML = citySummary(c);
}
function citySummary(c){
  return `<div class="city-image">${c.emoji}</div><h2>${c.name}</h2><p>${c.country} · ${c.lesson}</p><p>${c.culture}</p><div class="progress"><span style="width:${c.progress}%"></span></div><p><b>${c.progress}%</b> abgeschlossen</p>`;
}
function renderMissions(){
  $('#missionList').innerHTML = state.missions.slice(0,3).map(m=>`<li>${m.done?'✅':'⬜'} ${m.title} <b>${m.reward}</b></li>`).join('');
  $('#missionCards').innerHTML = state.missions.map(m=>`<article class="mission-card"><h3>${m.done?'✅':'🎯'} ${m.title}</h3><p>Belohnung: <b>${m.reward}</b></p><button class="secondary" ${m.done?'disabled':''}>${m.done?'Erledigt':'Starten'}</button></article>`).join('');
}
function renderMap(){
  const map=$('#dachMap');
  const nodes = state.cities.map(c=>`<button class="city-node ${c.status} ${c.id===state.selectedCity?'active':''}" style="left:${c.x}%;top:${c.y}%" data-city="${c.id}"><div class="city-dot">${c.status==='locked'?'🔒':c.emoji}</div><div class="city-label">${c.name}</div></button>`).join('');
  const lines = state.cities.slice(0,-1).map((c,i)=>lineBetween(c,state.cities[i+1])).join('');
  map.innerHTML = lines + nodes;
  $$('.city-node').forEach(n=>n.addEventListener('click',()=>{
    state.selectedCity=n.dataset.city; persist(); renderAll();
  }));
}
function lineBetween(a,b){
  const dx=b.x-a.x, dy=b.y-a.y, len=Math.sqrt(dx*dx+dy*dy), angle=Math.atan2(dy,dx)*180/Math.PI;
  return `<div class="route-line" style="left:${a.x}%;top:${a.y}%;width:${len}%;transform:rotate(${angle}deg)"></div>`;
}
function renderCityPanel(){
  const c=getSelectedCity();
  const locked=c.status==='locked';
  $('#cityPanel').innerHTML = `${citySummary(c)}<div class="module-grid"><button class="module" data-learn-go="wortschatz">📖 Wortschatz</button><button class="module" data-learn-go="grammatik">🧩 Grammatik</button><button class="module" data-learn-go="schreiben">✍️ Schreiben</button><button class="module" data-learn-go="challenge">🏆 Challenge</button></div><button class="primary" style="width:100%;margin-top:16px" ${locked?'disabled':''}>${locked?'Noch gesperrt':'Lektion starten'}</button>`;
}
function renderPassport(){
  $('#passport').innerHTML = state.cities.map(c=>`<article class="stamp ${c.status==='completed'?'':'locked'}"><div class="seal">${c.status==='completed'?'✅':c.status==='active'?'🟡':'🔒'}</div><h3>${c.name}</h3><p>${c.country}</p><p>${c.status==='completed'?'Stempel gesammelt':'Noch kein Stempel'}</p><small>${c.lesson}</small></article>`).join('');
}
function completeSelectedCity(){
  const idx = state.cities.findIndex(c=>c.id===state.selectedCity);
  if(idx<0) return;
  if(state.cities[idx].status==='locked') return toast('Diese Stadt ist noch gesperrt.');
  state.cities[idx].progress=100; state.cities[idx].status='completed';
  if(state.cities[idx+1] && state.cities[idx+1].status==='locked') state.cities[idx+1].status='unlocked';
  state.xp += 80; persist(); renderAll(); toast('Super! Stadt abgeschlossen. +80 XP');
}
function getSelectedCity(){ return state.cities.find(c=>c.id===state.selectedCity) || state.cities[0]; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2300); }
init();


function getLearningSet(){
  return state.learning[state.selectedCity] || state.learning.default || {title:'Lernen', wortschatz:[], grammatik:[], schreiben:[], challenge:[]};
}

function renderLearning(){
  const card = $('#learningCard');
  if(!card) return;
  const city = getSelectedCity();
  const set = getLearningSet();
  $('#learningCityPill').textContent = city.name + ' · ' + (set.title || 'Deutschprofis');
  $$('.module-tab').forEach(t=>t.classList.toggle('active', t.dataset.module === state.currentModule));
  const list = set[state.currentModule] || [];
  if(!list.length){ card.innerHTML = '<h3>Noch keine Aufgaben</h3><p>Dieses Modul wird im nächsten Sprint ergänzt.</p>'; return; }
  const q = list[state.currentQuestion % list.length];
  let body='';
  if(state.currentModule === 'wortschatz'){
    body = `<div class="big-word">${q.de}</div><p>Was bedeutet das?</p>${optionButtons(q.options, q.answer)}`;
  } else if(state.currentModule === 'schreiben'){
    const shuffled = [...q.parts].sort(()=>Math.random()-.5);
    body = `<p>${q.prompt}</p><div class="word-bank">${shuffled.map(w=>`<button class="word-chip" data-word="${w}">${w}</button>`).join('')}</div><div class="sentence-box" id="sentenceBox"></div><button class="primary" data-check-sentence="${q.answer}">Prüfen</button>`;
  } else {
    body = `<p class="question-text">${q.prompt}</p>${optionButtons(q.options, q.answer)}`;
  }
  card.innerHTML = `<span class="eyebrow">${set.title}</span><h3>${moduleName(state.currentModule)}</h3>${body}<div class="learning-footer"><button class="secondary" data-next-question>Weiter</button><small>+20 XP bei richtiger Antwort</small></div>`;
}
function moduleName(m){ return {wortschatz:'Wortschatz', grammatik:'Grammatik', schreiben:'Schreiben', challenge:'Mini-Challenge'}[m]||m; }
function optionButtons(options, answer){ return `<div class="answer-grid">${options.map(o=>`<button class="answer-btn" data-answer="${answer}" data-choice="${o}">${o}</button>`).join('')}</div>`; }

function handleLearningClick(e){
  const tab=e.target.closest('.module-tab');
  if(tab){ state.currentModule=tab.dataset.module; state.currentQuestion=0; renderLearning(); return; }
  const learnGo=e.target.closest('[data-learn-go]');
  if(learnGo){ state.currentModule=learnGo.dataset.learnGo; showView('lernen'); renderLearning(); return; }
  const ans=e.target.closest('.answer-btn');
  if(ans){
    if(ans.dataset.choice===ans.dataset.answer){ rewardLearning(ans); } else { ans.classList.add('wrong'); state.lives=Math.max(0,state.lives-1); persist(); $('#lives').textContent=state.lives; toast('Fast! Versuch es noch einmal.'); }
    return;
  }
  const chip=e.target.closest('.word-chip');
  if(chip){ $('#sentenceBox').textContent = ($('#sentenceBox').textContent + ' ' + chip.dataset.word).trim(); chip.disabled=true; return; }
  const check=e.target.closest('[data-check-sentence]');
  if(check){
    if(($('#sentenceBox').textContent||'').trim()===check.dataset.checkSentence){ rewardLearning(check); } else { toast('Achte auf den Satzbau.'); }
    return;
  }
  if(e.target.closest('[data-next-question]')){ state.currentQuestion++; renderLearning(); }
}
function rewardLearning(el){
  el.classList.add('correct'); state.xp += 20;
  const c = getSelectedCity(); c.progress = Math.min(100, (c.progress||0)+10); if(c.status==='unlocked') c.status='active';
  persist(); renderAll(); toast('Richtig! +20 XP');
}
