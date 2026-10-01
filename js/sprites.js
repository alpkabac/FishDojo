/* FishDojo – procedural pixel-art fish sprites.
 * Every fish is rasterised from simple shapes (body ellipse + fin polygons)
 * onto a tiny grid, auto-outlined, then drawn scaled-up with no smoothing. */
(function () {
  const FD = (window.FD = window.FD || {});

  // ---------- color helpers ----------
  const rgbCache = {};
  function hexToRgb(h) {
    if (rgbCache[h]) return rgbCache[h];
    const s = h.replace('#', '');
    return (rgbCache[h] = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]);
  }
  function rgbToHex(c) {
    return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
  }
  const lighten = (c, t) => mix(c, '#ffffff', t);
  const darken = (c, t) => mix(c, '#000000', t);
  FD.color = { mix, lighten, darken, hexToRgb };

  function inPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

  // ---------- species ----------
  // Coordinates are in "art pixels", fish faces right.
  const SPECIES = {
    goldfish: {
      name: 'Goldfish', W: 26, H: 18,
      body: { cx: 15, cy: 9, rx: 7.5, ry: 5 },
      tail: [[8.5, 7.5], [2, 2.5], [4.5, 9], [2, 15.5], [8.5, 10.5]],
      fins: [[[11, 5], [14, 1], [19.5, 4.6]], [[11, 13], [12.5, 16.5], [15.5, 13.8]]],
      pec: [[17, 11], [14, 13.5], [15, 11]],
      colors: { body: '#ff8c1a', fin: '#ffc94a' },
    },
    clownfish: {
      name: 'Clownfish', W: 26, H: 18,
      body: { cx: 15, cy: 9, rx: 8, ry: 5.2 },
      tail: [[8, 7.5], [3.5, 4.5], [2.5, 9], [3.5, 13.5], [8, 10.5]],
      fins: [[[9, 6], [11.5, 2.5], [14.5, 3.8], [17, 2.2], [21, 5.5]], [[10.5, 13], [12, 16.2], [15.5, 13.8]]],
      pec: [[16, 10.5], [13.5, 12.5], [14.5, 10.5]],
      colors: { body: '#ff7a00', fin: '#ff9a3c' },
      bellyLine: 0.55,
      pattern(x, y, u, v) {
        for (const bx of [19.6, 14.5, 9.6]) {
          const d = Math.abs(x - bx);
          if (d < 1.1) return '#ffffff';
          if (d < 1.7) return '#1a1530';
        }
        return null;
      },
    },
    tang: {
      name: 'Blue Tang', W: 26, H: 18,
      body: { cx: 14.5, cy: 9, rx: 8, ry: 5.8 },
      tail: [[8, 7.8], [2, 3], [4, 9], [2, 15], [8, 10.2]],
      fins: [[[8.5, 5.5], [11, 2.2], [20, 3.2], [22, 5.5]], [[9, 12.8], [11, 16.2], [19.5, 15], [21, 13]]],
      pec: [[17, 11], [14.5, 13], [15.5, 11]],
      colors: { body: '#2f6fff', fin: '#1d3b9a', tail: '#ffd23b', accent: '#101a45' },
      bellyLine: 0.6,
      pattern(x, y, u, v, px, py, pal) {
        if (inEll(x, y, 13.2, 7.4, 6.6, 2.5) && !inEll(x, y, 15, 8.7, 4.4, 1.5)) return pal.accent;
        return null;
      },
    },
    angelfish: {
      name: 'Angelfish', W: 24, H: 22,
      body: { cx: 13.5, cy: 11, rx: 6.5, ry: 5.5 },
      tail: [[8, 9.5], [2.5, 6], [4, 11], [2.5, 16], [8, 12.5]],
      fins: [[[9.5, 7], [11, 0.5], [13, 1], [18.5, 7]], [[9.5, 15], [10.5, 21.5], [12, 21.5], [17.5, 15]]],
      colors: { body: '#ffe066', fin: '#ffd23b', accent: '#2a2440' },
      patternFins: true,
      pattern(x) {
        for (const bx of [10.2, 13.2, 16.2]) if (Math.abs(x - bx) < 0.55) return '#2a2440';
        return null;
      },
    },
    puffer: {
      name: 'Pufferfish', W: 24, H: 20,
      body: { cx: 13.5, cy: 10, rx: 7, ry: 6.5 },
      tail: [[7.2, 8.5], [3, 6.5], [3.8, 10], [3, 13.5], [7.2, 11.5]],
      fins: [[[12, 4], [13.5, 2], [15.5, 3.8]], [[12, 16], [13.5, 18], [15.5, 16.2]]],
      pec: [[15, 11], [12.5, 13], [13.5, 11]],
      colors: { body: '#f4d35e', fin: '#f9e79f', accent: '#8a6d1f', belly: '#fffbe6' },
      eyeSize: 3, spikes: true, bellyLine: 0.25,
      pattern(x, y, u, v, px, py, pal) {
        if (v < 0.15 && px % 3 === 0 && py % 3 === 0) return pal.accent;
        return null;
      },
    },
    betta: {
      name: 'Betta', W: 28, H: 22,
      body: { cx: 18, cy: 9, rx: 7, ry: 3.8 },
      tail: [[11.5, 7.5], [3, 1.5], [0.5, 6], [0.5, 13], [3, 19], [11.5, 11]],
      fins: [[[13, 6], [14, 1], [17.5, 2.5], [20, 5.8]], [[12, 11.5], [7, 20], [11, 21], [19, 12]]],
      colors: { body: '#7c4dff', fin: '#b18cff' },
      tailAmp: 2.2,
    },
    tetra: {
      name: 'Neon Tetra', W: 26, H: 16,
      body: { cx: 15, cy: 8, rx: 9, ry: 3.6 },
      tail: [[7.5, 7.2], [2.5, 3.5], [4.5, 8], [2.5, 12.5], [7.5, 8.8]],
      fins: [[[12.5, 5], [14, 2.2], [16, 4.8]], [[13, 11], [14.5, 13.5], [18, 11.3]]],
      colors: { body: '#c9d6e8', fin: '#e6eef7', accent: '#2ef2ff' },
      bellyLine: 0.85,
      pattern(x, y, u, v, px, py, pal) {
        if (v > -0.6 && v < -0.05) return pal.accent;
        if (v >= 0.1 && v < 0.85 && u < 0.3) return '#ff3b5c';
        return null;
      },
    },
    shark: {
      name: 'Shark', W: 30, H: 20,
      body: { cx: 17, cy: 10, rx: 10.5, ry: 4.3 },
      tail: [[8, 9], [1, 2.5], [3.5, 9.6], [2.5, 14], [8, 11]],
      fins: [[[13, 6.5], [15.5, 1], [19, 6]], [[17, 12.5], [13.5, 17], [19.5, 13.2]], [[10, 12.5], [9.5, 14.5], [12, 13]]],
      colors: { body: '#7d93ab', fin: '#6a7f96', belly: '#f3f6fa' },
      bellyLine: 0.15, eyeX: 0.6,
      pattern(x, y, u, v) {
        if (Math.abs(v) < 0.4) for (const bx of [19.5, 21]) if (Math.abs(x - bx) < 0.5) return '#4b5d72';
        return null;
      },
    },
  };
  FD.SPECIES = SPECIES;
  FD.SPECIES_KEYS = Object.keys(SPECIES);

  FD.FISH_COLORS = [
    { id: '', name: 'Natural' },
    { id: '#ff8c1a', name: 'Orange' },
    { id: '#e8413c', name: 'Red' },
    { id: '#ff6fb5', name: 'Pink' },
    { id: '#9b5cff', name: 'Purple' },
    { id: '#3a8dff', name: 'Blue' },
    { id: '#19c4b5', name: 'Teal' },
    { id: '#4cc24a', name: 'Green' },
    { id: '#ffd23b', name: 'Yellow' },
    { id: '#f6b21a', name: 'Gold' },
    { id: '#dfe7ef', name: 'Silver' },
    { id: '#4a4f63', name: 'Midnight' },
  ];

  function palette(sp, colorHex) {
    const body = colorHex || sp.colors.body;
    const fin = colorHex ? lighten(colorHex, 0.3) : sp.colors.fin;
    return {
      body,
      fin,
      tail: sp.colors.tail || fin,
      belly: (!colorHex && sp.colors.belly) || lighten(body, 0.45),
      shade: darken(body, 0.2),
      hi: lighten(body, 0.5),
      outline: mix(body, '#0d0b26', 0.78),
      accent: sp.colors.accent || '#1d1b38',
    };
  }

  const PADX = 2, PADY = 2;

  function rasterise(sp, pal, bend, flap) {
    const W = sp.W + PADX * 2, H = sp.H + PADY * 2;
    const col = new Array(W * H).fill(null);
    const kind = new Uint8Array(W * H); // 0 empty, 1 fin, 2 body
    const { cx, cy, rx, ry } = sp.body;
    const xs = sp.tail.map((p) => p[0]);
    const tb = Math.max(...xs), tm = Math.min(...xs), tl = tb - tm || 1;
    const amp = (sp.tailAmp || 1.4) * bend;
    const tail = sp.tail.map(([x, y]) => [x, y + amp * Math.max(0, (tb - x) / tl)]);
    const pec = sp.pec ? sp.pec.map(([x, y], i) => [x, i === 1 ? y + flap : y]) : null;
    const finRay = {};
    const ray = (c) => finRay[c] || (finRay[c] = darken(c, 0.14));

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const x = px - PADX + 0.5, y = py - PADY + 0.5, i = py * W + px;
        const u = (x - cx) / rx, v = (y - cy) / ry;
        if (u * u + v * v <= 1) {
          let c = pal.body;
          if (v > (sp.bellyLine ?? 0.35)) c = pal.belly;
          else if (v < -0.62) c = pal.shade;
          else if (v < -0.28 && u > 0.05 && u < 0.5 && (px + py) % 2 === 0) c = pal.hi;
          const pc = sp.pattern && sp.pattern(x, y, u, v, px, py, pal);
          col[i] = pc || c;
          kind[i] = 2;
        } else {
          let c = null;
          if (inPoly(x, y, tail)) c = pal.tail;
          else if (sp.fins.some((f) => inPoly(x, y, f))) c = pal.fin;
          if (c) {
            if ((px + py) % 3 === 0) c = ray(c);
            const pc = sp.patternFins && sp.pattern(x, y, u, v, px, py, pal);
            col[i] = pc || c;
            kind[i] = 1;
          }
        }
        if (pec && inPoly(x, y, pec)) {
          col[i] = darken(pal.fin, 0.06);
          if (!kind[i]) kind[i] = 1;
        }
      }
    }

    // eye
    const ex = Math.floor(cx + rx * (sp.eyeX ?? 0.55)) + PADX;
    const ey = Math.floor(cy - ry * (sp.eyeY ?? 0.25)) + PADY;
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) col[y * W + x] = c; };
    if ((sp.eyeSize || 2) === 3) {
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) set(ex + a, ey + b, '#ffffff');
      set(ex, ey, '#0b0b1a'); set(ex + 1, ey, '#0b0b1a'); set(ex, ey + 1, '#0b0b1a'); set(ex + 1, ey + 1, '#0b0b1a');
    } else {
      set(ex, ey, '#ffffff'); set(ex + 1, ey, '#0b0b1a'); set(ex, ey + 1, '#0b0b1a'); set(ex + 1, ey + 1, '#0b0b1a');
    }
    // mouth
    const mx = Math.floor(cx + rx - 1) + PADX, my = Math.floor(cy + ry * 0.3) + PADY;
    if (kind[my * W + mx] === 2) set(mx, my, pal.outline);

    // outline
    const outl = [];
    for (let py = 0; py < H; py++)
      for (let px = 0; px < W; px++) {
        const i = py * W + px;
        if (kind[i]) continue;
        if ((px > 0 && kind[i - 1]) || (px < W - 1 && kind[i + 1]) || (py > 0 && kind[i - W]) || (py < H - 1 && kind[i + W])) outl.push(i);
      }
    for (const i of outl) { col[i] = pal.outline; kind[i] = 3; }

    if (sp.spikes) {
      const ccx = cx + PADX, ccy = cy + PADY;
      for (const i of outl) {
        const px = i % W, py = (i / W) | 0;
        if ((px * 3 + py * 5) % 4 !== 0) continue;
        const dx = px + 0.5 - ccx, dy = py + 0.5 - ccy;
        const nx = px + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0);
        const ny = py + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0);
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && !kind[ny * W + nx]) set(nx, ny, pal.outline);
      }
    }
    return toCanvas(col, W, H);
  }

  function toCanvas(col, W, H) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const img = g.createImageData(W, H);
    for (let i = 0; i < col.length; i++) {
      if (!col[i]) continue;
      const [r, gg, b] = hexToRgb(col[i]);
      img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  const cache = new Map();
  /** Returns { frames: [4 canvases], w, h, head: {x,y} } — dims in art pixels. */
  FD.getFish = function (speciesKey, colorHex) {
    const key = speciesKey + '|' + (colorHex || '');
    if (cache.has(key)) return cache.get(key);
    const sp = SPECIES[speciesKey] || SPECIES.goldfish;
    const pal = palette(sp, colorHex);
    const frames = [[0, 0], [1, 1], [0, 0], [-1, -1]].map(([b, f]) => rasterise(sp, pal, b, f * 0.8));
    const out = {
      frames,
      w: sp.W + PADX * 2,
      h: sp.H + PADY * 2,
      head: { x: sp.body.cx + sp.body.rx * 0.45 + PADX, y: sp.body.cy - sp.body.ry + PADY },
      mouth: { x: sp.body.cx + sp.body.rx + PADX, y: sp.body.cy + PADY },
    };
    cache.set(key, out);
    return out;
  };

  // ---------- crown (for Legend fish) ----------
  FD.crown = (function () {
    const art = ['y...y...y', 'yy.yyy.yy', 'yyyyyyyyy', 'yrygybyry', 'yyyyyyyyy'];
    const map = { y: '#ffd23b', r: '#ff3b5c', g: '#2ee86b', b: '#3a8dff' };
    const W = 11, H = 7;
    const col = new Array(W * H).fill(null);
    art.forEach((row, y) => [...row].forEach((ch, x) => { if (map[ch]) col[(y + 1) * W + x + 1] = map[ch]; }));
    const filled = col.map((c) => !!c);
    for (let i = 0; i < col.length; i++) {
      if (filled[i]) continue;
      const x = i % W;
      if ((x > 0 && filled[i - 1]) || (x < W - 1 && filled[i + 1]) || filled[i - W] || filled[i + W]) col[i] = '#5a3a00';
    }
    return toCanvas(col, W, H);
  })();

  // ---------- growth ----------
  FD.LEVELS = [
    { min: 0, name: 'Baby', color: '#d7e3ec' },
    { min: 5, name: 'Small', color: '#9ff28a' },
    { min: 12, name: 'Medium', color: '#6fe3ff' },
    { min: 22, name: 'Big', color: '#ffe066' },
    { min: 35, name: 'Huge', color: '#ffad4d' },
    { min: 50, name: 'Giant', color: '#ff8ad8' },
    { min: 75, name: 'Legend', color: '#ffd700' },
  ];
  FD.levelIndex = function (fed) {
    let i = 0;
    while (i + 1 < FD.LEVELS.length && fed >= FD.LEVELS[i + 1].min) i++;
    return i;
  };
  FD.levelOf = (fed) => FD.LEVELS[FD.levelIndex(fed)];
  /** World pixels per art pixel – fish grow a little with every feeding. */
  FD.pxForFed = (fed) => 2.6 + 4.2 * (1 - Math.exp(-fed / 40));
})();
