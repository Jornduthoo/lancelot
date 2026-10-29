// Het Klaseiland op het bord: één groot zwevend eiland met de burcht van elke leerling, en in het midden de klasburcht
// die meegroeit met het klasdoel. De leerkracht zet hier Kasteeltijd aan, geeft Eer en kiest het klasdoel.
// Op het bord staan geen Eer of rangen: geen ranglijst in de klas. Alleen het Ridderboek (voor de leerkracht) toont ze.
// Gebruikt Burcht (bu-catalogus.js), BuArt (bu-art.js), Avatar (avatar.js), sfx en confetti (fx.js).
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);

$('ke-home').addEventListener('click', () => { location.href = '/host'; });
$('ke-terug').addEventListener('click', () => { location.href = '/host'; });

const P = 12; // een perceel: 10 x 10 grond met een pad errond
const M = 3; // wilde rand rond het eiland
const KLASKLEUR = '#ffc94a';

const ke = { eiland: null, wereld: null, boek: [], gekozen: new Set(), tour: null };

// ---------- De wereld opbouwen ----------

// De klasburcht in het midden: per trap van het klasdoel komt er iets bij.
const KLASBURCHT = [];
(() => {
  const zet = (x, y, id, trap) => KLASBURCHT.push({ x, y, id, trap });
  zet(4, 4, 'kampvuur', 0);
  const ring = new Set();
  for (let i = 1; i <= 8; i++) for (const [x, y] of [[i, 1], [i, 8], [1, i], [8, i]]) ring.add(`${x},${y}`);
  for (const k of ring) zet(...k.split(',').map(Number), 'muur', 1);
  for (const [x, y] of [[1, 1], [8, 1], [1, 8], [8, 8]]) zet(x, y, 'toren', 2);
  zet(4, 8, 'poort', 2);
  zet(8, 4, 'poort', 2);
  zet(4, 4, 'donjon', 3);
  zet(3, 6, 'banier', 3);
  zet(6, 3, 'banier', 3);
  for (const [x, y] of [[3, 9], [5, 9], [9, 3], [9, 5]]) zet(x, y, 'fakkel', 3);
  zet(1, 4, 'wachttoren', 4);
  zet(4, 1, 'wachttoren', 4);
  zet(6, 6, 'fontein', 4);
  zet(2, 3, 'kristal', 4);
  zet(5, 5, 'goudtoren', 5);
  zet(2, 6, 'draak', 5);
  for (const [x, y] of [[0, 0], [0, 9], [9, 0]]) zet(x, y, 'baken', 5);
  zet(9, 9, 'portaal', 5);
})();

function trapVan(doel) {
  if (!doel) return 2;
  if (doel.gehaald) return 5;
  return Math.min(4, Math.floor((doel.samen / Math.max(1, doel.doel)) * 5));
}

function bouwWereld(e) {
  const n = e.burchten.length;
  let C = 1;
  while (C * C < n + 1) C += 2; // altijd oneven: de klasburcht staat precies in het midden
  const midden = (C - 1) / 2;
  // De burchten rond het midden, de dichtste plekken eerst.
  const plekken = [];
  for (let sy = 0; sy < C; sy++) for (let sx = 0; sx < C; sx++) if (sx !== midden || sy !== midden) plekken.push([sx, sy]);
  plekken.sort((a, b) => Math.hypot(a[0] - midden, a[1] - midden) - Math.hypot(b[0] - midden, b[1] - midden) || a[1] - b[1] || a[0] - b[0]);
  const perPlek = new Map();
  e.burchten.forEach((b, i) => perPlek.set(plekken[i].join(','), b));

  const W = C * P + 2 * M;
  const trap = trapVan(e.klasdoel);
  const klas = new Map();
  for (const s of KLASBURCHT) if (s.trap <= trap) klas.set(`${s.x},${s.y}`, s.id);

  // Ridders, per burcht één vakje.
  const ridders = new Map();
  for (const b of e.burchten) {
    const av = Avatar.byName(b.leerling);
    b.ridder = HdArt.metRidder(av ? Avatar.sprite(av, { k: 4 }) : null, b.dier);
  }

  // De rand van het eiland: een beetje grillig, met afgeronde hoeken.
  const land = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= W) return false;
    const dx = Math.max(M - x, x - (W - 1 - M), 0);
    const dy = Math.max(M - y, y - (W - 1 - M), 0);
    const d = Math.hypot(dx, dy);
    return d <= M - 0.4 - BuArt.hash(x, y, 21) * 1.6;
  };

  const info = (x, y) => {
    const lx = x - M;
    const ly = y - M;
    if (lx < 0 || ly < 0 || lx >= C * P || ly >= C * P) return { soort: 'wild' };
    const sx = Math.floor(lx / P);
    const sy = Math.floor(ly / P);
    const px = (lx % P) - 1;
    const py = (ly % P) - 1;
    if (px < 0 || py < 0 || px > 9 || py > 9) return { soort: 'pad', hoek: px === -1 && py === -1 };
    if (sx === midden && sy === midden) return { soort: 'klas', px, py };
    const b = perPlek.get(`${sx},${sy}`);
    if (!b) return { soort: 'leeg', px, py };
    return { soort: Burcht.binnen(b.rang, px, py) ? 'eigen' : 'ruig', b, px, py };
  };

  const kaart = {
    w: W,
    h: W,
    land,
    vloer: (x, y) => {
      const i = info(x, y);
      if (i.soort === 'pad') return 'pad';
      if (i.soort === 'eigen') return i.b.grond[`${i.px},${i.py}`] || 'gras';
      if (i.soort === 'klas') return i.px >= 1 && i.py >= 1 && i.px <= 8 && i.py <= 8 ? 'plein' : 'gras';
      if (i.soort === 'leeg' && Math.hypot(i.px - 4.5, i.py - 4.5) < 2.2 + BuArt.hash(x, y, 8)) return 'water';
      return 'wild';
    },
    stuk: (x, y) => {
      const i = info(x, y);
      if (i.soort === 'eigen') {
        const id = i.b.stukken[`${i.px},${i.py}`];
        return id ? { id, kleur: Burcht.KLEUREN[i.b.kleur] || Burcht.KLEUREN[0] } : null;
      }
      if (i.soort === 'klas') {
        const id = klas.get(`${i.px},${i.py}`);
        return id ? { id, kleur: KLASKLEUR } : null;
      }
      // lantaarns op de kruispunten van de paden
      if (i.soort === 'pad') return i.hoek ? { id: 'fakkel', kleur: KLASKLEUR } : null;
      if (i.soort === 'leeg' && kaart.vloer(x, y) === 'water') return null;
      const h = BuArt.hash(x, y, 3);
      const kans = i.soort === 'leeg' ? 0.42 : i.soort === 'ruig' ? 0.3 : 0.26;
      return h < kans ? { id: h < kans / 2 ? 'den' : 'boom', kleur: KLASKLEUR } : null;
    },
    ridder: (x, y) => {
      const r = ridders.get(`${x},${y}`);
      return r || null;
    },
  };

  // Een plekje voor elke ridder, en een naambordje vooraan op zijn grond.
  const bordjes = [];
  for (const [sleutel, b] of perPlek) {
    const [sx, sy] = sleutel.split(',').map(Number);
    const n2 = Burcht.RANGEN[b.rang].grond;
    const o = Math.floor((Burcht.MAX_GROND - n2) / 2);
    const tx = M + sx * P + 1;
    const ty = M + sy * P + 1;
    if (b.ridder) {
      const m = o + Math.ceil(n2 / 2);
      for (const [px, py] of [[m, m], [m - 1, m], [m, m - 1], [o + n2 - 1, o + n2 - 1]]) {
        if (!b.stukken[`${px},${py}`] && b.grond[`${px},${py}`] !== 'water') {
          ridders.set(`${tx + px},${ty + py}`, b.ridder);
          break;
        }
      }
    }
    bordjes.push({ b, x: tx + o + n2, y: ty + o + n2, sx, sy });
  }
  return { kaart, W, C, bordjes, perPlek, midden };
}

// ---------- Tekenen ----------

const cv = $('ke-canvas');
const ctx = cv.getContext('2d');
let dpr = 1;
let beeld = null; // { c, T, ox, oy, gloed, bordjes }

function maat() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(cv.clientWidth * dpr);
  const h = Math.round(cv.clientHeight * dpr);
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
}

function bak() {
  if (!ke.eiland) return;
  maat();
  const wereld = bouwWereld(ke.eiland);
  ke.wereld = wereld;
  // Gebakken op ongeveer 3000 pixels breed: scherp op het bord, nog licht genoeg voor de pc.
  const T = Math.max(16, Math.min(56, Math.floor(3000 / wereld.W)));
  const breed = wereld.W * T;
  const hoog = Math.round(wereld.W * T * 0.5 + T * (2.2 + 0.12 * wereld.W + 1.5));
  const c = document.createElement('canvas');
  c.width = breed + T;
  c.height = hoog;
  const ox = c.width / 2;
  const oy = Math.round(T * 2);
  const { motoren } = BuArt.teken(c.getContext('2d'), wereld.kaart, T, ox, oy, { diep: 1 });
  const gloed = [...BuArt.gloeiers(wereld.kaart, T, ox, oy, { glinster: false }), ...motoren];
  const bordjes = wereld.bordjes.map(p => ({ ...p, px: ox + (p.x - p.y) * T / 2, py: oy + (p.x + p.y) * T / 4 }));
  beeld = { c, T, ox, oy, gloed, bordjes };
  ke.eilandjes = bakEilandjes();
}

// De zwevende eilandjes van wie Legende is: kleine eilandjes in de lucht rond het Klaseiland,
// aan de kant van hun burcht. Op vaste plekken in de hoeken van het scherm.
const PLANEET = { x: 0.5, y: 0.1, r: 0.04 }; // boven de top van het eiland, tussen de eilandjes
const PLEKKEN = {
  links: [[0.1, 0.34], [0.09, 0.76], [0.25, 0.21], [0.37, 0.15], [0.22, 0.92]],
  rechts: [[0.9, 0.34], [0.91, 0.7], [0.75, 0.21], [0.63, 0.15], [0.75, 0.92]],
};
function bakEilandjes() {
  const lijst = beeld.bordjes.filter(p => p.b.eiland).sort((a, b) => a.px - b.px);
  if (!lijst.length) return [];
  const Tm = Math.round(26 * dpr);
  const uit = lijst.map(p => {
    const k = BuArt.eilandjeKaart(p.b);
    const c = document.createElement('canvas');
    c.width = Math.round(k.w * Tm + Tm);
    c.height = Math.round(k.w * Tm * 0.5 + Tm * 4.6);
    BuArt.teken(c.getContext('2d'), k, Tm, c.width / 2, Tm * 2, { diep: 0.8 });
    // alleen wat er echt op staat
    const r = BuArt.inhoud(c);
    const kort = document.createElement('canvas');
    kort.width = r.w;
    kort.height = r.h;
    kort.getContext('2d').drawImage(c, -r.x, -r.y);
    // de lichtbrug loopt naar het midden van de burcht
    const n2 = Burcht.RANGEN[p.b.rang].grond;
    const mx = p.x - n2 / 2;
    const my = p.y - n2 / 2;
    const doel = [beeld.ox + ((mx - my) * beeld.T) / 2, beeld.oy + ((mx + my) * beeld.T) / 4];
    return { c: kort, b: p.b, doel, fase: BuArt.hash(p.x, p.y, 7) * 6.28 };
  });
  // Elk eilandje op de vrije plek die het dichtst bij zijn burcht ligt (zo blijven de lichtbruggen kort).
  const o = overzicht();
  const scherm = e => [(cv.width / 2 + (e.doel[0] - o.x) * o.s) / cv.width, (cv.height / 2 + (e.doel[1] - o.y) * o.s) / cv.height];
  const vrij = [...PLEKKEN.links, ...PLEKKEN.rechts];
  const paren = [];
  for (const e of uit) {
    const [x, y] = scherm(e);
    for (const p of vrij) paren.push({ e, p, d: Math.hypot((p[0] - x) * cv.width / cv.height, p[1] - y) });
  }
  paren.sort((a, b) => a.d - b.d);
  const bezet = new Set();
  for (const { e, p } of paren) {
    if (e.plek || bezet.has(p)) continue;
    e.plek = p;
    bezet.add(p);
  }
  return uit;
}

// Elk eilandje met zijn naambordje één keer op schermgrootte gebakken, zodat elk beeldje maar één drawImage kost.
function eilandjeSprite(e, h) {
  if (e.sprite && e.sprite.h === h) return e.sprite;
  const w = Math.round((h * e.c.width) / e.c.height);
  const fs = Math.max(11, Math.round(h * 0.085));
  const g0 = document.createElement('canvas').getContext('2d');
  g0.font = `800 ${fs}px "Exo 2", "Segoe UI", sans-serif`;
  const tekst = `🏝️ ${e.b.leerling}`;
  const bw = Math.ceil(g0.measureText(tekst).width + fs * 1.1);
  const bh = Math.ceil(fs * 1.55);
  const c = document.createElement('canvas');
  c.width = Math.max(w, bw + 4);
  c.height = h + bh + Math.ceil(bh * 0.2) + 4;
  const g = c.getContext('2d');
  g.drawImage(e.c, Math.round((c.width - w) / 2), 0, w, h);
  const x = c.width / 2;
  const by = h + bh * 0.2 + bh / 2;
  g.font = g0.font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(6,10,19,.78)';
  g.strokeStyle = Burcht.KLEUREN[e.b.kleur] || '#ffc94a';
  g.lineWidth = Math.max(1.5, fs / 9);
  g.beginPath();
  if (g.roundRect) g.roundRect(x - bw / 2, by - bh / 2, bw, bh, bh / 2);
  else g.rect(x - bw / 2, by - bh / 2, bw, bh);
  g.fill();
  g.stroke();
  g.fillStyle = '#eaf4ff';
  g.fillText(tekst, x, by + fs * 0.04);
  e.sprite = { c, h };
  return e.sprite;
}

// Tijdens de tour: het eilandje van de leerling in een eigen kader met lucht, zodat het niet tussen de andere burchten hangt.
function tourKaart(e, H) {
  if (e.tourKaart && e.tourKaart.height === H) return e.tourKaart;
  const W = Math.round(H * 1.05);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const r = Math.round(H * 0.06);
  g.save();
  g.beginPath();
  if (g.roundRect) g.roundRect(1, 1, W - 2, H - 2, r);
  else g.rect(1, 1, W - 2, H - 2);
  g.clip();
  g.drawImage(BuArt.hemel(W, H, PLANEET), 0, 0);
  const ih = Math.round(H * 0.72);
  const iw = Math.round((ih * e.c.width) / e.c.height);
  const s = Math.min(1, (W * 0.9) / iw);
  g.drawImage(e.c, Math.round((W - iw * s) / 2), Math.round(H * 0.2), Math.round(iw * s), Math.round(ih * s));
  g.restore();
  g.strokeStyle = '#ffc94a';
  g.lineWidth = Math.max(2, H / 150);
  g.beginPath();
  if (g.roundRect) g.roundRect(1, 1, W - 2, H - 2, r);
  else g.rect(1, 1, W - 2, H - 2);
  g.stroke();
  const fs = Math.round(H * 0.065);
  g.font = `800 ${fs}px "Exo 2", "Segoe UI", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffe7a3';
  g.fillText(`🏝️ Het eilandje van ${e.b.leerling}`, W / 2, H * 0.1);
  e.tourKaart = c;
  return c;
}

function tekenEilandjes(g, t, zweef) {
  const lijst = ke.eilandjes || [];
  if (!lijst.length) return;
  const h = Math.round(cv.height * (lijst.length > 6 ? 0.15 : 0.19));
  // eerst de lichtbruggen, dan de eilandjes erover
  g.save();
  g.lineCap = 'round';
  for (const e of lijst) {
    if (!e.plek) continue;
    const x0 = e.plek[0] * cv.width;
    const y0 = e.plek[1] * cv.height + h * 0.12;
    const x1 = cv.width / 2 + (e.doel[0] - cam.x) * cam.s;
    const y1 = cv.height / 2 + zweef + (e.doel[1] - cam.y) * cam.s;
    const cx = (x0 + x1) / 2;
    const cy = Math.min(y0, y1) - cv.height * 0.06;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(cx, cy, x1, y1);
    g.setLineDash([]);
    g.strokeStyle = 'rgba(76,201,255,.22)';
    g.lineWidth = 9 * dpr;
    g.stroke();
    g.strokeStyle = 'rgba(190,240,255,.75)';
    g.lineWidth = 2 * dpr;
    g.stroke();
    // lichtpulsen die over de brug naar de burcht lopen
    g.setLineDash([4 * dpr, 22 * dpr]);
    g.lineDashOffset = -t * 60 * dpr;
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.lineWidth = 3.5 * dpr;
    g.stroke();
  }
  g.restore();
  for (const e of lijst) {
    if (!e.plek) continue;
    const sp = eilandjeSprite(e, h).c;
    const x = e.plek[0] * cv.width;
    const y = e.plek[1] * cv.height + Math.sin(t * 0.7 + e.fase) * 5 * dpr;
    g.drawImage(sp, Math.round(x - sp.width / 2), Math.round(y - h / 2));
  }
}

// De camera: het hele eiland in beeld, met een langzame zweefbeweging. Bij de tour zoomt hij in op één burcht.
const cam = { x: 0, y: 0, s: 1, doel: null, meteen: true };

function overzicht() {
  if (!beeld) return null;
  // Het land vult het scherm; de rotspunt eronder mag van het scherm vallen.
  const W = ke.wereld.W;
  const T = beeld.T;
  const s = Math.min((cv.width * 0.97) / (W * T), (cv.height * 0.8) / (W * T * 0.5 + T * 1.5));
  const midden = beeld.oy + ((W - 1) * T) / 4;
  return { x: beeld.c.width / 2, y: midden - (cv.height * 0.03) / s, s };
}

let vorige = 0;
const wolken = [0, 1, 2, 3, 4].map(i => ({ seed: i, x: Math.random(), y: 0.15 + Math.random() * 0.7, v: 0.004 + Math.random() * 0.006, s: 0.8 + Math.random() * 0.9 }));

// Naambordjes, scherp bovenop het eiland.
function bordjes(g, naar) {
  const fs = Math.max(11, Math.min(22, beeld.T * cam.s * 0.42));
  g.font = `800 ${fs}px "Exo 2", "Segoe UI", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const p of beeld.bordjes) {
    const [x, y] = naar(p.px, p.py);
    if (x < -100 || x > cv.width + 100 || y < -50 || y > cv.height + 50) continue;
    const tekst = p.b.leerling;
    const w = g.measureText(tekst).width + fs * 1.1;
    const h = fs * 1.55;
    g.fillStyle = 'rgba(6,10,19,.78)';
    g.strokeStyle = Burcht.KLEUREN[p.b.kleur] || '#ffc94a';
    g.lineWidth = Math.max(1.5, fs / 9);
    g.beginPath();
    if (g.roundRect) g.roundRect(x - w / 2, y - h / 2 + fs * 0.9, w, h, h / 2);
    else g.rect(x - w / 2, y - h / 2 + fs * 0.9, w, h);
    g.fill();
    g.stroke();
    g.fillStyle = '#eaf4ff';
    g.fillText(tekst, x, y + fs * 0.92);
  }
}

// Staat de camera stil, dan tekenen we het eiland met de bordjes één keer op schermgrootte en hergebruiken we dat:
// een groot plaatje elke keer verkleinen is te zwaar voor een trage pc.
let scene = null;
function maakScene() {
  const c = document.createElement('canvas');
  c.width = cv.width;
  c.height = cv.height;
  const g = c.getContext('2d');
  g.translate(cv.width / 2, cv.height / 2);
  g.scale(cam.s, cam.s);
  g.translate(-cam.x, -cam.y);
  g.drawImage(beeld.c, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const naar = (px, py) => [cv.width / 2 + (px - cam.x) * cam.s, cv.height / 2 + (py - cam.y) * cam.s];
  bordjes(g, naar);
  const gloed = [];
  for (const p of beeld.gloed) {
    const [x, y] = naar(p.x, p.y);
    if (x > -50 && y > -50 && x < cv.width + 50 && y < cv.height + 50) gloed.push({ ...p, x, y, r: p.r * cam.s });
  }
  return { c, gloed, beeld, w: cv.width, h: cv.height, x: cam.x, y: cam.y, s: cam.s };
}

function frame(now) {
  requestAnimationFrame(frame);
  if (!beeld || document.visibilityState !== 'visible') return;
  if (now - vorige < 30) return;
  const dt = Math.min(0.1, (now - (vorige || now)) / 1000);
  vorige = now;
  maat();
  const t = now / 1000;
  const doel = cam.doel || overzicht();
  if (cam.meteen) Object.assign(cam, doel, { meteen: false, doel: cam.doel });
  const stil = Math.abs(doel.x - cam.x) * cam.s < 0.6 && Math.abs(doel.y - cam.y) * cam.s < 0.6 && Math.abs(doel.s - cam.s) / cam.s < 0.002;
  if (stil) {
    cam.x = doel.x;
    cam.y = doel.y;
    cam.s = doel.s;
  } else {
    const k = 1 - Math.pow(0.12, dt);
    cam.x += (doel.x - cam.x) * k;
    cam.y += (doel.y - cam.y) * k;
    cam.s += (doel.s - cam.s) * k;
  }
  const zweef = Math.round(Math.sin(t * 0.6) * 4 * dpr);

  ctx.drawImage(BuArt.hemel(cv.width, cv.height, PLANEET), 0, 0);
  if (stil) {
    if (!scene || scene.beeld !== beeld || scene.w !== cv.width || scene.h !== cv.height || scene.x !== cam.x || scene.y !== cam.y || scene.s !== cam.s) scene = maakScene();
    ctx.drawImage(scene.c, 0, zweef);
    ctx.save();
    ctx.translate(0, zweef);
    BuArt.gloei(ctx, scene.gloed, t);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(cv.width / 2, cv.height / 2 + zweef);
    ctx.scale(cam.s, cam.s);
    ctx.translate(-cam.x, -cam.y);
    ctx.drawImage(beeld.c, 0, 0);
    ctx.restore();
    bordjes(ctx, (px, py) => [cv.width / 2 + (px - cam.x) * cam.s, cv.height / 2 + zweef + (py - cam.y) * cam.s]);
  }

  if (!cam.doel) tekenEilandjes(ctx, t, zweef);
  else if (ke.tour && ke.tour.eilandje) {
    // tijdens de tour zweeft het eilandje van deze leerling groot naast zijn burcht
    const kaart = tourKaart(ke.tour.eilandje, Math.round(cv.height * 0.4));
    ctx.globalAlpha = Math.min(1, (now - ke.tour.sinds) / 600);
    ctx.drawImage(kaart, Math.round(cv.width * 0.97 - kaart.width), Math.round(cv.height * 0.5 - kaart.height / 2));
    ctx.globalAlpha = 1;
  }

  // Wolken die voorbij drijven (op maat gemaakt, zodat ze niet elke keer geschaald moeten worden).
  ctx.globalAlpha = 0.45;
  for (const w of wolken) {
    w.x += w.v * dt;
    if (w.x > 1.25) w.x = -0.25;
    const c = wolkOpMaat(w.seed, w.s * dpr * 1.4);
    ctx.drawImage(c, Math.round(w.x * cv.width - c.width / 2), Math.round(w.y * cv.height));
  }
  ctx.globalAlpha = 1;
}
const wolkCache = new Map();
function wolkOpMaat(seed, s) {
  const key = `${seed}|${s.toFixed(2)}`;
  let c = wolkCache.get(key);
  if (!c) {
    const src = BuArt.wolk(seed);
    c = document.createElement('canvas');
    c.width = Math.round(src.width * s);
    c.height = Math.round(src.height * s);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    wolkCache.set(key, c);
  }
  return c;
}
requestAnimationFrame(frame);

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    maat();
    cam.meteen = true;
  }, 150);
});

// ---------- De burchtentour ----------

function tourStart() {
  if (!beeld || !ke.wereld || !beeld.bordjes.length) return;
  if (ke.tour) return tourStop();
  ke.tour = { i: -1, timer: null };
  $('ke-tour-knop').textContent = '⏹ Stop de tour';
  tourVolgende();
}

function tourVolgende() {
  const lijst = beeld.bordjes;
  ke.tour.i++;
  if (ke.tour.i >= lijst.length) return tourStop();
  const p = lijst[ke.tour.i];
  // in op het midden van de burcht (het bordje staat op de voorste hoek), iets onder het midden van het scherm
  const n = Burcht.RANGEN[p.b.rang].grond;
  const s = Math.min((cv.height * 0.62) / (beeld.T * 9), (cv.width * 0.5) / (beeld.T * 12));
  cam.doel = { x: p.px, y: p.py - (n * beeld.T) / 4 - beeld.T * 0.6 - (cv.height * 0.06) / s, s };
  ke.tour.eilandje = (ke.eilandjes || []).find(e => e.b.id === p.b.id) || null;
  ke.tour.sinds = performance.now();
  $('ke-tour-wie').textContent = p.b.leerling;
  const dier = p.b.dier && p.b.dier.fase && p.b.dier.naam ? ` · met ${p.b.dier.naam}` : '';
  $('ke-tour-burcht').textContent = (p.b.naam || `De burcht van ${p.b.leerling}`) + dier;
  $('ke-tour').classList.remove('hidden');
  $('ke-tour').style.animation = 'none';
  void $('ke-tour').offsetWidth;
  $('ke-tour').style.animation = '';
  sfx.whoosh();
  ke.tour.timer = setTimeout(tourVolgende, 5000);
}

function tourStop() {
  if (ke.tour) clearTimeout(ke.tour.timer);
  ke.tour = null;
  cam.doel = null;
  $('ke-tour').classList.add('hidden');
  $('ke-tour-knop').textContent = '🔭 Burchtentour';
}
$('ke-tour-knop').addEventListener('click', tourStart);

// ---------- Het klasdoel en de rest van het scherm ----------

function toonEiland(e) {
  const oud = ke.eiland;
  ke.eiland = e;
  $('ke-leeg').classList.toggle('hidden', e.burchten.length > 0);
  $('ke-tijd').textContent = `🏗️ Kasteeltijd: ${e.kasteeltijd ? 'aan' : 'uit'}`;
  $('ke-tijd').classList.toggle('aan', e.kasteeltijd);
  $('ke-sub').textContent = e.kasteeltijd ? 'Kasteeltijd! Iedereen bouwt aan zijn burcht' : `${e.burchten.length} burchten · bouwen kan tijdens Kasteeltijd`;
  const d = e.klasdoel;
  $('ke-doel').classList.toggle('gehaald', !!(d && d.gehaald));
  if (!d) {
    $('ke-doel-kop').textContent = '🎯 Nog geen klasdoel';
    $('ke-doel-balk').style.width = '0%';
    $('ke-doel-tekst').textContent = 'Klik hier en kies samen een beloning. De burcht in het midden groeit mee.';
  } else {
    $('ke-doel-kop').textContent = d.gehaald ? `🎉 Gehaald: ${d.tekst || 'het klasdoel'}!` : `🎯 ${d.tekst || 'Klasdoel'}`;
    $('ke-doel-balk').style.width = `${Math.min(100, (d.samen / d.doel) * 100)}%`;
    $('ke-doel-tekst').textContent = d.gehaald ? `Samen ${d.samen} Eer verdiend. Proficiat, ridders!` : `Samen ${d.samen} van de ${d.doel} Eer`;
    if (oud && oud.klasdoel && !oud.klasdoel.gehaald && d.gehaald && d.start === oud.klasdoel.start) {
      confetti(6000);
      if (sfx.fanfare) sfx.fanfare();
    }
  }
  bak();
}

function laad() {
  socket.emit('bu-eiland', null, res => {
    if (!res || res.error) return;
    toonEiland(res.eiland);
  });
}

socket.on('connect', () => {
  socket.emit('avatars-get', null, map => {
    Avatar.setAll(map);
    laad();
  });
});
socket.on('avatars', map => {
  Avatar.setAll(map);
  bak();
});
socket.on('bu-eiland', toonEiland);
socket.on('addresses', list => {
  if (!list || !list.length) return;
  $('ke-qr').innerHTML = list[0].qr;
  $('ke-url').textContent = `${list[0].url}/burcht`;
});
// Eer uit de spellen telt mee voor het klasdoel: af en toe opnieuw vragen.
setInterval(() => {
  if (document.visibilityState === 'visible' && !ke.tour) laad();
}, 60000);

$('ke-tijd').addEventListener('click', () => {
  const aan = !(ke.eiland && ke.eiland.kasteeltijd);
  socket.emit('bu-kasteeltijd', aan, () => {
    if (aan) sfx.gong();
    laad();
  });
});

// ---------- Panelen ----------

function paneel(id) {
  for (const p of document.querySelectorAll('.ke-paneel')) p.classList.toggle('hidden', p.id !== id || !p.classList.contains('hidden'));
}
document.querySelectorAll('[data-sluit]').forEach(b => b.addEventListener('click', () => paneel(null)));

// Eer geven
function namen() {
  const box = $('ke-namen');
  box.innerHTML = '';
  for (const l of ke.boek) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = l.naam;
    b.classList.toggle('on', ke.gekozen.has(l.id));
    b.addEventListener('click', () => {
      if (ke.gekozen.has(l.id)) ke.gekozen.delete(l.id);
      else ke.gekozen.add(l.id);
      b.classList.toggle('on', ke.gekozen.has(l.id));
    });
    box.appendChild(b);
  }
}
function boekLaden(then) {
  socket.emit('bu-ridderboek', null, res => {
    if (!res || res.error) return;
    ke.boek = res.boek;
    then && then();
  });
}
$('ke-geef-knop').addEventListener('click', () => {
  paneel('ke-geef');
  boekLaden(namen);
});
$('ke-iedereen').addEventListener('click', () => {
  ke.gekozen = new Set(ke.boek.map(l => l.id));
  namen();
});
$('ke-niemand').addEventListener('click', () => {
  ke.gekozen.clear();
  namen();
});
document.querySelectorAll('[data-eer]').forEach(b => b.addEventListener('click', () => { $('ke-eer').value = b.dataset.eer; }));
$('ke-geef-ok').addEventListener('click', () => {
  const n = Number($('ke-eer').value);
  socket.emit('bu-geef', { leerlingen: [...ke.gekozen], n, reden: $('ke-reden').value }, res => {
    if (!res || res.error) return ($('ke-geef-info').textContent = (res && res.error) || 'Dat lukte niet.');
    ke.boek = res.boek;
    const wie = ke.boek.filter(l => ke.gekozen.has(l.id)).map(l => l.naam);
    $('ke-geef-info').textContent = `✓ ${n} Eer voor ${wie.join(', ')}.`;
    sfx.good();
    ke.gekozen.clear();
    $('ke-reden').value = '';
    namen();
  });
});

// Klasdoel
$('ke-doel-knop').addEventListener('click', openDoel);
$('ke-doel').addEventListener('click', openDoel);
function openDoel() {
  paneel('ke-doelpaneel');
  const d = ke.eiland && ke.eiland.klasdoel;
  const n = (ke.eiland && ke.eiland.burchten.length) || 20;
  $('ke-doel-wat').value = d ? d.tekst : '';
  $('ke-doel-n').value = d ? d.doel : Math.round((n * 150) / 50) * 50;
  $('ke-doel-tip').textContent = `Een spel van 10 minuten levert een leerling ongeveer 20 tot 40 Eer op. Met ${n} leerlingen is ${Math.round((n * 150) / 50) * 50} Eer ongeveer een week flink oefenen. Een nieuw klasdoel begint weer bij nul.`;
  $('ke-doel-fout').textContent = '';
}
$('ke-doel-ok').addEventListener('click', () => {
  socket.emit('bu-klasdoel', { tekst: $('ke-doel-wat').value, doel: Number($('ke-doel-n').value) }, res => {
    if (!res || res.error) return ($('ke-doel-fout').textContent = (res && res.error) || 'Dat lukte niet.');
    paneel(null);
    sfx.go();
  });
});

// Ridderboek
function boekTonen() {
  const tb = $('ke-boek-rijen');
  tb.innerHTML = '';
  for (const l of ke.boek) {
    const tr = document.createElement('tr');
    const naam = document.createElement('td');
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = l.naam;
    det.appendChild(sum);
    if (l.burchtnaam) {
      const p = document.createElement('div');
      p.className = 'muted small';
      p.textContent = `🏰 ${l.burchtnaam}`;
      det.appendChild(p);
    }
    if (l.diernaam) {
      const p = document.createElement('div');
      p.className = 'muted small';
      p.textContent = `🐾 ${l.diernaam}`;
      det.appendChild(p);
    }
    const ul = document.createElement('ul');
    for (const p of l.posten) {
      const li = document.createElement('li');
      li.textContent = `${p.n > 0 ? '+' : ''}${p.n} ${p.wat} (${new Date(p.t).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })})`;
      ul.appendChild(li);
    }
    if (!l.posten.length) {
      const li = document.createElement('li');
      li.textContent = 'Nog niets verdiend.';
      ul.appendChild(li);
    }
    det.appendChild(ul);
    const acties = document.createElement('div');
    acties.className = 'ke-rij';
    const terug = document.createElement('button');
    terug.className = 'secondary mini';
    terug.textContent = 'Laatste gift terugnemen';
    terug.addEventListener('click', () => socket.emit('bu-terug', l.id, res => {
      if (res && res.error) return Ui.melding(res.error);
      ke.boek = res.boek;
      boekTonen();
    }));
    acties.appendChild(terug);
    if (l.burchtnaam || l.diernaam) {
      const wis = document.createElement('button');
      wis.className = 'secondary mini';
      wis.textContent = 'Namen wissen';
      wis.title = 'Wist de naam van de burcht en van het huisdier';
      wis.addEventListener('click', () => socket.emit('bu-wisnaam', l.id, res => {
        if (res && !res.error) {
          ke.boek = res.boek;
          boekTonen();
        }
      }));
      acties.appendChild(wis);
    }
    det.appendChild(acties);
    naam.appendChild(det);
    const cel = (txt, cls) => {
      const td = document.createElement('td');
      if (cls) td.className = cls;
      td.textContent = txt;
      return td;
    };
    tr.append(naam, cel(Burcht.RANGEN[l.rang].naam), cel(l.eer, 'n'), cel(l.saldo, 'n'), cel(l.reeks || '', 'n'), cel(`${l.schilden.length}🛡️`));
    tb.appendChild(tr);
  }
  if (!ke.boek.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" class="muted">Nog geen klaslijst. <a class="button secondary" href="/klas">Klaslijst invullen</a></td>';
    tb.appendChild(tr);
  }
}
$('ke-boek-knop').addEventListener('click', () => {
  paneel('ke-boek');
  boekLaden(boekTonen);
});
