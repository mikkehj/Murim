(()=>{'use strict';

const KEY='sxs_guild_planner_v4';
const SESSION='sxs_guild_master_v4';
const CLASSES=['Berserker','Paladin','Archmage','Arcanist'];

let state=load();
let master=sessionStorage.getItem(SESSION)==='true';

let ocrWorker=null;
let ocrBusy=false;
let pendingRows=[];

const $=id=>document.getElementById(id);

const e={
  loginBtn:$('loginBtn'),
  logoutBtn:$('logoutBtn'),
  exportBtn:$('exportBtn'),
  importBtn:$('importBtn'),
  screenshotBtn:$('screenshotBtn'),

  status:$('status'),

  memberCount:$('memberCount'),
  totalPower:$('totalPower'),
  averagePower:$('averagePower'),
  unassigned:$('unassigned'),

  roster:$('roster'),
  empty:$('empty'),

  addBtn:$('addBtn'),
  generate:$('generate'),

  teams:$('teams'),
  noTeams:$('noTeams'),

  search:$('search'),
  classFilter:$('classFilter'),
  sort:$('sort'),

  login:$('login'),
  loginForm:$('loginForm'),
  user:$('user'),
  pass:$('pass'),
  loginError:$('loginError'),

  memberDialog:$('memberDialog'),
  memberForm:$('memberForm'),
  memberTitle:$('memberTitle'),
  memberId:$('memberId'),
  memberName:$('memberName'),
  memberClass:$('memberClass'),
  memberPower:$('memberPower'),
  memberNotes:$('memberNotes'),

  screenshotDialog:$('screenshotDialog'),
  screenshotFiles:$('screenshotFiles'),
  ocrProgress:$('ocrProgress'),
  ocrResults:$('ocrResults'),
  ocrSummary:$('ocrSummary'),
  applyScreenshots:$('applyScreenshots'),
  clearScreenshots:$('clearScreenshots')
};


/* =========================================================
   STORAGE
========================================================= */

function load(){
  try{
    let x=JSON.parse(localStorage.getItem(KEY)||'null');

    if(x&&Array.isArray(x.members)){
      return{
        members:x.members,
        teams:Array.isArray(x.teams)?x.teams:[]
      };
    }
  }catch(_){}

  return{
    members:[],
    teams:[]
  };
}

function save(){
  localStorage.setItem(KEY,JSON.stringify(state));
}

function uid(){
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36)+Math.random().toString(36).slice(2);
}

function power(n){
  return Number(n||0).toLocaleString('en-US');
}

function esc(v){
  return String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}


/* =========================================================
   TEAM GENERATION
   ========================================================= */

function gen(ms){

  const paladins=ms
    .filter(m=>m.class==='Paladin')
    .sort((a,b)=>
      Number(b.power)-Number(a.power) ||
      a.name.localeCompare(b.name)
    );

  const arcanists=ms
    .filter(m=>m.class==='Arcanist')
    .sort((a,b)=>
      Number(b.power)-Number(a.power) ||
      a.name.localeCompare(b.name)
    );

  const dps=ms
    .filter(m=>
      m.class==='Berserker' ||
      m.class==='Archmage'
    )
    .sort((a,b)=>
      Number(b.power)-Number(a.power) ||
      a.name.localeCompare(b.name)
    );

  const teamCount=Math.min(
    15,
    paladins.length,
    arcanists.length,
    Math.floor(dps.length/2)
  );

  const out=[];

  for(let i=0;i<teamCount;i++){

    out.push({
      number:i+1,

      playerIds:[
        paladins[i],
        arcanists[i],
        dps[i*2],
        dps[i*2+1]
      ].map(p=>p.id)
    });

  }

  return out;
}


/* =========================================================
   DISPLAY
========================================================= */

function teamMap(){

  let m=new Map();

  state.teams.forEach(t=>
    (t.playerIds||[]).forEach(id=>
      m.set(id,t.number)
    )
  );

  return m;
}

function classBadge(cls){
  return `<span class="badge ${esc(cls)}">${esc(cls)}</span>`;
}

function render(){

  e.loginBtn.hidden=master;
  e.logoutBtn.hidden=!master;

  e.exportBtn.hidden=!master;

  // Load from GitHub remains available to viewers.
  e.importBtn.hidden=false;

  // Screenshot updater is MASTER ONLY.
  e.screenshotBtn.hidden=!master;

  e.addBtn.hidden=!master;
  e.generate.hidden=!master;

  e.status.className='status'+(master?' master':'');
  
  e.status.textContent=master
    ? 'Master mode — edit, generate, export, or update the roster from screenshots.'
    : 'Viewer mode — roster and teams are read-only.';

  stats();
  roster();
  teams();
}

function stats(){

  let total=state.members.reduce(
    (s,m)=>s+Number(m.power||0),
    0
  );

  let tm=teamMap();

  e.memberCount.textContent=state.members.length;

  e.totalPower.textContent=power(total);

  e.averagePower.textContent=
    state.members.length
      ? power(Math.round(total/state.members.length))
      : '0';

  e.unassigned.textContent=
    state.members.filter(m=>!tm.has(m.id)).length;
}

function roster(){

  let q=e.search.value.trim().toLowerCase();
  let cf=e.classFilter.value;
  let s=e.sort.value;
  let tm=teamMap();

  let rows=state.members.filter(m=>
    (!q||m.name.toLowerCase().includes(q)) &&
    (!cf||m.class===cf)
  );

  rows.sort((a,b)=>
    s==='pd'
      ? Number(b.power)-Number(a.power)

      :s==='pa'
      ? Number(a.power)-Number(b.power)

      :s==='name'
      ? a.name.localeCompare(b.name)

      :s==='class'
      ? a.class.localeCompare(b.class) ||
        a.name.localeCompare(b.name)

      :(tm.get(a.id)||99)-(tm.get(b.id)||99)
  );

  e.roster.innerHTML=rows.map(m=>`

    <tr>

      <td>
        <b>${esc(m.name)}</b>
        ${m.notes
          ? `<div class="muted">${esc(m.notes)}</div>`
          :''
        }
      </td>

      <td>
        ${classBadge(m.class)}
      </td>

      <td>
        ${power(m.power)}
      </td>

      <td>
        ${
          tm.has(m.id)
            ? `<span class="badge team">Team ${tm.get(m.id)}</span>`
            : '<span class="muted">Unassigned</span>'
        }
      </td>

      <td
        class="actions-head"
        style="${master?'':'display:none'}"
      >
        <div class="actions">

          <button
            class="mini"
            data-edit="${m.id}"
          >
            Edit
          </button>

          <button
            class="mini danger"
            data-delete="${m.id}"
          >
            Delete
          </button>

        </div>
      </td>

    </tr>

  `).join('');

  e.empty.hidden=rows.length>0;
}

function teams(){

  e.noTeams.hidden=state.teams.length>0;

  e.teams.innerHTML=state.teams.map(t=>{

    const ps=(t.playerIds||[])
      .map(id=>state.members.find(m=>m.id===id))
      .filter(Boolean);

    const present=new Set(ps.map(p=>p.class));

    const hasPaladin=present.has('Paladin');
    const hasArcanist=present.has('Arcanist');

    const dpsCount=ps.filter(p=>
      p.class==='Berserker' ||
      p.class==='Archmage'
    ).length;

    const missing=[];

    if(!hasPaladin){
      missing.push('Paladin');
    }

    if(!hasArcanist){
      missing.push('Arcanist');
    }

    if(dpsCount<2){
      missing.push(`${2-dpsCount} DPS`);
    }

    const total=ps.reduce(
      (s,p)=>s+Number(p.power),
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

          ${[...present]
            .map(c=>classBadge(c))
            .join('')
          }

        </div>

        <ul class="players">

          ${ps.map(p=>`

            <li>

              <div>

                <b>${esc(p.name)}</b>

                <small>
                  ${esc(p.class)}
                </small>

              </div>

              <b>
                ${power(p.power)}
              </b>

            </li>

          `).join('')}

        </ul>

        ${
          missing.length

            ? `<div class="missing">
                Missing: ${missing.join(', ')}
              </div>`

            : `<div class="present">
                Balanced team:
                1 Paladin + 1 Arcanist + 2 DPS
              </div>`
        }

      </article>

    `;

  }).join('');
}


/* =========================================================
   MEMBER EDITING
========================================================= */

function openAdd(){

  e.memberForm.reset();

  e.memberId.value='';

  e.memberTitle.textContent='Add Member';

  e.memberDialog.showModal();

  e.memberName.focus();
}

function openEdit(id){

  let m=state.members.find(x=>x.id===id);

  if(!m)return;

  e.memberId.value=m.id;
  e.memberName.value=m.name;
  e.memberClass.value=m.class;
  e.memberPower.value=m.power;
  e.memberNotes.value=m.notes||'';

  e.memberTitle.textContent='Edit Member';

  e.memberDialog.showModal();
}


/* =========================================================
   LOGIN / MEMBER EVENTS
========================================================= */

e.loginBtn.onclick=()=>{

  e.loginError.hidden=true;

  e.loginForm.reset();

  e.login.showModal();

  e.user.focus();
};

e.logoutBtn.onclick=()=>{

  master=false;

  sessionStorage.removeItem(SESSION);

  render();
};

e.addBtn.onclick=openAdd;

e.generate.onclick=()=>{

  if(!master)return;

  state.teams=gen(state.members);

  save();

  render();
};

e.loginForm.onsubmit=x=>{

  x.preventDefault();

  if(
    e.user.value==='Mika' &&
    e.pass.value==='EvilEnvy'
  ){

    master=true;

    sessionStorage.setItem(
      SESSION,
      'true'
    );

    e.login.close();

    render();

  }else{

    e.loginError.hidden=false;

  }
};

e.memberForm.onsubmit=x=>{

  x.preventDefault();

  if(!master)return;

  let name=e.memberName.value.trim();
  let cls=e.memberClass.value;
  let p=Number(e.memberPower.value);
  let notes=e.memberNotes.value.trim();

  if(
    !name ||
    !CLASSES.includes(cls) ||
    !Number.isFinite(p) ||
    p<0
  )return;

  let id=e.memberId.value;

  if(id){

    let m=state.members.find(x=>x.id===id);

    if(m){

      Object.assign(m,{
        name,
        class:cls,
        power:p,
        notes
      });

    }

  }else{

    state.members.push({
      id:uid(),
      name,
      class:cls,
      power:p,
      notes
    });

  }

  state.teams=[];

  save();

  e.memberDialog.close();

  render();
};

e.roster.onclick=x=>{

  let ed=x.target.closest('[data-edit]');
  let del=x.target.closest('[data-delete]');

  if(ed&&master){

    openEdit(ed.dataset.edit);

  }

  if(del&&master){

    let m=state.members.find(
      z=>z.id===del.dataset.delete
    );

    if(
      m &&
      confirm(`Delete "${m.name}"?`)
    ){

      state.members=
        state.members.filter(
          z=>z.id!==m.id
        );

      state.teams=
        state.teams
          .map(t=>({
            ...t,
            playerIds:(t.playerIds||[])
              .filter(id=>id!==m.id)
          }))
          .filter(t=>t.playerIds.length);

      save();

      render();
    }
  }
};


/* =========================================================
   EXPORT
========================================================= */

e.exportBtn.onclick=()=>{

  if(!master)return;

  let data={
    format:'sword-x-staff-guild-planner',
    version:4,
    exportedAt:new Date().toISOString(),
    members:state.members,
    teams:state.teams
  };

  let blob=new Blob(
    [JSON.stringify(data,null,2)],
    {type:'application/json'}
  );

  let a=document.createElement('a');

  a.href=URL.createObjectURL(blob);

  a.download='sword-x-staff-roster.json';

  a.click();

  URL.revokeObjectURL(a.href);
};


/* =========================================================
   LOAD FROM GITHUB
========================================================= */

async function loadFromGitHub(silent=false){

  let old=e.importBtn.textContent;

  e.importBtn.disabled=true;

  e.importBtn.textContent='Loading…';

  try{

    let r=await fetch(
      `roster.json?v=${Date.now()}`,
      {cache:'no-store'}
    );

    if(!r.ok)
      throw Error(`HTTP ${r.status}`);

    let data=await r.json();

    if(!Array.isArray(data.members))
      throw Error('Invalid roster');

    let members=data.members

      .map(m=>({

        id:String(m.id||uid()),

        name:String(m.name||'').trim(),

        class:m.class,

        power:Number(m.power),

        notes:String(m.notes||'')

      }))

      .filter(m=>
        m.name &&
        CLASSES.includes(m.class) &&
        Number.isFinite(m.power) &&
        m.power>=0
      );

    if(
      !silent &&
      !confirm(
        `Load ${members.length} members from GitHub? `+
        `This replaces the current local roster.`
      )
    )return;

    state={
      members,
      teams:gen(members)
    };

    save();

    render();

    if(!silent){

      alert(
        'Roster loaded from GitHub successfully.'
      );

    }

  }catch(err){

    console.error(err);

    if(!silent){

      alert(
        'Could not load roster.json from GitHub Pages. '+
        'Make sure roster.json exists in the published site root.'
      );

    }

  }finally{

    e.importBtn.disabled=false;

    e.importBtn.textContent=old;
  }
}

e.importBtn.onclick=()=>loadFromGitHub(false);


/* =========================================================
   SCREENSHOT OCR
========================================================= */

function normalizeName(s){

  return String(s||'')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]/g,'');
}

function similarity(a,b){

  a=normalizeName(a);
  b=normalizeName(b);

  if(!a||!b)return 0;

  if(a===b)return 1;

  const prev=Array(b.length+1).fill(0);

  for(let j=0;j<=b.length;j++)
    prev[j]=j;

  for(let i=1;i<=a.length;i++){

    let cur=[i];

    for(let j=1;j<=b.length;j++){

      cur[j]=Math.min(

        cur[j-1]+1,

        prev[j]+1,

        prev[j-1]+
        (a[i-1]===b[j-1]?0:1)

      );

    }

    for(let j=0;j<=b.length;j++)
      prev[j]=cur[j];
  }

  return 1-
    (prev[b.length]/
    Math.max(a.length,b.length));
}

function findMatch(name){

  const n=normalizeName(name);

  if(!n)return null;

  let exact=state.members.find(
    m=>normalizeName(m.name)===n
  );

  if(exact){

    return{
      member:exact,
      score:1,
      exact:true
    };

  }

  let best=null;
  let bestScore=0;

  state.members.forEach(m=>{

    let s=similarity(name,m.name);

    if(s>bestScore){

      bestScore=s;
      best=m;

    }

  });

  return best&&bestScore>=0.72

    ? {
        member:best,
        score:bestScore,
        exact:false
      }

    : null;
}


/* =========================================================
   IMAGE / COLOR UTILITIES
========================================================= */

function rgbToHsv(r,g,b){

  r/=255;
  g/=255;
  b/=255;

  let max=Math.max(r,g,b);
  let min=Math.min(r,g,b);
  let d=max-min;

  let h=0;

  let s=max===0
    ? 0
    : d/max;

  let v=max;

  if(d){

    if(max===r)
      h=((g-b)/d)%6;

    else if(max===g)
      h=(b-r)/d+2;

    else
      h=(r-g)/d+4;

    h*=60;

    if(h<0)
      h+=360;
  }

  return[h,s,v];
}

function cropCanvas(
  source,
  x,
  y,
  w,
  h,
  scale=3
){

  x=Math.max(0,Math.floor(x));
  y=Math.max(0,Math.floor(y));

  w=Math.max(
    1,
    Math.min(
      source.width-x,
      Math.floor(w)
    )
  );

  h=Math.max(
    1,
    Math.min(
      source.height-y,
      Math.floor(h)
    )
  );

  let c=document.createElement('canvas');

  c.width=w*scale;
  c.height=h*scale;

  let ctx=c.getContext('2d');

  ctx.imageSmoothingEnabled=true;

  ctx.drawImage(
    source,
    x,y,w,h,
    0,0,c.width,c.height
  );

  return c;
}


/* =========================================================
   TESSERACT
========================================================= */

async function getOcrWorker(){

  if(!window.Tesseract){

    throw Error(
      'OCR library did not load. '+
      'Check your internet connection.'
    );
  }

  if(!ocrWorker){

    ocrWorker=await Tesseract.createWorker(
      'eng',
      1,
      {
        logger:m=>{

          if(
            m.status==='recognizing text' &&
            e.ocrProgress
          ){

            e.ocrProgress.textContent=
              `OCR engine: ${
                Math.round(
                  (m.progress||0)*100
                )
              }%`;
          }

        }
      }
    );

    await ocrWorker.setParameters({

      tessedit_pageseg_mode:'6',

      preserve_interword_spaces:'0'

    });
  }

  return ocrWorker;
}

async function ocr(canvas){

  const w=await getOcrWorker();

  const r=await w.recognize(canvas);

  return{

    text:String(
      r.data.text||''
    ).trim(),

    confidence:Number(
      r.data.confidence||0
    ),

    words:r.data.words||[]

  };
}


/* =========================================================
   FIND "POWER" HEADER
========================================================= */

async function findPowerHeader(canvas){

  const h=canvas.height;
  const w=canvas.width;

  // The Power header is near the top of the screenshot.
  const y=Math.round(h*.085);
  const hh=Math.round(h*.10);

  const crop=cropCanvas(
    canvas,
    0,
    y,
    w,
    hh,
    1
  );

  const r=await ocr(crop);

  let word=(r.words||[]).find(
    x=>/power/i.test(
      String(x.text||'')
    )
  );

  if(word){

    return{

      x:
        (word.bbox.x0+
         word.bbox.x1)/2,

      y:
        y+
        (word.bbox.y0+
         word.bbox.y1)/2,

      bottom:
        y+word.bbox.y1

    };
  }

  // Fallback for screenshots where OCR
  // fails to recognize the header.
  return{

    x:w*.185,
    y:h*.125,
    bottom:h*.15

  };
}


/* =========================================================
   FIND CLASS ICON X POSITION
========================================================= */

function findIconX(
  canvas,
  powerX,
  headerBottom
){

  const ctx=canvas.getContext('2d');

  const startY=
    Math.floor(headerBottom+20);

  const height=
    Math.max(
      1,
      Math.floor(
        canvas.height-
        headerBottom-
        180
      )
    );

  const data=ctx.getImageData(
    0,
    startY,
    canvas.width,
    height
  ).data;

  // The class icon is slightly to the left
  // of the center of the Power header.
  const xMin=Math.max(
    0,
    Math.floor(
      powerX-
      canvas.width*.095
    )
  );

  const xMax=Math.min(
    canvas.width-1,
    Math.floor(
      powerX+
      canvas.width*.035
    )
  );

  let bestX=Math.round(
    powerX-
    canvas.width*.037
  );

  let bestScore=-1;

  for(
    let x=xMin;
    x<=xMax;
    x++
  ){

    let score=0;

    for(
      let y=0;
      y<height;
      y+=3
    ){

      let i=
        (y*canvas.width+x)*4;

      let [hh,s,v]=rgbToHsv(
        data[i],
        data[i+1],
        data[i+2]
      );

      if(
        s>.20 &&
        v>.45
      ){

        score++;
      }
    }

    if(score>bestScore){

      bestScore=score;
      bestX=x;

    }
  }

  return bestX;
}


/* =========================================================
   FIND CLASS ICON ROWS
========================================================= */

function findClassRows(
  canvas,
  iconX,
  headerBottom
){

  const ctx=canvas.getContext('2d');

  const start=Math.max(
    Math.floor(headerBottom+25),
    250
  );

  const end=Math.max(
    start+1,
    canvas.height-130
  );

  const half=15;

  const strip=ctx.getImageData(
    Math.max(0,iconX-half),
    start,
    Math.min(
      canvas.width,
      half*2+1
    ),
    end-start
  ).data;

  const stripW=Math.min(
    canvas.width,
    half*2+1
  );

  const scores=[];

  for(
    let y=0;
    y<end-start;
    y+=2
  ){

    let score=0;

    for(
      let x=0;
      x<stripW;
      x+=2
    ){

      const i=
        (y*stripW+x)*4;

      const [
        h,
        s,
        v
      ]=rgbToHsv(
        strip[i],
        strip[i+1],
        strip[i+2]
      );

      if(
        s>.20 &&
        v>.45
      ){

        score++;
      }
    }

    scores.push({
      y:start+y,
      score
    });
  }

  const peaks=[];

  for(
    let i=2;
    i<scores.length-2;
    i++
  ){

    let s=scores[i].score;

    if(s<9)
      continue;

    if(
      s>=scores[i-1].score &&
      s>=scores[i+1].score &&
      s>=scores[i-2].score &&
      s>=scores[i+2].score
    ){

      peaks.push(
        scores[i]
      );
    }
  }

  peaks.sort(
    (a,b)=>a.y-b.y
  );

  const selected=[];

  for(const p of peaks){

    const last=
      selected[selected.length-1];

    if(
      last &&
      p.y-last.y<55
    ){

      if(
        p.score>last.score
      ){

        selected[
          selected.length-1
        ]=p;

      }

    }else{

      selected.push(p);

    }
  }

  return selected

    .map(p=>p.y)

    .filter(
      y=>
        y>start+10 &&
        y<end-5
    );
}


/* =========================================================
   DETERMINE CLASS FROM ICON COLOR
========================================================= */

function classifyIcon(
  canvas,
  iconX,
  cy
){

  const ctx=canvas.getContext('2d');

  const x0=Math.max(
    0,
    iconX-15
  );

  const y0=Math.max(
    0,
    cy-15
  );

  const w=Math.min(
    31,
    canvas.width-x0
  );

  const h=Math.min(
    31,
    canvas.height-y0
  );

  const data=ctx.getImageData(
    x0,
    y0,
    w,
    h
  ).data;

  const counts={

    Berserker:0,
    Arcanist:0,
    Paladin:0,
    Archmage:0

  };

  let total=0;

  for(
    let i=0;
    i<data.length;
    i+=4
  ){

    let [
      hue,
      s,
      v
    ]=rgbToHsv(
      data[i],
      data[i+1],
      data[i+2]
    );

    if(
      s<.18 ||
      v<.4
    )continue;

    total++;

    if(
      hue<14 ||
      hue>345
    ){

      counts.Berserker++;

    }else if(
      hue>=14 &&
      hue<60
    ){

      counts.Paladin++;

    }else if(
      hue>=75 &&
      hue<185
    ){

      counts.Arcanist++;

    }else if(
      hue>=185 &&
      hue<275
    ){

      counts.Archmage++;

    }
  }

  let best=CLASSES.reduce(
    (a,b)=>
      counts[b]>counts[a]
        ? b
        : a,
    CLASSES[0]
  );

  let ratio=
    total
      ? counts[best]/total
      : 0;

  return ratio>=.42

    ? {
        class:best,
        confidence:ratio
      }

    : {
        class:null,
        confidence:ratio
      };
}


/* =========================================================
   POWER PARSING
========================================================= */

function parsePower(text){

  let s=String(text||'')

    .replace(/,/g,'.')
    .replace(/\s+/g,'');

  let m=s.match(
    /(\d+(?:\.\d+)?)\s*([KMB])/i
  );

  if(!m)
    return null;

  let n=Number(m[1]);

  if(!Number.isFinite(n))
    return null;

  const mult={

    K:1e3,
    M:1e6,
    B:1e9

  }[m[2].toUpperCase()];

  return Math.round(
    n*mult
  );
}


/* =========================================================
   NAME CLEANING
========================================================= */

function cleanName(text){

  let s=String(text||'')

    .replace(/\r/g,'')

    .split('\n')

    .map(x=>x.trim())

    .filter(Boolean);

  s=s.filter(
    x=>
      !/(^|\s)(expert|iii|ii|rank)(\s|$)/i
        .test(x)
  );

  let candidate=

    s.find(
      x=>
        !/[KMB]\s*$/i.test(x) &&
        !/[\d.,]+[KMB]/i.test(x)
    )

    ||s[0]
    ||'';

  candidate=

    candidate

      .replace(
        /^[^A-Za-z0-9À-ÿ_^?'. -]+/,
        ''
      )

      .replace(
        /[^A-Za-z0-9À-ÿ_^?'. -]+$/,
        ''
      )

      .replace(
        /\s{2,}/g,
        ' '
      )

      .trim();

  return candidate;
}

/* =========================================================
   PROCESS ONE SCREENSHOT
   ========================================================= */

/*
  Improved OCR strategy

  We do NOT ask OCR to read:

      class icon + name + weapon icon + power

  as one large block.

  Instead:

  1. OCR the whole screenshot once.
  2. Use the detected class-icon rows.
  3. Find the closest name text inside each row.
  4. OCR ONLY the power number, excluding the weapon icon.
*/


function cleanOcrName(text){

  let s=String(text||'')
    .replace(/\r/g,' ')
    .replace(/\n/g,' ')
    .trim();

  /*
    Remove common OCR garbage around names.
  */

  s=s
    .replace(/^[^A-Za-z0-9À-ÿ_^?'. -]+/,'')
    .replace(/[^A-Za-z0-9À-ÿ_^?'. -]+$/,'')
    .replace(/\s{2,}/g,' ')
    .trim();

  /*
    Reject obvious non-name OCR.
  */

  if(!s)return '';

  if(
    /^(expert|iii|ii|i|rank|power|this|week|total|online)$/i
      .test(s)
  ){
    return '';
  }

  /*
    Reject values such as:

      3.92M
      4.28M
      710
  */

  if(/^[\d.,]+[KMB]?$/i.test(s)){
    return '';
  }

  return s;
}


/*
  Find a player name near a detected row.

  OCR coordinates are in original screenshot pixels.
*/
function findNameForRow(words,cy){

  const candidates=[];

  for(const w of words){

    const text=String(w.text||'').trim();

    if(!text)
      continue;

    const x=Number(w.bbox?.x0||0);
    const y=Number(w.bbox?.y0||0);
    const ww=Number(w.bbox?.x1||0)-x;
    const hh=Number(w.bbox?.y1||0)-y;

    /*
      Player names are in this area.

      We intentionally exclude the class icon,
      power number, rank, contribution, etc.
    */

    if(x<145 || x>370)
      continue;

    /*
      Name is normally above the power value.
    */

    if(y<cy-65 || y>cy+8)
      continue;

    const cleaned=cleanOcrName(text);

    if(!cleaned)
      continue;

    /*
      Reject things that obviously belong
      to other columns.
    */

    if(
      /expert/i.test(cleaned) ||
      /rank/i.test(cleaned) ||
      /power/i.test(cleaned)
    ){
      continue;
    }

    candidates.push({
      text:cleaned,
      x,
      y,
      width:ww,
      height:hh,
      conf:Number(w.conf||0)
    });
  }

  if(!candidates.length)
    return '';

  /*
    Prefer:

      - text closest to row center
      - text further left
      - larger OCR confidence
  */

  candidates.sort((a,b)=>{

    const da=Math.abs((a.y+a.height/2)-(cy-20));
    const db=Math.abs((b.y+b.height/2)-(cy-20));

    return(
      da-db ||
      a.x-b.x ||
      b.conf-a.conf
    );

  });

  /*
    In most cases the first candidate is enough.

    However, OCR can split a name into multiple words.
    If several words are very close together, combine them.
  */

  const first=candidates[0];

  const nearby=candidates
    .filter(x=>
      Math.abs(x.y-first.y)<18 &&
      Math.abs(x.x-(first.x+first.width))<20
    )
    .sort((a,b)=>a.x-b.x);

  if(nearby.length>1){

    const combined=nearby
      .map(x=>x.text)
      .join(' ')
      .trim();

    if(combined)
      return combined;
  }

  return first.text;
}


/*
  OCR ONLY the power value.

  Important:
  The crossed-swords icon is deliberately excluded.

  On your screenshots the actual number starts
  around x=185.
*/
async function readPowerForRow(canvas,cy){

  /*
    Power number region.

    Example:

       [crossed swords] 3.92M

                       ^
                       |
              start OCR here
  */

  const x=185;

  const y=Math.max(
    0,
    Math.floor(cy+12)
  );

  const width=Math.min(
    145,
    canvas.width-x
  );

  const height=Math.min(
    58,
    canvas.height-y
  );

  if(width<=5 || height<=5)
    return null;

  let crop=cropCanvas(
    canvas,
    x,
    y,
    width,
    height,
    4
  );

  const ctx=crop.getContext('2d');

  /*
    Convert to grayscale.
  */

  const imageData=ctx.getImageData(
    0,
    0,
    crop.width,
    crop.height
  );

  const data=imageData.data;

  for(
    let i=0;
    i<data.length;
    i+=4
  ){

    const r=data[i];
    const g=data[i+1];
    const b=data[i+2];

    /*
      Standard grayscale.
    */

    const gray=
      Math.round(
        0.299*r+
        0.587*g+
        0.114*b
      );

    data[i]=gray;
    data[i+1]=gray;
    data[i+2]=gray;
  }

  ctx.putImageData(
    imageData,
    0,
    0
  );

  /*
    Tesseract is much better when we tell it
    that this is a single line containing
    numbers + K/M/B.
  */

  const w=await getOcrWorker();

  await w.setParameters({

    tessedit_pageseg_mode:'7',

    tessedit_char_whitelist:
      '0123456789.KMB',

    preserve_interword_spaces:'0'

  });

  const r=await w.recognize(crop);

  const text=String(
    r.data.text||''
  )
    .replace(/\s+/g,'')
    .trim();

  /*
    Restore the normal OCR settings afterwards.
  */

  await w.setParameters({

    tessedit_pageseg_mode:'6',

    tessedit_char_whitelist:'',

    preserve_interword_spaces:'0'

  });

  return{
    text,
    power:parsePower(text),
    confidence:Number(
      r.data.confidence||0
    )
  };
}


/*
  Find the closest OCR word to a row.

  This is used as a fallback when the normal
  name detector cannot find a good candidate.
*/
function fallbackNameForRow(words,cy){

  let best=null;

  for(const w of words){

    const text=String(w.text||'').trim();

    if(!text)
      continue;

    const x=Number(w.bbox?.x0||0);
    const y=Number(w.bbox?.y0||0);
    const h=
      Number(w.bbox?.y1||0)-y;

    if(x<145 || x>390)
      continue;

    if(y<cy-75 || y>cy+15)
      continue;

    if(
      /expert|rank|power|this|week|total/i
        .test(text)
    ){
      continue;
    }

    if(/^[\d.,]+[KMB]?$/i.test(text))
      continue;

    const distance=
      Math.abs(
        (y+h/2)-(cy-20)
      );

    const score=
      distance-
      Number(w.conf||0)*0.02;

    if(!best || score<best.score){

      best={
        text:cleanOcrName(text),
        score
      };

    }
  }

  return best?.text||'';
}


/*
  OCR the entire screenshot.

  This is much more reliable than asking OCR
  to interpret every row independently.
*/
async function ocrWholeScreenshot(canvas){

  const w=await getOcrWorker();

  /*
    Whole screenshot OCR works surprisingly well
    for the names because Tesseract gets the surrounding
    visual context.
  */

  await w.setParameters({

    tessedit_pageseg_mode:'6',

    tessedit_char_whitelist:'',

    preserve_interword_spaces:'0'

  });

  const r=await w.recognize(canvas);

  return{
    text:String(r.data.text||''),
    confidence:Number(
      r.data.confidence||0
    ),
    words:r.data.words||[]
  };
}


/*
  Main screenshot processor.
*/
async function processScreenshot(
  file,
  index,
  total
){

  const img=await new Promise(
    (resolve,reject)=>{

      const u=
        URL.createObjectURL(file);

      const im=new Image();

      im.onload=()=>{

        URL.revokeObjectURL(u);

        resolve(im);

      };

      im.onerror=()=>{

        URL.revokeObjectURL(u);

        reject(
          Error(
            'Could not read image'
          )
        );

      };

      im.src=u;

    }
  );


  /*
    Copy image into canvas.
  */

  const c=
    document.createElement('canvas');

  c.width=
    img.naturalWidth ||
    img.width;

  c.height=
    img.naturalHeight ||
    img.height;

  c.getContext('2d')
    .drawImage(
      img,
      0,
      0
    );


  /*
    -------------------------------------------------------
    STEP 1
    OCR whole screenshot
    -------------------------------------------------------
  */

  e.ocrProgress.textContent=
    `Screenshot ${index}/${total}: reading player names…`;

  const fullOcr=
    await ocrWholeScreenshot(c);


  /*
    -------------------------------------------------------
    STEP 2
    Find Power header
    -------------------------------------------------------
  */

  e.ocrProgress.textContent=
    `Screenshot ${index}/${total}: locating player rows…`;

  const header=
    await findPowerHeader(c);


  /*
    -------------------------------------------------------
    STEP 3
    Find class icon column
    -------------------------------------------------------
  */

  const iconX=
    findIconX(
      c,
      header.x,
      header.bottom
    );


  /*
    -------------------------------------------------------
    STEP 4
    Find player rows
    -------------------------------------------------------
  */

  const rowYs=
    findClassRows(
      c,
      iconX,
      header.bottom
    );


  const out=[];


  /*
    -------------------------------------------------------
    STEP 5
    Process each row
    -------------------------------------------------------
  */

  for(
    let i=0;
    i<rowYs.length;
    i++
  ){

    const cy=rowYs[i];

    e.ocrProgress.textContent=
      `Screenshot ${index}/${total}: `+
      `reading player ${i+1}/${rowYs.length}…`;


    /*
      ---------------------------------------------------
      CLASS
      ---------------------------------------------------
    */

    const cls=
      classifyIcon(
        c,
        iconX,
        cy
      );

    if(!cls.class)
      continue;


    /*
      ---------------------------------------------------
      NAME
      ---------------------------------------------------
    */

    let name=
      findNameForRow(
        fullOcr.words,
        cy
      );

    /*
      Fallback if the normal detector fails.
    */

    if(!name){

      name=
        fallbackNameForRow(
          fullOcr.words,
          cy
        );

    }


    if(!name)
      continue;


    /*
      ---------------------------------------------------
      POWER
      ---------------------------------------------------

      We now OCR ONLY the power number.

      This avoids the crossed-swords icon confusing
      Tesseract.
    */

    const powerResult=
      await readPowerForRow(
        c,
        cy
      );

    if(
      !powerResult ||
      powerResult.power===null
    ){

      /*
        This is probably the partially visible
        player at the bottom of the screenshot.
      */

      continue;
    }


    /*
      ---------------------------------------------------
      MATCH AGAINST EXISTING ROSTER
      ---------------------------------------------------
    */

    const match=
      findMatch(name);


    /*
      ---------------------------------------------------
      CONFIDENCE
      ---------------------------------------------------
    */

    const nameConfidence=
      (()=>{

        const candidate=
          fullOcr.words.find(w=>
            cleanOcrName(w.text)===name
          );

        return Number(
          candidate?.conf||0
        );

      })();


    const confidence=
      Math.round(
        (
          (nameConfidence/100)*.40 +
          (powerResult.confidence/100)*.35 +
          cls.confidence*.25
        )*100
      );


    out.push({

      name,

      class:cls.class,

      power:powerResult.power,

      matchId:
        match?.member.id || '',

      matchScore:
        match?.score || 0,

      confidence,

      source:file.name,

      ocr:
        `${name} ${powerResult.text}`

    });

  }


  return out;
}

/* =========================================================
   MERGE DUPLICATE SCREENSHOT RESULTS
========================================================= */

function mergeDetected(rows){

  const map=new Map();

  for(const r of rows){

    const key=
      r.matchId
        ? `id:${r.matchId}`
        : `name:${normalizeName(r.name)}`;

    if(!key.split(':')[1])
      continue;

    const old=map.get(key);

    if(
      !old ||
      r.confidence>old.confidence
    ){

      map.set(
        key,
        r
      );
    }
  }

  return[
    ...map.values()
  ].sort(
    (a,b)=>
      a.name.localeCompare(b.name)
  );
}


/* =========================================================
   RENDER OCR REVIEW
========================================================= */

function renderOcrResults(){

  if(!pendingRows.length){

    e.ocrResults.innerHTML=
      '<div class="muted">'+
      'No complete player rows were detected.'+
      '</div>';

    e.ocrSummary.textContent=
      'No players detected.';

    e.applyScreenshots.disabled=true;

    return;
  }

  const seenIds=
    new Set(
      pendingRows
        .filter(r=>r.matchId)
        .map(r=>r.matchId)
    );

  const missing=
    state.members.filter(
      m=>!seenIds.has(m.id)
    );

  e.ocrSummary.innerHTML=

    `<b>${pendingRows.length}</b> unique players detected. `+

    (
      missing.length

        ? `<b>${missing.length}</b> existing players were not detected; `+
          `they will <u>not</u> be deleted.`

        : 'All existing players were detected.'
    );


  e.ocrResults.innerHTML=

    `<div class="tablewrap">

      <table>

        <thead>

          <tr>

            <th>Use</th>
            <th>Name</th>
            <th>Class</th>
            <th>Power</th>
            <th>Match</th>
            <th>Confidence</th>

          </tr>

        </thead>

        <tbody>

          ${pendingRows.map(
            (r,i)=>`

              <tr>

                <td>

                  <input
                    type="checkbox"
                    data-ocr-use="${i}"
                    checked
                  >

                </td>

                <td>

                  <input
                    data-ocr-name="${i}"
                    value="${esc(r.name)}"
                  >

                </td>

                <td>

                  <select
                    data-ocr-class="${i}"
                  >

                    ${CLASSES.map(
                      c=>
                        `<option
                          ${c===r.class?'selected':''}
                        >
                          ${c}
                        </option>`
                    ).join('')}

                  </select>

                </td>

                <td>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    data-ocr-power="${i}"
                    value="${r.power}"
                  >

                </td>

                <td>

                  ${
                    r.matchId

                      ? `Existing${
                          r.matchScore<1
                            ? ' (possible match)'
                            : ''
                        }`

                      : 'New player'
                  }

                </td>

                <td>
                  ${r.confidence}%
                </td>

              </tr>

            `
          ).join('')}

        </tbody>

      </table>

    </div>`

    +

    (
      missing.length

        ? `<details style="margin-top:10px">

            <summary>
              Not detected (${missing.length})
              — not removed
            </summary>

            <div
              class="muted"
              style="margin-top:8px"
            >
              ${
                missing
                  .map(m=>esc(m.name))
                  .join(', ')
              }
            </div>

          </details>`

        : ''
    );

  e.applyScreenshots.disabled=false;
}


/* =========================================================
   START SCREENSHOT PROCESSING
========================================================= */

async function runScreenshotImport(){

  // SECURITY CHECK:
  // This function itself also checks Master mode.
  if(!master)
    return;

  if(ocrBusy)
    return;

  if(!e.screenshotFiles.files.length){

    alert(
      'Please select one or more screenshots first.'
    );

    return;
  }

  if(e.screenshotFiles.files.length>10){

    alert(
      'Please upload no more than 10 screenshots at once.'
    );

    return;
  }

  ocrBusy=true;

  e.applyScreenshots.disabled=true;
  e.clearScreenshots.disabled=true;

  pendingRows=[];

  e.ocrResults.innerHTML='';

  e.ocrSummary.textContent=
    'Starting…';

  try{

    const all=[];

    const files=[
      ...e.screenshotFiles.files
    ];

    for(
      let i=0;
      i<files.length;
      i++
    ){

      const rows=
        await processScreenshot(
          files[i],
          i+1,
          files.length
        );

      all.push(...rows);
    }

    pendingRows=
      mergeDetected(all);

    renderOcrResults();

    e.ocrProgress.textContent=
      `Finished. Detected `+
      `${pendingRows.length} unique complete players.`;

    if(!pendingRows.length){

      alert(
        'I could not detect any complete player rows. '+
        'Make sure the screenshots show the normal '+
        'Guildmates → Power layout.'
      );
    }

  }catch(err){

    console.error(err);

    e.ocrProgress.textContent=
      'OCR failed.';

    alert(
      `Screenshot processing failed.\n\n`+
      `${err.message||err}`
    );

  }finally{

    ocrBusy=false;

    e.clearScreenshots.disabled=false;
  }
}


/* =========================================================
   COLLECT REVIEWED OCR DATA
========================================================= */

function collectOcrRows(){

  return pendingRows

    .map((r,i)=>{

      const use=
        document.querySelector(
          `[data-ocr-use="${i}"]`
        );

      if(
        !use ||
        !use.checked
      )
        return null;

      const name=
        document.querySelector(
          `[data-ocr-name="${i}"]`
        )?.value.trim();

      const cls=
        document.querySelector(
          `[data-ocr-class="${i}"]`
        )?.value;

      const p=
        Number(
          document.querySelector(
            `[data-ocr-power="${i}"]`
          )?.value
        );

      if(
        !name ||
        !CLASSES.includes(cls) ||
        !Number.isFinite(p) ||
        p<0
      ){

        return null;
      }

      return{
        name,
        class:cls,
        power:p
      };

    })

    .filter(Boolean);
}


/* =========================================================
   APPLY SCREENSHOT CHANGES
========================================================= */

function applyScreenshotChanges(){

  if(!master)
    return;

  const rows=
    collectOcrRows();

  if(!rows.length){

    alert(
      'There are no valid checked rows to apply.'
    );

    return;
  }

  let updated=0;
  let added=0;

  for(const r of rows){

    /*
      First try exact name.
    */

    let match=
      state.members.find(
        m=>
          normalizeName(m.name)===
          normalizeName(r.name)
      );


    /*
      If there isn't an exact match,
      only use a fuzzy suggestion when
      the similarity is VERY high.
    */

    if(!match){

      const suggestion=
        findMatch(r.name);

      if(
        suggestion &&
        suggestion.score>=.88
      ){

        match=
          suggestion.member;
      }
    }


    if(match){

      const changed=

        match.name!==r.name ||
        match.class!==r.class ||
        Number(match.power)!==r.power;

      Object.assign(
        match,
        {
          name:r.name,
          class:r.class,
          power:r.power
        }
      );

      if(changed)
        updated++;

    }else{

      state.members.push({

        id:uid(),

        name:r.name,

        class:r.class,

        power:r.power,

        notes:''

      });

      added++;
    }
  }


  /*
    Rebuild teams after the roster changes.
  */

  state.teams=
    gen(state.members);

  save();

  render();

  e.screenshotDialog.close();

  alert(

    `Roster updated.\n\n`+

    `${updated} existing players updated\n`+

    `${added} new players added\n\n`+

    `Players not detected were left unchanged.`

  );

  pendingRows=[];

  e.screenshotFiles.value='';
}


/* =========================================================
   SCREENSHOT BUTTON
========================================================= */

e.screenshotBtn.onclick=()=>{

  // MASTER ONLY
  if(!master)
    return;

  e.screenshotFiles.value='';

  e.ocrProgress.textContent=
    'Choose your screenshots, then click Process Screenshots.';

  e.ocrSummary.textContent='';

  e.ocrResults.innerHTML='';

  e.applyScreenshots.disabled=true;

  e.screenshotDialog.showModal();
};

e.screenshotFiles.onchange=()=>{

  if(
    e.screenshotFiles.files.length
  ){

    e.ocrSummary.textContent=

      `${e.screenshotFiles.files.length} screenshot`+

      (
        e.screenshotFiles.files.length===1
          ? ''
          : 's'
      )+

      ' selected.';
  }
};

e.clearScreenshots.onclick=()=>{

  if(ocrBusy)
    return;

  e.screenshotFiles.value='';

  pendingRows=[];

  e.ocrResults.innerHTML='';

  e.ocrSummary.textContent='';

  e.ocrProgress.textContent=
    'Choose your screenshots, then click Process Screenshots.';

  e.applyScreenshots.disabled=true;
};

e.applyScreenshots.onclick=
  applyScreenshotChanges;

document
  .querySelectorAll('[data-process-screenshots]')
  .forEach(
    b=>
      b.onclick=
        runScreenshotImport
  );


/* =========================================================
   GENERAL UI
========================================================= */

document
  .querySelectorAll('[data-close]')
  .forEach(
    b=>
      b.onclick=
        ()=>$(b.dataset.close).close()
  );

[e.search,e.classFilter,e.sort]
  .forEach(
    x=>
      x.addEventListener(
        'input',
        roster
      )
  );


/* =========================================================
   START
========================================================= */

render();

loadFromGitHub(true);

})();
