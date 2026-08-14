(function() {
    // Application Roster Architecture Core Data Store
    let state = {
        isMaster: false,
        members: []
    };

    // Constant definition configuration parameters
    const MASTER_USER = "Mika";
    const MASTER_PASS = "EvilEnvy";
    const STORAGE_KEY = "sxs_guild_planner_roster";
    const AUTH_KEY = "sxs_guild_planner_auth";

    // DOM Elements Mapping Strategy
    const el = {
        body: document.body,
        btnLoginTrigger: document.getElementById('btn-login-trigger'),
        btnLogout: document.getElementById('btn-logout'),
        btnExport: document.getElementById('btn-export'),
        btnImportTrigger: document.getElementById('btn-import-trigger'),
        fileImport: document.getElementById('file-import'),
        statusBanner: document.getElementById('status-banner'),
        statusText: document.getElementById('status-text'),
        
        statCount: document.getElementById('stat-count'),
        statTotalPower: document.getElementById('stat-total-power'),
        statAvgPower: document.getElementById('stat-avg-power'),
        statUnassigned: document.getElementById('stat-unassigned'),
        
        btnAddMember: document.getElementById('btn-add-member'),
        searchPlayer: document.getElementById('search-player'),
        filterClass: document.getElementById('filter-class'),
        sortRoster: document.getElementById('sort-roster'),
        rosterTbody: document.getElementById('roster-tbody'),
        
        btnGenerateTeams: document.getElementById('btn-generate-teams'),
        teamsGrid: document.getElementById('teams-grid'),
        
        modalLogin: document.getElementById('modal-login'),
        formLogin: document.getElementById('form-login'),
        loginUsername: document.getElementById('login-username'),
        loginPassword: document.getElementById('login-password'),
        loginError: document.getElementById('login-error'),
        btnCloseLogin: document.getElementById('btn-close-login'),
        
        modalMember: document.getElementById('modal-member'),
        formMember: document.getElementById('form-member'),
        memberModalTitle: document.getElementById('member-modal-title'),
        memberId: document.getElementById('member-id'),
        memberName: document.getElementById('member-name'),
        memberClass: document.getElementById('member-class'),
        memberPower: document.getElementById('member-power'),
        memberNotes: document.getElementById('member-notes'),
        btnCloseMember: document.getElementById('btn-close-member')
    };

    // Initialization Sequence
    function init() {
        loadData();
        checkSessionAuth();
        setupEventListeners();
        render();
    }

    // Load from LocalStorage Persistence Engine
    function loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                state.members = JSON.parse(stored);
            } catch (e) {
                console.error("Failed parsing localStorage roster state data structure.", e);
                state.members = [];
            }
        } else {
            // Default mock data generation template if empty context is found
            state.members = [
                { id: "m1", name: "Mika", class: "Berserker", power: 2450000, notes: "Guild Leader" },
                { id: "m2", name: "Aria", class: "Paladin", power: 2300000, notes: "Main Tank" },
                { id: "m3", name: "Zephyr", class: "Archmage", power: 2100000, notes: "DPS Core" },
                { id: "m4", name: "Luna", class: "Arcanist", power: 2200000, notes: "Support Buffs" },
                { id: "m5", name: "Gideon", class: "Berserker", power: 1950000, notes: "" },
                { id: "m6", name: "Valerie", class: "Paladin", power: 1850000, notes: "" }
            ];
            saveToStorage();
        }
    }

    function saveToStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.members));
    }

    function checkSessionAuth() {
        const sessionAuth = sessionStorage.getItem(AUTH_KEY);
        if (sessionAuth === "authenticated_master") {
            state.isMaster = true;
        }
    }

    // Combined Pipeline Orchestration Controller Rendering Method
    function render() {
        renderAuthUI();
        calculateAndRenderStats();
        renderRosterTable();
        renderTeamsGrid();
    }

    // Authentication Profile View Adjustments
    function renderAuthUI() {
        if (state.isMaster) {
            el.body.className = "master-mode";
            el.btnLoginTrigger.classList.add('hidden');
            el.btnLogout.classList.remove('hidden');
            el.btnImportTrigger.classList.remove('hidden');
            el.btnAddMember.classList.remove('hidden');
            el.btnGenerateTeams.classList.remove('hidden');
            
            el.statusBanner.className = "status-banner master-bg";
            el.statusText.textContent = "Master Operator Mode (Administrative Controls Active)";
            
            // Show action table column heads
            document.querySelectorAll('.actions-head').forEach(cell => cell.classList.remove('hidden'));
        } else {
            el.body.className = "viewer-mode";
            el.btnLoginTrigger.classList.remove('hidden');
            el.btnLogout.classList.add('hidden');
            el.btnImportTrigger.classList.add('hidden');
            el.btnAddMember.classList.add('hidden');
            el.btnGenerateTeams.classList.add('hidden');
            
            el.statusBanner.className = "status-banner viewer-bg";
            el.statusText.textContent = "Viewing Mode (Read-Only)";
            
            document.querySelectorAll('.actions-head').forEach(cell => cell.classList.add('hidden'));
        }
    }

    // Process statistics calculations
    function calculateAndRenderStats() {
        const count = state.members.length;
        let totalPower = 0;
        state.members.forEach(m => totalPower += parseInt(m.power || 0, 10));
        const avgPower = count > 0 ? Math.round(totalPower / count) : 0;
        
        // Calculate teams mapping allocation configuration matrices dynamically
        const assignmentMap = runTeamGenerationAlgorithm();
        let assignedIds = new Set();
        assignmentMap.forEach(team => {
            if(team.Berserker) assignedIds.add(team.Berserker.id);
            if(team.Paladin) assignedIds.add(team.Paladin.id);
            if(team.Archmage) assignedIds.add(team.Archmage.id);
            if(team.Arcanist) assignedIds.add(team.Arcanist.id);
        });
        const unassignedCount = state.members.filter(m => !assignedIds.has(m.id)).length;

        el.statCount.textContent = count;
        el.statTotalPower.textContent = totalPower.toLocaleString();
        el.statAvgPower.textContent = avgPower.toLocaleString();
        el.statUnassigned.textContent = unassignedCount;
    }

    // Core Ranked Assignment Algorithm Engine Implementation
    function runTeamGenerationAlgorithm() {
        const teams = [];
        
        // 1. Separate all guild members by class
        const classes = { Berserker: [], Paladin: [], Archmage: [], Arcanist: [] };
        state.members.forEach(m => {
            if (classes[m.class]) {
                classes[m.class].push(m);
            }
        });

        // 2. Sort each class from highest power to lowest power
        for (const cls in classes) {
            classes[cls].sort((a, b) => b.power - a.power);
        }

        // 3. Process team filling linearly up to maximum 15 groups
        const maxTeams = 15;
        for (let i = 0; i < maxTeams; i++) {
            const bPlayer = classes.Berserker[i] || null;
            const pPlayer = classes.Paladin[i] || null;
            const mPlayer = classes.Archmage[i] || null;
            const aPlayer = classes.Arcanist[i] || null;

            // Break cycle if no players left in any array pipelines
            if (!bPlayer && !pPlayer && !mPlayer && !aPlayer) {
                break;
            }

            teams.push({
                teamNumber: i + 1,
                Berserker: bPlayer,
                Paladin: pPlayer,
                Archmage: mPlayer,
                Arcanist: aPlayer
            });
        }
        return teams;
    }

    // Render data row filters matrix representation
    function renderRosterTable() {
        const searchQuery = el.searchPlayer.value.toLowerCase().trim();
        const selectedClass = el.filterClass.value;
        const activeSort = el.sortRoster.value;

        // Calculate assigned teams cache index map to show badge context inline inside column matrix rows
        const teamsMap = runTeamGenerationAlgorithm();
        const playerTeamCache = {};
        teamsMap.forEach(t => {
            if (t.Berserker) playerTeamCache[t.Berserker.id] = t.teamNumber;
            if (t.Paladin) playerTeamCache[t.Paladin.id] = t.teamNumber;
            if (t.Archmage) playerTeamCache[t.Archmage.id] = t.teamNumber;
            if (t.Arcanist) playerTeamCache[t.Arcanist.id] = t.teamNumber;
        });

        // Process search and selector filtering options arrays pipelines
        let filtered = state.members.filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(searchQuery);
            const matchesClass = selectedClass === "" || m.class === selectedClass;
            return matchesSearch && matchesClass;
        });

        // Sort execution algorithms mapping
        filtered.sort((a, b) => {
            if (activeSort === "power-desc") return b.power - a.power;
            if (activeSort === "power-asc") return a.power - b.power;
            if (activeSort === "name-asc") return a.name.localeCompare(b.name);
            if (activeSort === "class-asc") return a.class.localeCompare(b.class);
            if (activeSort === "team-asc") {
                const tA = playerTeamCache[a.id] || 999;
                const tB = playerTeamCache[b.id] || 999;
                return tA - tB;
            }
            return 0;
        });

        el.rosterTbody.innerHTML = "";

        if (filtered.length === 0) {
            el.rosterTbody.innerHTML = `<tr><td colspan="${state.isMaster ? 5 : 4}" style="text-align: center; color: var(--text-muted);">No members matched current filter options or list is empty.</td></tr>`;
            return;
        }

        filtered.forEach(m => {
            const tr = document.createElement('tr');
            const teamNum = playerTeamCache[m.id];
            const teamBadge = teamNum ? `<span class="badge badge-team">Team ${teamNum}</span>` : `<span class="badge badge-unassigned">Unassigned</span>`;
            
            let actionsCell = "";
            if (state.isMaster) {
                actionsCell = `
                    <td class="action-buttons-cell">
                        <button class="btn btn-secondary btn-sm edit-btn" data-id="${m.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${m.id}">Delete</button>
                    </td>
                `;
            }

            tr.innerHTML = `
                <td><strong>${escapeHtml(m.name)}</strong><br><small style="color: var(--text-muted); font-size: 0.75rem;">${escapeHtml(m.notes || '')}</small></td>
                <td><span class="badge badge-${m.class.toLowerCase()}">${m.class}</span></td>
                <td style="font-family: monospace; font-weight:600;">${m.power.toLocaleString()}</td>
                <td>${teamBadge}</td>
                ${actionsCell}
            `;
            el.rosterTbody.appendChild(tr);
        });

        // Attach dynamic master access button listener functions bound directly inside table arrays blocks context
        if (state.isMaster) {
            el.rosterTbody.querySelectorAll('.edit-btn').forEach(b => {
                b.addEventListener('click', () => openMemberModal(b.getAttribute('data-id')));
            });
            el.rosterTbody.querySelectorAll('.delete-btn').forEach(b => {
                b.addEventListener('click', () => deleteMember(b.getAttribute('data-id')));
            });
        }
    }

    // Render team grid layout display components card modules framework
    function renderTeamsGrid() {
        const teams = runTeamGenerationAlgorithm();
        el.teamsGrid.innerHTML = "";

        if (teams.length === 0) {
            el.teamsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); background-color: var(--bg-secondary); border-radius: 8px; border: 1px dashed var(--border-color)">No team structures available. Add characters with matching data configurations matrix models to initiate automatic generation builds.</div>`;
            return;
        }

        const classesList = ["Berserker", "Paladin", "Archmage", "Arcanist"];

        teams.forEach(t => {
            let totalTeamPower = 0;
            let memberCount = 0;
            let slotsHtml = "";

            classesList.forEach(cls => {
                const player = t[cls];
                if (player) {
                    totalTeamPower += parseInt(player.power, 10);
                    memberCount++;
                    slotsHtml += `
                        <div class="slot-item">
                            <span class="badge badge-${cls.toLowerCase()}">${cls}</span>
                            <span class="slot-player-name" title="${escapeHtml(player.name)}">${escapeHtml(player.name)}</span>
                            <span class="slot-player-power">${player.power.toLocaleString()}</span>
                        </div>
                    `;
                } else {
                    slotsHtml += `
                        <div class="slot-item missing">
                            <span class="badge badge-${cls.toLowerCase()}" style="opacity: 0.4;">${cls}</span>
                            <span class="missing-text">Missing Composition Slot</span>
                            <span>—</span>
                        </div>
                    `;
                }
            });

            const card = document.createElement('div');
            card.className = "team-card";
            card.innerHTML = `
                <div class="team-card-header">
                    <span class="team-title">Team ${t.teamNumber} <small style="font-weight:normal; font-size:0.75rem; color: var(--text-muted)">(${memberCount}/4)</small></span>
                    <span class="team-power-sum">${totalTeamPower.toLocaleString()} CP</span>
                </div>
                <div class="team-member-slots">
                    ${slotsHtml}
                </div>
            `;
            el.teamsGrid.appendChild(card);
        });
    }

    // CRUD Command Operations Framework
    function openMemberModal(id = null) {
        if (!state.isMaster) return;
        el.formMember.reset();
        
        if (id) {
            el.memberModalTitle.textContent = "Edit Guild Member Record";
            const target = state.members.find(m => m.id === id);
            if (!target) return;
            el.memberId.value = target.id;
            el.memberName.value = target.name;
            el.memberClass.value = target.class;
            el.memberPower.value = target.power;
            el.memberNotes.value = target.notes || "";
        } else {
            el.memberModalTitle.textContent = "Add New Roster Entry";
            el.memberId.value = "";
        }
        el.modalMember.classList.remove('hidden');
    }

    function deleteMember(id) {
        if (!state.isMaster) return;
        if (confirm("Are you certain you want to remove this guild member configuration entry row matrix object data profile?")) {
            state.members = state.members.filter(m => m.id !== id);
            saveToStorage();
            render();
        }
    }

    // Event Registration Configurations Listeners Management Interface Block Pipeline
    function setupEventListeners() {
        // UI Trigger Toggles
        el.btnLoginTrigger.addEventListener('click', () => {
            el.loginUsername.value = "";
            el.loginPassword.value = "";
            el.loginError.classList.add('hidden');
            el.modalLogin.classList.remove('hidden');
        });
        
        el.btnCloseLogin.addEventListener('click', () => el.modalLogin.classList.add('hidden'));
        
        el.btnLogout.addEventListener('click', () => {
            state.isMaster = false;
            sessionStorage.removeItem(AUTH_KEY);
            render();
        });

        // Login Implementation Sequence Pipeline
        el.formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = el.loginUsername.value.trim();
            const p = el.loginPassword.value;

            if (u === MASTER_USER && p === MASTER_PASS) {
                state.isMaster = true;
                sessionStorage.setItem(AUTH_KEY, "authenticated_master");
                el.modalLogin.classList.add('hidden');
                render();
            } else {
                el.loginError.classList.remove('hidden');
            }
        });

        // Member Data Record Mutator Form Processing Pipelines
        el.btnAddMember.addEventListener('click', () => openMemberModal());
        el.btnCloseMember.addEventListener('click', () => el.modalMember.classList.add('hidden'));

        el.formMember.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!state.isMaster) return;

            const mid = el.memberId.value;
            const mData = {
                name: el.memberName.value.trim(),
                class: el.memberClass.value,
                power: parseInt(el.memberPower.value, 10) || 0,
                notes: el.memberNotes.value.trim()
            };

            if (mid) {
                // Edit mode updating cycle matching routine
                const idx = state.members.findIndex(m => m.id === mid);
                if (idx !== -1) {
                    state.members[idx] = { ...state.members[idx], ...mData };
                }
            } else {
                // Add mode dynamic key construction sequence allocation logic pipeline
                mData.id = "mem_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                state.members.push(mData);
            }

            saveToStorage();
            el.modalMember.classList.add('hidden');
            render();
        });

        // Filter and real-time refresh updates bindings mapping triggers execution pipelines
        el.searchPlayer.addEventListener('input', renderRosterTable);
        el.filterClass.addEventListener('change', renderRosterTable);
        el.sortRoster.addEventListener('change', renderRosterTable);
        
        // Manual Algorithm Trigger button element logic connection
        el.btnGenerateTeams.addEventListener('click', () => {
            renderTeamsGrid();
            calculateAndRenderStats();
            alert("Ranked optimization algorithm composition matrix processed successfully configuration rows!");
        });

        // JSON Data Import and Export Management System Operations Setup
        el.btnExport.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.members, null, 4));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "sxs_guild_roster_export.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });

        el.btnImportTrigger.addEventListener('click', () => el.fileImport.click());
        
        el.fileImport.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (Array.isArray(parsed)) {
                        // Basic property checks layout structure mapping template arrays array elements logic validation matrix
                        const isValid = parsed.every(item => item.name && item.class && item.hasOwnProperty('power'));
                        if (isValid) {
                            state.members = parsed.map(item => ({
                                id: item.id || "mem_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
                                name: String(item.name),
                                class: String(item.class),
                                power: parseInt(item.power, 10) || 0,
                                notes: String(item.notes || "")
                            }));
                            saveToStorage();
                            render();
                            alert(`Import completed successfully! Loaded ${state.members.length} members configuration data items profile metadata lists.`);
                        } else {
                            alert("Import runtime failure: Sub-items failed validation metrics layout constraints check parsing loops template fields.");
                        }
                    } else {
                        alert("Import schema failure: Root content object container elements data parsed successfully must represent a JSON array mapping stack structural layout parameters.");
                    }
                } catch(err) {
                    alert("Fatal validation parse error occurred read raw file structure layout: " + err.message);
                }
            };
            reader.readAsText(file);
            el.fileImport.value = ""; // flush input state
        });
    }

    // Helper Utility String Escaper
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }

    // Start App Architecture
    window.addEventListener('DOMContentLoaded', init);
})();
