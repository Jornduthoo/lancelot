// De kaart van Het Rijk tekenen: een oude zeekaart met een sci-fi rand. Zeshoeken met echt landschap (bos, heuvels,
// bergen, akkers), kliffen aan de kust, burchten met wapperende vlaggen en gloeiende grenzen per team.
// Het landschap wordt één keer per schikking gebakken; teamkleuren, grenzen en flitsen komen er elke keer bovenop.
// draw(canvas, map, opts) geeft de schikking terug; hit(layout, x, y) zegt welk gebied er onder een klik ligt.
// room(w, h) bakt de kaartenkamer achter het bord en de gsm. Gebruikt Glow uit fx.js.
// map: { cols, rows, cells, teams, maxPower, neutralCost }
// opts: { targets: {index: soort}, focus: [index] (inzoomen op die gebieden), team, recent: [{i, kind, at}], now, lessonOf: {quizId: nummer}, names: true }
const RijkMap = (() => {
  const SQ3 = Math.sqrt(3);
  const DIRS = [0, 1, 2, 3, 4, 5].map(k => [Math.cos(k * Math.PI / 3), Math.sin(k * Math.PI / 3)]);

  function rng(seed) {
    let s = seed % 2147483647 || 1;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  function layout(canvas, map, focusList) {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    // clientWidth in plaats van getBoundingClientRect: een inzoom-animatie mag de maat niet verkleinen.
    const w = Math.max(10, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(10, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const pad = 10 * dpr;
    // Middelpunten met zijde 1; daarna schalen zodat alles (of enkel de focus) past.
    const unit = map.cells.map((_, i) => {
      const c = i % map.cols;
      const row = Math.floor(i / map.cols);
      return { x: SQ3 * (c + (row % 2) * .5), y: 1.5 * row };
    });
    const focus = focusList && focusList.length ? focusList : null;
    const pts = focus ? focus.map(i => unit[i]) : unit;
    const minX = Math.min(...pts.map(p => p.x)) - SQ3 * (focus ? 1 : .5);
    const maxX = Math.max(...pts.map(p => p.x)) + SQ3 * (focus ? 1 : .5);
    const minY = Math.min(...pts.map(p => p.y)) - (focus ? 1.8 : 1.15);
    const maxY = Math.max(...pts.map(p => p.y)) + (focus ? 1.8 : 1.15);
    let size = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY));
    if (focus) size = Math.min(size, w / 4.5, h / 4.5);
    const ox = w / 2 - size * (minX + maxX) / 2;
    const oy = h / 2 - size * (minY + maxY) / 2;
    const centers = unit.map(p => ({ x: ox + p.x * size, y: oy + p.y * size }));
    // Buren per richting (zijde k van de zeshoek kijkt in richting k).
    const at = new Map(unit.map((p, i) => [`${Math.round(p.x * 10)},${Math.round(p.y * 10)}`, i]));
    const near = unit.map(p => DIRS.map(([dx, dy]) => {
      const j = at.get(`${Math.round((p.x + dx * SQ3) * 10)},${Math.round((p.y + dy * SQ3) * 10)}`);
      return j === undefined ? -1 : j;
    }));
    return { w, h, dpr, size, centers, near, key: `${w}x${h}:${Math.round(size * 10)}:${Math.round(ox)}:${Math.round(oy)}` };
  }

  function corner(x, y, s, k) {
    const a = Math.PI / 180 * (60 * k - 30);
    return [x + s * Math.cos(a), y + s * Math.sin(a)];
  }

  function hexPath(g, x, y, s) {
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const [px, py] = corner(x, y, s, k);
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  }

  // ---------- Landschap (gebakken) ----------

  // Soort landschap per gebied, vast per kaart: zo blijft een berg een berg, les na les.
  function terrain(cell, i) {
    if (cell.castle !== null) return 'gras';
    let n = 0;
    for (const ch of cell.name || String(i)) n = (n * 31 + ch.charCodeAt(0)) % 9973;
    const r = (n * 7 + i * 13) % 100;
    return r < 34 ? 'gras' : r < 62 ? 'bos' : r < 77 ? 'heuvel' : r < 88 ? 'berg' : 'akker';
  }

  const TOP = {
    gras: ['#5f9a4a', '#3c6e35'],
    bos: ['#3f7a3e', '#24502a'],
    heuvel: ['#7f9a4c', '#55703a'],
    berg: ['#8a8173', '#5a5248'],
    akker: ['#b89a4a', '#7f6a30'],
  };

  function tree(g, x, y, r, pine) {
    g.fillStyle = 'rgba(0, 0, 0, .3)';
    g.beginPath(); g.ellipse(x + r * .25, y + r * .9, r * .8, r * .3, 0, 0, Math.PI * 2); g.fill();
    if (pine) {
      g.fillStyle = '#1d4426';
      g.beginPath(); g.moveTo(x, y - r * 1.5); g.lineTo(x + r * .8, y + r * .7); g.lineTo(x - r * .8, y + r * .7); g.closePath(); g.fill();
      g.fillStyle = '#2f6a37';
      g.beginPath(); g.moveTo(x, y - r * 1.5); g.lineTo(x - r * .1, y + r * .7); g.lineTo(x - r * .8, y + r * .7); g.closePath(); g.fill();
    } else {
      g.fillStyle = '#4a2f1a';
      g.fillRect(x - r * .12, y + r * .2, r * .24, r * .6);
      const c = g.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r);
      c.addColorStop(0, '#6fb55a');
      c.addColorStop(1, '#25552b');
      g.fillStyle = c;
      g.beginPath(); g.arc(x, y - r * .1, r * .75, 0, Math.PI * 2); g.fill();
    }
  }

  function decorate(g, kind, x, y, s, rnd) {
    g.save();
    hexPath(g, x, y, s * .92);
    g.clip();
    if (kind === 'gras') {
      for (let k = 0; k < 14; k++) {
        const px = x + (rnd() - .5) * s * 1.5, py = y + (rnd() - .5) * s * 1.4;
        g.strokeStyle = rnd() < .5 ? 'rgba(160, 220, 120, .35)' : 'rgba(20, 50, 20, .3)';
        g.lineWidth = Math.max(1, s * .025);
        g.beginPath(); g.moveTo(px, py); g.lineTo(px - s * .03, py - s * .08); g.moveTo(px, py); g.lineTo(px + s * .03, py - s * .08); g.stroke();
      }
      if (rnd() < .5) tree(g, x + (rnd() - .5) * s * .9, y + (rnd() - .5) * s * .6, s * .13, false);
    } else if (kind === 'bos') {
      const spots = [];
      for (let k = 0; k < 9; k++) spots.push([x + (rnd() - .5) * s * 1.35, y + (rnd() - .5) * s * 1.15]);
      spots.sort((a, b) => a[1] - b[1]);
      const pine = rnd() < .5;
      for (const [px, py] of spots) tree(g, px, py, s * (.13 + rnd() * .06), pine ? rnd() < .8 : rnd() < .2);
    } else if (kind === 'heuvel') {
      for (let k = 0; k < 3; k++) {
        const px = x + (k - 1) * s * .42 + (rnd() - .5) * s * .1, py = y + (k % 2 ? -.15 : .2) * s, r = s * (.3 + rnd() * .1);
        const hg = g.createLinearGradient(px - r, py - r, px + r, py);
        hg.addColorStop(0, '#a8c46a');
        hg.addColorStop(1, '#4a6430');
        g.fillStyle = hg;
        g.beginPath(); g.ellipse(px, py, r, r * .6, 0, Math.PI, 0); g.fill();
      }
    } else if (kind === 'berg') {
      const peaks = [[-.35, .25, .55], [.1, .3, .75], [.45, .3, .45]];
      for (const [dx, dy, hh] of peaks) {
        const bx = x + dx * s, by = y + dy * s, top = by - hh * s, half = hh * s * .75;
        g.fillStyle = '#b5ab9c';
        g.beginPath(); g.moveTo(bx - half, by); g.lineTo(bx, top); g.lineTo(bx, by); g.closePath(); g.fill();
        g.fillStyle = '#5e564c';
        g.beginPath(); g.moveTo(bx, top); g.lineTo(bx + half, by); g.lineTo(bx, by); g.closePath(); g.fill();
        g.fillStyle = '#f4f7ff';
        g.beginPath(); g.moveTo(bx, top); g.lineTo(bx - half * .32, top + hh * s * .32); g.lineTo(bx, top + hh * s * .24); g.lineTo(bx + half * .3, top + hh * s * .3); g.closePath(); g.fill();
      }
    } else if (kind === 'akker') {
      g.translate(x, y);
      g.rotate(rnd() * .6 - .3);
      for (let k = -6; k <= 6; k++) {
        g.fillStyle = k % 2 ? 'rgba(255, 230, 140, .28)' : 'rgba(90, 120, 40, .3)';
        g.fillRect(-s, k * s * .14, s * 2, s * .07);
      }
    }
    g.restore();
  }

  function base(L, map) {
    const { w, h, size, dpr, centers } = L;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    // Zee: diep blauw, met lichtere ondieptes rond het land.
    const sea = g.createRadialGradient(w / 2, h * .45, 0, w / 2, h / 2, Math.max(w, h) * .75);
    sea.addColorStop(0, '#0f3a5c');
    sea.addColorStop(1, '#04111f');
    g.fillStyle = sea;
    g.fillRect(0, 0, w, h);
    const rnd = rng(1234);
    g.strokeStyle = 'rgba(140, 210, 255, .12)';
    g.lineWidth = Math.max(1, dpr);
    for (let k = 0; k < Math.round(w * h / (size * size * 1.2)); k++) {
      const x = rnd() * w, y = rnd() * h, r = size * (.12 + rnd() * .12);
      g.beginPath(); g.arc(x, y, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
    // Hologramraster van de sterrenkaart (de sci-fi rand).
    g.strokeStyle = 'rgba(76, 201, 255, .07)';
    map.cells.forEach((_, i) => { hexPath(g, centers[i].x, centers[i].y, size); g.stroke(); });
    g.strokeStyle = 'rgba(76, 201, 255, .1)';
    for (let x = 0; x < w; x += size * 2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += size * 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const land = map.cells.map((cell, i) => cell.land ? i : -1).filter(i => i >= 0);
    for (const [grow, a] of [[1.32, .07], [1.14, .14]]) {
      g.fillStyle = `rgba(120, 220, 230, ${a})`;
      for (const i of land) { hexPath(g, centers[i].x, centers[i].y, size * grow); g.fill(); }
    }
    // Kliffen: eerst alle zijkanten, dan alle bovenkanten.
    const s = size * .985;
    const depth = size * .17;
    for (const i of land) {
      const { x, y } = centers[i];
      hexPath(g, x, y + depth, s);
      g.fillStyle = '#2a1d14';
      g.fill();
      hexPath(g, x, y + depth * .45, s);
      g.fillStyle = '#4a3424';
      g.fill();
    }
    for (const i of land) {
      const { x, y } = centers[i];
      const kind = terrain(map.cells[i], i);
      const [c0, c1] = TOP[kind];
      const top = g.createLinearGradient(x - s * .6, y - s, x + s * .4, y + s);
      top.addColorStop(0, c0);
      top.addColorStop(1, c1);
      hexPath(g, x, y, s);
      g.fillStyle = top;
      g.fill();
      decorate(g, kind, x, y, s, rng(i * 977 + 31));
      // Licht van linksboven, schaduw rechtsonder.
      g.lineWidth = Math.max(1, size * .04);
      g.strokeStyle = 'rgba(255, 255, 230, .28)';
      g.beginPath();
      g.moveTo(...corner(x, y, s * .96, 2)); g.lineTo(...corner(x, y, s * .96, 3)); g.lineTo(...corner(x, y, s * .96, 4)); g.lineTo(...corner(x, y, s * .96, 5));
      g.stroke();
      g.strokeStyle = 'rgba(0, 0, 0, .35)';
      g.beginPath();
      g.moveTo(...corner(x, y, s * .96, 5)); g.lineTo(...corner(x, y, s * .96, 0)); g.lineTo(...corner(x, y, s * .96, 1)); g.lineTo(...corner(x, y, s * .96, 2));
      g.stroke();
    }
    // Een zeeslang en een schip in het water, zoals op oude kaarten.
    const water = map.cells.map((cell, i) => cell.land ? -1 : i).filter(i => i >= 0);
    if (water.length) serpent(g, centers[water[0]].x, centers[water[0]].y, size);
    if (water.length > 2) ship(g, centers[water[water.length - 1]].x, centers[water[water.length - 1]].y, size);
    compass(g, w - size * 1.1, h - size * 1.1, size * .75, dpr);
    return c;
  }

  function serpent(g, x, y, s) {
    g.save();
    g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const hx = x - s * .5 + k * s * .32;
      g.strokeStyle = '#1d6b5a';
      g.lineWidth = s * .13;
      g.beginPath(); g.arc(hx, y + s * .1, s * .13, Math.PI, 0); g.stroke();
      g.strokeStyle = '#3fd0a8';
      g.lineWidth = s * .04;
      g.beginPath(); g.arc(hx, y + s * .1, s * .15, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
    }
    g.fillStyle = '#1d6b5a';
    g.beginPath(); g.ellipse(x + s * .5, y - s * .05, s * .16, s * .1, -.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffe066';
    g.beginPath(); g.arc(x + s * .55, y - s * .09, s * .03, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(200, 240, 255, .4)';
    g.lineWidth = Math.max(1, s * .02);
    g.beginPath(); g.moveTo(x - s * .7, y + s * .12); g.lineTo(x + s * .65, y + s * .12); g.stroke();
    g.restore();
  }

  function ship(g, x, y, s) {
    g.save();
    g.fillStyle = '#5a3a20';
    g.beginPath(); g.moveTo(x - s * .35, y); g.lineTo(x + s * .35, y); g.lineTo(x + s * .25, y + s * .14); g.lineTo(x - s * .25, y + s * .14); g.closePath(); g.fill();
    g.fillStyle = '#3a2614';
    g.fillRect(x - s * .02, y - s * .45, s * .04, s * .45);
    g.fillStyle = '#efe6cc';
    g.beginPath(); g.moveTo(x + s * .03, y - s * .42); g.quadraticCurveTo(x + s * .3, y - s * .25, x + s * .03, y - s * .06); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x - s * .03, y - s * .38); g.quadraticCurveTo(x - s * .24, y - s * .22, x - s * .03, y - s * .08); g.closePath(); g.fill();
    g.fillStyle = '#4cc9ff';
    g.fillRect(x - s * .02, y - s * .52, s * .14, s * .06);
    g.restore();
  }

  function compass(g, x, y, r, dpr) {
    g.save();
    g.translate(x, y);
    g.strokeStyle = 'rgba(255, 211, 107, .5)';
    g.lineWidth = Math.max(1, dpr);
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(0, 0, r * .8, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 8; k++) {
      const len = k % 2 ? r * .55 : r * 1.05;
      g.rotate(Math.PI / 4);
      g.fillStyle = k === 7 ? 'rgba(255, 77, 109, .85)' : k % 2 ? 'rgba(76, 201, 255, .45)' : 'rgba(255, 211, 107, .7)';
      g.beginPath(); g.moveTo(0, -len); g.lineTo(r * .12, 0); g.lineTo(0, r * .12); g.lineTo(-r * .12, 0); g.closePath(); g.fill();
    }
    g.restore();
  }

  // ---------- Burcht ----------

  const castleCache = new Map();
  function castleSprite(color, s) {
    const key = `${color}:${Math.round(s)}`;
    if (castleCache.has(key)) return castleCache.get(key);
    if (castleCache.size > 24) castleCache.clear();
    const W = Math.ceil(s * 1.6), H = Math.ceil(s * 1.5);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const cx = W / 2, by = H * .92;
    g.fillStyle = 'rgba(0, 0, 0, .4)';
    g.beginPath(); g.ellipse(cx, by, s * .7, s * .14, 0, 0, Math.PI * 2); g.fill();
    const stone = (x, y, w, h) => {
      const sg = g.createLinearGradient(x, 0, x + w, 0);
      sg.addColorStop(0, '#d9d2c3');
      sg.addColorStop(.6, '#a59d8e');
      sg.addColorStop(1, '#6e675c');
      g.fillStyle = sg;
      g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(40, 30, 20, .35)';
      g.lineWidth = Math.max(1, s * .015);
      for (let yy = y + h * .2; yy < y + h; yy += h * .2) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
      const m = w / 5;
      g.fillStyle = sg;
      for (let k = 0; k < 5; k += 2) g.fillRect(x + k * m, y - m * .8, m, m * .8);
    };
    const roof = (x, y, w, h) => {
      g.fillStyle = color;
      g.beginPath(); g.moveTo(x - w * .1, y); g.lineTo(x + w / 2, y - h); g.lineTo(x + w * 1.1, y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0, 0, 0, .3)';
      g.beginPath(); g.moveTo(x + w / 2, y - h); g.lineTo(x + w * 1.1, y); g.lineTo(x + w / 2, y); g.closePath(); g.fill();
    };
    // Muur, twee torens en de hoge donjon in het midden.
    stone(cx - s * .62, by - s * .42, s * 1.24, s * .42);
    stone(cx - s * .72, by - s * .78, s * .3, s * .78);
    stone(cx + s * .42, by - s * .78, s * .3, s * .78);
    roof(cx - s * .72, by - s * .84, s * .3, s * .3);
    roof(cx + s * .42, by - s * .84, s * .3, s * .3);
    stone(cx - s * .22, by - s * 1.0, s * .44, s * .62);
    roof(cx - s * .22, by - s * 1.06, s * .44, s * .26);
    // Poort en ramen.
    g.fillStyle = '#140c08';
    g.beginPath(); g.moveTo(cx - s * .12, by); g.lineTo(cx - s * .12, by - s * .18); g.arc(cx, by - s * .18, s * .12, Math.PI, 0); g.lineTo(cx + s * .12, by); g.closePath(); g.fill();
    g.fillStyle = '#ffd36b';
    for (const [x, y] of [[cx - s * .6, by - s * .55], [cx + s * .54, by - s * .55], [cx - s * .04, by - s * .72]]) g.fillRect(x, y, s * .08, s * .12);
    // Teamband langs de muur.
    g.fillStyle = color;
    g.fillRect(cx - s * .62, by - s * .3, s * 1.24, s * .05);
    castleCache.set(key, c);
    return c;
  }

  // De vlagstok staat bovenop de donjon: zelfde plaats in castle() en flag().
  const flagTop = (y, s) => y + s * .38 - s * 1.32;

  function castle(g, x, y, s, color) {
    const spr = castleSprite(color, s);
    Glow.glow(g, x, y + s * .1, s * 1.1, color, .45);
    g.drawImage(spr, x - spr.width / 2, y + s * .38 - spr.height * .92);
    g.strokeStyle = '#2a2018';
    g.lineWidth = Math.max(1, s * .03);
    g.beginPath(); g.moveTo(x, flagTop(y, s) + s * .3); g.lineTo(x, flagTop(y, s) - s * .12); g.stroke();
  }

  function flag(g, x, y, s, color, t) {
    const py = flagTop(y, s);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x, py - s * .12);
    for (let k = 1; k <= 6; k++) g.lineTo(x + k * s * .07, py - s * .12 + Math.sin(t * 5 + k * .9) * s * .03 * k / 6);
    for (let k = 6; k >= 0; k--) g.lineTo(x + k * s * .07, py + s * .06 + Math.sin(t * 5 + k * .9) * s * .03 * k / 6);
    g.closePath();
    g.fill();
  }

  // ---------- Elke keer ----------

  function shield(g, x, y, r) {
    g.beginPath();
    g.moveTo(x - r, y - r * .9);
    g.lineTo(x + r, y - r * .9);
    g.lineTo(x + r, y - r * .1);
    g.quadraticCurveTo(x + r * .8, y + r * .8, x, y + r * 1.2);
    g.quadraticCurveTo(x - r * .8, y + r * .8, x - r, y - r * .1);
    g.closePath();
  }

  function label(g, text, x, y, px) {
    g.font = `700 ${px}px 'Exo 2', sans-serif`;
    g.lineJoin = 'round';
    g.lineWidth = Math.max(2, px * .28);
    g.strokeStyle = 'rgba(5, 8, 16, .85)';
    g.strokeText(text, x, y);
    g.fillStyle = 'rgba(244, 240, 228, .95)';
    g.fillText(text, x, y);
  }

  // Alles wat pas verandert als er een zet gebeurt: teamkleuren, grenzen, schildjes, zegels, namen en burchten.
  function paintState(g, L, map, opts) {
    const { size, dpr, centers, near } = L;
    const targets = opts.targets || null;
    const s = size * .985;
    const owner = c => (c.owner !== null && c.owner !== undefined ? c.owner : -1);
    // Teamkleur over het land, en wat je nu niet kan kiezen wat donkerder.
    map.cells.forEach((cell, i) => {
      if (!cell.land) return;
      const { x, y } = centers[i];
      const o = owner(cell);
      hexPath(g, x, y, s);
      if (o >= 0) {
        g.fillStyle = Glow.rgba(map.teams[o].color, cell.castle !== null ? .5 : .3 + .05 * cell.power);
        g.fill();
      }
      if (targets && !targets[i]) {
        g.fillStyle = 'rgba(4, 8, 18, .55)';
        g.fill();
      }
    });
    // Grenzen: een gloeiende lijn waar het land van een team ophoudt.
    map.teams.forEach((team, ti) => {
      g.beginPath();
      map.cells.forEach((cell, i) => {
        if (!cell.land || owner(cell) !== ti) return;
        const { x, y } = centers[i];
        for (let k = 0; k < 6; k++) {
          const n = near[i][k];
          if (n >= 0 && map.cells[n].land && owner(map.cells[n]) === ti) continue;
          g.moveTo(...corner(x, y, s * .93, k));
          g.lineTo(...corner(x, y, s * .93, k + 1));
        }
      });
      g.lineCap = 'round';
      g.strokeStyle = Glow.rgba(team.color, .35);
      g.lineWidth = size * .2;
      g.stroke();
      g.strokeStyle = team.color;
      g.lineWidth = Math.max(1.5, size * .06);
      g.stroke();
    });
    // Wat je hier kan doen (op de gsm): aanvallen of versterken.
    if (targets) {
      for (const [i, kind] of Object.entries(targets)) {
        const { x, y } = centers[i];
        const col = kind === 'versterk' ? '#ffffff' : kind === 'vijand' ? '#ff8fa3' : '#4cc9ff';
        Glow.glow(g, x, y, size * .9, col, .35);
        hexPath(g, x, y, s * .84);
        g.lineWidth = Math.max(2, size * .1);
        g.setLineDash(kind === 'versterk' ? [size * .12, size * .1] : []);
        g.strokeStyle = col;
        g.stroke();
        g.setLineDash([]);
      }
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    map.cells.forEach((cell, i) => {
      if (!cell.land) return;
      const { x, y } = centers[i];
      const team = owner(cell) >= 0 ? map.teams[cell.owner] : null;
      g.globalAlpha = targets && !targets[i] ? .55 : 1;
      if (cell.castle !== null) {
        castle(g, x, y, size * .78, team ? team.color : '#ffffff');
      } else if (team) {
        // Kracht als schildjes, en het nummer van de les waarin het veroverd werd als zegel.
        const n = cell.power;
        const r = size * .075;
        for (let k = 0; k < n; k++) {
          shield(g, x + (k - (n - 1) / 2) * r * 2.5, y + size * .45, r);
          g.fillStyle = '#f4f1e6';
          g.fill();
          g.lineWidth = Math.max(1, size * .025);
          g.strokeStyle = team.color;
          g.stroke();
        }
        const les = opts.lessonOf && cell.quiz ? opts.lessonOf[cell.quiz] : null;
        if (les) {
          g.beginPath();
          g.arc(x, y + size * .02, size * .25, 0, Math.PI * 2);
          g.fillStyle = 'rgba(8, 10, 22, .78)';
          g.fill();
          g.lineWidth = Math.max(1, size * .035);
          g.strokeStyle = '#ffd36b';
          g.stroke();
          g.font = `800 ${size * .3}px 'Orbitron', 'Exo 2', sans-serif`;
          g.fillStyle = '#fff3c4';
          g.fillText(les, x, y + size * .04);
        }
      }
      if (opts.names && size > 26 * dpr && cell.castle === null) label(g, cell.name, x, y - size * .55, Math.max(9 * dpr, size * .2));
    });
    g.globalAlpha = 1;
  }

  function draw(canvas, map, opts = {}) {
    const L = layout(canvas, map, opts.focus);
    const g = canvas.getContext('2d');
    const { size, centers } = L;
    const now = opts.now || Date.now();
    const t = performance.now() / 1000;
    const targets = opts.targets || null;
    // Het landschap en de stand worden gebakken; alleen als er iets verandert, wordt opnieuw getekend.
    const landKey = map.cells.map(c => c.land ? 1 : 0).join('');
    const memo = canvas._rk || (canvas._rk = {});
    if (memo.key !== L.key || memo.land !== landKey) Object.assign(memo, { key: L.key, land: landKey, base: base(L, map), state: null });
    const stateKey = JSON.stringify([map.cells.map(c => [c.owner, c.power, c.quiz, c.siege]), targets, opts.lessonOf, !!opts.names, map.teams.map(tm => tm.color)]);
    if (memo.stateKey !== stateKey || !memo.state) {
      const c = memo.state || document.createElement('canvas');
      c.width = L.w;
      c.height = L.h;
      const sg = c.getContext('2d');
      sg.drawImage(memo.base, 0, 0);
      paintState(sg, L, map, opts);
      memo.state = c;
      memo.stateKey = stateKey;
    }
    g.drawImage(memo.state, 0, 0);
    // Wapperende vlaggen op de burchten en vaandels bij een belegering.
    map.cells.forEach((cell, i) => {
      if (!cell.land) return;
      const { x, y } = centers[i];
      if (targets && !targets[i]) g.globalAlpha = .55;
      if (cell.castle !== null && cell.owner !== null) flag(g, x, y, size * .78, map.teams[cell.owner].color, t + i);
      if (cell.castle === null && cell.siege) {
        let k = 0;
        for (const [tm, v] of Object.entries(cell.siege)) {
          for (let j = 0; j < v; j++, k++) {
            const fx = x - size * .22 + k * size * .2, fy = y + size * .2;
            g.strokeStyle = '#2a2018';
            g.lineWidth = Math.max(1, size * .03);
            g.beginPath(); g.moveTo(fx, fy + size * .3); g.lineTo(fx, fy - size * .05); g.stroke();
            g.fillStyle = map.teams[tm] ? map.teams[tm].color : '#fff';
            g.beginPath(); g.moveTo(fx, fy - size * .05); g.lineTo(fx + size * .18, fy + size * .03 + Math.sin(t * 6 + k) * size * .02); g.lineTo(fx, fy + size * .11); g.closePath(); g.fill();
          }
        }
      }
      g.globalAlpha = 1;
    });
    // Flits bij een verandering.
    const seen = new Set();
    for (const f of opts.recent || []) {
      const age = now - f.at;
      if (age >= 1600 || seen.has(f.i)) continue;
      seen.add(f.i);
      const { x, y } = centers[f.i];
      const p = age / 1600;
      const col = f.kind === 'veroverd' ? '#ffc94a' : f.kind === 'zwak' ? '#ff4d6d' : '#ffffff';
      Glow.glow(g, x, y, size * (1 + p * 1.5), col, (1 - p) * .7);
      hexPath(g, x, y, size * .985 * (1 + p * .5));
      g.lineWidth = size * .12 * (1 - p);
      g.strokeStyle = col;
      g.globalAlpha = 1 - p;
      g.stroke();
      g.globalAlpha = 1;
    }
    if (opts.recent) {
      // Op het bord: glinsteringen op het water en een scanner die over de kaart schuift.
      map.cells.forEach((cell, i) => {
        if (cell.land) return;
        const a = Math.sin(t * 1.7 + i * 2.3);
        if (a > .6) Glow.glow(g, centers[i].x + Math.sin(i) * size * .3, centers[i].y + Math.cos(i * 1.3) * size * .3, size * .25, '#bfefff', (a - .6) * 1.2);
      });
      const sx = ((t / 9) % 1) * (L.w + size * 6) - size * 3;
      const sweep = g.createLinearGradient(sx - size * 2, 0, sx + size * .3, 0);
      sweep.addColorStop(0, 'rgba(76, 201, 255, 0)');
      sweep.addColorStop(.85, 'rgba(76, 201, 255, .08)');
      sweep.addColorStop(1, 'rgba(160, 235, 255, .22)');
      g.fillStyle = sweep;
      g.fillRect(sx - size * 2, 0, size * 2.3, L.h);
    }
    return L;
  }

  function hit(L, x, y) {
    let best = -1;
    let bestD = Infinity;
    L.centers.forEach((c, i) => {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return bestD <= L.size ? best : -1;
  }

  // De kaartenkamer: een eiken tafel bij kaarslicht, met perkament, passer en speelstukken. Eén keer per maat gebakken.
  function room(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const u = Math.min(w, h) / 100;
    const rnd = rng(77);
    g.fillStyle = '#2a170c';
    g.fillRect(0, 0, w, h);
    const plank = u * 9;
    for (let y = 0, k = 0; y < h; y += plank, k++) {
      const pg = g.createLinearGradient(0, y, 0, y + plank);
      const l = 14 + (k % 3) * 2;
      pg.addColorStop(0, `hsl(24, 45%, ${l + 4}%)`);
      pg.addColorStop(1, `hsl(22, 50%, ${l - 3}%)`);
      g.fillStyle = pg;
      g.fillRect(0, y, w, plank - Math.max(1, u * .2));
      g.strokeStyle = 'rgba(0, 0, 0, .18)';
      g.lineWidth = Math.max(1, u * .12);
      for (let j = 0; j < 5; j++) {
        const yy = y + rnd() * plank;
        g.beginPath(); g.moveTo(0, yy);
        for (let x = 0; x <= w; x += w / 12) g.lineTo(x, yy + Math.sin(x / (u * 9) + j) * u * .5);
        g.stroke();
      }
      const off = rnd() * w;
      g.fillStyle = 'rgba(0, 0, 0, .5)';
      g.fillRect(off, y, Math.max(1, u * .25), plank);
    }
    // Perkament onder het bord, met verbrande randen.
    const px = w * .06, py = h * .1, pw = w * .88, ph = h * .84;
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(-.012);
    g.translate(-w / 2, -h / 2);
    g.shadowColor = 'rgba(0, 0, 0, .6)';
    g.shadowBlur = u * 3;
    const pp = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(pw, ph) * .6);
    pp.addColorStop(0, '#d8c39a');
    pp.addColorStop(.8, '#b39467');
    pp.addColorStop(1, '#6e5030');
    g.fillStyle = pp;
    g.beginPath();
    g.moveTo(px, py);
    for (let k = 0; k <= 20; k++) g.lineTo(px + pw * k / 20, py + (rnd() - .5) * u);
    for (let k = 0; k <= 20; k++) g.lineTo(px + pw + (rnd() - .5) * u, py + ph * k / 20);
    for (let k = 20; k >= 0; k--) g.lineTo(px + pw * k / 20, py + ph + (rnd() - .5) * u);
    for (let k = 20; k >= 0; k--) g.lineTo(px + (rnd() - .5) * u, py + ph * k / 20);
    g.closePath();
    g.fill();
    g.restore();
    g.strokeStyle = 'rgba(90, 60, 30, .35)';
    g.lineWidth = Math.max(1, u * .15);
    for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo(px + pw * k / 8, py); g.lineTo(px + pw * k / 8, py + ph); g.stroke(); }
    for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(px, py + ph * k / 5); g.lineTo(px + pw, py + ph * k / 5); g.stroke(); }
    compass(g, px + pw * .9, py + ph * .82, u * 7, u * .3);
    // Speelstukken (ridders en torens) op de tafel.
    const piece = (x, y, r, color) => {
      g.fillStyle = 'rgba(0, 0, 0, .45)';
      g.beginPath(); g.ellipse(x + r * .3, y + r * .2, r * 1.2, r * .45, 0, 0, Math.PI * 2); g.fill();
      const pg2 = g.createLinearGradient(x - r, 0, x + r, 0);
      pg2.addColorStop(0, '#fff');
      pg2.addColorStop(.35, color);
      pg2.addColorStop(1, '#000');
      g.fillStyle = pg2;
      g.beginPath(); g.ellipse(x, y, r, r * .35, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(x - r * .55, y - r * 1.6, r * 1.1, r * 1.6);
      g.beginPath(); g.arc(x, y - r * 1.7, r * .55, 0, Math.PI * 2); g.fill();
    };
    piece(w * .03, h * .2, u * 1.6, '#ff4d6d');
    piece(w * .97, h * .3, u * 1.6, '#3d8bff');
    piece(w * .975, h * .62, u * 1.4, '#ffb703');
    piece(w * .025, h * .7, u * 1.4, '#22c993');
    const candles = [[w * .03, h * .05], [w * .97, h * .05], [w * .03, h * .97], [w * .97, h * .97]];
    for (const [x, y] of candles) {
      g.fillStyle = '#efe4c8';
      g.fillRect(x - u * .7, y - u * 2.5, u * 1.4, u * 3);
    }
    return { c, candles, u };
  }

  function candle(g, x, y, u, t, i = 0) {
    const fl = .8 + Math.sin(t * 11 + i) * .1 + Math.sin(t * 6.3 + i * 2.1) * .08;
    Glow.glow(g, x, y - u * 3, u * 18 * fl, '#ff9a3a', .45 * fl);
    Glow.glow(g, x, y - u * 3, u * 1.6, '#fff4c0', .95);
  }

  return { draw, hit, room, candle };
})();
