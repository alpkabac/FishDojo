/* FishDojo – the aquarium: background, fish behaviour, feeding, effects, labels. */
(function () {
  const FD = (window.FD = window.FD || {});
  const TW = 1920, TH = 972; // tank size in world pixels
  const LP = 6, LW = TW / LP, LH = TH / LP; // low-res background grid (320 x 162)
  const SAND_Y = 140; // low-res row where sand starts
  const LABEL_H = 68;
  const SWIM = { x: 20, y: 64, w: 1880, h: 846 };

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  // ---------------------------------------------------------------- background
  function sandTop(x) {
    return Math.round(SAND_Y + 2 * Math.sin(x * 0.05) + 1.5 * Math.sin(x * 0.13 + 2));
  }

  function drawBackground(cv) {
    const g = cv.getContext('2d');
    const R = rng(42);
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

    // water gradient with ordered dithering
    const water = ['#6fdcf2', '#45c3e6', '#2fa6d2', '#2188bd', '#196ba2', '#145385', '#103f6b'];
    for (let y = 0; y < LH; y++) {
      const t = (y / (LH - 1)) * (water.length - 1);
      const i = Math.min(water.length - 2, Math.floor(t)), f = t - i;
      for (let x = 0; x < LW; x++) px(x, y, f * 16 > BAYER[y % 4][x % 4] ? water[i + 1] : water[i]);
    }
    // surface band
    g.fillStyle = '#b6f0ff'; g.fillRect(0, 0, LW, 1);
    g.fillStyle = '#8fe6fb'; g.fillRect(0, 1, LW, 1);

    // distant hills
    for (let x = 0; x < LW; x++) {
      const h = 18 + 8 * Math.sin(x * 0.031 + 1) + 5 * Math.sin(x * 0.097);
      for (let y = Math.round(SAND_Y - h); y < SAND_Y + 4; y++) px(x, y, (x + y) % 2 ? '#145a86' : '#13537c');
      const h2 = 8 + 5 * Math.sin(x * 0.05 + 3) + 3 * Math.sin(x * 0.17);
      for (let y = Math.round(SAND_Y - h2); y < SAND_Y + 4; y++) px(x, y, '#174f78');
    }

    // sand
    for (let x = 0; x < LW; x++) {
      const top = sandTop(x);
      for (let y = top; y < LH; y++) {
        const d = y - top;
        let c = d === 0 ? '#fff0c9' : d < 3 ? '#f6dca6' : (d - 3) / 18 * 16 > BAYER[y % 4][x % 4] ? '#d9b475' : '#ebc98c';
        const r = R();
        if (d > 1 && r < 0.05) c = '#c79a58';
        else if (d > 1 && r < 0.08) c = '#fff3d6';
        px(x, y, c);
      }
    }

    // decorations on a separate layer, auto-outlined
    const deco = document.createElement('canvas');
    deco.width = LW; deco.height = LH;
    const d = deco.getContext('2d');
    const dp = (x, y, c) => { d.fillStyle = c; d.fillRect(x, y, 1, 1); };
    const dr = (x, y, w, h, c) => { d.fillStyle = c; d.fillRect(x, y, w, h); };

    function rock(cx, base, rx, ry, light, mid, dark) {
      for (let y = base - ry; y <= base; y++)
        for (let x = cx - rx; x <= cx + rx; x++) {
          const u = (x - cx) / rx, v = (y - base) / ry;
          if (u * u + v * v > 1 - R() * 0.12) continue;
          const shade = u * 0.6 - v * 0.8;
          let c = shade < -0.25 ? light : shade < 0.35 ? mid : dark;
          if (R() < 0.08) c = dark;
          dp(x, y, c);
        }
    }
    function coral(x, y, len, ang, w, c1, c2, depth) {
      let cx = x, cy = y;
      for (let i = 0; i < len; i++) {
        cx += Math.cos(ang); cy += Math.sin(ang);
        dr(Math.round(cx), Math.round(cy), w, w, i % 3 === 0 ? c2 : c1);
      }
      if (depth > 0) {
        coral(cx, cy, len * 0.7, ang - 0.6 + R() * 0.2, Math.max(1, w - 1), c1, c2, depth - 1);
        coral(cx, cy, len * 0.7, ang + 0.6 - R() * 0.2, Math.max(1, w - 1), c1, c2, depth - 1);
      }
      dr(Math.round(cx), Math.round(cy), w + 1, w + 1, c2);
    }

    // rocks
    rock(10, 145, 14, 12, '#8796ad', '#66758f', '#4a5670');
    rock(26, 147, 9, 7, '#9aa8bd', '#76839b', '#56627a');
    rock(132, 146, 10, 7, '#8796ad', '#66758f', '#4a5670');
    rock(232, 147, 8, 6, '#9aa8bd', '#76839b', '#56627a');
    // corals
    coral(76, 146, 9, -Math.PI / 2, 2, '#ff6fa3', '#ffa0c6', 2);
    coral(84, 146, 7, -Math.PI / 2 + 0.4, 2, '#ff5b8e', '#ff9cc0', 2);
    coral(182, 147, 8, -Math.PI / 2 - 0.2, 2, '#ff9a3c', '#ffc27a', 2);
    coral(214, 146, 6, -Math.PI / 2 + 0.3, 2, '#b07cff', '#d3b6ff', 1);

    // treasure chest
    const cxs = 38, cys = 128;
    dr(cxs, cys + 6, 22, 11, '#8b5a2b');
    for (let y = cys + 8; y < cys + 17; y += 3) dr(cxs, y, 22, 1, '#6e4420');
    dr(cxs, cys + 1, 22, 5, '#a0692f');
    dr(cxs + 1, cys, 20, 1, '#a0692f');
    dr(cxs, cys + 3, 22, 1, '#7a4c22');
    dr(cxs + 3, cys, 2, 17, '#f2c14e'); dr(cxs + 17, cys, 2, 17, '#f2c14e');
    dr(cxs, cys + 5, 22, 1, '#e0a93a');
    dr(cxs + 9, cys + 4, 4, 5, '#f2c14e'); dp(cxs + 10, cys + 6, '#5a3a00'); dp(cxs + 11, cys + 6, '#5a3a00');
    dp(cxs + 4, cys + 1, '#fff3b0'); dp(cxs + 18, cys + 1, '#fff3b0');

    // castle
    const stone = '#a7b1c6', stoneD = '#7f8aa3', stoneL = '#c9d1e0';
    dr(274, 108, 32, 36, stone);
    dr(266, 92, 13, 52, stone); dr(301, 92, 13, 52, stone);
    dr(276, 101, 4, 43, stoneD); dr(311, 101, 3, 43, stoneD);
    for (let x = 266; x < 279; x += 4) dr(x, 88, 2, 4, stone);
    for (let x = 301; x < 314; x += 4) dr(x, 88, 2, 4, stone);
    for (let x = 279; x < 301; x += 4) dr(x, 104, 2, 4, stone);
    dr(266, 92, 13, 1, stoneL); dr(301, 92, 13, 1, stoneL); dr(279, 108, 22, 1, stoneL);
    for (let i = 0; i < 60; i++) dp(266 + Math.floor(R() * 48), 94 + Math.floor(R() * 48), R() < 0.5 ? stoneD : stoneL);
    // door
    dr(284, 126, 12, 18, '#1d2338'); dr(285, 124, 10, 2, '#1d2338'); dr(287, 123, 6, 1, '#1d2338');
    dr(289, 126, 1, 18, '#2c3552');
    // windows
    dr(271, 100, 3, 5, '#1d2338'); dr(306, 100, 3, 5, '#1d2338'); dr(271, 115, 3, 5, '#1d2338'); dr(306, 115, 3, 5, '#1d2338');
    dr(289, 112, 3, 4, '#ffe066');
    // flag
    dr(307, 74, 1, 14, '#5b4a3a'); dr(308, 74, 6, 4, '#ff3b5c'); dr(308, 78, 3, 1, '#ff3b5c');

    // starfish + shells
    const star = ['..o..', '.ooo.', 'ooooo', '.o.o.', 'o...o'];
    star.forEach((row, y) => [...row].forEach((ch, x) => ch === 'o' && dp(150 + x, 150 + y, x === 2 && y === 2 ? '#ffd0a0' : '#ff8a3d')));
    [[110, 154], [196, 156], [250, 152], [60, 155]].forEach(([x, y], i) => {
      const c = i % 2 ? '#ffd1dc' : '#fff1c4';
      dr(x, y, 3, 2, c); dp(x + 1, y - 1, c); dp(x + 1, y, '#e7a0b4');
    });

    // outline pass for decorations
    const img = d.getImageData(0, 0, LW, LH);
    const a = (x, y) => (x < 0 || y < 0 || x >= LW || y >= LH ? 0 : img.data[(y * LW + x) * 4 + 3]);
    const out = [];
    for (let y = 0; y < LH; y++)
      for (let x = 0; x < LW; x++)
        if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) out.push([x, y]);
    d.fillStyle = '#1b2236';
    out.forEach(([x, y]) => d.fillRect(x, y, 1, 1));
    g.drawImage(deco, 0, 0);
  }

  // ---------------------------------------------------------------- fish
  class Fish {
    constructor(student, cell, ambient) {
      this.student = student;
      this.cell = cell;
      this.ambient = !!ambient;
      this.x = rnd(cell.x + 40, cell.x + cell.w - 40);
      this.y = rnd(cell.y + LABEL_H + 20, cell.y + cell.h - 20);
      this.vx = rnd(-30, 30); this.vy = 0;
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.tx = null; this.ty = null; this.wait = rnd(0, 1.5);
      this.phase = rnd(0, 10); this.anim = rnd(0, 4);
      this.pending = 0; // pellets on their way (already counted in student.fed)
      this.hop = 0; this.chomp = 0; this.glow = 0; this.turn = 0; this.wiggle = 0;
      this.px = null; this.sprite = null; this.spriteKey = '';
      this.refresh();
    }
    get displayFed() { return Math.max(0, (this.student.fed || 0) - this.pending); }
    refresh() {
      const key = this.student.species + '|' + (this.student.color || '');
      if (key !== this.spriteKey) {
        this.sprite = FD.getFish(this.student.species, this.student.color);
        this.spriteKey = key;
      }
    }
  }

  // ---------------------------------------------------------------- scene
  class Scene {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.k = 1;
      this.bg = document.createElement('canvas');
      this.bg.width = LW; this.bg.height = LH;
      drawBackground(this.bg);
      this.dyn = document.createElement('canvas');
      this.dyn.width = LW; this.dyn.height = LH;
      this.dctx = this.dyn.getContext('2d');

      this.fish = new Map();
      this.order = [];
      this.pellets = [];
      this.particles = [];
      this.texts = [];
      this.bubbles = [];
      this.banner = null;
      this.bannerQueue = [];
      this.mode = 'ambient';
      this.sizeMul = 1;
      this.t = 0;
      this.onFishTap = null;
      this.onEat = null;

      const R = rng(7);
      this.weeds = [6, 18, 30, 66, 98, 118, 160, 172, 202, 242, 256, 316].map((x) => ({
        x, h: 22 + Math.floor(R() * 34), seed: R() * 10, dark: R() < 0.5,
      }));
      this.emitters = [{ x: 49, y: 128, rate: 0.5 }, { x: 290, y: 104, rate: 0.35 }, { x: 80, y: 140, rate: 0.15 }, { x: 140, y: 142, rate: 0.12 }];

      canvas.addEventListener('pointerdown', (e) => this.onPointer(e));
      this.last = performance.now();
      const loop = (now) => {
        const dt = clamp((now - this.last) / 1000, 0, 0.05);
        this.last = now;
        this.update(dt);
        this.draw();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    resize(stageScale) {
      const dpr = window.devicePixelRatio || 1;
      const k = Math.max(0.4, stageScale * dpr);
      this.c.width = Math.round(TW * k);
      this.c.height = Math.round(TH * k);
      this.k = this.c.width / TW;
    }

    // ---------- population ----------
    layout(n) {
      let best = null;
      for (let cols = 1; cols <= 8; cols++) {
        const rows = Math.ceil(Math.max(1, n) / cols);
        const cw = SWIM.w / cols, ch = SWIM.h / rows;
        const score = Math.min(cw / 1.55, ch);
        if (!best || score > best.score + 0.01) best = { cols, rows, cw, ch, score };
      }
      const cells = [];
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / best.cols), c = i % best.cols;
        const inRow = Math.min(best.cols, n - r * best.cols);
        const off = ((best.cols - inRow) * best.cw) / 2;
        cells.push({ x: SWIM.x + off + c * best.cw, y: SWIM.y + r * best.ch, w: best.cw, h: best.ch });
      }
      this.sizeMul = clamp(Math.min(best.cw / 313, best.ch / 211), 1, 1.5);
      return cells;
    }

    setStudents(students) {
      this.mode = 'class';
      const ids = new Set(students.map((s) => s.id));
      for (const id of [...this.fish.keys()]) if (!ids.has(id)) this.fish.delete(id);
      this.pellets = this.pellets.filter((p) => ids.has(p.fid));
      const cells = this.layout(students.length);
      students.forEach((s, i) => {
        let f = this.fish.get(s.id);
        if (!f) {
          f = new Fish(s, cells[i]);
          this.fish.set(s.id, f);
        }
        f.student = s;
        f.cell = cells[i];
        f.tx = null;
        f.refresh();
      });
      this.order = students.map((s) => this.fish.get(s.id));
    }

    setAmbient() {
      this.mode = 'ambient';
      this.fish.clear();
      this.pellets = [];
      this.sizeMul = 1.15;
      const cell = { x: SWIM.x, y: SWIM.y - LABEL_H + 40, w: SWIM.w, h: SWIM.h + LABEL_H - 60 };
      const keys = FD.SPECIES_KEYS;
      for (let i = 0; i < 12; i++) {
        const s = { id: 'amb' + i, name: '', species: keys[i % keys.length], color: i >= keys.length ? FD.FISH_COLORS[1 + ((i * 5) % 11)].id : '', fed: Math.floor(rnd(4, 80)), food: 0 };
        this.fish.set(s.id, new Fish(s, cell, true));
      }
      this.order = [...this.fish.values()];
    }

    // ---------- actions ----------
    feed(id, n) {
      const f = this.fish.get(id);
      if (!f || n <= 0) return;
      f.pending += n;
      const cx = f.cell.x + f.cell.w / 2;
      for (let i = 0; i < n; i++) {
        this.pellets.push({
          fid: id, x: clamp(cx + rnd(-f.cell.w * 0.3, f.cell.w * 0.3), 20, TW - 20), y: -10,
          vy: rnd(70, 95), ph: rnd(0, 6), delay: i * 0.45 + rnd(0, 0.15), spawned: false,
        });
      }
    }

    cancelFeed(id, n) {
      const f = this.fish.get(id);
      if (!f) return;
      let k = Math.min(n, f.pending);
      f.pending -= k;
      for (let i = this.pellets.length - 1; i >= 0 && k > 0; i--) {
        if (this.pellets[i].fid === id) { this.pellets.splice(i, 1); k--; }
      }
    }

    cheer(id, text, color) {
      const f = this.fish.get(id);
      if (!f) return;
      f.hop = 0.7;
      f.wiggle = 0.7;
      this.addText(f.x, f.y - 50, text, color || '#ffe066');
      this.burst(f.x, f.y, ['#ffe066', '#ffffff', '#ff8ad8', '#6fe3ff'], 14, 260);
    }

    say(id, text, color) {
      const f = this.fish.get(id);
      if (f) this.addText(f.x, f.y - 40, text, color || '#ffffff');
    }

    showBanner(text, sub, color) {
      this.bannerQueue.push({ text, sub: sub || '', color: color || '#ffe066', life: 3.2, max: 3.2 });
    }

    addText(x, y, text, color, size) {
      // stack texts that pop up in the same spot so they stay readable
      const near = this.texts.filter((t) => Math.abs(t.x - x) < 120 && t.life > t.max - 0.6).length;
      this.texts.push({ x, y: y - near * 34, text, color, size: size || 22, life: 1.8, max: 1.8 });
    }

    burst(x, y, colors, n, speed) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2), s = rnd(speed * 0.3, speed);
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, g: 260, life: rnd(0.6, 1.2), max: 1.2, c: colors[i % colors.length], s: Math.random() < 0.5 ? 6 : 9 });
      }
    }

    // ---------- input ----------
    toWorld(e) {
      const r = this.c.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * TW, y: ((e.clientY - r.top) / r.height) * TH };
    }

    onPointer(e) {
      if (this.mode !== 'class' || !this.onFishTap) return;
      const p = this.toWorld(e);
      let best = null, bd = Infinity;
      for (const f of this.order) {
        const w = f.sprite.w * f.px, h = f.sprite.h * f.px;
        const inBody = Math.abs(p.x - f.x) < w / 2 + 20 && p.y > f.y - h / 2 - LABEL_H - 10 && p.y < f.y + h / 2 + 20;
        if (inBody) {
          const d = Math.hypot(p.x - f.x, p.y - f.y);
          if (d < bd) { bd = d; best = f; }
        }
      }
      if (!best) best = this.order.find((f) => p.x >= f.cell.x && p.x < f.cell.x + f.cell.w && p.y >= f.cell.y && p.y < f.cell.y + f.cell.h);
      if (best) this.onFishTap(best.student.id);
    }

    // ---------- simulation ----------
    update(dt) {
      this.t += dt;
      const t = this.t;

      // bubbles
      for (const em of this.emitters) if (Math.random() < em.rate * dt * 3) this.bubbles.push({ x: em.x + rnd(-2, 2), y: em.y, r: Math.random() < 0.3 ? 2 : 1, vy: rnd(10, 18), ph: rnd(0, 6) });
      for (const b of this.bubbles) { b.y -= b.vy * dt; b.x += Math.sin(t * 3 + b.ph) * 4 * dt; }
      this.bubbles = this.bubbles.filter((b) => b.y > 2);

      // pellets
      for (const p of this.pellets) {
        if (p.delay > 0) { p.delay -= dt; continue; }
        if (!p.spawned) {
          p.spawned = true;
          FD.Sound.plop();
          for (let i = 0; i < 4; i++) this.particles.push({ x: p.x + rnd(-10, 10), y: 4, vx: rnd(-60, 60), vy: rnd(-160, -60), g: 500, life: 0.5, max: 0.5, c: '#d8f8ff', s: 6 });
        }
        const floor = sandTop(Math.floor(p.x / LP)) * LP - 6;
        if (p.y < floor) {
          p.y = Math.min(floor, p.y + p.vy * dt);
          p.x += Math.sin(t * 2.2 + p.ph) * 14 * dt;
        }
      }

      // fish
      for (const f of this.order) {
        const sp = f.sprite;
        const target = FD.pxForFed(f.displayFed) * this.sizeMul;
        f.px = f.px == null ? target : f.px + (target - f.px) * Math.min(1, dt * 2.5);
        const w = sp.w * f.px, h = sp.h * f.px;
        const mouthX = f.x + f.dir * (sp.mouth.x - sp.w / 2) * f.px;
        const mouthY = f.y + (sp.mouth.y - sp.h / 2) * f.px;

        let pel = null, pd = Infinity;
        for (const p of this.pellets) {
          if (p.fid !== f.student.id || !p.spawned) continue;
          if (!f.ambient && p.y < f.cell.y + LABEL_H * 0.6 && p.y < TH - 140) continue; // wait until it sinks into my zone
          const d = Math.hypot(p.x - mouthX, p.y - mouthY);
          if (d < pd) { pd = d; pel = p; }
        }

        let maxSpeed;
        if (pel) {
          maxSpeed = 220;
          f.tx = pel.x - f.dir * (sp.mouth.x - sp.w / 2) * f.px * 0.9;
          f.ty = pel.y;
          if (pd < 16 + f.px * 3) this.eat(f, pel);
        } else {
          maxSpeed = f.ambient ? 70 : 55;
          const c = f.cell;
          const top = f.ambient ? c.y + h / 2 : c.y + LABEL_H + h / 2;
          const reached = f.tx == null || Math.hypot(f.tx - f.x, f.ty - f.y) < 14;
          if (reached) {
            if (f.tx != null && f.wait <= 0) f.wait = rnd(0.6, 2.6);
            f.wait -= dt;
            if (f.wait <= 0 || f.tx == null) {
              const minX = c.x + w / 2 + 6, maxX = c.x + c.w - w / 2 - 6;
              const minY = top, maxY = c.y + c.h - h / 2;
              f.tx = minX < maxX ? rnd(minX, maxX) : c.x + c.w / 2;
              f.ty = minY < maxY ? rnd(minY, maxY) : (minY + maxY) / 2;
              f.wait = 0;
            }
          }
        }

        const dx = f.tx - f.x, dy = f.ty - f.y, dist = Math.hypot(dx, dy) || 1;
        const sp2 = maxSpeed * Math.min(1, dist / 90);
        const ax = (dx / dist) * sp2, ay = (dy / dist) * sp2 * 0.7;
        const steer = Math.min(1, dt * (pel ? 4 : 1.6));
        f.vx += (ax - f.vx) * steer;
        f.vy += (ay - f.vy) * steer;
        f.x = clamp(f.x + f.vx * dt, w / 2, TW - w / 2);
        f.y = clamp(f.y + f.vy * dt, h / 2 + 6, TH - h / 2 - 10);

        const nd = f.vx > 10 ? 1 : f.vx < -10 ? -1 : f.dir;
        if (nd !== f.dir) { f.dir = nd; f.turn = 0.2; }
        const speed = Math.hypot(f.vx, f.vy);
        f.anim += dt * (3 + speed / 22);
        f.hop = Math.max(0, f.hop - dt);
        f.chomp = Math.max(0, f.chomp - dt);
        f.turn = Math.max(0, f.turn - dt);
        f.wiggle = Math.max(0, f.wiggle - dt);
        f.glow = Math.max(0, f.glow - dt);

        // big fish shimmer
        if (FD.levelIndex(f.displayFed) >= 5 && Math.random() < dt * 1.5)
          this.particles.push({ x: f.x + rnd(-w / 2, w / 2), y: f.y + rnd(-h / 2, h / 2), vx: 0, vy: -20, g: 0, life: 0.8, max: 0.8, c: '#fff6b0', s: 6, star: true });
      }

      // particles / texts
      for (const p of this.particles) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const tx of this.texts) { tx.y -= 40 * dt; tx.life -= dt; }
      this.texts = this.texts.filter((tx) => tx.life > 0);

      if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
      if (!this.banner && this.bannerQueue.length) this.banner = this.bannerQueue.shift();
    }

    eat(f, pel) {
      this.pellets.splice(this.pellets.indexOf(pel), 1);
      const before = FD.levelIndex(f.displayFed);
      f.pending = Math.max(0, f.pending - 1);
      const after = FD.levelIndex(f.displayFed);
      f.chomp = 0.3;
      FD.Sound.chomp();
      this.burst(pel.x, pel.y, ['#c9752b', '#e89b4c', '#ffffff'], 6, 120);
      this.addText(f.x, f.y - 30, '+1', '#9ff28a', 26);
      if (after > before) {
        const lv = FD.LEVELS[after];
        f.glow = 2.5;
        f.hop = 0.9;
        this.burst(f.x, f.y, ['#ffe066', '#ffffff', lv.color, '#ff8ad8', '#6fe3ff'], 40, 420);
        this.showBanner(`${f.student.name} is now ${lv.name.toUpperCase()}!`, `Level ${after + 1} fish`, lv.color);
        FD.Sound.level();
      }
      if (this.onEat) this.onEat(f.student.id, after > before);
    }

    // ---------- rendering ----------
    draw() {
      const g = this.ctx, t = this.t;
      g.setTransform(this.k, 0, 0, this.k, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(this.bg, 0, 0, TW, TH);

      // dynamic low-res layer: light rays, seaweed, bubbles, shimmer
      const d = this.dctx;
      d.clearRect(0, 0, LW, LH);
      d.fillStyle = '#e6fbff';
      for (let i = 0; i < 5; i++) {
        const x0 = 30 + i * 68 + Math.sin(t * 0.25 + i * 1.7) * 18;
        d.globalAlpha = 0.07 + 0.03 * Math.sin(t * 0.6 + i);
        d.beginPath();
        d.moveTo(x0, 0); d.lineTo(x0 + 14 + (i % 2) * 8, 0); d.lineTo(x0 + 60, SAND_Y); d.lineTo(x0 + 34, SAND_Y);
        d.fill();
      }
      d.globalAlpha = 1;
      for (const w of this.weeds) {
        const base = sandTop(w.x) + 2;
        const c1 = w.dark ? '#1f7a44' : '#2ea65a', c2 = w.dark ? '#165c33' : '#1f7a44', c3 = '#5fd27f';
        for (let i = 0; i < w.h; i++) {
          const sway = Math.round(Math.sin(t * 1.3 + w.seed - i * 0.12) * (i / w.h) * 5);
          const x = w.x + sway, y = base - i;
          d.fillStyle = c2; d.fillRect(x - 1, y, 1, 1);
          d.fillStyle = c1; d.fillRect(x, y, 2, 1);
          if (i % 7 === 3) { d.fillStyle = c3; d.fillRect(x + (i % 14 === 3 ? 2 : -3), y, 3, 1); d.fillRect(x + (i % 14 === 3 ? 2 : -2), y - 1, 2, 1); }
        }
      }
      for (const b of this.bubbles) {
        const x = Math.round(b.x), y = Math.round(b.y);
        if (b.r === 1) { d.fillStyle = '#d8f8ff'; d.fillRect(x, y, 1, 1); }
        else { d.fillStyle = '#bdefff'; d.fillRect(x - 1, y, 3, 1); d.fillRect(x, y - 1, 1, 3); d.fillStyle = '#ffffff'; d.fillRect(x, y - 1, 1, 1); }
      }
      d.fillStyle = '#e8fcff';
      for (let x = 0; x < LW; x++) if (Math.sin(x * 0.31 + t * 2) + Math.sin(x * 0.07 - t * 0.8) > 1.3) d.fillRect(x, 0, 1, 1);
      // treasure glint
      if ((t % 4) < 0.3) { d.fillStyle = '#ffffff'; d.fillRect(43, 128, 1, 1); d.fillRect(42, 129, 3, 1); d.fillRect(43, 130, 1, 1); }
      g.drawImage(this.dyn, 0, 0, TW, TH);

      // pellets
      for (const p of this.pellets) {
        if (!p.spawned) continue;
        const x = Math.round(p.x / 4) * 4, y = Math.round(p.y / 4) * 4;
        g.fillStyle = '#5a3210'; g.fillRect(x - 12, y - 8, 24, 16); g.fillRect(x - 8, y - 12, 16, 24);
        g.fillStyle = '#c9752b'; g.fillRect(x - 8, y - 8, 16, 16);
        g.fillStyle = '#f2a65a'; g.fillRect(x - 8, y - 8, 8, 8);
      }

      // fish (back to front by y)
      const sorted = [...this.order].sort((a, b) => a.y - b.y);
      for (const f of sorted) this.drawFish(g, f);

      // particles
      for (const p of this.particles) {
        g.globalAlpha = Math.min(1, p.life / p.max * 1.5);
        g.fillStyle = p.c;
        const s = p.s;
        if (p.star) { g.fillRect(p.x - s / 2, p.y - s * 1.5, s, s * 3); g.fillRect(p.x - s * 1.5, p.y - s / 2, s * 3, s); }
        else g.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      }
      g.globalAlpha = 1;

      if (this.mode === 'class') for (const f of this.order) this.drawLabel(g, f);

      // floating texts
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (const tx of this.texts) {
        g.globalAlpha = Math.min(1, tx.life / tx.max * 2);
        g.font = `${tx.size}px "Press Start 2P", monospace`;
        g.lineWidth = 7; g.strokeStyle = '#0b1530'; g.strokeText(tx.text, tx.x, tx.y);
        g.fillStyle = tx.color; g.fillText(tx.text, tx.x, tx.y);
      }
      g.globalAlpha = 1;

      if (this.banner) this.drawBanner(g, this.banner);
    }

    drawFish(g, f) {
      const sp = f.sprite, t = this.t;
      const w = sp.w * f.px, h = sp.h * f.px;
      const bob = Math.sin(t * 1.6 + f.phase) * 5;
      const hop = f.hop > 0 ? -Math.sin((f.hop / 0.7) * Math.PI) * 40 : 0;
      f.drawY = f.y + bob + hop;

      if (f.glow > 0) {
        const r = Math.max(w, h) * 0.9;
        const grd = g.createRadialGradient(f.x, f.drawY, 4, f.x, f.drawY, r);
        grd.addColorStop(0, `rgba(255,240,150,${0.55 * Math.min(1, f.glow)})`);
        grd.addColorStop(1, 'rgba(255,240,150,0)');
        g.fillStyle = grd;
        g.fillRect(f.x - r, f.drawY - r, r * 2, r * 2);
      }

      g.save();
      g.translate(Math.round(f.x), Math.round(f.drawY));
      let sx = f.dir, sy = 1;
      if (f.turn > 0) sx *= 0.4 + 0.6 * (1 - f.turn / 0.2);
      if (f.chomp > 0) { const c = Math.sin((f.chomp / 0.3) * Math.PI) * 0.15; sx *= 1 + c; sy *= 1 - c * 0.6; }
      if (f.wiggle > 0) g.rotate(Math.sin(f.wiggle * 30) * 0.18 * (f.wiggle / 0.7));
      g.scale(sx, sy);
      g.drawImage(sp.frames[((Math.floor(f.anim) % 4) + 4) % 4], -w / 2, -h / 2, w, h);
      if (FD.levelIndex(f.displayFed) >= FD.LEVELS.length - 1) {
        const cw = FD.crown.width * f.px * 0.9, ch = FD.crown.height * f.px * 0.9;
        const hx = (sp.head.x - sp.w / 2) * f.px, hy = (sp.head.y - sp.h / 2) * f.px;
        g.drawImage(FD.crown, hx - cw / 2, hy - ch - f.px * 2 + Math.sin(t * 3) * 2, cw, ch);
      }
      g.restore();
    }

    drawLabel(g, f) {
      const s = f.student;
      const fed = f.displayFed;
      const lv = FD.levelOf(fed);
      const h = f.sprite.h * f.px;
      let name = s.name || '?';
      if (name.length > 12) name = name.slice(0, 11) + '…';

      g.textBaseline = 'top';
      g.textAlign = 'left';
      g.font = '22px "Press Start 2P", monospace';
      const nameW = g.measureText(name).width;
      g.font = '36px VT323, monospace';
      const fedTxt = `Fed ${fed}  `;
      const fedW = g.measureText(fedTxt).width, lvW = g.measureText(lv.name).width;
      const statsW = fedW + lvW;
      const pw = Math.max(nameW, statsW) + 26, ph = LABEL_H - 4;
      const c = f.cell;
      const cx = clamp(pw < c.w ? clamp(f.x, c.x + pw / 2 + 2, c.x + c.w - pw / 2 - 2) : c.x + c.w / 2, pw / 2 + 4, TW - pw / 2 - 4);
      const top = Math.max(4, f.drawY - h / 2 - ph - 4);
      const left = cx - pw / 2;

      g.fillStyle = 'rgba(6,18,44,0.68)';
      roundRect(g, left, top, pw, ph, 10); g.fill();
      g.lineWidth = 3; g.strokeStyle = lv.color; g.globalAlpha = 0.85;
      roundRect(g, left, top, pw, ph, 10); g.stroke();
      g.globalAlpha = 1;

      g.font = '22px "Press Start 2P", monospace';
      g.fillStyle = '#0b1530'; g.fillText(name, cx - nameW / 2 + 2, top + 9);
      g.fillStyle = '#ffffff'; g.fillText(name, cx - nameW / 2, top + 7);
      g.font = '36px VT323, monospace';
      g.fillStyle = '#cfe9ff'; g.fillText(fedTxt, cx - statsW / 2, top + 30);
      g.fillStyle = lv.color; g.fillText(lv.name, cx - statsW / 2 + fedW, top + 30);

      if (s.food > 0) {
        const pulse = 1 + Math.sin(this.t * 5 + f.phase) * 0.06;
        const bw = 52 * pulse, bh = 40 * pulse;
        const bx = left + pw - 10, by = top - 14;
        g.fillStyle = '#ff9f1c';
        roundRect(g, bx - bw / 2, by - bh / 2 + 6, bw, bh, 12); g.fill();
        g.lineWidth = 3; g.strokeStyle = '#5a3210';
        roundRect(g, bx - bw / 2, by - bh / 2 + 6, bw, bh, 12); g.stroke();
        g.fillStyle = '#5a3210'; g.fillRect(bx - 18, by + 1, 10, 10);
        g.fillStyle = '#f2c38a'; g.fillRect(bx - 17, by + 2, 4, 4);
        g.font = '18px "Press Start 2P", monospace';
        g.fillStyle = '#ffffff'; g.textAlign = 'left';
        g.fillText(String(Math.min(s.food, 99)), bx - 4, by - 1);
      }
    }

    drawBanner(g, b) {
      const p = b.life / b.max;
      const a = Math.min(1, (1 - p) * 6, p * 4);
      g.globalAlpha = a;
      const y = 120 + (1 - Math.min(1, (1 - p) * 6)) * -40;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '46px "Press Start 2P", monospace';
      const w = Math.min(TW - 80, g.measureText(b.text).width + 100);
      g.fillStyle = 'rgba(6,18,44,0.8)';
      roundRect(g, TW / 2 - w / 2, y - 60, w, b.sub ? 150 : 110, 18); g.fill();
      g.lineWidth = 5; g.strokeStyle = b.color;
      roundRect(g, TW / 2 - w / 2, y - 60, w, b.sub ? 150 : 110, 18); g.stroke();
      g.lineWidth = 10; g.strokeStyle = '#0b1530'; g.strokeText(b.text, TW / 2, y, TW - 140);
      g.fillStyle = b.color; g.fillText(b.text, TW / 2, y, TW - 140);
      if (b.sub) {
        g.font = '44px VT323, monospace';
        g.fillStyle = '#ffffff'; g.fillText(b.sub, TW / 2, y + 56);
      }
      g.globalAlpha = 1;
    }
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  FD.Scene = Scene;
  FD.TANK = { W: TW, H: TH };
})();
