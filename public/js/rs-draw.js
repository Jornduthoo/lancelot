// Ridderslang tekenen (bord en leerling): de stenen burchtvloer, de burchtmuur met torens en vuurbakens, zwevende ruïnes, de lichtbollen en de lansslangen.
// Een lichaam is één pad dat we een paar keer overtrekken (gloed, pantser, schubben, kern): veel goedkoper dan honderden bolletjes.
// Koppen, bollen en de kroon tekenen we één keer vooraf. Gebruikt AK (arena-kit.js), Glow (fx.js) en RsWorld.
const RsDraw = (() => {
  const { width, bodyLen, STEP } = RsWorld;
  const { glow, rgba } = Glow;
  const TAU = Math.PI * 2;

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const mix = c => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
    return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  }
  function canvas(w, h = w) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // ---------- Geschilderde beelden ----------
  // Vloer, lichtbollen en de slangenkop. Zonder beelden tekenen we alles zelf.
  const ART = {};
  if (typeof Image !== 'undefined') {
    for (const n of ['vloer', 'bol-cyaan', 'bol-goud', 'bol-ster', 'kop']) {
      const img = new Image();
      img.onload = () => {
        ART[n] = img;
        headCache.clear(); dustArt.clear(); floorQuads = null; baked = null;
      };
      img.src = `/img/ridderslang/${n}.webp`;
    }
  }
  // Lichtbol per kleur van het stof: cyaan, roze, goud, groen, paars (groen en paars door een filter).
  const dustArt = new Map();
  const DUST_ART = [['bol-cyaan', ''], ['bol-ster', ''], ['bol-goud', ''], ['bol-cyaan', 'hue-rotate(-60deg)'], ['bol-ster', 'hue-rotate(-50deg)']];
  function dustImage(ci, big) {
    const key = big ? 'big' : ci;
    if (dustArt.has(key)) return dustArt.get(key);
    const [n, f] = big ? ['bol-ster', ''] : DUST_ART[ci] || DUST_ART[0];
    const img = ART[n];
    if (!img) return null;
    const c = canvas(48), g = c.getContext('2d'), k = 48 / Math.max(img.width, img.height);
    if (f) g.filter = f;
    g.drawImage(img, (48 - img.width * k) / 2, (48 - img.height * k) / 2, img.width * k, img.height * k);
    dustArt.set(key, c);
    return c;
  }
  let floorQuads = null;
  function paintedTile(ix, iy) {
    if (!ART.vloer) return null;
    if (!floorQuads) floorQuads = [0, 1, 2, 3].map(q => {
      const c = canvas(TILE), g = c.getContext('2d'), h = ART.vloer.width / 2;
      g.drawImage(ART.vloer, (q & 1) * h, (q >> 1) * h, h, h, 0, 0, TILE, TILE);
      g.fillStyle = 'rgba(8,6,20,.25)';
      g.fillRect(0, 0, TILE, TILE);
      return c;
    });
    return floorQuads[(ix & 1) + (iy & 1) * 2];
  }

  // ---------- Vooraf getekend ----------
  // De kop van boven gezien, naar rechts kijkend: een lans vooruit, een ridderhelm met kam en een lichtend vizier.
  const HEAD_R = 40, HX = 52, HY = 64;
  const headCache = new Map();
  function headSprite(color) {
    let c = headCache.get(color);
    if (c) return c;
    c = canvas(200, 128);
    const g = c.getContext('2d');
    if (ART.kop) {
      // Geschilderde helmkop: in het beeld wijst de lans naar beneden, dus een kwartslag draaien naar rechts.
      // De blauwe kam krijgt de kleur van de speler.
      const img = ART.kop, len = 132, wid = len * img.width / img.height;
      const t = canvas(Math.ceil(wid), len), tg = t.getContext('2d');
      tg.drawImage(img, 0, 0, t.width, t.height);
      const d = tg.getImageData(0, 0, t.width, t.height), p = d.data;
      const [tr, tgc, tb] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
      for (let i = 0; i < p.length; i += 4) {
        if (p[i + 3] < 10) continue;
        const r = p[i] / 255, gg = p[i + 1] / 255, b = p[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        if (mx !== b || mx - mn < .01) continue;
        const hue = 60 * (4 + (r - gg) / (mx - mn)), sat = (mx - mn) / mx;
        if (hue < 205 || hue > 258 || sat < .38) continue;
        const l = (r * .3 + gg * .59 + b * .11) * 2.4;
        p[i] = Math.min(255, tr * l); p[i + 1] = Math.min(255, tgc * l); p[i + 2] = Math.min(255, tb * l);
      }
      tg.putImageData(d, 0, 0);
      glow(g, HX + 40, HY, 46, color, .45);
      g.translate(HX + 22, HY);
      g.rotate(-Math.PI / 2);
      g.drawImage(t, -wid / 2, -len / 2);
      headCache.set(color, c);
      return c;
    }
    // Lans
    glow(g, 150, HY, 40, color, .5);
    const lance = g.createLinearGradient(80, 0, 198, 0);
    lance.addColorStop(0, '#8d97b3');
    lance.addColorStop(.6, '#f4f8ff');
    lance.addColorStop(1, '#ffffff');
    g.fillStyle = lance;
    g.beginPath();
    g.moveTo(78, HY - 11);
    g.lineTo(196, HY);
    g.lineTo(78, HY + 11);
    g.closePath();
    g.fill();
    g.strokeStyle = shade(color, .3);
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = rgba('#ffffff', .85);
    g.beginPath();
    g.moveTo(86, HY - 3);
    g.lineTo(190, HY);
    g.lineTo(86, HY + 1);
    g.closePath();
    g.fill();
    // Handbeschermer
    g.fillStyle = shade(color, -.2);
    g.beginPath();
    g.ellipse(82, HY, 8, 20, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#ffe17a';
    g.lineWidth = 2;
    g.stroke();
    // Helm
    glow(g, HX, HY, 62, color, .45);
    const steel = g.createRadialGradient(HX - 12, HY - 14, 4, HX, HY, HEAD_R);
    steel.addColorStop(0, '#ffffff');
    steel.addColorStop(.35, '#c9d4ea');
    steel.addColorStop(.8, '#6b7896');
    steel.addColorStop(1, '#353d55');
    g.fillStyle = steel;
    g.beginPath();
    g.arc(HX, HY, HEAD_R, 0, TAU);
    g.fill();
    g.strokeStyle = shade(color, .1);
    g.lineWidth = 4;
    g.stroke();
    // Kam van voor naar achter
    const crest = g.createLinearGradient(HX - HEAD_R, 0, HX + HEAD_R, 0);
    crest.addColorStop(0, shade(color, -.4));
    crest.addColorStop(1, shade(color, .35));
    g.fillStyle = crest;
    g.beginPath();
    g.moveTo(HX - HEAD_R - 14, HY);
    g.quadraticCurveTo(HX - 10, HY - 13, HX + HEAD_R * .7, HY - 4);
    g.lineTo(HX + HEAD_R * .7, HY + 4);
    g.quadraticCurveTo(HX - 10, HY + 13, HX - HEAD_R - 14, HY);
    g.fill();
    // Vizier vooraan
    g.save();
    g.shadowColor = '#9ff3ff';
    g.shadowBlur = 14;
    g.strokeStyle = '#bff8ff';
    g.lineWidth = 6;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(HX, HY, HEAD_R - 7, -.75, .75);
    g.stroke();
    g.restore();
    headCache.set(color, c);
    return c;
  }

  const dustSprites = RsWorld.DUST.map(col => {
    const c = canvas(48);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(.18, rgba(col, 1));
    grad.addColorStop(.4, rgba(col, .35));
    grad.addColorStop(1, rgba(col, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    return c;
  });

  const crown = (() => {
    const c = canvas(96, 72);
    const g = c.getContext('2d');
    glow(g, 48, 40, 44, '#ffc94a', .6);
    const gold = g.createLinearGradient(0, 14, 0, 62);
    gold.addColorStop(0, '#fff3b0');
    gold.addColorStop(.5, '#ffc94a');
    gold.addColorStop(1, '#a8670f');
    g.fillStyle = gold;
    g.beginPath();
    g.moveTo(14, 60); g.lineTo(10, 22); g.lineTo(30, 40); g.lineTo(48, 12); g.lineTo(66, 40); g.lineTo(86, 22); g.lineTo(82, 60);
    g.closePath();
    g.fill();
    g.strokeStyle = '#5a3606';
    g.lineWidth = 3;
    g.stroke();
    for (const [x, y, col] of [[48, 46, '#ff4d6d'], [28, 50, '#4cc9ff'], [68, 50, '#4ade80']]) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, 5.5, 0, TAU);
      g.fill();
    }
    return c;
  })();

  // Een vuurbaken op de burchtmuur.
  const beacon = (() => {
    const c = canvas(96);
    const g = c.getContext('2d');
    glow(g, 48, 48, 46, '#ff8c42', .7);
    g.fillStyle = '#2b2f45';
    g.fillRect(30, 30, 36, 36);
    g.strokeStyle = '#7d86a8';
    g.lineWidth = 3;
    g.strokeRect(30, 30, 36, 36);
    const fire = g.createRadialGradient(48, 48, 2, 48, 48, 16);
    fire.addColorStop(0, '#fff6c9');
    fire.addColorStop(.4, '#ffb347');
    fire.addColorStop(1, 'rgba(255,90,40,0)');
    g.fillStyle = fire;
    g.beginPath();
    g.arc(48, 48, 16, 0, TAU);
    g.fill();
    return c;
  })();

  // Vaste toevalsgetallen, zodat elke tegel en elke steen altijd hetzelfde blijft.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // De burchtvloer: tegels van 240 eenheden met vier leistenen platen, barsten, slijtplekken en hier en daar een oplichtende rune.
  // De voegen geven een zachte neongloed, zoals het oude raster.
  const TILE = 240;
  const tiles = [0, 1, 2, 3, 4, 5].map(v => {
    const c = canvas(TILE);
    const g = c.getContext('2d');
    const r = rng(v * 977 + 13);
    g.fillStyle = '#07060f';
    g.fillRect(0, 0, TILE, TILE);
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const x = sx * 120 + 3, y = sy * 120 + 3, w = 114;
      const l = 9 + r() * 5, hue = 238 + r() * 24;
      const slab = g.createLinearGradient(x, y, x + w, y + w);
      slab.addColorStop(0, `hsl(${hue},20%,${l + 4}%)`);
      slab.addColorStop(1, `hsl(${hue},24%,${l - 3}%)`);
      g.fillStyle = slab;
      g.fillRect(x, y, w, w);
      // Afgeschuinde rand: licht linksboven, schaduw rechtsonder
      g.fillStyle = 'rgba(255,255,255,.07)';
      g.fillRect(x, y, w, 3);
      g.fillRect(x, y, 3, w);
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(x, y + w - 3, w, 3);
      g.fillRect(x + w - 3, y, 3, w);
      // Korrel en slijtplekken
      for (let i = 0; i < 26; i++) {
        g.fillStyle = r() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.18)';
        const d = 1 + r() * 3;
        g.fillRect(x + 6 + r() * (w - 12), y + 6 + r() * (w - 12), d, d);
      }
      if (r() < .35) {
        const wear = g.createRadialGradient(x + w / 2, y + w / 2, 4, x + w / 2, y + w / 2, w * .55);
        wear.addColorStop(0, 'rgba(120,110,170,.10)');
        wear.addColorStop(1, 'rgba(120,110,170,0)');
        g.fillStyle = wear;
        g.fillRect(x, y, w, w);
      }
      // Een barst
      if (r() < .45) {
        g.strokeStyle = 'rgba(0,0,0,.55)';
        g.lineWidth = 1.6;
        g.beginPath();
        let cx = x + 10 + r() * (w - 20), cy = y + 6;
        g.moveTo(cx, cy);
        for (let k = 0; k < 5; k++) { cx += (r() - .5) * 26; cy += 10 + r() * 16; g.lineTo(Math.max(x + 4, Math.min(x + w - 4, cx)), Math.min(y + w - 4, cy)); }
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.06)';
        g.lineWidth = 1;
        g.translate(1, 1);
        g.stroke();
        g.translate(-1, -1);
      }
    }
    // Een oplichtende rune op sommige tegels
    if (v === 1 || v === 4) {
      const col = v === 1 ? '#9ff3ff' : '#ff6bd6';
      const x = 60 + (v === 4 ? 120 : 0), y = 60 + (v === 4 ? 120 : 0);
      glow(g, x, y, 34, col, .35);
      g.strokeStyle = rgba(col, .7);
      g.lineWidth = 2.5;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(x, y, 18, 0, TAU);
      g.moveTo(x, y - 12); g.lineTo(x, y + 12);
      g.moveTo(x, y - 4); g.lineTo(x + 8, y - 12);
      g.moveTo(x, y + 2); g.lineTo(x - 8, y - 6);
      g.stroke();
    }
    // Neonvoegen
    g.strokeStyle = 'rgba(255,90,200,.16)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(1, 0); g.lineTo(1, TILE); g.moveTo(0, 1); g.lineTo(TILE, 1);
    g.moveTo(121, 0); g.lineTo(121, TILE); g.moveTo(0, 121); g.lineTo(TILE, 121);
    g.stroke();
    g.fillStyle = 'rgba(255,140,220,.45)';
    for (const [px, py] of [[1, 1], [121, 1], [1, 121], [121, 121]]) g.fillRect(px - 2, py - 2, 4, 4);
    return c;
  });
  const tileAt = (ix, iy) => {
    const hsh = Math.imul(ix * 73856093 ^ iy * 19349663, 0x27d4eb2d) >>> 0;
    const k = hsh % 13;
    return tiles[k < 11 ? [0, 2, 3, 5][k % 4] : k < 12 ? 1 : 4];
  };
  // Tegels in het stuk { x0, x1, y0, y1 }, alleen binnen de muur.
  function floorTiles(ctx, R, v) {
    const x0 = Math.max(-R, v.x0), x1 = Math.min(R, v.x1), y0 = Math.max(-R, v.y0), y1 = Math.min(R, v.y1);
    for (let ix = Math.floor(x0 / TILE); ix * TILE < x1; ix++) {
      for (let iy = Math.floor(y0 / TILE); iy * TILE < y1; iy++) {
        const nx = Math.max(ix * TILE, Math.min(0, (ix + 1) * TILE)), ny = Math.max(iy * TILE, Math.min(0, (iy + 1) * TILE));
        if (nx * nx + ny * ny > R * R) continue;
        ctx.drawImage(paintedTile(ix, iy) || tileAt(ix, iy), ix * TILE, iy * TILE, TILE + .5, TILE + .5);
      }
    }
  }

  // Een stuk burchtmuur van boven: een loopgang van metselwerk met kantelen aan de buitenkant.
  // x loopt langs de muur, y van binnen (0) naar buiten (WALL_H).
  const WALL_W = 128, WALL_H = 104;
  const wallSprites = [0, 1, 2].map(v => {
    const c = canvas(WALL_W, WALL_H);
    const g = c.getContext('2d');
    const r = rng(v * 431 + 7);
    // Binnenrand (borstwering)
    g.fillStyle = '#3b4266';
    g.fillRect(0, 0, WALL_W, 10);
    g.fillStyle = 'rgba(255,107,214,.35)';
    g.fillRect(0, 0, WALL_W, 2);
    // Loopgang: stenen in rijen
    for (let row = 0; row < 4; row++) {
      const y = 10 + row * 15, off = row % 2 ? -18 : 0;
      for (let x = off; x < WALL_W; x += 36) {
        const l = 14 + r() * 7;
        g.fillStyle = `hsl(232,18%,${l}%)`;
        g.fillRect(x + 1, y + 1, 34, 13);
        g.fillStyle = 'rgba(255,255,255,.06)';
        g.fillRect(x + 1, y + 1, 34, 2);
        g.fillStyle = 'rgba(0,0,0,.3)';
        g.fillRect(x + 1, y + 12, 34, 2);
      }
    }
    // Schaduw onder de kantelen
    g.fillStyle = 'rgba(0,0,0,.45)';
    g.fillRect(0, 66, WALL_W, 6);
    // Kantelen: hoge blokken met ruimtes ertussen
    g.fillStyle = '#20253b';
    g.fillRect(0, 72, WALL_W, 32);
    for (let x = 4; x < WALL_W; x += 32) {
      const top = g.createLinearGradient(0, 72, 0, 104);
      top.addColorStop(0, '#7c86ad');
      top.addColorStop(1, '#4a5378');
      g.fillStyle = top;
      g.fillRect(x, 74, 22, 28);
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.fillRect(x, 74, 22, 3);
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(x + 19, 74, 3, 28);
    }
    // Een schietgat of een banier op sommige stukken
    if (v === 1) {
      g.fillStyle = '#7a1546';
      g.fillRect(52, 12, 24, 40);
      g.fillStyle = '#ff6bd6';
      g.fillRect(52, 12, 24, 3);
      g.fillStyle = '#ffe17a';
      g.beginPath();
      g.moveTo(64, 22); g.lineTo(70, 34); g.lineTo(64, 46); g.lineTo(58, 34);
      g.fill();
    } else if (v === 2) {
      g.fillStyle = '#0b0d18';
      g.fillRect(60, 40, 8, 26);
      g.fillStyle = 'rgba(159,243,255,.5)';
      g.fillRect(62, 44, 4, 18);
    }
    return c;
  });

  // Een ronde toren met kantelen en een vuurbaken in het midden.
  const TOWER = 176;
  const tower = (() => {
    const c = canvas(TOWER);
    const g = c.getContext('2d');
    const m = TOWER / 2;
    g.fillStyle = 'rgba(0,0,0,.45)';
    g.beginPath();
    g.arc(m + 6, m + 8, 78, 0, TAU);
    g.fill();
    const stone = g.createRadialGradient(m - 20, m - 24, 10, m, m, 80);
    stone.addColorStop(0, '#6b749c');
    stone.addColorStop(1, '#2a3050');
    g.fillStyle = stone;
    g.beginPath();
    g.arc(m, m, 78, 0, TAU);
    g.fill();
    // Kantelen rondom
    g.fillStyle = '#1a1e33';
    g.beginPath();
    g.arc(m, m, 60, 0, TAU);
    g.fill();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      g.save();
      g.translate(m + Math.cos(a) * 69, m + Math.sin(a) * 69);
      g.rotate(a);
      g.fillStyle = i % 2 ? '#3a4266' : '#8a94bb';
      g.fillRect(-9, -11, 18, 22);
      g.restore();
    }
    // Vloer van de torentop, met voegen
    const floor = g.createRadialGradient(m, m, 4, m, m, 60);
    floor.addColorStop(0, '#3a3552');
    floor.addColorStop(1, '#1b1a2e');
    g.fillStyle = floor;
    g.beginPath();
    g.arc(m, m, 56, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.4)';
    g.lineWidth = 2;
    for (const rr of [24, 40]) { g.beginPath(); g.arc(m, m, rr, 0, TAU); g.stroke(); }
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.moveTo(m + Math.cos(a) * 24, m + Math.sin(a) * 24); g.lineTo(m + Math.cos(a) * 56, m + Math.sin(a) * 56); }
    g.stroke();
    // Neonring
    g.strokeStyle = 'rgba(255,107,214,.8)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(m, m, 57, 0, TAU);
    g.stroke();
    return c;
  })();

  // Zwevende rotsen met een burchtruïne in de ruimte buiten de muur.
  const rocks = [0, 1, 2].map(v => {
    const c = canvas(220);
    const g = c.getContext('2d');
    const r = rng(v * 59 + 3);
    const pts = [];
    for (let i = 0; i < 11; i++) { const a = (i / 11) * TAU, d = 70 + r() * 30; pts.push([110 + Math.cos(a) * d, 110 + Math.sin(a) * d * .8]); }
    const shape = () => { g.beginPath(); for (const [x, y] of pts) g.lineTo(x, y); g.closePath(); };
    glow(g, 110, 110, 105, '#c77dff', .18);
    g.save();
    g.translate(6, 12);
    shape();
    g.fillStyle = 'rgba(0,0,0,.5)';
    g.fill();
    g.restore();
    shape();
    const rock = g.createLinearGradient(40, 40, 180, 180);
    rock.addColorStop(0, '#5c5878');
    rock.addColorStop(1, '#1d1b2c');
    g.fillStyle = rock;
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.12)';
    g.lineWidth = 2;
    g.stroke();
    for (let i = 0; i < 8; i++) {
      g.fillStyle = 'rgba(0,0,0,.28)';
      g.beginPath();
      g.arc(70 + r() * 80, 70 + r() * 70, 4 + r() * 9, 0, TAU);
      g.fill();
    }
    // Ruïne: een stukje muur en een toren
    g.fillStyle = '#7c86ad';
    g.fillRect(78, 96, 56, 14);
    for (let x = 78; x < 134; x += 14) g.fillRect(x, 88, 8, 8);
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(78, 108, 56, 4);
    g.fillStyle = '#5a6388';
    g.beginPath();
    g.arc(140 - v * 50, 92 + v * 14, 16, 0, TAU);
    g.fill();
    g.fillStyle = '#20253b';
    g.beginPath();
    g.arc(140 - v * 50, 92 + v * 14, 9, 0, TAU);
    g.fill();
    glow(g, 140 - v * 50, 92 + v * 14, 18, '#9ff3ff', .6);
    return c;
  });

  // ---------- De scène ----------
  class Scene {
    constructor() {
      this.R = 1500;
      this.dust = new Map();
      this.heads = new AK.Interp(100);
      this.len = new Map();     // id -> getoonde lengte
      this.paths = new Map();   // id -> [x, y, x, y, ...] met de kop vooraan
      this.parts = new AK.Particles();
      this.suck = [];
      this.hidden = new Map();
      this.king = -1;
      this.onEvent = null;
      this.pulse = new Map();
      this.seen = new Map();    // id -> laatste keer getekend (paden die lang wegblijven, ruimen we op)
    }
    // Een pad van de server (grover) wordt weer fijn, met STEP tussen twee punten.
    seed(n, pts) {
      const out = [];
      for (let i = 0; i + 1 < pts.length; i += 2) {
        out.push(pts[i], pts[i + 1]);
        if (i + 3 < pts.length) {
          const dx = pts[i + 2] - pts[i], dy = pts[i + 3] - pts[i + 1], d = Math.hypot(dx, dy);
          for (let s = STEP; s < d - 1; s += STEP) out.push(pts[i] + (dx / d) * s, pts[i + 1] + (dy / d) * s);
        }
      }
      if (out.length >= 2) out.splice(2, 0, out[0], out[1]);
      this.paths.set(n, out);
      this.seen.set(n, performance.now());
    }
    setWorld(msg) {
      this.R = msg.R || this.R;
      this.dust.clear();
      const t = performance.now() - 1000;
      for (const d of msg.list) this.dust.set(d[0], [d[1], d[2], d[3], d[4], t]);
      for (const [n, pts] of msg.paths || []) if (!this.paths.has(n) || this.paths.get(n).length < 6) this.seed(n, pts);
    }
    // Een slang die (opnieuw) verschijnt: een recht lichaampje achter de kop.
    fresh(n, x, y, a, L) {
      const path = [x, y];
      for (let i = 0; i <= Math.ceil(bodyLen(L) / STEP); i++) path.push(x - Math.cos(a) * STEP * i, y - Math.sin(a) * STEP * i);
      this.paths.set(n, path);
      this.len.set(n, L);
      this.seen.set(n, performance.now());
    }
    apply(msg) {
      const t = performance.now();
      for (const k of msg.k) this.heads.push(k[0], [k[1], k[2], k[3], k[4], k[5]], t);
      this.heads.prune(t, 300);
      this.king = msg.king;
      for (const e of msg.ev) this.event(e, t);
    }
    event(e, t) {
      const P = this.parts;
      if (e[0] === '+') this.dust.set(e[1], [e[2], e[3], e[4], e[5], t]);
      else if (e[0] === '-') {
        const d = this.dust.get(e[1]);
        this.dust.delete(e[1]);
        this.hidden.delete(e[1]);
        if (d && this.suck.length < 160) this.suck.push({ x: d[0], y: d[1], c: d[3], n: e[2], t });
      } else if (e[0] === 'in') {
        this.fresh(e[1], e[2], e[3], e[4], RsWorld.START);
        this.heads.snaps.delete(e[1]);
        P.shock(e[2], e[3], 90, '#9ff3ff', .5);
      } else if (e[0] === 'dood') {
        const path = this.paths.get(e[1]);
        const color = this.colorOf ? this.colorOf(e[1]) : '#ffffff';
        if (path) {
          for (let i = 0; i < path.length; i += 16) P.burst(path[i], path[i + 1], { n: 3, color, speed: 160, life: .7, size: 4 });
        }
        P.shock(e[3], e[4], 120, '#ffffff', .5);
        P.sparks(e[3], e[4], { n: 24, color: '#ffe17a', speed: 600 });
        this.paths.delete(e[1]);
        this.heads.snaps.delete(e[1]);
        this.len.delete(e[1]);
        if (e[2] >= 0) this.pulse.set(e[2], t);
      } else if (e[0] === 'schild') {
        P.shock(e[2], e[3], 80, '#9ff3ff', .6);
        P.sparks(e[2], e[3], { n: 20, color: '#bff6ff', speed: 500 });
      } else if (e[0] === 'grow') this.pulse.set(e[1], t);
      if (this.onEvent) this.onEvent(e);
    }
    lenOf(n, real, dt) {
      const cur = this.len.get(n);
      const v = cur === undefined ? real : cur + (real - cur) * Math.min(1, dt * 5);
      this.len.set(n, v);
      return v;
    }
    update(dt) {
      this.parts.update(dt);
      const t = performance.now();
      this.suck = this.suck.filter(s => t - s.t < 200);
      for (const [id, at] of this.hidden) if (t - at > 700) this.hidden.delete(id);
    }
    predict(x, y, reach) {
      const t = performance.now();
      for (const [id, d] of this.dust) {
        if (this.hidden.has(id) || Math.abs(d[0] - x) > reach || Math.abs(d[1] - y) > reach) continue;
        if ((d[0] - x) ** 2 + (d[1] - y) ** 2 <= reach * reach) this.hidden.set(id, t);
      }
    }
  }

  // Het pad als lijn, met elk step-de punt (ver uitgezoomd hoeven we niet elk punt te tekenen). De staart komt altijd mee.
  function strokePath(ctx, path, step) {
    ctx.beginPath();
    ctx.moveTo(path[0], path[1]);
    let i = 2;
    for (; i < path.length; i += step * 2) ctx.lineTo(path[i], path[i + 1]);
    if (i - step * 2 !== path.length - 2) ctx.lineTo(path[path.length - 2], path[path.length - 1]);
  }

  // De vloer in één keer: verloop, raster en runencirkel. Gebruikt voor het vooraf getekende beeld.
  function floorFull(ctx, R, ts, withGrid = true) {
    ctx.save();
    if (withGrid) {
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.save();
      ctx.clip();
      floorTiles(ctx, R, { x0: -R, x1: R, y0: -R, y1: R });
      // Ver uitgezoomd (bord) wat donkerder, zodat de slangen en lichtbollen er goed uitspringen.
      ctx.fillStyle = 'rgba(8,6,22,.35)';
      ctx.fillRect(-R, -R, R * 2, R * 2);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    const floor = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    floor.addColorStop(0, 'rgba(60,14,80,.4)');
    floor.addColorStop(.75, 'rgba(10,12,40,.3)');
    floor.addColorStop(1, 'rgba(120,20,90,.4)');
    ctx.fillStyle = floor;
    ctx.fill();
    // Grote lichtcirkels op de vloer (een runencirkel in het midden)
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,107,214,.18)';
    ctx.lineWidth = 6;
    for (const k of [.18, .2, .55]) { ctx.beginPath(); ctx.arc(0, 0, R * k, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(159,243,255,.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = ts * .1 + (i * TAU) / 6;
      ctx.lineTo(Math.cos(a) * R * .19, Math.sin(a) * R * .19);
      ctx.lineTo(Math.cos(a + TAU / 12) * R * .11, Math.sin(a + TAU / 12) * R * .11);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Ingezoomd (gsm, Chromebook): de stenen tegels die in beeld zijn, met daarover het verloop en de runen uit een vooraf getekend beeld.
  // Een verloop of patroon over het hele scherm kost op een Chromebook veel meer dan een handvol beelden.
  let floorCache = null;
  function floorView(ctx, R, view) {
    if (!floorCache || floorCache.R !== R) {
      const size = 1024, k = size / (R * 2);
      const c = canvas(size);
      const g = c.getContext('2d');
      g.translate(size / 2, size / 2);
      g.scale(k, k);
      floorFull(g, R, 0, false);
      floorCache = { c, R, k };
    }
    const { c, k } = floorCache;
    const x0 = Math.max(-R, view.x0), x1 = Math.min(R, view.x1), y0 = Math.max(-R, view.y0), y1 = Math.min(R, view.y1);
    if (!(x1 > x0 && y1 > y0)) return;
    // Bij de muur knippen we de tegels af op de cirkel; in het midden is dat niet nodig.
    const cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2;
    const edge = Math.hypot(cx, cy) + Math.hypot(view.x1 - view.x0, view.y1 - view.y0) / 2 > R;
    if (edge) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.clip();
    }
    floorTiles(ctx, R, view);
    if (edge) ctx.restore();
    ctx.drawImage(c, (x0 + R) * k, (y0 + R) * k, (x1 - x0) * k, (y1 - y0) * k, x0, y0, x1 - x0, y1 - y0);
  }

  // De vloer en de burchtmuur. Op het bord (ver uitgezoomd) tekenen we dit één keer vooraf in een beeld van 2048 px.
  // view: het zichtbare stuk { x0, x1, y0, y1 } of null (alles). Alleen wat in beeld is, tekenen we.
  function arena(ctx, R, ts, inView, view = null) {
    if (view) floorView(ctx, R, view);
    else floorFull(ctx, R, 0);
    // De burchtmuur: stenen ring, kantelen, en een neonlijn aan de binnenkant. Alleen het stuk boog dat in beeld is.
    let a0 = 0, a1 = TAU;
    if (view) {
      const cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2;
      const half = Math.hypot(view.x1 - view.x0, view.y1 - view.y0) / 2;
      const d = Math.hypot(cx, cy);
      if (d + half < R - 40) return;
      if (d > half + 100) {
        const span = Math.min(Math.PI, Math.asin(Math.min(1, (half + 120) / Math.max(d, R * .5))) + .05);
        const mid = Math.atan2(cy, cx);
        a0 = mid - span;
        a1 = mid + span;
      }
    }
    const ring = (r) => { ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); };
    // Muurstukken langs de ring, elk gedraaid zodat de kantelen naar buiten wijzen.
    const segs = Math.round((TAU * (R + 50)) / WALL_W);
    const da = TAU / segs, sw = da * (R + WALL_H) + 2;
    for (let i = Math.floor(a0 / da); i <= Math.ceil(a1 / da); i++) {
      const a = (i + .5) * da;
      const x = Math.cos(a) * R, y = Math.sin(a) * R;
      if (!inView(x, y, 160)) continue;
      ctx.translate(x, y);
      ctx.rotate(a - Math.PI / 2);
      ctx.drawImage(wallSprites[((i % 7) + 7) % 7 === 3 ? 1 : ((i % 5) + 5) % 5 === 1 ? 2 : 0], -sw / 2, -1, sw, WALL_H);
      ctx.rotate(Math.PI / 2 - a);
      ctx.translate(-x, -y);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const [lw, a] of [[30, .1], [10, .45], [3, .9]]) {
      ctx.strokeStyle = rgba('#ff6bd6', a);
      ctx.lineWidth = lw;
      ring(R);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Torens met een vuurbaken, en zwevende rotsen met ruïnes buiten de muur.
    const beacons = Math.max(12, Math.round((TAU * R) / 420));
    for (let i = 0; i < beacons; i++) {
      const a = (i / beacons) * TAU;
      const x = Math.cos(a) * (R + 56), y = Math.sin(a) * (R + 56);
      if (view && i % 3 === 1 && inView(x, y, 260)) {
        const ra = a + .5 / beacons * TAU, d = R + 300 + (i * 53) % 160;
        const rx = Math.cos(ra) * d, ry = Math.sin(ra) * d, rs = 220 * (.8 + (i % 4) * .15);
        ctx.drawImage(rocks[i % 3], rx - rs / 2, ry - rs / 2 + Math.sin(ts * .8 + i) * 6, rs, rs);
      }
      if (!inView(x, y, 100)) continue;
      ctx.drawImage(tower, x - TOWER / 2, y - TOWER / 2);
      const f = 1 + .12 * Math.sin(ts * 9 + i * 1.7);
      ctx.drawImage(beacon, x - 48 * f, y - 48 * f, 96 * f, 96 * f);
    }
  }
  let baked = null;
  function bakedArena(R) {
    if (baked && baked.R === R) return baked;
    const size = 2048, span = R * 2 + 360, k = size / span;
    const c = canvas(size);
    const g = c.getContext('2d');
    g.translate(size / 2, size / 2);
    g.scale(k, k);
    arena(g, R, 0, () => true);
    baked = { c, R, span };
    return baked;
  }

  // ---------- Tekenen ----------
  // cam: { x, y, zoom, w, h }. opts: { roster, local: { n, x, y, a, L, alive, flags }, board }
  function render(ctx, s, cam, opts = {}) {
    const t = performance.now();
    const ts = t / 1000;
    const { w, h, zoom } = cam;
    const dt = Math.min(.05, (t - (s.lastDraw || t)) / 1000);
    s.lastDraw = t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    Glow.space(ctx, w, h, -cam.x * zoom * .15, -cam.y * zoom * .15);
    const view = { x0: cam.x - w / 2 / zoom - 60, x1: cam.x + w / 2 / zoom + 60, y0: cam.y - h / 2 / zoom - 60, y1: cam.y + h / 2 / zoom + 60 };
    const inView = (x, y, r = 0) => x + r > view.x0 && x - r < view.x1 && y + r > view.y0 && y - r < view.y1;
    const roster = opts.roster;
    s.colorOf = n => (roster && roster.get(n) ? roster.get(n).color : '#ffffff');

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);
    const R = s.R;
    if (zoom < .45) {
      const b = bakedArena(R);
      ctx.drawImage(b.c, -b.span / 2, -b.span / 2, b.span, b.span);
    } else arena(ctx, R, ts, inView, view);
    // Lichtbollen
    for (const [id, d] of s.dust) {
      if (s.hidden.has(id) || !inView(d[0], d[1], 20)) continue;
      const size = (d[2] > 1 ? 14 + Math.min(12, d[2] * 1.5) : 11) * (.8 + .2 * Math.sin(ts * 4 + id)) * (opts.board ? Math.max(1, .6 / zoom) : 1);
      ctx.globalAlpha = Math.min(1, (t - d[4]) / 400);
      ctx.drawImage(dustSprites[d[3]] || dustSprites[0], d[0] - size, d[1] - size, size * 2, size * 2);
      const di = dustImage(d[3], d[2] > 1);
      if (di) ctx.drawImage(di, d[0] - size * .62, d[1] - size * .62, size * 1.24, size * 1.24);
    }
    ctx.globalAlpha = 1;
    // Slangen: eerst de lijst met wat we tekenen (de eigen slang komt van de gsm zelf).
    const list = [];
    for (const id of s.heads.ids()) {
      if (opts.local && id === opts.local.n) continue;
      const v = s.heads.get(id, t);
      if (!v) continue;
      list.push({ n: id, x: v[0], y: v[1], a: v[2], L: s.lenOf(id, v[3], dt), f: v[4] });
    }
    if (opts.local && opts.local.alive && opts.local.n >= 0) {
      const v = s.heads.get(opts.local.n, t);
      list.push({ n: opts.local.n, x: opts.local.x, y: opts.local.y, a: opts.local.a, L: s.lenOf(opts.local.n, opts.local.L, dt), f: ((v ? v[4] : 0) & ~2 & ~8) | (opts.local.flags || 0), me: true });
    }
    list.sort((a, b) => a.L - b.L);
    for (const o of list) {
      let path = s.paths.get(o.n);
      if (!path) { s.fresh(o.n, o.x, o.y, o.a, o.L); path = s.paths.get(o.n); }
      RsWorld.grow(path, o.x, o.y, bodyLen(o.L));
      const wd = Math.max(width(o.L), opts.board ? 7 / zoom : 0);
      // Buiten beeld? Dan alleen het pad bijwerken.
      let seen = inView(o.x, o.y, 200);
      for (let i = 0; !seen && i < path.length; i += 20) seen = inView(path[i], path[i + 1], wd);
      if (!seen) continue;
      const color = s.colorOf(o.n);
      const ghost = o.f & 6;
      const step = zoom < .35 ? 5 : zoom < .7 ? 3 : 2;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (ghost) ctx.globalAlpha = (o.f & 2) ? .38 : .45 + .25 * Math.sin(ts * 12);
      strokePath(ctx, path, step);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(color, (o.f & 8) ? .4 : .22);
      ctx.lineWidth = wd * ((o.f & 8) ? 2.3 : 1.7);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      // Donkere rand; de gekleurde schubben erover laten tussen elkaar die donkere kleur zien.
      ctx.strokeStyle = shade(color, -.55);
      ctx.lineWidth = wd;
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = wd * .74;
      ctx.lineCap = 'butt';
      ctx.setLineDash([wd * .42, wd * .2]);
      ctx.lineDashOffset = -ts * 30;
      ctx.stroke();
      // Glans op elke pantserplaat
      ctx.strokeStyle = shade(color, .5);
      ctx.lineWidth = wd * .3;
      ctx.lineDashOffset = -ts * 30 - wd * .06;
      ctx.setLineDash([wd * .26, wd * .36]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#ffffff', (o.f & 8) ? .8 : .45);
      ctx.lineWidth = wd * .16;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      // Puls als de slang net groeide of iemand afsneed
      const pt = s.pulse.get(o.n);
      const pk = pt ? Math.max(0, 1 - (t - pt) / 400) : 0;
      if (pk) glow(ctx, o.x, o.y, wd * 4 * pk + wd, '#ffffff', pk);
      // Kop
      const k = (wd * .92) / HEAD_R * (1 + pk * .15);
      ctx.translate(o.x, o.y);
      ctx.rotate(o.a);
      ctx.drawImage(headSprite(color), -HX * k, -HY * k, 200 * k, 128 * k);
      ctx.rotate(-o.a);
      ctx.translate(-o.x, -o.y);
      if (o.f & 16) {
        ctx.strokeStyle = rgba('#9ff3ff', .75);
        ctx.lineWidth = Math.max(2, wd * .12);
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (i * TAU) / 6 + ts;
          ctx.lineTo(o.x + Math.cos(a) * wd * 1.15, o.y + Math.sin(a) * wd * 1.15);
        }
        ctx.stroke();
      }
      ctx.restore();
      if (o.f & 8 && Math.random() < .5) {
        const n = path.length;
        s.parts.burst(path[n - 2], path[n - 1], { n: 1, color, speed: 60, life: .4, size: wd * .2 });
      }
      if (o.n === s.king) {
        const cw = Math.max(30, wd * 1.8), ch = cw * .75;
        ctx.drawImage(crown, o.x - cw / 2, o.y - wd * 1.1 - ch + Math.sin(ts * 3) * 3, cw, ch);
      }
      const info = roster && roster.get(o.n);
      const fs = Math.max(13, Math.min(30, wd * .7)) / Math.max(.45, Math.min(1.6, zoom)) * (opts.board ? 1.1 : 1);
      if (info) AK.label(ctx, info.name, o.x, o.y + wd + fs * 1.2, o.me ? '#ffe17a' : '#e8f1ff', fs);
      if (o.f & 2) AK.label(ctx, '❓', o.x, o.y - wd - 6, '#ffe17a', Math.max(18, fs));
    }
    // Opgezogen lichtbollen vliegen naar de kop
    for (const sk of s.suck) {
      const o = list.find(l => l.n === sk.n);
      if (!o) continue;
      const k = (t - sk.t) / 200;
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(dustSprites[sk.c] || dustSprites[0], sk.x + (o.x - sk.x) * k - 7, sk.y + (o.y - sk.y) * k - 7, 14, 14);
    }
    ctx.globalAlpha = 1;
    // Opgeruimd: paden van slangen die niet meer meedoen
    for (const o of list) s.seen.set(o.n, t);
    for (const id of s.paths.keys()) if (t - (s.seen.get(id) || 0) > 1500) { s.paths.delete(id); s.seen.delete(id); }
    s.parts.draw(ctx);
    ctx.restore();
    Glow.vignette(ctx, w, h, .5);
  }

  function minimap(ctx, s, x, y, size, me) {
    const t = performance.now();
    const k = size / 2 / s.R;
    const cx = x + size / 2, cy = y + size / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(8,4,20,.72)';
    ctx.strokeStyle = 'rgba(255,107,214,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, TAU);
    ctx.fill();
    ctx.stroke();
    for (const [id, path] of s.paths) {
      if (me && id === me.n) continue;
      ctx.strokeStyle = id === s.king ? '#ffc94a' : s.colorOf ? s.colorOf(id) : '#fff';
      ctx.lineWidth = id === s.king ? 3 : 2;
      ctx.beginPath();
      for (let i = 0; i < path.length; i += 12) ctx.lineTo(cx + path[i] * k, cy + path[i + 1] * k);
      ctx.stroke();
    }
    if (me) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffe17a';
      ctx.beginPath();
      ctx.arc(cx + me.x * k, cy + me.y * k, 4, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  return { Scene, render, minimap, headSprite };
})();
