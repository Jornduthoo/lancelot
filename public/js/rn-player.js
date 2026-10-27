// Het Runenraadsel op de gsm of Chromebook: elke dag een geheim woord in zes pogingen.
// De server kiest het woord en kleurt de pogingen; het woord zelf komt pas als het raadsel klaar is.
// Gebruikt sfx en confetti uit fx.js, Avatar uit avatar.js. av-player.js en klas-kies.js gebruiken store, socket en $ van hier.

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

const RN_NIVEAUS = [
  { id: 'page', naam: 'Page', uitleg: 'met hulp' },
  { id: 'schildknaap', naam: 'Schildknaap', uitleg: 'het doel' },
  { id: 'ridder', naam: 'Ridder', uitleg: 'uitdaging' },
];
const RN_RIJEN = [['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'], ['enter', 'w', 'x', 'c', 'v', 'b', 'n', 'back']];

const rn = {
  naam: store('lancelot-name') || '',
  stand: null,
  niveau: null,
  typen: '',
  bezig: false,
  // Welke pogingen al omgedraaid zijn (per niveau), zodat alleen de nieuwe rij flipt.
  getoond: {},
};

function rnDag(dag) {
  const d = new Date(`${dag}T12:00:00`);
  return d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function rnToon(scherm) {
  $('rn-join').classList.toggle('hidden', scherm !== 'join');
  $('rn-spel').classList.toggle('hidden', scherm !== 'spel');
  $('rn-tellers').classList.toggle('hidden', scherm !== 'spel');
}

function rnLaad(naam = rn.naam, first = false) {
  if (!naam) return rnToon('join');
  socket.emit('rn-get', naam, res => {
    if (!res || res.error) {
      $('rn-join-error').textContent = (res && res.error) || '';
      return rnToon('join');
    }
    rn.naam = res.naam;
    store('lancelot-name', res.naam);
    socket.emit('hier', { naam: res.naam, waar: 'runen' });
    rn.stand = res;
    if (!rn.niveau || first) rn.niveau = rnKies(res);
    rnToon('spel');
    rnRender();
  });
}

// Eerst je eigen niveau; is dat klaar, dan het eerste dat nog open is.
function rnKies(s) {
  const open = n => ['nieuw', 'bezig'].includes(s.levels[n].status);
  if (open(s.eigen)) return s.eigen;
  const ander = RN_NIVEAUS.find(n => open(n.id));
  return ander ? ander.id : s.eigen;
}

$('rn-join').addEventListener('submit', e => {
  e.preventDefault();
  const naam = $('rn-name').value.trim();
  if (!naam) return;
  rn.naam = naam;
  rnLaad(naam, true);
});
$('rn-name').value = rn.naam;
$('rn-switch').addEventListener('click', () => klasSwitch());

// ---------- Tekenen ----------

function rnRender() {
  const s = rn.stand;
  const lv = s.levels[rn.niveau];
  $('rn-dag').textContent = rnDag(s.dag);
  $('rn-runen').textContent = s.runen;
  $('rn-reeks').textContent = s.reeks;

  // De drie niveaus als tabbladen.
  const box = $('rn-niveaus');
  box.innerHTML = '';
  for (const n of RN_NIVEAUS) {
    const l = s.levels[n.id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `rn-niveau${n.id === rn.niveau ? ' on' : ''}${n.id === s.eigen ? ' eigen' : ''} ${l.status}`;
    const mark = l.status === 'opgelost' ? '✓' : l.status === 'mislukt' ? '✗' : `${l.lengte}`;
    b.innerHTML = `<b>${mark}</b><span>${n.naam}</span><small>${n.id === s.eigen ? 'jouw niveau' : `${l.lengte} letters`}</small>`;
    b.addEventListener('click', () => {
      if (rn.niveau === n.id) return;
      rn.niveau = n.id;
      rn.typen = '';
      rnMelding('');
      sfx.tick();
      rnRender();
    });
    box.appendChild(b);
  }

  $('rn-hulp').classList.toggle('hidden', !lv.hulp || lv.status === 'opgelost' || lv.status === 'mislukt');
  $('rn-hulp').innerHTML = lv.hulp ? `<b>Hulp:</b> ${rnEsc(lv.hulp)}` : '';
  if (!lv.hulp && lv.hulpNa && lv.status !== 'opgelost' && lv.status !== 'mislukt') {
    const fout = lv.pogingen.length;
    if (fout > 0) {
      $('rn-hulp').classList.remove('hidden');
      $('rn-hulp').innerHTML = `<span class="muted">De betekenis verschijnt na ${lv.hulpNa} pogingen (nog ${lv.hulpNa - fout}).</span>`;
    }
  }

  rnGrid(lv);
  rnKeys(lv);
  rnKlaar(lv);
  rnZij(s);
}

const rnEsc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function rnGrid(lv) {
  const grid = $('rn-grid');
  grid.style.setProperty('--n', lv.lengte);
  grid.innerHTML = '';
  const al = rn.getoond[rn.niveau] || 0;
  const klaar = lv.status === 'opgelost' || lv.status === 'mislukt';
  for (let r = 0; r < lv.max; r++) {
    const row = document.createElement('div');
    row.className = 'rn-rij';
    const p = lv.pogingen[r];
    const actief = !p && r === lv.pogingen.length && !klaar;
    if (actief) row.classList.add('actief');
    for (let i = 0; i < lv.lengte; i++) {
      const t = document.createElement('div');
      t.className = 'rn-tegel';
      if (p) {
        t.textContent = p.w[i];
        t.classList.add(p.k[i]);
        if (r >= al) {
          t.classList.add('flip');
          t.style.animationDelay = `${i * 180}ms`;
        }
        if (lv.status === 'opgelost' && r === lv.pogingen.length - 1 && r >= al) {
          t.classList.add('winst');
          t.style.setProperty('--wd', `${lv.lengte * 180 + 200 + i * 90}ms`);
        }
      } else if (actief && rn.typen[i]) {
        t.textContent = rn.typen[i];
        t.classList.add('vol');
      }
      row.appendChild(t);
    }
    grid.appendChild(row);
  }
  rn.getoond[rn.niveau] = lv.pogingen.length;
}

// De kleur van elke letter op het toetsenbord: groen wint van oranje, oranje van grijs.
function rnLetterKleuren(lv) {
  const rang = { x: 1, o: 2, g: 3 };
  const out = {};
  for (const p of lv.pogingen) {
    for (let i = 0; i < p.w.length; i++) {
      const k = p.k[i];
      if (!out[p.w[i]] || rang[k] > rang[out[p.w[i]]]) out[p.w[i]] = k;
    }
  }
  return out;
}

function rnKeys(lv) {
  const box = $('rn-keys');
  const kleuren = rnLetterKleuren(lv);
  const klaar = lv.status === 'opgelost' || lv.status === 'mislukt';
  box.classList.toggle('hidden', klaar);
  box.innerHTML = '';
  for (const rij of RN_RIJEN) {
    const r = document.createElement('div');
    r.className = 'rn-key-rij';
    for (const k of rij) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `rn-key ${kleuren[k] || ''}${k.length > 1 ? ' breed' : ''}`;
      b.textContent = k === 'enter' ? 'OK' : k === 'back' ? '⌫' : k;
      b.addEventListener('click', () => rnToets(k));
      r.appendChild(b);
    }
    box.appendChild(r);
  }
}

function rnKlaar(lv) {
  const klaar = lv.status === 'opgelost' || lv.status === 'mislukt';
  $('rn-klaar').classList.toggle('hidden', !klaar);
  if (!klaar) return;
  const n = lv.pogingen.length;
  $('rn-klaar').classList.toggle('mislukt', lv.status === 'mislukt');
  $('rn-klaar-kop').textContent = lv.status === 'opgelost'
    ? (n === 1 ? 'Ongelooflijk! In één keer!' : n <= 3 ? `Meesterlijk! In ${n} pogingen.` : `Gekraakt in ${n} pogingen!`)
    : 'Net niet... Het woord was:';
  $('rn-woord').innerHTML = [...lv.woord].map(c => `<span>${c}</span>`).join('');
  $('rn-betekenis').innerHTML = lv.betekenis ? `<b>Betekenis:</b> ${rnEsc(lv.betekenis)}` : '<span class="muted">Vraag de betekenis aan je leerkracht of zoek ze op.</span>';
  $('rn-zin').textContent = lv.zin ? `“${lv.zin}”` : '';
  const s = rn.stand;
  $('rn-verdiend').innerHTML = s.vandaag.map(v => `<li><span>${rnEsc(v.wat)}</span><b>+${v.n}</b></li>`).join('');
  const open = RN_NIVEAUS.filter(x => ['nieuw', 'bezig'].includes(s.levels[x.id].status));
  $('rn-verder').textContent = open.length ? `Zin in meer? Probeer ook ${open.map(x => x.naam).join(' of ')} (+1 rune).` : 'Morgen wacht een nieuw raadsel.';
}

function rnZij(s) {
  const k = s.krans;
  $('rn-krans-naam').textContent = k.niveau ? k.naam : 'Nog geen krans';
  const vorige = k.drempels[k.niveau];
  const pct = k.volgende ? Math.round(((s.runen - vorige) / (k.volgende.runen - vorige)) * 100) : 100;
  $('rn-krans-balk').style.width = `${Math.max(3, Math.min(100, pct))}%`;
  $('rn-krans-volgende').textContent = k.volgende
    ? `Nog ${k.volgende.runen - s.runen} ${k.volgende.runen - s.runen === 1 ? 'rune' : 'runen'} tot ${k.volgende.naam}.`
    : 'Je hebt de mooiste krans!';
  rnRidder();
  const d = s.klasdoel;
  $('rn-klas-balk').style.width = `${Math.min(100, Math.round((d.gekraakt / Math.max(1, d.nodig)) * 100))}%`;
  $('rn-klas-tekst').textContent = d.gehaald
    ? `Gehaald! ${d.gekraakt} ridders kraakten het. Iedereen die het kraakte krijgt een rune extra.`
    : `${d.gekraakt} van de ${d.nodig} nodig. Samen halen we het!`;
}

// Je eigen ridder met de krans die je al mag dragen.
function rnRidder() {
  const c = $('rn-ridder');
  const mine = Avatar.mine();
  if (!mine || !rn.stand) return;
  const src = Avatar.sprite({ ...mine, runen: rn.stand.krans.niveau }, { k: 6 });
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
}

// Een nieuwe krans verdiend: je ridder draagt hem meteen (je kunt hem bij "Pas je ridder aan" weer uitzetten).
function rnNieuweKrans(k) {
  if (typeof avState === 'undefined') return;
  avState.mine = { ...avState.mine, runen: k.niveau };
  store('lancelot-avatar', JSON.stringify(avState.mine));
  Avatar.setMine(avState.mine);
  avSend(rn.naam);
  avPaint();
  rnRidder();
  setTimeout(() => {
    rnMelding(`Nieuwe krans: ${k.naam}! Je ridder draagt hem nu in elk spel.`);
    $('rn-ridder').classList.add('nieuw');
  }, 1800);
}

function rnMelding(text, slecht) {
  const m = $('rn-melding');
  m.textContent = text;
  m.classList.toggle('slecht', !!slecht);
}

function rnSchud() {
  const row = $('rn-grid').querySelector('.rn-rij.actief');
  if (!row) return;
  row.classList.remove('schud');
  void row.offsetWidth;
  row.classList.add('schud');
}

// ---------- Typen en raden ----------

function rnToets(k) {
  const lv = rn.stand && rn.stand.levels[rn.niveau];
  if (!lv || rn.bezig || lv.status === 'opgelost' || lv.status === 'mislukt') return;
  if (k === 'enter') return rnRaad();
  if (k === 'back') rn.typen = rn.typen.slice(0, -1);
  else if (/^[a-z]$/.test(k) && rn.typen.length < lv.lengte) {
    rn.typen += k;
    sfx.tick();
  } else return;
  rnMelding('');
  rnGrid(lv);
}

function rnRaad() {
  const lv = rn.stand.levels[rn.niveau];
  if (rn.typen.length < lv.lengte) {
    rnMelding(`Typ ${lv.lengte} letters.`, true);
    rnSchud();
    return;
  }
  rn.bezig = true;
  const niveau = rn.niveau;
  socket.emit('rn-raad', { naam: rn.naam, niveau, woord: rn.typen }, res => {
    rn.bezig = false;
    if (!res || res.error) {
      rnMelding((res && res.error) || 'Er ging iets mis.', true);
      rnSchud();
      sfx.empty();
      return;
    }
    rn.typen = '';
    const nieuweKrans = res.krans.niveau > rn.stand.krans.niveau;
    rn.stand = res;
    rnRender();
    if (nieuweKrans) rnNieuweKrans(res.krans);
    const nu = res.levels[niveau];
    const wacht = nu.lengte * 180 + 350;
    if (nu.status === 'opgelost') {
      setTimeout(() => {
        sfx.fanfare ? sfx.fanfare() : sfx.good();
        confetti(3500);
        if (res.nieuweRunen) rnMelding(`+${res.nieuweRunen} ${res.nieuweRunen === 1 ? 'rune' : 'runen'}!`);
      }, wacht);
    } else if (nu.status === 'mislukt') {
      setTimeout(() => sfx.bad(), wacht);
    } else {
      setTimeout(() => sfx.marker(), wacht);
    }
  });
}

document.addEventListener('keydown', e => {
  if ($('rn-spel').classList.contains('hidden')) return;
  if ($('av-maker') && !$('av-maker').classList.contains('hidden')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key === 'Enter' ? 'enter' : e.key === 'Backspace' ? 'back' : e.key.toLowerCase();
  if (k === 'enter' || k === 'back' || /^[a-z]$/.test(k)) {
    e.preventDefault();
    rnToets(k);
  }
});

// ---------- Verbinding ----------

socket.on('connect', () => rnLaad(rn.naam, !rn.stand));

// Een nieuwe dag terwijl het scherm openstaat (of na het weekend): opnieuw laden.
setInterval(() => {
  if (rn.stand && document.visibilityState === 'visible') {
    const p = n => String(n).padStart(2, '0');
    const d = new Date();
    if (`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` !== rn.stand.dag) rnLaad(rn.naam, true);
  }
}, 60000);

// Start de leerkracht een spel, dan tonen we een knop om mee te doen.
const rnSpellen = {};
socket.onAny((event, s) => {
  if (!s || typeof s !== 'object' || typeof s.phase !== 'string' || !/(^|-)state$/.test(event)) return;
  rnSpellen[event] = !['idle', 'einde', 'end', 'podium'].includes(s.phase);
  $('rn-start-banner').classList.toggle('hidden', !Object.values(rnSpellen).some(Boolean));
});

document.addEventListener('DOMContentLoaded', () => {
  $('rn-ridder-knop').addEventListener('click', () => avOpen());
  const done = $('av-done');
  if (done) done.addEventListener('click', () => setTimeout(rnRidder, 50));
});
