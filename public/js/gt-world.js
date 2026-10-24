// Gauntlet: de kerker, de vier klassen en de monsters. Gedeeld door de server, de leerlingen en het bord.
// Een kerker is een raster van vakjes (T eenheden groot) met zalen en gangen. Elke ploeg krijgt dezelfde kerker
// (zelfde zaadje per niveau), zodat de race tussen de ploegen eerlijk is. Hoek 0 is naar rechts.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GtWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const T = 48;           // grootte van een vakje
  const R = 17;           // straal van een ridder

  // De vier klassen. hp = levenspunten, speed = eenheden per seconde, cd = tijd tussen twee aanvallen in ms.
  const CLASSES = {
    paladijn: {
      name: 'Paladijn', icon: '🛡️', color: '#ffc94a', hp: 150, speed: 190, cd: 430,
      attack: { kind: 'slag', range: 78, arc: 2.2, dmg: 36 },
      special: { name: 'Heilig schild', icon: '✨', text: 'Je hele ploeg 4 seconden onkwetsbaar en +30 ❤' },
      text: 'Sterk en taai. Slaat met een energiezwaard alles rond zich weg.',
    },
    mage: {
      name: 'Mage', icon: '🔮', color: '#c77dff', hp: 95, speed: 200, cd: 360,
      attack: { kind: 'bol', speed: 560, dmg: 28, life: 1, r: 9 },
      special: { name: 'Neon nova', icon: '💥', text: 'Een ontploffing rond je die alle monsters dichtbij wegvaagt' },
      text: 'Werpt plasmabollen van ver. Zwak, maar haar nova is verwoestend.',
    },
    ranger: {
      name: 'Ranger', icon: '🏹', color: '#4ade80', hp: 105, speed: 240, cd: 210,
      attack: { kind: 'pijl', speed: 820, dmg: 17, life: .85, r: 6 },
      special: { name: 'Pijlenregen', icon: '🌠', text: 'Zestien laserpijlen in alle richtingen' },
      text: 'De snelste. Schiet razendsnel laserpijlen.',
    },
    mech: {
      name: 'Mech', icon: '🤖', color: '#4cc9ff', hp: 170, speed: 165, cd: 150,
      attack: { kind: 'plasma', speed: 640, dmg: 11, life: .7, r: 7, spread: .12 },
      special: { name: 'Geschuttoren', icon: '🗼', text: 'Zet een toren neer die 8 seconden mee vecht' },
      text: 'Een ridder in een stalen pantser. Traag, maar zijn kanon stopt nooit.',
    },
  };
  const CLASS_IDS = Object.keys(CLASSES);

  // Monsters. Ze komen uit poorten: sla de poort kapot en er komen er geen meer.
  const MONSTERS = {
    bot: { name: 'Skeletbot', hp: 42, speed: 118, r: 16, dmg: 10, cd: 800, reach: 30, gold: 2 },
    vonk: { name: 'Vonkdrone', hp: 22, speed: 200, r: 12, dmg: 6, cd: 600, reach: 24, gold: 1 },
    kanon: { name: 'Kanonnier', hp: 55, speed: 80, r: 17, dmg: 11, cd: 1700, reach: 420, gold: 3, ranged: true },
    kolos: { name: 'Kolos', hp: 190, speed: 72, r: 24, dmg: 24, cd: 1200, reach: 40, gold: 8 },
  };
  const POORT = { hp: 160, r: 26, every: 3200, max: 4, wake: 640 };

  // Een vast zaadje geeft altijd dezelfde reeks.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Een kerker voor een niveau: zalen verbonden door brede gangen. Start in de eerste zaal, de uitgang in de verste.
  function makeDungeon(seed, level) {
    const rnd = rng(seed * 7919 + level * 104729);
    const W = Math.min(64, 38 + level * 3);
    const H = Math.min(44, 26 + level * 2);
    const g = Array.from({ length: H }, () => new Array(W).fill(1));
    const rooms = [];
    for (let tries = 0; tries < 400 && rooms.length < 7 + level; tries++) {
      const w = 5 + Math.floor(rnd() * 6);
      const h = 4 + Math.floor(rnd() * 5);
      const x = 1 + Math.floor(rnd() * (W - w - 2));
      const y = 1 + Math.floor(rnd() * (H - h - 2));
      if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
      rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
    }
    for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = 0;
    // Gangen van twee vakjes breed: elke zaal hangt aan de dichtstbijzijnde zaal die al verbonden is.
    const dig = (x, y) => {
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const X = x + dx, Y = y + dy;
        if (X > 0 && Y > 0 && X < W - 1 && Y < H - 1) g[Y][X] = 0;
      }
    };
    const corridor = (a, b) => {
      let x = a.cx, y = a.cy;
      const horizFirst = rnd() < .5;
      const stepX = () => { while (x !== b.cx) { dig(x, y); x += Math.sign(b.cx - x); } };
      const stepY = () => { while (y !== b.cy) { dig(x, y); y += Math.sign(b.cy - y); } };
      if (horizFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
      dig(x, y);
    };
    for (let i = 1; i < rooms.length; i++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < i; j++) {
        const d = Math.abs(rooms[i].cx - rooms[j].cx) + Math.abs(rooms[i].cy - rooms[j].cy);
        if (d < bd) { bd = d; best = j; }
      }
      corridor(rooms[i], rooms[best]);
    }
    // Een paar extra lussen, zodat je niet altijd terug moet.
    for (let k = 0; k < 2 && rooms.length > 3; k++) {
      const a = rooms[Math.floor(rnd() * rooms.length)], b = rooms[Math.floor(rnd() * rooms.length)];
      if (a !== b) corridor(a, b);
    }
    // Afstanden vanaf de start: de verste zaal heeft de uitgang.
    const start = rooms[0];
    const dist = flow(g, W, H, [[start.cx, start.cy]]);
    let exitRoom = rooms[rooms.length - 1], far = -1;
    for (const r of rooms.slice(1)) {
      const d = dist[r.cy * W + r.cx];
      if (d > far) { far = d; exitRoom = r; }
    }
    // Pilaren in grote zalen (niet in de start- of eindzaal).
    const pillars = [];
    for (const r of rooms) {
      if (r === start || r === exitRoom || r.w < 8 || r.h < 6) continue;
      for (const [px, py] of [[r.x + 2, r.y + 1], [r.x + r.w - 3, r.y + 1], [r.x + 2, r.y + r.h - 2], [r.x + r.w - 3, r.y + r.h - 2]]) {
        if (rnd() < .7) { g[py][px] = 2; pillars.push([px, py]); }
      }
    }
    const other = rooms.filter(r => r !== start);
    const at = (r, ox = 0, oy = 0) => ({ x: (r.cx + .5 + ox) * T, y: (r.cy + .5 + oy) * T });
    const free = (r) => {
      for (let k = 0; k < 20; k++) {
        const x = r.x + 1 + Math.floor(rnd() * Math.max(1, r.w - 2));
        const y = r.y + 1 + Math.floor(rnd() * Math.max(1, r.h - 2));
        if (g[y][x] === 0) return { x: (x + .5) * T, y: (y + .5) * T };
      }
      return at(r);
    };
    // Poorten: meer naarmate het niveau stijgt. Welke monsters er uitkomen, hangt af van het niveau.
    const kinds = ['bot', 'vonk', ...(level >= 2 ? ['kanon'] : []), ...(level >= 3 ? ['kolos'] : [])];
    const poorten = [];
    const nPoort = Math.min(other.length * 2, 3 + level * 2);
    for (let i = 0; i < nPoort; i++) {
      const r = other[i % other.length];
      const p = free(r);
      if (poorten.some(q => Math.hypot(q.x - p.x, q.y - p.y) < T * 2.2)) continue;
      poorten.push({ ...p, kind: kinds[Math.floor(rnd() * kinds.length)] });
    }
    // Schatten en energiecellen.
    const items = [];
    for (const r of other) {
      const n = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) items.push({ ...free(r), kind: rnd() < .22 ? 'kist' : 'goud' });
      if (rnd() < .55) items.push({ ...free(r), kind: 'cel' });
    }
    // Fakkels tegen de muren: een muurvakje met vloer eronder.
    const torches = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (g[y][x] === 1 && g[y + 1][x] === 0 && rnd() < .12) torches.push([x, y]);
      }
    }
    return {
      seed, level, W, H, rows: g.map(r => r.join('')), start: at(start), exit: at(exitRoom), poorten, items, torches, pillars,
      rooms: rooms.map(r => [r.x, r.y, r.w, r.h]),
    };
  }

  // Breadth-first afstanden in vakjes vanaf een of meer startvakjes (65535 = onbereikbaar).
  function flow(g, W, H, from) {
    const d = new Uint16Array(W * H).fill(65535);
    const q = new Int32Array(W * H);
    let head = 0, tail = 0;
    for (const [x, y] of from) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      if (d[i] === 0) continue;
      d[i] = 0;
      q[tail++] = i;
    }
    while (head < tail) {
      const i = q[head++];
      const x = i % W, y = (i - x) / W;
      const nd = d[i] + 1;
      if (x > 0 && g[y][x - 1] === 0 && d[i - 1] > nd) { d[i - 1] = nd; q[tail++] = i - 1; }
      if (x < W - 1 && g[y][x + 1] === 0 && d[i + 1] > nd) { d[i + 1] = nd; q[tail++] = i + 1; }
      if (y > 0 && g[y - 1][x] === 0 && d[i - W] > nd) { d[i - W] = nd; q[tail++] = i - W; }
      if (y < H - 1 && g[y + 1][x] === 0 && d[i + W] > nd) { d[i + W] = nd; q[tail++] = i + W; }
    }
    return d;
  }

  // Het raster uit een kerker halen (rijen tekst naar getallen), voor botsingen.
  function grid(d) {
    if (!d._g) d._g = d.rows.map(r => Array.from(r, Number));
    return d._g;
  }

  function solid(d, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= d.W || ty >= d.H) return true;
    return grid(d)[ty][tx] !== 0;
  }

  // Een cirkel tegen de muren: eerst x, dan y, zodat je langs een muur glijdt in plaats van vast te lopen.
  function slide(d, x, y, dx, dy, r) {
    const hit = (cx, cy) => {
      const x0 = Math.floor((cx - r) / T), x1 = Math.floor((cx + r) / T);
      const y0 = Math.floor((cy - r) / T), y1 = Math.floor((cy + r) / T);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          if (!solid(d, tx, ty)) continue;
          const nx = Math.max(tx * T, Math.min(cx, tx * T + T));
          const ny = Math.max(ty * T, Math.min(cy, ty * T + T));
          if ((cx - nx) ** 2 + (cy - ny) ** 2 < r * r) return true;
        }
      }
      return false;
    };
    // Grote stappen opdelen, zodat je nooit door een muur schiet.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (r * .8)));
    const sx = dx / steps, sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (!hit(x + sx, y)) x += sx;
      else {
        // Net tegen een hoek? Een klein beetje opzij schuiven, dan glij je rond de hoek.
        const nudge = Math.sign(sy) * Math.min(Math.abs(sx), 2);
        if (nudge && !hit(x + sx, y + nudge)) { x += sx; y += nudge; }
      }
      if (!hit(x, y + sy)) y += sy;
      else {
        const nudge = Math.sign(sx) * Math.min(Math.abs(sy), 2);
        if (nudge && !hit(x + nudge, y + sy)) { y += sy; x += nudge; }
      }
    }
    return { x, y, blocked: hit };
  }

  function blocked(d, x, y, r) {
    return slide(d, x, y, 0, 0, r).blocked(x, y);
  }

  // Zicht tussen twee punten: geen muur ertussen (stapjes van een half vakje).
  function clear(d, ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / (T / 3));
    for (let i = 1; i < n; i++) {
      const x = ax + ((bx - ax) * i) / n, y = ay + ((by - ay) * i) / n;
      if (solid(d, Math.floor(x / T), Math.floor(y / T))) return false;
    }
    return true;
  }

  return { T, R, CLASSES, CLASS_IDS, MONSTERS, POORT, rng, makeDungeon, flow, grid, solid, slide, blocked, clear };
});
