// Laserslag in 3D: dezelfde arena, door de ogen van je ridder (first person, zoals de oude Wolfenstein)
// of met de camera net achter en boven je ridder (third person, over de schouder).
// Een eenvoudige raycaster op een klein canvas dat uitvergroot wordt: snel genoeg voor een Chromebook.
// Gebruikt Arena uit laserslag-world.js en SlagDraw (kleuren).
const Slag3D = (() => {
  const FOV = 1.15;          // ongeveer 66 graden
  const WALL_H = 74;
  const FP_EYE = 28;
  const KNIGHT_H = 48;
  const FAR = 1900;
  // Third person: hoe ver en hoe hoog de camera achter je ridder hangt, en een tikje naar rechts.
  const TP_BACK = 200;
  const TP_SIDE = 26;
  const TP_EYE = 44;
  const TP_HORIZON = .42;

  const OUT_H = 150;         // de burchtmuur errond is hoger dan de muren binnenin
  const RED = '#ff4d6d', BLUE = '#3d8bff';
  const neonOf = r => (r.x + r.w / 2 < Arena.W * .4 ? '#ff6b86' : r.x + r.w / 2 > Arena.W * .6 ? '#5ea3ff' : '#4cc9ff');

  // Muren binnenin: steen met een neonrand en gloeiende spleten, in de kleur van de kant waar ze staan.
  const texCache = {};
  function wallTex(neon) {
    if (texCache[neon]) return texCache[neon];
    const tex = document.createElement('canvas');
    tex.width = 64;
    tex.height = 64;
    const g = tex.getContext('2d');
    g.fillStyle = '#1c2742';
    g.fillRect(0, 0, 64, 64);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 4; col++) {
        const x = col * 20 + (row % 2 ? 10 : 0);
        const shade = 34 + ((row * 7 + col * 13) % 5) * 5;
        g.fillStyle = `rgb(${shade}, ${shade + 10}, ${shade + 30})`;
        g.fillRect(x + 1, row * 8 + 1, 18, 6);
        g.fillStyle = 'rgba(255,255,255,.08)';
        g.fillRect(x + 1, row * 8 + 1, 18, 1);
      }
    }
    // Een donkere band met gloeiende spleten halverwege.
    g.fillStyle = '#0a0f1e';
    g.fillRect(0, 26, 64, 10);
    g.fillStyle = neon;
    g.fillRect(6, 29, 20, 4);
    g.fillRect(38, 29, 20, 4);
    g.fillStyle = 'rgba(255,255,255,.7)';
    g.fillRect(10, 30, 12, 2);
    g.fillRect(42, 30, 12, 2);
    g.fillStyle = neon;
    g.fillRect(0, 0, 64, 3);
    g.fillRect(0, 61, 64, 3);
    g.globalAlpha = .4;
    g.fillRect(0, 3, 64, 2);
    g.fillRect(0, 59, 64, 2);
    g.fillRect(0, 0, 1, 64);
    g.globalAlpha = 1;
    texCache[neon] = tex;
    return tex;
  }

  // De burchtmuur: grote stenen, kantelen bovenaan (met gaten waar je de hemel door ziet) en een neonband onderaan.
  const rampTex = document.createElement('canvas');
  rampTex.width = 64;
  rampTex.height = 150;
  (() => {
    const g = rampTex.getContext('2d');
    g.fillStyle = '#2b2640';
    g.fillRect(0, 18, 64, 132);
    g.fillRect(0, 0, 32, 18);
    for (let row = 0; row < 7; row++) {
      for (let col = -1; col < 3; col++) {
        const x = col * 32 + (row % 2 ? 16 : 0);
        const shade = 46 + ((row * 5 + col * 11) % 4) * 6;
        g.fillStyle = `rgb(${shade}, ${shade - 6}, ${shade + 22})`;
        g.fillRect(x + 1.5, 20 + row * 17 + 1.5, 29, 14);
        g.fillStyle = 'rgba(255,255,255,.1)';
        g.fillRect(x + 1.5, 20 + row * 17 + 1.5, 29, 1.5);
      }
    }
    g.fillStyle = '#5a527c';
    g.fillRect(1, 1, 30, 16);
    g.fillStyle = 'rgba(255,255,255,.2)';
    g.fillRect(1, 1, 30, 2);
    g.fillStyle = '#16122a';
    g.fillRect(0, 17, 64, 3);
    g.fillStyle = '#0c0a18';
    g.fillRect(0, 138, 64, 12);
    g.fillStyle = '#4cc9ff';
    g.fillRect(0, 139, 64, 3);
    g.fillStyle = 'rgba(76, 201, 255, .35)';
    g.fillRect(0, 136, 64, 3);
  })();

  // Hoe de muren erbij staan voor deze maat van de arena, met de posters en banieren die eraan hangen.
  let lay = null;
  function layout() {
    const key = `${Arena.tier}/${typeof Posters !== 'undefined' ? Posters.version : 0}`;
    if (lay && lay.key === key) return lay;
    const W = Arena.W, H = Arena.H;
    const photos = typeof Posters !== 'undefined' ? Posters.list : [];
    const banner = side => (typeof Posters !== 'undefined' ? Posters.banner(side) : null);
    let n = 0;
    // face: de kant van de muur waar het hangt (N, S, W of O), u0..u1 langs die kant, v0..v1 de hoogte.
    const hang = (r, face, center, v0, v1, img) => {
      if (!img) return;
      const pw = (v1 - v0) * img.width / img.height;
      r.deco.push({ face, u0: center - pw / 2, u1: center + pw / 2, v0, v1, img });
    };
    const outer = [
      { x: -60, y: -60, w: W + 120, h: 60, face: 'S', len: W, off: 60 },
      { x: -60, y: H, w: W + 120, h: 60, face: 'N', len: W, off: 60 },
      { x: -60, y: 0, w: 60, h: H, face: 'E', len: H, off: 0 },
      { x: W, y: 0, w: 60, h: H, face: 'W', len: H, off: 0 },
    ];
    for (const r of outer) {
      r.tex = rampTex;
      r.wh = OUT_H;
      r.deco = [];
      const cnt = Math.max(2, Math.round(r.len / 320));
      for (let i = 0; i < cnt; i++) {
        const c = ((i + .5) * r.len) / cnt;
        const side = r.face === 'E' ? RED : r.face === 'W' ? BLUE : c < W / 2 ? RED : BLUE;
        if (photos.length && i % 3 !== 2) hang(r, r.face, r.off + c, 26, 128, photos[n++ % photos.length]);
        else hang(r, r.face, r.off + c, 34, 134, banner(side));
      }
    }
    const inner = Arena.WALLS.map(w => ({ ...w, tex: wallTex(neonOf(w)), wh: WALL_H, deco: [] }));
    // Lange muren binnenin krijgen aan elke lange kant een poster.
    if (photos.length) {
      for (const r of inner) {
        if (r.w >= 190) for (const f of ['N', 'S']) hang(r, f, r.w / 2, 10, 64, photos[n++ % photos.length]);
        else if (r.h >= 190) for (const f of ['W', 'E']) hang(r, f, r.h / 2, 10, 64, photos[n++ % photos.length]);
      }
    }
    lay = { key, outer, inner, all: [...inner, ...outer] };
    return lay;
  }
  // Ridder van voren, in pixelkunst. C = kleur van het team.
  const FRONT = [
    '.....CC.....',
    '....CCCC....',
    '...SSSSSS...',
    '..SSSSSSSS..',
    '..SVVVVVVS..',
    '..SSSSSSSS..',
    '...SSSSSS...',
    '.CCSSGGSSCC.',
    'CCSSSSSSSSCC',
    'CsSSSCCSSSsC',
    'C.sSSCCSSs.C',
    '..SSSSSSSS..',
    '..SSGGGGSS..',
    '..SS....SS..',
    '..SS....SS..',
    '..BB....BB..',
    '.BBB....BBB.',
  ];
  // Van achteren: geen vizier, wel een cape in de kleur van het team.
  const BACK = [
    '.....CC.....',
    '....CCCC....',
    '...SSSSSS...',
    '..SSSSSSSS..',
    '..SSSSSSSS..',
    '..sSSSSSSs..',
    '...SSSSSS...',
    '.CCCCCCCCCC.',
    'CCCCCCCCCCCC',
    'CsCCCCCCCCsC',
    'C.CCCCCCCC.C',
    '..CCCCCCCC..',
    '..SCCCCCCS..',
    '..SS....SS..',
    '..SS....SS..',
    '..BB....BB..',
    '.BBB....BBB.',
  ];
  const PAL = { S: '#c9d6e6', s: '#7d8ba3', V: '#4cc9ff', G: '#ffc94a', B: '#2b3550' };
  const sprites = new Map();
  function sprite(color, back) {
    const key = back ? `${color}/achter` : color;
    if (sprites.has(key)) return sprites.get(key);
    const rows = back ? BACK : FRONT;
    const k = 4;
    const c = document.createElement('canvas');
    c.width = 12 * k;
    c.height = rows.length * k;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = ch === 'C' ? color : PAL[ch];
      g.fillRect(x * k, y * k, k, k);
    }));
    sprites.set(key, c);
    return c;
  }

  // Sterren aan de hemel, vast per richting zodat ze meedraaien.
  const STARS = Array.from({ length: 90 }, (_, i) => ({ az: (i * 2.399) % (Math.PI * 2), h: ((i * 37) % 100) / 100, s: i % 7 === 0 ? 2 : 1 }));

  // Afstand tot de eerste muur langs een straal, met de plek op de muur (voor de textuur).
  function castIn(list, ox, oy, dx, dy) {
    let best = FAR;
    let u = 0;
    let side = 0;
    let hit = null;
    for (const r of list) {
      const t1 = (r.x - ox) / dx;
      const t2 = (r.x + r.w - ox) / dx;
      const t3 = (r.y - oy) / dy;
      const t4 = (r.y + r.h - oy) / dy;
      const txMin = Math.min(t1, t2);
      const txMax = Math.max(t1, t2);
      const tyMin = Math.min(t3, t4);
      const tyMax = Math.max(t3, t4);
      const tNear = Math.max(txMin, tyMin);
      const tFar = Math.min(txMax, tyMax);
      if (!(tNear <= tFar) || tFar < 0 || tNear < 0 || tNear >= best) continue;
      best = tNear;
      hit = r;
      if (txMin > tyMin) { side = 0; u = oy + dy * tNear - r.y; } else { side = 1; u = ox + dx * tNear - r.x; }
    }
    return { d: best, u, side, r: hit };
  }
  const cast = (ox, oy, dx, dy) => castIn(layout().all, ox, oy, dx, dy);

  // De vloer van bovenaf als pixels, om in 3D uit te lezen (grof genoeg voor het lage beeld).
  let floor = null;
  function floorData() {
    const img = SlagDraw.arenaImage({ walls: false, k: .5 });
    if (floor && floor.key === img.key) return floor;
    const g = img.c.getContext('2d');
    floor = { key: img.key, k: img.k, w: img.c.width, h: img.c.height, px: new Uint32Array(g.getImageData(0, 0, img.c.width, img.c.height).data.buffer) };
    return floor;
  }

  // Het verre landschap: bergen, burchten met verlichte ramen en een planeet met ringen. Eén keer getekend, rondom.
  const pano = document.createElement('canvas');
  pano.width = 1536;
  pano.height = 160;
  (() => {
    const g = pano.getContext('2d');
    const W = pano.width, H = pano.height;
    let seed = 9;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // Planeet met een ring.
    const px = W * .3, py = H * .28;
    const pg = g.createRadialGradient(px - 14, py - 14, 4, px, py, 40);
    pg.addColorStop(0, '#ffd2f2');
    pg.addColorStop(.5, '#a35bd6');
    pg.addColorStop(1, '#2a1250');
    g.fillStyle = pg;
    g.beginPath(); g.arc(px, py, 36, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255, 210, 160, .7)';
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(px, py, 62, 12, -.25, 0, Math.PI * 2); g.stroke();
    // Een tweede, kleine maan.
    g.fillStyle = '#bfe8ff';
    g.beginPath(); g.arc(W * .78, H * .2, 10, 0, Math.PI * 2); g.fill();
    // Bergen in twee lagen.
    for (const [base, amp, col] of [[.55, .3, '#1c1638'], [.7, .22, '#120f26']]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) {
        const y = H * (base - amp * (.5 + .5 * Math.sin(x * .011) * Math.sin(x * .0047 + 1.3)) - rnd() * .03);
        g.lineTo(x, y);
      }
      g.lineTo(W, H);
      g.closePath();
      g.fill();
    }
    // Burchten aan de horizon.
    for (let i = 0; i < 9; i++) {
      const cx = (i + .3 + rnd() * .4) * W / 9;
      const bw = 50 + rnd() * 50, bh = 30 + rnd() * 30;
      const by = H * .82;
      g.fillStyle = '#0b0918';
      g.fillRect(cx - bw / 2, by - bh, bw, bh + H);
      for (let k = 0; k < 3; k++) {
        const tx = cx - bw / 2 + (k * bw) / 2 - 7, th = bh + 18 + rnd() * 26;
        g.fillRect(tx, by - th, 14, th);
        g.beginPath(); g.moveTo(tx - 3, by - th); g.lineTo(tx + 7, by - th - 16); g.lineTo(tx + 17, by - th); g.closePath(); g.fill();
        g.fillStyle = rnd() < .5 ? '#ffb85c' : '#7fe0ff';
        g.fillRect(tx + 5, by - th + 8, 3, 4);
        g.fillStyle = '#0b0918';
      }
      for (let k = 0; k < 4; k++) {
        g.fillStyle = rnd() < .6 ? '#ffb85c' : '#7fe0ff';
        g.fillRect(cx - bw / 2 + 6 + rnd() * (bw - 12), by - bh + 6 + rnd() * (bh - 10), 3, 4);
      }
    }
    g.fillStyle = '#0b0918';
    g.fillRect(0, H * .82, W, H);
  })();
  // Zit er een muur tussen twee punten?
  function visible(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay);
    const hit = cast(ax, ay, (bx - ax) / d, (by - ay) / d);
    return hit.d > d - 4;
  }

  // Richthulp: wie vlak bij het vizier staat, wordt geraakt.
  function assist(me, a, enemies) {
    let best = null;
    let bestErr = Infinity;
    for (const o of enemies) {
      const dist = Math.hypot(o.x - me.x, o.y - me.y);
      let rel = Math.atan2(o.y - me.y, o.x - me.x) - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const allow = Math.atan2(Arena.R * 1.6, dist) + .03;
      if (Math.abs(rel) < allow && Math.abs(rel) < bestErr && visible(me.x, me.y, o.x, o.y)) { best = a + rel; bestErr = Math.abs(rel); }
    }
    return best === null ? a : best;
  }

  const low = document.createElement('canvas');
  const lctx = low.getContext('2d');
  let zbuf = new Float32Array(0);
  let img = null;
  let px = null;
  let skyRows = null;

  // Teken de wereld. Geeft terug waar elke ridder op het scherm staat (voor de naamkaartjes).
  // scene: { me, a, others: [{x, y, color, flags, ...}], bullets, crystal, t, booms }
  // Met scene.self ({ color, bubble, asking }) hangt de camera achter je ridder (third person) en zie je hem zelf.
  // Waar de camera staat in third person: achter je ridder, niet door een muur heen.
  function chase(me, a) {
    const bx = -Math.cos(a);
    const by = -Math.sin(a);
    const back = Math.max(0, Math.min(TP_BACK, cast(me.x, me.y, bx, by).d - 12));
    let x = me.x + bx * back;
    let y = me.y + by * back;
    const rx = -Math.sin(a);
    const ry = Math.cos(a);
    const side = Math.max(0, Math.min(TP_SIDE * (back / TP_BACK), cast(x, y, rx, ry).d - 10));
    x += rx * side;
    y += ry * side;
    return { x, y };
  }

  function render(ctx, w, h, scene) {
    const resW = Math.max(240, Math.min(520, Math.round(w / 2.4)));
    const resH = Math.round(resW * h / w);
    if (low.width !== resW || low.height !== resH) {
      low.width = resW;
      low.height = resH;
      zbuf = new Float32Array(resW);
    }
    const g = lctx;
    g.imageSmoothingEnabled = false;
    const sharp = [];
    const { me, a } = scene;
    const tp = !!scene.self;
    const cam = tp ? chase(me, a) : me;
    const EYE = tp ? TP_EYE : FP_EYE;
    const half = Math.tan(FOV / 2);
    const proj = resW / 2 / half;
    const horizon = (tp ? TP_HORIZON : .5) * resH + (scene.bob || 0) * resH;

    // Hemel en vloer, pixel per pixel op het kleine canvas.
    if (!img || img.width !== resW || img.height !== resH) {
      img = g.createImageData(resW, resH);
      px = new Uint32Array(img.data.buffer);
      skyRows = null;
    }
    const hz = Math.max(1, Math.min(resH - 1, Math.round(horizon)));
    if (!skyRows || skyRows.length !== resH) {
      skyRows = new Uint32Array(resH);
      for (let y = 0; y < resH; y++) {
        const k = Math.min(1, y / Math.max(1, resH * .5));
        const r = Math.round(4 + k * 46), gg = Math.round(4 + k * 18), b = Math.round(14 + k * 62);
        skyRows[y] = (255 << 24) | (b << 16) | (gg << 8) | r;
      }
    }
    for (let y = 0; y < hz; y++) px.fill(skyRows[Math.min(resH - 1, Math.round(y * (resH * .5) / hz))], y * resW, (y + 1) * resW);
    {
      const fl = floorData();
      const tex = fl.px, tw = fl.w, th = fl.h, tk = fl.k;
      const ca = Math.cos(a), sa = Math.sin(a);
      const plx = -sa * half, ply = ca * half;
      const lx = ca - plx, ly = sa - ply;
      const rx = ca + plx, ry = sa + ply;
      for (let y = hz; y < resH; y++) {
        const rowD = (EYE * proj) / Math.max(.5, y - horizon + .5);
        let wx = (cam.x + rowD * lx) * tk;
        let wy = (cam.y + rowD * ly) * tk;
        const sx = ((rowD * (rx - lx)) / resW) * tk;
        const sy = ((rowD * (ry - ly)) / resW) * tk;
        let i = y * resW;
        for (let x = 0; x < resW; x++, i++, wx += sx, wy += sy) {
          const tx = wx | 0, ty = wy | 0;
          px[i] = tx < 0 || ty < 0 || tx >= tw || ty >= th ? 0xff180f10 : tex[ty * tw + tx];
        }
      }
    }
    g.putImageData(img, 0, 0);
    // Mist over de vloer: dicht aan de horizon, weg vlak voor je neus.
    {
      const fogAt = y => Math.min(.92, (((EYE * proj) / Math.max(.5, y - horizon + .5)) / 1500) ** 1.2);
      const grad = g.createLinearGradient(0, hz, 0, resH);
      for (const k of [0, .03, .08, .16, .3, .55, 1]) grad.addColorStop(k, `rgba(6, 8, 22, ${fogAt(hz + k * (resH - hz)).toFixed(3)})`);
      g.fillStyle = grad;
      g.fillRect(0, hz, resW, resH - hz);
    }
    // Sterren en het verre landschap, meedraaiend met de kijkrichting.
    g.fillStyle = '#d9ecff';
    for (const s of STARS) {
      let rel = s.az - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) > FOV) continue;
      g.globalAlpha = .4 + (s.h * .6);
      g.fillRect(resW / 2 + Math.tan(rel) * proj, s.h * horizon * .8, s.s, s.s);
    }
    g.globalAlpha = 1;
    {
      const span = pano.width;
      const perRad = span / (Math.PI * 2);
      const ph = horizon * .7;
      const width = FOV * perRad;
      for (let start = ((((a - FOV / 2) * perRad) % span) + span) % span, x = 0, rest = width; rest > 0;) {
        const take = Math.min(rest, span - start);
        g.drawImage(pano, start, 0, take, pano.height, x, horizon - ph, (take / width) * resW, ph);
        x += (take / width) * resW;
        rest -= take;
        start = 0;
      }
    }

    // Muren, kolom per kolom: eerst de burchtmuur errond, dan een muur binnenin als die dichterbij staat.
    const L = layout();
    const yAt = (z, perp) => horizon + ((EYE - z) * proj) / perp;
    const column = (x, hit, ra, dx, dy) => {
      const perp = hit.d * Math.cos(ra - a);
      const r = hit.r;
      const top = yAt(r.wh, perp);
      const bottom = yAt(0, perp);
      const tu = Math.floor(((hit.u % 64) + 64) % 64);
      g.drawImage(r.tex, tu, 0, 1, r.tex.height, x, top, 1, bottom - top);
      if (r.deco.length) {
        const face = hit.side ? (dy > 0 ? 'N' : 'S') : (dx > 0 ? 'W' : 'E');
        for (const d of r.deco) {
          if (d.face !== face || hit.u < d.u0 || hit.u >= d.u1) continue;
          const y1 = yAt(d.v1, perp);
          // Op de noord- en oostkant loopt u van rechts naar links (voor wie ernaar kijkt): spiegel terug.
          let k = (hit.u - d.u0) / (d.u1 - d.u0);
          if (face === 'N' || face === 'E') k = 1 - k;
          g.drawImage(d.img, Math.min(d.img.width - 1, Math.floor(k * d.img.width)), 0, 1, d.img.height, x, y1, 1, yAt(d.v0, perp) - y1);
        }
      }
      const fog = Math.min(.85, perp / 1700 + (hit.side ? .16 : 0));
      g.fillStyle = `rgba(6, 8, 22, ${fog})`;
      g.fillRect(x, top, 1, bottom - top);
      return perp;
    };
    for (let x = 0; x < resW; x++) {
      const col = (x / resW) * 2 - 1;
      const ra = a + Math.atan(col * half);
      const dx = Math.cos(ra);
      const dy = Math.sin(ra);
      const ho = castIn(L.outer, cam.x, cam.y, dx, dy);
      const hi = castIn(L.inner, cam.x, cam.y, dx, dy);
      let perp = FAR;
      if (ho.r) perp = column(x, ho, ra, dx, dy);
      if (hi.r && hi.d < ho.d) perp = column(x, hi, ra, dx, dy);
      zbuf[x] = perp;
    }
    // Ridders, kogels en het kristal: van ver naar dichtbij, achter muren verborgen.
    const things = [];
    for (const o of scene.others) things.push({ kind: 'knight', o, x: o.x, y: o.y });
    for (const b of scene.bullets) things.push({ kind: 'bullet', o: b, x: b.x, y: b.y });
    if (scene.crystal) things.push({ kind: 'crystal', x: scene.crystal.x, y: scene.crystal.y });
    for (const b of scene.booms) things.push({ kind: 'boom', o: b, x: b.x, y: b.y });
    if (tp) things.push({ kind: 'knight', self: true, o: { ...scene.self, x: me.x, y: me.y }, x: me.x, y: me.y });
    for (const th of things) th.d = Math.hypot(th.x - cam.x, th.y - cam.y);
    things.sort((p, q) => q.d - p.d);
    const tags = [];
    // In third person: wie tussen de camera en je ridder staat, wordt doorzichtig.
    const selfD = tp ? Math.hypot(me.x - cam.x, me.y - cam.y) : 0;
    for (const th of things) {
      let rel = Math.atan2(th.y - cam.y, th.x - cam.x) - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) > FOV * .75 || th.d < 6) continue;
      const perp = th.d * Math.cos(rel);
      const sx = resW / 2 + Math.tan(rel) * proj;
      const k = proj / perp;
      if (th.kind === 'knight') {
        // Met een eigen ridder: zijn helm en schild, in de kleur van zijn team.
        const own = th.o.av && typeof Avatar !== 'undefined';
        const img = own ? Avatar.sprite(th.o.av, { back: th.self, armor: th.o.color, k: 8 }) : sprite(th.o.color, th.self);
        // Je eigen ridder nooit groter dan 40% van het scherm, ook als de camera tegen een muur zit.
        const hgt = th.self ? Math.min(KNIGHT_H * k, resH * .4) : KNIGHT_H * k;
        const wid = hgt * (img.width / img.height);
        const y0 = horizon + EYE * (hgt / KNIGHT_H) - hgt;
        const x0 = Math.round(sx - wid / 2);
        let shown = false;
        g.globalAlpha = tp && !th.self && th.d < selfD + 10 ? .3 : 1;
        for (let c = Math.max(0, x0); c < Math.min(resW, x0 + wid); c++) {
          if (zbuf[c] < perp) continue;
          shown = true;
          // Een eigen ridder tekenen we straks scherp op het grote scherm, de rest hier in lage resolutie.
          // Aaneengesloten zichtbare kolommen worden één strook.
          if (own) {
            const last = sharp[sharp.length - 1];
            if (last && last.img === img && last.x0 === x0 && last.c + last.n === c) last.n++;
            else sharp.push({ img, x0, wid, c, n: 1, y0, hgt, alpha: g.globalAlpha });
          } else g.drawImage(img, ((c - x0) / wid) * img.width, 0, Math.max(1, img.width / wid), img.height, c, y0, 1, hgt);
        }
        g.globalAlpha = 1;
        if (shown) {
          if (th.o.bubble) {
            g.strokeStyle = th.o.asking ? 'rgba(255, 201, 74, .8)' : 'rgba(76, 201, 255, .8)';
            g.lineWidth = Math.max(1, k * 2);
            g.beginPath(); g.ellipse(sx, y0 + hgt / 2, wid * .85, hgt * .62, 0, 0, Math.PI * 2); g.stroke();
          }
          const fog = Math.min(.7, perp / 1800);
          if (fog > .05) { g.fillStyle = `rgba(3, 6, 14, ${fog})`; g.fillRect(x0, y0, wid, hgt); }
          if (!th.self) tags.push({ o: th.o, x: sx / resW, y: y0 / resH, size: hgt / resH });
        }
      } else if (th.kind === 'bullet') {
        const c = Math.round(sx);
        if (c < 0 || c >= resW || zbuf[c] < perp) continue;
        const r = Math.max(1.5, 5 * k);
        const y = horizon + (EYE - 24) * k;
        g.fillStyle = th.o.color;
        g.shadowColor = th.o.color;
        g.shadowBlur = 8;
        g.beginPath(); g.arc(sx, y, r, 0, Math.PI * 2); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(sx, y, r * .45, 0, Math.PI * 2); g.fill();
      } else if (th.kind === 'crystal') {
        const c = Math.round(sx);
        if (c < 0 || c >= resW || zbuf[c] < perp) continue;
        const y = horizon + (EYE - 30 + Math.sin(scene.t * 3) * 4) * k;
        const s = 18 * k;
        g.fillStyle = 'rgba(255, 201, 74, .25)';
        g.beginPath(); g.arc(sx, y, s * 1.8, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffc94a';
        g.beginPath(); g.moveTo(sx, y - s); g.lineTo(sx + s * .65, y - s * .2); g.lineTo(sx, y + s); g.lineTo(sx - s * .65, y - s * .2); g.closePath(); g.fill();
      } else if (th.kind === 'boom') {
        const c = Math.round(sx);
        if (c < 0 || c >= resW || zbuf[c] < perp) continue;
        const p = th.o.age / th.o.life;
        const y = horizon + (EYE - 24) * k;
        g.globalAlpha = 1 - p;
        g.strokeStyle = th.o.color;
        g.lineWidth = Math.max(1, 4 * k);
        g.beginPath(); g.arc(sx, y, (10 + p * 60) * k, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(sx, y, (14 * (1 - p)) * k, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      }
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    const sxF = w / resW, syF = h / resH;
    for (const p of sharp) {
      ctx.globalAlpha = p.alpha;
      const sx = ((p.c - p.x0) / p.wid) * p.img.width;
      ctx.drawImage(p.img, sx, 0, (p.n / p.wid) * p.img.width, p.img.height, p.c * sxF, p.y0 * syF, p.n * sxF, p.hgt * syF);
    }
    ctx.globalAlpha = 1;
    return tags.map(tg => ({ ...tg, x: tg.x * w, y: tg.y * h, size: tg.size * h }));
  }

  // Waar het vizier staat: in het midden, of in third person op de horizon.
  const aimY = (h, tp) => h * (tp ? TP_HORIZON : .5);

  // Je eigen laserlans rechtsonder, met terugslag en een flits bij elk schot.
  function weapon(ctx, w, h, color, recoil, walk) {
    const s = Math.min(w, h * 1.4) / 1500;
    const bx = w * .62 + Math.sin(walk) * 8 * s;
    const by = h + Math.abs(Math.cos(walk)) * 8 * s + recoil * 40 * s;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-.42);
    ctx.fillStyle = '#56637c';
    ctx.fillRect(-30 * s, -330 * s, 60 * s, 330 * s);
    ctx.fillStyle = '#c9d6e6';
    ctx.fillRect(-20 * s, -320 * s, 40 * s, 300 * s);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24 * s;
    ctx.fillRect(-14 * s, -380 * s, 28 * s, 70 * s);
    ctx.fillRect(-36 * s, -120 * s, 72 * s, 26 * s);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffc94a';
    ctx.fillRect(-26 * s, -60 * s, 52 * s, 18 * s);
    if (recoil > .5) {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 40 * s;
      ctx.beginPath(); ctx.arc(0, -400 * s, 34 * s * recoil, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function crosshair(ctx, w, h, onTarget, dpr, tp) {
    const x = w / 2;
    const y = aimY(h, tp);
    const r = 9 * dpr;
    ctx.save();
    ctx.strokeStyle = onTarget ? '#ff4d6d' : 'rgba(255, 255, 255, .85)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x - r * .5, y);
    ctx.moveTo(x + r * .5, y); ctx.lineTo(x + r * 1.6, y);
    ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y - r * .5);
    ctx.moveTo(x, y + r * .5); ctx.lineTo(x, y + r * 1.6);
    ctx.stroke();
    if (onTarget) { ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  return { render, weapon, crosshair, assist, visible, aimY };
})();
