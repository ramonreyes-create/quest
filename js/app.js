const state = {
  xp: Number(localStorage.getItem('dq_xp') || 1240),
  lives: Number(localStorage.getItem('dq_lives') || 5),
  streak: Number(localStorage.getItem('dq_streak') || 7),
  selectedCity: localStorage.getItem('dq_city') || 'stuttgart',
  cities: [],
  missions: []
};

const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];

async function init(){
  state.cities = await fetch('data/cities.json').then(r=>r.json()).catch(()=>[]);
  state.missions = await fetch('data/missions.json').then(r=>r.json()).catch(()=>[]);
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
}

function showView(id){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#'+id).classList.add('active');
  $$('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.view === id));
  const titles={dashboard:'Dashboard',map:'DACH Karte',questpass:'QuestPass',missionen:'Missionen',profil:'Profil'};
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
  renderCurrentCity(); renderMissions(); renderMap(); renderCityPanel(); renderPassport();
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
  $('#cityPanel').innerHTML = `${citySummary(c)}<div class="module-grid"><div class="module">📖 Wortschatz</div><div class="module">🎧 Hören</div><div class="module">✍️ Schreiben</div><div class="module">🏆 Challenge</div></div><button class="primary" style="width:100%;margin-top:16px" ${locked?'disabled':''}>${locked?'Noch gesperrt':'Lektion starten'}</button>`;
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
