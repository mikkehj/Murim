(() => {
  "use strict";

  const STORAGE_KEY = "sxs_guild_planner_v4";
  const SESSION_KEY = "sxs_guild_master_v4";
  const CLASSES = ["Berserker", "Paladin", "Archmage", "Arcanist"];
  const CREDENTIALS = { username: "Mika", password: "EvilEnvy" };

  let state = loadState();
  let master = sessionStorage.getItem(SESSION_KEY) === "true";
  let pendingDeleteId = null;

  const $ = id => document.getElementById(id);
  const els = {
    loginBtn: $("loginBtn"), logoutBtn: $("logoutBtn"), exportBtn: $("exportBtn"),
    importBtn: $("importBtn"), importFile: $("importFile"), status: $("statusBanner"),
    memberCount: $("memberCount"), totalPower: $("totalPower"), averagePower: $("averagePower"),
    unassignedCount: $("unassignedCount"), rosterBody: $("rosterBody"), emptyRoster: $("emptyRoster"),
    addMemberBtn: $("addMemberBtn"), generateBtn: $("generateBtn"), teams: $("teams"), noTeams: $("noTeams"),
    searchInput: $("searchInput"), classFilter: $("classFilter"), sortSelect: $("sortSelect"),
    loginDialog: $("loginDialog"), loginForm: $("loginForm"), username: $("username"), password: $("password"),
    loginError: $("loginError"), memberDialog: $("memberDialog"), memberForm: $("memberForm"),
    memberDialogTitle: $("memberDialogTitle"), memberId: $("memberId"), memberName: $("memberName"),
    memberClass: $("memberClass"), memberPower: $("memberPower"), memberNotes: $("memberNotes"),
    confirmDialog: $("confirmDialog"), confirmText: $("confirmText"), confirmDelete: $("confirmDelete")
  };

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && Array.isArray(parsed.members)) return { members: parsed.members, teams: Array.isArray(parsed.teams) ? parsed.teams : [] };
    } catch (_) {}
    return { members: [], teams: [] };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function fmtPower(n) { return Number(n || 0).toLocaleString("en-US"); }

  function generateTeams(members) {
    const byClass = Object.fromEntries(CLASSES.map(c => [c, []]));
    members.forEach(m => { if (byClass[m.class]) byClass[m.class].push(m); });
    CLASSES.forEach(c => byClass[c].sort((a,b) => Number(b.power) - Number(a.power) || a.name.localeCompare(b.name)));

    const max = Math.min(15, Math.max(0, ...CLASSES.map(c => byClass[c].length)));
    const teams = [];
    for (let i = 0; i < max; i++) {
      const players = CLASSES.map(c => byClass[c][i]).filter(Boolean);
      teams.push({
        number: i + 1,
        playerIds: players.map(p => p.id),
        totalPower: players.reduce((s,p) => s + Number(p.power), 0)
      });
    }
    return teams;
  }

  function getTeamMap() {
    const map = new Map();
    state.teams.forEach(t => (t.playerIds || []).forEach(id => map.set(id, t.number)));
    return map;
  }

  function render() {
    renderAuth();
    renderStats();
    renderRoster();
    renderTeams();
  }

  function renderAuth() {
    els.loginBtn.hidden = master;
    els.logoutBtn.hidden = !master;
    els.exportBtn.hidden = !master;
    els.importBtn.hidden = !master;
    els.addMemberBtn.hidden = !master;
    els.generateBtn.hidden = !master;
    els.status.className = "status " + (master ? "master" : "viewer");
    els.status.textContent = master
      ? "Master mode — you can edit the roster, generate teams, and import/export data."
      : "Viewer mode — roster and teams are read-only.";
    document.querySelectorAll(".master-col").forEach(e => e.style.display = master ? "" : "none");
    document.querySelectorAll("td.actions-cell").forEach(e => e.style.display = master ? "" : "none");
  }

  function renderStats() {
    const total = state.members.reduce((s,m) => s + Number(m.power || 0), 0);
    const teamsAssigned = new Set(state.teams.flatMap(t => t.playerIds || []));
    els.memberCount.textContent = state.members.length;
    els.totalPower.textContent = fmtPower(total);
    els.averagePower.textContent = state.members.length ? fmtPower(Math.round(total / state.members.length)) : "0";
    els.unassignedCount.textContent = state.members.filter(m => !teamsAssigned.has(m.id)).length;
  }

  function renderRoster() {
    const q = els.searchInput.value.trim().toLowerCase();
    const cf = els.classFilter.value;
    const sort = els.sortSelect.value;
    const teamMap = getTeamMap();
    let rows = state.members.filter(m => (!q || m.name.toLowerCase().includes(q)) && (!cf || m.class === cf));

    rows.sort((a,b) => {
      if (sort === "power-desc") return Number(b.power) - Number(a.power) || a.name.localeCompare(b.name);
      if (sort === "power-asc") return Number(a.power) - Number(b.power) || a.name.localeCompare(b.name);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "class") return a.class.localeCompare(b.class) || a.name.localeCompare(b.name);
      const ta = teamMap.get(a.id) || Infinity, tb = teamMap.get(b.id) || Infinity;
      return ta - tb || a.name.localeCompare(b.name);
    });

    els.rosterBody.innerHTML = rows.map(m => {
      const team = teamMap.get(m.id);
      return `<tr>
        <td><strong>${esc(m.name)}</strong>${m.notes ? `<div class="muted">${esc(m.notes)}</div>` : ""}</td>
        <td><span class="badge">${esc(m.class)}</span></td>
        <td>${fmtPower(m.power)}</td>
        <td>${team ? `<span class="badge team-badge">Team ${team}</span>` : '<span class="muted">Unassigned</span>'}</td>
        <td class="actions-cell" style="${master ? "" : "display:none"}"><div class="actions">
          <button class="btn mini" data-edit="${m.id}">Edit</button>
          <button class="btn mini danger" data-delete="${m.id}">Delete</button>
        </div></td>
      </tr>`;
    }).join("");
    els.emptyRoster.hidden = rows.length !== 0;
  }

  function renderTeams() {
    els.noTeams.hidden = state.teams.length !== 0;
    els.teams.innerHTML = state.teams.map(t => {
      const players = (t.playerIds || []).map(id => state.members.find(m => m.id === id)).filter(Boolean);
      const present = new Set(players.map(p => p.class));
      const missing = CLASSES.filter(c => !present.has(c));
      return `<article class="team-card">
        <div class="team-top"><h3>Team ${t.number}</h3><span class="team-power">${fmtPower(players.reduce((s,p)=>s+Number(p.power),0))}</span></div>
        <div class="team-meta"><span>${players.length}/4 players</span>${CLASSES.filter(c=>present.has(c)).map(c=>`<span class="badge">${c}</span>`).join("")}</div>
        <ul class="players">${players.map(p => `<li><div class="player-main"><strong>${esc(p.name)}</strong><small>${esc(p.class)}</small></div><strong>${fmtPower(p.power)}</strong></li>`).join("")}</ul>
        ${missing.length ? `<div class="missing">Missing: ${missing.join(", ")}</div>` : `<div class="all-present">All 4 classes present</div>`}
      </article>`;
    }).join("");
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
  }

  function openAdd() {
    els.memberForm.reset(); els.memberId.value = "";
    els.memberDialogTitle.textContent = "Add Member";
    els.memberDialog.showModal();
    els.memberName.focus();
  }

  function openEdit(id) {
    const m = state.members.find(x => x.id === id);
    if (!m) return;
    els.memberId.value = m.id; els.memberName.value = m.name; els.memberClass.value = m.class;
    els.memberPower.value = m.power; els.memberNotes.value = m.notes || "";
    els.memberDialogTitle.textContent = "Edit Member";
    els.memberDialog.showModal();
  }

  els.loginBtn.onclick = () => { els.loginError.hidden = true; els.loginForm.reset(); els.loginDialog.showModal(); els.username.focus(); };
  els.logoutBtn.onclick = () => { master = false; sessionStorage.removeItem(SESSION_KEY); render(); };
  els.addMemberBtn.onclick = openAdd;
  els.generateBtn.onclick = () => {
    state.teams = generateTeams(state.members);
    saveState(); render();
  };

  els.loginForm.addEventListener("submit", e => {
    e.preventDefault();
    if (els.username.value === CREDENTIALS.username && els.password.value === CREDENTIALS.password) {
      master = true; sessionStorage.setItem(SESSION_KEY, "true"); els.loginDialog.close(); render();
    } else els.loginError.hidden = false;
  });

  els.memberForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!master) return;
    const name = els.memberName.value.trim(), cls = els.memberClass.value;
    const power = Number(els.memberPower.value), notes = els.memberNotes.value.trim();
    if (!name || !CLASSES.includes(cls) || !Number.isFinite(power) || power < 0) return;
    const id = els.memberId.value;
    if (id) {
      const m = state.members.find(x => x.id === id);
      if (m) Object.assign(m, { name, class: cls, power, notes });
    } else state.members.push({ id: uid(), name, class: cls, power, notes });
    state.teams = []; saveState(); els.memberDialog.close(); render();
  });

  els.rosterBody.addEventListener("click", e => {
    const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]");
    if (edit) openEdit(edit.dataset.edit);
    if (del) {
      const m = state.members.find(x => x.id === del.dataset.delete);
      if (!m) return;
      pendingDeleteId = m.id; els.confirmText.textContent = `Delete "${m.name}" from the roster?`;
      els.confirmDialog.showModal();
    }
  });

  els.confirmDelete.onclick = e => {
    e.preventDefault();
    if (!master || !pendingDeleteId) return;
    state.members = state.members.filter(m => m.id !== pendingDeleteId);
    state.teams = state.teams.map(t => ({...t, playerIds: (t.playerIds || []).filter(id => id !== pendingDeleteId)})).filter(t => t.playerIds.length);
    pendingDeleteId = null; saveState(); els.confirmDialog.close(); render();
  };

  els.exportBtn.onclick = () => {
    const payload = { format: "sword-x-staff-guild-planner", version: 4, exportedAt: new Date().toISOString(), members: state.members, teams: state.teams };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sword-x-staff-roster.json"; a.click();
    URL.revokeObjectURL(a.href);
  };

  els.importBtn.onclick = () => els.importFile.click();
  els.importFile.onchange = async () => {
    const file = els.importFile.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.members)) throw new Error("Invalid roster");
      const members = data.members.map(m => ({
        id: String(m.id || uid()), name: String(m.name || "").trim(), class: m.class,
        power: Number(m.power), notes: String(m.notes || "")
      })).filter(m => m.name && CLASSES.includes(m.class) && Number.isFinite(m.power) && m.power >= 0);
      if (!confirm(`Import ${members.length} valid members? This replaces the current roster.`)) return;
      state = { members, teams: [] }; saveState(); render();
    } catch (_) { alert("Could not import this file. Please use a valid Guild Planner JSON export."); }
    els.importFile.value = "";
  };

  document.querySelectorAll("[data-close]").forEach(btn => btn.onclick = () => $(btn.dataset.close).close());
  [els.searchInput, els.classFilter, els.sortSelect].forEach(el => el.addEventListener("input", renderRoster));
  render();
})();
