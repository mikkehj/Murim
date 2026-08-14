/**
 * Sword x Staff – Guild Planner v4
 * Static GitHub Pages compatible. No backend, no Firebase, no Supabase.
 * Data persisted in localStorage + JSON export/import for sharing.
 */

(function () {
  "use strict";

  // ─── Constants ───────────────────────────────────────────────
  const STORAGE_KEY = "sxs_guild_planner_v4";
  const MASTER_USER = "Mika";
  const MASTER_PASS = "EvilEnvy";
  const CLASSES = ["Berserker", "Paladin", "Archmage", "Arcanist"];
  const MAX_TEAMS = 15;

  // ─── State ───────────────────────────────────────────────────
  let state = {
    members: [],   // { id, name, class, power, notes, team }
    teams: [],     // array of team objects after generation
    isMaster: false,
    search: "",
    filterClass: "",
    sortBy: "power-desc",
  };

  let pendingDeleteId = null;

  // ─── DOM refs ────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    statusBanner: $("#status-banner"),
    statusText: $("#status-text"),
    btnLogin: $("#btn-login"),
    btnLogout: $("#btn-logout"),
    btnExport: $("#btn-export"),
    btnImport: $("#btn-import"),
    importFile: $("#import-file"),
    btnAdd: $("#btn-add"),
    btnGenerate: $("#btn-generate"),
    btnClearTeams: $("#btn-clear-teams"),
    searchInput: $("#search-input"),
    filterClass: $("#filter-class"),
    sortBy: $("#sort-by"),
    rosterBody: $("#roster-body"),
    rosterEmpty: $("#roster-empty"),
    teamsContainer: $("#teams-container"),
    teamsEmpty: $("#teams-empty"),
    // stats
    statMembers: $("#stat-members"),
    statTotalPower: $("#stat-total-power"),
    statAvgPower: $("#stat-avg-power"),
    statUnassigned: $("#stat-unassigned"),
    // modals
    loginModal: $("#login-modal"),
    loginForm: $("#login-form"),
    loginUser: $("#login-user"),
    loginPass: $("#login-pass"),
    loginError: $("#login-error"),
    loginCancel: $("#login-cancel"),
    memberModal: $("#member-modal"),
    memberModalTitle: $("#member-modal-title"),
    memberForm: $("#member-form"),
    memberId: $("#member-id"),
    memberName: $("#member-name"),
    memberClass: $("#member-class"),
    memberPower: $("#member-power"),
    memberNotes: $("#member-notes"),
    memberCancel: $("#member-cancel"),
    confirmModal: $("#confirm-modal"),
    confirmText: $("#confirm-text"),
    confirmCancel: $("#confirm-cancel"),
    confirmOk: $("#confirm-ok"),
  };

  // ─── Utilities ───────────────────────────────────────────────
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function formatPower(n) {
    if (n == null || isNaN(n)) return "0";
    return Number(n).toLocaleString("en-US");
  }

  function save() {
    try {
      const payload = {
        members: state.members,
        teams: state.teams,
        version: 4,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
      alert("Could not save data (localStorage full or blocked). Use Export to backup.");
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.members)) state.members = data.members;
      if (Array.isArray(data.teams)) state.teams = data.teams;
    } catch (e) {
      console.error("Failed to load from localStorage", e);
    }
  }

  // ─── Auth ────────────────────────────────────────────────────
  function setMaster(isMaster) {
    state.isMaster = isMaster;
    document.body.classList.toggle("is-master", isMaster);

    // Toggle master-only UI
    $$(".master-only").forEach((el) => {
      el.style.display = isMaster ? "" : "none";
    });
    $$(".master-only-col").forEach((el) => {
      el.style.display = isMaster ? "" : "none";
    });

    els.btnLogin.style.display = isMaster ? "none" : "";
    els.btnLogout.style.display = isMaster ? "" : "none";

    els.statusBanner.className = "status-banner " + (isMaster ? "master" : "viewer");
    els.statusText.textContent = isMaster
      ? "Master mode – you can edit roster & generate teams"
      : "Viewer mode – roster is read-only";

    render();
  }

  function openLogin() {
    els.loginError.hidden = true;
    els.loginUser.value = "";
    els.loginPass.value = "";
    els.loginModal.hidden = false;
    els.loginUser.focus();
  }

  function closeLogin() {
    els.loginModal.hidden = true;
  }

  function handleLogin(e) {
    e.preventDefault();
    const user = els.loginUser.value.trim();
    const pass = els.loginPass.value;
    if (user === MASTER_USER && pass === MASTER_PASS) {
      setMaster(true);
      closeLogin();
    } else {
      els.loginError.hidden = false;
    }
  }

  // ─── Member CRUD ─────────────────────────────────────────────
  function openAddMember() {
    els.memberModalTitle.textContent = "Add Member";
    els.memberId.value = "";
    els.memberName.value = "";
    els.memberClass.value = "";
    els.memberPower.value = "";
    els.memberNotes.value = "";
    els.memberModal.hidden = false;
    els.memberName.focus();
  }

  function openEditMember(id) {
    const m = state.members.find((x) => x.id === id);
    if (!m) return;
    els.memberModalTitle.textContent = "Edit Member";
    els.memberId.value = m.id;
    els.memberName.value = m.name;
    els.memberClass.value = m.class;
    els.memberPower.value = m.power;
    els.memberNotes.value = m.notes || "";
    els.memberModal.hidden = false;
    els.memberName.focus();
  }

  function closeMemberModal() {
    els.memberModal.hidden = true;
  }

  function handleMemberSave(e) {
    e.preventDefault();
    if (!state.isMaster) return;

    const id = els.memberId.value;
    const name = els.memberName.value.trim();
    const cls = els.memberClass.value;
    const power = parseInt(els.memberPower.value, 10);
    const notes = els.memberNotes.value.trim();

    if (!name || !cls || isNaN(power) || power < 0) {
      alert("Please fill name, class and a valid power (≥ 0).");
      return;
    }

    if (id) {
      // edit
      const m = state.members.find((x) => x.id === id);
      if (m) {
        m.name = name;
        m.class = cls;
        m.power = power;
        m.notes = notes;
        // keep team assignment
      }
    } else {
      // add
      state.members.push({
        id: uid(),
        name,
        class: cls,
        power,
        notes,
        team: null,
      });
    }

    // After any change that could affect ranking, clear teams so user re-generates
    // (optional – we keep existing team numbers if just editing power/name)
    save();
    closeMemberModal();
    render();
  }

  function requestDelete(id) {
    const m = state.members.find((x) => x.id === id);
    if (!m) return;
    pendingDeleteId = id;
    els.confirmText.textContent = `Delete “${m.name}” (${m.class})? This cannot be undone.`;
    els.confirmModal.hidden = false;
  }

  function confirmDelete() {
    if (!pendingDeleteId || !state.isMaster) return;
    state.members = state.members.filter((m) => m.id !== pendingDeleteId);
    // also remove from any team representation
    state.teams = [];
    pendingDeleteId = null;
    els.confirmModal.hidden = true;
    save();
    render();
  }

  function cancelDelete() {
    pendingDeleteId = null;
    els.confirmModal.hidden = true;
  }

  // ─── Team Generation (exact algorithm) ───────────────────────
  /**
   * 1. Separate by class
   * 2. Sort each class high → low power
   * 3. Team N gets the N-th player of each class (if exists)
   * Max 4 players per team, max 15 teams.
   */
  function generateTeams() {
    if (!state.isMaster) return;

    const byClass = {};
    CLASSES.forEach((c) => (byClass[c] = []));

    state.members.forEach((m) => {
      if (byClass[m.class]) byClass[m.class].push(m);
    });

    // Sort each class descending by power
    CLASSES.forEach((c) => {
      byClass[c].sort((a, b) => b.power - a.power);
    });

    const maxLen = Math.max(...CLASSES.map((c) => byClass[c].length), 0);
    const teamCount = Math.min(maxLen, MAX_TEAMS);

    // Clear previous team assignments
    state.members.forEach((m) => (m.team = null));

    const teams = [];
    for (let i = 0; i < teamCount; i++) {
      const players = [];
      CLASSES.forEach((c) => {
        if (byClass[c][i]) {
          const p = byClass[c][i];
          p.team = i + 1;
          players.push(p);
        }
      });

      const totalPower = players.reduce((s, p) => s + p.power, 0);
      const present = players.map((p) => p.class);
      const missing = CLASSES.filter((c) => !present.includes(c));

      teams.push({
        number: i + 1,
        players,
        totalPower,
        missing,
      });
    }

    state.teams = teams;
    save();
    render();
  }

  function clearTeams() {
    if (!state.isMaster) return;
    state.members.forEach((m) => (m.team = null));
    state.teams = [];
    save();
    render();
  }

  // ─── Filtering / Sorting ─────────────────────────────────────
  function getFilteredSortedMembers() {
    let list = [...state.members];

    // search
    const q = state.search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.notes && m.notes.toLowerCase().includes(q))
      );
    }

    // class filter
    if (state.filterClass) {
      list = list.filter((m) => m.class === state.filterClass);
    }

    // sort
    switch (state.sortBy) {
      case "power-desc":
        list.sort((a, b) => b.power - a.power || a.name.localeCompare(b.name));
        break;
      case "power-asc":
        list.sort((a, b) => a.power - b.power || a.name.localeCompare(b.name));
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "class":
        list.sort(
          (a, b) =>
            CLASSES.indexOf(a.class) - CLASSES.indexOf(b.class) ||
            b.power - a.power
        );
        break;
      case "team":
        list.sort((a, b) => {
          const ta = a.team == null ? 999 : a.team;
          const tb = b.team == null ? 999 : b.team;
          return ta - tb || b.power - a.power;
        });
        break;
    }
    return list;
  }

  // ─── Render ──────────────────────────────────────────────────
  function renderStats() {
    const members = state.members;
    const count = members.length;
    const total = members.reduce((s, m) => s + (m.power || 0), 0);
    const avg = count ? Math.round(total / count) : 0;
    const unassigned = members.filter((m) => m.team == null).length;

    els.statMembers.textContent = count;
    els.statTotalPower.textContent = formatPower(total);
    els.statAvgPower.textContent = formatPower(avg);
    els.statUnassigned.textContent = unassigned;
  }

  function renderRoster() {
    const list = getFilteredSortedMembers();
    els.rosterBody.innerHTML = "";

    if (state.members.length === 0) {
      els.rosterEmpty.style.display = "";
      els.rosterEmpty.textContent = state.isMaster
        ? "No members yet. Click “+ Add Member” to start."
        : "No members yet. Log in as master to add players.";
    } else if (list.length === 0) {
      els.rosterEmpty.style.display = "";
      els.rosterEmpty.textContent = "No members match the current filters.";
    } else {
      els.rosterEmpty.style.display = "none";
    }

    list.forEach((m) => {
      const tr = document.createElement("tr");

      const teamDisplay =
        m.team != null
          ? `<span class="team-cell">Team ${m.team}</span>`
          : `<span class="team-cell unassigned">—</span>`;

      let actions = "";
      if (state.isMaster) {
        actions = `
          <td class="actions-cell">
            <button class="btn btn-sm btn-secondary btn-edit" data-id="${m.id}">Edit</button>
            <button class="btn btn-sm btn-danger btn-delete" data-id="${m.id}">Del</button>
          </td>`;
      } else {
        actions = `<td class="master-only-col" style="display:none"></td>`;
      }

      tr.innerHTML = `
        <td>${escapeHtml(m.name)}</td>
        <td><span class="class-badge ${m.class}">${m.class}</span></td>
        <td class="power-cell">${formatPower(m.power)}</td>
        <td>${teamDisplay}</td>
        ${actions}
      `;
      els.rosterBody.appendChild(tr);
    });

    // Attach edit/delete listeners
    if (state.isMaster) {
      els.rosterBody.querySelectorAll(".btn-edit").forEach((btn) => {
        btn.addEventListener("click", () => openEditMember(btn.dataset.id));
      });
      els.rosterBody.querySelectorAll(".btn-delete").forEach((btn) => {
        btn.addEventListener("click", () => requestDelete(btn.dataset.id));
      });
    }
  }

  function renderTeams() {
    els.teamsContainer.innerHTML = "";

    if (!state.teams.length) {
      els.teamsEmpty.style.display = "";
      return;
    }
    els.teamsEmpty.style.display = "none";

    state.teams.forEach((t) => {
      const card = document.createElement("div");
      card.className = "team-card";

      const playersHtml = t.players
        .map(
          (p) => `
        <li>
          <span class="class-badge ${p.class}">${p.class.charAt(0)}</span>
          <span class="player-name">${escapeHtml(p.name)}</span>
          <span class="player-power">${formatPower(p.power)}</span>
        </li>`
        )
        .join("");

      let footer = "";
      if (t.missing.length) {
        footer = `<div class="team-missing">Missing: ${t.missing.join(", ")}</div>`;
      } else {
        footer = `<div class="team-complete">Full team (4 classes)</div>`;
      }

      card.innerHTML = `
        <div class="team-header">
          <span class="team-title">Team ${t.number}</span>
          <div class="team-meta">
            <span class="team-power">${formatPower(t.totalPower)}</span>
            <span>${t.players.length} player${t.players.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <ul class="team-players">${playersHtml}</ul>
        ${footer}
      `;
      els.teamsContainer.appendChild(card);
    });
  }

  function render() {
    renderStats();
    renderRoster();
    renderTeams();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Export / Import ─────────────────────────────────────────
  function exportJson() {
    const payload = {
      version: 4,
      exportedAt: new Date().toISOString(),
      members: state.members,
      teams: state.teams,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sxs-guild-roster-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file) {
    if (!state.isMaster) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data.members)) {
          alert("Invalid file: missing members array.");
          return;
        }
        // basic validation
        const cleaned = data.members.map((m) => ({
          id: m.id || uid(),
          name: String(m.name || "Unknown").slice(0, 40),
          class: CLASSES.includes(m.class) ? m.class : "Berserker",
          power: Math.max(0, parseInt(m.power, 10) || 0),
          notes: String(m.notes || "").slice(0, 200),
          team: m.team != null ? parseInt(m.team, 10) : null,
        }));
        state.members = cleaned;
        state.teams = Array.isArray(data.teams) ? data.teams : [];
        // re-validate team numbers against members
        if (state.teams.length) {
          // rebuild teams from member.team assignments if present
          // for simplicity we keep imported teams as-is or regenerate
        }
        save();
        render();
        alert(`Imported ${cleaned.length} members.`);
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  }

  // ─── Event wiring ────────────────────────────────────────────
  function bindEvents() {
    // Auth
    els.btnLogin.addEventListener("click", openLogin);
    els.btnLogout.addEventListener("click", () => setMaster(false));
    els.loginForm.addEventListener("submit", handleLogin);
    els.loginCancel.addEventListener("click", closeLogin);
    els.loginModal.querySelector(".modal-backdrop").addEventListener("click", closeLogin);

    // Member modal
    els.btnAdd.addEventListener("click", openAddMember);
    els.memberForm.addEventListener("submit", handleMemberSave);
    els.memberCancel.addEventListener("click", closeMemberModal);
    els.memberModal.querySelector(".modal-backdrop").addEventListener("click", closeMemberModal);

    // Confirm delete
    els.confirmOk.addEventListener("click", confirmDelete);
    els.confirmCancel.addEventListener("click", cancelDelete);
    els.confirmModal.querySelector(".modal-backdrop").addEventListener("click", cancelDelete);

    // Teams
    els.btnGenerate.addEventListener("click", generateTeams);
    els.btnClearTeams.addEventListener("click", clearTeams);

    // Search / filter / sort
    els.searchInput.addEventListener("input", () => {
      state.search = els.searchInput.value;
      renderRoster();
    });
    els.filterClass.addEventListener("change", () => {
      state.filterClass = els.filterClass.value;
      renderRoster();
    });
    els.sortBy.addEventListener("change", () => {
      state.sortBy = els.sortBy.value;
      renderRoster();
    });

    // Export / Import
    els.btnExport.addEventListener("click", exportJson);
    els.btnImport.addEventListener("click", () => els.importFile.click());
    els.importFile.addEventListener("change", () => {
      const file = els.importFile.files[0];
      if (file) {
        importJson(file);
        els.importFile.value = "";
      }
    });

    // Escape key closes modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeLogin();
        closeMemberModal();
        cancelDelete();
      }
    });
  }

  // ─── Init ────────────────────────────────────────────────────
  function init() {
    load();
    bindEvents();
    setMaster(false); // start in viewer mode
    render();
  }

  init();
})();
