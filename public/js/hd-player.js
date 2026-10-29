// Mijn huisdier op de gsm of Chromebook: een ei kiezen, je huisdier verzorgen (voeren, poetsen, spelen),
// trucjes laten doen en een hoedje opzetten. De server houdt bij hoe het groeit en hoe het zich voelt.
// Nooit straf: wie lang weg was, vindt zijn huisdier slapend terug en maakt het blij wakker.
// Gebruikt HdArt (hd-art.js), sfx en confetti (fx.js), Ui (ui.js). klas-kies.js gebruikt store, socket en $ van hier.

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

const socket = io({ autoConnect: false });
document.addEventListener('DOMContentLoaded', () => socket.connect());
const $ = id => document.getElementById(id);

const hd = {
  naam: store('lancelot-name') || '',
  stand: null,
  kies: { soort: 'draak', kleur: 0 },
  modus: null, // null, 'poets' of 'spel'
  anim: null, // { wat, t0, dur }
  deeltjes: [],
  px: 0, // waar het huisdier staat (0 = midden), in pixels
  doelX: 0,
  volgendeWandel: 0,
  bezig: false,
};

const SOORT = id => HdArt.SOORTEN.find(s => s.id === id) || HdArt.SOORTEN[0];
const dierNaam = () => (hd.stand && hd.stand.dier && hd.stand.dier.naam) || SOORT(hd.stand && hd.stand.dier ? hd.stand.dier.soort : 'draak').naam;

function hdToon(scherm) {
  $('hd-join').classList.toggle('hidden', scherm !== 'join');
  $('hd-kies').classList.toggle('hidden', scherm !== 'kies');
  $('hd-spel').classList.toggle('hidden', scherm !== 'spel');
  $('hd-tellers').classList.toggle('hidden', scherm !== 'spel');
  if (scherm === 'spel') hdMaat();
}

function hdLaad(naam = hd.naam) {
  if (!naam) return hdToon('join');
  socket.emit('hd-get', naam, res => {
    if (!res || res.error) {
      $('hd-join-error').textContent = (res && res.error) || '';
      return hdToon('join');
    }
    hd.naam = res.naam;
    store('lancelot-name', res.naam);
    hdZet(res);
  });
}

$('hd-join').addEventListener('submit', e => {
  e.preventDefault();
  const naam = $('hd-name').value.trim();
  if (naam) hdLaad(naam);
});
$('hd-name').value = hd.naam;
$('hd-switch').addEventListener('click', () => klasSwitch());

// ---------- Een nieuwe stand van de server ----------

function hdZet(s) {
  const vorige = hd.stand;
  hd.stand = s;
  $('hd-sub').textContent = s.naam;
  if (!s.dier) {
    hdKiesScherm();
    return hdToon('kies');
  }
  if (!$('hd-kies').classList.contains('hidden') && vorige && vorige.dier) return; // aan het kiezen: niet storen
  hdToon('spel');
  const d = s.dier;
  $('hd-titel').textContent = d.naam || `Mijn ${SOORT(d.soort).naam.toLowerCase()}`;
  const snoep = $('hd-snoep');
  if (vorige && vorige.snoepjes !== s.snoepjes) {
    snoep.parentElement.classList.remove('plop');
    void snoep.offsetWidth;
    snoep.parentElement.classList.add('plop');
  }
  snoep.textContent = s.snoepjes;
  hdLogo();

  const ei = !d.fase;
  $('hd-meters').classList.toggle('hidden', ei);
  $('hd-acties').classList.toggle('hidden', ei);
  $('hd-ei-tekst').classList.toggle('hidden', !ei);
  $('hd-ander-ei').classList.toggle('hidden', !ei);
  if (ei) $('hd-ei-tekst').textContent = `🥚 Nog ${s.nogTotUit} Eer, dan komt je ei uit! Speel mee in een spel of maak een taak.`;
  else {
    for (const w of ['voer', 'speel', 'poets']) $(`hd-m-${w}`).style.width = `${Math.max(3, Math.round(s[w] * 100))}%`;
    $('hd-meters').classList.toggle('slaapt', !!s.slaapt);
    for (const b of document.querySelectorAll('#hd-acties button')) b.disabled = !!s.slaapt;
    $('hd-wakker').classList.toggle('hidden', !s.slaapt);
  }

  // Groeien
  const fase = HdArt.FASEN[d.fase];
  $('hd-fase').textContent = ei ? 'Een ei' : fase.naam;
  if (ei) {
    $('hd-groei-balk').style.width = `${Math.round(((5 - s.nogTotUit) / 5) * 100)}%`;
    $('hd-groei-tekst').textContent = 'Je ei komt uit als je Eer verdient.';
  } else if (s.volgende != null) {
    const van = fase.vanaf;
    $('hd-groei-balk').style.width = `${Math.max(3, Math.min(100, ((s.groei - van) / (s.volgende - van)) * 100))}%`;
    $('hd-groei-tekst').textContent = `Nog ${s.volgende - s.groei} groei tot ${HdArt.FASEN[d.fase + 1].naam}. Elke Eer telt, en zorgen geeft wat extra.`;
  } else {
    $('hd-groei-balk').style.width = '100%';
    $('hd-groei-tekst').textContent = `${dierNaam()} is volgroeid: een echte ridder!`;
  }

  if (document.activeElement !== $('hd-naam-in')) $('hd-naam-in').value = d.naam || '';
  hdKleuren($('hd-kleuren'), d.kleur, k => hdStijl({ kleur: k }));
  hdHoeden();
  hdTrucs();

  // Nieuw: uit het ei of gegroeid.
  if (s.nieuw === 'uit') hdUitkomen();
  else if (s.nieuw === 'groei') hdGegroeid();
}

function hdLogo() {
  const c = $('hd-logo');
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const d = hd.stand && hd.stand.dier;
  HdArt.teken(g, d || { soort: 'draak', kleur: 0, fase: 0 }, 48, 92, d && d.fase ? 92 : 80, { stil: true, geenSchaduw: true });
}

function hdKleuren(box, gekozen, kies) {
  box.innerHTML = '';
  HdArt.KLEUREN.forEach((k, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hd-kleur${i === gekozen ? ' on' : ''}`;
    b.style.background = `linear-gradient(135deg, ${k.a} 55%, ${k.g})`;
    b.title = k.naam;
    b.addEventListener('click', () => kies(i));
    box.appendChild(b);
  });
}

function hdHoeden() {
  const box = $('hd-hoeden');
  box.innerHTML = '';
  const s = hd.stand;
  for (const h of HdArt.HOEDEN) {
    const b = document.createElement('button');
    b.type = 'button';
    const mag = s.hoeden.includes(h.id);
    b.className = `hd-hoed${(s.dier.hoed || '') === h.id ? ' on' : ''}${mag ? '' : ' slot'}`;
    b.textContent = !h.id ? 'geen' : mag ? h.teken : '🔒';
    b.title = mag ? h.naam : `${h.naam}: ${h.hoe}`;
    b.addEventListener('click', () => {
      if (!mag) return hdBallon(`🔒 ${h.naam}: ${h.hoe}.`);
      hdStijl({ hoed: h.id });
    });
    box.appendChild(b);
  }
}

function hdTrucs() {
  const box = $('hd-trucs');
  box.innerHTML = '';
  const fase = hd.stand.dier.fase;
  for (const t of HdArt.TRUCS) {
    if (t.fase > fase + 1) break;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hd-actie truc';
    const naam = t.id === 'kunst' ? SOORT(hd.stand.dier.soort).kunst : t.naam;
    b.innerHTML = `<b>${t.fase > fase ? '🔒' : t.teken}</b>`;
    b.append(naam);
    if (t.fase > fase) {
      b.disabled = true;
      b.title = `Leert je huisdier als het ${HdArt.FASEN[t.fase].naam.toLowerCase()} is`;
    } else b.addEventListener('click', () => hdTruc(t.id));
    if (hd.stand.slaapt) b.disabled = true;
    box.appendChild(b);
  }
}

function hdStijl(arg) {
  socket.emit('hd-stijl', { naam: hd.naam, ...arg }, res => {
    if (!res || res.error) return hdBallon((res && res.error) || 'Dat lukte niet.');
    sfx.marker();
    hdZet(res);
  });
}
$('hd-naam-in').addEventListener('change', () => hdStijl({ dierNaam: $('hd-naam-in').value }));
$('hd-naam-in').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('hd-naam-in').blur();
});

// ---------- Een ei kiezen ----------

function hdKiesScherm() {
  const box = $('hd-soorten');
  box.innerHTML = '';
  for (const s of HdArt.SOORTEN) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hd-soort${hd.kies.soort === s.id ? ' on' : ''}`;
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    HdArt.teken(c.getContext('2d'), { soort: s.id, kleur: hd.kies.kleur, fase: 2 }, 80, 150, 150, { stil: true });
    const n = document.createElement('span');
    n.textContent = s.naam;
    const k = document.createElement('small');
    k.textContent = `kunstje: ${s.kunst.toLowerCase()}`;
    b.append(c, n, k);
    b.addEventListener('click', () => {
      hd.kies.soort = s.id;
      sfx.tick();
      hdKiesScherm();
    });
    box.appendChild(b);
  }
  hdKleuren($('hd-kies-kleuren'), hd.kies.kleur, i => {
    hd.kies.kleur = i;
    sfx.tick();
    hdKiesScherm();
  });
  $('hd-kies-terug').classList.toggle('hidden', !(hd.stand && hd.stand.dier));
}

$('hd-kies-ok').addEventListener('click', () => {
  socket.emit('hd-kies', { naam: hd.naam, soort: hd.kies.soort, kleur: hd.kies.kleur, dierNaam: $('hd-kies-naam').value }, res => {
    if (!res || res.error) return Ui.melding((res && res.error) || 'Dat lukte niet.');
    sfx.power();
    $('hd-kies').classList.add('hidden');
    hdZet(res);
    hdBallon(res.dier.fase ? '' : 'Wat een mooi ei! Verdien wat Eer, dan komt het uit.', 5000);
  });
});
$('hd-ander-ei').addEventListener('click', () => {
  const d = hd.stand.dier;
  hd.kies = { soort: d.soort, kleur: d.kleur };
  $('hd-kies-naam').value = d.naam || '';
  hdKiesScherm();
  hdToon('kies');
});
$('hd-kies-terug').addEventListener('click', () => hdZet(hd.stand));

// ---------- Verzorgen ----------

function hdZorg(wat, extra = {}, klaar) {
  if (hd.bezig) return;
  hd.bezig = true;
  socket.emit('hd-zorg', { naam: hd.naam, wat, ...extra }, res => {
    hd.bezig = false;
    if (!res || res.error) {
      sfx.empty();
      return hdBallon((res && res.error) || 'Dat lukte niet.');
    }
    hdZet(res);
    if (klaar) klaar(res);
  });
}

for (const b of document.querySelectorAll('#hd-acties [data-doe]')) {
  b.addEventListener('click', () => {
    const wat = b.dataset.doe;
    if (wat === 'voer') hdVoer();
    else if (wat === 'poets') hd.modus === 'poets' ? hdModusUit() : hdPoetsStart();
    else if (wat === 'speel') hd.modus === 'spel' ? hdModusUit() : hdSpelStart();
  });
}

function hdVoer() {
  hdModusUit();
  hdZorg('voer', {}, res => {
    hdAnim('eet', 1300);
    sfx.jump();
    setTimeout(() => sfx.good(), 500);
    hdBallon(['Mmm, lekker!', 'Njam njam!', 'Dankjewel!', 'Mijn lievelingssnoepje!'][Math.floor(Math.random() * 4)] + (res.erbij ? ` +${res.erbij} groei` : ''));
  });
}

$('hd-wakker').addEventListener('click', () => {
  hdZorg('wakker', {}, () => {
    hdAnim('juich', 1200);
    sfx.good();
    for (let i = 0; i < 8; i++) hdDeeltje('hart');
    hdBallon(`Goeiemorgen! ${dierNaam()} is blij dat je er bent!`, 4000);
  });
});

// Poetsen: wrijf over je huisdier tot het glanst.
function hdPoetsStart() {
  hdModusUit();
  hd.modus = 'poets';
  hd.poets = 0;
  hd.px = hd.doelX = 0;
  $('hd-podium').classList.add('poets');
  hdKnopAan('poets');
  hdSpelbalk('🧽 Wrijf over je huisdier!');
}
function hdPoetsWrijf(afstand) {
  hd.poets += afstand;
  if (Math.random() < 0.35) hdDeeltje('bel');
  const pct = Math.min(100, Math.round((hd.poets / 1600) * 100));
  hdSpelbalk(`🧽 Wrijf over je huisdier! ${pct}%`);
  if (pct >= 100) {
    hdModusUit();
    hdZorg('poets', {}, res => {
      for (let i = 0; i < 14; i++) hdDeeltje('glans');
      hdAnim('juich', 1000);
      sfx.power();
      hdBallon(`Blinkend proper!${res.erbij ? ` +${res.erbij} groei` : ''}`);
    });
  }
}

// Spelen: vang zoveel mogelijk sterren in 20 seconden. Je huisdier springt er mee naartoe.
const SPEL_TIJD = 20000;
function hdSpelStart() {
  hdModusUit();
  hd.modus = 'spel';
  hd.spel = { t0: performance.now(), score: 0, sterren: [], volgende: 0 };
  hdKnopAan('speel');
  sfx.go();
}
function hdSpelEinde() {
  const n = hd.spel.score;
  hdModusUit();
  hdZorg('speel', { score: Math.ceil(n / 3) }, res => {
    hdAnim('juich', 1200);
    if (n >= 10) confetti(1500);
    sfx.fanfare();
    hdBallon(`Je ving ${n} ${n === 1 ? 'ster' : 'sterren'}!${res.erbij ? ` +${res.erbij} groei` : ''}`, 4000);
  });
}

function hdModusUit() {
  hd.modus = null;
  hd.spel = null;
  $('hd-podium').classList.remove('poets');
  $('hd-spelbalk').classList.add('hidden');
  hdKnopAan(null);
}
function hdKnopAan(wat) {
  for (const b of document.querySelectorAll('#hd-acties [data-doe]')) b.classList.toggle('aan', b.dataset.doe === wat);
}
function hdSpelbalk(tekst) {
  $('hd-spel-tekst').textContent = tekst;
  $('hd-spelbalk').classList.remove('hidden');
}
$('hd-spel-stop').addEventListener('click', () => (hd.modus === 'spel' && hd.spel.score ? hdSpelEinde() : hdModusUit()));

function hdTruc(id) {
  hdModusUit();
  hd.px = hd.doelX = 0;
  if (id === 'hop') {
    hdAnim('hop', 1000);
    sfx.jump();
  } else if (id === 'salto') {
    hdAnim('salto', 1000);
    sfx.whoosh();
  } else if (id === 'kunst') {
    hdAnim('kunst', 1600);
    hd.stand.dier.soort === 'robo' ? sfx.laser() : sfx.power();
  } else if (id === 'vlieg') {
    hdAnim('vlieg', 2600);
    sfx.whoosh();
  }
}

function hdAnim(wat, dur) {
  hd.anim = { wat, t0: performance.now(), dur };
}

// Uit het ei! Eerst schudden, dan een flits en je huisdier.
function hdUitkomen() {
  hd.anim = { wat: 'uit', t0: performance.now(), dur: 2200 };
  sfx.drumroll(1.6);
  setTimeout(() => {
    sfx.fanfare();
    confetti(2500);
    hdBallon(`Hoera, je ei is uit! Geef je huisdier een naam.`, 5000);
  }, 1700);
}
function hdGegroeid() {
  hdAnim('groei', 1800);
  setTimeout(() => {
    sfx.fanfare();
    confetti(2000);
    const f = HdArt.FASEN[hd.stand.dier.fase];
    hdBallon(`${dierNaam()} is gegroeid! Nu: ${f.naam}. Er is een nieuw trucje!`, 5000);
  }, 600);
}

let ballonTimer = null;
function hdBallon(tekst, ms = 3000) {
  $('hd-ballon').textContent = tekst;
  clearTimeout(ballonTimer);
  if (tekst) ballonTimer = setTimeout(() => { $('hd-ballon').textContent = ''; }, ms);
}

// Af en toe zegt je huisdier iets. Altijd vriendelijk, nooit zielig.
function hdPraat() {
  const s = hd.stand;
  if (!s || !s.dier || !s.dier.fase || s.slaapt || hd.modus || $('hd-ballon').textContent) return;
  const lijn = s.voer < 0.35 && s.snoepjes > 0 ? 'Mag ik een snoepje?'
    : s.speel < 0.35 ? 'Zullen we samen sterren vangen?'
      : s.poets < 0.35 ? 'Een poetsbeurt zou fijn zijn!'
        : ['Jij bent mijn beste vriend!', 'Wat gaan we vandaag leren?', 'Ik word groot en sterk, dankzij jou!', 'Tik eens op mij!', 'Elke Eer maakt mij groter!'][Math.floor(Math.random() * 5)];
  hdBallon(lijn, 3500);
}
setInterval(hdPraat, 22000);

// ---------- Het podium tekenen ----------

const cv = $('hd-canvas');
const g = cv.getContext('2d');
let dpr = 1;
let achter = null;

function hdMaat() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(cv.clientWidth * dpr);
  const h = Math.round(cv.clientHeight * dpr);
  if (!w || !h) return;
  if (cv.width !== w || cv.height !== h || !achter) {
    cv.width = w;
    cv.height = h;
    achter = hdAchtergrond(w, h);
  }
}
window.addEventListener('resize', () => setTimeout(hdMaat, 100));

// Een kamer in de burcht bij nacht: sterren en een planeet door een groot raam, een stenen vloer met een neonrand en een kussen.
function hdAchtergrond(W, H) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const lucht = x.createLinearGradient(0, 0, 0, H);
  lucht.addColorStop(0, '#0a1030');
  lucht.addColorStop(0.6, '#1d1650');
  lucht.addColorStop(1, '#2a1a4a');
  x.fillStyle = lucht;
  x.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 140; i++) {
    x.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.7})`;
    const r = rnd() * 1.6 * dpr;
    x.fillRect(rnd() * W, rnd() * H * 0.7, r, r);
  }
  // planeet met ring
  const pr = Math.min(W, H) * 0.09;
  const px = W * 0.8;
  const py = H * 0.2;
  const pv = x.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
  pv.addColorStop(0, '#ffd8a8');
  pv.addColorStop(1, '#c4507a');
  x.fillStyle = pv;
  x.beginPath();
  x.arc(px, py, pr, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = 'rgba(255,220,180,.6)';
  x.lineWidth = 2 * dpr;
  x.beginPath();
  x.ellipse(px, py, pr * 1.7, pr * 0.4, -0.3, 0, Math.PI * 2);
  x.stroke();
  // verre burchten met verlichte ramen
  const grond = H * 0.66;
  x.fillStyle = '#120c2c';
  for (let i = 0; i < 9; i++) {
    const bx = (i / 8) * W;
    const bw = W * (0.05 + rnd() * 0.05);
    const bh = H * (0.08 + rnd() * 0.16);
    x.fillRect(bx - bw / 2, grond - bh, bw, bh);
    x.beginPath();
    x.moveTo(bx - bw * 0.6, grond - bh);
    x.lineTo(bx, grond - bh - bw * 0.9);
    x.lineTo(bx + bw * 0.6, grond - bh);
    x.fill();
    x.fillStyle = 'rgba(120,220,255,.75)';
    for (let r = 0; r < 3; r++) if (rnd() < 0.6) x.fillRect(bx - bw * 0.15, grond - bh * (0.3 + r * 0.22), bw * 0.3, bh * 0.07);
    x.fillStyle = '#120c2c';
  }
  // de vloer: een stenen plateau met een neonrand
  const vloer = x.createLinearGradient(0, grond, 0, H);
  vloer.addColorStop(0, '#3b3460');
  vloer.addColorStop(1, '#1c1838');
  x.fillStyle = vloer;
  x.fillRect(0, grond, W, H - grond);
  x.strokeStyle = 'rgba(0,0,0,.25)';
  x.lineWidth = 1 * dpr;
  for (let r = 0; r < 6; r++) {
    const y = grond + ((H - grond) * r) / 6;
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(W, y);
    x.stroke();
    for (let k = 0; k < 12; k++) {
      const sx = ((k + (r % 2) * 0.5) / 12) * W;
      x.beginPath();
      x.moveTo(sx, y);
      x.lineTo(sx, y + (H - grond) / 6);
      x.stroke();
    }
  }
  x.shadowColor = '#4cc9ff';
  x.shadowBlur = 14 * dpr;
  x.fillStyle = '#4cc9ff';
  x.fillRect(0, grond - 2 * dpr, W, 3 * dpr);
  x.shadowBlur = 0;
  // het kussen in het midden
  const ky = H * 0.86;
  const kw = Math.min(W * 0.32, H * 0.5);
  x.fillStyle = 'rgba(0,0,0,.3)';
  x.beginPath();
  x.ellipse(W / 2, ky + kw * 0.06, kw * 0.55, kw * 0.14, 0, 0, Math.PI * 2);
  x.fill();
  const kv = x.createLinearGradient(0, ky - kw * 0.1, 0, ky + kw * 0.1);
  kv.addColorStop(0, '#c4304a');
  kv.addColorStop(1, '#7a1830');
  x.fillStyle = kv;
  x.beginPath();
  x.ellipse(W / 2, ky, kw * 0.5, kw * 0.12, 0, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = '#ffc94a';
  x.lineWidth = 2 * dpr;
  x.stroke();
  return c;
}

// Waar het huisdier staat en hoe groot het is.
function hdPlek() {
  const W = cv.width;
  const H = cv.height;
  const h = Math.min(H * 0.5, W * 0.38);
  return { x: W / 2 + hd.px, y: H * 0.86, h };
}

function hdDeeltje(soort, x, y) {
  const p = hdPlek();
  const d = { soort, x: x != null ? x : p.x + (Math.random() - 0.5) * p.h * 0.6, y: y != null ? y : p.y - p.h * (0.3 + Math.random() * 0.5), vx: (Math.random() - 0.5) * 1.2 * dpr, vy: -(0.6 + Math.random() * 1.2) * dpr, t: 0, max: 60 + Math.random() * 40, r: (6 + Math.random() * 6) * dpr };
  if (soort === 'vuur' || soort === 'flits' || soort === 'ster' || soort === 'wind' || soort === 'laser') {
    d.max = 50;
  }
  hd.deeltjes.push(d);
  if (hd.deeltjes.length > 160) hd.deeltjes.shift();
  return d;
}

function hdTekenDeeltjes() {
  const K = HdArt.KLEUREN[hd.stand.dier.kleur] || HdArt.KLEUREN[0];
  for (const d of hd.deeltjes) {
    d.t++;
    d.x += d.vx;
    d.y += d.vy;
    const a = Math.max(0, 1 - d.t / d.max);
    g.globalAlpha = a;
    if (d.soort === 'hart') {
      g.fillStyle = '#ff5f8f';
      g.font = `${d.r * 2.2}px sans-serif`;
      g.textAlign = 'center';
      g.fillText('❤', d.x, d.y);
    } else if (d.soort === 'bel') {
      g.strokeStyle = 'rgba(200,240,255,.9)';
      g.fillStyle = 'rgba(200,240,255,.18)';
      g.lineWidth = 1.5 * dpr;
      g.beginPath();
      g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    } else if (d.soort === 'glans' || d.soort === 'ster') {
      g.fillStyle = d.soort === 'ster' ? '#fff27a' : '#ffffff';
      HdArt.ster(g, d.x, d.y, d.r);
      g.fill();
    } else if (d.soort === 'zzz') {
      g.fillStyle = '#cfe0ff';
      g.font = `800 ${d.r * 2}px sans-serif`;
      g.textAlign = 'center';
      g.fillText('z', d.x, d.y);
    } else if (d.soort === 'vuur') {
      g.fillStyle = d.t < 15 ? '#fff27a' : d.t < 30 ? '#ffb321' : '#ff5a3c';
      g.beginPath();
      g.arc(d.x, d.y, d.r * (1 + d.t / 40), 0, Math.PI * 2);
      g.fill();
    } else if (d.soort === 'laser') {
      g.strokeStyle = K.g;
      g.lineWidth = 4 * dpr;
      g.lineCap = 'round';
      g.shadowColor = K.g;
      g.shadowBlur = 14 * dpr;
      g.beginPath();
      g.moveTo(d.x, d.y);
      g.lineTo(d.x - d.vx * 6, d.y - d.vy * 6);
      g.stroke();
      g.shadowBlur = 0;
    } else if (d.soort === 'flits') {
      g.strokeStyle = K.g;
      g.lineWidth = 3 * dpr;
      g.shadowColor = K.g;
      g.shadowBlur = 12 * dpr;
      g.beginPath();
      g.arc(d.x, d.y, d.r * (1 + d.t / 6), 0, Math.PI * 2);
      g.stroke();
      g.shadowBlur = 0;
    } else if (d.soort === 'wind') {
      g.strokeStyle = 'rgba(220,240,255,.85)';
      g.lineWidth = 2.5 * dpr;
      g.beginPath();
      g.arc(d.x, d.y, d.r * 1.4, 0.2 + d.t / 8, 2.4 + d.t / 8);
      g.stroke();
    } else if (d.soort === 'snoep') {
      g.font = `${d.r * 2.6}px sans-serif`;
      g.textAlign = 'center';
      g.fillText('🍬', d.x, d.y);
    }
  }
  g.globalAlpha = 1;
  hd.deeltjes = hd.deeltjes.filter(d => d.t < d.max);
}

let laatst = 0;
let zzzTimer = 0;
function hdLus(t) {
  requestAnimationFrame(hdLus);
  if ($('hd-spel').classList.contains('hidden') || document.hidden || !hd.stand || !hd.stand.dier || !achter) return;
  // Een Chromebook hoeft niet sneller dan 40 beelden per seconde.
  if (t - laatst < 24) return;
  laatst = t;
  const W = cv.width;
  const H = cv.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(achter, 0, 0);
  const d = hd.stand.dier;

  // Rondwandelen als er niets gebeurt.
  if (d.fase && !hd.stand.slaapt && !hd.modus && !hd.anim && t > hd.volgendeWandel) {
    hd.doelX = Math.random() < 0.35 ? 0 : (Math.random() - 0.5) * W * 0.45;
    hd.volgendeWandel = t + 3500 + Math.random() * 4000;
  }
  const stap = (hd.doelX - hd.px) * 0.04;
  if (Math.abs(stap) > 0.05) hd.px += stap;
  const loopt = Math.abs(stap) > 0.4;
  const p = hdPlek();

  const o = { t, stemming: 'blij', spiegel: hd.doelX < hd.px - 2 };
  if (loopt) o.dy = -Math.abs(Math.sin(t / 110)) * p.h * 0.04;
  if (hd.stand.slaapt) {
    o.stemming = 'slaap';
    if (t > zzzTimer) {
      zzzTimer = t + 900;
      const z = hdDeeltje('zzz', p.x + p.h * 0.2, p.y - p.h * 0.75);
      z.vx = 0.5 * dpr;
      z.vy = -0.7 * dpr;
      z.max = 90;
    }
  }

  let x = p.x;
  let y = p.y;
  const a = hd.anim;
  if (a) {
    const f = Math.min(1, (t - a.t0) / a.dur);
    if (a.wat === 'hop') {
      o.dy = -Math.abs(Math.sin(f * Math.PI * 3)) * p.h * 0.28;
      o.stemming = 'juich';
    } else if (a.wat === 'juich') {
      o.dy = -Math.abs(Math.sin(f * Math.PI * 2)) * p.h * 0.12;
      o.stemming = 'juich';
    } else if (a.wat === 'salto') {
      o.dy = -Math.sin(f * Math.PI) * p.h * 0.55;
      o.draai = f * Math.PI * 2;
      o.stemming = 'juich';
    } else if (a.wat === 'eet') {
      o.stemming = f > 0.3 ? 'eet' : 'blij';
      o.plet = f > 0.3 ? Math.abs(Math.sin(f * 30)) * 0.05 : 0;
      if (f < 0.3) {
        g.font = `${p.h * 0.22}px sans-serif`;
        g.textAlign = 'center';
        g.fillText('🍬', x, y - p.h * 1.3 + (f / 0.3) * p.h * 0.75);
      }
    } else if (a.wat === 'kunst') {
      o.stemming = 'juich';
      o.dy = -Math.abs(Math.sin(f * Math.PI)) * p.h * 0.08;
      hdKunstDeeltjes(d, p, o);
    } else if (a.wat === 'vlieg') {
      x = p.x + Math.sin(f * Math.PI * 2) * W * 0.28;
      o.dy = -Math.sin(f * Math.PI) * H * 0.26;
      o.flap = Math.sin(t / 60) * 0.5;
      o.spiegel = Math.cos(f * Math.PI * 2) < 0;
      o.stemming = 'juich';
      o.armen = Math.sin(t / 60) * 0.4;
    } else if (a.wat === 'groei') {
      o.stemming = 'juich';
      const r = p.h * (0.4 + f * 0.8);
      g.strokeStyle = `rgba(255,230,140,${1 - f})`;
      g.lineWidth = 6 * dpr;
      g.beginPath();
      g.arc(x, y - p.h * 0.45, r, 0, Math.PI * 2);
      g.stroke();
    }
    if (a.wat === 'uit') {
      // eerst het ei dat schudt en barst, dan een flits
      if (f < 0.75) {
        HdArt.teken(g, { ...d, fase: 0 }, x + Math.sin(t / 30) * p.h * 0.02 * f * 3, y, p.h * 0.8, { t, klaar: f / 0.75 });
      } else {
        const w = 1 - (f - 0.75) / 0.25;
        HdArt.teken(g, d, x, y, p.h, o);
        g.fillStyle = `rgba(255,255,255,${w})`;
        g.fillRect(0, 0, W, H);
      }
    }
    if (f >= 1) hd.anim = null;
    if (a.wat === 'uit') {
      hdTekenDeeltjes();
      return;
    }
  }

  if (!d.fase) {
    const klaar = 1 - Math.min(1, hd.stand.nogTotUit / 5);
    HdArt.teken(g, d, x, y, p.h * 0.8, { t, klaar });
  } else HdArt.teken(g, d, x, y, p.h, o);

  if (hd.modus === 'spel') hdSpelTeken(t);
  hdTekenDeeltjes();
}
requestAnimationFrame(hdLus);

// Het kunstje van elke soort: vuur, een lichtflits, sterren, een windvlaag of laserlicht.
function hdKunstDeeltjes(d, p, o) {
  const mond = { x: p.x + (o.spiegel ? -1 : 1) * p.h * 0.05, y: p.y - p.h * 0.62 };
  const soort = { draak: 'vuur', vos: 'flits', uil: 'ster', griffioen: 'wind', robo: 'laser' }[d.soort];
  if (Math.random() < 0.6) {
    const n = hdDeeltje(soort, mond.x, mond.y);
    const kant = o.spiegel ? -1 : 1;
    if (soort === 'vuur') {
      n.vx = kant * (3 + Math.random() * 2) * dpr;
      n.vy = (Math.random() - 0.6) * dpr;
      n.r = 6 * dpr;
    } else if (soort === 'ster') {
      n.x = p.x + (Math.random() - 0.5) * cv.width * 0.6;
      n.y = 0;
      n.vx = 0;
      n.vy = (2 + Math.random() * 2) * dpr;
      n.max = 80;
    } else if (soort === 'wind') {
      n.vx = kant * 4 * dpr;
      n.vy = (Math.random() - 0.5) * 1.5 * dpr;
    } else if (soort === 'laser') {
      // uit de ogen, links en rechts
      const k2 = Math.random() < 0.5 ? -1 : 1;
      n.x = p.x + k2 * p.h * 0.12;
      n.y = p.y - p.h * 0.72;
      n.vx = k2 * 9 * dpr;
      n.vy = (Math.random() - 0.5) * 2 * dpr;
      n.max = 40;
    } else {
      n.x = p.x;
      n.y = p.y - p.h * 0.45;
      n.vx = 0;
      n.vy = 0;
      n.r = p.h * 0.1;
      n.max = 30;
    }
  }
}

// ---------- Sterren vangen ----------

function hdSpelTeken(t) {
  const s = hd.spel;
  const rest = SPEL_TIJD - (t - s.t0);
  if (rest <= 0) return hdSpelEinde();
  if (t > s.volgende) {
    s.volgende = t + 550 + Math.random() * 350;
    s.sterren.push({ x: cv.width * (0.1 + Math.random() * 0.8), y: cv.height * (0.12 + Math.random() * 0.45), t0: t, r: Math.min(cv.width, cv.height) * 0.045 });
  }
  s.sterren = s.sterren.filter(st => t - st.t0 < 1800);
  for (const st of s.sterren) {
    const f = (t - st.t0) / 1800;
    const r = st.r * (f < 0.15 ? f / 0.15 : f > 0.8 ? (1 - f) / 0.2 : 1);
    g.shadowColor = '#fff27a';
    g.shadowBlur = 16 * dpr;
    g.fillStyle = '#ffe14a';
    HdArt.ster(g, st.x, st.y, r);
    g.fill();
    g.shadowBlur = 0;
  }
  hdSpelbalk(`⭐ ${s.score} gevangen · nog ${Math.ceil(rest / 1000)} s`);
}

// ---------- Tikken, aaien en poetsen ----------

function hdPunt(e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
}
function hdOpDier(x, y) {
  const p = hdPlek();
  return Math.abs(x - p.x) < p.h * 0.45 && y < p.y + p.h * 0.05 && y > p.y - p.h * 1.05;
}

let wrijf = null;
cv.addEventListener('pointerdown', e => {
  if (!hd.stand || !hd.stand.dier) return;
  const [x, y] = hdPunt(e);
  if (hd.modus === 'poets') {
    wrijf = { x, y };
    cv.setPointerCapture(e.pointerId);
    return;
  }
  if (hd.modus === 'spel') {
    const s = hd.spel;
    const raak = s.sterren.find(st => Math.hypot(st.x - x, st.y - y) < st.r * 1.6);
    if (raak) {
      s.sterren = s.sterren.filter(st => st !== raak);
      s.score++;
      sfx.marker();
      for (let i = 0; i < 5; i++) hdDeeltje('ster', raak.x, raak.y);
      hd.doelX = Math.max(-cv.width * 0.35, Math.min(cv.width * 0.35, raak.x - cv.width / 2));
      hdAnim('hop', 400);
    }
    return;
  }
  if (hd.anim) return;
  if (!hdOpDier(x, y)) return;
  if (!hd.stand.dier.fase) {
    hdAnim('juich', 500);
    sfx.tick();
    return hdBallon(`Nog ${hd.stand.nogTotUit} Eer, dan kom ik uit!`);
  }
  if (hd.stand.slaapt) return hdBallon('Sst… je huisdier slaapt. Maak het wakker met de knop.');
  // Aaien: hartjes!
  hdAnim('juich', 700);
  sfx.good();
  for (let i = 0; i < 5; i++) hdDeeltje('hart');
});
cv.addEventListener('pointermove', e => {
  if (hd.modus !== 'poets') return;
  const [x, y] = hdPunt(e);
  // Ook met de muis of het touchpad zonder klikken: over het huisdier bewegen telt.
  const vorige = wrijf || hd.muis;
  hd.muis = { x, y };
  if (!vorige || !hdOpDier(x, y)) return;
  const afstand = Math.hypot(x - vorige.x, y - vorige.y) / dpr;
  if (wrijf) wrijf = { x, y };
  if (afstand > 0 && afstand < 200) hdPoetsWrijf(afstand);
});
const wrijfLos = () => { wrijf = null; };
cv.addEventListener('pointerup', wrijfLos);
cv.addEventListener('pointercancel', wrijfLos);
cv.addEventListener('pointerleave', () => { wrijf = null; hd.muis = null; });

// ---------- Verbinding ----------

socket.on('connect', () => hdLaad());
socket.on('bu-eer', () => hd.stand && hdLaad());
// Eer uit een spel dat net gespeeld werd: af en toe opnieuw vragen (zo komt je ei uit of groeit je huisdier).
setInterval(() => {
  if (hd.stand && document.visibilityState === 'visible' && !hd.modus && !hd.bezig) hdLaad();
}, 30000);

// Start de leerkracht een spel, dan tonen we een knop om mee te doen.
const hdSpellen = {};
socket.onAny((event, s) => {
  if (!s || typeof s !== 'object' || typeof s.phase !== 'string' || !/(^|-)state$/.test(event)) return;
  hdSpellen[event] = !['idle', 'einde', 'end', 'podium'].includes(s.phase);
  $('hd-start-banner').classList.toggle('hidden', !Object.values(hdSpellen).some(Boolean));
});
