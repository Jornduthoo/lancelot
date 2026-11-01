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
    if (!res.leerkracht) socket.emit('hd-teken', res.naam, d => {
      od.dier = d && d.fase ? d : null;
      odSnuif();
    });
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
      const nodig = { draken: 'luchtschip', sterren: 'sterrenpoort', vuur: 'drakenzadel', ijs: 'ijsraket', koraal: 'duikboot', koraallab: 'duikboot', wolk: 'luchtballon', weerlab: 'luchtballon', mijn: 'mijnlift', maan: 'maanraket', cyber: 'hyperloop', station: 'shuttle' };
      const open = k === 'labo' || (nodig[k] && res.gebouwd.includes(nodig[k]));
      odKaart(open ? k : 'woud', open || k === 'woud' ? odBewaardePlek() : null);
    }
    else odBak();
  });
}

function odStand(s) {
  od.stand = s;
  $('od-kristallen').textContent = s.kristallen;
  $('od-boek-aantal').textContent = s.woorden + s.weetjes;
  $('od-opdracht-stip').classList.toggle('hidden', !(s.opdrachten || []).some(o => !o.gehaald && o.tel >= o.doel));
  $('od-boek-aantal').classList.toggle('leeg', !(s.woorden + s.weetjes));
  if (od.kaart && od.gebaktMet !== odSleutel()) odBak();
  odSnuif();
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
  if (odCanvas.width) odHemel();
  od.drones = odMaakDrones(od.kaart);
  od.deuren = ['D', 'q', 'Q'].map(c => OdWereld.vind(od.kaart, c) && { ...OdWereld.vind(od.kaart, c), c }).filter(Boolean);
  odLaadBeelden();
  let p = plek;
  const gebouwd = od.stand.gebouwd;
  if (!p || !OdWereld.loopbaar(od.kaart, p.x, p.y, gebouwd)) p = od.kaart.binnen ? odNaast(OdWereld.vind(od.kaart, 'q'), true) : OdWereld.vind(od.kaart, 'S');
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
  od.stukken = OdWereld.stukken(od.kaart, od.stand.runen || [], od.stand.gebouwd);
  od.gloed = OdWereld.gloeiers(od.kaart, od.T, od.grond.ox, od.grond.oy);
}

// Van vakje naar een punt op de gebakken kaart.
function odScherm(x, y) {
  const g = od.grond || OdWereld.maat(od.kaart, od.T);
  return [g.ox + (x - y) * od.T / 2, g.oy + (x + y) * od.T / 4];
}

function odGebied() {
  if (od.kaart.binnen) return od.kaart.naam;
  const naam = od.kaartId === 'woud' ? (od.kaart.ruine(od.ik.x) ? 'De Neonruïnes' : 'Het Kristalwoud') : od.kaart.naam;
  return (OD_LK ? 'Leerkracht · ' : '') + naam;
}

// ---------- Tekenen ----------

const odCanvas = $('od-canvas');
const odG = odCanvas.getContext('2d');

// De sterrenhemel, met een gloed in de kleur van het eiland (koud bij het ijs, rood bij de vulkaan).
const OD_GLOED = { ijs: 'rgba(150,210,255,.22)', vuur: 'rgba(255,90,30,.22)', koraal: 'rgba(40,200,210,.2)', wolk: 'rgba(255,180,230,.22)', mijn: 'rgba(120,60,200,.22)', maan: 'rgba(170,170,255,.18)', cyber: 'rgba(255,60,200,.25)', station: 'rgba(60,160,255,.2)' };
function odHemel() {
  const hemel = $('od-hemel');
  hemel.width = odCanvas.width;
  hemel.height = odCanvas.height;
  const g = hemel.getContext('2d');
  const geschilderd = OdArt.beeld('hemel');
  if (geschilderd) {
    // De geschilderde hemel, zo groot dat hij het hele scherm vult (en per eiland gespiegeld, voor wat afwisseling).
    const W = hemel.width;
    const H = hemel.height;
    const s = Math.max(W / geschilderd.naturalWidth, H / geschilderd.naturalHeight);
    const w = geschilderd.naturalWidth * s;
    const h = geschilderd.naturalHeight * s;
    const om = Object.keys(OdWereld.KAARTEN).indexOf(od.kaartId) % 2 === 1;
    g.save();
    if (om) g.setTransform(-1, 0, 0, 1, W, 0);
    g.drawImage(geschilderd, (W - w) / 2, (H - h) / 2, w, h);
    g.restore();
  } else {
    g.drawImage(BuArt.hemel(odCanvas.width, odCanvas.height), 0, 0);
    odNevel(g, hemel.width, hemel.height);
  }
  const gloed = OD_GLOED[od.kaartId];
  if (!gloed) return;
  const lg = g.createLinearGradient(0, 0, 0, hemel.height);
  lg.addColorStop(0, 'rgba(0,0,0,0)');
  lg.addColorStop(1, gloed);
  g.fillStyle = lg;
  g.fillRect(0, 0, hemel.width, hemel.height);
}

// "de Drakenkust", "het Kristalwoud": de naam van het eiland waar de Q-tegel naartoe gaat.
function odTerugNaam() {
  const t = od.kaart.terug;
  const naam = t ? OdWereld.KAARTEN[t.kaart].naam : 'Het Kristalwoud';
  return naam.replace(/^(De|Het) /, m => m.toLowerCase());
}

// Sci-fi in de verte: twee nevels in de kleur van het eiland en een ringstation dat ver weg in de ruimte hangt.
const OD_NEVEL = { woud: ['76,201,255', '199,125,255'], ijs: ['159,243,255', '120,160,255'], vuur: ['255,90,40', '199,60,120'], cyber: ['255,60,200', '76,201,255'], station: ['76,201,255', '46,230,166'], maan: ['170,170,255', '199,125,255'] };
function odNevel(g, W, H) {
  const [a, b] = OD_NEVEL[od.kaartId] || ['199,125,255', '76,201,255'];
  for (const [x, y, r, k] of [[0.15, 0.25, 0.45, a], [0.85, 0.7, 0.5, b]]) {
    const rg = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * Math.max(W, H));
    rg.addColorStop(0, `rgba(${k},.16)`);
    rg.addColorStop(1, `rgba(${k},0)`);
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);
  }
  // het ringstation: een ring met een as en lichtjes
  const s = Math.min(W, H) * 0.07;
  const cx = W * 0.12;
  const cy = H * 0.78;
  g.save();
  g.translate(cx, cy);
  g.rotate(-0.35);
  g.strokeStyle = 'rgba(200,212,234,.5)';
  g.lineWidth = Math.max(2, s * 0.12);
  g.beginPath();
  g.ellipse(0, 0, s, s * 0.32, 0, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(200,212,234,.55)';
  g.fillRect(-s * 0.08, -s * 0.5, s * 0.16, s);
  g.fillStyle = 'rgba(76,201,255,.9)';
  for (let i = 0; i < 6; i++) g.fillRect(Math.cos(i) * s - 1.5, Math.sin(i) * s * 0.32 - 1.5, 3, 3);
  g.restore();
}

// Drones die boven de eilanden zoemen: een paar per eiland, elk in een eigen lus.
function odMaakDrones(k) {
  if (k.binnen) return [];
  const land = [];
  for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) if (OdWereld.teken(k, x, y) !== '~') land.push([x, y]);
  const r = OdPuzzels.rng(`drone|${k.id}`);
  return Array.from({ length: Math.min(4, 2 + Math.floor(land.length / 150)) }, () => {
    const [x, y] = land[r.int(land.length)];
    return { x, y, rx: 2 + r() * 3, ry: 1.5 + r() * 2.5, v: 0.00025 + r() * 0.0002, f: r() * 6.3, h: 1.4 + r() * 0.8 };
  });
}
let odDroneBeeld = null;
function odDroneSprite(T) {
  if (odDroneBeeld && odDroneBeeld.T === T) return odDroneBeeld.c;
  const c = document.createElement('canvas');
  c.width = Math.ceil(T * 0.7);
  c.height = Math.ceil(T * 0.4);
  const g = c.getContext('2d');
  const cx = c.width / 2;
  const cy = c.height / 2;
  g.fillStyle = 'rgba(200,212,234,.35)';
  for (const dx of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + dx * T * 0.24, cy - T * 0.06, T * 0.1, T * 0.035, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#5a6478';
  g.lineWidth = Math.max(1, T / 40);
  g.beginPath();
  g.moveTo(cx - T * 0.24, cy - T * 0.05);
  g.lineTo(cx + T * 0.24, cy - T * 0.05);
  g.stroke();
  g.fillStyle = '#2b3558';
  g.beginPath();
  g.ellipse(cx, cy, T * 0.13, T * 0.08, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#4cc9ff';
  g.beginPath();
  g.ellipse(cx, cy + T * 0.01, T * 0.07, T * 0.03, 0, 0, Math.PI * 2);
  g.fill();
  odDroneBeeld = { T, c };
  return c;
}

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
  odHemel();
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
// De geschilderde beelden van dit eiland laden en dan pas bakken (zo zie je nooit eerst de oude tekening).
// Duurt het te lang (traag netwerk), dan eerst de code-versie en opnieuw bakken als ze toch binnenkomen.
function odLaadBeelden() {
  const id = od.kaartId;
  const bak = () => {
    if (od.kaartId !== id || !od.stand) return;
    odBak();
    odHemel();
  };
  const wacht = setTimeout(bak, 1500);
  od.grond = null;
  OdArt.laad(OdWereld.beelden(od.kaart, od.stand.gebouwd), () => {
    clearTimeout(wacht);
    bak();
  });
}

function odSpriteRidder() {
  const av = Avatar.byName(od.naam) || Avatar.mine() || odStandaardRidder;
  const achter = od.ik.dir === 0 || od.ik.dir === 3;
  return Avatar.sprite(av, { k: 8, back: achter });
}
const odStandaardRidder = Avatar.random();

// Je huisdier uit Mijn huisdier volgt je, een halve stap achter je. Ligt er een runensteen dichtbij, dan snuffelt het.
function odDier(t) {
  if (!od.dier) return null;
  const ik = od.ik;
  if (!od.dierPos || od.dierPos.kaart !== od.kaartId) od.dierPos = { kaart: od.kaartId, x: ik.vx, y: ik.vy };
  const [dx, dy] = OD_RICHTING[ik.dir] || [0, 1];
  const doel = { x: ik.vx - dx * 0.75 + 0.3, y: ik.vy - dy * 0.75 + 0.3 };
  const p = od.dierPos;
  p.x += (doel.x - p.x) * 0.08;
  p.y += (doel.y - p.y) * 0.08;
  return {
    som: p.x + p.y,
    teken() {
      const g = odG;
      const [sx, sy] = odScherm(p.x, p.y);
      const s = HdArt.sprite(od.dier, Math.round(od.T * 0.5));
      const hup = Math.abs(Math.sin(t / 160)) * (Math.hypot(doel.x - p.x, doel.y - p.y) > 0.1 ? od.T * 0.05 : 0);
      g.drawImage(s, Math.round(sx - s.width / 2), Math.round(sy - s.height + od.T * 0.06 - hup));
      if (od.snuif) {
        const by = sy - s.height - od.T * 0.08 + Math.sin(t / 200) * od.T * 0.04;
        g.fillStyle = 'rgba(10,16,32,.85)';
        g.beginPath();
        g.arc(sx, by, od.T * 0.14, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffe14a';
        g.font = `900 ${Math.round(od.T * 0.2)}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('!', sx, by + 1);
      }
    },
  };
}

// Ligt er een runensteen die je nog niet vond binnen 4 stappen? Dan snuffelt je huisdier.
function odSnuif() {
  od.snuif = false;
  if (!od.dier || !od.kaart) return;
  const ik = od.ik;
  const gevonden = (od.stand && od.stand.runen) || [];
  for (let y = ik.y - 4; y <= ik.y + 4; y++) {
    for (let x = ik.x - 4; x <= ik.x + 4; x++) {
      if (Math.abs(x - ik.x) + Math.abs(y - ik.y) > 4) continue;
      if (OdWereld.teken(od.kaart, x, y) === 'J' && !gevonden.includes(`${od.kaartId}:${x},${y}`)) {
        od.snuif = true;
        return;
      }
    }
  }
}

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
    if (d.c === 'Q') {
      // een teleportstraal
      const lg = g.createLinearGradient(0, dy - od.T * 1.4, 0, dy);
      lg.addColorStop(0, 'rgba(46,230,166,0)');
      lg.addColorStop(1, `rgba(46,230,166,${0.25 + 0.15 * Math.sin(t / 200)})`);
      g.fillStyle = lg;
      g.fillRect(dx - od.T * 0.22, dy - od.T * 1.4, od.T * 0.44, od.T * 1.4);
      const f = (t / 900) % 1;
      g.strokeStyle = `rgba(159,255,220,${0.8 * (1 - f)})`;
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(dx, dy - f * od.T * 1.1, od.T * 0.22, od.T * 0.08, 0, 0, Math.PI * 2);
      g.stroke();
    }
    if (d.c !== 'D') {
      g.fillStyle = '#e8fff6';
      g.font = `bold ${od.T * 0.2}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const tekst = d.c === 'q' ? '⇩ Naar buiten' : `⇩ Terug naar ${odTerugNaam()}`;
      // een donkere rand, zodat je het ook op sneeuw en wolken kan lezen
      g.strokeStyle = 'rgba(10,16,32,.85)';
      g.lineWidth = Math.max(2, od.T * 0.05);
      g.lineJoin = 'round';
      g.strokeText(tekst, dx, dy + od.T * 0.42);
      g.fillText(tekst, dx, dy + od.T * 0.42);
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
  // Je huisdier loopt achter je aan (en snuffelt als er een runensteen in de buurt ligt).
  const dier = odDier(t);
  if (dier && dier.som <= ikSom) dier.teken();
  // De stukken zitten al in de gebakken vloer. Stukken die vóór de ridder staan en hem raken, nog eens over hem heen.
  tekenIk();
  if (dier && dier.som > ikSom) dier.teken();
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
    const bouw = st.plek === 'bord' ? 'brug' : OdWereld.REIS[st.plek] || st.plek === 'kroonburcht' ? st.plek : null;
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
    // een hologramring rond elke raadselplek
    g.strokeStyle = `rgba(76,201,255,${0.45 + 0.25 * Math.sin(t / 400 + st.x)})`;
    g.lineWidth = 2;
    g.setLineDash([6, 5]);
    g.lineDashOffset = -t / 60;
    g.beginPath();
    g.ellipse(sx0, sy0, od.T * 0.46, od.T * 0.22, 0, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    odMarker(g, sx0, sy0, t, vandaag[st.plek] && vandaag[st.plek].vandaag);
  }
  BuArt.gloei(g, od.gloed.filter(p => p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1), t / 1000, 1);
  // de drones: een schaduw op de grond en het toestel hoog erboven, met een knipperlicht
  const dr = odDroneSprite(od.T);
  for (const d of od.drones || []) {
    const a = t * d.v + d.f;
    const [dx, dy] = odScherm(d.x + Math.cos(a) * d.rx, d.y + Math.sin(a * 1.3) * d.ry);
    if (dx < x0 || dx > x1 || dy < y0 || dy > y1) continue;
    g.fillStyle = 'rgba(10,14,24,.18)';
    g.beginPath();
    g.ellipse(dx, dy, od.T * 0.14, od.T * 0.06, 0, 0, Math.PI * 2);
    g.fill();
    const hy = dy - od.T * d.h + Math.sin(t / 300 + d.f) * 3;
    g.drawImage(dr, Math.round(dx - dr.width / 2), Math.round(hy - dr.height / 2));
    if (Math.floor(t / 400 + d.f) % 2) {
      g.fillStyle = '#ff4d6d';
      g.fillRect(dx - 1.5, hy + od.T * 0.06, 3, 3);
    }
  }
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
  odSnuif();
  $('od-gebied').textContent = odGebied();
  const c = OdWereld.teken(od.kaart, ik.x, ik.y);
  if (c === 'D') return odDeur(od.kaart.binnenkaart || 'labo');
  if (c === 'q') return odDeur(od.kaart.buiten || 'woud');
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
    const k = OdWereld.kaart(naar);
    if (k.binnen) odKaart(naar, null);
    else {
      const d = OdWereld.vind(k, 'D');
      odKaart(naar, { x: d.x, y: d.y + 1 });
    }
    sluier.classList.add('weg');
    setTimeout(() => sluier.remove(), 400);
    if (k.welkom) odToastEens(naar, k.welkom);
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
      return odToast(p.bouw === 'kroonburcht' ? '🏰 Jouw Gouden Burcht! Je bent een echte ontdekker van het rijk.' : 'De brug staat er al. Op naar de Neonruïnes!');
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
      drakenzadel: 'De draak is gezadeld! Tik erop om naar de Vuurberg te vliegen.',
      ijsraket: 'De ijsraket is klaar! Tik erop om naar het IJsrijk te gaan.',
      duikboot: 'De duikboot is klaar! Tik erop om naar het Koraalrif te varen.',
      luchtballon: 'De luchtballon is klaar! Tik erop om naar de Wolkenstad te zweven.',
      mijnlift: 'De mijnlift werkt! Tik erop om af te dalen naar De Mijnen.',
      maanraket: 'De maanraket staat klaar! Tik erop om naar de Maanbasis te vliegen.',
      hyperloop: 'De hyperloop zoemt! Tik erop om naar de Cyberstad te flitsen.',
      shuttle: 'De shuttle is klaar voor vertrek! Tik erop om naar het Ruimtestation te vliegen.',
      kroonburcht: '🏰 De Gouden Burcht staat in het woud! Iedereen kan zien dat jij het hele rijk ontdekte.',
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

// De geschilderde bouwstukken (BuArt) zijn binnen: de wereld opnieuw bakken.
if (typeof BuArt !== 'undefined') BuArt.opKlaar(() => { if (od.stand && od.kaart && od.grond) odBak(); });
