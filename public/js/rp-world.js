// Robopaarden: de racebaan en hoe een robotpaard galoppeert en springt. Gedeeld door de server, de leerlingen en het bord.
// Eén grote ronde rond het burchtmeer, met een kasteelroute (smal, vol runenkisten), een geheim bospad,
// een sprong over de Drakenkloof, schansen en nitrostroken. Alles in baaneenheden; hoek 0 is naar rechts, z is de hoogte.
// De baan bestaat uit punten om de 30 eenheden. Elk punt kent zijn plek in de ronde (s), zodat we altijd weten
// hoe ver iemand staat, ook op een zijweg.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RpWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const W = 9000;
  const H = 6000;
  const STEP = 30;          // afstand tussen twee baanpunten
  const OFF = 220;          // zo ver naast de weg kan je nog (traag) door het gras
  const R = 34;             // straal van een paard
  const G = 1150;           // zwaartekracht bij een sprong

  // Galopperen: optrekken, remmen, uitbollen en sturen.
  const HORSE = { accel: 640, brake: 1300, coast: 260, max: 650, offMax: 330, nitro: 980, reverse: 200, turn: 2.5, nitroTime: 1.7, padTime: 1.1 };

  // Wapens (de server beslist over elke treffer).
  const ITEMS = {
    vuurbal: { icon: '🔥', name: 'Vuurbal', speed: 1500, life: 2.2, r: 26 },
    valk: { icon: '🦅', name: 'Robovalk', speed: 1250, life: 7, r: 30, turn: 4.2 },
    spijkers: { icon: '⚙️', name: 'Spijkers', r: 44, life: 40, max: 3 },
    schild: { icon: '🛡️', name: 'Schild', ms: 8000 },
    turbo: { icon: '⚡', name: 'Driedubbele nitro', charges: 3 },
    donder: { icon: '🌩️', name: 'Donderslag', ms: 2600 },
  };
  const SPIN_MS = 1400;     // zo lang tolt een geraakt paard
  const SAFE_MS = 1600;     // daarna even onkwetsbaar

  // ---------- De baan ----------

  // De hoofdronde, met de klok mee. De start staat onderaan, op het lange rechte stuk.
  const MAIN = [
    [2000, 5300], [3200, 5370], [4500, 5350], [5600, 5300], [6500, 5180], [7400, 4800], [7950, 4150], [8250, 3350],
    [8150, 2450], [7750, 1650], [7200, 1150], [6400, 760], [5400, 560], [4400, 560], [3400, 760], [2500, 1130],
    [1700, 1550], [1150, 2150], [1150, 2850], [1650, 3300], [2400, 3450], [2850, 3900], [2600, 4400], [1800, 4560],
    [1100, 4800], [950, 5150], [1250, 5330],
  ];
  // Zijwegen: ze vertrekken uit de hoofdronde (from) en komen er weer op uit (to). half = halve breedte van de weg.
  const BRANCHES = [
    // Door de burcht: smaller, met poorten en extra runenkisten.
    { key: 'burcht', name: 'Burchtroute', half: 150, from: [7650, 1520], to: [3300, 800], pts: [[6900, 1650], [6000, 1820], [5000, 1830], [4100, 1500]] },
    // Over de Drakenkloof: een schans, een diepe kloof en dan landen. Te traag? Dan val je erin.
    { key: 'kloof', name: 'Drakenkloof', half: 160, from: [5900, 5290], to: [8150, 2250], pts: [[6600, 4750], [7050, 3950], [7500, 3150]] },
    // Het geheime bospad: smal en donker, je vindt de ingang tussen de bomen.
    { key: 'bos', name: 'Geheim bospad', half: 105, from: [1180, 2900], to: [1000, 4900], pts: [[900, 3500], [700, 4150]], secret: true },
  ];
  const MAIN_HALF = 195;

  // Catmull-Rom door de punten, daarna om de STEP eenheden opnieuw verdeeld.
  function spline(pts, closed, per = 24) {
    const out = [];
    const n = pts.length;
    const get = i => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([
          .5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }
  function resample(line, closed) {
    const out = [line[0].slice()];
    let carry = 0;
    const total = closed ? line.length : line.length - 1;
    for (let i = 0; i < total; i++) {
      const a = line[i], b = line[(i + 1) % line.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let d = STEP - carry;
      while (d <= len) {
        const k = d / len;
        out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
        d += STEP;
      }
      carry = len - (d - STEP);
    }
    if (closed && Math.hypot(out[out.length - 1][0] - out[0][0], out[out.length - 1][1] - out[0][1]) < STEP * .5) out.pop();
    return out;
  }

  // Alle baanpunten in platte lijsten (snel, ook op een Chromebook).
  const X = [], Y = [], TX = [], TY = [], S = [], HALF = [], PATH = [], NEXT = [], PREV = [], GROUND = [], FLAG = [];
  const PATHS = [];
  const F_PAD = 1, F_GAP = 2, F_BOX = 4, F_START = 8;

  function addPath(points, closed, half, info) {
    const first = X.length;
    for (const [x, y] of points) {
      X.push(x); Y.push(y); TX.push(0); TY.push(0); S.push(0); HALF.push(half); PATH.push(PATHS.length); NEXT.push(-1); PREV.push(-1); GROUND.push(0); FLAG.push(0);
    }
    const last = X.length - 1;
    for (let i = first; i <= last; i++) {
      NEXT[i] = i < last ? i + 1 : closed ? first : -1;
      PREV[i] = i > first ? i - 1 : closed ? last : -1;
    }
    for (let i = first; i <= last; i++) {
      const a = PREV[i] >= 0 ? PREV[i] : i, b = NEXT[i] >= 0 ? NEXT[i] : i;
      const dx = X[b] - X[a], dy = Y[b] - Y[a], l = Math.hypot(dx, dy) || 1;
      TX[i] = dx / l; TY[i] = dy / l;
    }
    const path = { first, last, closed, half, ...info };
    PATHS.push(path);
    return path;
  }

  const main = addPath(resample(spline(MAIN, true), true), true, MAIN_HALF, { key: 'hoofd', name: 'Hoofdbaan' });
  const L = (main.last - main.first + 1) * STEP;
  for (let i = main.first; i <= main.last; i++) S[i] = (i - main.first) * STEP;

  function nearestMain(x, y) {
    let best = main.first, bd = Infinity;
    for (let i = main.first; i <= main.last; i++) {
      const d = (X[i] - x) ** 2 + (Y[i] - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  const mainAt = k => main.first + ((((k - main.first) % (main.last - main.first + 1)) + (main.last - main.first + 1)) % (main.last - main.first + 1));

  for (const b of BRANCHES) {
    const from = nearestMain(...b.from), to = nearestMain(...b.to);
    const ctrl = [[X[mainAt(from - 6)], Y[mainAt(from - 6)]], [X[from], Y[from]], ...b.pts, [X[to], Y[to]], [X[mainAt(to + 6)], Y[mainAt(to + 6)]]];
    const line = spline(ctrl, false).filter((_, i, arr) => i >= 24 && i <= arr.length - 25);
    const pts = resample(line, false).slice(1, -1);
    const path = addPath(pts, false, b.half, { key: b.key, name: b.name, secret: !!b.secret, from, to });
    PREV[path.first] = from;
    NEXT[path.last] = to;
    // De plek in de ronde loopt gelijkmatig van het vertrekpunt naar het eindpunt.
    let span = S[to] - S[from];
    if (span < 0) span += L;
    const n = path.last - path.first + 1;
    for (let i = path.first; i <= path.last; i++) S[i] = (S[from] + span * ((i - path.first + 1) / (n + 1))) % L;
    b.path = path;
  }
  // Zijweg i: de baanpunten van een zijweg met die sleutel.
  const pathOf = key => PATHS.find(p => p.key === key);
  const at = (path, k) => Math.max(path.first, Math.min(path.last, path.first + Math.round(k * (path.last - path.first))));

  // ---------- Schansen, de kloof, nitrostroken en runenkisten ----------

  const RAMPS = [];
  function ramp(i, len, h) {
    // De helling loopt op over len punten, het hoogste punt is de schansrand.
    for (let k = 0; k < len; k++) {
      let j = i;
      for (let m = 0; m < k; m++) j = NEXT[j] >= 0 ? NEXT[j] : j;
      GROUND[j] = Math.max(GROUND[j], (h * (k + 1)) / len);
    }
    RAMPS.push({ i, len, h });
  }
  const step = (i, n) => { for (let k = 0; k < Math.abs(n); k++) { const j = n > 0 ? NEXT[i] : PREV[i]; if (j < 0) break; i = j; } return i; };

  const kloof = pathOf('kloof');
  const GAP = { from: at(kloof, .43), to: at(kloof, .55) };
  for (let i = GAP.from; i <= GAP.to; i++) FLAG[i] |= F_GAP;
  ramp(step(GAP.from, -6), 6, 70);
  // Schansen op de hoofdbaan en een grote in de burcht.
  const RAMP_AT = [at(main, .14), at(main, .47), at(main, .7)];
  for (const i of RAMP_AT) ramp(i, 5, 55);
  ramp(at(pathOf('burcht'), .7), 5, 50);

  const PADS = [];
  function pad(i, n = 4) { for (let k = 0; k < n; k++) FLAG[step(i, k)] |= F_PAD; PADS.push({ i, n }); }
  pad(step(GAP.from, -16), 5);
  pad(at(main, .045));
  pad(at(main, .27));
  pad(at(main, .4));
  pad(at(main, .56));
  pad(at(main, .82));
  pad(at(pathOf('bos'), .3), 3);
  pad(at(pathOf('bos'), .75), 3);

  // Rijen runenkisten dwars over de weg. Rijd erdoor: een vraag. Juist = een wapen.
  const BOXES = [];
  function boxRow(i, n) {
    FLAG[i] |= F_BOX;
    const half = HALF[i] * .72;
    for (let k = 0; k < n; k++) {
      const off = n === 1 ? 0 : -half + (2 * half * k) / (n - 1);
      BOXES.push({ id: BOXES.length, i, x: X[i] - TY[i] * off, y: Y[i] + TX[i] * off });
    }
  }
  for (const k of [.08, .21, .34, .52, .64, .77, .9]) boxRow(at(main, k), 4);
  for (const k of [.25, .55, .85]) boxRow(at(pathOf('burcht'), k), 3);
  boxRow(at(pathOf('bos'), .5), 2);
  boxRow(at(kloof, .8), 3);
  const BOX_R = 52;
  const BOX_BACK_MS = 3500; // zo lang is een kist weg nadat jij hem nam

  // Startlijn en startopstelling (rijen van vier achter de lijn).
  const START = main.first;
  FLAG[START] |= F_START;
  function grid(n) {
    const row = Math.floor(n / 4), col = n % 4;
    const i = step(START, -(3 + row * 3));
    const off = (col - 1.5) * 80;
    return { x: X[i] - TY[i] * off, y: Y[i] + TX[i] * off, a: Math.atan2(TY[i], TX[i]), i };
  }

  // ---------- Snel opzoeken: welk baanpunt ligt het dichtst bij? ----------

  const CELL = 40;
  const GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
  const near = new Int32Array(GW * GH).fill(-1);
  (() => {
    const best = new Float32Array(GW * GH).fill(Infinity);
    for (let i = 0; i < X.length; i++) {
      const reach = HALF[i] + OFF + 140;
      const c0 = Math.max(0, Math.floor((X[i] - reach) / CELL)), c1 = Math.min(GW - 1, Math.floor((X[i] + reach) / CELL));
      const r0 = Math.max(0, Math.floor((Y[i] - reach) / CELL)), r1 = Math.min(GH - 1, Math.floor((Y[i] + reach) / CELL));
      for (let r = r0; r <= r1; r++) {
        const cy = (r + .5) * CELL;
        for (let c = c0; c <= c1; c++) {
          const cx = (c + .5) * CELL;
          // Afstand tot de rand van de weg: zo wint de weg waar je echt op staat, ook bij een splitsing.
          const d = Math.hypot(cx - X[i], cy - Y[i]) - HALF[i];
          const k = r * GW + c;
          if (d < best[k]) { best[k] = d; near[k] = i; }
        }
      }
    }
  })();

  // Waar sta je? i = baanpunt, d = afstand tot de middenlijn, lat = links (-) of rechts (+), k = tussen i en het volgende punt.
  const LOC = { i: -1, d: 0, lat: 0, k: 0, edge: 0 };
  function locate(x, y, out = LOC) {
    const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
    out.i = -1;
    if (c < 0 || r < 0 || c >= GW || r >= GH) return out;
    let i = near[r * GW + c];
    if (i < 0) return out;
    // Fijn afstellen met de buren op dezelfde weg.
    let best = Infinity, bi = i;
    for (let m = 0, j = i; m < 4 && j >= 0; m++, j = PREV[j]) { const d = (X[j] - x) ** 2 + (Y[j] - y) ** 2 - 0; if (d < best) { best = d; bi = j; } }
    for (let m = 0, j = i; m < 4 && j >= 0; m++, j = NEXT[j]) { const d = (X[j] - x) ** 2 + (Y[j] - y) ** 2; if (d < best) { best = d; bi = j; } }
    i = bi;
    const dx = x - X[i], dy = y - Y[i];
    const along = dx * TX[i] + dy * TY[i];
    out.i = i;
    out.lat = -dx * TY[i] + dy * TX[i];
    out.d = Math.abs(out.lat);
    out.k = Math.max(-.5, Math.min(.5, along / STEP));
    out.edge = out.d - HALF[i];
    return out;
  }

  // Hoogte van de grond op een plek (een schans), en of je boven de kloof hangt.
  function groundAt(x, y, l = locate(x, y, {})) {
    if (l.i < 0 || l.edge > 0) return 0;
    const g0 = GROUND[l.i];
    const j = l.k >= 0 ? NEXT[l.i] : PREV[l.i];
    const g1 = j >= 0 ? GROUND[j] : g0;
    // Omhoog loopt de helling geleidelijk; aan de rand van een schans valt de grond meteen weg.
    return g1 > g0 ? g0 + (g1 - g0) * Math.abs(l.k) : g0;
  }
  const overGap = l => l.i >= 0 && (FLAG[l.i] & F_GAP) && l.edge < OFF;
  const onPad = l => l.i >= 0 && (FLAG[l.i] & F_PAD) && l.d < HALF[l.i] * .62;
  const offRoad = l => l.i < 0 || l.edge > 0;
  // Buiten de omheining: een schot of paard botst hier.
  const wallAt = (x, y) => { const l = locate(x, y, {}); return l.i < 0 || l.edge > OFF; };

  // De plek in de ronde (0..L) van een punt op de baan.
  const sAt = l => (l.i < 0 ? -1 : (S[l.i] + l.k * STEP + L) % L);

  // Na een val in de kloof: terug op de weg, een eind vóór de schans, met de neus vooruit.
  function respawnFrom(x, y) {
    const l = locate(x, y, {});
    let i = l.i >= 0 ? l.i : START;
    let guard = 0;
    while ((FLAG[i] & F_GAP) && PREV[i] >= 0 && guard++ < 200) i = PREV[i];
    if (FLAG[step(i, 1)] & F_GAP || GROUND[i] > 0) i = step(i, -14);
    return { x: X[i], y: Y[i], a: Math.atan2(TY[i], TX[i]), i };
  }

  const wrap = a => (a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a);

  // Eén stap galopperen. s = { x, y, z, vz, a, v, boost, spin }, input = { gas: -1..1, turn: -1..1, auto }.
  // auto: het paard volgt zelf de weg (terwijl je een vraag beantwoordt).
  // Geeft terug wat er gebeurde: bump (tegen de omheining), jump (van een schans), land, fall (in de kloof), pad (nitrostrook).
  const DRIVE = { bump: false, jump: false, land: false, fall: false, pad: false, off: false };
  function drive(s, input, dt) {
    const out = DRIVE;
    out.bump = out.jump = out.land = out.fall = out.pad = out.off = false;
    s.z = s.z || 0;
    s.vz = s.vz || 0;
    const l = locate(s.x, s.y, s.loc || (s.loc = { i: -1 }));
    let gas = Math.max(-1, Math.min(1, input.gas || 0));
    let turn = Math.max(-1, Math.min(1, input.turn || 0));
    if (input.auto && l.i >= 0) {
      // Kijk een stuk vooruit op de weg en stuur daarheen, iets naar het midden.
      const j = step(l.i, 7);
      const want = Math.atan2(Y[j] - s.y, X[j] - s.x);
      turn = Math.max(-1, Math.min(1, wrap(want - s.a) * 2.2));
      // Op weg naar de kloof geeft de automatische piloot vol gas, anders haalt hij de sprong niet.
      gas = PATHS[PATH[l.i]].key === 'kloof' ? 1 : .72;
    }
    const ground = groundAt(s.x, s.y, l);
    const air = s.z > ground + 1;
    out.off = offRoad(l);
    const spin = s.spin > 0;
    if (spin) { s.spin -= dt; gas = 0; turn = 0; s.v *= Math.max(0, 1 - dt * 3.2); }
    let max = out.off && !air ? HORSE.offMax : HORSE.max;
    if (s.zap > 0) { s.zap -= dt; max *= .55; }
    if (s.boost > 0) {
      s.boost -= dt;
      max = HORSE.nitro;
      if (!spin) s.v = Math.max(s.v, HORSE.nitro * .92);
    }
    if (!air && !spin) {
      if (gas > 0) {
        if (s.v < 0) s.v = Math.min(0, s.v + HORSE.brake * dt);
        else if (s.v < max * gas) s.v = Math.min(max * gas, s.v + HORSE.accel * dt * (s.v < 200 ? 1.3 : 1));
        else s.v = Math.max(max * gas, s.v - HORSE.coast * dt);
      } else if (gas < 0) {
        s.v = s.v > 0 ? Math.max(0, s.v - HORSE.brake * dt) : Math.max(-HORSE.reverse, s.v - HORSE.accel * .6 * dt);
      } else {
        s.v -= Math.sign(s.v) * Math.min(Math.abs(s.v), HORSE.coast * dt);
      }
      // In het gras verlies je snel snelheid.
      if (s.v > max) s.v = Math.max(max, s.v - (out.off ? 1400 : 500) * dt);
    }
    // Sturen: trager bij volle snelheid, zodat je bochten moet nemen; ook stilstaand kan je draaien.
    const grip = Math.abs(s.v) < 60 ? .8 : Math.max(.62, Math.min(1, 1.15 - Math.abs(s.v) / 1700));
    s.a = wrap(s.a + turn * HORSE.turn * dt * (air ? .45 : 1) * (s.v < -20 ? -grip : grip) + (spin ? dt * 11 : 0));
    const nx = s.x + Math.cos(s.a) * s.v * dt, ny = s.y + Math.sin(s.a) * s.v * dt;
    const before = ground;
    const ln = locate(nx, ny, s.loc);
    if (ln.i < 0) {
      s.v *= .3;
      out.bump = true;
    } else if (ln.edge > OFF && !(overGap(ln) && air)) {
      // De omheining: je schuift erlangs en draait mee met de weg.
      const i = ln.i, side = ln.lat > 0 ? 1 : -1, lim = HALF[i] + OFF;
      const px = -TY[i] * side, py = TX[i] * side;
      const along = (nx - X[i]) * TX[i] + (ny - Y[i]) * TY[i];
      s.x = X[i] + TX[i] * along + px * lim;
      s.y = Y[i] + TY[i] * along + py * lim;
      const into = Math.cos(s.a) * px + Math.sin(s.a) * py;
      if (into > 0) {
        out.bump = s.v > 260 && into > .55;
        s.v *= 1 - .55 * into;
        const forward = Math.cos(s.a) * TX[i] + Math.sin(s.a) * TY[i] >= 0 ? 1 : -1;
        s.a = wrap(s.a + wrap(Math.atan2(TY[i] * forward, TX[i] * forward) - s.a) * Math.min(1, dt * 8));
      }
    } else {
      s.x = nx;
      s.y = ny;
    }
    const l2 = locate(s.x, s.y, s.loc);
    const g = groundAt(s.x, s.y, l2);
    const gap = overGap(l2);
    // Boven de kloof is er geen grond: wie daar niet vliegt, valt erin.
    const floor = gap ? -400 : g;
    if (!air && before > 8 && (g < 1 || gap) && s.v > 120) {
      // Van een schans af: de lucht in.
      s.vz = Math.min(650, s.v * .85) * Math.min(1, before / 45);
      s.z = before;
      out.jump = true;
    } else if (s.z > floor + 1 || s.vz > 0) {
      s.vz -= G * dt;
      s.z += s.vz * dt;
      if (s.z <= floor) {
        out.land = s.vz < -260;
        s.z = floor;
        s.vz = 0;
      }
      if (gap && s.z < -20) out.fall = true;
    } else {
      s.z = g;
      s.vz = 0;
    }
    if (onPad(l2) && s.v > 0 && s.z < 6) { s.boost = Math.max(s.boost || 0, HORSE.padTime); out.pad = true; }
    return out;
  }

  // Rijd je de verkeerde kant op?
  function wrongWay(s) {
    const l = s.loc && s.loc.i >= 0 ? s.loc : locate(s.x, s.y, {});
    if (l.i < 0 || Math.abs(s.v) < 80) return false;
    const dir = Math.cos(s.a) * TX[l.i] + Math.sin(s.a) * TY[l.i];
    return (s.v > 0 ? dir : -dir) < -.5;
  }

  // ---------- Robotpaarden aanpassen ----------
  // Elke leerling kiest in de wachtzaal een romp, neonkleur, manen, ogen, een extraatje en een patroon.
  const LOOK = {
    romp: [
      { name: 'Zilver', c: '#c3cbe0' }, { name: 'Goud', c: '#e3b23c' }, { name: 'Obsidiaan', c: '#3a3f5c' }, { name: 'Koper', c: '#c8743f' },
      { name: 'IJsblauw', c: '#8fd3ff' }, { name: 'Robijn', c: '#d6334f' }, { name: 'Smaragd', c: '#2fbf7f' }, { name: 'Paars', c: '#8a5cf0' },
    ],
    neon: [
      { name: 'Cyaan', c: '#4cf0ff' }, { name: 'Roze', c: '#ff4fd8' }, { name: 'Gifgroen', c: '#8dff4f' }, { name: 'Oranje', c: '#ff9b2f' },
      { name: 'Paars', c: '#b66bff' }, { name: 'Rood', c: '#ff3b5c' }, { name: 'Goud', c: '#ffd34f' }, { name: 'Wit', c: '#f2f6ff' },
    ],
    manen: [{ name: 'Vlammen' }, { name: 'Kabels' }, { name: 'Kristal' }, { name: 'Hanenkam' }, { name: 'Geen' }],
    ogen: [{ name: 'Vizier' }, { name: 'Twee ogen' }, { name: 'Cycloop' }, { name: 'Boos' }],
    extra: [{ name: 'Niets' }, { name: 'Hoorn' }, { name: 'Vleugels' }, { name: 'Antennes' }, { name: 'Raketten' }],
    patroon: [{ name: 'Glad' }, { name: 'Strepen' }, { name: 'Ruiten' }, { name: 'Runen' }, { name: 'Bliksem' }],
  };
  const LOOK_KEYS = Object.keys(LOOK);
  // Een willekeurig (maar per naam vast) paard, voor wie niets kiest.
  function lookFor(name, n = 0) {
    let h = 2166136261 ^ n;
    for (const ch of String(name || '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const out = {};
    for (const k of LOOK_KEYS) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h ^= h >>> 13; out[k] = (h >>> 0) % LOOK[k].length; }
    return out;
  }
  function cleanLook(look, name, n) {
    const base = lookFor(name, n);
    if (!look || typeof look !== 'object') return base;
    const out = {};
    for (const k of LOOK_KEYS) out[k] = Number.isInteger(look[k]) && look[k] >= 0 && look[k] < LOOK[k].length ? look[k] : base[k];
    return out;
  }

  return {
    W, H, STEP, OFF, R, G, L, HORSE, ITEMS, SPIN_MS, SAFE_MS, LOOK, LOOK_KEYS,
    X, Y, TX, TY, S, HALF, PATH, NEXT, PREV, GROUND, FLAG, PATHS, F_PAD, F_GAP, F_BOX, F_START,
    RAMPS, PADS, BOXES, BOX_R, BOX_BACK_MS, GAP, START, BRANCHES, MAIN_HALF,
    locate, groundAt, overGap, onPad, offRoad, wallAt, sAt, step, grid, respawnFrom, drive, wrongWay, wrap, lookFor, cleanLook,
  };
});
