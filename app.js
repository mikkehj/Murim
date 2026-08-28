(() => {
  'use strict';

  // ============================================================
  // CONFIGURATION
  // ============================================================

  const KEY = 'sxs_guild_planner_v4';
  const SESSION = 'sxs_guild_master_v4';

  const CLASSES = [
    'Berserker',
    'Paladin',
    'Archmage',
    'Arcanist'
  ];


  // ============================================================
  // STATE
  // ============================================================

  let state = load();

  let master =
    sessionStorage.getItem(SESSION) === 'true';


  // ============================================================
  // ELEMENT HELPERS
  // ============================================================

  const $ = id => document.getElementById(id);


  const e = {
    loginBtn: $('loginBtn'),
    logoutBtn: $('logoutBtn'),
    exportBtn: $('exportBtn'),
    importBtn: $('importBtn'),

    status: $('status'),

    memberCount: $('memberCount'),
    totalPower: $('totalPower'),
    averagePower: $('averagePower'),
    unassigned: $('unassigned'),

    roster: $('roster'),
    empty: $('empty'),

    addBtn: $('addBtn'),
    generate: $('generate'),

    teams: $('teams'),
    noTeams: $('noTeams'),

    search: $('search'),
    classFilter: $('classFilter'),
    sort: $('sort'),

    login: $('login'),
    loginForm: $('loginForm'),
    user: $('user'),
    pass: $('pass'),
    loginError: $('loginError'),

    memberDialog: $('memberDialog'),
    memberForm: $('memberForm'),
    memberTitle: $('memberTitle'),
    memberId: $('memberId'),
    memberName: $('memberName'),
    memberClass: $('memberClass'),
    memberPower: $('memberPower'),
    memberNotes: $('memberNotes')
  };


  // ============================================================
  // LOCAL STORAGE
  // ============================================================

  function load() {

    try {

      const x =
        JSON.parse(
          localStorage.getItem(KEY) || 'null'
        );

      if (
        x &&
        Array.isArray(x.members)
      ) {

        return {
          members: x.members,
          teams: Array.isArray(x.teams)
            ? x.teams
            : []
        };

      }

    } catch (_) {
      // Ignore invalid localStorage data.
    }

    return {
      members: [],
      teams: []
    };
  }


  function save() {

    localStorage.setItem(
      KEY,
      JSON.stringify(state)
    );

  }


  // ============================================================
  // HELPERS
  // ============================================================

  function uid() {

    if (
      typeof crypto !== 'undefined' &&
      crypto.randomUUID
    ) {

      return crypto.randomUUID();

    }

    return (
      Date.now().toString(36) +
      Math.random()
        .toString(36)
        .slice(2)
    );

  }


  function power(n) {

    return Number(n || 0)
      .toLocaleString('en-US');

  }


  function esc(v) {

    return String(v ?? '')
      .replace(
        /[&<>"']/g,
        c => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[c])
      );

  }


  // ============================================================
  // TEAM GENERATION
  // ============================================================
  //
  // Required:
  //
  // 1 Paladin
  // 1 Arcanist
  // 2 DPS
  //
  // DPS =
  // Berserker + Archmage
  //
  // Team 1 gets the strongest available players.
  // Team 2 gets the next strongest, etc.
  //
  // Maximum = 15 teams.
  //
  // ============================================================

  function gen(ms) {

    const paladins = ms
      .filter(
        m => m.class === 'Paladin'
      )
      .sort(
        (a, b) =>
          Number(b.power) -
            Number(a.power) ||
          a.name.localeCompare(b.name)
      );


    const arcanists = ms
      .filter(
        m => m.class === 'Arcanist'
      )
      .sort(
        (a, b) =>
          Number(b.power) -
            Number(a.power) ||
          a.name.localeCompare(b.name)
      );


    // Berserkers and Archmages share
    // the same DPS pool.

    const dps = ms
      .filter(
        m =>
          m.class === 'Berserker' ||
          m.class === 'Archmage'
      )
      .sort(
        (a, b) =>
          Number(b.power) -
            Number(a.power) ||
          a.name.localeCompare(b.name)
      );


    // A complete team requires:
    //
    // 1 Paladin
    // 1 Arcanist
    // 2 DPS

    const teamCount = Math.min(
      15,
      paladins.length,
      arcanists.length,
      Math.floor(dps.length / 2)
    );


    const out = [];


    for (
      let i = 0;
      i < teamCount;
      i++
    ) {

      const players = [

        paladins[i],

        arcanists[i],

        dps[i * 2],

        dps[i * 2 + 1]

      ];


      out.push({

        number: i + 1,

        playerIds:
          players.map(
            p => p.id
          )

      });

    }


    return out;
  }


  // ============================================================
  // TEAM MAP
  // ============================================================

  function teamMap() {

    const map = new Map();


    state.teams.forEach(team => {

      (team.playerIds || [])
        .forEach(id => {

          map.set(
            id,
            team.number
          );

        });

    });


    return map;
  }


  // ============================================================
  // CLASS BADGE
  // ============================================================

  function classBadge(cls) {

    return `
      <span class="badge ${esc(cls)}">
        ${esc(cls)}
      </span>
    `;

  }


  // ============================================================
  // MAIN RENDER
  // ============================================================

  function render() {

    // ----------------------------------------------------------
    // Login button
    // ----------------------------------------------------------

    e.loginBtn.hidden = master;


    // ----------------------------------------------------------
    // Master-only controls
    // ----------------------------------------------------------

    e.logoutBtn.hidden = !master;

    e.exportBtn.hidden = !master;

    e.addBtn.hidden = !master;

    e.generate.hidden = !master;


    // ----------------------------------------------------------
    // IMPORTANT:
    //
    // Load from GitHub is MASTER ONLY.
    //
    // The HTML also has hidden on the button, but we control
    // it here as well so logging out immediately hides it.
    // ----------------------------------------------------------

    e.importBtn.hidden = !master;


    // ----------------------------------------------------------
    // Status
    // ----------------------------------------------------------

    e.status.className =
      'status' +
      (master ? ' master' : '');


    e.status.textContent = master

      ? 'Master mode — edit, generate, export, or load the shared roster from GitHub.'

      : 'Viewer mode — roster and teams are read-only.';


    // ----------------------------------------------------------
    // Refresh everything
    // ----------------------------------------------------------

    stats();

    roster();

    teams();

  }


  // ============================================================
  // STATISTICS
  // ============================================================

  function stats() {

    const total =
      state.members.reduce(
        (sum, m) =>
          sum + Number(m.power || 0),
        0
      );


    const tm = teamMap();


    e.memberCount.textContent =
      state.members.length;


    e.totalPower.textContent =
      power(total);


    e.averagePower.textContent =
      state.members.length
        ? power(
            Math.round(
              total /
              state.members.length
            )
          )
        : '0';


    e.unassigned.textContent =
      state.members.filter(
        m => !tm.has(m.id)
      ).length;

  }


  // ============================================================
  // ROSTER TABLE
  // ============================================================

  function roster() {

    const q =
      e.search.value
        .trim()
        .toLowerCase();


    const cf =
      e.classFilter.value;


    const s =
      e.sort.value;


    const tm =
      teamMap();


    let rows =
      state.members.filter(
        m =>
          (
            !q ||
            String(m.name)
              .toLowerCase()
              .includes(q)
          ) &&
          (
            !cf ||
            m.class === cf
          )
      );


    // ----------------------------------------------------------
    // Sorting
    // ----------------------------------------------------------

    rows.sort(
      (a, b) => {

        if (s === 'pd') {

          return (
            Number(b.power) -
              Number(a.power)
          );

        }


        if (s === 'pa') {

          return (
            Number(a.power) -
              Number(b.power)
          );

        }


        if (s === 'name') {

          return a.name.localeCompare(
            b.name
          );

        }


        if (s === 'class') {

          return (
            a.class.localeCompare(
              b.class
            ) ||
            a.name.localeCompare(
              b.name
            )
          );

        }


        // Team sorting

        return (
          (tm.get(a.id) || 99) -
          (tm.get(b.id) || 99)
        );

      }
    );


    // ----------------------------------------------------------
    // Render rows
    // ----------------------------------------------------------

    e.roster.innerHTML =
      rows.map(
        m => `

          <tr>

            <td>

              <b>
                ${esc(m.name)}
              </b>

              ${
                m.notes
                  ? `
                    <div class="muted">
                      ${esc(m.notes)}
                    </div>
                  `
                  : ''
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

                  ? `
                    <span class="badge team">
                      Team ${tm.get(m.id)}
                    </span>
                  `

                  : `
                    <span class="muted">
                      Unassigned
                    </span>
                  `
              }

            </td>


            <td
              class="actions-head"
              style="${
                master
                  ? ''
                  : 'display:none'
              }"
            >

              <div class="actions">

                <button
                  class="mini"
                  data-edit="${esc(m.id)}"
                >
                  Edit
                </button>


                <button
                  class="mini danger"
                  data-delete="${esc(m.id)}"
                >
                  Delete
                </button>

              </div>

            </td>

          </tr>

        `
      ).join('');


    e.empty.hidden =
      rows.length > 0;

  }


  // ============================================================
  // TEAM DISPLAY
  // ============================================================

  function teams() {

    e.noTeams.hidden =
      state.teams.length > 0;


    e.teams.innerHTML =
      state.teams.map(
        t => {

          const ps =
            (t.playerIds || [])
              .map(
                id =>
                  state.members.find(
                    m => m.id === id
                  )
              )
              .filter(Boolean);


          const present =
            new Set(
              ps.map(
                p => p.class
              )
            );


          const hasPaladin =
            present.has(
              'Paladin'
            );


          const hasArcanist =
            present.has(
              'Arcanist'
            );


          // Berserker + Archmage = DPS

          const dpsCount =
            ps.filter(
              p =>
                p.class === 'Berserker' ||
                p.class === 'Archmage'
            ).length;


          const missing = [];


          if (!hasPaladin) {

            missing.push(
              'Paladin'
            );

          }


          if (!hasArcanist) {

            missing.push(
              'Arcanist'
            );

          }


          if (dpsCount < 2) {

            missing.push(
              `${2 - dpsCount} DPS`
            );

          }


          const total =
            ps.reduce(
              (sum, p) =>
                sum + Number(p.power),
              0
            );


          return `

            <article class="teamcard">

              <div class="teamtop">

                <h3>
                  Team ${t.number}
                </h3>

                <b>
                  ${power(total)}
                </b>

              </div>


              <div class="meta">

                <span>
                  ${ps.length}/4 players
                </span>

                ${
                  [...present]
                    .map(
                      c =>
                        classBadge(c)
                    )
                    .join('')
                }

              </div>


              <ul class="players">

                ${
                  ps.map(
                    p => `

                      <li>

                        <div>

                          <b>
                            ${esc(p.name)}
                          </b>

                          <small>
                            ${esc(p.class)}
                          </small>

                        </div>

                        <b>
                          ${power(p.power)}
                        </b>

                      </li>

                    `
                  ).join('')
                }

              </ul>


              ${
                missing.length

                  ? `
                    <div class="missing">
                      Missing:
                      ${missing.join(', ')}
                    </div>
                  `

                  : `
                    <div class="present">
                      Balanced team:
                      1 Paladin +
                      1 Arcanist +
                      2 DPS
                    </div>
                  `
              }

            </article>

          `;

        }
      ).join('');

  }


  // ============================================================
  // ADD MEMBER
  // ============================================================

  function openAdd() {

    if (!master) return;


    e.memberForm.reset();

    e.memberId.value = '';

    e.memberTitle.textContent =
      'Add Member';


    e.memberDialog.showModal();

    e.memberName.focus();

  }


  // ============================================================
  // EDIT MEMBER
  // ============================================================

  function openEdit(id) {

    if (!master) return;


    const m =
      state.members.find(
        x => x.id === id
      );


    if (!m) return;


    e.memberId.value =
      m.id;


    e.memberName.value =
      m.name;


    e.memberClass.value =
      m.class;


    e.memberPower.value =
      m.power;


    e.memberNotes.value =
      m.notes || '';


    e.memberTitle.textContent =
      'Edit Member';


    e.memberDialog.showModal();

  }


  // ============================================================
  // LOGIN BUTTON
  // ============================================================

  e.loginBtn.onclick = () => {

    e.loginError.hidden = true;

    e.loginForm.reset();

    e.login.showModal();

    e.user.focus();

  };


  // ============================================================
  // LOGOUT
  // ============================================================

  e.logoutBtn.onclick = () => {

    master = false;

    sessionStorage.removeItem(
      SESSION
    );

    render();

  };


  // ============================================================
  // ADD MEMBER BUTTON
  // ============================================================

  e.addBtn.onclick =
    openAdd;


  // ============================================================
  // GENERATE TEAMS
  // ============================================================

  e.generate.onclick = () => {

    if (!master) return;


    state.teams =
      gen(state.members);


    save();

    render();

  };


  // ============================================================
  // LOGIN FORM
  // ============================================================

  e.loginForm.onsubmit = x => {

    x.preventDefault();


    const username =
      e.user.value;


    const password =
      e.pass.value;


    if (
      username === 'Mika' &&
      password === 'EvilEnvy'
    ) {

      master = true;


      sessionStorage.setItem(
        SESSION,
        'true'
      );


      e.login.close();


      render();


    } else {

      e.loginError.hidden =
        false;

    }

  };


  // ============================================================
  // ADD / EDIT MEMBER FORM
  // ============================================================

  e.memberForm.onsubmit = x => {

    x.preventDefault();


    if (!master) return;


    const name =
      e.memberName.value.trim();


    const cls =
      e.memberClass.value;


    const p =
      Number(
        e.memberPower.value
      );


    const notes =
      e.memberNotes.value.trim();


    // Validate

    if (
      !name ||
      !CLASSES.includes(cls) ||
      !Number.isFinite(p) ||
      p < 0
    ) {

      return;

    }


    const id =
      e.memberId.value;


    // ----------------------------------------------------------
    // Edit existing member
    // ----------------------------------------------------------

    if (id) {

      const m =
        state.members.find(
          x => x.id === id
        );


      if (m) {

        Object.assign(
          m,
          {
            name,
            class: cls,
            power: p,
            notes
          }
        );

      }

    }


    // ----------------------------------------------------------
    // Add new member
    // ----------------------------------------------------------

    else {

      state.members.push({

        id: uid(),

        name,

        class: cls,

        power: p,

        notes

      });

    }


    // Editing a player can change
    // team composition.

    state.teams = [];


    save();

    e.memberDialog.close();

    render();

  };


  // ============================================================
  // ROSTER ACTIONS
  // ============================================================

  e.roster.onclick = x => {

    const ed =
      x.target.closest(
        '[data-edit]'
      );


    const del =
      x.target.closest(
        '[data-delete]'
      );


    // Edit

    if (ed && master) {

      openEdit(
        ed.dataset.edit
      );

      return;

    }


    // Delete

    if (
      del &&
      master
    ) {

      const m =
        state.members.find(
          z =>
            z.id ===
            del.dataset.delete
        );


      if (
        m &&
        confirm(
          `Delete "${m.name}"?`
        )
      ) {

        state.members =
          state.members.filter(
            z =>
              z.id !== m.id
          );


        // Remove the player
        // from any existing teams.

        state.teams =
          state.teams
            .map(
              t => ({
                ...t,

                playerIds:
                  (
                    t.playerIds ||
                    []
                  ).filter(
                    id =>
                      id !== m.id
                  )

              })
            )
            .filter(
              t =>
                t.playerIds.length
            );


        save();

        render();

      }

    }

  };


  // ============================================================
  // EXPORT JSON
  // ============================================================

  e.exportBtn.onclick = () => {

    if (!master) return;


    const data = {

      format:
        'sword-x-staff-guild-planner',

      version: 4,

      exportedAt:
        new Date().toISOString(),

      members:
        state.members,

      teams:
        state.teams

    };


    const blob =
      new Blob(
        [
          JSON.stringify(
            data,
            null,
            2
          )
        ],
        {
          type:
            'application/json'
        }
      );


    const a =
      document.createElement(
        'a'
      );


    a.href =
      URL.createObjectURL(
        blob
      );


    a.download =
      'sword-x-staff-roster.json';


    a.click();


    URL.revokeObjectURL(
      a.href
    );

  };


  // ============================================================
  // LOAD ROSTER FROM GITHUB
  // ============================================================

  async function loadFromGitHub(
    silent = false
  ) {

    // ----------------------------------------------------------
    // SECURITY / ACCESS CHECK
    //
    // Only the Master may manually use this function.
    //
    // The automatic page-load call below uses silent=true and
    // is allowed to load the public roster for viewers.
    // ----------------------------------------------------------

    if (
      !silent &&
      !master
    ) {

      return;

    }


    const old =
      e.importBtn.textContent;


    e.importBtn.disabled =
      true;


    e.importBtn.textContent =
      'Loading…';


    try {

      const r =
        await fetch(
          `roster.json?v=${Date.now()}`,
          {
            cache:
              'no-store'
          }
        );


      if (!r.ok) {

        throw new Error(
          `HTTP ${r.status}`
        );

      }


      const data =
        await r.json();


      if (
        !Array.isArray(
          data.members
        )
      ) {

        throw new Error(
          'Invalid roster'
        );

      }


      // --------------------------------------------------------
      // Clean / validate imported members
      // --------------------------------------------------------

      const members =
        data.members

          .map(
            m => ({

              id:
                String(
                  m.id ||
                  uid()
                ),

              name:
                String(
                  m.name ||
                  ''
                ).trim(),

              class:
                m.class,

              power:
                Number(
                  m.power
                ),

              notes:
                String(
                  m.notes ||
                  ''
                )

            })
          )

          .filter(
            m =>
              m.name &&
              CLASSES.includes(
                m.class
              ) &&
              Number.isFinite(
                m.power
              ) &&
              m.power >= 0
          );


      // --------------------------------------------------------
      // Manual Master load asks for confirmation
      // --------------------------------------------------------

      if (
        !silent &&
        !confirm(
          `Load ${members.length} members from GitHub? This replaces the current local roster.`
        )
      ) {

        return;

      }


      // --------------------------------------------------------
      // Replace local roster
      // --------------------------------------------------------

      state = {

        members,

        teams: []

      };


      // Automatically generate
      // ranked teams.

      state.teams =
        gen(
          state.members
        );


      save();

      render();


      if (!silent) {

        alert(
          'Roster loaded from GitHub successfully.'
        );

      }

    } catch (err) {

      console.error(err);


      if (!silent) {

        alert(
          'Could not load roster.json from GitHub Pages. Make sure roster.json exists in the published site root.'
        );

      }

    } finally {

      e.importBtn.disabled =
        false;


      e.importBtn.textContent =
        old;

    }

  }


  // ============================================================
  // LOAD FROM GITHUB BUTTON
  // ============================================================

  e.importBtn.onclick = () => {

    if (!master) return;

    loadFromGitHub(false);

  };


  // ============================================================
  // CLOSE DIALOG BUTTONS
  // ============================================================

  document
    .querySelectorAll(
      '[data-close]'
    )
    .forEach(
      b => {

        b.onclick = () => {

          const dialog =
            $(b.dataset.close);


          if (dialog) {

            dialog.close();

          }

        };

      }
    );


  // ============================================================
  // SEARCH / FILTER / SORT
  // ============================================================

  [
    e.search,
    e.classFilter,
    e.sort
  ].forEach(
    x =>
      x.addEventListener(
        'input',
        roster
      )
  );


  // ============================================================
  // INITIAL RENDER
  // ============================================================

  render();


  // ============================================================
  // AUTOMATIC GITHUB LOAD
  // ============================================================
  //
  // This happens for everyone when the page opens.
  //
  // It is silent:
  // - no confirmation
  // - no alert
  //
  // This means viewers can still see the current shared roster,
  // while the actual "Load from GitHub" button remains hidden
  // unless the user is logged in as Master.
  //
  // ============================================================

  loadFromGitHub(true);

})();
