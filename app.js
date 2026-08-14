// STATE CONTROLLER MANAGER
const STATE = {
    authMode: 'viewer', // 'viewer' | 'master'
    roster: [],
    teams: []
};

// INITIAL DEFAULTS (Preloaded if localStorage empty)
const DEFAULT_ROSTER = [
    { id: "1", name: "Arthur", class: "Berserker", power: 2000000, notes: "Main frontline core" },
    { id: "2", name: "Galahad", class: "Berserker", power: 1800000, notes: "" },
    { id: "3", name: "Lancelot", class: "Berserker", power: 1500000, notes: "" },
    { id: "4", name: "Boudica", class: "Paladin", power: 1900000, notes: "Main tank lead" },
    { id: "5", name: "Joan", class: "Paladin", power: 1700000, notes: "" },
    { id: "6", name: "Leonidas", class: "Paladin", power: 1300000, notes: "" },
    { id: "7", name: "Merlin", class: "Archmage", power: 2100000, notes: "Burst damage anchor" },
    { id: "8", name: "Morgana", class: "Archmage", power: 1600000, notes: "" },
    { id: "9", name: "Circe", class: "Archmage", power: 1400000, notes: "" },
    { id: "10", name: "Hermes", class: "Arcanist", power: 1800000, notes: "Core support buffers" },
    { id: "11", name: "Hecate", class: "Arcanist", power: 1500000, notes: "" },
    { id: "12", name: "Thoth", class: "Arcanist", power: 1200000, notes: "" }
];

// CACHE SELECTOR NODES
const bodyEl = document.getElementById("app-body");
const statusBanner = document.getElementById("status-banner");
const statusText = document.getElementById("status-text");

// HEADER ACTIONS
const btnLoginOpen = document.getElementById("btn-login-open");
const btnLogout = document.getElementById("btn-logout");
const btnAddMemberOpen = document.getElementById("btn-add-member-open");
const btnExport = document.getElementById("btn-export");
const btnImportTrigger = document.getElementById("btn-import-trigger");
const fileImportInput = document.getElementById("file-import");

// MODAL NODE WRAPPERS
const modalContainer = document.getElementById("modal-container");
const modalLogin = document.getElementById("modal-login");
const modalMember = document.getElementById("modal-member");

// FORMS
const formLogin = document.getElementById("form-login");
const loginError = document.getElementById("login-error");
const formMember = document.getElementById("form-member");
const memberModalTitle = document.getElementById("member-modal-title");

// FILTER INPUT DRIVERS
const searchPlayer = document.getElementById("search-player");
const filterClass = document.getElementById("filter-class");
const sortRoster = document.getElementById("sort-roster");

// DISPLAY TARGET GRIDS
const rosterTbody = document.getElementById("roster-tbody");
const teamsGrid = document.getElementById("teams-grid");
const btnGenerateTeams = document.getElementById("btn-generate-teams");

// LIFECYCLE REBOOT ROUTINE
function initializeApp() {
    // 1. Session authorization recovery
    const savedAuth = sessionStorage.getItem("sxs_auth_mode");
    if (savedAuth === "master") {
        setAuthMode("master");
    } else {
        setAuthMode("viewer");
    }

    // 2. Local storage roster array recovery
    const savedRoster = localStorage.getItem("sxs_guild_roster");
    if (savedRoster) {
        try {
            STATE.roster = JSON.parse(savedRoster);
        } catch(e) {
            STATE.roster = [...DEFAULT_ROSTER];
        }
    } else {
        STATE.roster = [...DEFAULT_ROSTER];
        saveRosterToStorage();
    }

    // 3. Recover last calculated team set if available
    const savedTeams = localStorage.getItem("sxs_generated_teams");
    if (savedTeams) {
        try { STATE.teams = JSON.parse(savedTeams); } catch(e) { STATE.teams = []; }
    }

    // 4. Register Event Triggers
    setupEventHandlers();

    // 5. Build presentation view boards
    renderAll();
}

// PERSISTENCE MANAGER HOOKS
function saveRosterToStorage() {
    localStorage.setItem("sxs_guild_roster", JSON.stringify(STATE.roster));
}
function saveTeamsToStorage() {
    localStorage.setItem("sxs_generated_teams", JSON.stringify(STATE.teams));
}

// AUTHORIZATION DISPATCH WORKERS
function setAuthMode(mode) {
    STATE.authMode = mode;
    if (mode === "master") {
        bodyEl.className = "master-mode";
        statusBanner.className = "status-banner banner-master";
        statusText.textContent = "Master Operator Mode (Full Access)";
        sessionStorage.setItem("sxs_auth_mode", "master");
    } else {
        bodyEl.className = "viewer-mode";
        statusBanner.className = "status-banner banner-viewer";
        statusText.textContent = "Viewing Mode (Read-Only)";
        sessionStorage.setItem("sxs_auth_mode", "viewer");
    }
}

// CENTRAL MODAL VISIBILITY CONTROLLER
function openModal(modalNode) {
    modalContainer.classList.add("active");
    modalNode.classList.add("active");
}

function closeAllModals() {
    modalContainer.classList.remove("active");
    modalLogin.classList.remove("active");
    modalMember.classList.remove("active");
}

// COMPREHENSIVE RE-RENDER HOOK
function renderAll() {
    renderStats();
    renderRosterTable();
    renderTeamsGrid();
}

// RENDER STATISTICS PANEL
function renderStats() {
    const totalMembers = STATE.roster.length;
    let totalPower = 0;
    STATE.roster.forEach(m => totalPower += parseInt(m.power || 0, 10));
    const avgPower = totalMembers > 0 ? Math.round(totalPower / totalMembers) : 0;

    // Count players that are actually grouped in current live teams layout matrix array
    let assignedCount = 0;
    STATE.teams.forEach(t => {
        assignedCount += (t.players ? t.players.length : 0);
    });
    const unassignedCount = Math.max(0, totalMembers - assignedCount);

    document.getElementById("stat-total-members").textContent = totalMembers.toLocaleString();
    document.getElementById("stat-total-power").textContent = totalPower.toLocaleString();
    document.getElementById("stat-avg-power").textContent = avgPower.toLocaleString();
    document.getElementById("stat-unassigned").textContent = unassignedCount.toLocaleString();
}

// RENDER ROSTER ROWS
function renderRosterTable() {
    rosterTbody.innerHTML = "";
    
    let filtered = [...STATE.roster];

    // Filter text name match
    const searchVal = searchPlayer.value.trim().toLowerCase();
    if (searchVal) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchVal));
    }

    // Filter class category match
    const classVal = filterClass.value;
    if (classVal) {
        filtered = filtered.filter(p => p.class === classVal);
    }

    // Process Sort Orders
    const sortVal = sortRoster.value;
    filtered.sort((a, b) => {
        if (sortVal === "power-desc") return b.power - a.power;
        if (sortVal === "power-asc") return a.power - b.power;
        if (sortVal === "name-asc") return a.name.localeCompare(b.name);
        if (sortVal === "class-asc") return a.class.localeCompare(b.class);
        if (sortVal === "team-asc") {
            const tA = getPlayerTeamNumber(a.id);
            const tB = getPlayerTeamNumber(b.id);
            return tA - tB;
        }
        return 0;
    });

    if (filtered.length === 0) {
        rosterTbody.innerHTML = `<tr><td colspan="${STATE.authMode === 'master' ? 5 : 4}" style="text-align: center; color: var(--text-secondary);">No characters match filter properties.</td></tr>`;
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement("tr");
        
        const teamNum = getPlayerTeamNumber(p.id);
        const teamDisplay = teamNum > 0 ? `Team ${teamNum}` : `<span style="color: var(--text-secondary); italic">Unassigned</span>`;

        let actionButtonsHtml = '';
        if (STATE.authMode === 'master') {
            actionButtonsHtml = `
                <td class="auth-only">
                    <div class="action-group">
                        <button class="btn btn-secondary btn-xs btn-edit-member" data-id="${p.id}">Edit</button>
                        <button class="btn btn-danger btn-xs btn-delete-member" data-id="${p.id}">Delete</button>
                    </div>
                </td>
            `;
        }

        tr.innerHTML = `
            <td><strong style="color: #fff">${escapeHtml(p.name)}</strong>${p.notes ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(p.notes)}</div>` : ''}</td>
            <td><span class="badge badge-${p.class.toLowerCase()}">${p.class}</span></td>
            <td><strong style="color: var(--color-success)">${p.power.toLocaleString()}</strong></td>
            <td>${teamDisplay}</td>
            ${actionButtonsHtml}
        `;
        rosterTbody.appendChild(tr);
    });
}

// LOOKUP MAPPED ASSIGNED TEAM NUMBER
function getPlayerTeamNumber(playerId) {
    for (let i = 0; i < STATE.teams.length; i++) {
        if (STATE.teams[i].players.some(pl => pl.id === playerId)) {
            return STATE.teams[i].id;
        }
    }
    return 0;
}

// RENDER BALANCED TEAM CARDS COLUMNS
function renderTeamsGrid() {
    teamsGrid.innerHTML = "";
    
    if (STATE.teams.length === 0) {
        teamsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-secondary); background-color: var(--bg-card); border-radius: 8px; border: 1px dashed var(--border-color)">No active groups processed yet. ${STATE.authMode === 'master' ? 'Click "Generate Ranked Teams" to build setups.' : 'Awaiting Master configuration execution.'}</div>`;
        return;
    }

    STATE.teams.forEach(t => {
        const card = document.createElement("div");
        card.className = "team-card";
        
        let membersListHtml = "";
        const classesList = ["Berserker", "Paladin", "Archmage", "Arcanist"];
        
        classesList.forEach(cls => {
            const playerFound = t.players.find(p => p.class === cls);
            if (playerFound) {
                membersListHtml += `
                    <div class="team-member-item">
                        <div class="tm-identity">
                            <span class="tm-name">${escapeHtml(playerFound.name)}</span>
                            <span class="tm-cp-val">CP: ${playerFound.power.toLocaleString()}</span>
                        </div>
                        <span class="badge badge-${cls.toLowerCase()}">${cls}</span>
                    </div>
                `;
            } else {
                membersListHtml += `
                    <div class="team-member-item" style="opacity: 0.65;">
                        <div class="tm-identity">
                            <span class="tm-name" style="color: var(--text-secondary); font-style: italic">Empty Composition Slot</span>
                            <span class="tm-cp-val">--</span>
                        </div>
                        <span class="badge badge-missing">Missing ${cls}</span>
                    </div>
                `;
            }
        });

        card.innerHTML = `
            <div class="team-header">
                <span class="team-title">Team ${t.id}</span>
                <span class="team-cp">${t.totalPower.toLocaleString()} CP</span>
            </div>
            <div class="team-members-list">
                ${membersListHtml}
            </div>
        `;
        teamsGrid.appendChild(card);
    });
}

// ALGORITHM FOR COMPETITIVE GROUP GENERATION
function runTeamGenerationAlgorithm() {
    // 1. Fragment by raw class buckets
    const classes = { Berserker: [], Paladin: [], Archmage: [], Arcanist: [] };
    STATE.roster.forEach(m => {
        if (classes[m.class]) {
            classes[m.class].push({ ...m });
        }
    });

    // 2. Force Sort power hierarchy levels high to low descending
    for (const cls in classes) {
        classes[cls].sort((a, b) => b.power - a.power);
    }

    // 3. Iteratively loop down max possible slots (capped at exactly 15 teams maximum requirement)
    const newTeams = [];
    const maxTeamsCount = 15;

    for (let teamIdx = 1; teamIdx <= maxTeamsCount; teamIdx++) {
        const teamPlayers = [];
        let teamTotalCP = 0;

        // Check each designated game class container bucket
        ["Berserker", "Paladin", "Archmage", "Arcanist"].forEach(cls => {
            if (classes[cls].length > 0) {
                const headPlayer = classes[cls].shift(); // Extract top power candidate
                teamPlayers.push(headPlayer);
                teamTotalCP += parseInt(headPlayer.power, 10);
            }
        });

        // Break execution chain if zero players were appended across any class slots
        if (teamPlayers.length === 0) break;

        newTeams.push({
            id: teamIdx,
            players: teamPlayers,
            totalPower: teamTotalCP
        });
    }

    STATE.teams = newTeams;
    saveTeamsToStorage();
    renderAll();
}

// ATTACH CORE REGISTRATION HANDLERS
function setupEventHandlers() {
    
    // OPEN PROMPTS TRIGGER MODS
    btnLoginOpen.addEventListener("click", () => {
        loginError.style.display = "none";
        formLogin.reset();
        openModal(modalLogin);
    });

    btnAddMemberOpen.addEventListener("click", () => {
        formMember.reset();
        document.getElementById("member-id").value = "";
        memberModalTitle.textContent = "Add Guild Member";
        document.getElementById("btn-member-submit").textContent = "Save Member";
        openModal(modalMember);
    });

    // GENERAL DISMISS CONTROLS BOUND TO ATTRIBUTE CLICKS
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.addEventListener("click", () => {
            closeAllModals();
        });
    });

    // CLOSE VIA BACKDROP WRAPPER CONTAINER ONLY (NOT ITS INTERNALS)
    modalContainer.addEventListener("click", (e) => {
        if (e.target === modalContainer) {
            closeAllModals();
        }
    });

    // PROCESS MASTER IDENTITY CHECKS
    formLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        const user = document.getElementById("login-user").value;
        const pass = document.getElementById("login-pass").value;

        if (user === "Mika" && pass === "EvilEnvy") {
            setAuthMode("master");
            closeAllModals();
            renderAll(); // Rerender table layout grid elements to showcase action options
        } else {
            loginError.style.display = "block";
        }
    });

    // SHUTDOWN AUTHORIZATION TRACK
    btnLogout.addEventListener("click", () => {
        setAuthMode("viewer");
        renderAll();
    });

    // MEMBER FORM CRUD OPERATIONS SUBMIT ACTION
    formMember.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = document.getElementById("member-id").value;
        const name = document.getElementById("member-name").value.trim();
        const cls = document.getElementById("member-class").value;
        const power = parseInt(document.getElementById("member-power").value, 10);
        const notes = document.getElementById("member-notes").value.trim();

        if (!name || isNaN(power)) return;

        if (id) {
            // Update operation
            const idx = STATE.roster.findIndex(m => m.id === id);
            if (idx !== -1) {
                STATE.roster[idx] = { id, name, class: cls, power, notes };
            }
        } else {
            // Generate unique stamp identifier token string
            const newId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            STATE.roster.push({ id: newId, name, class: cls, power, notes });
        }

        saveRosterToStorage();
        closeAllModals();
        
        // Auto-recalculate configuration mapping updates if teams existed
        if (STATE.teams.length > 0) {
            runTeamGenerationAlgorithm();
        } else {
            renderAll();
        }
    });

    // INDIVIDUAL ELEMENT CLICKS VIA EMBEDDED TABLE TRIGGERS DELEGATION
    rosterTbody.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".btn-edit-member");
        const deleteBtn = e.target.closest(".btn-delete-member");

        if (editBtn) {
            const targetId = editBtn.getAttribute("data-id");
            const player = STATE.roster.find(m => m.id === targetId);
            if (player) {
                document.getElementById("member-id").value = player.id;
                document.getElementById("member-name").value = player.name;
                document.getElementById("member-class").value = player.class;
                document.getElementById("member-power").value = player.power;
                document.getElementById("member-notes").value = player.notes || "";
                
                memberModalTitle.textContent = "Edit Guild Member";
                document.getElementById("btn-member-submit").textContent = "Update Configurations";
                openModal(modalMember);
            }
        }

        if (deleteBtn) {
            const targetId = deleteBtn.getAttribute("data-id");
            const player = STATE.roster.find(m => m.id === targetId);
            if (player && confirm(`Are you sure you want to remove player "${player.name}" from the planner roster list?`)) {
                STATE.roster = STATE.roster.filter(m => m.id !== targetId);
                saveRosterToStorage();
                
                if (STATE.teams.length > 0) {
                    runTeamGenerationAlgorithm();
                } else {
                    renderAll();
                }
            }
        }
    });

    // PROCESS ALGORITHM TRIGGER
    btnGenerateTeams.addEventListener("click", () => {
        runTeamGenerationAlgorithm();
    });

    // DRIFT FILTERS REAL-TIME UPDATE LISTENERS
    searchPlayer.addEventListener("input", () => renderRosterTable());
    filterClass.addEventListener("change", () => renderRosterTable());
    sortRoster.addEventListener("change", () => renderRosterTable());

    // FILE UTILITY ACTIONS EXPORT MATRIX DATA
    btnExport.addEventListener("click", () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(STATE.roster, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "sword_x_staff_guild_roster.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // LOAD EXTERNAL RAW TRANSFERS
    btnImportTrigger.addEventListener("click", () => {
        fileImportInput.click();
    });

    fileImportInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (Array.isArray(parsed)) {
                    // Quick validation sweep mapping properties checks
                    const valid = parsed.every(item => item.name && item.class && typeof item.power !== "undefined");
                    if (valid) {
                        STATE.roster = parsed;
                        saveRosterToStorage();
                        STATE.teams = []; // Reset old mapping context to match fresh batch criteria rules
                        saveTeamsToStorage();
                        renderAll();
                        alert("Guild roster profile uploaded and applied cleanly!");
                    } else {
                        alert("JSON contains unmapped data structures. Check layout fields compatibility matrices.");
                    }
                } else {
                    alert("Import file payload invalid array context formatting data profile.");
                }
            } catch(err) {
                alert("Critical failure parsing files: invalid raw parameters formatting JSON errors.");
            }
        };
        reader.readAsText(file);
        fileImportInput.value = ""; // Clear file selector node reference
    });
}

// ESCAPE USER CHARACTER DATA TO PROTECT STRINGS INTERPOLATION EXPRESSION 
function escapeHtml(str) {
    if (!str) return '';
    return str
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// INITIATE APP ON WINDOW REBOOT
window.addEventListener("DOMContentLoaded", initializeApp);
