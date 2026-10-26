// Robopaarden in 3D: de camera hangt achter en boven je robotpaard. De grond wordt per pixel getekend op een klein canvas
// (uit de gebakken baan van RpDraw); de omheining, schansen, de burcht, poorten, lantaarns, bomen en runenkisten
// staan er als echte vormen of als plaatjes bovenop, van ver naar dichtbij getekend.
// Gebruikt RpWorld en RpDraw.
const Rp3D = (() => {
  const Wd = RpWorld;
  const FOV = 1.2;
  const CAM_Z = 190;
  const BACK = 300;
  const HORIZON = .32;
  const NEAR = 12;
  const FAR = 4200;
  const HW = 150;            // breedte van een paardplaatje in baaneenheden
  const FOG = [44, 24, 58];
  const GRASS = [26, 58, 48];
  const LIGHT = [-.45, -.6, .66];

  // ---------- Vaste dingen langs de baan (één keer berekend) ----------
  let seed = 777;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const inLake = (x, y) => ((x - 4900) / 2000) ** 2 + ((y - 3350) / 960) ** 2 < 1;
  const tmp = { i: -1 };
  const free = (x, y, room) => { const l = Wd.locate(x, y, tmp); return (l.i < 0 || l.edge > Wd.OFF + room) && !inLake(x, y) && x > 0 && y > 0 && x < Wd.W && y < Wd.H; };

  // De omheining: lage neonrails aan de rand van het gras.
  const FENCE = [];
  for (const p of Wd.PATHS) {
    for (let i = p.first; i <= p.last; i += 3) {
      const j = Wd.step(i, 3);
      if (j === i) continue;
      for (const side of [-1, 1]) {
        const off = side * (Wd.HALF[i] + Wd.OFF + 6), off2 = side * (Wd.HALF[j] + Wd.OFF + 6);
        const ax = Wd.X[i] - Wd.TY[i] * off, ay = Wd.Y[i] + Wd.TX[i] * off;
        const bx = Wd.X[j] - Wd.TY[j] * off2, by = Wd.Y[j] + Wd.TX[j] * off2;
        const la = Wd.locate(ax, ay, {}), lb = Wd.locate(bx, by, {});
        if (la.i < 0 || lb.i < 0 || la.edge < Wd.OFF - 20 || lb.edge < Wd.OFF - 20) continue;
        if ((Wd.FLAG[i] & Wd.F_GAP) || (Wd.FLAG[j] & Wd.F_GAP)) continue;
        FENCE.push({ ax, ay, bx, by, x: (ax + bx) / 2, y: (ay + by) / 2, nx: -Wd.TY[i] * side, ny: Wd.TX[i] * side });
      }
    }
  }
  // De weg zelf als echte vlakken (scherp, ook vlak voor je neus). Per stukje van 30 eenheden:
  // het asfalt, de neonranden links en rechts, nitrostroken. De kloof krijgt eigen wanden.
  const ASPHALT = { hoofd: '#34324a', burcht: '#4f4b60', kloof: '#3a3346', bos: '#4a3b2c' };
  const SEGS = [];
  // Ligt dit punt op het begin of einde van een zijweg? Dan krijgt de hoofdbaan daar geen rand (de weg loopt door).
  const onBranch = (x, y) => {
    for (const p of Wd.PATHS) {
      if (p.closed) continue;
      for (const [a, b] of [[p.first, Math.min(p.last, p.first + 30)], [Math.max(p.first, p.last - 30), p.last]]) {
        for (let i = a; i <= b; i++) if ((Wd.X[i] - x) ** 2 + (Wd.Y[i] - y) ** 2 < (Wd.HALF[i] + 4) ** 2) return true;
      }
    }
    return false;
  };
  for (const p of Wd.PATHS) {
    for (let i = p.first; i <= p.last; i++) {
      const j = Wd.NEXT[i];
      if (j < 0 || (Wd.FLAG[i] & Wd.F_GAP) || (Wd.FLAG[j] & Wd.F_GAP)) continue;
      const side = (k, off) => [Wd.X[k] - Wd.TY[k] * off, Wd.Y[k] + Wd.TX[k] * off];
      const edge = [-1, 1].map(sd => {
        if (!RpDraw.EDGE[p.key] && p.key !== 'bos') return null;
        if (!p.closed && (RpDraw.onMain(...side(i, sd * (Wd.HALF[i] - 6)), p) || RpDraw.onMain(...side(j, sd * (Wd.HALF[j] - 6)), p))) return null;
        if (p.closed && (onBranch(...side(i, sd * (Wd.HALF[i] - 6))) || onBranch(...side(j, sd * (Wd.HALF[j] - 6))))) return null;
        return {
          line: [side(i, sd * (Wd.HALF[i] - 18)), side(j, sd * (Wd.HALF[j] - 18)), side(j, sd * (Wd.HALF[j] + 1)), side(i, sd * (Wd.HALF[i] + 1))],
        };
      });
      SEGS.push({
        i, x: (Wd.X[i] + Wd.X[j]) / 2, y: (Wd.Y[i] + Wd.Y[j]) / 2, key: p.key, alt: (i >> 1) & 1, pad: !!(Wd.FLAG[i] & Wd.F_PAD),
        road: [side(i, -Wd.HALF[i] - 2), side(j, -Wd.HALF[j] - 2), side(j, Wd.HALF[j] + 2), side(i, Wd.HALF[i] + 2)],
        berm: [side(i, -Wd.HALF[i] - Wd.OFF), side(j, -Wd.HALF[j] - Wd.OFF), side(j, Wd.HALF[j] + Wd.OFF), side(i, Wd.HALF[i] + Wd.OFF)],
        mid: [side(i, -Wd.HALF[i] * .55), side(j, -Wd.HALF[j] * .55), side(j, Wd.HALF[j] * .55), side(i, Wd.HALF[i] * .55)],
        edge,
      });
    }
  }
  const ellipse = (cx, cy, rx, ry, n = 40) => Array.from({ length: n }, (_, k) => [cx + Math.cos((k / n) * Math.PI * 2) * rx, cy + Math.sin((k / n) * Math.PI * 2) * ry]);
  const LAKE = ellipse(4900, 3350, 2050, 1000, 56), ISLE = ellipse(4900, 3350, 520, 330), ISLE2 = ellipse(4900, 3350, 430, 260);
  // De startlijn: een dambord dwars over de weg.
  const CHECKS = [];
  {
    const i = Wd.START, j = Wd.NEXT[i], n = 10, hw = Wd.HALF[i];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < n; c++) {
        const a = -hw + (2 * hw * c) / n, b = -hw + (2 * hw * (c + 1)) / n;
        const t0 = r * 15, t1 = t0 + 15;
        const P = (t, off) => [Wd.X[i] + Wd.TX[i] * t - Wd.TY[i] * off, Wd.Y[i] + Wd.TY[i] * t + Wd.TX[i] * off];
        CHECKS.push({ white: (r + c) % 2 === 0, pts: [P(t0, a), P(t0, b), P(t1, b), P(t1, a)] });
      }
    }
    void j;
  }
  // De Drakenkloof: de rand van de spleet (links heen, rechts terug).
  const GAP_W = Wd.HALF[Wd.GAP.from] + Wd.OFF + 30;
  const GAP_L = [], GAP_R = [];
  for (let i = Wd.step(Wd.GAP.from, -1); ; i = Wd.NEXT[i]) {
    GAP_L.push([Wd.X[i] - Wd.TY[i] * GAP_W, Wd.Y[i] + Wd.TX[i] * GAP_W]);
    GAP_R.push([Wd.X[i] + Wd.TY[i] * GAP_W, Wd.Y[i] - Wd.TX[i] * GAP_W]);
    if (i === Wd.GAP.to) break;
  }
  const GAP_MID = [Wd.X[(Wd.GAP.from + Wd.GAP.to) >> 1], Wd.Y[(Wd.GAP.from + Wd.GAP.to) >> 1]];

  // Lantaarns langs de hoofdbaan en de burchtroute.
  const LAMPS = [];
  for (const p of Wd.PATHS) {
    if (p.key === 'bos') continue;
    for (let i = p.first + 5; i <= p.last; i += 11) {
      for (const side of [-1, 1]) {
        const off = side * (Wd.HALF[i] + 60);
        const x = Wd.X[i] - Wd.TY[i] * off, y = Wd.Y[i] + Wd.TX[i] * off;
        const l = Wd.locate(x, y, {});
        if (l.i >= 0 && l.edge < 20) continue;
        LAMPS.push({ x, y, c: p.key === 'burcht' ? '#ffd34f' : p.key === 'kloof' ? '#ff8c42' : '#4cf0ff' });
      }
    }
  }
  // Gele pijlborden aan de buitenkant van elke bocht: zo zie je van ver waar de weg heen gaat.
  const SIGNS = [];
  for (const p of Wd.PATHS) {
    let lastX = -1e9, lastY = -1e9;
    for (let i = p.first; i <= p.last; i += 2) {
      const a0 = Math.atan2(Wd.TY[Wd.step(i, -7)], Wd.TX[Wd.step(i, -7)]);
      const a1 = Math.atan2(Wd.TY[Wd.step(i, 7)], Wd.TX[Wd.step(i, 7)]);
      const bend = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
      if (Math.abs(bend) < .45) continue;
      const turn = bend > 0 ? 1 : -1; // 1 = rechtsaf (y naar beneden)
      const off = -turn * (Wd.HALF[i] + 45);
      const x = Wd.X[i] - Wd.TY[i] * off, y = Wd.Y[i] + Wd.TX[i] * off;
      if (Math.hypot(x - lastX, y - lastY) < 330) continue;
      const l = Wd.locate(x, y, {});
      if (l.i >= 0 && l.edge < 10) continue;
      lastX = x; lastY = y;
      SIGNS.push({ x, y, i, turn });
    }
  }
  // Posterborden langs de rechte stukken (eigen foto's of de grappige posters), om beurten links en rechts.
  const BOARDS = [];
  for (const p of Wd.PATHS) {
    if (p.key === 'bos') continue;
    let side = 1;
    for (let i = p.first + 12; i <= p.last - 12; i += 3) {
      const a0 = Math.atan2(Wd.TY[Wd.step(i, -10)], Wd.TX[Wd.step(i, -10)]);
      const a1 = Math.atan2(Wd.TY[Wd.step(i, 10)], Wd.TX[Wd.step(i, 10)]);
      if (Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0))) > .2) continue;
      const off = side * (Wd.HALF[i] + 120);
      const x = Wd.X[i] - Wd.TY[i] * off, y = Wd.Y[i] + Wd.TX[i] * off;
      if (BOARDS.some(b => Math.hypot(b.x - x, b.y - y) < 1700) || SIGNS.some(s => Math.hypot(s.x - x, s.y - y) < 250)) continue;
      const l = Wd.locate(x, y, {});
      if ((l.i >= 0 && l.edge < 30) || inLake(x, y)) continue;
      BOARDS.push({ x, y, i, n: BOARDS.length });
      side = -side;
    }
  }
  const SIGN_IMG = [-1, 1].map(turn => {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#14182b';
    g.fillRect(0, 0, 160, 64);
    g.strokeStyle = '#4cf0ff';
    g.lineWidth = 4;
    g.strokeRect(2, 2, 156, 60);
    g.fillStyle = '#ffd34f';
    for (let k = 0; k < 3; k++) {
      const cx = 40 + k * 40;
      g.beginPath();
      g.moveTo(cx - 12 * turn, 12); g.lineTo(cx + 12 * turn, 32); g.lineTo(cx - 12 * turn, 52);
      g.lineTo(cx - 24 * turn, 52); g.lineTo(cx, 32); g.lineTo(cx - 24 * turn, 12);
      g.closePath();
      g.fill();
    }
    return c;
  });

  // Bomen: overal waar geen weg is, dicht opeen rond het geheime bospad.
  const PINES = [];
  for (let n = 0; n < 2200 && PINES.length < 420; n++) {
    const x = rand() * Wd.W, y = rand() * Wd.H;
    if (free(x, y, 70)) PINES.push({ x, y, h: 170 + rand() * 120, v: n % 3 });
  }
  const bos = Wd.PATHS.find(p => p.secret);
  for (let i = bos.first - 0; i <= bos.last; i += 2) {
    for (const side of [-1, 1]) {
      const off = side * (Wd.HALF[i] + Wd.OFF + 40 + rand() * 200);
      const x = Wd.X[i] - Wd.TY[i] * off, y = Wd.Y[i] + Wd.TX[i] * off;
      if (free(x, y, 20)) PINES.push({ x, y, h: 200 + rand() * 140, v: 2 });
    }
  }
  // De ingang van het bospad: een paar bomen half ervoor, zodat je hem moet zoeken.
  for (const k of [3, 6]) {
    const i = Wd.step(bos.first, k);
    for (const side of [-1, 1]) {
      const off = side * (Wd.HALF[i] + 30);
      PINES.push({ x: Wd.X[i] - Wd.TY[i] * off, y: Wd.Y[i] + Wd.TX[i] * off, h: 230, v: 2, soft: true });
    }
  }
  // De burcht: muren langs de burchtroute, met een poort aan het begin en het einde.
  const burcht = Wd.PATHS.find(p => p.key === 'burcht');
  const WALLS = [];
  const GATES = [];
  {
    const a = Wd.step(burcht.first, Math.round((burcht.last - burcht.first) * .16));
    const b = Wd.step(burcht.first, Math.round((burcht.last - burcht.first) * .84));
    for (let i = a; i < b; i += 3) {
      const j = Wd.step(i, 3);
      for (const side of [-1, 1]) {
        const o1 = side * (Wd.HALF[i] + Wd.OFF + 30), o2 = side * (Wd.HALF[j] + Wd.OFF + 30);
        WALLS.push({ ax: Wd.X[i] - Wd.TY[i] * o1, ay: Wd.Y[i] + Wd.TX[i] * o1, bx: Wd.X[j] - Wd.TY[j] * o2, by: Wd.Y[j] + Wd.TX[j] * o2, nx: -Wd.TY[i] * side, ny: Wd.TX[i] * side, n: i });
      }
    }
    for (const i of [a, b]) GATES.push({ i, w: Wd.HALF[i] + Wd.OFF + 30 });
  }
  const CYLS = [
    { x: 4900, y: 3350, r: 170, h: 460, roof: 260, kind: 'donjon' },
    { x: 4620, y: 3220, r: 70, h: 300, roof: 150, kind: 'toren' },
    { x: 5180, y: 3220, r: 70, h: 300, roof: 150, kind: 'toren' },
    { x: 4620, y: 3480, r: 70, h: 300, roof: 150, kind: 'toren' },
    { x: 5180, y: 3480, r: 70, h: 300, roof: 150, kind: 'toren' },
  ];
  for (const g of GATES) for (const side of [-1, 1]) {
    const off = side * g.w;
    CYLS.push({ x: Wd.X[g.i] - Wd.TY[g.i] * off, y: Wd.Y[g.i] + Wd.TX[g.i] * off, r: 70, h: 330, roof: 150, kind: 'toren' });
  }

  // ---------- Gebakken plaatjes ----------
  const PINE_IMG = [0, 1, 2].map(v => {
    const c = document.createElement('canvas');
    c.width = 120; c.height = 200;
    const g = c.getContext('2d');
    g.fillStyle = '#3b2a1a';
    g.fillRect(53, 160, 14, 40);
    const greens = [['#1f6e5a', '#25856b'], ['#1d5e4a', '#2a7a5e'], ['#163f36', '#1f5545']][v];
    for (let i = 0; i < 4; i++) {
      const y0 = 172 - i * 40, wdt = 58 - i * 11;
      g.fillStyle = greens[i % 2];
      g.beginPath(); g.moveTo(60 - wdt, y0); g.lineTo(60, y0 - 70); g.lineTo(60 + wdt, y0); g.closePath(); g.fill();
      g.strokeStyle = v === 2 ? 'rgba(120, 255, 170, .25)' : 'rgba(123, 241, 168, .55)';
      g.lineWidth = 2;
      g.stroke();
    }
    return c;
  });
  function glowImg(color, size = 64) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(.18, color);
    gr.addColorStop(.45, RpDraw.rgba(color, .35));
    gr.addColorStop(1, RpDraw.rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  const GLOW = { '#4cf0ff': glowImg('#4cf0ff'), '#ffd34f': glowImg('#ffd34f'), '#ff8c42': glowImg('#ff8c42'), fire: glowImg('#ff7a2f', 96), blue: glowImg('#7fd8ff', 96) };
  // Een runenkist: een zwevend kristallen blok met een vraagteken.
  const BOX_IMG = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gl = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    gl.addColorStop(0, 'rgba(255, 211, 79, .55)');
    gl.addColorStop(1, 'rgba(255, 211, 79, 0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, 128, 128);
    const face = (pts, fill) => { g.fillStyle = fill; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.strokeStyle = '#fff3b0'; g.lineWidth = 2.5; g.stroke(); };
    face([[30, 44], [64, 28], [98, 44], [64, 60]], 'rgba(255, 240, 180, .85)');
    face([[30, 44], [64, 60], [64, 102], [30, 86]], 'rgba(214, 150, 40, .9)');
    face([[98, 44], [64, 60], [64, 102], [98, 86]], 'rgba(170, 100, 30, .9)');
    g.fillStyle = '#fff';
    g.font = '900 30px Orbitron, sans-serif';
    g.textAlign = 'center';
    g.fillText('?', 47, 86);
    g.fillText('?', 81, 86);
    return c;
  })();

  // Het panorama: bergen en burchten in de zonsondergang.
  const pano = document.createElement('canvas');
  pano.width = 2400;
  pano.height = 220;
  (() => {
    const g = pano.getContext('2d');
    const ridge = (base, amp, s, color) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, 220);
      for (let x = 0; x <= 2400; x += 30) g.lineTo(x, base - amp * (.5 + .5 * Math.sin(x / 170 + s) * Math.cos(x / 67 + s * 2)));
      g.lineTo(2400, 220);
      g.fill();
    };
    ridge(120, 100, .7, '#5a2f6a');
    ridge(160, 70, 3.1, '#3d2350');
    for (const cx of [420, 1180, 1900]) {
      g.fillStyle = '#26163a';
      g.fillRect(cx - 100, 130, 200, 90);
      for (const tx of [-100, -25, 60]) {
        g.fillRect(cx + tx, 76, 34, 64);
        g.beginPath(); g.moveTo(cx + tx - 5, 78); g.lineTo(cx + tx + 17, 36); g.lineTo(cx + tx + 39, 78); g.fill();
      }
      g.fillStyle = '#ffd166';
      for (let k = 0; k < 8; k++) g.fillRect(cx - 90 + ((k * 47) % 180), 145 + ((k * 13) % 40), 4, 6);
    }
    ridge(205, 26, 5.2, '#241634');
  })();
  const STARS = Array.from({ length: 70 }, (_, i) => ({ az: (i * 2.399) % (Math.PI * 2), h: ((i * 37) % 100) / 100, s: i % 9 === 0 ? 2 : 1 }));

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
  }
  const lit = (nx, ny, nz) => .45 + .55 * Math.max(0, -(nx * LIGHT[0] + ny * LIGHT[1]) * .8 + nz * LIGHT[2]);

  // ---------- Effecten in 3D ----------
  const fx = [];
  function add(e) {
    fx.push({ ...e, at: performance.now() });
    if (fx.length > 60) fx.shift();
  }
  const boom = (x, y, r, color = '#ff8c42') => add({ x, y, r, life: .6, kind: 'boom', color });
  const spark = (x, y, color) => add({ x, y, r: 40, life: .35, kind: 'spark', color });

  // ---------- De grond ----------
  // scene: { me: {x, y, z}, a, self: {look, av, frame, boost, shield, spin, zap} of null,
  //          others: [{x, y, z, a, look, av, name, frame, flags, rank}], boxes (verborgen ids), shots, traps, t, quality }
  function render(ctx, w, h, scene) {
    const { me, a } = scene;
    const ca = Math.cos(a), sa = Math.sin(a);
    const fov = FOV + (scene.boost ? .12 : 0);
    const half = Math.tan(fov / 2);
    const f = (w / 2) / half;
    const back = Math.max(BACK * .8, Math.min(BACK * 2, (CAM_Z * f) / ((.8 - HORIZON) * h)));
    const cam = { x: me.x - ca * back, y: me.y - sa * back, z: CAM_Z + Math.max(-120, me.z || 0) * .55 };
    const hz = Math.round(HORIZON * h);
    const q = scene.quality || 1;

    // Lucht en gras als verlopen; het meer, de bermen en de weg komen er later als echte vlakken op.
    const camZ = Math.max(40, cam.z);
    {
      const sky = ctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, 'rgb(28, 14, 60)');
      sky.addColorStop(.5, 'rgb(78, 31, 75)');
      sky.addColorStop(1, 'rgb(228, 84, 90)');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, hz + 1);
      const fogAt = y => Math.min(.92, (((camZ * f) / Math.max(.5, y - hz + .5)) / FAR) ** 1.3 * 1.5);
      const grass = ctx.createLinearGradient(0, hz, 0, h);
      for (const k of [0, .02, .05, .1, .2, .35, .6, 1]) {
        const fo = fogAt(hz + k * (h - hz)), keep = 1 - fo;
        grass.addColorStop(k, `rgb(${Math.round(GRASS[0] * keep + FOG[0] * fo)}, ${Math.round(GRASS[1] * keep + FOG[1] * fo)}, ${Math.round(GRASS[2] * keep + FOG[2] * fo)})`);
      }
      ctx.fillStyle = grass;
      ctx.fillRect(0, hz, w, h - hz);
    }
    // Sterren, de zon en het panorama, meedraaiend.
    ctx.fillStyle = '#ffe9f6';
    for (const s of STARS) {
      let rel = s.az - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) > fov) continue;
      ctx.globalAlpha = .25 + s.h * .5;
      ctx.fillRect(w / 2 + Math.tan(rel) * f, s.h * hz * .55, s.s * 1.5, s.s * 1.5);
    }
    ctx.globalAlpha = 1;
    {
      let rel = 2.4 - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) < fov) {
        const sx = w / 2 + Math.tan(rel) * f, sy = hz * .72, r = hz * .32;
        const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2);
        sun.addColorStop(0, 'rgba(255, 240, 200, 1)');
        sun.addColorStop(.25, 'rgba(255, 170, 90, .9)');
        sun.addColorStop(1, 'rgba(255, 90, 120, 0)');
        ctx.fillStyle = sun;
        ctx.fillRect(sx - r * 2, sy - r * 2, r * 4, r * 4);
      }
    }
    {
      const span = pano.width;
      const perRad = span / (Math.PI * 2);
      const ph = hz * .6;
      const left = ((a - fov / 2) * perRad) % span;
      const width = fov * perRad;
      for (let start = ((left % span) + span) % span, x = 0, rest = width; rest > 0;) {
        const take = Math.min(rest, span - start);
        ctx.drawImage(pano, start, 0, take, pano.height, x, hz - ph + 2, (take / width) * w, ph);
        x += (take / width) * w;
        rest -= take;
        start = 0;
      }
      const glow = ctx.createLinearGradient(0, hz - 34, 0, hz + 10);
      glow.addColorStop(0, 'rgba(255, 140, 120, 0)');
      glow.addColorStop(1, 'rgba(255, 140, 120, .35)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, hz - 34, w, 44);
    }

    // ---------- 3D-vormen ----------
    const toCam = (x, y, z) => {
      const dx = x - cam.x, dy = y - cam.y;
      return [-dx * sa + dy * ca, z, dx * ca + dy * sa];
    };
    const proj = p => [w / 2 + (p[0] * f) / p[2], hz + ((cam.z - p[1]) * f) / p[2]];
    function polygon(pts) {
      const c = pts.map(p => toCam(p[0], p[1], p[2]));
      const out = [];
      for (let i = 0; i < c.length; i++) {
        const p = c[i], qq = c[(i + 1) % c.length];
        if (p[2] >= NEAR) out.push(p);
        if ((p[2] >= NEAR) !== (qq[2] >= NEAR)) {
          const t = (NEAR - p[2]) / (qq[2] - p[2]);
          out.push([p[0] + (qq[0] - p[0]) * t, p[1] + (qq[1] - p[1]) * t, NEAR]);
        }
      }
      return out.length >= 3 ? out.map(proj) : null;
    }
    function face(pts, fill, stroke, lw = 2) {
      const s = polygon(pts);
      if (!s) return null;
      ctx.beginPath();
      ctx.moveTo(s[0][0], s[0][1]);
      for (let i = 1; i < s.length; i++) ctx.lineTo(s[i][0], s[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
      return s;
    }
    const facing = (x, y, nx, ny) => (cam.x - x) * nx + (cam.y - y) * ny > 0;
    const fogged = (hex, d) => shade(hex, Math.max(.28, 1 - d / FAR));
    function place(x, y, z = 0) {
      const c = toCam(x, y, z);
      if (c[2] < NEAR * 2 || Math.abs(c[0]) > c[2] * half * 1.5 + 200) return null;
      const s = proj(c);
      return { x: s[0], y: s[1], k: f / c[2], perp: c[2] };
    }

    function drawCyl(c, d, n = 12) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        pts.push([c.x + Math.cos(t) * c.r, c.y + Math.sin(t) * c.r, Math.cos(t), Math.sin(t)]);
      }
      const stone = c.kind === 'donjon' ? '#9a93b8' : '#7d7699';
      for (let i = 0; i < n; i++) {
        const p = pts[i], qq = pts[(i + 1) % n];
        const nx = (p[2] + qq[2]) / 2, ny = (p[3] + qq[3]) / 2;
        if (!facing((p[0] + qq[0]) / 2, (p[1] + qq[1]) / 2, nx, ny)) continue;
        face([[p[0], p[1], 0], [qq[0], qq[1], 0], [qq[0], qq[1], c.h], [p[0], p[1], c.h]], fogged(stone, d * 1.1 / lit(nx, ny, 0)));
        face([[p[0], p[1], c.h * .7], [qq[0], qq[1], c.h * .7], [qq[0], qq[1], c.h * .73], [p[0], p[1], c.h * .73]], fogged('#ffd166', d * .6));
        if (i % 3 === 0) {
          const m = (t, zz) => [p[0] + (qq[0] - p[0]) * t, p[1] + (qq[1] - p[1]) * t, zz];
          face([m(.35, c.h * .45), m(.65, c.h * .45), m(.65, c.h * .56), m(.35, c.h * .56)], fogged('#ffd166', d * .7));
        }
      }
      for (let i = 0; i < n; i++) {
        const p = pts[i], qq = pts[(i + 1) % n];
        const nx = (p[2] + qq[2]) / 2, ny = (p[3] + qq[3]) / 2;
        if (!facing((p[0] + qq[0]) / 2, (p[1] + qq[1]) / 2, nx, ny) && cam.z < c.h) continue;
        const e = 1.18;
        face([[c.x + (p[0] - c.x) * e, c.y + (p[1] - c.y) * e, c.h], [c.x + (qq[0] - c.x) * e, c.y + (qq[1] - c.y) * e, c.h], [c.x, c.y, c.h + c.roof]],
          fogged(i % 2 ? '#5b2a8c' : '#7438b0', d * 1.1 / lit(nx, ny, .5)));
      }
      const tip = place(c.x, c.y, c.h + c.roof + 10);
      if (tip && tip.k > .004) {
        const s = Math.max(4, 60 * tip.k);
        ctx.drawImage(GLOW['#ffd34f'], tip.x - s, tip.y - s, s * 2, s * 2);
      }
    }

    function drawFence(o, d) {
      // Van buitenaf alleen dichtbij tekenen: zo zie je de omheining ook als je paard ertegen staat.
      if (d > 600 && !facing(o.x, o.y, -o.nx, -o.ny)) return;
      // Ver weg alleen de lichtrand: het doorzichtige gaas zie je daar toch niet meer.
      if (d < 1700) face([[o.ax, o.ay, 0], [o.bx, o.by, 0], [o.bx, o.by, 34], [o.ax, o.ay, 34]], `rgba(76, 201, 255, ${Math.max(.06, .2 * (1 - d / FAR))})`);
      const s = polygon([[o.ax, o.ay, 34], [o.bx, o.by, 34], [o.bx, o.by, 40], [o.ax, o.ay, 40]]);
      if (s) {
        ctx.fillStyle = `rgba(140, 236, 255, ${Math.max(.25, 1 - d / FAR)})`;
        ctx.beginPath(); s.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.fill();
      }
      const p = place(o.ax, o.ay, 0);
      if (p && p.k > .02) {
        ctx.fillStyle = fogged('#2a2f48', d);
        ctx.fillRect(p.x - 4 * p.k, p.y - 44 * p.k, 8 * p.k, 44 * p.k);
      }
    }

    function drawWall(o, d) {
      const H = 170;
      const front = facing((o.ax + o.bx) / 2, (o.ay + o.by) / 2, -o.nx, -o.ny);
      const l = lit(-o.nx, -o.ny, 0);
      face([[o.ax, o.ay, 0], [o.bx, o.by, 0], [o.bx, o.by, H], [o.ax, o.ay, H]], fogged(front ? '#80799e' : '#4a4562', d * 1.05 / l));
      if (front) {
        // Een schietgat en een gloeiende rune.
        const m = (t, zz) => [o.ax + (o.bx - o.ax) * t, o.ay + (o.by - o.ay) * t, zz];
        face([m(.42, H * .4), m(.58, H * .4), m(.58, H * .75), m(.42, H * .75)], o.n % 2 ? fogged('#ffd166', d * .8) : 'rgba(10, 8, 20, .85)');
      }
      // Kantelen
      const m = (t, zz) => [o.ax + (o.bx - o.ax) * t, o.ay + (o.by - o.ay) * t, zz];
      for (const t of [0, .5]) face([m(t, H), m(t + .28, H), m(t + .28, H + 34), m(t, H + 34)], fogged('#8b84ab', d * 1.05 / l));
    }

    function drawGate(gt, d) {
      const i = gt.i;
      const off = gt.w;
      const L = [Wd.X[i] - Wd.TY[i] * off, Wd.Y[i] + Wd.TX[i] * off], R = [Wd.X[i] + Wd.TY[i] * off, Wd.Y[i] - Wd.TX[i] * off];
      const tx = Wd.TX[i] * 30, ty = Wd.TY[i] * 30;
      const s = face([[L[0], L[1], 250], [R[0], R[1], 250], [R[0], R[1], 330], [L[0], L[1], 330]], fogged('#5f587e', d));
      face([[L[0] + tx, L[1] + ty, 250], [R[0] + tx, R[1] + ty, 250], [R[0], R[1], 250], [L[0], L[1], 250]], fogged('#3a3552', d));
      if (s) {
        const cx = (s[0][0] + s[1][0]) / 2, top = Math.min(s[2][1], s[3][1]), bot = Math.max(s[0][1], s[1][1]);
        const size = Math.min((bot - top) * .62, Math.abs(s[1][0] - s[0][0]) / 8);
        if (size > 8) {
          ctx.font = `900 ${size}px Orbitron, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = fogged('#ffd34f', d * .6);
          ctx.fillText('BURCHTROUTE', cx, bot - (bot - top) * .22);
        }
      }
    }

    function drawStart(d) {
      const i = Wd.START;
      const off = Wd.HALF[i] + 30;
      const L = [Wd.X[i] - Wd.TY[i] * off, Wd.Y[i] + Wd.TX[i] * off], R = [Wd.X[i] + Wd.TY[i] * off, Wd.Y[i] - Wd.TX[i] * off];
      for (const P of [L, R]) {
        face([[P[0] - Wd.TX[i] * 14, P[1] - Wd.TY[i] * 14, 0], [P[0] + Wd.TX[i] * 14, P[1] + Wd.TY[i] * 14, 0], [P[0] + Wd.TX[i] * 14, P[1] + Wd.TY[i] * 14, 300], [P[0] - Wd.TX[i] * 14, P[1] - Wd.TY[i] * 14, 300]], fogged('#3a3f5c', d));
        const p = place(P[0], P[1], 310);
        if (p) { const s = Math.max(4, 70 * p.k); ctx.drawImage(GLOW['#4cf0ff'], p.x - s, p.y - s, s * 2, s * 2); }
      }
      const s = face([[L[0], L[1], 230], [R[0], R[1], 230], [R[0], R[1], 300], [L[0], L[1], 300]], 'rgba(10, 12, 30, .92)', '#4cf0ff', 3);
      if (s) {
        const cx = (s[0][0] + s[1][0]) / 2, top = Math.min(s[2][1], s[3][1]), bot = Math.max(s[0][1], s[1][1]);
        const size = Math.min((bot - top) * .6, Math.abs(s[1][0] - s[0][0]) / 9);
        if (size > 8) {
          ctx.font = `900 ${size}px Orbitron, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('START · FINISH', cx, bot - (bot - top) * .24);
        }
      }
    }

    function drawRamp(r, d) {
      const pts = [];
      for (let m = 0; m < r.len; m++) pts.push(Wd.step(r.i, m));
      const edge = (i, side) => [Wd.X[i] - Wd.TY[i] * side * Wd.HALF[i], Wd.Y[i] + Wd.TX[i] * side * Wd.HALF[i]];
      const first = Wd.PREV[pts[0]] >= 0 ? Wd.PREV[pts[0]] : pts[0];
      let prev = first, pz = 0;
      for (const i of pts) {
        const z = Wd.GROUND[i];
        const a1 = edge(prev, -1), b1 = edge(prev, 1), a2 = edge(i, -1), b2 = edge(i, 1);
        face([[a1[0], a1[1], pz], [b1[0], b1[1], pz], [b2[0], b2[1], z], [a2[0], a2[1], z]], fogged(prev === first ? '#a8681e' : '#c9822a', d), null);
        for (const [p1, p2, side] of [[a1, a2, -1], [b1, b2, 1]]) {
          if (z > 2 && facing(p1[0], p1[1], -Wd.TY[i] * side, Wd.TX[i] * side)) face([[p1[0], p1[1], 0], [p2[0], p2[1], 0], [p2[0], p2[1], z], [p1[0], p1[1], pz]], fogged('#5a3a14', d));
        }
        prev = i;
        pz = z;
      }
      // De rand van de schans: een gloeiende lijn en de achterkant.
      const last = pts[pts.length - 1];
      const a = edge(last, -1), b = edge(last, 1);
      if (facing(Wd.X[last], Wd.Y[last], Wd.TX[last], Wd.TY[last])) face([[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], pz], [a[0], a[1], pz]], fogged('#3a2a12', d));
      const s = polygon([[a[0], a[1], pz], [b[0], b[1], pz], [b[0], b[1], pz + 4], [a[0], a[1], pz + 4]]);
      if (s) { ctx.fillStyle = '#fff3b0'; ctx.beginPath(); s.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.fill(); }
    }

    // ---------- De weg: platte vlakken, per kleur en afstand samen getekend ----------
    function addPoly(layer, key, style, pts, z = 0) {
      const sp = polygon(pts.map(p => [p[0], p[1], z]));
      if (!sp) return;
      let g = layer.get(key);
      if (!g) layer.set(key, (g = { style, path: new Path2D() }));
      g.path.moveTo(sp[0][0], sp[0][1]);
      for (let k = 1; k < sp.length; k++) g.path.lineTo(sp[k][0], sp[k][1]);
      g.path.closePath();
    }
    function fillLayer(layer) {
      for (const g of layer.values()) {
        ctx.globalAlpha = g.style.a;
        ctx.fillStyle = g.style.c;
        ctx.fill(g.path);
      }
      ctx.globalAlpha = 1;
    }
    function drawRoad() {
      const berm = new Map(), road = new Map(), deco = new Map(), lines = new Map();
      // Het burchtmeer met zijn eiland.
      if (near(4900, 3350, FAR_S + 2000)) {
        const dl = Math.max(0, dist2(4900, 3350) - 1400), fk = Math.max(.35, 1 - dl / FAR);
        for (const [pts, col] of [[LAKE, '#1f5a72'], [ISLE, '#3d5a3a'], [ISLE2, '#596a76']]) {
          const sp = polygon(pts.map(p => [p[0], p[1], 0]));
          if (!sp) continue;
          ctx.fillStyle = shade(col, fk);
          ctx.beginPath(); sp.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.fill();
        }
      }
      const BANDS = 4, step = FAR_S / BANDS;
      for (const sg of SEGS) {
        if (!near(sg.x, sg.y, FAR_S)) continue;
        const c = toCam(sg.x, sg.y, 0);
        if (c[2] < -60 || Math.abs(c[0]) > (Math.max(c[2], 0) + 300) * half * 1.3 + 300) continue;
        const d = Math.hypot(c[0], c[2]);
        if (d > FAR_S) continue;
        const band = Math.min(BANDS - 1, Math.floor(d / step));
        const fogK = Math.max(.3, 1 - ((band + .5) * step) / FAR);
        const base = ASPHALT[sg.key];
        // Afwisselende banden (geeft snelheid) alleen dichtbij: elke kleur is een tekenbeurt.
        const alt = band < 2 && sg.alt;
        addPoly(berm, `${sg.key === 'bos' ? 'b' : 'g'}${band}`, { c: shade(sg.key === 'bos' ? '#22402a' : '#3b4a32', fogK), a: 1 }, sg.berm);
        addPoly(road, `${sg.key}${alt ? 1 : 0}${band}`, { c: shade(base, fogK * (alt ? .9 : 1)), a: 1 }, sg.road);
        if (sg.pad) addPoly(deco, `p${sg.alt}${band}`, { c: sg.alt ? '#4cf0ff' : '#1d8fb8', a: .55 * fogK }, sg.mid);
        for (const e of sg.edge) {
          if (!e) continue;
          const col = RpDraw.EDGE[sg.key] || '#8cffaa';
          addPoly(lines, `${col}${band}`, { c: col, a: Math.min(1, .35 + fogK) }, e.line);
        }
      }
      if (near(Wd.X[Wd.START], Wd.Y[Wd.START], FAR_S)) for (const ch of CHECKS) addPoly(deco, ch.white ? 'cw' : 'cb', { c: ch.white ? '#f2f2f8' : '#15151f', a: 1 }, ch.pts);
      fillLayer(berm);
      fillLayer(road);
      fillLayer(deco);
      fillLayer(lines);
      if (near(GAP_MID[0], GAP_MID[1], FAR_S)) drawChasm();
    }
    // De kloof: een zwarte opening, met binnenin rotswanden en lava diep onderaan.
    function drawChasm() {
      const rim = [...GAP_L, ...[...GAP_R].reverse()];
      const top = polygon(rim.map(p => [p[0], p[1], 0]));
      if (!top) return;
      const hole = new Path2D();
      hole.moveTo(top[0][0], top[0][1]);
      for (let k = 1; k < top.length; k++) hole.lineTo(top[k][0], top[k][1]);
      hole.closePath();
      ctx.save();
      ctx.clip(hole);
      ctx.fillStyle = '#07040a';
      ctx.fill(hole);
      const DEEP = -180;
      // Lava onderaan
      const bot = polygon(rim.map(p => [p[0], p[1], DEEP]));
      if (bot) {
        const pb = place(GAP_MID[0], GAP_MID[1], DEEP);
        const r = pb ? Math.max(30, 900 * pb.k) : 200;
        const lava = ctx.createRadialGradient(pb ? pb.x : w / 2, pb ? pb.y : h, 0, pb ? pb.x : w / 2, pb ? pb.y : h, r);
        lava.addColorStop(0, '#ffb347');
        lava.addColorStop(.35, '#ff5a1f');
        lava.addColorStop(1, '#5a0d0a');
        ctx.fillStyle = lava;
        ctx.beginPath(); bot.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.fill();
      }
      // Wanden: de verre wand en de twee zijwanden, van boven donker naar onder gloeiend.
      const wall = (a, b, shadeK) => {
        const sp = polygon([[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], DEEP], [a[0], a[1], DEEP]]);
        if (!sp) return;
        const y0 = Math.min(sp[0][1], sp[1][1]), y1 = Math.max(...sp.map(v => v[1]));
        // Rots bovenaan, onderaan gloeiend van de lava; met een paar lagen in de steen.
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, shade('#5a4038', shadeK));
        g.addColorStop(.08, shade('#24140f', shadeK));
        g.addColorStop(.3, '#5a1a0e');
        g.addColorStop(.6, '#c2441a');
        g.addColorStop(1, '#ffb04a');
        ctx.fillStyle = g;
        ctx.beginPath(); sp.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, .25)';
        ctx.lineWidth = 1.5;
        for (const t of [.2, .38, .6]) {
          ctx.beginPath();
          ctx.moveTo(sp[0][0] + (sp[3][0] - sp[0][0]) * t, sp[0][1] + (sp[3][1] - sp[0][1]) * t);
          ctx.lineTo(sp[1][0] + (sp[2][0] - sp[1][0]) * t, sp[1][1] + (sp[2][1] - sp[1][1]) * t);
          ctx.stroke();
        }
      };
      const fwd = ca * Wd.TX[Wd.GAP.from] + sa * Wd.TY[Wd.GAP.from] >= 0;
      if (fwd) wall(GAP_L[GAP_L.length - 1], GAP_R[GAP_R.length - 1], 1);
      else wall(GAP_R[0], GAP_L[0], 1);
      for (let k = 0; k + 1 < GAP_L.length; k++) {
        wall(GAP_L[k], GAP_L[k + 1], .8);
        wall(GAP_R[k + 1], GAP_R[k], .8);
      }
      ctx.restore();
      // Gloeiende rand
      ctx.strokeStyle = 'rgba(255, 140, 60, .8)';
      ctx.lineWidth = 3;
      ctx.stroke(hole);
    }

    // ---------- Alles op volgorde: van ver naar dichtbij ----------
    const things = [];
    const dist2 = (x, y) => Math.hypot(x - cam.x, y - cam.y);
    const inView = (x, y, r) => {
      const c = toCam(x, y, 0);
      return c[2] > -r && Math.abs(c[0]) < (Math.max(c[2], 0) + r) * half * 1.3 + r;
    };
    const near = (x, y, max) => Math.abs(x - cam.x) < max && Math.abs(y - cam.y) < max;
    const FAR_S = FAR * (q < .8 ? .75 : 1);
    drawRoad();
    for (const o of FENCE) if (near(o.x, o.y, FAR_S * .7) && inView(o.x, o.y, 120)) things.push({ kind: 'fence', o, d: dist2(o.x, o.y) + 20 });
    for (const o of WALLS) { const x = (o.ax + o.bx) / 2, y = (o.ay + o.by) / 2; if (near(x, y, FAR_S) && inView(x, y, 160)) things.push({ kind: 'wall', o, d: dist2(x, y) }); }
    for (const g of GATES) if (near(Wd.X[g.i], Wd.Y[g.i], FAR_S) && inView(Wd.X[g.i], Wd.Y[g.i], g.w)) things.push({ kind: 'gate', o: g, d: dist2(Wd.X[g.i], Wd.Y[g.i]) - 40 });
    for (const c of CYLS) if (inView(c.x, c.y, c.r * 2)) things.push({ kind: 'cyl', o: c, d: dist2(c.x, c.y) });
    for (const r of Wd.RAMPS) { const i = Wd.step(r.i, r.len >> 1); if (near(Wd.X[i], Wd.Y[i], FAR_S) && inView(Wd.X[i], Wd.Y[i], 300)) things.push({ kind: 'ramp', o: r, d: dist2(Wd.X[i], Wd.Y[i]) + 60 }); }
    // Op een trager toestel: ver weg maar de helft van de bomen.
    for (let k = 0; k < PINES.length; k++) {
      const pn = PINES[k];
      if (!near(pn.x, pn.y, FAR_S * .8) || !inView(pn.x, pn.y, 100)) continue;
      if (q < .8 && (k & 1) && !near(pn.x, pn.y, 1400)) continue;
      things.push({ kind: 'pine', o: pn, d: dist2(pn.x, pn.y) });
    }
    for (const l of LAMPS) if (near(l.x, l.y, FAR_S * .6) && inView(l.x, l.y, 60)) things.push({ kind: 'lamp', o: l, d: dist2(l.x, l.y) });
    // Pijlborden alleen voor wie de goede kant op rijdt.
    if (typeof Posters !== 'undefined' && Posters.list.length) {
      for (const b of BOARDS) if (near(b.x, b.y, FAR_S * .6) && ca * Wd.TX[b.i] + sa * Wd.TY[b.i] > .2 && inView(b.x, b.y, 120)) things.push({ kind: 'board', o: b, d: dist2(b.x, b.y) });
    }
    for (const sg of SIGNS) if (near(sg.x, sg.y, FAR_S * .6) && ca * Wd.TX[sg.i] + sa * Wd.TY[sg.i] > .2 && inView(sg.x, sg.y, 80)) things.push({ kind: 'sign', o: sg, d: dist2(sg.x, sg.y) });
    {
      const i = Wd.START;
      if (near(Wd.X[i], Wd.Y[i], FAR_S) && inView(Wd.X[i], Wd.Y[i], 300)) things.push({ kind: 'start', d: dist2(Wd.X[i], Wd.Y[i]) - 30 });
    }
    const hidden = scene.boxes;
    for (const b of Wd.BOXES) if (!(hidden && hidden.has(b.id)) && near(b.x, b.y, FAR_S * .7) && inView(b.x, b.y, 60)) things.push({ kind: 'box', o: b, d: dist2(b.x, b.y) });
    for (const o of scene.others) things.push({ kind: 'horse', o, d: dist2(o.x, o.y) });
    if (scene.self) things.push({ kind: 'horse', self: true, o: { ...scene.self, x: me.x, y: me.y, z: me.z || 0, a }, d: back });
    for (const s of scene.shots || []) things.push({ kind: s.kind, o: s, d: dist2(s.x, s.y) });
    for (const t of scene.traps || []) if (near(t.x, t.y, 2500)) things.push({ kind: 'trap', o: t, d: dist2(t.x, t.y) });
    const clock = performance.now();
    for (let i = fx.length - 1; i >= 0; i--) {
      fx[i].age = (clock - fx[i].at) / 1000;
      if (fx[i].age >= fx[i].life) { fx.splice(i, 1); continue; }
      things.push({ kind: fx[i].kind, o: fx[i], d: dist2(fx[i].x, fx[i].y) - 1 });
    }
    things.sort((p, qq) => qq.d - p.d);

    const tags = [];
    let selfAt = null;
    for (const th of things) {
      const o = th.o;
      const between = scene.self && th.d < back - 40 && th.kind !== 'horse';
      if (scene.self && th.d < back * .9 && (th.kind === 'pine' || th.kind === 'lamp')) continue;
      if (between) ctx.globalAlpha = .35;
      switch (th.kind) {
        case 'fence': drawFence(o, th.d); break;
        case 'wall': drawWall(o, th.d); break;
        case 'gate': drawGate(o, th.d); break;
        case 'cyl': drawCyl(o, th.d); break;
        case 'ramp': drawRamp(o, th.d); break;
        case 'start': drawStart(th.d); break;
        case 'pine': {
          const p = place(o.x, o.y, 0);
          if (!p) break;
          const hgt = o.h * p.k, wdt = hgt * .6;
          if (hgt < 2) break;
          if (o.soft && scene.self && th.d < 700) ctx.globalAlpha = .5;
          const fog = Math.min(.8, th.d / FAR);
          ctx.drawImage(PINE_IMG[fog > .45 ? 2 : o.v], p.x - wdt / 2, p.y - hgt, wdt, hgt);
          break;
        }
        case 'lamp': {
          const p = place(o.x, o.y, 0);
          if (!p || p.k < .01) break;
          ctx.fillStyle = '#2a2f48';
          ctx.fillRect(p.x - 4 * p.k, p.y - 150 * p.k, 8 * p.k, 150 * p.k);
          const s = Math.max(3, 46 * p.k);
          ctx.drawImage(GLOW[o.c], p.x - s, p.y - 150 * p.k - s, s * 2, s * 2);
          break;
        }
        case 'box': {
          // Laden de kisten nog op, dan staan ze doorzichtig en stil.
          const bob = scene.boxRest ? 0 : Math.sin(scene.t * 3 + o.id) * 12;
          const p = place(o.x, o.y, 60 + bob);
          if (!p) break;
          const s = Math.max(4, 120 * p.k);
          if (scene.boxRest) ctx.globalAlpha = .28;
          ctx.drawImage(BOX_IMG, p.x - s / 2, p.y - s / 2, s, s);
          ctx.globalAlpha = 1;
          break;
        }
        case 'board': {
          const p = place(o.x, o.y, 0), top = place(o.x, o.y, 240);
          if (!p || !top || p.k < .01) break;
          const bw = 160 * p.k, bh = 189 * p.k;
          ctx.fillStyle = '#2a2f48';
          ctx.fillRect(p.x - bw * .38, top.y, 7 * p.k, p.y - top.y);
          ctx.fillRect(p.x + bw * .38 - 7 * p.k, top.y, 7 * p.k, p.y - top.y);
          ctx.drawImage(Posters.pick(o.n), p.x - bw / 2, top.y - bh * .55, bw, bh);
          break;
        }
        case 'sign': {
          const p = place(o.x, o.y, 0), top = place(o.x, o.y, 150);
          if (!p || !top || p.k < .01) break;
          ctx.fillStyle = '#2a2f48';
          ctx.fillRect(p.x - 3 * p.k, top.y, 6 * p.k, p.y - top.y);
          const sw = 260 * p.k, sh = 104 * p.k;
          ctx.drawImage(SIGN_IMG[o.turn > 0 ? 1 : 0], p.x - sw / 2, top.y - sh / 2, sw, sh);
          break;
        }
        case 'horse': {
          const z = o.z || 0;
          const p = place(o.x, o.y, z);
          if (!p) break;
          const ground = Math.max(0, Wd.groundAt(o.x, o.y));
          const sh = place(o.x, o.y, ground);
          if (sh && z > ground + 4) {
            const r = HW * .42 * sh.k * Math.max(.4, 1 - (z - ground) / 300);
            ctx.fillStyle = 'rgba(0, 0, 0, .35)';
            ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r, r * .3, 0, 0, Math.PI * 2); ctx.fill();
          }
          let view = 'back', dir = 1;
          let rel = 0;
          if (!th.self) {
            rel = o.a - Math.atan2(o.y - cam.y, o.x - cam.x);
            while (rel > Math.PI) rel -= Math.PI * 2;
            while (rel < -Math.PI) rel += Math.PI * 2;
          }
          // Tollen na een treffer: snel alle kanten.
          if (o.spin) rel += scene.t * 14;
          rel = Math.atan2(Math.sin(rel), Math.cos(rel));
          if (Math.abs(rel) > 2.3) view = 'front';
          else if (Math.abs(rel) > .8) { view = 'side'; dir = rel > 0 ? -1 : 1; }
          const wpx = th.self ? Math.min(HW * p.k, w * .3) : HW * p.k;
          if (wpx < 3) break;
          if (!th.self && scene.self && th.d < back - 40) ctx.globalAlpha = .45;
          if (o.boost) {
            const fl = place(o.x - Math.cos(o.a) * 50, o.y - Math.sin(o.a) * 50, z + 50);
            if (fl) {
              const s = (wpx / HW) * (90 + Math.sin(scene.t * 40) * 14);
              ctx.drawImage(GLOW.fire, fl.x - s, fl.y - s, s * 2, s * 2);
            }
          }
          if (o.zap) ctx.filter = 'hue-rotate(180deg) saturate(.6)';
          RpDraw.horse(ctx, p.x, p.y, wpx, o.look, o.av, view, o.frame || 0, dir, th.self || wpx > 90);
          if (o.zap) ctx.filter = 'none';
          ctx.globalAlpha = 1;
          if (o.shield || o.asking) {
            ctx.strokeStyle = o.asking ? 'rgba(255, 211, 79, .8)' : 'rgba(120, 220, 255, .9)';
            ctx.fillStyle = o.asking ? 'rgba(255, 211, 79, .08)' : 'rgba(120, 220, 255, .12)';
            ctx.lineWidth = Math.max(1.5, wpx * .03);
            ctx.beginPath(); ctx.ellipse(p.x, p.y - wpx * .42, wpx * .55, wpx * .5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
          if (th.self) selfAt = { x: p.x, y: p.y, w: wpx };
          else tags.push({ o, x: p.x, y: p.y - wpx * .95, size: wpx * .5, fog: Math.min(.6, p.perp / FAR) });
          break;
        }
        case 'vuurbal': {
          const p = place(o.x, o.y, 40);
          if (!p) break;
          const s = Math.max(6, 110 * p.k * (1 + Math.sin(scene.t * 30) * .1));
          ctx.drawImage(GLOW.fire, p.x - s, p.y - s, s * 2, s * 2);
          const tail = place(o.x - Math.cos(o.a) * 70, o.y - Math.sin(o.a) * 70, 40);
          if (tail) ctx.drawImage(GLOW.fire, tail.x - s * .6, tail.y - s * .6, s * 1.2, s * 1.2);
          break;
        }
        case 'valk': {
          const p = place(o.x, o.y, 110);
          if (!p) break;
          const s = Math.max(5, 80 * p.k);
          const flap = Math.sin(scene.t * 22) * .6;
          ctx.drawImage(GLOW.blue, p.x - s * 1.2, p.y - s * 1.2, s * 2.4, s * 2.4);
          ctx.fillStyle = '#e8edf5';
          ctx.strokeStyle = '#4cf0ff';
          ctx.lineWidth = Math.max(1, s * .06);
          for (const side of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + side * s, p.y - s * (.25 + flap * .5)); ctx.lineTo(p.x + side * s * .5, p.y + s * .1); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
          ctx.fillStyle = '#ffd34f';
          ctx.beginPath(); ctx.ellipse(p.x, p.y, s * .22, s * .3, 0, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'trap': {
          const p = place(o.x, o.y, 4);
          if (!p) break;
          const r = Math.max(2, 26 * p.k);
          ctx.strokeStyle = '#c9d2e6';
          ctx.lineWidth = Math.max(1, r * .25);
          for (let k = 0; k < 3; k++) {
            const an = k * 1.05 + scene.t;
            ctx.beginPath(); ctx.moveTo(p.x - Math.cos(an) * r, p.y - Math.sin(an) * r * .4); ctx.lineTo(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r * .4); ctx.stroke();
          }
          ctx.fillStyle = Math.sin(scene.t * 8) > 0 ? '#ff4d6d' : '#7a1b2a';
          ctx.beginPath(); ctx.arc(p.x, p.y - r * .3, r * .3, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'boom': {
          const p = place(o.x, o.y, 40);
          if (!p) break;
          const k = o.age / o.life;
          const r = o.r * (.4 + k * .9) * p.k;
          ctx.globalAlpha = 1 - k;
          ctx.drawImage(o.color === 'blue' ? GLOW.blue : GLOW.fire, p.x - r, p.y - r, r * 2, r * 2);
          ctx.globalAlpha = 1;
          break;
        }
        case 'spark': {
          const p = place(o.x, o.y, 50);
          if (!p) break;
          const k = o.age / o.life;
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = o.color;
          ctx.lineWidth = Math.max(1.5, 6 * p.k);
          ctx.beginPath(); ctx.arc(p.x, p.y, (10 + k * o.r) * p.k, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
      }
      ctx.globalAlpha = 1;
    }

    // Naamkaartjes boven de andere paarden, met hun plaats.
    for (const tg of tags) {
      if (tg.size < 9) continue;
      const size = Math.max(11, Math.min(17, tg.size * .3)) * (w > 1400 ? 1.4 : 1);
      ctx.font = `700 ${size}px 'Exo 2', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      const label = `${tg.o.rank ? tg.o.rank + '. ' : ''}${tg.o.name || ''}`;
      const tw = ctx.measureText(label).width + size;
      ctx.globalAlpha = 1 - tg.fog * .6;
      ctx.fillStyle = 'rgba(5, 8, 20, .7)';
      ctx.fillRect(tg.x - tw / 2, tg.y - size * 1.1, tw, size * 1.45);
      ctx.fillStyle = tg.o.neon || '#fff';
      ctx.fillText(label, tg.x, tg.y);
      ctx.globalAlpha = 1;
    }
    return { cam, place, selfAt };
  }

  return { render, boom, spark };
})();
