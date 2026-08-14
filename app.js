const STORAGE_KEY="sxs-guild-planner-v2";
const classes=["Berserker","Paladin","Archmage","Arcanist"];
let members=load();

const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString("en-US");
const slug=s=>s.toLowerCase().replace(/\s+/g,"");
const icon=c=>({Berserker:"⚔",Paladin:"🛡",Archmage:"🔮",Arcanist:"✦"}[c]||"•");

function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{return[]}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(members));render()}
function power(v){return Number(String(v).replace(/[^\d]/g,""))||0}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2200)}

function teamOptions(selected=0){const n=+$("teamCount").value;return `<option value="0"${selected===0?" selected":""}>Unassigned</option>`+Array.from({length:n},(_,i)=>`<option value="${i+1}"${selected===i+1?" selected":""}>Team ${i+1}</option>`).join("")}

function stats(){
 const total=members.reduce((s,m)=>s+m.power,0);
 $("memberCount").textContent=members.length;$("totalPower").textContent=fmt(total);
 $("averagePower").textContent=fmt(members.length?Math.round(total/members.length):0);
 $("unassignedCount").textContent=members.filter(m=>!m.team).length;
}
function filtered(){
 const q=$("searchInput").value.trim().toLowerCase(),cf=$("classFilter").value,sort=$("sortSelect").value;
 let a=members.filter(m=>(!q||m.name.toLowerCase().includes(q))&&(cf==="all"||m.class===cf));
 a.sort((x,y)=>{
  if(sort==="power-desc")return y.power-x.power;if(sort==="power-asc")return x.power-y.power;
  if(sort==="name-asc")return x.name.localeCompare(y.name);if(sort==="name-desc")return y.name.localeCompare(x.name);
  if(sort==="class")return x.class.localeCompare(y.class)||y.power-x.power;
  return (x.team||999)-(y.team||999)||y.power-x.power;
 });return a;
}
function roster(){
 const body=$("rosterBody");body.innerHTML="";const list=filtered();
 $("emptyRoster").classList.toggle("hidden",list.length>0);
 list.forEach(m=>{
  const tr=document.createElement("tr");
  tr.innerHTML=`<td><strong>${esc(m.name)}</strong>${m.notes?`<div class="muted">${esc(m.notes)}</div>`:""}</td>
  <td><span class="class-pill ${slug(m.class)}">${icon(m.class)} ${m.class}</span></td><td><strong>${fmt(m.power)}</strong></td>
  <td><select class="team-select" data-id="${m.id}">${teamOptions(m.team||0)}</select></td>
  <td><div class="row-actions"><button class="small edit" data-id="${m.id}">Edit</button><button class="small danger delete" data-id="${m.id}">Delete</button></div></td>`;
  body.appendChild(tr);
 });
}

function buildStats(teams){
 const assigned=teams.flatMap(t=>t.members),avg=assigned.length?assigned.reduce((s,m)=>s+m.power,0)/teams.length:0;
 const powers=teams.map(t=>t.power),max=Math.max(0,...powers),min=powers.length?Math.min(...powers):0;
 const spread=avg?((max-min)/avg*100):0;
 const missing=teams.filter(t=>new Set(t.members.map(m=>m.class)).size<Math.min(4,assigned.length)).length;
 $("builderSummary").innerHTML=`<div class="summary-box"><span>Average team power</span><strong>${fmt(Math.round(avg))}</strong></div>
 <div class="summary-box"><span>Power spread</span><strong class="${spread<=5?"summary-good":"summary-warn"}">${spread.toFixed(1)}%</strong></div>
 <div class="summary-box"><span>Class-diversity check</span><strong class="${missing?"summary-warn":"summary-good"}">${missing?missing+" team(s) missing classes":"All teams diverse"}</strong></div>`;
}
function teams(){
 const n=+$("teamCount").value,wrap=$("teams");wrap.innerHTML="";
 const ts=Array.from({length:n},()=>({members:[],power:0,classes:new Set()}));
 members.filter(m=>m.team>0&&m.team<=n).forEach(m=>{const t=ts[m.team-1];t.members.push(m);t.power+=m.power;t.classes.add(m.class)});
 buildStats(ts);
 const avg=ts.reduce((s,t)=>s+t.power,0)/(n||1);
 ts.forEach((t,i)=>{
  const card=document.createElement("div");card.className="team-card "+(t.power>=avg*1.03?"best":t.power<=avg*.97?"weak":"");card.dataset.team=i+1;
  const missing=classes.filter(c=>!t.classes.has(c));
  card.innerHTML=`<div class="team-head"><strong>Team ${i+1}</strong><span class="team-power">${fmt(t.power)} power</span></div>
  <div class="team-meta">${t.members.length} member${t.members.length===1?"":"s"} · ${missing.length?`Missing: ${missing.map(c=>c).join(", ")}`:"✓ All classes"}</div>
  <div class="team-members">${t.members.sort((a,b)=>b.power-a.power).map(m=>`<div class="team-member" draggable="true" data-id="${m.id}"><div><div class="name">${icon(m.class)} ${esc(m.name)}</div><div class="power">${m.class} · ${fmt(m.power)}</div></div></div>`).join("")||'<div class="drop-hint">Drag a member here</div>'}</div>`;
  wrap.appendChild(card);
 });
 dnd();
}
function render(){stats();roster();teams()}

function openDialog(m){
 $("dialogTitle").textContent=m?"Edit member":"Add member";$("memberId").value=m?.id||"";
 $("memberName").value=m?.name||"";$("memberClass").value=m?.class||"Berserker";$("memberPower").value=m?fmt(m.power):"";
 $("memberTeam").innerHTML=teamOptions(m?.team||0);$("memberNotes").value=m?.notes||"";$("memberDialog").showModal();
}
$("addMemberBtn").onclick=()=>openDialog();$("closeDialog").onclick=()=>$("memberDialog").close();$("cancelDialog").onclick=()=>$("memberDialog").close();
$("searchInput").oninput=roster;$("classFilter").onchange=roster;$("sortSelect").onchange=roster;
$("teamCount").onchange=()=>{members.forEach(m=>{if(m.team>+$("teamCount").value)m.team=0});save()};

$("memberForm").onsubmit=e=>{
 e.preventDefault();const id=$("memberId").value||crypto.randomUUID();
 const data={id,name:$("memberName").value.trim(),class:$("memberClass").value,power:power($("memberPower").value),team:+$("memberTeam").value,notes:$("memberNotes").value.trim()};
 if(!data.name||!data.power){toast("Name and power are required");return}
 const i=members.findIndex(m=>m.id===id);if(i>=0)members[i]=data;else members.push(data);
 $("memberDialog").close();save();toast(i>=0?"Member updated":"Member added");
};
$("rosterBody").onclick=e=>{
 const id=e.target.dataset.id;
 if(e.target.classList.contains("edit"))openDialog(members.find(m=>m.id===id));
 if(e.target.classList.contains("delete")){const m=members.find(x=>x.id===id);if(confirm(`Delete ${m.name}?`)){members=members.filter(x=>x.id!==id);save();toast("Member deleted")}}
};
$("rosterBody").onchange=e=>{if(e.target.classList.contains("team-select")){const m=members.find(x=>x.id===e.target.dataset.id);if(m){m.team=+e.target.value;save()}}};

function autoBuild(){
 const n=+$("teamCount").value,mode=$("buildMode").value;
 if(!members.length){toast("Add members first");return}
 const ts=Array.from({length:n},()=>({members:[],power:0,classes:new Set()}));
 // Strongest-first greedy assignment. Scoring changes depending on selected mode.
 [...members].sort((a,b)=>b.power-a.power).forEach(m=>{
  let best=0,bestScore=Infinity;
  ts.forEach((t,i)=>{
   const powerScore=t.power;
   const duplicate=t.classes.has(m.class)?1:0;
   const count=t.members.length;
   let score;
   if(mode==="power") score=powerScore+count*0.00001;
   else if(mode==="composition") score=duplicate*1e9+count*1e6+powerScore;
   else score=powerScore+duplicate*300000+count*500;
   if(score<bestScore){bestScore=score;best=i}
  });
  ts[best].members.push(m);ts[best].power+=m.power;ts[best].classes.add(m.class);
 });
 ts.forEach((t,i)=>t.members.forEach(m=>m.team=i+1));save();toast("Teams rebuilt");
}
$("autoBuildBtn").onclick=autoBuild;

function dnd(){
 document.querySelectorAll(".team-member").forEach(el=>el.ondragstart=e=>e.dataTransfer.setData("text/plain",el.dataset.id));
 document.querySelectorAll(".team-card").forEach(card=>{
  card.ondragover=e=>e.preventDefault();
  card.ondrop=e=>{e.preventDefault();const m=members.find(x=>x.id===e.dataTransfer.getData("text/plain"));if(m){m.team=+card.dataset.team;save();toast(`${m.name} moved to Team ${m.team}`)}};
 });
}
$("exportBtn").onclick=()=>{
 const blob=new Blob([JSON.stringify({app:"Sword x Staff Guild Planner",version:2,exportedAt:new Date().toISOString(),members},null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="sword-x-staff-guild.json";a.click();URL.revokeObjectURL(a.href);toast("Roster exported");
};
$("importBtn").onclick=()=>$("importFile").click();
$("importFile").onchange=async e=>{
 try{const data=JSON.parse(await e.target.files[0].text()),arr=Array.isArray(data)?data:data.members;if(!Array.isArray(arr))throw Error();
 members=arr.map(m=>({id:m.id||crypto.randomUUID(),name:String(m.name||"Unnamed"),class:classes.includes(m.class)?m.class:"Berserker",power:power(m.power),team:+m.team||0,notes:String(m.notes||"")}));save();toast(`Imported ${members.length} members`)}
 catch{alert("Invalid Guild Planner JSON file.")}e.target.value="";
};
$("resetBtn").onclick=()=>{if(confirm("Delete the entire local roster? Export a backup first if needed.")){members=[];save();toast("Roster reset")}};
render();
