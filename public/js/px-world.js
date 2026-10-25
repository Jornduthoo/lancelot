// Pixelridder: de werelden zelf. Dezelfde code draait in de browser (leerling en bord) en op de server,
// zodat iedereen met hetzelfde getal (seed) precies dezelfde wereld krijgt.
// Een wereld is 15 tegels hoog en een paar honderd tegels lang; elke wereld is iets moeilijker dan de vorige.
(function (root) {
  const T = 16;             // een tegel is 16 x 16 beeldpunten
  const ROWS = 15;
  const GY = 13;            // de bovenste rij van de grond
  const H = ROWS * T;
  // Tegels. Vast: grond, baksteen, runeblok, leeg blok, steen, muntsteen, pilaar. Andere: verborgen blok, lava, munt, zweefplank.
  const AIR = 0, GROUND = 1, BRICK = 2, RUNE = 3, USED = 4, STONE = 5, COINBRICK = 6, HIDDEN = 7, PILLAR = 8, PILLARTOP = 9, LAVA = 10, COIN = 11, PLANK = 12;
  const SOLID = new Uint8Array(16);
  for (const t of [GROUND, BRICK, RUNE, USED, STONE, COINBRICK, PILLAR, PILLARTOP]) SOLID[t] = 1;
  const THEMES = [
    { key: 'weide', name: 'De Neonweide' },
    { key: 'grot', name: 'De Kristalgrot' },
    { key: 'burcht', name: 'De Burchtmuren' },
    { key: 'sterren', name: 'De Sterrenbrug' },
  ];
  // Natuurkunde van de ridder (beeldpunten en seconden).
  const PHYS = { grav: 2000, gravHold: 900, jump: 370, maxFall: 430, acc: 560, dec: 760, run: 128, air: .8 };
  const SIZE = [{ w: 12, h: 18 }, { w: 13, h: 28 }, { w: 13, h: 28 }];
  const ENEMY = { kever: { w: 14, h: 14, speed: 30 }, stekel: { w: 14, h: 14, speed: 26 }, drone: { w: 14, h: 12, speed: 0 } };
  const SHELL_SPEED = 210;
  const SHELL_WAKE = 6;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Een wereld bouwen ----------
  function make(seed, w) {
    const r = rng((seed ^ Math.imul(w + 1, 0x9e3779b1)) >>> 0);
    const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
    const theme = w % THEMES.length;
    const tk = THEMES[theme].key;
    const d = Math.min(w, 5); // moeilijkheid
    const len = 170 + Math.min(w, 4) * 18;
    const tiles = new Uint8Array((len + 24) * ROWS);
    const enemies = [];
    const plats = [];
    let runes = 0;
    let nid = 1;
    const set = (x, y, t) => { if (x >= 0 && x < len + 24 && y >= 0 && y < ROWS) tiles[x * ROWS + y] = t; };
    const get = (x, y) => (x >= 0 && x < len + 24 && y >= 0 && y < ROWS ? tiles[x * ROWS + y] : 0);
    const ground = (x0, n) => { for (let x = x0; x < x0 + n; x++) { set(x, GY, GROUND); set(x, GY + 1, GROUND); } };
    const top = x => { for (let y = 0; y < ROWS; y++) if (SOLID[get(x, y)] && (tk !== 'grot' || y > 1)) return y; return ROWS + 4; };
    const enemy = (type, tx, ty) => {
      const e = { id: nid++, type, x: tx * T + T / 2, y: (ty === undefined ? top(tx) : ty) * T };
      if (type === 'drone') { e.y = ty * T; e.phase = r() * 6.28; e.range = ri(20, 44); }
      enemies.push(e);
    };
    const coins = (x0, n, y, arc = false) => { for (let i = 0; i < n; i++) set(x0 + i, y - (arc ? Math.round(Math.sin((i + .5) / n * Math.PI) * 2) : 0), COIN); };

    const C = {
      flat(x) {
        const n = ri(6, 10);
        ground(x, n);
        const k = r() < .35 + d * .1 ? ri(1, 1 + (d >= 2 ? 1 : 0)) : 0;
        for (let i = 0; i < k; i++) enemy(d >= 3 && r() < .3 ? 'stekel' : 'kever', x + 3 + i * 2);
        if (r() < .4) coins(x + 2, Math.min(4, n - 3), GY - 3, true);
        return x + n;
      },
      gap(x) {
        const g = Math.min(4, ri(2, 3 + (d >= 2 ? 1 : 0)));
        ground(x, 3);
        if (tk === 'burcht') for (let i = 0; i < g; i++) set(x + 3 + i, GY + 1, LAVA);
        if (r() < .6) coins(x + 3, g, GY - 4, true);
        ground(x + 3 + g, 3);
        return x + 6 + g;
      },
      blocks(x) {
        const n = 11;
        ground(x, n);
        const pats = [[BRICK, RUNE, BRICK, RUNE, BRICK], [RUNE, BRICK, COINBRICK, BRICK, RUNE], [BRICK, BRICK, RUNE, BRICK, BRICK], [RUNE, AIR, RUNE, AIR, RUNE]];
        const pat = pats[ri(0, pats.length - 1)];
        pat.forEach((t, i) => { set(x + 3 + i, 9, t); if (t === RUNE) runes++; });
        if (r() < .45) { set(x + 5, 5, RUNE); runes++; }
        else if (r() < .5) coins(x + 4, 3, 5);
        if (r() < .6 + d * .08) enemy('kever', x + 8);
        return x + n;
      },
      stairs(x) {
        const h = Math.min(4, ri(2, 3 + (d >= 1 ? 1 : 0)));
        const gapW = d >= 1 && r() < .5 ? ri(1, 2) : 0;
        ground(x, 2);
        x += 2;
        for (let i = 0; i < h; i++) { ground(x + i, 1); for (let k = 0; k <= i; k++) set(x + i, GY - 1 - k, STONE); }
        x += h;
        if (gapW) { if (tk === 'burcht') for (let i = 0; i < gapW; i++) set(x + i, GY + 1, LAVA); x += gapW; }
        else { ground(x, 2); x += 2; }
        for (let i = 0; i < h; i++) { ground(x + i, 1); for (let k = 0; k < h - i; k++) set(x + i, GY - 1 - k, STONE); }
        x += h;
        ground(x, 2);
        return x + 2;
      },
      pillars(x) {
        const gaps = ri(5, 7);
        const n = 2 + gaps * 2 + 2;
        ground(x, n);
        for (let p = 0; p < 2; p++) {
          const px = x + 2 + p * (gaps + 2) + (p ? 0 : 0);
          const h = Math.min(d >= 2 ? 4 : 3, ri(2, 3 + (d >= 2 ? 1 : 0)));
          for (const cx of [px, px + 1]) { for (let k = 1; k < h; k++) set(cx, GY - k, PILLAR); set(cx, GY - h, PILLARTOP); }
        }
        enemy(d >= 2 && r() < .35 ? 'stekel' : 'kever', x + 4 + Math.floor(gaps / 2));
        if (d >= 1 && r() < .5) enemy('kever', x + 6 + gaps + 1);
        return x + n;
      },
      planks(x) {
        ground(x, 2);
        const pit = ri(5, 6);
        set(x + 2, 10, PLANK); set(x + 3, 10, PLANK); set(x + 4, 10, PLANK);
        if (pit === 6) { set(x + 5, 8, PLANK); set(x + 6, 8, PLANK); }
        coins(x + 2, 3, 9);
        if (tk === 'burcht') for (let i = 0; i < pit; i++) set(x + 2 + i, GY + 1, LAVA);
        if (d >= 1 && r() < .5) enemy('drone', x + 4, 6);
        ground(x + 2 + pit, 3);
        return x + 5 + pit;
      },
      mover(x) {
        if (d < 1) return C.flat(x);
        ground(x, 2);
        const pit = 7;
        plats.push({ id: nid++, x: (x + 2 + pit / 2) * T, y: 11 * T, w: 3, range: 2.4 * T, speed: 1.1 + d * .08, phase: r() * 6.28 });
        if (tk === 'burcht') for (let i = 0; i < pit; i++) set(x + 2 + i, GY + 1, LAVA);
        coins(x + 4, 3, 8);
        ground(x + 2 + pit, 3);
        return x + 5 + pit;
      },
      drones(x) {
        const n = 10;
        ground(x, n);
        enemy('drone', x + 4, ri(8, 10));
        if (d >= 2) enemy('drone', x + 8, ri(7, 9));
        coins(x + 3, 5, GY - 2);
        return x + n;
      },
      hidden(x) {
        const n = 7;
        ground(x, n);
        set(x + 3, 9, HIDDEN);
        set(x + 5, 9, BRICK);
        if (r() < .5) { set(x + 4, 9, RUNE); runes++; }
        return x + n;
      },
      stekels(x) {
        if (d < 1) return C.blocks(x);
        const n = 12;
        ground(x, n);
        enemy('stekel', x + 5);
        enemy('kever', x + 9);
        set(x + 6, 9, BRICK); set(x + 7, 9, RUNE); set(x + 8, 9, BRICK);
        runes++;
        return x + n;
      },
    };
    const pool = ['flat', 'gap', 'blocks', 'stairs', 'pillars', 'planks', 'mover', 'drones', 'hidden', 'stekels', 'gap', 'blocks'];

    // Een rustige start, dan stukjes na elkaar, halverwege een vlag om terug te beginnen, en op het einde een trap naar de runepoort.
    ground(0, 12);
    if (w === 0) { set(7, 9, RUNE); runes++; }
    let x = 12, check = 0, last = '', count = 0;
    while (x < len - 26) {
      if (!check && x > len / 2) { ground(x, 5); check = x + 2; x += 5; continue; }
      let name = pool[Math.floor(r() * pool.length)];
      if (name === last && name !== 'flat') name = 'flat';
      if (count % 3 === 2 && runes < 7) name = r() < .5 ? 'blocks' : 'hidden';
      last = name;
      count++;
      x = C[name](x);
    }
    ground(x, 3);
    x += 3;
    const sh = 4 + Math.min(d, 3);
    for (let i = 0; i < sh; i++) { ground(x + i, 1); for (let k = 0; k <= i; k++) set(x + i, GY - 1 - k, STONE); }
    for (let k = 0; k < sh; k++) set(x + sh, GY - 1 - k, STONE);
    ground(x + sh, 1);
    x += sh + 1;
    ground(x, len + 24 - x);
    const gate = x + 4;
    if (tk === 'grot') for (let gx = 0; gx < len + 24; gx++) { set(gx, 0, GROUND); if (gx > 14 && gx < gate - 6 && Math.sin(gx * .7 + seed) > .6) set(gx, 1, GROUND); }
    let coinCount = 0;
    for (let i = 0; i < tiles.length; i++) if (tiles[i] === COIN) coinCount++;
    return { w, seed, theme, len: len + 24, tiles, enemies, plats, check, gate, runes, coins: coinCount };
  }

  // ---------- Hulpjes voor botsingen ----------
  function tileAt(world, tx, ty) {
    if (tx < 0) return STONE;
    if (ty < 0 || ty >= ROWS || tx >= world.len) return AIR;
    return world.tiles[tx * ROWS + ty];
  }
  function setTile(world, tx, ty, t) {
    if (tx >= 0 && tx < world.len && ty >= 0 && ty < ROWS) world.tiles[tx * ROWS + ty] = t;
  }

  // Een bewegend platform staat op elk moment op dezelfde plaats, bij iedereen.
  function platPos(p, time) {
    return { x: p.x + Math.sin(time * p.speed + p.phase) * p.range - (p.w * T) / 2, y: p.y };
  }

  function solidAt(world, px, py) {
    return SOLID[tileAt(world, Math.floor(px / T), Math.floor(py / T))] === 1;
  }

  // Vijanden die zelf rondlopen (zonder speler): de leerling en de camera's op het bord gebruiken dit allebei.
  function freshEnemies(world) {
    return world.enemies.map(e => ({ ...e, x0: e.x, y0: e.y, vx: -(ENEMY[e.type].speed + Math.min(world.w, 5) * 3), vy: 0, state: e.type === 'drone' ? 'fly' : 'walk', t: 0, on: false }));
  }

  function stepEnemy(world, e, dt, time) {
    if (e.state === 'gone' || e.state === 'dead') return;
    const spec = ENEMY[e.type];
    if (e.type === 'drone') {
      e.x = e.x0 + Math.sin(time * .8 + e.phase) * e.range;
      e.y = e.y0 + Math.sin(time * 2.3 + e.phase) * 8;
      e.vx = Math.cos(time * .8 + e.phase);
      return;
    }
    if (e.state === 'shell') {
      e.t += dt;
      if (e.t > SHELL_WAKE) { e.state = 'walk'; e.vx = -(spec.speed + Math.min(world.w, 5) * 3); e.t = 0; }
      e.vx = 0;
    }
    if (e.state === 'slide') e.vx = Math.sign(e.vx || 1) * SHELL_SPEED;
    e.vy = Math.min(PHYS.maxFall, e.vy + PHYS.grav * dt);
    // horizontaal: omdraaien tegen een muur
    const nx = e.x + e.vx * dt;
    const hw = spec.w / 2;
    const front = e.vx > 0 ? nx + hw : nx - hw;
    if (e.vx && (solidAt(world, front, e.y - 2) || solidAt(world, front, e.y - spec.h + 2))) {
      e.vx = -e.vx;
      e.bonk = true;
    } else e.x = nx;
    // verticaal: vallen en landen
    const ny = e.y + e.vy * dt;
    if (e.vy > 0 && (solidAt(world, e.x - hw + 2, ny) || solidAt(world, e.x + hw - 2, ny))) {
      e.y = Math.floor(ny / T) * T;
      e.vy = 0;
    } else e.y = ny;
    if (e.y > H + 40) e.state = 'gone';
  }

  const api = { T, ROWS, GY, H, AIR, GROUND, BRICK, RUNE, USED, STONE, COINBRICK, HIDDEN, PILLAR, PILLARTOP, LAVA, COIN, PLANK, SOLID, THEMES, PHYS, SIZE, ENEMY, SHELL_SPEED, SHELL_WAKE, rng, make, tileAt, setTile, platPos, solidAt, freshEnemies, stepEnemy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PxWorld = api;
})(typeof window !== 'undefined' ? window : this);
