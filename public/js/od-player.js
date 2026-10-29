// De ontdekwereld op de gsm of Chromebook: rondlopen op zwevende eilanden, raadsels openen, kristallen verzamelen.
// De wereld tekent OdWereld (met de stukken van Mijn burcht), de raadsels OdRaadsels. De server houdt de stand bij.
// klas-kies.js gebruikt store, socket en $ van hier.

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

// Vanuit de beheerpagina kijkt de leerkracht zelf rond: geen naam kiezen, alles open, niets op het bord.
const OD_LK = new URLSearchParams(location.search).get('leerkracht') === '1';
const socket = io(OD_LK ? { autoConnect: false, query: { role: 'host', leerkracht: '1' } } : { autoConnect: false });
document.addEventListener('DOMContentLoaded', () => socket.connect());
const $ = id => document.getElementById(id);

const OD_STAP = 190; // ms per vakje
const OD_RICHTING = [[0, -1], [1, 0], [0, 1], [-1, 0]];

const od = {
  naam: OD_LK ? 'Leerkracht' : store('lancelot-name') || '',
  stand: null,
  kaartId: 'woud',
  kaart: null,
  grond: null,
  stukken: [],
  gloed: [],
  plekken: [],
  ik: { x: 0, y: 0, vx: 0, vy: 0, van: null, t0: 0, dir: 2, pad: [], doel: null },
  // De wereld wordt gebakken op de grootte waarop hij getoond wordt (tegelbreedte T): nooit schalen bij het tekenen.
  T: 64,
  cam: { x: 0, y: 0 },
  toetsen: new Set(),
  venster: false,
  gebaktMet: '',
  deuren: [],
};

// ---------- Schermen ----------

function odToon(scherm) {
  $('od-join').classList.toggle('hidden', scherm !== 'join');
  $('od-slot').classList.toggle('hidden', scherm !== 'slot');
  $('od-game').classList.toggle('hidden', scherm !== 'spel');
  $('od-switch').classList.toggle('hidden', scherm !== 'spel' || OD_LK);
  if (scherm === 'spel') odMaat();
}

function odLaad(naam = od.naam) {
  if (!naam) return odToon('join');
  socket.emit('od-get', naam, res => {
    if (!res || res.error) {
      $('od-join-error').textContent = (res && res.error) || '';
      return odToon('join');
    }
    od.naam = res.naam;
    if (!res.leerkracht) store('lancelot-name', res.naam);
    for (const el of document.querySelectorAll('.od-wereldnaam')) el.textContent = res.wereld;
    document.title = `LANcelot · ${res.wereld}`;
    odStand(res);
    if (!res.toegang.mag) {
      $('od-slot-tekst').textContent = res.toegang.tekst;
      $('od-slot-taken').classList.toggle('hidden', res.toegang.reden !== 'taken');
      return odToon('slot');
    }
    const eerst = !od.kaart;
    odToon('spel');
    if (eerst) {
      // Terug waar je was, als dat gebied open is.
      const k = store('od-kaart');
      const open = k === 'labo' || (k === 'draken' && res.gebouwd.includes('luchtschip')) || (k === 'sterren' && res.gebouwd.includes('sterrenpoort'));
      odKaart(open ? k : 'woud', open || k === 'woud' ? odBewaardePlek() : null);
    }
    else odBak();
  });
}

function odStand(s) {
  od.stand = s;
  $('od-kristallen').textContent = s.kristallen;
  $('od-boek-aantal').textContent = s.woorden + s.weetjes;
  $('od-boek-aantal').classList.toggle('leeg', !(s.woorden + s.weetjes));
  if (od.kaart && od.gebaktMet !== odSleutel()) odBak();
}

const odSleutel = () => `${od.kaartId}|${(od.stand && od.stand.gebouwd || []).join(',')}|${(od.stand && od.stand.runen || []).length}`;

$('od-join').addEventListener('submit', e => {
  e.preventDefault();
  const naam = $('od-name').value.trim();
  if (!naam) return;
  od.naam = naam;
  odLaad(naam);
});
$('od-name').value = OD_LK ? '' : od.naam;
if (OD_LK) {
  // Terug gaat naar de beheerpagina, en bovenaan staat dat je als leerkracht rondkijkt.
  for (const a of document.querySelectorAll('a[href="/"]')) a.href = '/ontdek-beheer';
  document.body.classList.add('od-lk');
}
$('od-switch').addEventListener('click', () => klasSwitch());
$('od-switch-slot').addEventListener('click', () => klasSwitch());

// ---------- De kaart ----------

function odBewaardePlek() {
  try {
    const p = JSON.parse(store(`od-plek-${od.naam.toLowerCase()}`) || 'null');
    return p && Number.isInteger(p.x) && Number.isInteger(p.y) ? p : null;
  } catch {
    return null;
  }
}

let odBewaarTimer = null;
function odBewaarPlek() {
  clearTimeout(odBewaarTimer);
  odBewaarTimer = setTimeout(() => {
    store(`od-plek-${od.naam.toLowerCase()}`, JSON.stringify({ x: od.ik.x, y: od.ik.y }));
    store('od-kaart', od.kaartId);
  }, 400);
}

function odKaart(id, plek) {
  od.kaartId = id;
  od.kaart = OdWereld.kaart(id);
  od.plekken = OdWereld.plekken(od.kaart);
  od.stukken = OdWereld.stukken(od.kaart);
  od.deuren = ['D', 'q', 'Q'].map(c => OdWereld.vind(od.kaart, c) && { ...OdWereld.vind(od.kaart, c), c }).filter(Boolean);
  odBak();
  let p = plek;
  const gebouwd = od.stand.gebouwd;
  if (!p || !OdWereld.loopbaar(od.kaart, p.x, p.y, gebouwd)) p = id === 'labo' ? odNaast(OdWereld.vind(od.kaart, 'q'), true) : OdWereld.vind(od.kaart, 'S');
  Object.assign(od.ik, { x: p.x, y: p.y, vx: p.x, vy: p.y, van: null, pad: [], doel: null });
  const [sx, sy] = odScherm(p.x, p.y);
  od.cam.x = sx;
  od.cam.y = sy - od.T * 0.3;
  $('od-gebied').textContent = odGebied();
  odBewaarPlek();
}

// Het vakje boven de uitgang van het labo (daar kom je binnen).
function odNaast(p, binnen) {
  if (!p) return { x: 1, y: 1 };
  return binnen ? { x: p.x, y: p.y - 1 } : p;
}

function odBak() {
  od.gebaktMet = odSleutel();
  od.grond = OdWereld.bak(od.kaart, od.T, od.stand.gebouwd, od.stand.runen || []);
  od.gloed = OdWereld.gloeiers(od.kaart, od.T, od.grond.ox, od.grond.oy);
}

// Van vakje naar een punt op de gebakken kaart.
function odScherm(x, y) {
  const g = od.grond || OdWereld.maat(od.kaart, od.T);
  return [g.ox + (x - y) * od.T / 2, g.oy + (x + y) * od.T / 4];
}

function odGebied() {
  if (od.kaartId === 'labo') return 'Het Labo';
  const naam = od.kaartId === 'woud' ? (od.kaart.ruine(od.ik.x) ? 'De Neonruïnes' : 'Het Kristalwoud') : od.kaart.naam;
  return (OD_LK ? 'Leerkracht · ' : '') + naam;
}

// ---------- Tekenen ----------

const odCanvas = $('od-canvas');
const odG = odCanvas.getContext('2d');

function odMaat() {
  const r = odCanvas.getBoundingClientRect();
  if (!r.width) return;
  // Niet scherper dan nodig: dat houdt het vlot op een Chromebook.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  odCanvas.width = Math.round(r.width * dpr);
  odCanvas.height = Math.round(r.height * dpr);
  od.dpr = dpr;
  // Inzoomen op een gsm, wat verder weg op een groot scherm.
  const zoom = Math.max(0.75, Math.min(1.25, Math.max(r.width / 1000, r.height / 900))) * dpr;
  const T = Math.round((64 * zoom) / 4) * 4;
  // De sterrenhemel staat op een eigen canvas erachter: die moet maar één keer getekend worden.
  const hemel = $('od-hemel');
  hemel.width = odCanvas.width;
  hemel.height = odCanvas.height;
  hemel.getContext('2d').drawImage(BuArt.hemel(odCanvas.width, odCanvas.height), 0, 0);
  if (T === od.T) return;
  od.T = T;
  if (od.kaart) {
    odBak();
    const [sx, sy] = odScherm(od.ik.vx, od.ik.vy);
    od.cam.x = sx;
    od.cam.y = sy - od.T * 0.3;
  }
}
window.addEventListener('resize', odMaat);

function odSpriteRidder() {
  const av = Avatar.byName(od.naam) || Avatar.mine() || odStandaardRidder;
  const achter = od.ik.dir === 0 || od.ik.dir === 3;
  return Avatar.sprite(av, { k: 8, back: achter });
}
const odStandaardRidder = Avatar.random();

function odTeken(t) {
  const g = odG;
  const W = odCanvas.width;
  const H = odCanvas.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  if (!od.grond) return;
  // Zachtjes op en neer zweven, zoals de eilanden van Mijn burcht.
  const zweef = Math.round(Math.sin(t / 1400) * 3);
  const ox = Math.round(W / 2 - od.cam.x);
  const oy = Math.round(H / 2 - od.cam.y) + zweef;
  g.setTransform(1, 0, 0, 1, ox, oy);
  // Alleen het stuk van de vloer dat op het scherm past.
  const c = od.grond.c;
  const kx = Math.max(0, -ox);
  const ky = Math.max(0, -oy);
  const kw = Math.min(c.width - kx, W - Math.max(0, ox));
  const kh = Math.min(c.height - ky, H - Math.max(0, oy));
  if (kw > 0 && kh > 0) g.drawImage(c, kx, ky, kw, kh, kx, ky, kw, kh);
  // Deuren gloeien, zodat je ziet waar je binnen (en weer buiten) kan.
  for (const d of od.deuren) {
    const [dx, dy] = odScherm(d.x, d.y);
    const a = 0.35 + 0.25 * Math.sin(t / 260);
    g.fillStyle = d.c === 'D' ? `rgba(76,201,255,${a})` : `rgba(46,230,166,${a})`;
    g.beginPath();
    g.moveTo(dx, dy - od.T / 4);
    g.lineTo(dx + od.T / 2, dy);
    g.lineTo(dx, dy + od.T / 4);
    g.lineTo(dx - od.T / 2, dy);
    g.closePath();
    g.fill();
    if (d.c !== 'D') {
      g.fillStyle = '#e8fff6';
      g.font = `bold ${od.T * 0.2}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(d.c === 'q' ? '⇩ Naar buiten' : '⇩ Terug naar het woud', dx, dy + od.T * 0.42);
    }
  }

  // Wat zichtbaar is, op de kaart (met wat marge voor hoge stukken).
  const x0 = -ox - od.T * 2;
  const x1 = W - ox + od.T * 2;
  const y0 = -oy - od.T;
  const y1 = H - oy + od.T * 3;
  const vandaag = od.stand.stations || {};
  const ik = od.ik;
  const ikSom = ik.vx + ik.vy;
  const tekenIk = () => {
    const [sx, sy] = odScherm(ik.vx, ik.vy);
    const r = odSpriteRidder();
    const h = od.T * 0.82;
    const w = (h * r.width) / r.height;
    const stap = ik.van ? Math.abs(Math.sin(t / 70)) * 3 : 0;
    g.fillStyle = 'rgba(10,14,24,.35)';
    g.beginPath();
    g.ellipse(sx, sy, w * 0.42, w * 0.18, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(r, sx - w / 2, sy - h + od.T * 0.05 - stap, w, h);
  };
  // De stukken zitten al in de gebakken vloer. Stukken die vóór de ridder staan en hem raken, nog eens over hem heen.
  tekenIk();
  const [ix, iy] = odScherm(ik.vx, ik.vy);
  for (const st of od.stukken) {
    if (st.x + st.y <= ikSom + 0.01) continue;
    const [sx0, sy0] = odScherm(st.x + (st.dx || 0), st.y + (st.dy || 0));
    const p = OdWereld.sprite(st, od.kaart, od.T);
    const lx = Math.round(sx0 - p.ax);
    const ly = Math.round(sy0 - p.ay);
    if (lx > ix + od.T * 0.4 || lx + p.c.width < ix - od.T * 0.4 || ly > iy || ly + p.c.height < iy - od.T) continue;
    g.drawImage(p.c, lx, ly);
  }
  for (const st of od.stukken) {
    if (!st.plek) continue;
    const bouw = st.plek === 'bord' ? 'brug' : OdWereld.REIS[st.plek] ? st.plek : null;
    if (bouw) {
      // Genoeg kristallen om hier te bouwen? Dan wijst een uitroepteken de weg.
      if (odKanBouwen(bouw)) {
        const [bx, by] = odScherm(st.x, st.y);
        odMarker(g, bx, by, t, false);
      }
      continue;
    }
    const [sx0, sy0] = odScherm(st.x, st.y);
    if (sx0 < x0 || sx0 > x1 || sy0 < y0 || sy0 > y1) continue;
    odMarker(g, sx0, sy0, t, vandaag[st.plek] && vandaag[st.plek].vandaag);
  }
  BuArt.gloei(g, od.gloed.filter(p => p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1), t / 1000, 1);
  // Een gloeiend doelvakje waar je naartoe loopt.
  if (ik.doel) {
    const [dx, dy] = odScherm(ik.doel.x, ik.doel.y);
    g.strokeStyle = `rgba(255,201,74,${0.5 + 0.4 * Math.sin(t / 120)})`;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(dx, dy - od.T / 4);
    g.lineTo(dx + od.T / 2, dy);
    g.lineTo(dx, dy + od.T / 4);
    g.lineTo(dx - od.T / 2, dy);
    g.closePath();
    g.stroke();
  }
}

// Boven een plek: een zwevend uitroepteken (nog te doen vandaag) of een groen kristal (vandaag gelukt).
function odMarker(g, x, y, t, klaar) {
  const h = y - od.T * 1.3 + Math.sin(t / 320 + x) * 4;
  if (klaar) {
    g.fillStyle = 'rgba(46,230,166,.25)';
    g.beginPath();
    g.arc(x, h, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2ee6a6';
    g.beginPath();
    g.moveTo(x, h - 9);
    g.lineTo(x + 6, h);
    g.lineTo(x, h + 9);
    g.lineTo(x - 6, h);
    g.closePath();
    g.fill();
    g.fillStyle = '#e8fff6';
    g.fillRect(x - 1, h - 6, 2, 5);
  } else {
    g.fillStyle = 'rgba(255,201,74,.25)';
    g.beginPath();
    g.arc(x, h, 14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffc94a';
    g.beginPath();
    g.roundRect ? g.roundRect(x - 3.5, h - 11, 7, 14, 3) : g.rect(x - 3.5, h - 11, 7, 14);
    g.fill();
    g.beginPath();
    g.arc(x, h + 8, 3.5, 0, Math.PI * 2);
    g.fill();
  }
}

// ---------- Lopen ----------

function odMag(x, y) {
  return OdWereld.loopbaar(od.kaart, x, y, od.stand.gebouwd);
}

// De kortste weg (breedte eerst) naar een vakje, of naar een vakje naast een plek.
function odWeg(doelen) {
  const key = (x, y) => `${x},${y}`;
  const doelSet = new Set(doelen.map(d => key(d.x, d.y)));
  const start = { x: od.ik.x, y: od.ik.y };
  if (doelSet.has(key(start.x, start.y))) return [];
  const van = new Map([[key(start.x, start.y), null]]);
  const rij = [start];
  while (rij.length) {
    const c = rij.shift();
    for (const [dx, dy] of OD_RICHTING) {
      const n = { x: c.x + dx, y: c.y + dy };
      const k = key(n.x, n.y);
      if (van.has(k) || !odMag(n.x, n.y)) continue;
      van.set(k, c);
      if (doelSet.has(k)) {
        const pad = [n];
        let p = c;
        while (p && !(p.x === start.x && p.y === start.y)) {
          pad.unshift(p);
          p = van.get(key(p.x, p.y));
        }
        return pad;
      }
      rij.push(n);
    }
  }
  return null;
}

function odBuren(p) {
  return OD_RICHTING.map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy })).filter(n => odMag(n.x, n.y));
}

function odLoopNaar(x, y) {
  const plek = od.plekken.find(p => p.x === x && p.y === y);
  const labo = od.stukken.find(s => s.labo);
  // Tik op het labo: naar de deur.
  if (labo && x >= labo.x - 1 && x <= labo.x && y >= labo.y - 1 && y <= labo.y) return odLoopNaar(...Object.values(OdWereld.vind(od.kaart, 'D')));
  if (plek) {
    const pad = odWeg(odBuren(plek));
    if (pad === null) return odToast(plek.id === 'bord' ? 'Daar kan je niet bij.' : 'Daar kan je nog niet bij. Bouw eerst de brug bij de banier!');
    od.ik.pad = pad;
    od.ik.doel = null;
    od.ik.plek = plek;
    if (!pad.length) odOpenPlek(plek);
    return;
  }
  if (OdWereld.teken(od.kaart, x, y) === 'b' && !od.stand.gebouwd.includes('brug')) return odBrugRand();
  if (!odMag(x, y)) return;
  const pad = odWeg([{ x, y }]);
  if (!pad) return odToast('Daar kan je niet komen.');
  od.ik.pad = pad;
  od.ik.doel = pad.length ? { x, y } : null;
  od.ik.plek = null;
}

function odStap(t) {
  const ik = od.ik;
  if (ik.van) {
    const f = Math.min(1, (t - ik.t0) / OD_STAP);
    ik.vx = ik.van.x + (ik.x - ik.van.x) * f;
    ik.vy = ik.van.y + (ik.y - ik.van.y) * f;
    if (f < 1) return;
    ik.van = null;
    ik.vx = ik.x;
    ik.vy = ik.y;
    odAangekomen();
  }
  if (od.venster) return;
  let volgende = null;
  const d = odToetsRichting();
  if (d >= 0) {
    ik.pad = [];
    ik.doel = null;
    ik.plek = null;
    ik.dir = d;
    const n = { x: ik.x + OD_RICHTING[d][0], y: ik.y + OD_RICHTING[d][1] };
    if (odMag(n.x, n.y)) volgende = n;
    else if (OdWereld.teken(od.kaart, n.x, n.y) === 'b') odBrugRand();
  } else if (ik.pad.length) {
    volgende = ik.pad.shift();
    if (!odMag(volgende.x, volgende.y)) {
      ik.pad = [];
      volgende = null;
    }
  }
  if (volgende) {
    ik.dir = OD_RICHTING.findIndex(([dx, dy]) => dx === volgende.x - ik.x && dy === volgende.y - ik.y);
    ik.van = { x: ik.x, y: ik.y };
    ik.x = volgende.x;
    ik.y = volgende.y;
    ik.t0 = t;
  }
}

function odAangekomen() {
  const ik = od.ik;
  odBewaarPlek();
  $('od-gebied').textContent = odGebied();
  const c = OdWereld.teken(od.kaart, ik.x, ik.y);
  if (c === 'D') return odDeur('labo');
  if (c === 'q') return odDeur('woud');
  if (c === 'Q') return odReis(od.kaart.terug.kaart, od.kaart.terug.bij);
  if (c === 'J') odRaapRune(ik.x, ik.y);
  if (!ik.pad.length) {
    ik.doel = null;
    if (ik.plek) {
      const p = ik.plek;
      ik.plek = null;
      if (Math.abs(p.x - ik.x) + Math.abs(p.y - ik.y) === 1) odOpenPlek(p);
    }
  }
}

// Door een deur: even zwart, en dan binnen (of buiten).
function odDeur(naar) {
  od.toetsen.clear();
  const sluier = document.createElement('div');
  sluier.className = 'od-sluier';
  $('od-game').appendChild(sluier);
  sfx.tick();
  setTimeout(() => {
    if (naar === 'labo') odKaart('labo', null);
    else {
      const d = OdWereld.vind(OdWereld.kaart('woud'), 'D');
      odKaart('woud', { x: d.x, y: d.y + 1 });
    }
    sluier.classList.add('weg');
    setTimeout(() => sluier.remove(), 400);
    if (naar === 'labo') odToastEens('labo', 'Welkom in het Labo! Drie proeven wachten op je.');
  }, 260);
}

// ---------- Toetsen en tikken ----------

const OD_TOETS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
function odToetsRichting() {
  const lijst = [...od.toetsen];
  return lijst.length ? OD_TOETS[lijst[lijst.length - 1]] : -1;
}

window.addEventListener('keydown', e => {
  if ($('od-game').classList.contains('hidden') || od.venster || e.target.closest('input, textarea')) return;
  if (e.code in OD_TOETS) {
    e.preventDefault();
    od.toetsen.delete(e.code);
    od.toetsen.add(e.code);
    $('od-hint').classList.add('weg');
  } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'e') {
    // Open de plek waar je naar kijkt (of eender welke ernaast).
    const ik = od.ik;
    const voor = { x: ik.x + OD_RICHTING[ik.dir][0], y: ik.y + OD_RICHTING[ik.dir][1] };
    const p = od.plekken.find(q => q.x === voor.x && q.y === voor.y) || od.plekken.find(q => Math.abs(q.x - ik.x) + Math.abs(q.y - ik.y) === 1);
    if (p) {
      e.preventDefault();
      odOpenPlek(p);
    }
  }
});
window.addEventListener('keyup', e => od.toetsen.delete(e.code));
window.addEventListener('blur', () => od.toetsen.clear());

odCanvas.addEventListener('pointerdown', e => {
  if (od.venster || !od.grond) return;
  const r = odCanvas.getBoundingClientRect();
  const px = (e.clientX - r.left) * od.dpr;
  const py = (e.clientY - r.top) * od.dpr;
  const zweef = Math.round(Math.sin(performance.now() / 1400) * 3);
  const kx = px - Math.round(odCanvas.width / 2 - od.cam.x);
  const ky = py - Math.round(odCanvas.height / 2 - od.cam.y) - zweef;
  // Eerst kijken of je op een plek tikte (die steken boven hun vakje uit).
  let doel = null;
  for (const p of od.plekken) {
    const [sx, sy] = odScherm(p.x, p.y);
    if (Math.abs(kx - sx) < od.T * 0.4 && ky < sy + od.T * 0.2 && ky > sy - od.T * 1.3) doel = p;
  }
  const [tx, ty] = doel ? [doel.x, doel.y] : BuArt.vakjeOp(kx, ky, od.T, od.grond.ox, od.grond.oy);
  $('od-hint').classList.add('weg');
  odLoopNaar(tx, ty);
});

// Pijltjes op het scherm (alleen op een aanraakscherm zichtbaar).
for (const b of document.querySelectorAll('#od-pad button')) {
  const code = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][Number(b.dataset.d)];
  const uit = () => od.toetsen.delete(code);
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    od.toetsen.add(code);
    $('od-hint').classList.add('weg');
  });
  b.addEventListener('pointerup', uit);
  b.addEventListener('pointerleave', uit);
  b.addEventListener('pointercancel', uit);
}

// ---------- De lus ----------

let odVorige = 0;
function odLus(t) {
  requestAnimationFrame(odLus);
  if ($('od-game').classList.contains('hidden') || document.hidden || !od.kaart) return;
  // Tijdens een raadsel staat de wereld stil: dan moet er niets getekend worden.
  if (od.venster && t - odVorige < 500) return;
  odVorige = t;
  odStap(t);
  // De camera volgt de ridder zacht.
  const [sx, sy] = odScherm(od.ik.vx, od.ik.vy);
  od.cam.x += (sx - od.cam.x) * 0.12;
  od.cam.y += (sy - od.T * 0.3 - od.cam.y) * 0.12;
  odTeken(t);
}
requestAnimationFrame(odLus);

// ---------- Meldingen ----------

let odToastTimer = null;
function odToast(tekst, ms = 2600) {
  const el = $('od-toast');
  el.textContent = tekst;
  el.classList.remove('hidden');
  clearTimeout(odToastTimer);
  odToastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}
const odGezegd = new Set();
function odToastEens(id, tekst) {
  if (odGezegd.has(id)) return;
  odGezegd.add(id);
  odToast(tekst, 3400);
}

// ---------- Plekken openen ----------

function odOpenPlek(p) {
  od.toetsen.clear();
  if (p.bouw) {
    // Al gebouwd? Dan reis je ermee. Anders: bouwen.
    if (od.stand.gebouwd.includes(p.bouw)) {
      if (p.reis) return odReis(p.reis);
      return odToast('De brug staat er al. Op naar de Neonruïnes!');
    }
    return odBouw(p.bouw);
  }
  OdRaadsels.open(p.id);
}

function odKanBouwen(wat = 'brug') {
  const s = od.stand;
  const b = s && s.bouw[wat];
  return !!b && !s.gebouwd.includes(wat) && (!b.nodig || s.gebouwd.includes(b.nodig)) && s.kristallen >= b.kost;
}

// Met het luchtschip of door de sterrenpoort naar een ander eiland (of terug naar het woud, bij de plek waar je vertrok).
function odReis(naar, bij) {
  od.toetsen.clear();
  od.ik.pad = [];
  const sluier = document.createElement('div');
  sluier.className = 'od-sluier';
  $('od-game').appendChild(sluier);
  sfx.fanfare();
  setTimeout(() => {
    let plek = null;
    if (bij) {
      const k = OdWereld.kaart(naar);
      const p = OdWereld.vind(k, bij);
      plek = p && [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy })).find(q => OdWereld.loopbaar(k, q.x, q.y, od.stand.gebouwd));
    }
    odKaart(naar, plek);
    sluier.classList.add('weg');
    setTimeout(() => sluier.remove(), 500);
    if (naar !== 'woud') odToastEens(`reis-${naar}`, `Welkom op ${od.kaart.naam}! Hier wachten nieuwe raadsels.`);
  }, 450);
}

// Een runensteen opgeraapt.
function odRaapRune(x, y) {
  const id = `${od.kaartId}:${x},${y}`;
  if ((od.stand.runen || []).includes(id)) return;
  socket.emit('od-vind', { naam: od.naam, id }, res => {
    if (!res || res.error) return;
    odStand(res.stand);
    if (!res.nieuw) return;
    sfx.fanfare();
    confetti(1500);
    odToast(res.aantal === res.totaal ? `Alle ${res.totaal} runenstenen gevonden! Je bent een echte ontdekker!` : `Een runensteen! +1 kristal. Je vond er ${res.aantal} van de ${res.totaal}.`, 3500);
  });
}

// Aan de rand waar de brug komt: met genoeg kristallen meteen bouwen, anders zeggen hoeveel je er nog nodig hebt.
function odBrugRand() {
  if (od.venster || od.bouwVraag) return;
  if (odKanBouwen('brug')) return odBouw('brug');
  const kost = od.stand.bouw.brug.kost;
  odToastEens('brug', `Hier komt een brug. Je hebt ${kost} kristallen nodig, je hebt er nu ${od.stand.kristallen}. Los raadsels op!`);
}

async function odBouw(wat) {
  const s = od.stand;
  const b = s.bouw[wat];
  if (s.gebouwd.includes(wat)) return;
  if (b.nodig && !s.gebouwd.includes(b.nodig)) return Ui.melding(`Bouw eerst ${s.bouw[b.nodig].naam}.`);
  if (s.kristallen < b.kost) return Ui.melding(`Hier kan je ${b.naam} bouwen met ${b.kost} kristallen. Je hebt er nu ${s.kristallen}. Los raadsels op om kristallen te verdienen!`);
  od.toetsen.clear();
  od.ik.pad = [];
  od.bouwVraag = true;
  const ja = await Ui.vraag(`Bouw ${b.naam} voor ${b.kost} kristallen? Je hebt er ${s.kristallen}.`, { ja: 'Bouwen!' });
  od.bouwVraag = false;
  od.toetsen.clear();
  if (!ja) return;
  socket.emit('od-bouw', { naam: od.naam, wat }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
    odStand(res.stand);
    sfx.fanfare();
    confetti(2500);
    odToast({
      brug: 'De lichtbrug staat er! Steek over naar de Neonruïnes.',
      luchtschip: 'Het luchtschip is klaar! Tik erop om naar de Drakenkust te vliegen.',
      sterrenpoort: 'De sterrenpoort gloeit! Tik erop om naar de Sterrenhaven te gaan.',
    }[wat] || 'Gebouwd!', 4000);
  });
}

// ---------- Verbinding ----------

socket.on('connect', () => {
  socket.emit('avatars-get', null, map => Avatar.setAll(map));
  odLaad(od.naam);
});
socket.on('avatars', map => Avatar.setAll(map));
// De leerkracht zette de wereld open of dicht: opnieuw kijken of je erin mag.
socket.on('od-toegang', () => { if (od.naam) odLaad(od.naam); });
// Taken afgewerkt in een ander tabblad? Af en toe opnieuw kijken als het slot dicht is.
setInterval(() => {
  if (!$('od-slot').classList.contains('hidden') && document.visibilityState === 'visible') odLaad(od.naam);
}, 15000);

// Start de leerkracht een spel, dan tonen we een knop om mee te doen.
const odSpellen = {};
socket.onAny((event, s) => {
  if (!s || typeof s !== 'object' || typeof s.phase !== 'string' || !/(^|-)state$/.test(event)) return;
  odSpellen[event] = !['idle', 'einde', 'end', 'podium'].includes(s.phase);
  $('od-start-banner').classList.toggle('hidden', !Object.values(odSpellen).some(Boolean));
});
