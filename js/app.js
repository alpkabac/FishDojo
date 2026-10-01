/* FishDojo – app state, grade picker, student/teacher UI. Data lives in this browser's localStorage. */
(function () {
  const FD = window.FD;
  const KEY = 'fishdojo-v1';
  const MAX_STUDENTS = 24;
  const GRADES = [
    { id: 'g2', num: '2nd', label: '2nd Grade' },
    { id: 'g3', num: '3rd', label: '3rd Grade' },
    { id: 'g4', num: '4th', label: '4th Grade' },
  ];
  const DEFAULT_DEEDS = [
    { id: 'help', icon: '🤝', name: 'Helping Others' },
    { id: 'kind', icon: '💛', name: 'Kindness' },
    { id: 'work', icon: '💪', name: 'Hard Work' },
    { id: 'part', icon: '🙋', name: 'Participating' },
    { id: 'listen', icon: '👂', name: 'Good Listening' },
    { id: 'team', icon: '🏆', name: 'Teamwork' },
    { id: 'clean', icon: '🧹', name: 'Cleaning Up' },
    { id: 'star', icon: '⭐', name: 'Great Work' },
  ];
  const DEMO_NAMES = ['Ava', 'Liam', 'Mia', 'Noah', 'Emma', 'Lucas', 'Sofia', 'Ethan', 'Zoe', 'Mason', 'Lily', 'Leo',
    'Chloe', 'Jack', 'Aria', 'Owen', 'Nora', 'Eli', 'Ruby', 'Kai', 'Ivy', 'Max', 'Luna', 'Sam'];

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---------------------------------------------------------------- state
  function freshState() {
    const grades = {};
    GRADES.forEach((g) => (grades[g.id] = { students: [], log: [] }));
    return { v: 1, grades, deeds: DEFAULT_DEEDS.slice(), sound: true, locked: false, pin: '', current: null };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.grades) {
        const base = freshState();
        GRADES.forEach((g) => { if (!s.grades[g.id]) s.grades[g.id] = base.grades[g.id]; if (!s.grades[g.id].log) s.grades[g.id].log = []; });
        if (!Array.isArray(s.deeds) || !s.deeds.length) s.deeds = DEFAULT_DEEDS.slice();
        return Object.assign(base, s);
      }
    } catch (e) { /* ignore */ }
    return freshState();
  }
  let state = load();
  let saveWarned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { if (!saveWarned) { saveWarned = true; alert('Could not save – this browser may be in private mode. Progress will be lost when the page closes.'); } }
  }
  const grade = () => state.grades[state.current];
  const student = (id) => grade().students.find((s) => s.id === id);
  function log(entry) {
    const g = grade();
    g.log.push(Object.assign({ t: Date.now() }, entry));
    if (g.log.length > 500) g.log.splice(0, g.log.length - 500);
  }
  function newStudent(name, i) {
    const keys = FD.SPECIES_KEYS;
    return {
      id: uid(), name: name.trim().slice(0, 24),
      species: keys[i % keys.length],
      color: i >= keys.length ? FD.FISH_COLORS[1 + ((i * 5) % (FD.FISH_COLORS.length - 1))].id : '',
      fed: 0, food: 0, deeds: {},
    };
  }

  // ---------------------------------------------------------------- stage scaling
  const stage = $('#stage');
  const canvas = $('#tank');
  const scene = new FD.Scene(canvas);
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
    scene.resize(s);
  }
  addEventListener('resize', fit);
  fit();

  // ---------------------------------------------------------------- header
  function renderHud() {
    document.body.classList.toggle('locked', !!state.locked);
    $('#btnLock').textContent = state.locked ? '🔒' : '🔓';
    $('#btnLock').title = state.locked ? 'Student mode is ON – tap to unlock' : 'Turn on student mode';
    $('#btnSound').textContent = state.sound ? '🔊' : '🔇';
    FD.Sound.enabled = !!state.sound;
    const tabs = $('#gradeTabs');
    tabs.innerHTML = GRADES.map((g) => `<button class="tab ${g.id === state.current ? 'active' : ''}" data-g="${g.id}">${g.num}</button>`).join('');
    if (state.current) {
      const st = grade().students;
      const meals = st.reduce((a, s) => a + (s.fed || 0), 0);
      $('#classStats').innerHTML = `<b>${st.length}</b> fish · <b>${meals}</b> meals`;
      $('#empty').classList.toggle('hidden', st.length > 0);
    }
  }
  $('#gradeTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (b) enterGrade(b.dataset.g);
  });
  $('#btnHome').onclick = () => { if (!state.locked) showPicker(); };
  $('#btnSound').onclick = () => { state.sound = !state.sound; save(); renderHud(); FD.Sound.click(); };
  $('#btnFull').onclick = toggleFullscreen;
  $('#btnLock').onclick = () => (state.locked ? unlock() : lock());
  $('#btnSettings').onclick = () => openSettings();
  $('#btnClassDeed').onclick = openClassDeed;
  $('#btnFeedAll').onclick = feedingTime;
  $('#btnEmptySetup').onclick = () => openSettings();
  $('#btnEmptyDemo').onclick = () => {
    const g = grade();
    g.students = DEMO_NAMES.map((n, i) => {
      const s = newStudent(n, i);
      s.fed = Math.floor(Math.random() * 40);
      s.food = Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 3) : 0;
      return s;
    });
    save(); refresh();
  };

  function toggleFullscreen() {
    const d = document;
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const el = d.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    } else {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    }
  }
  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    if (e.key === 'Escape') closeModal();
  });

  // keep the smartboard awake while the tank is showing
  let wakeLock = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => (wakeLock = null)); } } catch (e) { /* ignore */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.current) keepAwake(); });
  document.addEventListener('pointerdown', () => FD.Sound.unlock(), { once: true });

  // ---------------------------------------------------------------- picker
  function showPicker() {
    closeModal();
    state.current = null; save();
    $('#picker').classList.remove('hidden');
    $('#empty').classList.add('hidden');
    $('#hud').style.visibility = 'hidden';
    scene.setAmbient();
    $('#gradeCards').innerHTML = GRADES.map((g) => {
      const st = state.grades[g.id].students;
      const meals = st.reduce((a, s) => a + (s.fed || 0), 0);
      return `<button class="grade-card" data-g="${g.id}"><span class="num">${g.num}</span><span class="lbl">GRADE</span>
        <span class="meta">${st.length ? `${st.length} fish · ${meals} meals` : 'Tap to set up'}</span></button>`;
    }).join('');
  }
  $('#gradeCards').addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (b) { FD.Sound.click(); enterGrade(b.dataset.g); }
  });

  function enterGrade(id) {
    state.current = id; save();
    $('#picker').classList.add('hidden');
    $('#hud').style.visibility = 'visible';
    refresh();
    keepAwake();
  }
  function refresh() {
    if (!state.current) return;
    scene.setStudents(grade().students);
    renderHud();
  }

  scene.onEat = () => { renderHud(); refreshOpenStudent(); };
  scene.onFishTap = (id) => { FD.Sound.click(); openStudent(id); };

  // ---------------------------------------------------------------- modal helpers
  const root = $('#modalRoot');
  let modalCleanup = null;
  function openModal(html, { small = false, onClose } = {}) {
    closeModal();
    root.innerHTML = `<div class="backdrop"><div class="modal ${small ? 'small' : ''}"><button class="btn close" data-close>✕</button>${html}</div></div>`;
    const bd = root.firstElementChild;
    bd.addEventListener('pointerdown', (e) => { if (e.target === bd) closeModal(); });
    bd.querySelector('[data-close]').onclick = closeModal;
    modalCleanup = onClose || null;
    return bd.querySelector('.modal');
  }
  function closeModal() {
    if (!root.firstElementChild) return;
    root.innerHTML = '';
    const c = modalCleanup;
    modalCleanup = null;
    openStudentId = null;
    if (c) c();
  }

  // ---------------------------------------------------------------- student modal
  let openStudentId = null;
  let previewRaf = 0;

  function deedName(id) { const d = state.deeds.find((x) => x.id === id); return d ? d.name : id; }

  function openStudent(id) {
    const s = student(id);
    if (!s) return;
    const deeds = state.deeds.map((d) => `
      <button class="deed" data-deed="${esc(d.id)}"><span class="ic">${esc(d.icon)}</span>${esc(d.name)}
      <span class="plus">+1 FOOD</span></button>`).join('');
    const m = openModal(`
      <div class="sm-head">
        <canvas class="sm-fish" width="300" height="210"></canvas>
        <div class="sm-info">
          <div class="sm-name">${esc(s.name)}</div>
          <div class="chips" data-chips></div>
          <div class="progress"><div class="bar"><i data-bar></i></div><small data-next></small></div>
        </div>
      </div>
      <div class="teacher-only">
        <h3>GOOD DEEDS → FOOD</h3>
        <div class="deed-grid">${deeds}</div>
      </div>
      <div class="sm-actions">
        <button class="btn btn-orange feed-btn" data-feed></button>
        <button class="btn btn-dark teacher-only" data-undo>↶ Undo</button>
      </div>`, { onClose: () => cancelAnimationFrame(previewRaf) });
    openStudentId = id;

    m.querySelectorAll('[data-deed]').forEach((b) => (b.onclick = () => {
      giveDeed(id, b.dataset.deed);
      b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    }));
    m.querySelector('[data-feed]').onclick = () => {
      const st = student(id);
      if (!st || !st.food) { FD.Sound.oops(); return; }
      feedStudent(id);
      closeModal();
    };
    m.querySelector('[data-undo]').onclick = () => undo(id);
    refreshOpenStudent();

    // animated preview
    const cv = m.querySelector('.sm-fish'), g = cv.getContext('2d');
    let t0 = performance.now();
    const draw = (now) => {
      const st = student(id);
      if (!st || !cv.isConnected) return;
      const sp = FD.getFish(st.species, st.color);
      const px = Math.floor(Math.min(270 / sp.w, 180 / sp.h));
      const f = Math.floor(Math.max(0, now - t0) / 160) % 4;
      g.clearRect(0, 0, cv.width, cv.height);
      g.imageSmoothingEnabled = false;
      const y = Math.round(Math.sin((now - t0) / 500) * 6);
      g.drawImage(sp.frames[f], (cv.width - sp.w * px) / 2, (cv.height - sp.h * px) / 2 + y, sp.w * px, sp.h * px);
      previewRaf = requestAnimationFrame(draw);
    };
    previewRaf = requestAnimationFrame(draw);
  }

  function refreshOpenStudent() {
    if (!openStudentId) return;
    const s = student(openStudentId);
    const m = root.querySelector('.modal');
    if (!s || !m) return;
    const f = scene.fish.get(s.id);
    const fed = f ? f.displayFed : s.fed;
    const li = FD.levelIndex(fed), lv = FD.LEVELS[li], next = FD.LEVELS[li + 1];
    m.querySelector('[data-chips]').innerHTML = `
      <span class="chip">Fed <b>${fed}</b> times</span>
      <span class="chip">Size <b style="color:${lv.color}">${lv.name}</b> · Lv ${li + 1}</span>
      <span class="chip food">Food <b>${s.food}</b></span>`;
    const pct = next ? ((fed - lv.min) / (next.min - lv.min)) * 100 : 100;
    m.querySelector('[data-bar]').style.width = Math.max(2, Math.min(100, pct)) + '%';
    m.querySelector('[data-next]').textContent = next ? `${next.min - fed} more meal${next.min - fed === 1 ? '' : 's'} to grow ${next.name.toUpperCase()}` : 'Maximum size – a true Legend! 👑';
    const fb = m.querySelector('[data-feed]');
    fb.disabled = !s.food;
    fb.textContent = s.food ? `🍤 FEED MY FISH! (${s.food})` : (state.locked ? 'No food yet – do a good deed!' : 'No food yet – give a good deed');
    m.querySelectorAll('[data-deed]').forEach((b) => {
      const n = (s.deeds || {})[b.dataset.deed] || 0;
      let c = b.querySelector('.cnt');
      if (!c) { c = document.createElement('span'); c.className = 'cnt'; b.appendChild(c); }
      c.textContent = n ? `×${n}` : '';
    });
  }

  // ---------------------------------------------------------------- actions
  function giveDeed(id, deedId) {
    const s = student(id);
    if (!s) return;
    s.food = (s.food || 0) + 1;
    s.deeds = s.deeds || {};
    s.deeds[deedId] = (s.deeds[deedId] || 0) + 1;
    log({ sid: id, type: 'deed', deed: deedId });
    save();
    FD.Sound.deed();
    scene.cheer(id, `+1 ${deedName(deedId)}`);
    renderHud();
    refreshOpenStudent();
  }

  function feedStudent(id) {
    const s = student(id);
    if (!s || !s.food) return;
    const n = s.food;
    s.fed = (s.fed || 0) + n;
    s.food = 0;
    log({ sid: id, type: 'feed', n });
    save();
    scene.feed(id, n);
    renderHud();
  }

  function undo(id) {
    const g = grade(), s = student(id);
    for (let i = g.log.length - 1; i >= 0; i--) {
      const e = g.log[i];
      if (e.sid !== id) continue;
      if (e.type === 'deed') {
        s.food = Math.max(0, s.food - 1);
        if (s.deeds && s.deeds[e.deed]) s.deeds[e.deed]--;
        scene.say(id, `Undo: ${deedName(e.deed)}`, '#ffad4d');
      } else if (e.type === 'feed') {
        s.fed = Math.max(0, s.fed - e.n);
        s.food += e.n;
        scene.cancelFeed(id, e.n);
        scene.say(id, 'Undo feeding', '#ffad4d');
      }
      g.log.splice(i, 1);
      save(); FD.Sound.oops(); renderHud(); refreshOpenStudent();
      return;
    }
    FD.Sound.oops();
  }

  function openClassDeed() {
    if (!grade().students.length) return;
    const deeds = state.deeds.map((d) => `<button class="deed" data-deed="${esc(d.id)}"><span class="ic">${esc(d.icon)}</span>${esc(d.name)}<span class="plus">+1 FOOD EACH</span></button>`).join('');
    const m = openModal(`<h2>⭐ WHOLE CLASS DEED</h2><p class="note">Everyone in the class gets 1 food.</p><div class="deed-grid">${deeds}</div>`);
    m.querySelectorAll('[data-deed]').forEach((b) => (b.onclick = () => {
      const d = b.dataset.deed;
      grade().students.forEach((s) => {
        s.food = (s.food || 0) + 1;
        s.deeds = s.deeds || {};
        s.deeds[d] = (s.deeds[d] || 0) + 1;
        scene.cheer(s.id, '+1');
      });
      log({ sid: '*', type: 'class', deed: d });
      save();
      closeModal();
      FD.Sound.fanfare();
      scene.showBanner(`CLASS DEED: ${deedName(d).toUpperCase()}!`, 'Everyone earned +1 food', '#ffe066');
      renderHud();
    }));
  }

  function feedingTime() {
    const hungry = grade().students.filter((s) => s.food > 0);
    if (!hungry.length) {
      scene.showBanner('NO FOOD YET', 'Do good deeds to earn fish food!', '#6fe3ff');
      FD.Sound.oops();
      return;
    }
    FD.Sound.fanfare();
    scene.showBanner('FEEDING TIME!', `${hungry.length} fish are eating`, '#ff9f1c');
    hungry.forEach((s) => feedStudent(s.id));
  }

  // ---------------------------------------------------------------- lock / pin
  function lock() {
    state.locked = true; save(); closeModal(); renderHud();
    scene.showBanner('STUDENT MODE', 'Tap your fish to feed it!', '#6fe3ff');
  }
  function unlock() {
    if (!state.pin) { state.locked = false; save(); renderHud(); return; }
    let entry = '';
    const m = openModal(`<h2>TEACHER PIN</h2><div class="pin-display" data-pin></div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map((k) => `<button class="btn ${k === '✓' ? 'btn-green' : k === 'C' ? 'btn-red' : ''}" data-k="${k}">${k}</button>`).join('')}</div>`, { small: true });
    const disp = m.querySelector('[data-pin]');
    m.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'C') entry = '';
      else if (k === '✓') {
        if (entry === state.pin) { state.locked = false; save(); closeModal(); renderHud(); FD.Sound.deed(); return; }
        entry = ''; FD.Sound.oops(); disp.textContent = 'TRY AGAIN'; return;
      } else if (entry.length < 6) entry += k;
      disp.textContent = '●'.repeat(entry.length);
      FD.Sound.click();
    }));
  }

  // ---------------------------------------------------------------- settings
  let settingsTab = 'students';
  function openSettings(tab) {
    if (tab) settingsTab = tab;
    const g = grade();
    const label = GRADES.find((x) => x.id === state.current).label;
    const tabs = [['students', '🐟 Students'], ['deeds', '⭐ Good Deeds'], ['data', '💾 Backup & Reset'], ['lock', '🔒 Student Mode']]
      .map(([k, t]) => `<button class="btn ${settingsTab === k ? 'btn-yellow' : 'btn-dark'}" data-tab="${k}">${t}</button>`).join('');
    let body = '';
    if (settingsTab === 'students') {
      const speciesOpts = (sel) => FD.SPECIES_KEYS.map((k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${FD.SPECIES[k].name}</option>`).join('');
      const colorOpts = (sel) => FD.FISH_COLORS.map((c) => `<option value="${c.id}" ${c.id === (sel || '') ? 'selected' : ''}>${c.name}</option>`).join('');
      body = `
        <p class="help">${g.students.length} / ${MAX_STUDENTS} students. Pick each student's fish and color.</p>
        <div class="roster">${g.students.map((s, i) => `
          <div class="rrow" data-id="${s.id}">
            <span class="num">${i + 1}</span>
            <canvas width="96" height="64"></canvas>
            <input type="text" maxlength="24" value="${esc(s.name)}" data-f="name">
            <select data-f="species">${speciesOpts(s.species)}</select>
            <select data-f="color">${colorOpts(s.color)}</select>
            <span class="stats">Fed ${s.fed} · 🍤${s.food}</span>
            <button class="btn btn-red" data-del title="Remove">✕</button>
          </div>`).join('')}
        </div>
        <h3>ADD STUDENTS</h3>
        <p class="help">Type or paste names – one per line.</p>
        <textarea data-names placeholder="Ava&#10;Liam&#10;Mia"></textarea>
        <div class="row" style="justify-content:flex-start;margin-top:16px">
          <button class="btn btn-green" data-add ${g.students.length >= MAX_STUDENTS ? 'disabled' : ''}>➕ Add Names</button>
          ${g.students.length ? '' : '<button class="btn btn-blue" data-demo>🐠 Demo Class</button>'}
        </div>`;
    } else if (settingsTab === 'deeds') {
      body = `
        <p class="help">One good deed per line: an emoji, then the name. These are shared by all grades.</p>
        <textarea data-deeds style="height:420px">${esc(state.deeds.map((d) => `${d.icon} ${d.name}`).join('\n'))}</textarea>
        <div class="row" style="justify-content:flex-start;margin-top:16px">
          <button class="btn btn-green" data-save-deeds>💾 Save Deeds</button>
          <button class="btn btn-dark" data-reset-deeds>Restore Defaults</button>
        </div>`;
    } else if (settingsTab === 'data') {
      body = `
        <p class="help">Everything is saved in this browser on this computer. Download a backup now and then, and use it to move your classes to another computer.</p>
        <div class="row" style="justify-content:flex-start">
          <button class="btn btn-blue" data-export>⬇ Download Backup</button>
          <label class="btn btn-dark">⬆ Restore Backup<input type="file" accept=".json,application/json" data-import hidden></label>
        </div>
        <h3>START OVER (${esc(label.toUpperCase())})</h3>
        <div class="row" style="justify-content:flex-start">
          <button class="btn btn-orange" data-reset-fish>Shrink all fish back to babies</button>
          <button class="btn btn-red" data-wipe>Remove all students</button>
        </div>`;
    } else {
      body = `
        <p class="help">Student Mode hides good deeds, class buttons and setup, so students can only feed their own fish. Turn it on with the 🔓 button at the top.</p>
        <p class="help">Optional teacher PIN to turn Student Mode off (leave empty for none):</p>
        <div class="row" style="justify-content:flex-start">
          <input type="password" inputmode="numeric" maxlength="6" data-pin value="${esc(state.pin)}" style="width:260px">
          <button class="btn btn-green" data-save-pin>Save PIN</button>
        </div>`;
    }

    const m = openModal(`<h2>${esc(label.toUpperCase())} SETUP</h2><div class="tabs">${tabs}</div>${body}`, { onClose: refresh });
    m.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => openSettings(b.dataset.tab)));

    if (settingsTab === 'students') {
      m.querySelectorAll('.rrow').forEach((row) => {
        const s = student(row.dataset.id);
        const cv = row.querySelector('canvas');
        const paint = () => {
          const sp = FD.getFish(s.species, s.color), c = cv.getContext('2d');
          const px = Math.floor(Math.min(96 / sp.w, 64 / sp.h)) || 1;
          c.clearRect(0, 0, 96, 64); c.imageSmoothingEnabled = false;
          c.drawImage(sp.frames[0], (96 - sp.w * px) / 2, (64 - sp.h * px) / 2, sp.w * px, sp.h * px);
        };
        paint();
        row.querySelectorAll('[data-f]').forEach((inp) => {
          inp.onchange = () => {
            const v = inp.value;
            if (inp.dataset.f === 'name') { if (!v.trim()) { inp.value = s.name; return; } s.name = v.trim().slice(0, 24); }
            else s[inp.dataset.f] = v;
            save(); paint();
          };
        });
        row.querySelector('[data-del]').onclick = () => {
          if (!confirm(`Remove ${s.name} and their fish?`)) return;
          grade().students = grade().students.filter((x) => x.id !== s.id);
          save(); openSettings();
        };
      });
      const add = m.querySelector('[data-add]');
      if (add) add.onclick = () => {
        const names = m.querySelector('[data-names]').value.split(/\n|,/).map((n) => n.trim()).filter(Boolean);
        const room = MAX_STUDENTS - g.students.length;
        names.slice(0, room).forEach((n) => g.students.push(newStudent(n, g.students.length)));
        if (names.length > room) alert(`Only ${MAX_STUDENTS} students fit in one class – ${names.length - room} name(s) were not added.`);
        save(); openSettings();
      };
      const demo = m.querySelector('[data-demo]');
      if (demo) demo.onclick = () => { closeModal(); $('#btnEmptyDemo').click(); };
    } else if (settingsTab === 'deeds') {
      m.querySelector('[data-save-deeds]').onclick = () => {
        const list = m.querySelector('[data-deeds]').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
          const mm = l.match(/^(\S+)\s+(.+)$/);
          const icon = mm && !/^[a-z0-9]/i.test(mm[1]) ? mm[1] : '⭐';
          const name = (mm && icon === mm[1] ? mm[2] : l).slice(0, 24);
          return { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), icon, name };
        });
        if (!list.length) return;
        state.deeds = list.slice(0, 12);
        save(); openSettings();
      };
      m.querySelector('[data-reset-deeds]').onclick = () => { state.deeds = DEFAULT_DEEDS.slice(); save(); openSettings(); };
    } else if (settingsTab === 'data') {
      m.querySelector('[data-export]').onclick = () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fishdojo-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      };
      m.querySelector('[data-import]').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        file.text().then((txt) => {
          const s = JSON.parse(txt);
          if (!s || !s.grades) throw new Error('bad');
          if (!confirm('Replace ALL classes on this computer with this backup?')) return;
          const cur = state.current;
          localStorage.setItem(KEY, JSON.stringify(s));
          state = load();
          state.current = cur; save();
          closeModal(); refresh();
        }).catch(() => alert('That file is not a FishDojo backup.'));
      };
      m.querySelector('[data-reset-fish]').onclick = () => {
        if (!confirm(`Shrink every ${label} fish back to a baby? Meals, food and deed counts go to 0.`)) return;
        g.students.forEach((s) => { s.fed = 0; s.food = 0; s.deeds = {}; });
        g.log = [];
        scene.setStudents([]);
        save(); openSettings();
      };
      m.querySelector('[data-wipe]').onclick = () => {
        if (!confirm(`Remove ALL ${label} students and their fish? This cannot be undone.`)) return;
        g.students = []; g.log = [];
        save(); openSettings();
      };
    } else {
      m.querySelector('[data-save-pin]').onclick = () => {
        const v = m.querySelector('[data-pin]').value.replace(/\D/g, '').slice(0, 6);
        state.pin = v; save();
        alert(v ? 'PIN saved.' : 'PIN removed.');
      };
    }
  }

  // ---------------------------------------------------------------- boot
  const fontsReady = document.fonts ? Promise.race([
    Promise.all([document.fonts.load('20px "Press Start 2P"'), document.fonts.load('30px VT323')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]) : Promise.resolve();
  fontsReady.then(() => {
    renderHud();
    if (state.locked && state.current) enterGrade(state.current);
    else showPicker();
  });
})();
