// Eigen ridders: elke leerling stelt een ridder samen (helm, harnas, vizier, schild en een accent).
// LANcelot onthoudt hem op de naam van de leerling, en de spellen tekenen hem in pixelkunst.
// Avatar.byName(naam) geeft de ridder van een leerling (of null), Avatar.sprite(...) een tekening.
const Avatar = (() => {
  const COLORS = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff', '#9be15d', '#e8edf5'];
  const VISORS = ['#4cc9ff', '#ff4d6d', '#ffc94a', '#2ee6a6', '#c77dff'];
  const SHIELDS = ['#3d8bff', '#ff4d6d', '#22c993', '#a66bff', '#1b2740', '#ffb703', '#ff8c42', '#e8edf5'];

  // Helmen: vijf rijen (onder het accent). S = staal, s = schaduw, V = vizier, C = kleur van het harnas, F = gezicht.
  const HELMS = [
    { name: 'Ridderhelm', rows: ['...SSSSSS...', '..SSSSSSSS..', '..SVVVVVVS..', '..SSSSSSSS..', '...SSSSSS...'] },
    { name: 'Emmerhelm', rows: ['..SSSSSSSS..', '..SSSSSSSS..', '..SVVsSVVS..', '..SSSSSSSS..', '..SsSSSSsS..'] },
    { name: 'Spitshelm', rows: ['....SSSS....', '...SSSSSS...', '..SSVVVVSS..', '..SsSSSSsS..', '...SSSSSS...'] },
    { name: 'Neonhelm', rows: ['...SSSSSS...', '..VSSSSSSV..', '..VVVVVVVV..', '..SSSSSSSS..', '...sSSSSs...'] },
    { name: 'Kap', rows: ['...CCCCCC...', '..CCCCCCCC..', '..CCFFFFCC..', '..CFEFFEFC..', '...CFFFFC...'] },
    { name: 'Open helm', rows: ['...SSSSSS...', '..SSSSSSSS..', '..SFEFFEFS..', '..SFFFFFFS..', '...SFFFFS...'] },
  ];
  // Accent bovenop de helm: twee rijen.
  const ACCENTS = [
    { name: 'Geen', rows: ['............', '............'] },
    { name: 'Pluim', rows: ['.....CC.....', '....CCCC....'] },
    { name: 'Hoorns', rows: ['.W........W.', '.WW......WW.'] },
    { name: 'Kroon', rows: ['...G.GG.G...', '...GGGGGG...'] },
    { name: 'Antenne', rows: ['.......V....', '.......s....'] },
    { name: 'Vleugels', rows: ['.WW......WW.', '..WW....WW..'] },
  ];
  // Schild op de arm: vier rijen van vier. D = veld, E = teken.
  const PATTERNS = [
    { name: 'Effen', rows: ['DDDD', 'DDDD', 'DDDD', '.DD.'] },
    { name: 'Gedeeld', rows: ['DDEE', 'DDEE', 'DDEE', '.DE.'] },
    { name: 'Kruis', rows: ['DEED', 'EEEE', 'DEED', '.ED.'] },
    { name: 'Band', rows: ['DDDD', 'EEEE', 'DDDD', '.DD.'] },
    { name: 'Dambord', rows: ['DEDE', 'EDED', 'DEDE', '.ED.'] },
    { name: 'Punt', rows: ['EDDE', 'DEED', 'DDDD', '.DD.'] },
  ];
  // Het lichaam van voren (rijen 7 tot 16). Het schild komt op de rijen 8 tot 11, rechts.
  const BODY = [
    '.CCSSGGSSCC.',
    'CCSSSSSSSSCC',
    'CsSSSCCSSSsC',
    'C.sSSCCSSs.C',
    '..SSSSSSSS..',
    '..SSGGGGSS..',
    '..SS....SS..',
    '..SS....SS..',
    '..BB....BB..',
    '.BBB....BBB.',
  ];
  const BODY_BACK = [
    '.CCCCCCCCCC.',
    'CCCCCCCCCCCC',
    'CsCCCCCCCCsC',
    'C.CCCCCCCC.C',
    '..CCCCCCCC..',
    '..SCCCCCCS..',
    '..SS....SS..',
    '..SS....SS..',
    '..BB....BB..',
    '.BBB....BBB.',
  ];
  const BASE = { S: '#c9d6e6', s: '#7d8ba3', G: '#ffc94a', B: '#2b3550', W: '#f2efe6', F: '#ffd8b8', E: '#1a1a2e' };
  const KEYS = { helm: HELMS.length, accent: ACCENTS.length, kleur: COLORS.length, vizier: VISORS.length, patroon: PATTERNS.length, schild: SHIELDS.length };

  const pick = n => Math.floor(Math.random() * n);
  function random() {
    const av = {};
    for (const [k, n] of Object.entries(KEYS)) av[k] = pick(n);
    if (av.schild === av.kleur % SHIELDS.length) av.schild = (av.schild + 1) % SHIELDS.length;
    return av;
  }

  function clean(av) {
    if (!av || typeof av !== 'object') return null;
    const out = {};
    for (const [k, n] of Object.entries(KEYS)) {
      const v = Number(av[k]);
      out[k] = Number.isInteger(v) && v >= 0 && v < n ? v : 0;
    }
    return out;
  }

  // De pixelkaart van een ridder: 17 rijen van 12, plus het palet.
  // opts.back: van achteren; opts.armor: harnaskleur opleggen (bijvoorbeeld de kleur van het team).
  function map(av, opts = {}) {
    const a = clean(av) || random();
    const armor = opts.armor || COLORS[a.kleur];
    const helm = HELMS[a.helm].rows.map(r => (opts.back ? r.replace(/V/g, 'S').replace(/[FE]/g, 'C') : r));
    const rows = [...ACCENTS[a.accent].rows, ...helm, ...(opts.back ? BODY_BACK : BODY)];
    if (!opts.back) {
      PATTERNS[a.patroon].rows.forEach((pr, i) => {
        const r = rows[8 + i].split('');
        [...pr].forEach((ch, j) => { if (ch !== '.') r[8 + j] = ch; });
        rows[8 + i] = r.join('');
      });
    }
    // Het teken op het schild: goud, of donker op een licht veld.
    const field = SHIELDS[a.schild];
    const mark = field === '#ffb703' || field === '#e8edf5' ? '#1b2740' : '#ffc94a';
    return { rows, palette: { ...BASE, C: armor, V: VISORS[a.vizier], D: field, E: mark } };
  }

  const cache = new Map();
  // Een canvas met de ridder, k pixels per blokje.
  function sprite(av, opts = {}) {
    const k = opts.k || 4;
    const key = JSON.stringify([clean(av), opts.back || false, opts.armor || '', k]);
    if (cache.has(key)) return cache.get(key);
    const { rows, palette } = map(av, opts);
    const c = document.createElement('canvas');
    c.width = 12 * k;
    c.height = rows.length * k;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      // Ogen in het gezicht zijn altijd donker, ook als E op het schild een andere kleur heeft.
      g.fillStyle = ch === 'E' && y < 8 ? BASE.E : palette[ch];
      g.fillRect(x * k, y * k, k, k);
    }));
    if (cache.size > 400) cache.clear();
    cache.set(key, c);
    return c;
  }

  // Enkel het hoofd (accent en helm), voor kleine plaatsen zoals de racer.
  function head(av, k = 4) {
    const key = JSON.stringify(['hoofd', clean(av), k]);
    if (cache.has(key)) return cache.get(key);
    const full = sprite(av, { k });
    const c = document.createElement('canvas');
    c.width = full.width;
    c.height = 7 * k;
    c.getContext('2d').drawImage(full, 0, 0);
    cache.set(key, c);
    return c;
  }

  // Ridders van alle leerlingen, op naam (kleine letters). Komt van de server.
  let all = {};
  const listeners = [];
  function setAll(map) {
    all = map || {};
    for (const fn of listeners) fn();
  }
  const byName = name => (name ? all[String(name).trim().toLowerCase()] || null : null);
  // Op de gsm: je eigen ridder, ook als de server hem nog niet kent.
  let mine = null;
  const setMine = m => { mine = m; };

  // Een klein canvas als element, voor lijsten en lobby's.
  function chip(av, cls = 'av-chip') {
    const src = sprite(av, { k: 3 });
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    c.className = cls;
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }

  return {
    COLORS, VISORS, SHIELDS, HELMS, ACCENTS, PATTERNS, KEYS,
    random, clean, sprite, head, chip, byName, setAll, setMine, mine: () => mine, all: () => all, onChange: fn => listeners.push(fn),
  };
})();

// Overal waar een leerling bij naam staat, zijn ridder ervoor zetten:
// lobby's (.names .name), eindstanden (ol.ranking li), het podium (.pillar .who) en alles met data-av="naam".
(() => {
  if (typeof document === 'undefined') return;
  const firstText = el => {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim();
    return el.textContent.trim();
  };
  function decorate(el, name) {
    const av = Avatar.byName(name);
    const old = el.querySelector(':scope > .av-chip');
    if (old && old.dataset.for === JSON.stringify(av)) return;
    if (old) old.remove();
    if (!av) return;
    const c = Avatar.chip(av);
    c.dataset.for = JSON.stringify(av);
    el.prepend(c);
  }
  function scan(root = document) {
    for (const el of root.querySelectorAll('.names .name')) decorate(el, firstText(el));
    for (const el of root.querySelectorAll('ol.ranking li')) {
      const span = el.querySelector('.pos + span') || el;
      decorate(span, span.textContent);
    }
    for (const el of root.querySelectorAll('.pillar .who')) decorate(el, el.textContent);
    for (const el of root.querySelectorAll('[data-av]')) decorate(el, el.dataset.av);
  }
  let queued = false;
  const later = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); });
  };
  Avatar.onChange(later);
  const start = () => new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  // Elke pagina heeft een socket; daarlangs komen de ridders van de server.
  const hook = () => {
    if (typeof socket === 'undefined') return setTimeout(hook, 50);
    socket.on('avatars', map => Avatar.setAll(map));
    socket.emit('avatars-get', null, map => Avatar.setAll(map));
  };
  hook();
})();
