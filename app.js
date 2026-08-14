/**
 * SWORD X STAFF GUILD PLANNER (v4)
 * Static Architecture - Client State Controller Setup
 */

// STATE MANAGER
let state = {
    isMaster: false,
    members: [],
    teams: []
};

// MASTER SECURE CONFIG
const AUTHORIZATION = {
    user: "Mika",
    pass: "EvilEnvy"
};

// INITIALIZATION PIPELINE
document.addEventListener("DOMContentLoaded", () => {
    loadPersistence();
    checkAuthSession();
    registerEventHandlers();
    executeCorePipeline();
});

// LOAD PERSISTENCE DATA LOCALSTORAGE
function loadPersistence() {
    const localData = localStorage.getItem("sxs_guild_roster");
    if (localData) {
        try {
            state.members = JSON.parse(localData);
        } catch (e) {
            console.error("Corruption caught in localStorage parsing. Resetting to mock array.", e);
            state.members = getSampleRoster();
        }
    } else {
        state.members = getSampleRoster();
        savePersistence();
    }
}

function savePersistence() {
    localStorage.setItem("sxs_guild_roster", JSON.stringify(state.members));
}

function checkAuthSession() {
    const sessionAuth = sessionStorage.getItem("sxs_master_auth");
    if (sessionAuth === "true") {
        state.isMaster = true;
    }
}

// EVENT HANDLERS REGISTRATION
function registerEventHandlers() {
    // Authentication Dialog Elements
    const btnLoginOpen = document.getElementById("btn-login-open");
    const modalLogin = document.getElementById("modal-login");
    const modalLoginClose = document.getElementById("modal-login-close");
    const btnLoginCancel = document.getElementById("btn-login-cancel");
    const formLogin = document.getElementById("form-login");
    const btnLogout = document.getElementById("btn-logout");

    // Open Login Modal
    if (btnLoginOpen) {
        btnLoginOpen.addEventListener("click", () => {
            document.getElementById("login-error").style.display = "none";
            formLogin.reset();
            modalLogin.classList.add("active");
        });
    }

    // Close Login Modal Actions
    const closeLoginModal = () => { modalLogin.classList.remove("active"); };
    if (modalLoginClose) modalLoginClose.addEventListener("click", closeLoginModal);
    if (btnLoginCancel) btnLoginCancel.addEventListener("click", closeLoginModal);

    // Login Form Processing Pipeline
    if (formLogin) {
        formLogin.addEventListener("submit", (e) => {
            e.preventDefault();
            const userInput = document.getElementById("login-user").value.trim();
            const passInput = document.getElementById("login-pass").value;
            const errorElement = document.getElementById("login-error");

            if (userInput === AUTHORIZATION.user && passInput === AUTHORIZATION.pass) {
                state.isMaster = true;
                sessionStorage.setItem("sxs_master_auth", "true");
                closeLoginModal();
                updateViewElements();
            } else {
                errorElement.style.display = "block";
            }
        });
    }

    // Logout Process Execution
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            state.isMaster = false;
            sessionStorage.removeItem("sxs_master_auth");
            updateViewElements();
        });
    }

    // Member CRUD Modals Hooks
    const btnAddMember = document.getElementById("btn-add-member");
    const modalMember = document.getElementById("modal-member");
    const modalMemberClose = document.getElementById("modal-member-close");
    const btnMemberCancel = document.getElementById("btn-member-cancel");
    const formMember = document.getElementById("form-member");

    if (btnAddMember) {
        btnAddMember.addEventListener("click", () => {
            document.getElementById("modal-member-title").innerText = "Add Guild Member";
            formMember.reset();
            document.getElementById("member-id").value = "";
            modalMember.classList.add("active");
        });
    }

    const closeMemberModal = () => { modalMember.classList.remove("active"); };
    if (modalMemberClose) modalMemberClose.addEventListener("click", closeMemberModal);
    if (btnMemberCancel) btnMemberCancel.addEventListener("click", closeMemberModal);

    if (formMember) {
        formMember.addEventListener("submit", (e) => {
            e.preventDefault();
            const id = document.getElementById("member-id").value;
            const name = document.getElementById("member-name").value.trim();
            const cls = document.getElementById("member-class").value;
            const power = parseInt(document.getElementById("member-power").value, 10) || 0;
            const notes = document.getElementById("member-notes").value.trim();

            if (id) {
                // Edit Entry Mode
                const index = state.members.findIndex(m => m.id === id);
                if (index !== -1) {
                    state.members[index] = { ...state.members[index], name, class: cls, power, notes };
                }
            } else {
                // Create Mode Entry
                const newMember = {
                    id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    name,
                    class: cls,
                    power,
                    notes
                };
                state.members.push(newMember);
            }

            savePersistence();
            closeMemberModal();
            executeCorePipeline();
        });
    }

    // Algorithmic Pipeline Button Hook
    const btnGenTeams = document.getElementById("btn-generate-teams");
    if (btnGenTeams) {
        btnGenTeams.addEventListener("click", () => {
            runTeamGenerationAlgorithm();
            renderTeamOutput();
            renderRosterGrid();
            updateDashboardMetrics();
        });
    }

    // Filter, Search, and Sort Event Bindings
    const searchInput = document.getElementById("search-input");
    const filterClass = document.getElementById("filter-class");
    const sortSelect = document.getElementById("sort-select");

    if (searchInput) searchInput.addEventListener("input", renderRosterGrid);
    if (filterClass) filterClass.addEventListener("change", renderRosterGrid);
    if (sortSelect) sortSelect.addEventListener("change", renderRosterGrid);

    // Export JSON Data IO File Link Actions
    const btnExport = document.getElementById("btn-export");
    if (btnExport) {
        btnExport.addEventListener("click", () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.members, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "sword_x_staff_roster_v4.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }

    // Import JSON Data Stream Actions
    const btnImportTrigger = document.getElementById("btn-import-trigger");
    const fileImport = document.getElementById("file-import");

    if (btnImportTrigger && fileImport) {
        btnImportTrigger.addEventListener("click", () => {
            fileImport.click();
        });

        fileImport.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const parsedData = JSON.parse(event.target.result);
                    if (Array.isArray(parsedData)) {
                        state.members = parsedData.map(m => ({
                            id: m.id || 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                            name: m.name || "Unknown Adventurer",
                            class: ['Berserker', 'Paladin', 'Archmage', 'Arcanist'].includes(m.class) ? m.class : "Berserker",
                            power: parseInt(m.power, 10) || 0,
                            notes: m.notes || ""
                        }));
                        savePersistence();
                        executeCorePipeline();
                        alert("Roster configuration loaded successfully!");
                    } else {
                        alert("Invalid format structural data file profile.");
                    }
                } catch (err) {
                    alert("Failed parsing target stream dataset files structural models.");
                }
            };
            reader.readAsText(file);
            fileImport.value = ""; // clear selector cache elements
        });
    }
}

// PIPELINE ORCHESTRATION ENGINE RUNNERS
function executeCorePipeline() {
    updateViewElements();
    runTeamGenerationAlgorithm();
    renderRosterGrid();
    renderTeamOutput();
    updateDashboardMetrics();
}

// CONDITIONAL VIEW UI STATE CONTROLLER SHIFTS
function updateViewElements() {
    const banner = document.getElementById("status-banner");
    const statusText = document.getElementById("status-text");

    // Dynamic Visibility Element Arrays
    const viewerOnlyEls = document.querySelectorAll(".mode-viewer-only");
    const masterOnlyEls = document.querySelectorAll(".mode-master-only");

    if (state.isMaster) {
        // Master Mode View Context Shifts
        if (banner) {
            banner.className = "status-banner banner-master";
            statusText.innerHTML = "🛠️ Current Mode: <strong>Master Mode</strong> (Administrative Workspace)";
        }
        viewerOnlyEls.forEach(el => el.style.display = "none");
        masterOnlyEls.forEach(el => el.style.display = "inline-block");
    } else {
        // Public Viewer Mode Visual Spaces
        if (banner) {
            banner.className = "status-banner banner-viewer";
            statusText.innerHTML = "🌐 Current Mode: <strong>Viewer Mode</strong> (Read-Only)";
        }
        viewerOnlyEls.forEach(el => el.style.display = "inline-block");
        masterOnlyEls.forEach(el => el.style.display = "none");
    }

    // Refresh controls within structural elements dynamically when permissions alter
    const thActions = document.querySelector("th.mode-master-only");
    if (thActions) {
        thActions.style.display = state.isMaster ? "table-cell" : "none";
    }
}

// RE-CALCULATE TEAM ALGORITHMIC COMPOSITION MAPS
function runTeamGenerationAlgorithm() {
    // 1. Separate all guild members by class.
    const byClass = {
        Berserker: [],
        Paladin: [],
        Archmage: [],
        Arcanist: []
    };

    state.members.forEach(m => {
        if (byClass[m.class]) {
            byClass[m.class].push(m);
        }
    });

    // 2. Sort each class from highest power to lowest power.
    const classes = ['Berserker', 'Paladin', 'Archmage', 'Arcanist'];
    classes.forEach(c => {
        byClass[c].sort((a, b) => b.power - a.power);
    });

    // Initialize clean structured map index arrays
    state.teams = [];
    
    // Process exactly up to 15 operational matrix structural grids maximum limit bounds
    for (let t = 0; t < 15; t++) {
        let teamPlayers = [];
        let missingClasses = [];
        let totalPower = 0;

        classes.forEach(c => {
            if (byClass[c][t]) {
                const player = byClass[c][t];
                teamPlayers.push(player);
                totalPower += player.power;
            } else {
                missingClasses.push(c);
            }
        });

        // Break execution pipeline completely context loops early if no composition fragments exist
        if (teamPlayers.length === 0) {
            break;
        }

        state.teams.push({
            teamNumber: t + 1,
            players: teamPlayers,
            missing: missingClasses,
            power: totalPower
        });
    }
}

// RENDER METRIC COUNTER TICKER VALUES
function updateDashboardMetrics() {
    const totalCount = state.members.length;
    let totalPower = 0;
    state.members.forEach(m => totalPower += m.power);
    const avgPower = totalCount > 0 ? Math.round(totalPower / totalCount) : 0;

    // Track unassigned users outside generated teams limits bounds spaces
    let assignedIds = new Set();
    state.teams.forEach(t => {
        t.players.forEach(p => assignedIds.add(p.id));
    });
    const unassignedCount = state.members.filter(m => !assignedIds.has(m.id)).length;

    document.getElementById("stat-count").innerText = totalCount.toLocaleString();
    document.getElementById("stat-power").innerText = totalPower.toLocaleString();
    document.getElementById("stat-avg").innerText = avgPower.toLocaleString();
    document.getElementById("stat-unassigned").innerText = unassignedCount.toLocaleString();
}

// SEARCH FILTER DATA RENDER ROSTER TABLE LAYER GRID
function renderRosterGrid() {
    const tbody = document.getElementById("roster-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchVal = document.getElementById("search-input").value.toLowerCase();
    const filterVal = document.getElementById("filter-class").value;
    const sortVal = document.getElementById("sort-select").value;

    // Build operational lookup table mapping member IDs to assigned Team Numbers
    let memberTeamMap = {};
    state.teams.forEach(t => {
        t.players.forEach(p => {
            memberTeamMap[p.id] = t.teamNumber;
        });
    });

    // Run dynamic workspace dataset filtration processes
    let processedList = [...state.members];

    if (searchVal) {
        processedList = processedList.filter(m => m.name.toLowerCase().includes(searchVal));
    }
    if (filterVal) {
        processedList = processedList.filter(m => m.class === filterVal);
    }

    // Apply sorting rules logic matrix arrays
    processedList.sort((a, b) => {
        if (sortVal === "power-desc") return b.power - a.power;
        if (sortVal === "power-asc") return a.power - b.power;
        if (sortVal === "name-asc") return a.name.localeCompare(b.name);
        if (sortVal === "class-asc") return a.class.localeCompare(b.class);
        if (sortVal === "team-asc") {
            const teamA = memberTeamMap[a.id] || 999;
            const teamB = memberTeamMap[b.id] || 999;
            return teamA - teamB;
        }
        return 0;
    });

    // Build visual interface rows structure grids elements strings
    processedList.forEach(m => {
        const tr = document.createElement("tr");
        
        // Assigned team template mapping badge output
        const teamNum = memberTeamMap[m.id];
        const teamBadgeHtml = teamNum ? `<span class="badge-team">Team ${teamNum}</span>` : `<span class="badge-unassigned">None</span>`;

        let actionsHtml = "";
        if (state.isMaster) {
            actionsHtml = `
                <td class="action-btns-cell">
                    <button class="btn btn-primary btn-mini btn-edit-mem" data-id="${m.id}">Edit</button>
                    <button class="btn btn-danger btn-mini btn-delete-mem" data-id="${m.id}">Del</button>
                </td>
            `;
        }

        tr.innerHTML = `
            <td><strong>${escapeHtml(m.name)}</strong>${m.notes ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">📝 ${escapeHtml(m.notes)}</div>` : ''}</td>
            <td><span class="badge-class badge-${m.class}">${m.class}</span></td>
            <td style="font-family: monospace; font-weight: bold;">${m.power.toLocaleString()}</td>
            <td>${teamBadgeHtml}</td>
            ${actionsHtml}
        `;

        tbody.appendChild(tr);
    });

    // Attach dynamic click event trackers to table rows control items
    if (state.isMaster) {
        document.querySelectorAll(".btn-edit-mem").forEach(b => {
            b.addEventListener("click", (e) => {
                const id = e.target.getAttribute("data-id");
                openEditMemberDialog(id);
            });
        });
        document.querySelectorAll(".btn-delete-mem").forEach(b => {
            b.addEventListener("click", (e) => {
                const id = e.target.getAttribute("data-id");
                if (confirm("Are you sure you want to remove this member from the planner profile?")) {
                    state.members = state.members.filter(m => m.id !== id);
                    savePersistence();
                    executeCorePipeline();
                }
            });
        });
    }
}

// RENDER COLUMN MATRIX CARDS GRAPHICAL RE-COMPOSITION LAYOUTS
function renderTeamOutput() {
    const container = document.getElementById("teams-grid");
    if (!container) return;
    container.innerHTML = "";

    if (state.teams.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--text-muted); font-style:italic;">No active composition groups generated. Click 'Generate Ranked Teams' to populate workspace matrix.</div>`;
        return;
    }

    const classesOrder = ['Berserker', 'Paladin', 'Archmage', 'Arcanist'];

    state.teams.forEach(t => {
        const card = document.createElement("div");
        card.className = "team-card";

        // Generate player items maps lookup table reference systems array trackers
        let playerMapByClass = {};
        t.players.forEach(p => {
            playerMapByClass[p.class] = p;
        });

        let rowsHtml = "";
        classesOrder.forEach(cls => {
            if (playerMapByClass[cls]) {
                const p = playerMapByClass[cls];
                rowsHtml += `
                    <div class="team-player-row">
                        <div class="team-player-info">
                            <span class="badge-class badge-${cls}">${cls}</span>
                            <span class="player-name-text">${escapeHtml(p.name)}</span>
                        </div>
                        <div style="font-family:monospace; font-weight:bold;">${p.power.toLocaleString()}</div>
                    </div>
                `;
            } else {
                rowsHtml += `
                    <div class="team-player-row missing-slot">
                        ⚠️ Missing Class Slot: [${cls}]
                    </div>
                `;
            }
        });

        card.innerHTML = `
            <div class="team-header">
                <span class="team-title">🛡️ Team ${t.teamNumber}</span>
                <div class="team-metrics">
                    <strong>${t.power.toLocaleString()} Total CP</strong><br>
                    <span style="font-size: 0.75rem;">${t.players.length}/4 Members Present</span>
                </div>
            </div>
            <div class="team-roster-list">
                ${rowsHtml}
            </div>
        `;

        container.appendChild(card);
    });
}

// OPEN EDIT MODAL ACTION LAYER TRIGGER
function openEditMemberDialog(id) {
    const member = state.members.find(m => m.id === id);
    if (!member) return;

    document.getElementById("modal-member-title").innerText = "Edit Guild Member Configuration";
    document.getElementById("member-id").value = member.id;
    document.getElementById("member-name").value = member.name;
    document.getElementById("member-class").value = member.class;
    document.getElementById("member-power").value = member.power;
    document.getElementById("member-notes").value = member.notes || "";

    document.getElementById("modal-member").classList.add("active");
}

// SECURITY INPUT TEXT CHARACTER ESCAPE ROUTINE FOR XSS DEFENSE PREVENTION
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

// RE-COMPOSITION MOCK FALLBACK SAMPLE DATA GENERATOR ARRAY
function getSampleRoster() {
    return [
        { id: "s1", name: "Artorias", class: "Berserker", power: 2000000, notes: "Guild Champion. Leading Team 1 Frontline." },
        { id: "s2", name: "Guts", class: "Berserker", power: 1800000, notes: "Highly active during Guild Wars evening hours." },
        { id: "s3", name: "Reinhard", class: "Paladin", power: 1900000, notes: "Main strategist caller." },
        { id: "s4", name: "Saber", class: "Paladin", power: 1700000, notes: "Solid wall defenses anchor." },
        { id: "s5", name: "Gandalf", class: "Archmage", power: 2100000, notes: "High AoE damage dealer spikes output." },
        { id: "s6", name: "Yennefer", class: "Archmage", power: 1600000, notes: "Backup utility status controller effects builder." },
        { id: "s7", name: "Rin", class: "Arcanist", power: 1800000, notes: "Resource generation support batteries profiles tracking." },
        { id: "s8", name: "Jaina", class: "Arcanist", power: 1500000, notes: "Consistent crit damage output tracker profile setup." },
        { id: "s9", name: "Sigurd", class: "Berserker", power: 1500000, notes: "" },
        { id: "s10", name: "Mash", class: "Paladin", power: 1300000, notes: "Always joins scheduled raids." },
        { id: "s11", name: "Khagar", class: "Archmage", power: 1400000, notes: "" },
        { id: "s12", name: "Zedd", class: "Arcanist", power: 1200000, notes: "" }
    ];
}
