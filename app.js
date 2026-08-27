(()=>{'use strict';
const KEY='sxs_guild_planner_v4',SESSION='sxs_guild_master_v4',CLASSES=['Berserker','Paladin','Archmage','Arcanist'];
let state=load(),master=sessionStorage.getItem(SESSION)==='true';
const $=id=>document.getElementById(id);const e={loginBtn:$('loginBtn'),logoutBtn:$('logoutBtn'),exportBtn:$('exportBtn'),importBtn:$('importBtn'),status:$('status'),memberCount:$('memberCount'),totalPower:$('totalPower'),averagePower:$('averagePower'),unassigned:$('unassigned'),roster:$('roster'),empty:$('empty'),addBtn:$('addBtn'),generate:$('generate'),teams:$('teams'),noTeams:$('noTeams'),search:$('search'),classFilter:$('classFilter'),sort:$('sort'),login:$('login'),loginForm:$('loginForm'),user:$('user'),pass:$('pass'),loginError:$('loginError'),memberDialog:$('memberDialog'),memberForm:$('memberForm'),memberTitle:$('memberTitle'),memberId:$('memberId'),memberName:$('memberName'),memberClass:$('memberClass'),memberPower:$('memberPower'),memberNotes:$('memberNotes')};
function load(){try{let x=JSON.parse(localStorage.getItem(KEY)||'null');if(x&&Array.isArray(x.members))return{members:x.members,teams:Array.isArray(x.teams)?x.teams:[]}}catch(_){}return{members:[],teams:[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}function power(n){return Number(n||0).toLocaleString('en-US')}function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function gen(ms){
  // Required roles:
  // 1 Paladin
  // 1 Arcanist
  // 2 DPS 

  const paladins = ms
    .filter(m => m.class === 'Paladin')
    .sort((a, b) =>
      Number(b.power) - Number(a.power) ||
      a.name.localeCompare(b.name)
    );

  const arcanists = ms
    .filter(m => m.class === 'Arcanist')
    .sort((a, b) =>
      Number(b.power) - Number(a.power) ||
      a.name.localeCompare(b.name)
    );

  // Berserker and Archmage share the DPS pool.
  // This means the strongest DPS are selected regardless
  // of whether they are Berserker or Archmage.
  const dps = ms
    .filter(m =>
      m.class === 'Berserker' ||
      m.class === 'Archmage'
    )
    .sort((a, b) =>
      Number(b.power) - Number(a.power) ||
      a.name.localeCompare(b.name)
    );

  // A complete team requires:
  // 1 Paladin + 1 Arcanist + 2 DPS
  const teamCount = Math.min(
    15,
    paladins.length,
    arcanists.length,
    Math.floor(dps.length / 2)
  );

  const out = [];

  for(let i = 0; i < teamCount; i++){

    const players = [
      paladins[i],
      arcanists[i],
      dps[i * 2],
      dps[i * 2 + 1]
    ];

    out.push({
      number: i + 1,
      playerIds: players.map(p => p.id)
    });
  }

  return out;
}
function teamMap(){let m=new Map;state.teams.forEach(t=>(t.playerIds||[]).forEach(id=>m.set(id,t.number)));return m}
function classBadge(cls){return `<span class="badge ${esc(cls)}">${esc(cls)}</span>`}
function render(){e.loginBtn.hidden=master;e.logoutBtn.hidden=!master;e.exportBtn.hidden=!master;e.importBtn.hidden=false;e.addBtn.hidden=!master;e.generate.hidden=!master;e.status.className='status'+(master?' master':'');e.status.textContent=master?'Master mode — edit, generate, export, or load the shared roster from GitHub.':'Viewer mode — roster and teams are read-only.';stats();roster();teams()}
function stats(){let total=state.members.reduce((s,m)=>s+Number(m.power||0),0),tm=teamMap();e.memberCount.textContent=state.members.length;e.totalPower.textContent=power(total);e.averagePower.textContent=state.members.length?power(Math.round(total/state.members.length)):'0';e.unassigned.textContent=state.members.filter(m=>!tm.has(m.id)).length}
function roster(){let q=e.search.value.trim().toLowerCase(),cf=e.classFilter.value,s=e.sort.value,tm=teamMap(),rows=state.members.filter(m=>(!q||m.name.toLowerCase().includes(q))&&(!cf||m.class===cf));rows.sort((a,b)=>s==='pd'?Number(b.power)-Number(a.power):s==='pa'?Number(a.power)-Number(b.power):s==='name'?a.name.localeCompare(b.name):s==='class'?a.class.localeCompare(b.class)||a.name.localeCompare(b.name):(tm.get(a.id)||99)-(tm.get(b.id)||99));e.roster.innerHTML=rows.map(m=>`<tr><td><b>${esc(m.name)}</b>${m.notes?`<div class="muted">${esc(m.notes)}</div>`:''}</td><td>${classBadge(m.class)}</td><td>${power(m.power)}</td><td>${tm.has(m.id)?`<span class="badge team">Team ${tm.get(m.id)}</span>`:'<span class="muted">Unassigned</span>'}</td><td class="actions-head" style="${master?'':'display:none'}"><div class="actions"><button class="mini" data-edit="${m.id}">Edit</button><button class="mini danger" data-delete="${m.id}">Delete</button></div></td></tr>`).join('');e.empty.hidden=rows.length>0}
function teams(){
  e.noTeams.hidden = state.teams.length > 0;

  e.teams.innerHTML = state.teams.map(t => {

    const ps = (t.playerIds || [])
      .map(id => state.members.find(m => m.id === id))
      .filter(Boolean);

    const present = new Set(ps.map(p => p.class));

    const hasPaladin = present.has('Paladin');
    const hasArcanist = present.has('Arcanist');

    // Berserker and Archmage are both DPS.
    const dpsCount = ps.filter(p =>
      p.class === 'Berserker' ||
      p.class === 'Archmage'
    ).length;

    const missing = [];

    if(!hasPaladin) {
      missing.push('Paladin');
    }

    if(!hasArcanist) {
      missing.push('Arcanist');
    }

    if(dpsCount < 2) {
      missing.push(`${2 - dpsCount} DPS`);
    }

    const total = ps.reduce(
      (s, p) => s + Number(p.power),
      0
    );

    return `
      <article class="teamcard">

        <div class="teamtop">
          <h3>Team ${t.number}</h3>
          <b>${power(total)}</b>
        </div>

        <div class="meta">
          <span>${ps.length}/4 players</span>
          ${[...present].map(c => classBadge(c)).join('')}
        </div>

        <ul class="players">
          ${ps.map(p => `
            <li>
              <div>
                <b>${esc(p.name)}</b>
                <small>${esc(p.class)}</small>
              </div>
              <b>${power(p.power)}</b>
            </li>
          `).join('')}
        </ul>

        ${
          missing.length
            ? `<div class="missing">Missing: ${missing.join(', ')}</div>`
            : '<div class="present">Balanced team: 1 Paladin + 1 Arcanist + 2 DPS</div>'
        }

      </article>
    `;
  }).join('');
}
function openAdd(){e.memberForm.reset();e.memberId.value='';e.memberTitle.textContent='Add Member';e.memberDialog.showModal();e.memberName.focus()}function openEdit(id){let m=state.members.find(x=>x.id===id);if(!m)return;e.memberId.value=m.id;e.memberName.value=m.name;e.memberClass.value=m.class;e.memberPower.value=m.power;e.memberNotes.value=m.notes||'';e.memberTitle.textContent='Edit Member';e.memberDialog.showModal()}
e.loginBtn.onclick=()=>{e.loginError.hidden=true;e.loginForm.reset();e.login.showModal();e.user.focus()};e.logoutBtn.onclick=()=>{master=false;sessionStorage.removeItem(SESSION);render()};e.addBtn.onclick=openAdd;e.generate.onclick=()=>{state.teams=gen(state.members);save();render()};
e.loginForm.onsubmit=x=>{x.preventDefault();if(e.user.value==='Mika'&&e.pass.value==='EvilEnvy'){master=true;sessionStorage.setItem(SESSION,'true');e.login.close();render()}else e.loginError.hidden=false};
e.memberForm.onsubmit=x=>{x.preventDefault();if(!master)return;let name=e.memberName.value.trim(),cls=e.memberClass.value,p=Number(e.memberPower.value),notes=e.memberNotes.value.trim();if(!name||!CLASSES.includes(cls)||!Number.isFinite(p)||p<0)return;let id=e.memberId.value;if(id){let m=state.members.find(x=>x.id===id);if(m)Object.assign(m,{name,class:cls,power:p,notes})}else state.members.push({id:uid(),name,class:cls,power:p,notes});state.teams=[];save();e.memberDialog.close();render()};
e.roster.onclick=x=>{let ed=x.target.closest('[data-edit]'),del=x.target.closest('[data-delete]');if(ed)openEdit(ed.dataset.edit);if(del&&master){let m=state.members.find(z=>z.id===del.dataset.delete);if(m&&confirm(`Delete "${m.name}"?`)){state.members=state.members.filter(z=>z.id!==m.id);state.teams=state.teams.map(t=>({...t,playerIds:(t.playerIds||[]).filter(id=>id!==m.id)})).filter(t=>t.playerIds.length);save();render()}}};
e.exportBtn.onclick=()=>{let data={format:'sword-x-staff-guild-planner',version:4,exportedAt:new Date().toISOString(),members:state.members,teams:state.teams},blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sword-x-staff-roster.json';a.click();URL.revokeObjectURL(a.href)};

async function loadFromGitHub(silent=false){
  let old=e.importBtn.textContent;
  e.importBtn.disabled=true;
  e.importBtn.textContent='Loading…';
  try{
    let r=await fetch(`roster.json?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw Error(`HTTP ${r.status}`);
    let data=await r.json();
    if(!Array.isArray(data.members))throw Error('Invalid roster');
    let members=data.members.map(m=>({id:String(m.id||uid()),name:String(m.name||'').trim(),class:m.class,power:Number(m.power),notes:String(m.notes||'')})).filter(m=>m.name&&CLASSES.includes(m.class)&&Number.isFinite(m.power)&&m.power>=0);
    if(!silent && !confirm(`Load ${members.length} members from GitHub? This replaces the current local roster.`))return;
    state={members,teams:[]};
    // Auto-generate ranked teams after loading
    state.teams=gen(state.members);
    save();
    render();
    if(!silent)alert('Roster loaded from GitHub successfully.');
  }catch(err){
    console.error(err);
    if(!silent)alert('Could not load roster.json from GitHub Pages. Make sure roster.json exists in the published site root.');
  }finally{
    e.importBtn.disabled=false;
    e.importBtn.textContent=old;
  }
}

e.importBtn.onclick=()=>loadFromGitHub(false);

document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
[e.search,e.classFilter,e.sort].forEach(x=>x.addEventListener('input',roster));
render();

// Auto-load roster from GitHub on every page load (silent = no confirm/alert),
// then automatically generate ranked teams
loadFromGitHub(true);
})();
