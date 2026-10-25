// Burchtstorm: de regels van één schacht (10 breed, 20 hoog plus 2 onzichtbare rijen bovenaan).
// Gedeeld door de leerling (die speelt) en de server (aanvalstabel, kleuren). Geen DOM, zodat het ook onder node werkt.
// Stenen draaien met wandschoppen, komen in zakjes van zeven, en wie rijen vult stuurt belegeringsrijen naar een ander.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BsCore = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const W = 10, H = 22, HIDDEN = 2, VIS = H - HIDDEN;
  const TYPES = 'IOTSZJL';
  // 1-7 de stenen, 8 belegeringsrij. Neon op donker glas.
  const COLORS = [null, '#38e8ff', '#ffd23f', '#b86bff', '#4dff9a', '#ff4d6d', '#4a86ff', '#ff9a3d', '#6b7690'];
  const PLAYER_COLORS = ['#ff6bd6', '#4cc9ff', '#ffc94a', '#5dff9e', '#ff7a45', '#b98cff', '#ff4d6d', '#3dffe0', '#c6ff4a', '#ff9ec7', '#7aa8ff', '#ffe27a'];

  // De vormen in hun beginstand (rij per rij, van boven naar onder).
  const SHAPES = {
    I: ['....', 'XXXX', '....', '....'],
    O: ['XX', 'XX'],
    T: ['.X.', 'XXX', '...'],
    S: ['.XX', 'XX.', '...'],
    Z: ['XX.', '.XX', '...'],
    J: ['X..', 'XXX', '...'],
    L: ['..X', 'XXX', '...'],
  };
  // Per steen en per stand (0, R, 2, L) de vakjes als [x, y].
  const CELLS = {};
  for (const t of TYPES) {
    const rows = SHAPES[t], n = rows.length;
    let cells = [];
    rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'X') cells.push([x, y]); }));
    CELLS[t] = [];
    for (let r = 0; r < 4; r++) {
      CELLS[t].push(cells);
      cells = cells.map(([x, y]) => [n - 1 - y, x]);
    }
  }

  // Wandschoppen (SRS). In de tabellen is y omhoog; wij rekenen met y omlaag, dus keren we y om.
  const K = s => s.split(' ').map(p => { const [x, y] = p.split(',').map(Number); return [x, -y]; });
  const KICKS = {
    '0>1': K('0,0 -1,0 -1,1 0,-2 -1,-2'), '1>0': K('0,0 1,0 1,-1 0,2 1,2'),
    '1>2': K('0,0 1,0 1,-1 0,2 1,2'), '2>1': K('0,0 -1,0 -1,1 0,-2 -1,-2'),
    '2>3': K('0,0 1,0 1,1 0,-2 1,-2'), '3>2': K('0,0 -1,0 -1,-1 0,2 -1,2'),
    '3>0': K('0,0 -1,0 -1,-1 0,2 -1,2'), '0>3': K('0,0 1,0 1,1 0,-2 1,-2'),
  };
  const KICKS_I = {
    '0>1': K('0,0 -2,0 1,0 -2,-1 1,2'), '1>0': K('0,0 2,0 -1,0 2,1 -1,-2'),
    '1>2': K('0,0 -1,0 2,0 -1,2 2,-1'), '2>1': K('0,0 1,0 -2,0 1,-2 -2,1'),
    '2>3': K('0,0 2,0 -1,0 2,1 -1,-2'), '3>2': K('0,0 -2,0 1,0 -2,-1 1,2'),
    '3>0': K('0,0 1,0 -2,0 1,-2 -2,1'), '0>3': K('0,0 -1,0 2,0 -1,2 2,-1'),
  };

  // Aanvallen: hoeveel belegeringsrijen een opruiming waard is.
  const LINES = [0, 0, 1, 2, 4];
  const TSPIN = [0, 2, 4, 6];
  const MINI = [0, 0, 1];
  const COMBO = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5];
  const PERFECT = 6;
  const MAX_GARBAGE_PER_LOCK = 8;

  // Snelheid in rijen per seconde, per niveau. Het niveau stijgt met de speeltijd.
  const GRAVITY = [1, 1.4, 1.9, 2.5, 3.2, 4, 5, 6.2, 7.6, 9.2, 11, 13.5, 16, 19, 23];
  const LOCK_MS = 500;
  const LOCK_RESETS = 15;
  const RUNE_EVERY = 8; // om de zoveel stenen een vraag

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  function create(seed = Date.now()) {
    const rand = rng(seed);
    const g = {
      grid: new Uint8Array(W * H), cur: null, hold: null, canHold: true, queue: [], combo: -1, b2b: false, over: false,
      incoming: [], lastRot: false, lastKick: 0, lockMs: 0, resets: 0, fall: 0, pieces: 0, lines: 0,
    };
    const bag = [];
    function refill() {
      while (g.queue.length < 6) {
        if (!bag.length) {
          const b = [...TYPES];
          for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
          bag.push(...b);
        }
        g.queue.push(bag.shift());
      }
    }

    const at = (x, y) => (x < 0 || x >= W || y >= H ? 9 : y < 0 ? 0 : g.grid[y * W + x]);
    function fits(t, r, x, y) {
      for (const [cx, cy] of CELLS[t][r]) if (at(x + cx, y + cy)) return false;
      return true;
    }
    g.cells = (p = g.cur) => (p ? CELLS[p.t][p.r].map(([cx, cy]) => [p.x + cx, p.y + cy]) : []);

    function spawn(t) {
      const n = SHAPES[t].length;
      g.cur = { t, r: 0, x: Math.floor((W - n) / 2), y: 0 };
      g.lastRot = false;
      g.lockMs = 0;
      g.resets = 0;
      g.fall = 0;
      if (!fits(t, 0, g.cur.x, g.cur.y)) { g.over = true; return false; }
      if (fits(t, 0, g.cur.x, g.cur.y + 1)) g.cur.y++;
      return true;
    }
    function next() {
      refill();
      const t = g.queue.shift();
      refill();
      return spawn(t);
    }

    g.onGround = () => g.cur && !fits(g.cur.t, g.cur.r, g.cur.x, g.cur.y + 1);
    function touched() {
      // Bewegen op de grond geeft een beetje extra tijd, maar niet eindeloos.
      if (g.onGround() && g.resets < LOCK_RESETS) { g.lockMs = 0; g.resets++; }
    }

    g.shift = dx => {
      if (!g.cur || g.over || !fits(g.cur.t, g.cur.r, g.cur.x + dx, g.cur.y)) return false;
      g.cur.x += dx;
      g.lastRot = false;
      touched();
      return true;
    };
    g.rotate = dir => {
      const p = g.cur;
      if (!p || g.over || p.t === 'O') return false;
      const to = (p.r + (dir > 0 ? 1 : 3)) % 4;
      const kicks = (p.t === 'I' ? KICKS_I : KICKS)[`${p.r}>${to}`];
      for (let i = 0; i < kicks.length; i++) {
        const [kx, ky] = kicks[i];
        if (fits(p.t, to, p.x + kx, p.y + ky)) {
          p.x += kx; p.y += ky; p.r = to;
          g.lastRot = true;
          g.lastKick = i;
          touched();
          return true;
        }
      }
      return false;
    };
    g.ghostY = () => {
      const p = g.cur;
      if (!p) return 0;
      let y = p.y;
      while (fits(p.t, p.r, p.x, y + 1)) y++;
      return y;
    };
    // Eén rij zakken. Geeft true als het lukte.
    g.down = () => {
      const p = g.cur;
      if (!p || !fits(p.t, p.r, p.x, p.y + 1)) return false;
      p.y++;
      g.lastRot = false;
      return true;
    };
    g.hard = () => {
      if (!g.cur || g.over) return null;
      const from = g.cur.y, y = g.ghostY();
      if (y !== from) g.lastRot = false;
      g.cur.y = y;
      const res = lock();
      res.drop = y - from;
      return res;
    };
    g.doHold = () => {
      if (!g.cur || !g.canHold || g.over) return false;
      const t = g.cur.t;
      g.canHold = false;
      if (g.hold) { const h = g.hold; g.hold = t; spawn(h); } else { g.hold = t; next(); }
      return true;
    };

    // Tijd laten lopen: vallen met de zwaartekracht, en vastzetten na de wachttijd op de grond.
    // soft: sneller zakken (pijl omlaag). Geeft het resultaat van een vastgezette steen terug, of null.
    g.step = (ms, gravity, soft = false) => {
      if (!g.cur || g.over) return null;
      const rate = soft ? Math.max(20, gravity * 20) : gravity;
      g.fall += (ms / 1000) * rate;
      while (g.fall >= 1) {
        g.fall -= 1;
        if (!g.down()) { g.fall = 0; break; }
        if (soft) g.softRows = (g.softRows || 0) + 1;
      }
      if (g.onGround()) {
        g.lockMs += ms;
        if (g.lockMs >= LOCK_MS) return lock();
      } else g.lockMs = 0;
      return null;
    };

    // T-spin: de T draaide als laatste en drie van de vier hoeken rond zijn midden zijn bezet.
    function tspin() {
      const p = g.cur;
      if (p.t !== 'T' || !g.lastRot) return null;
      const corners = [[0, 0], [2, 0], [2, 2], [0, 2]].map(([cx, cy]) => (at(p.x + cx, p.y + cy) ? 1 : 0));
      if (corners.reduce((a, b) => a + b, 0) < 3) return null;
      // De twee hoeken aan de kant van de punt van de T
      const front = [[0, 1], [1, 2], [2, 3], [3, 0]][p.r];
      return corners[front[0]] && corners[front[1]] ? 'full' : g.lastKick === 4 ? 'full' : 'mini';
    }

    function lock() {
      const p = g.cur;
      const spin = tspin();
      const cells = g.cells(p);
      for (const [x, y] of cells) if (y >= 0) g.grid[y * W + x] = TYPES.indexOf(p.t) + 1;
      const lockOut = cells.every(([, y]) => y < HIDDEN);
      const rows = [];
      for (let y = 0; y < H; y++) {
        let full = true;
        for (let x = 0; x < W; x++) if (!g.grid[y * W + x]) { full = false; break; }
        if (full) rows.push(y);
      }
      for (const y of rows) {
        g.grid.copyWithin(W, 0, y * W);
        g.grid.fill(0, 0, W);
      }
      const n = rows.length;
      g.pieces++;
      g.lines += n;
      let attack = 0, b2bNow = false, pc = false;
      if (n) {
        g.combo++;
        const hard = n === 4 || spin;
        attack = spin === 'full' ? TSPIN[n] : spin === 'mini' ? MINI[Math.min(n, 2)] : LINES[n];
        if (hard && g.b2b) { attack += 1; b2bNow = true; }
        g.b2b = Boolean(hard);
        attack += COMBO[Math.min(g.combo, COMBO.length - 1)];
        pc = g.grid.every(v => !v);
        if (pc) attack += PERFECT;
      } else g.combo = -1;
      // Eerst je eigen belegering wegwerken; wat overblijft gaat naar een ander.
      let cancelled = 0;
      while (attack > 0 && g.incoming.length) {
        const a = g.incoming[0], k = Math.min(a.n, attack);
        a.n -= k; attack -= k; cancelled += k;
        if (!a.n) g.incoming.shift();
      }
      let garbage = 0;
      if (!n) garbage = applyGarbage();
      g.cur = null;
      g.canHold = true;
      const res = { lines: n, rows, spin, combo: Math.max(0, g.combo), b2b: b2bNow, pc, attack, cancelled, garbage, t: p.t, cells };
      if (lockOut) g.over = true;
      else next();
      res.over = g.over;
      return res;
    }

    function applyGarbage() {
      let total = 0;
      while (g.incoming.length && total < MAX_GARBAGE_PER_LOCK) {
        const a = g.incoming[0], k = Math.min(a.n, MAX_GARBAGE_PER_LOCK - total);
        for (let i = 0; i < W * k; i++) if (g.grid[i]) g.over = true;
        g.grid.copyWithin(0, W * k);
        for (let y = H - k; y < H; y++) for (let x = 0; x < W; x++) g.grid[y * W + x] = x === a.hole ? 0 : 8;
        a.n -= k; total += k;
        if (!a.n) g.incoming.shift();
      }
      return total;
    }

    g.addGarbage = (n, hole) => {
      g.incoming.push({ n, hole: Number.isInteger(hole) && hole >= 0 && hole < W ? hole : Math.floor(rand() * W) });
    };
    g.pending = () => g.incoming.reduce((a, b) => a + b.n, 0);
    // Na het vallen van je burcht: alles leeg, je wachtrij blijft.
    g.reset = () => {
      g.grid.fill(0);
      g.incoming = [];
      g.combo = -1;
      g.b2b = false;
      g.over = false;
      g.hold = null;
      g.canHold = true;
      next();
    };
    // De zichtbare schacht als tekst (200 tekens 0-8), met de vallende steen erin. Voor het bord.
    g.snapshot = () => {
      const out = new Array(VIS * W);
      for (let i = 0; i < VIS * W; i++) out[i] = g.grid[HIDDEN * W + i];
      if (g.cur) {
        const v = TYPES.indexOf(g.cur.t) + 1;
        for (const [x, y] of g.cells()) if (y >= HIDDEN) out[(y - HIDDEN) * W + x] = v;
      }
      return out.join('');
    };
    next();
    return g;
  }

  // Het niveau na zoveel seconden spelen, en de bijhorende snelheid.
  const level = sec => Math.min(GRAVITY.length, 1 + Math.floor(sec / 25));
  const gravity = sec => GRAVITY[level(sec) - 1];

  return { W, H, HIDDEN, VIS, TYPES, COLORS, PLAYER_COLORS, CELLS, SHAPES, LINES, RUNE_EVERY, create, level, gravity };
});
