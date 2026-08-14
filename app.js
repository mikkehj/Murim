const STORAGE_KEY = "sxs-guild-planner-v1";
const classes = ["Berserker", "Paladin", "Archmage", "Arcanist"];
let members = loadMembers();

const $ = id => document.getElementById(id);
const fmt = n => Number(n || 0).toLocaleString("en-US");
const slug = s => s.toLowerCase().replace(/\s+/g, "");
const classIcon = c => ({Berserker:"⚔", Paladin:"🛡", Archmage:"🔮", Arcanist:"✦"}[c] || "•");

function loadMembers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  render();
}
function powerValue(v) {
  return Number(String(v).replace(/[^\d]/g, "")) || 0;
}
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove("show"), 2200);
}

function renderStats() {
  const total = members.reduce((s,m)=>s+m.power,0);
  $("memberCount").textContent = members.length;
  $("totalPower").textContent = fmt(total);
  $("averagePower").textContent = fmt(members.length ? Math.round(total/members.length) : 0);
  $("unassignedCount").textContent = members.filter(m=>!m.team).length;
}
function filteredMembers() {
  const q = $("searchInput").value.trim().toLowerCase();
  const cf = $("classFilter").value;
  const sort = $("sortSelect").value;
  let a = members.filter(m => (!q || m.name.toLowerCase().includes(q)) && (cf==="all" || m.class===cf));
  a.sort((x,y)=>{
    if(sort==="power-desc") return y.power-x.power;
    if(sort==="power-asc") return x.power-y.power;
    if(sort==="name-asc") return x.name.localeCompare(y.name);
    if(sort==="name-desc") return y.name.localeCompare(x.name);
    if(sort==="class") return x.class.localeCompare(y.class) || y.power-x.power;
    return (x.team||999)-(y.team||999) || y.power-x.power;
  });
  return a;
}
function teamOptions(selected=0) {
  const n = Number($("teamCount").value);
  return `<option value="0"${selected===0?" selected":""}>Unassigned</option>` +
    Array.from({length:n},(_,i)=>`<option value="${i+1}"${selected===i+1?" selected":""}>Team ${i+1}</option>`).join("");
}
function renderRoster() {
  const body = $("rosterBody"); body.innerHTML = "";
  const list = filteredMembers();
  $("emptyRoster").classList.toggle("hidden", list.length > 0);
  list.forEach(m=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td><strong>${escapeHtml(m.name)}</strong>${m.notes?`<div class="muted">${escapeHtml(m.notes)}</div>`:""}</td>
      <td><span class="class-pill ${slug(m.class)}">${classIcon(m.class)} ${m.class}</span></td>
      <td><strong>${fmt(m.power)}</strong></td>
      <td><select class="team-select" data-id="${m.id}">${teamOptions(m.team||0)}</select></td>
      <td><div class="row-actions"><button class="small edit" data-id="${m.id}">Edit</button><button class="small danger delete" data-id="${m.id}">Delete</button></div></td>`;
    body.appendChild(tr);
  });
}
function renderTeams() {
  const n=Number($("teamCount").value), wrap=$("teams"); wrap.innerHTML="";
  for(let i=1;i<=n;i++){
    const ms=members.filter(m=>m.team===i).sort((a,b)=>b.power-a.power);
    const total=ms.reduce((s,m)=>s+m.power,0);
    const card=document.createElement("div"); card.className="team-card"; card.dataset.team=i;
    card.innerHTML=`<div class="team-head"><strong>Team ${i}</strong><span class="team-power">${fmt(total)} power</span></div><div class="team-members">${ms.length?ms.map(m=>`
      <div class="team-member" draggable="true" data-id="${m.id}">
        <div><div class="name">${classIcon(m.class)} ${escapeHtml(m.name)}</div><div class="power">${m.class} · ${fmt(m.power)}</div></div>
      </div>`).join(""):`<div class="drop-hint">Drag a member here</div>`}</div>`;
    wrap.appendChild(card);
  }
  setupDnD();
}
function render(){ renderStats(); renderRoster(); renderTeams(); }

function openDialog(member=null) {
  $("dialogTitle").textContent = member ? "Edit member" : "Add member";
  $("memberId").value = member?.id || "";
  $("memberName").value = member?.name || "";
  $("memberClass").value = member?.class || "Berserker";
  $("memberPower").value = member ? fmt(member.power) : "";
  $("memberTeam").innerHTML = teamOptions(member?.team||0);
  $("memberNotes").value = member?.notes || "";
  $("memberDialog").showModal();
}
function closeDialog(){ $("memberDialog").close(); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

$("addMemberBtn").onclick=()=>openDialog();
$("closeDialog").onclick=closeDialog;
$("cancelDialog").onclick=closeDialog;
$("searchInput").oninput=renderRoster;
$("classFilter").onchange=renderRoster;
$("sortSelect").onchange=renderRoster;
$("teamCount").onchange=()=>{ members.forEach(m=>{if(m.team>Number($("teamCount").value))m.team=0}); save(); };

$("memberForm").onsubmit=e=>{
  e.preventDefault();
  const id=$("memberId").value || crypto.randomUUID();
  const data={id,name:$("memberName").value.trim(),class:$("memberClass").value,power:powerValue($("memberPower").value),team:Number($("memberTeam").value),notes:$("memberNotes").value.trim()};
  if(!data.name){toast("Player name is required");return;}
  if(!data.power){toast("Enter a power value");return;}
  const idx=members.findIndex(m=>m.id===id);
  if(idx>=0) members[idx]=data; else members.push(data);
  closeDialog(); save(); toast(idx>=0?"Member updated":"Member added");
};

$("rosterBody").onclick=e=>{
  const id=e.target.dataset.id;
  if(e.target.classList.contains("edit")) openDialog(members.find(m=>m.id===id));
  if(e.target.classList.contains("delete")){
    const m=members.find(m=>m.id===id);
    if(confirm(`Delete ${m.name}?`)){members=members.filter(x=>x.id!==id);save();toast("Member deleted");}
  }
};
$("rosterBody").onchange=e=>{
  if(e.target.classList.contains("team-select")){
    const m=members.find(x=>x.id===e.target.dataset.id); if(m){m.team=Number(e.target.value);save();}
  }
};

$("autoBuildBtn").onclick=()=>{
  const n=Number($("teamCount").value);
  if(!members.length){toast("Add members first");return;}
  // Greedy balancing: strongest first, assigning to the lowest-power team,
  // while lightly rewarding class diversity.
  const teams=Array.from({length:n},()=>({members:[],power:0,classes:new Set()}));
  [...members].sort((a,b)=>b.power-a.power).forEach(m=>{
    let candidates=teams.map((t,i)=>({t,i}))
      .sort((a,b)=> (a.t.power-b.t.power) || (a.t.classes.has(m.class)?1:0)-(b.t.classes.has(m.class)?1:0));
    const chosen=candidates[0].t;
    chosen.members.push(m); chosen.power+=m.power; chosen.classes.add(m.class);
  });
  teams.forEach((t,i)=>t.members.forEach(m=>m.team=i+1));
  save(); toast("Teams rebuilt");
};

function setupDnD(){
  document.querySelectorAll(".team-member").forEach(el=>{
    el.ondragstart=e=>e.dataTransfer.setData("text/plain",el.dataset.id);
  });
  document.querySelectorAll(".team-card").forEach(card=>{
    card.ondragover=e=>{e.preventDefault();};
    card.ondrop=e=>{
      e.preventDefault();
      const id=e.dataTransfer.getData("text/plain"), m=members.find(x=>x.id===id);
      if(m){m.team=Number(card.dataset.team);save();toast(`${m.name} moved to Team ${m.team}`);}
    };
  });
}

$("exportBtn").onclick=()=>{
  const payload={app:"Sword x Staff Guild Planner",version:1,exportedAt:new Date().toISOString(),members};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="sword-x-staff-guild.json"; a.click();
  URL.revokeObjectURL(a.href); toast("Roster exported");
};
$("importBtn").onclick=()=>$("importFile").click();
$("importFile").onchange=async e=>{
  const file=e.target.files[0]; if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    const imported=Array.isArray(data)?data:data.members;
    if(!Array.isArray(imported))throw Error();
    members=imported.map(m=>({id:m.id||crypto.randomUUID(),name:String(m.name||"Unnamed"),class:classes.includes(m.class)?m.class:"Berserker",power:powerValue(m.power),team:Number(m.team)||0,notes:String(m.notes||"")}));
    save(); toast(`Imported ${members.length} members`);
  }catch{alert("That file does not look like a valid Guild Planner export.");}
  e.target.value="";
};
$("resetBtn").onclick=()=>{
  if(confirm("Delete the entire local roster? Export a backup first if needed.")){
    members=[]; save(); toast("Roster reset");
  }
};

render();
