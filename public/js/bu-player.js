// Mijn burcht op de gsm of Chromebook: je Eer, je rang, je wapenschilden en je eigen eiland om op te bouwen.
// Bouwen kan alleen tijdens Kasteeltijd (die zet de leerkracht aan). De server controleert prijs, rang en grond.
// Gebruikt Burcht (bu-catalogus.js), BuArt (bu-art.js), Avatar (avatar.js), sfx en confetti (fx.js).
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

const socket = io({ autoConnect: false });
document.addEventListener('DOMContentLoaded', () => socket.connect());
const $ = id => document.getElementById(id);

const bu = {
  naam: store('lancelot-name') || '',
  stand: null,
  tab: 'stuk',
  keuze: 'toren',
  hover: null,
  bezig: false,
  beeld: null, // het gebakken eiland
};

function buToon(scherm) {
  $('bu-join').classList.toggle('hidden', scherm !== 'join');
  $('bu-spel').classList.toggle('hidden', scherm !== 'spel');
  $('bu-tellers').classList.toggle('hidden', scherm !== 'spel');
}

function buLaad(naam = bu.naam) {
  if (!naam) return buToon('join');
  socket.emit('bu-get', naam, res => {
    if (!res || res.error) {
      $('bu-join-error').textContent = (res && res.error) || '';
      return buToon('join');
    }
    bu.naam = res.naam;
    store('lancelot-name', res.naam);
    buToon('spel');
    buZet(res);
  });
}

$('bu-join').addEventListener('submit', e => {
  e.preventDefault();
  const naam = $('bu-name').value.trim();
  if (naam) buLaad(naam);
});
$('bu-name').value = bu.naam;
$('bu-switch').addEventListener('click', () => klasSwitch());

// ---------- Een nieuwe stand van de server ----------

function buZet(s) {
  const vorige = bu.stand;
  bu.stand = s;
  const kleur = Burcht.KLEUREN[s.burcht.kleur] || Burcht.KLEUREN[0];
  const rang = Burcht.RANGEN[s.rang];
  $('bu-burchtnaam').textContent = s.burcht.naam || `Burcht van ${s.naam}`;
  $('bu-rang').textContent = `${s.naam} · ${rang.naam}`;
  $('bu-saldo').textContent = s.saldo;
  $('bu-reeks').textContent = s.reeks;
  $('bu-slot').classList.toggle('hidden', s.kasteeltijd);
  $('bu-tijd').classList.toggle('hidden', !s.kasteeltijd);
  $('bu-bouw').classList.toggle('dicht', !s.kasteeltijd);

  // Rang en voortgang
  $('bu-rang-naam').textContent = rang.naam;
  const volgende = Burcht.RANGEN[s.rang + 1];
  if (volgende) {
    const pct = ((s.eer - rang.vanaf) / (volgende.vanaf - rang.vanaf)) * 100;
    $('bu-rang-balk').style.width = `${Math.max(2, Math.min(100, pct))}%`;
    $('bu-rang-volgende').textContent = `Nog ${volgende.vanaf - s.eer} Eer tot ${volgende.naam}: dan wordt je grond ${volgende.grond} × ${volgende.grond}.`;
  } else {
    $('bu-rang-balk').style.width = '100%';
    $('bu-rang-volgende').textContent = 'De hoogste rang! Je hele grond is van jou.';
  }
  $('bu-totaal').textContent = `In totaal verdiende je ${s.eer} Eer. Daarvan zit ${s.uitgegeven} in je burcht.`;
  buRidder();

  // Wapenschilden
  const box = $('bu-schilden');
  box.innerHTML = '';
  for (const sc of Burcht.SCHILDEN) {
    const d = document.createElement('div');
    const aan = s.schilden.includes(sc.id);
    d.className = `bu-schild${aan ? ' aan' : ''}`;
    d.textContent = sc.teken;
    d.title = `${sc.naam}: ${sc.uitleg}${aan ? ' ✓' : ''}`;
    box.appendChild(d);
  }

  // Wat je verdiende
  const ul = $('bu-posten');
  ul.innerHTML = '';
  if (!s.posten.length) {
    const li = document.createElement('li');
    li.innerHTML = '<span>Speel mee in een spel om Eer te verdienen.</span>';
    ul.appendChild(li);
  }
  for (const p of s.posten.slice(0, 20)) {
    const li = document.createElement('li');
    if (p.n < 0) li.className = 'min';
    const sp = document.createElement('span');
    sp.textContent = p.wat;
    sp.title = p.wat;
    const b = document.createElement('b');
    b.textContent = `${p.n > 0 ? '+' : ''}${p.n}`;
    li.append(sp, b);
    ul.appendChild(li);
  }

  // Naam en kleur van je burcht
  if (document.activeElement !== $('bu-burcht-naam')) $('bu-burcht-naam').value = s.burcht.naam || '';
  const kl = $('bu-kleuren');
  kl.innerHTML = '';
  Burcht.KLEUREN.forEach((k, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `bu-kleur${i === s.burcht.kleur ? ' on' : ''}`;
    b.style.background = k;
    b.title = 'Kleur van je daken en banieren';
    b.addEventListener('click', () => buStijl({ kleur: i }));
    kl.appendChild(b);
  });

  buItems(kleur);
  buNieuws(vorige, s);
  buBak();
}

// Sinds je laatste bezoek: hoeveel Eer erbij kwam, en of je een rang hoger ging.
function buNieuws(vorige, s) {
  const key = `lancelot-eer-${s.id}`;
  const was = Number(store(key));
  const gezien = vorige ? vorige.eer : Number.isFinite(was) && store(key) !== null ? was : s.eer;
  const meer = s.eer - gezien;
  if (meer > 0) {
    const oudeRang = Burcht.rangVan(gezien);
    const t = $('bu-nieuw');
    if (s.rang > oudeRang) {
      t.textContent = `🎉 Je bent nu ${Burcht.RANGEN[s.rang].naam}! Je grond werd groter en je kan nieuwe dingen bouwen.`;
      if (typeof confetti === 'function') confetti(3500);
      sfx.fanfare ? sfx.fanfare() : sfx.good();
    } else {
      t.textContent = `✨ Sinds je laatste bezoek verdiende je ${meer} Eer.`;
      sfx.good();
    }
    t.classList.remove('hidden');
    const teller = $('bu-saldo').parentElement;
    teller.classList.remove('plop');
    void teller.offsetWidth;
    teller.classList.add('plop');
  }
  store(key, String(s.eer));
}

function buRidder() {
  const c = $('bu-ridder');
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const av = Avatar.byName(bu.naam);
  if (av) g.drawImage(Avatar.sprite(av, { k: 6 }), 0, 0);
}

// ---------- De bouwknoppen ----------

function buItems(kleur) {
  const s = bu.stand;
  const box = $('bu-items');
  box.innerHTML = '';
  document.querySelectorAll('.bu-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === bu.tab));
  if (bu.tab === 'weg') {
    const p = document.createElement('p');
    p.className = 'bu-uitweg';
    p.textContent = 'Tik op iets op je grond om het weg te halen. Je krijgt al je Eer terug. Tik nog eens op hetzelfde vakje om ook de vloer weg te halen.';
    box.appendChild(p);
    return;
  }
  for (const item of Burcht.STUKKEN) {
    if ((item.soort === 'grond') !== (bu.tab === 'grond')) continue;
    const b = document.createElement('button');
    b.type = 'button';
    const slot = item.rang > s.rang;
    b.className = `bu-item${bu.keuze === item.id ? ' on' : ''}${slot ? ' slot' : ''}${!slot && item.prijs > s.saldo ? ' duur' : ''}`;
    const c = document.createElement('canvas');
    c.width = 108;
    c.height = 108;
    c.getContext('2d').drawImage(BuArt.icoon(item.id, kleur, 108), 0, 0);
    const naam = document.createElement('span');
    naam.textContent = item.naam;
    const prijs = document.createElement('span');
    prijs.className = 'prijs';
    prijs.textContent = slot ? `🔒 ${Burcht.RANGEN[item.rang].naam}` : `${item.prijs} Eer`;
    b.append(c, naam, prijs);
    b.addEventListener('click', () => {
      bu.keuze = item.id;
      if (slot) buMelding(`Dit kan je bouwen vanaf ${Burcht.RANGEN[item.rang].naam}.`);
      buItems(kleur);
    });
    box.appendChild(b);
  }
}

document.querySelectorAll('.bu-tab').forEach(t => t.addEventListener('click', () => {
  bu.tab = t.dataset.tab;
  if (bu.tab !== 'weg') {
    const ok = Burcht.BY_ID[bu.keuze];
    if (!ok || (ok.soort === 'grond') !== (bu.tab === 'grond')) bu.keuze = bu.tab === 'grond' ? 'pad' : 'toren';
  }
  if (bu.stand) buItems(Burcht.KLEUREN[bu.stand.burcht.kleur]);
}));

let meldingTimer = null;
function buMelding(tekst, goed = false) {
  const m = $('bu-melding');
  m.textContent = tekst;
  m.classList.toggle('goed', goed);
  clearTimeout(meldingTimer);
  meldingTimer = setTimeout(() => { m.textContent = ''; }, 2600);
}

function buStijl(arg) {
  socket.emit('bu-stijl', { naam: bu.naam, ...arg }, res => {
    if (!res || res.error) return buMelding((res && res.error) || 'Dat lukte niet.');
    buZet(res);
  });
}
$('bu-burcht-naam').addEventListener('change', e => buStijl({ burchtnaam: e.target.value }));
$('bu-burcht-naam').addEventListener('keydown', e => {
  if (e.key === 'Enter') e.target.blur();
});

// ---------- Het eiland ----------

// De kaart van je eiland: je grond (volgens je rang) met een randje wilde weide errond, en je ridder.
function buKaart() {
  const av = Avatar.byName(bu.naam);
  return BuArt.perceelKaart(bu.stand.burcht, bu.stand.rang, av ? Avatar.sprite(av, { k: 4 }) : null);
}

const cv = $('bu-canvas');
const ctx = cv.getContext('2d');
let dpr = 1;

function buMaat() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  const w = Math.max(200, Math.round(r.width * dpr));
  const h = Math.max(160, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
    return true;
  }
  return false;
}

// Het eiland één keer tekenen in een apart canvas. Elk beeldje tekenen we dat plaatje, plus de gloed en wat je aanwijst.
function buBak() {
  if (!bu.stand || $('bu-spel').classList.contains('hidden')) return;
  buMaat();
  const k = buKaart();
  // Zo groot mogelijk, met ruimte voor torens bovenaan en de rotspunt onderaan.
  const { T, ox, oy } = BuArt.pas(k, cv.width, cv.height);
  const b = document.createElement('canvas');
  b.width = cv.width;
  b.height = cv.height;
  BuArt.teken(b.getContext('2d'), k, T, ox, oy);
  bu.beeld = { c: b, k, T, ox, oy, gloed: BuArt.gloeiers(k, T, ox, oy) };
}

let vorigeTijd = 0;
function buFrame(now) {
  requestAnimationFrame(buFrame);
  if (!bu.beeld || document.visibilityState !== 'visible') return;
  // 30 beeldjes per seconde is genoeg voor wat gloed en zweven.
  if (now - vorigeTijd < 32) return;
  vorigeTijd = now;
  const t = now / 1000;
  const { c, k, T, ox, oy, gloed } = bu.beeld;
  ctx.drawImage(BuArt.hemel(cv.width, cv.height), 0, 0);
  const dy = Math.sin(t * 0.8) * 3 * dpr;
  ctx.save();
  ctx.translate(0, dy);
  ctx.drawImage(c, 0, 0);
  BuArt.gloei(ctx, gloed, t);
  // Wat je aanwijst: een gouden ruit, en bij bouwen alvast een doorschijnend voorbeeld.
  const h = bu.hover;
  if (h && k.eigen(h[0], h[1])) {
    const sx = ox + (h[0] - h[1]) * T / 2;
    const sy = oy + (h[0] + h[1]) * T / 4;
    const kan = bu.stand.kasteeltijd;
    ctx.strokeStyle = kan ? (bu.tab === 'weg' ? '#ff4d6d' : '#ffc94a') : 'rgba(143,167,199,.6)';
    ctx.lineWidth = 2 * dpr;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8 * dpr;
    ctx.beginPath();
    ctx.moveTo(sx, sy - T / 4);
    ctx.lineTo(sx + T / 2, sy);
    ctx.lineTo(sx, sy + T / 4);
    ctx.lineTo(sx - T / 2, sy);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    const item = Burcht.BY_ID[bu.keuze];
    if (kan && bu.tab !== 'weg' && item && item.soort !== 'grond' && item.rang <= bu.stand.rang) {
      const p = BuArt.stuk(item.id, Burcht.KLEUREN[bu.stand.burcht.kleur], T);
      ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 5);
      ctx.drawImage(p.c, sx - p.ax, sy - p.ay);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
requestAnimationFrame(buFrame);

function buVakje(e) {
  if (!bu.beeld) return null;
  const r = cv.getBoundingClientRect();
  const dy = Math.sin((performance.now() / 1000) * 0.8) * 3 * dpr;
  const px = (e.clientX - r.left) * dpr;
  const py = (e.clientY - r.top) * dpr - dy;
  return BuArt.vakjeOp(px, py, bu.beeld.T, bu.beeld.ox, bu.beeld.oy);
}

cv.addEventListener('pointermove', e => { bu.hover = buVakje(e); });
cv.addEventListener('pointerleave', () => { bu.hover = null; });
cv.addEventListener('click', e => {
  const v = buVakje(e);
  bu.hover = v;
  if (!v || !bu.beeld || bu.bezig) return;
  const k = bu.beeld.k;
  if (!k.eigen(v[0], v[1])) return buMelding('Daar is je grond nog niet. Met een hogere rang wordt je eiland groter.');
  if (!bu.stand.kasteeltijd) return buMelding('Bouwen kan tijdens Kasteeltijd.');
  const [x, y] = k.sleutel(v[0], v[1]).split(',').map(Number);
  const weg = bu.tab === 'weg';
  const item = Burcht.BY_ID[bu.keuze];
  if (!weg && item && item.rang > bu.stand.rang) return buMelding(`Dit kan je bouwen vanaf ${Burcht.RANGEN[item.rang].naam}.`);
  bu.bezig = true;
  socket.emit('bu-zet', { naam: bu.naam, x, y, stuk: weg ? '' : bu.keuze }, res => {
    bu.bezig = false;
    if (!res || res.error) {
      sfx.empty();
      return buMelding((res && res.error) || 'Dat lukte niet.');
    }
    if (weg) sfx.swoosh();
    else sfx.marker();
    buZet(res);
  });
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buBak, 150);
});

// ---------- Verbinding ----------

socket.on('connect', () => {
  socket.emit('avatars-get', null, map => {
    Avatar.setAll(map);
    buLaad();
  });
});
socket.on('avatars', map => {
  Avatar.setAll(map);
  if (bu.stand) {
    buRidder();
    buBak();
  }
});
socket.on('bu-kasteeltijd', aan => {
  if (!bu.stand) return;
  bu.stand.kasteeltijd = !!aan;
  if (aan) buMelding('🏗️ Kasteeltijd! Je mag bouwen.', true);
  buZet(bu.stand);
});
socket.on('bu-eer', () => bu.stand && buLaad());
// Eer uit een spel dat net gespeeld werd: af en toe opnieuw vragen.
setInterval(() => {
  if (bu.stand && document.visibilityState === 'visible') buLaad();
}, 60000);

// Start de leerkracht een spel, dan tonen we een knop om mee te doen.
const buSpellen = {};
socket.onAny((event, s) => {
  if (!s || typeof s !== 'object' || typeof s.phase !== 'string' || !/(^|-)state$/.test(event)) return;
  buSpellen[event] = !['idle', 'einde', 'end', 'podium'].includes(s.phase);
  $('bu-start-banner').classList.toggle('hidden', !Object.values(buSpellen).some(Boolean));
});
