// State Management
let roster = [];
let generatedTeams = [];
let isMasterMode = false;

// Hardcoded Master Credentials
const MASTER_USER = "Mika";
const MASTER_PASS = "EvilEnvy";

// Supported Classes
const CLASSES = ["Berserker", "Paladin", "Archmage", "Arcanist"];

// LocalStorage Keys
const STORAGE_ROSTER_KEY = "sxs_guild_roster";
const STORAGE_TEAMS_KEY = "sxs_guild_teams";

// Initial Demo/Placeholder Data if empty
const demoRoster = [
    { id: "1", name: "Arthur", class: "Berserker", power: 2200000, notes: "Guild Leader" },
    { id: "2", name: "Galahad", class: "Berserker", power: 1850000, notes: "" },
    { id: "3", name: "Lancelot", class: "Paladin", power: 2100000, notes: "" },
    { id: "4", name: "Bors", class: "Paladin", power: 1600000, notes: "" },
    { id: "5", name: "Merlin", class: "Archmage", power: 2350000, notes: "Main DPS" },
    { id: "6", name: "Morgana", class: "Archmage", power: 1900000, notes: "" },
    { id: "7", name: "Percival", class: "Arcanist", power: 1750000, notes: "" },
    { id: "8", name: "Tristan", class: "Arcanist", power: 1550000, notes: "" }
];

// Elements
const elLoginTrigger = document.getElementById('btn-login-trigger');
const elLogout = document.getElementById('btn-logout');
const elMasterActions = document.getElementById('master-actions');
const elStatusBanner = document.getElementById('status-banner');
const elStatusText = document.getElementById('status-text');
const elMasterControls = document.getElementsByClassName('master-control');
const elBtnGenerateTeams = document.getElementById('btn-generate-teams');
const elBtnAddMember = document.getElementById('btn-add-member');
const elBtnExport = document.getElementById('btn-export');
const elBtnImportTrigger = document.getElementById('btn-import-trigger');
const elImportFile = document.getElementById('import-file');

// Modals
const modalLogin = document.getElementById('modal-login');
const modalMember = document.getElementById('modal-member');
const loginForm = document.getElementById('login-form');
const memberForm = document.getElementById('member-form');

// Inputs/Filters
const inputSearch = document.getElementById('search-input');
const filterClass = document.getElementById('filter-class');
const sortBy = document.getElementById('sort-by');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    updateUI();
});

// Load state from LocalStorage
function loadData() {
    const savedRoster = localStorage.getItem(STORAGE_ROSTER_KEY);
    if (savedRoster) {
        roster = JSON.parse(savedRoster);
    } else {
        roster = [...demoRoster];
        saveRosterToStorage();
    }

    const savedTeams = localStorage.getItem(STORAGE_TEAMS_KEY);
    if (savedTeams) {
        generatedTeams = JSON.parse(savedTeams);
    } else {
        // Auto-run layout once initially if teams aren't generated
        generateRankedTeamsAlgorithm();
    }

    // Check if session has active master layout (kept in sessionStorage for temporary alignment)
    if (sessionStorage.getItem('sxs_master_active') === 'true') {
        setAuthMode(true);
    }
}

function saveRosterToStorage() {
    localStorage.setItem(STORAGE_ROSTER_KEY, JSON.stringify(roster));
}

function saveTeamsToStorage() {
    localStorage.setItem(STORAGE_TEAMS_KEY, JSON.stringify(generatedTeams));
}

function setAuthMode(masterModeActive) {
    isMasterMode = masterModeActive;
    if (masterModeActive) {
        sessionStorage.setItem('sxs_master_active', 'true');
        elLoginTrigger.classList.add('hidden');
        elMasterActions.classList.remove('hidden');
        elBtnGenerateTeams.classList.remove('hidden');
        elStatusBanner.className = "status-banner master-mode";
        elStatusText.textContent = "Master Mode Enabled (Authorized Editor)";
    } else {
        sessionStorage.removeItem('sxs_master_active');
        elLoginTrigger.classList.remove('hidden');
        elMasterActions.classList.add('hidden');
        elBtnGenerateTeams.classList.add('hidden');
        elStatusBanner.className = "status-banner viewer-mode";
        elStatusText.textContent = "Viewing Mode (Read-Only)";
    }
    
    // Toggle table action columns
    Array.from(elMasterControls).forEach(el => {
        if (masterModeActive) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    updateUI();
}

// UI Rendering Controller
function updateUI() {
    renderStats();
    renderRosterTable();
    renderTeams();
}

function renderStats() {
    const memberCount = roster.length;
    const totalPower = roster.reduce((sum, item) => sum + parseInt(item.power || 0), 0);
    const avgPower = memberCount > 0 ? Math.round(totalPower / memberCount) : 0;
    
    // Calculate unassigned members (not present in any team slot)
    const assignedIds = new Set();
    generatedTeams.forEach(t => t.players.forEach(p => assignedIds.add(p.id)));
    const unassignedCount = roster.filter(m => !assignedIds.has(m.id)).length;

    document.getElementById('stat-members').textContent = memberCount;
    document.getElementById('stat-total-power').textContent = totalPower.toLocaleString();
    document.getElementById('stat-avg-power').textContent = avgPower.toLocaleString();
    document.getElementById('stat-unassigned').textContent = unassignedCount;
}

function renderRosterTable() {
    const tbody = document.getElementById('roster-tbody');
    tbody.innerHTML = '';

    // Apply Filter & Search
    let filtered = roster.filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(inputSearch.value.toLowerCase());
        const matchesClass = filterClass.value === 'all' || player.class === filterClass.value;
        return matchesSearch && matchesClass;
    });

    // Create lookup for teams mapping
    const playerTeamMap = {};
    generatedTeams.forEach(team => {
        team.players.forEach(p => {
            playerTeamMap[p.id] = `Team ${team.number}`;
        });
    });

    // Apply Sorting
    filtered.sort((a, b) => {
        switch (sortBy.value) {
            case 'power-desc': return b.power - a.power;
            case 'power-asc': return a.power - b.power;
            case 'name-asc': return a.name.localeCompare(b.name);
            case 'class-asc': return a.class.localeCompare(b.class);
            case 'team-asc': 
                const teamA = playerTeamMap[a.id] || 'Unassigned';
                const teamB = playerTeamMap[b.id] || 'Unassigned';
                if (teamA === 'Unassigned') return 1;
                if (teamB === 'Unassigned') return -1;
                return teamA.localeCompare(teamB, undefined, {numeric: true});
            default: return b.power - a.power;
        }
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isMasterMode ? 5 : 4}" style="text-align:center; color: var(--text-muted);">No members match search criteria.</td></tr>`;
        return;
    }

    filtered.forEach(player => {
        const tr = document.createElement('tr');
        const assignedTeam = playerTeamMap[player.id] || '<span class="missing-tag">Unassigned</span>';
        
        let actionsHtml = '';
        if (isMasterMode) {
            actionsHtml = `
                <td class="actions-cell master-control">
                    <button class="btn btn-secondary btn-small btn-edit" data-id="${player.id}">Edit</button>
                    <button class="btn btn-danger btn-small btn-delete" data-id="${player.id}">Delete</button>
                </td>
            `;
        }

        tr.innerHTML = `
            <td><strong>${escapeHtml(player.name)}</strong>${player.notes ? `<br><small style="color: var(--text-muted); font-size:0.75rem;">${escapeHtml(player.notes)}</small>` : ''}</td>
            <td><span class="member-class-tag class-${player.class}">${player.class}</span></td>
            <td>${parseInt(player.power).toLocaleString()}</td>
            <td>${assignedTeam}</td>
            ${actionsHtml}
        `;
        tbody.appendChild(tr);
    });

    // Attach Event Listeners to Edit/Delete dynamically rendered nodes
    if (isMasterMode) {
        document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', (e) => openEditMemberModal(e.target.dataset.id)));
        document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', (e) => deleteMember(e.target.dataset.id)));
    }
}

function renderTeams() {
    const container = document.getElementById('teams-container');
    container.innerHTML = '';

    if (generatedTeams.length === 0) {
        container.innerHTML = '<div class="no-teams-placeholder">No teams generated yet. Click "Generate Ranked Teams" in Master Mode.</div>';
        return;
    }

    generatedTeams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-card';
        
        let memberRowsHtml = '';
        
        // Loop over the game's exact 4 classes in structured order to show present/missing details perfectly
        CLASSES.forEach(cls => {
            const playerFound = team.players.find(p => p.class === cls);
            if (playerFound) {
                memberRowsHtml += `
                    <div class="team-member-row">
                        <span><span class="member-class-tag class-${cls}">${cls}</span> <strong>${escapeHtml(playerFound.name)}</strong></span>
                        <span class="text-muted">${parseInt(playerFound.power).toLocaleString()} CP</span>
                    </div>
                `;
            } else {
                memberRowsHtml += `
                    <div class="team-member-row">
                        <span><span class="member-class-tag class-${cls}">${cls}</span> <span class="missing-tag">Missing Slot</span></span>
                        <span>—</span>
                    </div>
                `;
            }
        });

        card.innerHTML = `
            <div class="team-header">
                <span class="team-name">Team ${team.number} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${team.playerCount}/4 players)</span></span>
                <span class="team-power">${team.totalPower.toLocaleString()} CP</span>
            </div>
            <div class="team-members-list">
                ${memberRowsHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

// Core Required Sorting & Team Arrangement Logic Algorithm
function generateRankedTeamsAlgorithm() {
    // 1. Separate all guild members by class
    const pool = {
        Berserker: [],
        Paladin: [],
        Archmage: [],
        Arcanist: []
    };
    
    roster.forEach(m => {
        if (pool[m.class]) pool[m.class].push({ ...m });
    });

    // 2. Sort each class group from highest power to lowest power
    CLASSES.forEach(cls => {
        pool[cls].sort((a, b) => b.power - a.power);
    });

    const teams = [];
    // Max 15 teams limit requested
    const maxTeamsCount = 15;

    for (let i = 0; i < maxTeamsCount; i++) {
        const teamPlayers = [];
        let totalPower = 0;

        // Try pulling top player matching index 'i' for each class
        CLASSES.forEach(cls => {
            if (pool[cls][i]) {
                teamPlayers.push(pool[cls][i]);
                totalPower += parseInt(pool[cls][i].power || 0);
            }
        });

        // Break if no players at all are found remaining for this rank loop
        if (teamPlayers.length === 0) break;

        teams.push({
            number: i + 1,
            players: teamPlayers,
            totalPower: totalPower,
            playerCount: teamPlayers.length
        });
    }

    generatedTeams = teams;
    saveTeamsToStorage();
}

// Crud Handlers
function deleteMember(id) {
    if (!confirm("Are you sure you want to delete this guild member?")) return;
    roster = roster.filter(m => m.id !== id);
    saveRosterToStorage();
    // Auto re-generate arrangement to keep layout up to date
    generateRankedTeamsAlgorithm();
    updateUI();
}

function openAddMemberModal() {
    document.getElementById('member-modal-title').textContent = "Add Guild Member";
    document.getElementById('member-id').value = "";
    memberForm.reset();
    modalMember.classList.remove('hidden');
}

function openEditMemberModal(id) {
    const member = roster.find(m => m.id === id);
    if (!member) return;

    document.getElementById('member-modal-title').textContent = "Edit Guild Member";
    document.getElementById('member-id').value = member.id;
    document.getElementById('member-name').value = member.name;
    document.getElementById('member-class').value = member.class;
    document.getElementById('member-power').value = member.power;
    document.getElementById('member-notes').value = member.notes || "";

    modalMember.classList.remove('hidden');
}

// Import/Export Data Functionality
function exportToJSON() {
    const dataStr = JSON.stringify({ roster: roster, generatedTeams: generatedTeams }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sword_x_staff_roster_v4.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importFromJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            if (parsed && Array.isArray(parsed.roster)) {
                roster = parsed.roster;
                saveRosterToStorage();
                if (Array.isArray(parsed.generatedTeams)) {
                    generatedTeams = parsed.generatedTeams;
                    saveTeamsToStorage();
                } else {
                    generateRankedTeamsAlgorithm();
                }
                updateUI();
                alert("Roster configuration loaded successfully!");
            } else {
                alert("Invalid JSON format. Could not discover active member layout schema data structure mapping.");
            }
        } catch (err) {
            alert("Error parsing file template framework configuration alignment.");
        }
    };
    reader.readAsText(file);
    // Reset file element selection index layout choice
    elImportFile.value = '';
}

// Event Wireframes Hooks Bindings
function setupEventListeners() {
    // Auth Triggers
    elLoginTrigger.addEventListener('click', () => {
        document.getElementById('login-error').classList.add('hidden');
        loginForm.reset();
        modalLogin.classList.remove('hidden');
    });
    elLogout.addEventListener('click', () => setAuthMode(false));
    
    document.getElementById('close-login').addEventListener('click', () => modalLogin.classList.add('hidden'));
    document.getElementById('btn-cancel-login').addEventListener('click', () => modalLogin.classList.add('hidden'));
    
    // Login Submit Handler
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;

        if (user === MASTER_USER && pass === MASTER_PASS) {
            modalLogin.classList.add('hidden');
            setAuthMode(true);
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    });

    // Member Action Modals Hooks
    elBtnAddMember.addEventListener('click', openAddMemberModal);
    document.getElementById('close-member').addEventListener('click', () => modalMember.classList.add('hidden'));
    document.getElementById('btn-cancel-member').addEventListener('click', () => modalMember.classList.add('hidden'));

    memberForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('member-id').value;
        const name = document.getElementById('member-name').value.trim();
        const selectedClass = document.getElementById('member-class').value;
        const power = parseInt(document.getElementById('member-power').value) || 0;
        const notes = document.getElementById('member-notes').value.trim();

        if (id) {
            // Update
            const idx = roster.findIndex(m => m.id === id);
            if (idx !== -1) roster[idx] = { id, name, class: selectedClass, power, notes };
        } else {
            // Add
            const newMember = {
                id: Date.now().toString(),
                name,
                class: selectedClass,
                power,
                notes
            };
            roster.push(newMember);
        }

        saveRosterToStorage();
        generateRankedTeamsAlgorithm();
        modalMember.classList.add('hidden');
        updateUI();
    });

    // Manual Algorithm Refresh Trigger button
    elBtnGenerateTeams.addEventListener('click', () => {
        generateRankedTeamsAlgorithm();
        updateUI();
        alert("Ranked teams recalculated dynamically from current roster metrics!");
    });

    // Export & Import Wire Hookups
    elBtnExport.addEventListener('click', exportToJSON);
    elBtnImportTrigger.addEventListener('click', () => elImportFile.click());
    elImportFile.addEventListener('change', importFromJSON);

    // Interactive Realtime Search & Sort filters hooks listeners triggers
    inputSearch.addEventListener('input', renderRosterTable);
    filterClass.addEventListener('change', renderRosterTable);
    sortBy.addEventListener('change', renderRosterTable);
}

// Helpers Utlity Function
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}
