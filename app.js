(() => {
  'use strict';
  const KEY = 'sxs_guild_planner_v4';
  const SESSION = 'sxs_guild_master_v4';
  const CLASSES = ['Berserker', 'Paladin', 'Archmage', 'Arcanist'];
  let state = load();
  let master = sessionStorage.getItem(SESSION) === 'true';
  let ocrWorker = null;
  let ocrBusy = false;
  let pendingRows = [];
  const $ = id => document.getElementById(id);
  const e = {
    loginBtn: $('loginBtn'),
    logoutBtn: $('logoutBtn'),
    exportBtn: $('exportBtn'),
    importBtn: $('importBtn'),
    screenshotBtn: $('screenshotBtn'),
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
    memberFourV4: $('memberFourV4'),
    memberNotes: $('memberNotes'),
    screenshotDialog: $('screenshotDialog'),
    screenshotFiles: $('screenshotFiles'),
    ocrProgress: $('ocrProgress'),
    ocrResults: $('ocrResults'),
    ocrSummary: $('ocrSummary'),
    applyScreenshots: $('applyScreenshots'),
    clearScreenshots: $('clearScreenshots')
  };
  // Make the screenshot review dialog wider
  if (e.screenshotDialog) {
    e.screenshotDialog.style.width = 'min(1100px, 96vw)';
    e.screenshotDialog.style.maxWidth = '1100px';
  }
  /* =========================================================
     STORAGE
  ========================================================= */
  function normalizeMember(m) {
    return {
      id: String(m.id || uid()),
      name: String(m.name || '').trim(),
      class: m.class,
      power: Number(m.power),
      notes: String(m.notes || ''),
      // Default to true so existing rosters stay eligible for teams
      fourV4: m.fourV4 !== false
    };
  }
  function load() {
    try {
      const x = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (x && Array.isArray(x.members)) {
        return {
          members: x.members.map(normalizeMember).filter(
            m =>
              m.name &&
              CLASSES.includes(m.class) &&
              Number.isFinite(m.power) &&
              m.power >= 0
          ),
          teams: Array.isArray(x.teams) ? x.teams : []
        };
      }
    } catch (_) {}
    return { members: [], teams: [] };
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function uid() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  function power(n) {
    return Number(n || 0).toLocaleString('en-US');
  }
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }
  /* =========================================================
     TEAM GENERATION — only members with fourV4 === true
  ========================================================= */
  function gen(ms) {
    const eligible = ms.filter(m => m.fourV4 !== false);
  
    const paladins = eligible
      .filter(m => m.class === 'Paladin')
      .sort((a, b) => Number(b.power) - Number(a.power) || a.name.localeCompare(b.name));
    const arcanists = eligible
      .filter(m => m.class === 'Arcanist')
      .sort((a, b) => Number(b.power) - Number(a.power) || a.name.localeCompare(b.name));
    const dps = eligible
      .filter(m => m.class === 'Berserker' || m.class === 'Archmage')
      .sort((a, b) => Number(b.power) - Number(a.power) || a.name.localeCompare(b.name));
  
    const used = new Set();
    const out = [];
    let teamNum = 1;
  
    // 1. Form as many ideal teams as possible (1 Paladin + 1 Arcanist + 2 DPS)
    let p = 0, a = 0, d = 0;
    while (
      teamNum <= 15 &&
      p < paladins.length &&
      a < arcanists.length &&
      d + 1 < dps.length
    ) {
      const team = [paladins[p++], arcanists[a++], dps[d++], dps[d++]];
      team.forEach(m => used.add(m.id));
      out.push({
        number: teamNum++,
        playerIds: team.map(m => m.id)
      });
    }
  
    // 2. Remaining players → pack into extra teams of 4 (mostly pure DPS)
    const remaining = eligible
      .filter(m => !used.has(m.id))
      .sort((a, b) => Number(b.power) - Number(a.power) || a.name.localeCompare(b.name));
  
    for (let i = 0; i + 3 < remaining.length && teamNum <= 15; i += 4) {
      out.push({
        number: teamNum++,
        playerIds: remaining.slice(i, i + 4).map(m => m.id)
      });
    }
  
    return out;
  }
  /* =========================================================
     DISPLAY
  ========================================================= */
  function teamMap() {
    const m = new Map();
    state.teams.forEach(t => (t.playerIds || []).forEach(id => m.set(id, t.number)));
    return m;
  }
  function classBadge(cls) {
    return `<span class="badge ${esc(cls)}">${esc(cls)}</span>`;
  }
  function render() {
    e.loginBtn.hidden = master;
    e.logoutBtn.hidden = !master;
    e.exportBtn.hidden = !master;
    e.importBtn.hidden = false;
    e.screenshotBtn.hidden = !master;
    e.addBtn.hidden = !master;
    e.generate.hidden = !master;
    e.status.className = 'status' + (master ? ' master' : '');
    e.status.textContent = master
      ? 'Master mode — edit, generate, export, or update the roster from screenshots. Toggle 4v4 to include/exclude players from teams.'
      : 'Viewer mode — roster and teams are read-only.';
    stats();
    roster();
    teams();
  }
  function stats() {
    const total = state.members.reduce((s, m) => s + Number(m.power || 0), 0);
    const tm = teamMap();
    e.memberCount.textContent = state.members.length;
    e.totalPower.textContent = power(total);
    e.averagePower.textContent = state.members.length
      ? power(Math.round(total / state.members.length))
      : '0';
    e.unassigned.textContent = state.members.filter(m => !tm.has(m.id)).length;
  }
  function roster() {
    const q = e.search.value.trim().toLowerCase();
    const cf = e.classFilter.value;
    const s = e.sort.value;
    const tm = teamMap();
    let rows = state.members.filter(
      m => (!q || m.name.toLowerCase().includes(q)) && (!cf || m.class === cf)
    );
    rows.sort((a, b) =>
      s === 'pd'
        ? Number(b.power) - Number(a.power)
        : s === 'pa'
        ? Number(a.power) - Number(b.power)
        : s === 'name'
        ? a.name.localeCompare(b.name)
        : s === 'class'
        ? a.class.localeCompare(b.class) || a.name.localeCompare(b.name)
        : (tm.get(a.id) || 99) - (tm.get(b.id) || 99)
    );
    e.roster.innerHTML = rows
      .map(
        m => {
          const included = m.fourV4 !== false;
          return `
      <tr class="${included ? '' : 'excluded-4v4'}">
        <td class="col-4v4">
          <input
            type="checkbox"
            class="fourv4-check"
            data-fourv4="${m.id}"
            ${included ? 'checked' : ''}
            ${master ? '' : 'disabled'}
            title="${included ? 'Included in 4v4 teams' : 'Excluded from 4v4 teams'}"
          >
        </td>
        <td>
          <b>${esc(m.name)}</b>
          ${m.notes ? `<div class="muted">${esc(m.notes)}</div>` : ''}
        </td>
        <td>${classBadge(m.class)}</td>
        <td>${power(m.power)}</td>
        <td>
          ${
            tm.has(m.id)
              ? `<span class="badge team">Team ${tm.get(m.id)}</span>`
              : '<span class="muted">Unassigned</span>'
          }
        </td>
        <td class="actions-head" style="${master ? '' : 'display:none'}">
          <div class="actions">
            <button class="mini" data-edit="${m.id}">Edit</button>
            <button class="mini danger" data-delete="${m.id}">Delete</button>
          </div>
        </td>
      </tr>`;
        }
      )
      .join('');
    e.empty.hidden = rows.length > 0;
  }
  function teams() {
    e.noTeams.hidden = state.teams.length > 0;
    e.teams.innerHTML = state.teams
      .map(t => {
        const ps = (t.playerIds || [])
          .map(id => state.members.find(m => m.id === id))
          .filter(Boolean);
        const present = new Set(ps.map(p => p.class));
        const hasPaladin = present.has('Paladin');
        const hasArcanist = present.has('Arcanist');
        const dpsCount = ps.filter(p => p.class === 'Berserker' || p.class === 'Archmage').length;
        const missing = [];
        if (!hasPaladin) missing.push('Paladin');
        if (!hasArcanist) missing.push('Arcanist');
        if (dpsCount < 2) missing.push(`${2 - dpsCount} DPS`);
        const total = ps.reduce((s, p) => s + Number(p.power), 0);
        return `
        <article class="teamcard">
          <div class="teamtop">
            <h3>Team ${t.number}</h3>
            <b>${power(total)}</b>
          </div>
          <div class="meta">
            <span>${ps.length}/4 players</span>
            ${[...present].map(c => classBadge(c)).join('')}
          </div>
          <ul class="players">
            ${ps
              .map(
                p => `
              <li>
                <div>
                  <b>${esc(p.name)}</b>
                  <small>${esc(p.class)}</small>
                </div>
                <b>${power(p.power)}</b>
              </li>`
              )
              .join('')}
          </ul>
          ${
            missing.length
              ? `<div class="missing">Missing: ${missing.join(', ')}</div>`
              : `<div class="present">Balanced team: 1 Paladin + 1 Arcanist + 2 DPS</div>`
          }
        </article>`;
      })
      .join('');
  }
  /* =========================================================
     MEMBER EDITING
  ========================================================= */
  function openAdd() {
    e.memberForm.reset();
    e.memberId.value = '';
    e.memberFourV4.checked = true;
    e.memberTitle.textContent = 'Add Member';
    e.memberDialog.showModal();
    e.memberName.focus();
  }
  function openEdit(id) {
    const m = state.members.find(x => x.id === id);
    if (!m) return;
    e.memberId.value = m.id;
    e.memberName.value = m.name;
    e.memberClass.value = m.class;
    e.memberPower.value = m.power;
    e.memberFourV4.checked = m.fourV4 !== false;
    e.memberNotes.value = m.notes || '';
    e.memberTitle.textContent = 'Edit Member';
    e.memberDialog.showModal();
  }
  /* =========================================================
     LOGIN / MEMBER EVENTS
  ========================================================= */
  e.loginBtn.onclick = () => {
    e.loginError.hidden = true;
    e.loginForm.reset();
    e.login.showModal();
    e.user.focus();
  };
  e.logoutBtn.onclick = () => {
    master = false;
    sessionStorage.removeItem(SESSION);
    render();
  };
  e.addBtn.onclick = openAdd;
  e.generate.onclick = () => {
    if (!master) return;
    state.teams = gen(state.members);
    save();
    render();
  };
  e.loginForm.onsubmit = x => {
    x.preventDefault();
    if (e.user.value === 'Mika' && e.pass.value === 'EvilEnvy') {
      master = true;
      sessionStorage.setItem(SESSION, 'true');
      e.login.close();
      render();
    } else {
      e.loginError.hidden = false;
    }
  };
  e.memberForm.onsubmit = x => {
    x.preventDefault();
    if (!master) return;
    const name = e.memberName.value.trim();
    const cls = e.memberClass.value;
    const p = Number(e.memberPower.value);
    const notes = e.memberNotes.value.trim();
    const fourV4 = e.memberFourV4.checked;
    if (!name || !CLASSES.includes(cls) || !Number.isFinite(p) || p < 0) return;
    const id = e.memberId.value;
    if (id) {
      const m = state.members.find(x => x.id === id);
      if (m) Object.assign(m, { name, class: cls, power: p, notes, fourV4 });
    } else {
      state.members.push({ id: uid(), name, class: cls, power: p, notes, fourV4 });
    }
    state.teams = [];
    save();
    e.memberDialog.close();
    render();
  };
  e.roster.onclick = x => {
    const ed = x.target.closest('[data-edit]');
    const del = x.target.closest('[data-delete]');
    const four = x.target.closest('[data-fourv4]');
    if (four && master) {
      const id = four.dataset.fourv4;
      const m = state.members.find(z => z.id === id);
      if (m) {
        m.fourV4 = four.checked;
        // Clear teams so user must regenerate with the new eligibility
        state.teams = [];
        save();
        render();
      }
      return;
    }
    if (ed && master) openEdit(ed.dataset.edit);
    if (del && master) {
      const m = state.members.find(z => z.id === del.dataset.delete);
      if (m && confirm(`Delete "${m.name}"?`)) {
        state.members = state.members.filter(z => z.id !== m.id);
        state.teams = state.teams
          .map(t => ({
            ...t,
            playerIds: (t.playerIds || []).filter(id => id !== m.id)
          }))
          .filter(t => t.playerIds.length);
        save();
        render();
      }
    }
  };
  /* =========================================================
     EXPORT
  ========================================================= */
  e.exportBtn.onclick = () => {
    if (!master) return;
    const data = {
      format: 'sword-x-staff-guild-planner',
      version: 4,
      exportedAt: new Date().toISOString(),
      members: state.members,
      teams: state.teams
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'roster.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  /* =========================================================
     LOAD FROM GITHUB
  ========================================================= */
  async function loadFromGitHub(silent = false) {
    const old = e.importBtn.textContent;
    e.importBtn.disabled = true;
    e.importBtn.textContent = 'Loading…';
    try {
      const r = await fetch(`roster.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!Array.isArray(data.members)) throw Error('Invalid roster');
      const members = data.members
        .map(normalizeMember)
        .filter(
          m =>
            m.name &&
            CLASSES.includes(m.class) &&
            Number.isFinite(m.power) &&
            m.power >= 0
        );
      if (
        !silent &&
        !confirm(
          `Load ${members.length} members from GitHub? This replaces the current local roster.`
        )
      )
        return;
      state = { members, teams: gen(members) };
      save();
      render();
      if (!silent) alert('Roster loaded from GitHub successfully.');
    } catch (err) {
      console.error(err);
      if (!silent) {
        alert(
          'Could not load roster.json from GitHub Pages. Make sure roster.json exists in the published site root.'
        );
      }
    } finally {
      e.importBtn.disabled = false;
      e.importBtn.textContent = old;
    }
  }
  e.importBtn.onclick = () => loadFromGitHub(false);
  /* =========================================================
     NAME / POWER / CLASS HELPERS
  ========================================================= */
  function normalizeName(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
  function similarity(a, b) {
    a = normalizeName(a);
    b = normalizeName(b);
    if (!a || !b) return 0;
    if (a === b) return 1;
    const prev = Array(b.length + 1).fill(0);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          cur[j - 1] + 1,
          prev[j] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
    }
    return 1 - prev[b.length] / Math.max(a.length, b.length);
  }
  function findMatch(name) {
    const n = normalizeName(name);
    if (!n) return null;
    const exact = state.members.find(m => normalizeName(m.name) === n);
    if (exact) return { member: exact, score: 1, exact: true };
    let best = null;
    let bestScore = 0;
    state.members.forEach(m => {
      const s = similarity(name, m.name);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    });
    return best && bestScore >= 0.72 ? { member: best, score: bestScore, exact: false } : null;
  }
  function parsePower(text) {
    // Strip leading garbage that the black sword/staff icon often produces
    let s = String(text || '')
      .replace(/,/g, '.')
      .replace(/\s+/g, '')
      .replace(/^[^0-9]*/, ''); // everything before first digit
    // Common OCR mistakes from the icon
    s = s.replace(/^[9R%K]+(?=\d)/i, '');
    const m = s.match(/(\d+(?:\.\d+)?)\s*([KMB])/i);
    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n)) return null;
    const mult = { K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()];
    return Math.round(n * mult);
  }
  function cleanOcrName(text) {
    let s = String(text || '')
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
    s = s
      .replace(/^[^A-Za-z0-9À-ÿ_^?'. -]+/, '')
      .replace(/[^A-Za-z0-9À-ÿ_^?'. -]+$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!s) return '';
    if (
      /^(expert|iii|ii|i|rank|power|this|week|total|online|contribution|login|status|guildmates)$/i.test(
        s
      )
    )
      return '';
    if (/^[\d.,%]+[KMB]?$/i.test(s)) return '';
    return s;
  }
  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, s, v];
  }
  function cropCanvas(source, x, y, w, h, scale = 3) {
    x = Math.max(0, Math.floor(x));
    y = Math.max(0, Math.floor(y));
    w = Math.max(1, Math.min(source.width - x, Math.floor(w)));
    h = Math.max(1, Math.min(source.height - y, Math.floor(h)));
    const c = document.createElement('canvas');
    c.width = w * scale;
    c.height = h * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, x, y, w, h, 0, 0, c.width, c.height);
    return c;
  }
  /* =========================================================
     TESSERACT
  ========================================================= */
  async function getOcrWorker() {
    if (!window.Tesseract) {
      throw Error('OCR library did not load. Check your internet connection.');
    }
    if (!ocrWorker) {
      ocrWorker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text' && e.ocrProgress) {
            e.ocrProgress.textContent = `OCR engine: ${Math.round((m.progress || 0) * 100)}%`;
          }
        }
      });
      await ocrWorker.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '0'
      });
    }
    return ocrWorker;
  }
  /* =========================================================
     CLASS ICON – scan LEFT from the name until we hit a colored icon
     Red = Berserker | Orange = Paladin | Green = Arcanist | Blue = Archmage
  ========================================================= */
  function classifyIcon(canvas, nameX, nameY) {
    const ctx = canvas.getContext('2d');
    const startX = Math.floor(nameX);
    const cy = Math.round(nameY);
    const searchLeft = Math.max(40, startX - 140);
    for (let x = startX - 8; x >= searchLeft; x -= 3) {
      const size = 13;
      const x0 = Math.max(0, x - size);
      const y0 = Math.max(0, cy - size);
      const w = Math.min(size * 2 + 1, canvas.width - x0);
      const h = Math.min(size * 2 + 1, canvas.height - y0);
      const data = ctx.getImageData(x0, y0, w, h).data;
      const counts = { Berserker: 0, Paladin: 0, Arcanist: 0, Archmage: 0 };
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        const [hue, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
        if (s < 0.28 || v < 0.45) continue;
        total++;
        if (hue < 18 || hue > 345) counts.Berserker++; // red
        else if (hue >= 18 && hue < 65) counts.Paladin++; // orange
        else if (hue >= 65 && hue < 175) counts.Arcanist++; // green
        else if (hue >= 175 && hue < 280) counts.Archmage++; // blue
      }
      if (total < 8) continue;
      const best = CLASSES.reduce((a, b) => (counts[b] > counts[a] ? b : a), CLASSES[0]);
      const ratio = counts[best] / total;
      if (ratio >= 0.42) {
        return {
          class: best,
          confidence: ratio,
          iconX: x // used later to calculate power offset
        };
      }
    }
    return { class: null, confidence: 0, iconX: null };
  }
  /* =========================================================
     POWER – start AFTER the class icon so we skip the black sword/staff
  ========================================================= */
  async function readPowerNearName(canvas, nameX, nameY, iconX) {
    // How far is the class icon from the name?
    let offset = 40; // safe fallback
    if (iconX !== null && iconX < nameX) {
      offset = Math.max(35, Math.round(nameX - iconX) + 18);
    }
    const x = Math.max(0, Math.floor(nameX + offset));
    const y = Math.max(0, Math.floor(nameY + 42));
    const width = Math.min(160, canvas.width - x);
    const height = Math.min(48, canvas.height - y);
    if (width < 25 || height < 12) return null;
    let crop = cropCanvas(canvas, x, y, width, height, 4);
    const ctx = crop.getContext('2d');
    const imageData = ctx.getImageData(0, 0, crop.width, crop.height);
    const d = imageData.data;
    // Strong threshold – kills remaining dark icon pixels
    for (let i = 0; i < d.length; i += 4) {
      const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      const v = gray < 150 ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);
    const w = await getOcrWorker();
    await w.setParameters({
      tessedit_pageseg_mode: '7',
      tessedit_char_whitelist: '0123456789.KMB',
      preserve_interword_spaces: '0'
    });
    const r = await w.recognize(crop);
    await w.setParameters({
      tessedit_pageseg_mode: '6',
      tessedit_char_whitelist: '',
      preserve_interword_spaces: '0'
    });
    const text = String(r.data.text || '')
      .replace(/\s+/g, '')
      .trim();
    return {
      text,
      power: parsePower(text),
      confidence: Number(r.data.confidence || 0)
    };
  }
  /* =========================================================
     MAIN SCREENSHOT PROCESSOR
  ========================================================= */
  async function processScreenshot(file, index, total) {
    const img = await new Promise((resolve, reject) => {
      const u = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(u);
        resolve(im);
      };
      im.onerror = () => {
        URL.revokeObjectURL(u);
        reject(Error('Could not read image'));
      };
      im.src = u;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    e.ocrProgress.textContent = `Screenshot ${index}/${total}: reading all text…`;
    const worker = await getOcrWorker();
    await worker.setParameters({
      tessedit_pageseg_mode: '6',
      tessedit_char_whitelist: '',
      preserve_interword_spaces: '0'
    });
    const full = await worker.recognize(c);
    const words = full.data.words || [];
    // ---- Collect name candidates ----
    const nameCandidates = [];
    for (const w of words) {
      const text = String(w.text || '').trim();
      if (!text) continue;
      const conf = Number(w.confidence || w.conf || 0);
      if (conf < 35) continue;
      const x = Number(w.bbox?.x0 || 0);
      const y = Number(w.bbox?.y0 || 0);
      const ww = Number(w.bbox?.x1 || 0) - x;
      const hh = Number(w.bbox?.y1 || 0) - y;
      if (x < 140 || x > 520) continue;
      if (y < 280 || y > c.height - 120) continue;
      const cleaned = cleanOcrName(text);
      if (!cleaned || cleaned.length < 2) continue;
      if (/expert|rank|power|this|week|total|online|contribution/i.test(cleaned)) continue;
      nameCandidates.push({
        text: cleaned,
        x,
        y,
        width: ww,
        height: hh,
        conf,
        cy: y + hh / 2
      });
    }
    nameCandidates.sort((a, b) => a.y - b.y || a.x - b.x);
    // Merge horizontally adjacent fragments
    const merged = [];
    for (const cand of nameCandidates) {
      const last = merged[merged.length - 1];
      if (
        last &&
        Math.abs(cand.y - last.y) < 28 &&
        cand.x - (last.x + last.width) < 35
      ) {
        last.text = (last.text + ' ' + cand.text).replace(/\s+/g, ' ').trim();
        last.width = cand.x + cand.width - last.x;
        last.conf = Math.max(last.conf, cand.conf);
      } else {
        merged.push({ ...cand });
      }
    }
    // Collapse vertical near-duplicates
    const uniqueNames = [];
    for (const m of merged) {
      const prev = uniqueNames[uniqueNames.length - 1];
      if (prev && Math.abs(m.cy - prev.cy) < 45 && similarity(m.text, prev.text) > 0.75) {
        if (m.conf > prev.conf) uniqueNames[uniqueNames.length - 1] = m;
      } else {
        uniqueNames.push(m);
      }
    }
    const out = [];
    for (let i = 0; i < uniqueNames.length; i++) {
      const nm = uniqueNames[i];
      e.ocrProgress.textContent = `Screenshot ${index}/${total}: player ${i + 1}/${
        uniqueNames.length
      }…`;
      // Class: start at name X and walk LEFT until we find a colored icon
      const cls = classifyIcon(c, nm.x, nm.cy);
      if (!cls.class) continue;
      // Power: start after the class icon so we skip the black sword/staff
      const powerResult = await readPowerNearName(c, nm.x, nm.y, cls.iconX);
      if (!powerResult || powerResult.power === null) continue;
      // Skip very low-confidence power on half-visible bottom rows
      if (powerResult.confidence < 25 && powerResult.power < 500000) continue;
      const match = findMatch(nm.text);
      const nameConfidence = nm.conf;
      const confidence = Math.round(
        ((nameConfidence / 100) * 0.4 +
          (powerResult.confidence / 100) * 0.35 +
          cls.confidence * 0.25) *
          100
      );
      out.push({
        name: nm.text,
        class: cls.class,
        power: powerResult.power,
        matchId: match?.member.id || '',
        matchScore: match?.score || 0,
        confidence,
        source: file.name,
        ocr: `${nm.text} ${powerResult.text}`
      });
    }
    return out;
  }
  /* =========================================================
     MERGE DUPLICATE RESULTS FROM MULTIPLE SCREENSHOTS
  ========================================================= */
  function mergeDetected(rows) {
    const map = new Map();
    for (const r of rows) {
      const key = r.matchId ? `id:${r.matchId}` : `name:${normalizeName(r.name)}`;
      if (!key.split(':')[1]) continue;
      const old = map.get(key);
      if (!old || r.confidence > old.confidence) map.set(key, r);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  /* =========================================================
     RENDER OCR REVIEW
  ========================================================= */
  function renderOcrResults() {
    if (!pendingRows.length) {
      e.ocrResults.innerHTML =
        '<div class="muted">No complete player rows were detected.</div>';
      e.ocrSummary.textContent = 'No players detected.';
      e.applyScreenshots.disabled = true;
      return;
    }
    const seenIds = new Set(pendingRows.filter(r => r.matchId).map(r => r.matchId));
    const missing = state.members.filter(m => !seenIds.has(m.id));
    e.ocrSummary.innerHTML =
      `<b>${pendingRows.length}</b> unique players detected. ` +
      (missing.length
        ? `<b>${missing.length}</b> existing players were not detected; they will <u>not</u> be deleted.`
        : 'All existing players were detected.');
    e.ocrResults.innerHTML =
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
            ${pendingRows
              .map(
                (r, i) => `
              <tr>
                <td><input type="checkbox" data-ocr-use="${i}" checked></td>
                <td><input data-ocr-name="${i}" value="${esc(r.name)}"></td>
                <td>
                  <select data-ocr-class="${i}">
                    ${CLASSES.map(
                      c =>
                        `<option ${c === r.class ? 'selected' : ''}>${c}</option>`
                    ).join('')}
                  </select>
                </td>
                <td>
                  <input type="number" min="0" step="1" data-ocr-power="${i}" value="${
                    r.power
                  }">
                </td>
                <td>
                  ${
                    r.matchId
                      ? `Existing${r.matchScore < 1 ? ' (possible match)' : ''}`
                      : 'New player'
                  }
                </td>
                <td>${r.confidence}%</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>` +
      (missing.length
        ? `<details style="margin-top:10px">
            <summary>Not detected (${missing.length}) — not removed</summary>
            <div class="muted" style="margin-top:8px">
              ${missing.map(m => esc(m.name)).join(', ')}
            </div>
          </details>`
        : '');
    e.applyScreenshots.disabled = false;
  }
  /* =========================================================
     RUN OCR ON SELECTED FILES
  ========================================================= */
  async function runScreenshotImport() {
    if (!master) return;
    if (ocrBusy) return;
    if (!e.screenshotFiles.files.length) {
      alert('Please select one or more screenshots first.');
      return;
    }
    if (e.screenshotFiles.files.length > 10) {
      alert('Please upload no more than 10 screenshots at once.');
      return;
    }
    ocrBusy = true;
    e.applyScreenshots.disabled = true;
    e.clearScreenshots.disabled = true;
    pendingRows = [];
    e.ocrResults.innerHTML = '';
    e.ocrSummary.textContent = 'Starting…';
    try {
      const all = [];
      const files = [...e.screenshotFiles.files];
      for (let i = 0; i < files.length; i++) {
        const rows = await processScreenshot(files[i], i + 1, files.length);
        all.push(...rows);
      }
      pendingRows = mergeDetected(all);
      renderOcrResults();
      e.ocrProgress.textContent = `Finished. Detected ${pendingRows.length} unique complete players.`;
      if (!pendingRows.length) {
        alert(
          'I could not detect any complete player rows. Make sure the screenshots show the normal Guildmates → Power layout.'
        );
      }
    } catch (err) {
      console.error(err);
      e.ocrProgress.textContent = 'OCR failed.';
      alert(`Screenshot processing failed.\n\n${err.message || err}`);
    } finally {
      ocrBusy = false;
      e.clearScreenshots.disabled = false;
    }
  }
  /* =========================================================
     COLLECT + APPLY REVIEWED DATA
  ========================================================= */
  function collectOcrRows() {
    return pendingRows
      .map((r, i) => {
        const use = document.querySelector(`[data-ocr-use="${i}"]`);
        if (!use || !use.checked) return null;
        const name = document.querySelector(`[data-ocr-name="${i}"]`)?.value.trim();
        const cls = document.querySelector(`[data-ocr-class="${i}"]`)?.value;
        const p = Number(document.querySelector(`[data-ocr-power="${i}"]`)?.value);
        if (!name || !CLASSES.includes(cls) || !Number.isFinite(p) || p < 0) return null;
        return { name, class: cls, power: p };
      })
      .filter(Boolean);
  }
  function applyScreenshotChanges() {
    if (!master) return;
    const rows = collectOcrRows();
    if (!rows.length) {
      alert('There are no valid checked rows to apply.');
      return;
    }
    let updated = 0;
    let added = 0;
    for (const r of rows) {
      let match = state.members.find(
        m => normalizeName(m.name) === normalizeName(r.name)
      );
      if (!match) {
        const suggestion = findMatch(r.name);
        if (suggestion && suggestion.score >= 0.88) match = suggestion.member;
      }
      if (match) {
        const changed =
          match.name !== r.name ||
          match.class !== r.class ||
          Number(match.power) !== r.power;
        // Preserve existing fourV4 flag on updates
        Object.assign(match, { name: r.name, class: r.class, power: r.power });
        if (changed) updated++;
      } else {
        state.members.push({
          id: uid(),
          name: r.name,
          class: r.class,
          power: r.power,
          notes: '',
          fourV4: true
        });
        added++;
      }
    }
    state.teams = gen(state.members);
    save();
    render();
    e.screenshotDialog.close();
    alert(
      `Roster updated.\n\n${updated} existing players updated\n${added} new players added\n\nPlayers not detected were left unchanged.`
    );
    pendingRows = [];
    e.screenshotFiles.value = '';
  }
  /* =========================================================
     SCREENSHOT UI
  ========================================================= */
  e.screenshotBtn.onclick = () => {
    if (!master) return;
    e.screenshotFiles.value = '';
    e.ocrProgress.textContent =
      'Choose your screenshots, then click Process Screenshots.';
    e.ocrSummary.textContent = '';
    e.ocrResults.innerHTML = '';
    e.applyScreenshots.disabled = true;
    e.screenshotDialog.showModal();
  };
  e.screenshotFiles.onchange = () => {
    if (e.screenshotFiles.files.length) {
      e.ocrSummary.textContent =
        `${e.screenshotFiles.files.length} screenshot` +
        (e.screenshotFiles.files.length === 1 ? '' : 's') +
        ' selected.';
    }
  };
  e.clearScreenshots.onclick = () => {
    if (ocrBusy) return;
    e.screenshotFiles.value = '';
    pendingRows = [];
    e.ocrResults.innerHTML = '';
    e.ocrSummary.textContent = '';
    e.ocrProgress.textContent =
      'Choose your screenshots, then click Process Screenshots.';
    e.applyScreenshots.disabled = true;
  };
  e.applyScreenshots.onclick = applyScreenshotChanges;
  document.querySelectorAll('[data-process-screenshots]').forEach(b => {
    b.onclick = runScreenshotImport;
  });
  /* =========================================================
     GENERAL UI
  ========================================================= */
  document.querySelectorAll('[data-close]').forEach(b => {
    b.onclick = () => $(b.dataset.close).close();
  });
  [e.search, e.classFilter, e.sort].forEach(x =>
    x.addEventListener('input', roster)
  );
  /* =========================================================
     START
  ========================================================= */
  render();
  loadFromGitHub(true);
})();
