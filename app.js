const $ = (id)=>document.getElementById(id);
const state = JSON.parse(localStorage.getItem('dq2-state')||'{}');
const defaults = {name:'Schülerin',xp:0,streak:0,hearts:5,badges:[],city:'berlin',mode:'choice',index:0,answered:{}};
let S = {...defaults,...state};
let current = null;
function save(){localStorage.setItem('dq2-state',JSON.stringify(S));}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function city(){return DQ_DATA.cities.find(c=>c.id===S.city)||DQ_DATA.cities[0]}
function words(){return DQ_DATA.words[S.city]||DQ_DATA.words.berlin}
function renderStats(){
  $('playerName').textContent=S.name||'Schülerin'; $('levelText').textContent='Level '+(Math.floor(S.xp/100)+1);
  $('xp').textContent=S.xp; $('streak').textContent=S.streak; $('hearts').textContent=S.hearts; $('badges').textContent=S.badges.length;
  const total = Object.keys(DQ_DATA.words).reduce((n,k)=>n+DQ_DATA.words[k].length,0);
  const done = Object.keys(S.answered||{}).length; const p=Math.min(100,Math.round(done/total*100));
  $('progressPercent').textContent=p+'%'; $('progressBar').style.width=p+'%'; $('nameInput').value=S.name==='Schülerin'?'':S.name;
}
function renderCities(){
  $('cityGrid').innerHTML='';
  DQ_DATA.cities.forEach(c=>{
    const locked=S.xp<c.unlock;
    const div=document.createElement('button'); div.className='city '+(c.id===S.city?'active ':'')+(locked?'locked':'');
    div.innerHTML=`<span class="emoji">${c.emoji}</span><strong>${c.name}</strong><small>${c.book} · ${c.lesson}<br>${locked?'🔒 ab '+c.unlock+' XP':'✅ frei'}</small>`;
    div.onclick=()=>{if(!locked){S.city=c.id;S.index=0;save();renderAll();}};
    $('cityGrid').appendChild(div);
  });
}
function renderQuestion(){
  const c=city(); const list=words(); current=list[S.index%list.length];
  $('lessonMeta').textContent=`${c.book} · ${c.lesson} · ${c.name}`; $('lessonTitle').textContent=c.title;
  $('feedback').textContent=''; $('feedback').className='feedback'; $('next').classList.add('hidden');
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===S.mode));
  $('writeArea').classList.toggle('hidden',S.mode==='choice'); $('options').classList.toggle('hidden',S.mode!=='choice');
  if(S.mode==='choice'){
    $('questionType').textContent='Was bedeutet dieses Wort auf Spanisch?'; $('questionWord').textContent=current[0];
    const wrong=shuffle(list.filter(w=>w[1]!==current[1])).slice(0,3).map(w=>w[1]);
    $('options').innerHTML=shuffle([current[1],...wrong]).map(x=>`<button class="option">${x}</button>`).join('');
    document.querySelectorAll('.option').forEach(btn=>btn.onclick=()=>check(btn,btn.textContent===current[1]));
  } else if(S.mode==='write'){
    $('questionType').textContent='Schreibe das deutsche Wort.'; $('questionWord').textContent=current[1]; $('answerInput').value=''; $('answerInput').focus();
  } else {
    $('questionType').textContent='Ergänze den Satz.'; $('questionWord').textContent=`Ich lerne: ____ (${current[1]})`; $('answerInput').value=''; $('answerInput').focus();
  }
}
function reward(ok){
  const key=S.city+'-'+S.index+'-'+S.mode;
  if(ok){S.xp+=10;S.streak+=1;S.answered[key]=true;if(S.streak>0 && S.streak%10===0 && !S.badges.includes('streak'+S.streak))S.badges.push('streak'+S.streak);} 
  else {S.streak=0;S.hearts=Math.max(0,S.hearts-1);if(S.hearts===0){S.hearts=5;$('feedback').textContent+=' Neue Leben erhalten.'}}
  save(); renderStats(); renderCities();
}
function check(btn,ok){
  document.querySelectorAll('.option').forEach(b=>b.disabled=true);
  if(btn){btn.classList.add(ok?'correct':'wrong');document.querySelectorAll('.option').forEach(b=>{if(b.textContent===current[1])b.classList.add('correct')});}
  $('feedback').textContent=ok?'Sehr gut! +10 XP':'Noch einmal üben: '+current[0]+' = '+current[1];
  $('feedback').className='feedback '+(ok?'good':'bad'); reward(ok); $('next').classList.remove('hidden');
}
function checkInput(){
  const val=$('answerInput').value.trim().toLowerCase();
  const answer=current[0].replace(/^(der|die|das)\s+/,'').toLowerCase();
  const full=current[0].toLowerCase(); check(null,val===answer||val===full);
}
function renderAll(){renderStats();renderCities();renderQuestion();}
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{S.mode=b.dataset.mode;save();renderQuestion();});
$('next').onclick=()=>{S.index++;save();renderQuestion();}; $('checkWrite').onclick=checkInput; $('answerInput').addEventListener('keydown',e=>{if(e.key==='Enter')checkInput();});
$('saveName').onclick=()=>{S.name=$('nameInput').value.trim()||'Schülerin';save();renderStats();};
$('reset').onclick=()=>{if(confirm('Fortschritt wirklich löschen?')){localStorage.removeItem('dq2-state');location.reload();}};
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});} renderAll();
