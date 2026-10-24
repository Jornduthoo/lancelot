// Cyber-Galaga op de gsm of Chromebook: je eigen ridder vliegt met een jetpack tegen golven cyberdraken.
// Het spel draait helemaal op het toestel zelf, dus er is geen vertraging. De server geeft vragen en beloningen,
// telt de scores en beheert de klasbaas waar de hele klas op het einde samen tegen vecht.
// Gebruikt socket, $, playerId, store en buzz uit player.js, ICONS, sfx en confetti uit fx.js, CgArt uit cg-art.js.
const cg = {
  state: null,
  joined: false,
  run: -1,
  offset: 0,
  me: null,
  question: null,     // open vraag: { answers, done, pick }
  bossHp: 0,
  bossShown: 0,
  overheatEnd: 0,     // performance.now() tot wanneer de jetpack oververhit is
  sent: { score: -1, dragons: -1, wave: -1, crashes: -1 },
};

const cgNow = () => Date.now() + cg.offset;

function cgShow(name) {
  for (const s of ['cg-join', 'cg-lobby', 'cg-game', 'cg-end']) $(s).classList.toggle('hidden', s !== name);
}

function cgJoin(name) {
  socket.emit('cg-join', { playerId, name }, res => {
    if (res.error) {
      cg.joined = false;
      $('cg-join-error').textContent = res.error;
      cgShow('cg-join');
      return;
    }
    cg.joined = true;
    store('lancelot-name', res.name);
    $('cg-join-error').textContent = '';
  });
}

$('cg-join').addEventListener('submit', e => {
  e.preventDefault();
  cgJoin($('cg-name').value);
});

socket.on('cg-state', s => {
  const old = cg.state;
  cg.state = s;
  cg.offset = s.now - Date.now();
  document.body.dataset.cg = s.active ? '1' : '';
  if (!s.active) {
    cg.joined = false;
    return;
  }
  if (cg.run !== s.run) {
    cg.run = s.run;
    cg.joined = false;
    cg.me = null;
    cgCloseQuestion();
    cgReset();
    delete $('cg-end').dataset.done;
  }
  cgBoss(s.boss);
  if (!s.name) {
    const saved = store('lancelot-name');
    if (!cg.joined && saved && cg.autoRun !== s.run) {
      cg.autoRun = s.run;
      cgJoin(saved);
    } else if (!cg.joined) {
      $('cg-name').value = saved || '';
      cgShow('cg-join');
    }
    return;
  }
  cg.joined = true;
  if (s.me) cgMe(s.me);
  if (s.phase === 'lobby') {
    $('cg-lobby-name').textContent = s.name;
    cgShow('cg-lobby');
  } else if (s.phase === 'play') {
    cgShow('cg-game');
    cgResize();
    if (!old || old.phase !== 'play') sfx.go();
  } else if (s.phase === 'einde') {
    cgCloseQuestion();
    $('cg-out').classList.add('hidden');
    const medals = ['🥇', '🥈', '🥉'];
    const me = s.me || {};
    const b = s.boss || {};
    $('cg-end-medal').textContent = b.down ? '🏆' : medals[me.rank - 1] || '🚀';
    $('cg-end-title').textContent = me.rank === 1 ? 'Jij bent de beste piloot!' : `Plek ${me.rank} van ${me.players}`;
    $('cg-end-boss').textContent = b.down ? 'De klas heeft de klasbaas verslagen!' : b.escaped ? 'De klasbaas is ontsnapt. Volgende keer!' : '';
    $('cg-end-score').textContent = `${G.score} punten`;
    $('cg-end-stats').textContent = `${me.right || 0} ${me.right === 1 ? 'vraag' : 'vragen'} juist · ${G.dragons} draken · golf ${G.wave}${me.bossDmg ? ` · ${me.bossDmg} schade aan de baas` : ''}`;
    if (!$('cg-end').dataset.done && (b.down || (me.rank && me.rank <= 3))) confetti(4000);
    $('cg-end').dataset.done = '1';
    cgShow('cg-end');
  }
});

socket.on('cg-tick', msg => {
  if (!cg.state || cg.state.phase !== 'play') return;
  cg.offset = msg.now - Date.now();
  cgBoss(msg.boss);
  if (msg.me) cgMe(msg.me);
  if (msg.feed) cgFeed(msg.feed);
});

socket.on('cg-kicked', () => {
  cg.joined = false;
  store('lancelot-name', null);
  $('cg-join-error').textContent = 'Je bent verwijderd door de leerkracht.';
  cgShow('cg-join');
});

socket.on('connect', () => {
  if (cg.joined) cgJoin(store('lancelot-name') || '');
});

function cgMe(me) {
  cg.me = me;
  G.bombs = me.bombs;
  if (me.wait > 0) cg.overheatEnd = Math.max(cg.overheatEnd, performance.now() + me.wait);
  cgHud(true);
}

// De klasbaas: de server zegt hoeveel leven hij nog heeft.
function cgBoss(b) {
  if (!b) return;
  const was = cg.boss;
  cg.boss = b;
  cg.bossHp = b.hp;
  cg.pendingSent = 0;
  if (b.on && !b.down && !b.escaped && (!was || !was.on) && cg.state && cg.state.phase === 'play') cgBossArrives();
  if (b.down && (!was || !was.down)) cgBossDown();
}

function cgFeed(feed) {
  const box = $('cg-feed');
  const fresh = feed[0];
  if (!fresh || box.dataset.last === String(fresh.at)) return;
  box.dataset.last = String(fresh.at);
  const line = document.createElement('div');
  line.className = 'ls-feed-line';
  if (cg.state && cg.state.name && fresh.text.includes(cg.state.name)) line.classList.add('me');
  line.textContent = fresh.text;
  box.prepend(line);
  while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => line.remove(), 5000);
}

let cgToastTimer = null;
function cgToast(text, kind = '') {
  const el = $('cg-toast');
  el.textContent = text;
  el.className = `tw-toast show ${kind}`;
  clearTimeout(cgToastTimer);
  cgToastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

let cgBannerTimer = null;
function cgBanner(title, sub, kind = '', ms = 1600) {
  const el = $('cg-banner');
  el.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = title;
  const span = document.createElement('span');
  span.textContent = sub || '';
  el.append(strong, span);
  el.className = `ls-banner show ${kind}`;
  clearTimeout(cgBannerTimer);
  cgBannerTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------- Het spel zelf (op dit toestel) ----------

const G = {
  W: 480, H: 760, s: 1, ox: 0, oy: 0, cw: 0, ch: 0, bottomPad: 46,
  gt: 0, wave: 0, score: 0, dragons: 0, crashes: 0, bombs: 0, dmgOut: 0,
  ship: null, bolts: [], shots: [], enemies: [], parts: [], texts: [], boss: null,
  nextWaveAt: 0, nextDive: 0, fireCd: 0, shake: 0, flash: 0, lastLaserSound: 0,
};

function cgReset() {
  Object.assign(G, {
    gt: 0, wave: 0, score: 0, dragons: 0, crashes: 0, bombs: 0, dmgOut: 0,
    bolts: [], shots: [], enemies: [], parts: [], texts: [], boss: null,
    nextWaveAt: 1, nextDive: 4, fireCd: 0, shake: 0, flash: 0,
  });
  G.ship = { x: G.W / 2, y: G.H - 90, tx: null, ty: null, lives: 3, inv: 2, laserUntil: 0, shieldUntil: 0, crashed: false, crashEnd: 0 };
  cg.sent = { score: -1, dragons: -1, wave: -1, crashes: -1 };
  cg.overheatEnd = 0;
  cg.boss = null;
  cg.bossShown = 0;
  $('cg-out').classList.add('hidden');
}
cgReset();

const DRAGON_HP = [1, 2, 3, 4];
const DRAGON_POINTS = [50, 80, 100, 250];
const rand = (a, b) => a + Math.random() * (b - a);

function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

// De plek van een draak in de formatie: de hele zwerm wiegt en ademt.
function slotPos(e) {
  const spacing = Math.min(50, (G.W - 50) / e.cols);
  const breathe = 1 + Math.sin(G.gt * 1.4) * .06;
  const sway = Math.sin(G.gt * .7) * Math.max(0, (G.W - spacing * e.cols) / 2 - 10);
  return { x: G.W / 2 + (e.c - (e.cols - 1) / 2) * spacing * breathe + sway, y: 78 + e.r * 42 * (1 + (breathe - 1) * .5) };
}

function startWave() {
  G.wave++;
  const k = G.wave;
  const cols = Math.min(8, 4 + Math.ceil(k / 2));
  const rows = Math.min(5, 2 + Math.floor(k / 2));
  const list = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let type = 0;
      if (r === 0 && k >= 3) type = 2;
      else if ((r === 1 && k >= 2) || (r === 2 && k >= 5)) type = 1;
      list.push({ c, r, type });
    }
  }
  if (k >= 4) list[Math.floor(Math.random() * cols)].type = 3;
  const group = Math.max(3, Math.ceil(cols / 2));
  const extra = Math.floor(k / 4);
  list.forEach((d, i) => {
    const g = Math.floor(i / group);
    const side = g % 2 ? 1 : -1;
    G.enemies.push({
      ...d, cols, rows, hp: DRAGON_HP[d.type] + (d.type ? extra : 0), state: 'wait', at: G.gt + g * 1.1 + (i % group) * .14,
      side, top: g % 3 === 2, x: -100, y: -100, angle: 0, hit: 0, frame: Math.random() < .5 ? 0 : 1, fire: [],
    });
  });
  if (k > 1) {
    cgBanner(`GOLF ${k}`, k % 3 === 0 ? 'Pantserdraken! Zoek een dubbele laser.' : '', 'gold', 1400);
    sfx.power();
  }
  G.nextDive = G.gt + 3.5;
}

function enemyPath(e) {
  const W = G.W, H = G.H, side = e.side;
  if (e.top) return [{ x: W / 2 + side * W * .3, y: -40 }, { x: W / 2 + side * W * .3, y: H * .55 }, { x: W / 2 - side * W * .3, y: H * .5 }];
  return [{ x: side < 0 ? -40 : W + 40, y: H * .35 }, { x: W / 2, y: H * .72 }, { x: W / 2 - side * W * .35, y: H * .18 }];
}

function aimShot(x, y, speed, spread = 0) {
  const sh = G.ship;
  const a = Math.atan2(sh.y - y, sh.x - x) + spread;
  G.shots.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 6 });
}

function dive(e) {
  const sh = G.ship;
  const k = G.wave;
  e.state = 'dive';
  e.t = 0;
  e.dur = Math.max(1.5, 2.6 - k * .08);
  const side = e.x < G.W / 2 ? -1 : 1;
  e.path = [{ x: e.x, y: e.y }, { x: e.x + side * 80, y: e.y - 60 }, { x: sh.x - side * 80, y: G.H * .55 }, { x: sh.x + rand(-90, 90), y: G.H + 60 }];
  e.fire = [];
  if (e.type === 1) e.fire = [.3, .55];
  else if (Math.random() < .2 + k * .04) e.fire = [.42];
}

function enemyShootSpeed() {
  return Math.min(420, 210 + G.wave * 14);
}

function updateEnemies(dt) {
  const boss = G.boss;
  let homed = 0;
  for (const e of G.enemies) {
    const ox = e.x, oy = e.y;
    if (e.state === 'wait') {
      if (G.gt >= e.at) {
        e.state = 'enter';
        e.t = 0;
        e.path = enemyPath(e);
      } else continue;
    }
    if (e.state === 'enter') {
      e.t += dt / 2.3;
      const p = bez(e.path[0], e.path[1], e.path[2], slotPos(e), Math.min(1, e.t));
      e.x = p.x; e.y = p.y;
      if (e.t >= 1) e.state = 'home';
    } else if (e.state === 'home') {
      const p = slotPos(e);
      e.x = p.x; e.y = p.y;
      homed++;
    } else if (e.state === 'dive') {
      e.t += dt / e.dur;
      const p = bez(e.path[0], e.path[1], e.path[2], e.path[3], Math.min(1, e.t));
      e.x = p.x; e.y = p.y;
      while (e.fire.length && e.t >= e.fire[0]) {
        e.fire.shift();
        if (!G.ship.crashed) aimShot(e.x, e.y + 14, enemyShootSpeed());
      }
      if (e.t >= 1) {
        if (e.minion) { e.dead = true; continue; }
        e.state = 'return';
        e.t = 0;
        e.y = -40;
        e.from = { x: slotPos(e).x, y: -40 };
      }
    } else if (e.state === 'return') {
      e.t += dt / 1.2;
      const p = slotPos(e);
      const k = Math.min(1, e.t);
      e.x = e.from.x + (p.x - e.from.x) * k;
      e.y = e.from.y + (p.y - e.from.y) * k;
      if (e.t >= 1) e.state = 'home';
    } else if (e.state === 'flee') {
      e.y -= 420 * dt;
      if (e.y < -60) e.dead = true;
    }
    const vx = e.x - ox, vy = e.y - oy;
    const target = e.state === 'home' ? 0 : Math.atan2(vy, vx) - Math.PI / 2;
    if (Math.abs(vx) + Math.abs(vy) > .3 || e.state === 'home') {
      let d = target - e.angle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      e.angle += d * Math.min(1, dt * 8);
    }
  }
  // Duiken zoals bij Galaga: om de zoveel tijd stort een draak (of een groepje) zich op je.
  if (!boss && G.gt >= G.nextDive && homed && !G.ship.crashed) {
    const k = G.wave;
    const home = G.enemies.filter(e => e.state === 'home');
    const n = Math.min(home.length, 1 + (k >= 3 && Math.random() < .4 ? 1 : 0) + (k >= 6 && Math.random() < .3 ? 1 : 0));
    for (let i = 0; i < n; i++) dive(home.splice(Math.floor(Math.random() * home.length), 1)[0]);
    G.nextDive = G.gt + Math.max(.7, 2.8 - k * .22) * rand(.7, 1.3);
  }
  // Vanaf golf 3 schieten vuurdraken ook vanuit de formatie.
  if (!boss && G.wave >= 3 && !G.ship.crashed && Math.random() < dt * (.25 + G.wave * .05)) {
    const fire = G.enemies.filter(e => e.state === 'home' && e.type === 1);
    if (fire.length) {
      const e = fire[Math.floor(Math.random() * fire.length)];
      aimShot(e.x, e.y + 14, enemyShootSpeed() * .85);
    }
  }
  G.enemies = G.enemies.filter(e => !e.dead);
}

// ---------- De klasbaas op dit toestel ----------

function cgBossArrives() {
  for (const e of G.enemies) e.state = 'flee';
  G.shots = [];
  G.boss = { x: G.W / 2, y: -150, state: 'enter', t: 0, nextAtk: G.gt + 4, atk: 0, minionsAt: G.gt + 9, beam: null, hurt: 0 };
  cgBanner('⚠ KLASBAAS ⚠', 'Vecht samen met de hele klas!', 'big', 2600);
  sfx.gong();
  buzz([100, 60, 100, 60, 200]);
  G.shake = .6;
}

function cgBossDown() {
  const B = G.boss;
  if (B) {
    B.state = 'dead';
    B.t = 0;
  }
  G.shots = [];
  for (const e of G.enemies) { e.dead = true; boom(e.x, e.y, CgArt.DRAGONS[e.type].neon, 14); }
  cgBanner('KLASBAAS VERSLAGEN!', 'Samen zijn jullie sterker dan de draak', 'big', 4000);
  sfx.fanfare();
  confetti(5000);
  buzz([60, 40, 60, 40, 300]);
}

function updateBoss(dt) {
  const B = G.boss;
  if (!B) return;
  const target = { x: G.W / 2 + Math.sin(G.gt * .45) * Math.max(0, G.W / 2 - 130), y: 150 + Math.sin(G.gt * 1.1) * 12 };
  if (B.state === 'enter') {
    B.t += dt / 3;
    B.x += (target.x - B.x) * Math.min(1, dt * 2);
    B.y = -150 + (target.y + 150) * Math.min(1, B.t);
    if (B.t >= 1) B.state = 'fight';
    return;
  }
  if (B.state === 'dead') {
    B.t += dt;
    if (Math.random() < dt * 14) boom(B.x + rand(-110, 110), B.y + rand(-60, 70), Math.random() < .5 ? '#ff4dd2' : '#ffc94a', 10);
    G.shake = Math.max(G.shake, .25);
    if (B.t > 2.6 && !B.gone) {
      B.gone = true;
      for (let i = 0; i < 4; i++) boom(B.x + rand(-60, 60), B.y + rand(-30, 40), '#ffffff', 40);
      G.flash = 1;
      G.shake = 1;
      sfx.boom();
    }
    return;
  }
  B.x += (target.x - B.x) * Math.min(1, dt * 3);
  B.y += (target.y - B.y) * Math.min(1, dt * 3);
  if (G.ship.crashed) return;
  if (G.gt >= B.nextAtk) {
    const kind = ['fan', 'aimed', 'fan', 'beam'][B.atk++ % 4];
    if (kind === 'fan') {
      for (let i = -3; i <= 3; i++) {
        const a = Math.PI / 2 + i * .2;
        G.shots.push({ x: B.x, y: B.y + 70, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 7 });
      }
    } else if (kind === 'aimed') {
      for (let i = 0; i < 3; i++) setTimeout(() => { if (G.boss && G.boss.state === 'fight') aimShot(G.boss.x, G.boss.y + 70, 300); }, i * 180);
    } else {
      B.beam = { x: G.ship.x, warn: G.gt + 1.1, until: G.gt + 1.8 };
    }
    B.nextAtk = G.gt + 2.4;
  }
  if (G.gt >= B.minionsAt) {
    B.minionsAt = G.gt + 9;
    for (let i = 0; i < 3; i++) {
      const e = { c: 0, r: 0, cols: 1, rows: 1, type: 0, hp: 1, state: 'dive', x: B.x + (i - 1) * 60, y: B.y + 40, angle: 0, hit: 0, frame: i % 2, fire: [], minion: true };
      dive(e);
      e.path[0] = { x: e.x, y: e.y };
      G.enemies.push(e);
    }
  }
  if (B.beam && G.gt > B.beam.until) B.beam = null;
}

function bossHit(x, y) {
  const B = G.boss;
  if (!B || B.state !== 'fight') return 0;
  const dx = (x - B.x) / 108, dy = (y - (B.y - 5)) / 64;
  if (dx * dx + dy * dy > 1) return 0;
  return Math.hypot(x - B.x, y - (B.y + 14)) < 20 ? 2 : 1;
}

function damageBoss(n, x, y) {
  G.dmgOut += n;
  G.boss.hurt = G.gt + .06;
  G.score += n * 5;
  spark(x, y, '#ff9be8', 3);
}

// ---------- Effecten ----------

function spark(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = rand(40, 200);
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.2, .45), max: .45, color, size: rand(4, 8) });
  }
}

function boom(x, y, color, n = 18) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = rand(60, 320);
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.35, .8), max: .8, color: Math.random() < .3 ? '#ffffff' : color, size: rand(5, 12) });
  }
  G.parts.push({ x, y, ring: true, life: .4, max: .4, color, size: 8 });
  if (G.parts.length > 260) G.parts.splice(0, G.parts.length - 260);
}

function popText(x, y, text, color = '#ffc94a') {
  G.texts.push({ x, y, text, color, life: .9 });
  if (G.texts.length > 12) G.texts.shift();
}

function killEnemy(e) {
  e.dead = true;
  const P = CgArt.DRAGONS[e.type];
  boom(e.x, e.y, P.neon, e.type === 3 ? 30 : 18);
  const pts = DRAGON_POINTS[e.type] * (e.state === 'dive' ? 2 : 1);
  G.score += pts;
  G.dragons++;
  popText(e.x, e.y - 10, `+${pts}`, e.type === 3 ? '#ffc94a' : '#ffffff');
  sfx.boom();
  G.shake = Math.max(G.shake, .12);
}

// ---------- De ridder ----------

const keys = {};
const CG_KEYS = { ArrowLeft: 'l', a: 'l', q: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'u', w: 'u', z: 'u', ArrowDown: 'd', s: 'd' };

function overheated() {
  return performance.now() < cg.overheatEnd;
}

function shipHit() {
  const sh = G.ship;
  if (sh.crashed || G.gt < sh.inv) return;
  if (G.gt < sh.shieldUntil) {
    sh.shieldUntil = 0;
    sh.inv = G.gt + 1;
    boom(sh.x, sh.y - 4, '#4cc9ff', 22);
    cgToast('Je schild ving de klap op', 'gold');
    sfx.hit();
    return;
  }
  sh.lives--;
  boom(sh.x, sh.y, '#ff8c42', 26);
  G.shake = .5;
  G.flash = .5;
  sfx.hit();
  buzz(250);
  if (sh.lives <= 0) {
    sh.crashed = true;
    sh.crashEnd = performance.now() + 8000;
    G.crashes++;
    G.bolts = [];
    $('cg-out').classList.remove('hidden');
    cgHud(true);
  } else {
    sh.inv = G.gt + 2;
    cgHud(true);
  }
}

function relaunch() {
  const sh = G.ship;
  if (!sh.crashed) return;
  sh.crashed = false;
  sh.lives = 3;
  sh.inv = G.gt + 3;
  sh.x = G.W / 2;
  sh.y = G.H - 90;
  sh.tx = sh.ty = null;
  G.shots = [];
  $('cg-out').classList.add('hidden');
  cgBanner('OPGESTEGEN!', 'Drie levens, ga ervoor', 'gold');
  sfx.power();
  cgHud(true);
}

function useBomb() {
  if (!cg.state || cg.state.phase !== 'play' || cg.question || G.ship.crashed) return;
  if (G.bombs <= 0) {
    sfx.empty();
    cgToast('Geen bommen! Druk op ⚡ Vraag', 'bad');
    return;
  }
  G.bombs--;
  socket.emit('cg-bomb', null, res => { if (res && res.error) cgToast(res.error, 'bad'); });
  G.flash = 1;
  G.shake = .7;
  sfx.boom();
  buzz([60, 30, 120]);
  G.parts.push({ x: G.ship.x, y: G.ship.y, ring: true, life: .7, max: .7, color: '#ffffff', size: 40 });
  for (const sh of G.shots) spark(sh.x, sh.y, '#ffd23f', 2);
  G.shots = [];
  for (const e of G.enemies) {
    if (e.state === 'wait' || e.y < -20) continue;
    e.hp -= 5;
    if (e.hp <= 0) killEnemy(e);
  }
  if (G.boss && G.boss.state === 'fight') {
    G.dmgOut += 30;
    G.score += 150;
    popText(G.boss.x, G.boss.y + 60, '-30', '#ff9be8');
    boom(G.boss.x, G.boss.y + 20, '#ff4dd2', 30);
  }
  cgHud(true);
}

function updateShip(dt) {
  const sh = G.ship;
  if (sh.crashed) {
    if (performance.now() >= sh.crashEnd) relaunch();
    return;
  }
  const hot = overheated();
  const maxV = hot ? 170 : 360;
  let kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
  let ky = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
  const top = G.H * .5, bottom = G.H - G.bottomPad;
  if (kx || ky) {
    sh.tx = sh.ty = null;
    sh.x += kx * maxV * dt;
    sh.y += ky * maxV * .8 * dt;
  } else if (sh.tx !== null) {
    const dx = sh.tx - sh.x, dy = sh.ty - sh.y;
    const d = Math.hypot(dx, dy);
    const step = (hot ? 420 : 1300) * dt;
    if (d <= step) { sh.x = sh.tx; sh.y = sh.ty; } else { sh.x += dx / d * step; sh.y += dy / d * step; }
  }
  sh.x = Math.max(22, Math.min(G.W - 22, sh.x));
  sh.y = Math.max(top, Math.min(bottom, sh.y));
  if (hot && Math.random() < dt * 20) G.parts.push({ x: sh.x + rand(-8, 8), y: sh.y + 10, vx: rand(-20, 20), vy: rand(30, 70), life: .6, max: .6, color: '#9aa8c2', size: 8 });
  // Automatisch vuren.
  G.fireCd -= dt;
  if (G.fireCd <= 0) {
    const double = G.gt < sh.laserUntil;
    G.fireCd = (double ? .12 : .17) * (hot ? 1.6 : 1);
    if (double) {
      G.bolts.push({ x: sh.x - 10, y: sh.y - 26, gold: true });
      G.bolts.push({ x: sh.x + 10, y: sh.y - 26, gold: true });
    } else {
      G.bolts.push({ x: sh.x, y: sh.y - 28 });
    }
    if (G.gt - G.lastLaserSound > .45) { G.lastLaserSound = G.gt; sfx.laser(); }
  }
}

function update(dt) {
  G.gt += dt;
  if (!G.boss && !G.enemies.length && G.gt >= G.nextWaveAt) startWave();
  updateShip(dt);
  updateEnemies(dt);
  updateBoss(dt);
  const sh = G.ship;
  // Lasers van de ridder.
  for (const b of G.bolts) {
    b.y -= 820 * dt;
    if (b.y < -30) { b.dead = true; continue; }
    for (const e of G.enemies) {
      if (e.dead || e.state === 'wait' || e.state === 'flee') continue;
      if (Math.abs(e.x - b.x) < 17 && Math.abs(e.y - b.y) < 18) {
        b.dead = true;
        e.hp--;
        e.hit = G.gt + .07;
        if (e.hp <= 0) killEnemy(e);
        else spark(b.x, b.y, '#ffffff', 3);
        break;
      }
    }
    if (!b.dead && G.boss) {
      const dmg = bossHit(b.x, b.y);
      if (dmg) {
        b.dead = true;
        damageBoss(dmg, b.x, b.y);
      }
    }
  }
  G.bolts = G.bolts.filter(b => !b.dead);
  // Vuurballen en botsingen.
  const hx = sh.x, hy = sh.y - 6;
  for (const s of G.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.y > G.H + 20 || s.y < -40 || s.x < -30 || s.x > G.W + 30) { s.dead = true; continue; }
    if (!sh.crashed && Math.hypot(s.x - hx, s.y - hy) < s.r + 8) {
      s.dead = true;
      shipHit();
    }
  }
  G.shots = G.shots.filter(s => !s.dead);
  if (!sh.crashed) {
    for (const e of G.enemies) {
      if (e.dead || e.state === 'wait') continue;
      if (Math.abs(e.x - hx) < 22 && Math.abs(e.y - hy) < 22) {
        if (G.gt >= sh.inv) { killEnemy(e); shipHit(); }
      }
    }
    const B = G.boss;
    if (B && B.beam && G.gt >= B.beam.warn && G.gt < B.beam.until && Math.abs(sh.x - B.beam.x) < 24) shipHit();
  }
  G.enemies = G.enemies.filter(e => !e.dead);
  if (!G.boss && !G.enemies.length && G.nextWaveAt < G.gt) {
    // Golf leeg: een bonus en even op adem komen.
    if (G.wave > 0) {
      const bonus = 100 * G.wave;
      G.score += bonus;
      popText(G.W / 2, G.H * .4, `GOLF GEHAALD +${bonus}`, '#2ee6a6');
      sfx.good();
    }
    G.nextWaveAt = G.gt + 1.6;
  }
  for (const p of G.parts) {
    p.life -= dt;
    if (!p.ring) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt * 2;
      p.vy *= 1 - dt * 2;
    }
  }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const t of G.texts) { t.life -= dt; t.y -= 40 * dt; }
  G.texts = G.texts.filter(t => t.life > 0);
  G.shake = Math.max(0, G.shake - dt);
  G.flash = Math.max(0, G.flash - dt * 2.5);
}

// ---------- Besturing ----------

document.addEventListener('keydown', e => {
  if (document.body.dataset.cg !== '1' || e.target.tagName === 'INPUT') return;
  if (cg.question) {
    if (cg.question.pick && /^[1-3]$/.test(e.key)) cgPick(['laser', 'schild', 'bom'][Number(e.key) - 1]);
    else if (cg.question.answers && !cg.question.done && /^[1-4]$/.test(e.key)) cgAnswer(Number(e.key) - 1);
    if (e.key === 'Escape') cgCloseQuestion();
    return;
  }
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key in CG_KEYS) {
    e.preventDefault();
    keys[CG_KEYS[key]] = true;
  }
  if (e.key === ' ') { e.preventDefault(); if (!e.repeat) useBomb(); }
  if (key === 'e' || e.key === 'Enter') cgOpenQuestion();
});
document.addEventListener('keyup', e => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key in CG_KEYS) keys[CG_KEYS[key]] = false;
});
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Aanraken: schuif met je vinger waar ook op het scherm, de ridder schuift mee (ook als je vinger hem niet bedekt).
// Een muis of touchpad: de ridder volgt de muis.
const cgCanvas = $('cg-canvas');
let drag = null;
function toField(e) {
  const r = cgCanvas.getBoundingClientRect();
  const dpr = cgCanvas.width / r.width;
  return { x: ((e.clientX - r.left) * dpr - G.ox) / G.s, y: ((e.clientY - r.top) * dpr - G.oy) / G.s };
}
cgCanvas.addEventListener('pointerdown', e => {
  sfx.unlock();
  e.preventDefault();
  const p = toField(e);
  drag = { id: e.pointerId, mouse: e.pointerType === 'mouse', px: p.x, py: p.y, sx: G.ship.x, sy: G.ship.y };
  try { cgCanvas.setPointerCapture(e.pointerId); } catch {}
  if (drag.mouse) { G.ship.tx = p.x; G.ship.ty = p.y; }
});
cgCanvas.addEventListener('pointermove', e => {
  const p = toField(e);
  if (e.pointerType === 'mouse') {
    G.ship.tx = p.x;
    G.ship.ty = p.y;
    return;
  }
  if (!drag || drag.id !== e.pointerId) return;
  G.ship.tx = drag.sx + (p.x - drag.px) * 1.35;
  G.ship.ty = drag.sy + (p.y - drag.py) * 1.35;
});
for (const ev of ['pointerup', 'pointercancel']) cgCanvas.addEventListener(ev, e => { if (drag && drag.id === e.pointerId) drag = null; });
cgCanvas.addEventListener('contextmenu', e => e.preventDefault());

for (const [id, fn] of [['cg-bomb', useBomb], ['cg-ask', () => cgOpenQuestion()], ['cg-out-ask', () => cgOpenQuestion()], ['cg-q-close', () => cgCloseQuestion()]]) {
  $(id).addEventListener('click', e => { e.currentTarget.blur(); sfx.unlock(); fn(); });
}
for (const b of $('cg-pick').querySelectorAll('button')) b.addEventListener('click', () => cgPick(b.dataset.kind));

// ---------- Vragen en beloningen ----------

function cgOpenQuestion() {
  if (cg.question || !cg.state || cg.state.phase !== 'play') return;
  if (cgNow() < cg.state.startedAt) return;
  for (const k in keys) keys[k] = false;
  drag = null;
  cg.question = { loading: true };
  $('cg-question').classList.remove('hidden');
  // Nog een beloning tegoed? Dan eerst kiezen.
  if (cg.me && cg.me.rewards > 0) return cgShowPick();
  cgAsk();
}

function cgAsk() {
  cg.question = { loading: true };
  $('cg-pick').classList.add('hidden');
  $('cg-q-text').textContent = '…';
  $('cg-q-answers').innerHTML = '';
  $('cg-q-result').textContent = '';
  $('cg-q-result').className = 'tw-q-result';
  $('cg-q-status').textContent = 'Juist = kies een beloning · het spel staat stil';
  socket.emit('cg-question', null, res => {
    if (!cg.question) return;
    if (res && res.wait) {
      $('cg-q-text').textContent = '🔥 Je jetpack koelt af…';
      cgWait(res.wait, () => { if (cg.question) cgAsk(); });
      return;
    }
    if (!res || res.error) return cgCloseQuestion();
    cg.question = { answers: res.answers };
    $('cg-q-text').textContent = res.question;
    $('cg-q-answers').innerHTML = res.answers.map((a, i) => `
      <button class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
    [...$('cg-q-answers').children].forEach((b, i) => {
      b.querySelector('span').textContent = res.answers[i];
      b.addEventListener('click', () => cgAnswer(i));
    });
  });
}

let cgWaitTimer = null;
function cgWait(ms, then) {
  clearInterval(cgWaitTimer);
  const end = performance.now() + ms;
  const result = $('cg-q-result');
  if (!result.querySelector('small')) result.append(document.createElement('small'));
  const tickWait = () => {
    const left = end - performance.now();
    if (!cg.question) return clearInterval(cgWaitTimer);
    if (left <= 0) {
      clearInterval(cgWaitTimer);
      then();
      return;
    }
    result.querySelector('small').textContent = `Jetpack oververhit… ${Math.ceil(left / 1000)}`;
  };
  tickWait();
  cgWaitTimer = setInterval(tickWait, 200);
}

function cgAnswer(i) {
  if (!cg.question || cg.question.done || !cg.question.answers) return;
  cg.question.done = true;
  socket.emit('cg-answer', i, res => {
    if (!res || res.error) return cgCloseQuestion();
    const tiles = [...$('cg-q-answers').children];
    tiles.forEach((t, j) => {
      t.classList.remove('enter');
      t.classList.toggle('dim', j !== res.right && j !== i);
      t.classList.toggle('right', j === res.right);
      t.disabled = true;
    });
    if (!res.correct) tiles[i].classList.add('wrong');
    const result = $('cg-q-result');
    result.className = `tw-q-result ${res.correct ? 'good' : 'bad'}`;
    if (cg.me) cg.me.rewards = res.rewards;
    if (res.correct) {
      result.textContent = res.gained > 1 ? 'Juist! Drie op rij: twee beloningen!' : 'Juist! Kies je beloning.';
      sfx.good();
      buzz([30, 40, 30]);
      if (G.ship.crashed) relaunch();
      setTimeout(() => { if (cg.question) cgShowPick(); }, 700);
    } else {
      // Tegen gokken: het juiste antwoord blijft staan en de jetpack raakt oververhit.
      result.textContent = 'Helaas! Kijk naar het juiste antwoord.';
      result.append(document.createElement('br'), document.createElement('small'));
      sfx.bad();
      buzz(200);
      cg.overheatEnd = performance.now() + (res.wait || 3000);
      cgWait(res.wait || 3000, () => { if (cg.question) cgAsk(); });
    }
  });
}

function cgShowPick() {
  cg.question = { pick: true };
  $('cg-q-status').textContent = `Kies je beloning${cg.me && cg.me.rewards > 1 ? ` (nog ${cg.me.rewards})` : ''}`;
  $('cg-q-text').textContent = '🎁 Wat neem je mee de lucht in?';
  $('cg-q-answers').innerHTML = '';
  $('cg-q-result').textContent = '';
  $('cg-q-result').className = 'tw-q-result';
  const st = cg.state || {};
  $('cg-pick-laser').textContent = `${Math.round((st.laserMs || 12000) / 1000)} seconden twee stralen`;
  $('cg-pick-schild').textContent = 'vangt één klap op';
  $('cg-pick-bom').textContent = G.bombs >= 3 ? 'je hebt er al drie' : `ruimt het hele scherm op (${G.bombs}/3)`;
  $('cg-pick').querySelector('[data-kind="bom"]').disabled = G.bombs >= 3;
  $('cg-pick').classList.remove('hidden');
}

function cgPick(kind) {
  if (!cg.question || !cg.question.pick || cg.question.busy) return;
  cg.question.busy = true;
  socket.emit('cg-reward', kind, res => {
    if (!cg.question) return;
    cg.question.busy = false;
    if (!res || res.error) {
      cgToast((res && res.error) || 'Dat lukte niet', 'bad');
      if (res && /eerst/.test(res.error)) cgAsk();
      return;
    }
    const sh = G.ship;
    if (kind === 'laser') {
      sh.laserUntil = Math.max(G.gt, sh.laserUntil) + res.ms / 1000;
      cgBanner('DUBBELE LASER!', '', 'gold');
    } else if (kind === 'schild') {
      sh.shieldUntil = Math.max(G.gt, sh.shieldUntil) + res.ms / 1000;
      cgBanner('SCHILD!', 'Eén klap wordt opgevangen', 'gold');
    } else {
      G.bombs = res.bombs;
      cgBanner('BOM KLAAR!', 'Spatie of 💣 om te gebruiken', 'gold');
    }
    sfx.power();
    if (cg.me) cg.me.rewards = res.rewards;
    cgHud(true);
    if (res.rewards > 0) cgShowPick();
    else cgCloseQuestion();
  });
}

function cgCloseQuestion() {
  clearInterval(cgWaitTimer);
  cg.question = null;
  $('cg-question').classList.add('hidden');
  $('cg-pick').classList.add('hidden');
}

// ---------- Scherm en HUD ----------

let hudKey = '';
function cgHud(force) {
  const sh = G.ship;
  const me = cg.me || {};
  const laser = Math.max(0, sh.laserUntil - G.gt), shield = Math.max(0, sh.shieldUntil - G.gt);
  const key = [G.score, sh.lives, sh.crashed, G.bombs, G.wave, Math.ceil(laser), Math.ceil(shield), me.rewards, me.rank, overheated()].join('|');
  if (!force && key === hudKey) return;
  hudKey = key;
  $('cg-score').textContent = G.score;
  $('cg-lives').innerHTML = [0, 1, 2].map(i => `<i class="${i < sh.lives && !sh.crashed ? 'on' : ''}"></i>`).join('');
  $('cg-wave').textContent = G.boss ? 'BAAS' : `Golf ${Math.max(1, G.wave)}`;
  const fx = [];
  if (laser > 0) fx.push(`<span class="cg-fx-laser">2× laser ${Math.ceil(laser)}</span>`);
  if (shield > 0) fx.push(`<span class="cg-fx-shield">🛡️ ${Math.ceil(shield)}</span>`);
  if (overheated()) fx.push('<span class="cg-fx-hot">🔥 heet</span>');
  $('cg-fx').innerHTML = fx.join('');
  $('cg-bombs').textContent = `💣 ${G.bombs}`;
  $('cg-bomb').classList.toggle('ready', G.bombs > 0);
  $('cg-rank').textContent = me.rank ? `#${me.rank}/${me.players}` : '';
  const badge = $('cg-badge');
  badge.textContent = me.rewards > 0 ? `🎁${me.rewards}` : '';
  badge.classList.toggle('hidden', !(me.rewards > 0));
}

const cgCtx = cgCanvas.getContext('2d');

function cgResize() {
  const stage = $('cg-stage');
  // Op een Chromebook niet meer pixels dan nodig: dat houdt het vlot.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  cgCanvas.width = Math.round(w * dpr);
  cgCanvas.height = Math.round(h * dpr);
  cgCanvas.style.width = `${w}px`;
  cgCanvas.style.height = `${h}px`;
  const cw = cgCanvas.width, ch = cgCanvas.height;
  // Staand (gsm): 480 breed en zo hoog als het scherm. Liggend (Chromebook): 720 hoog en breder, tot 680.
  const oldW = G.W, oldH = G.H;
  if (cw >= ch) {
    G.H = 720;
    G.W = Math.round(Math.max(480, Math.min(680, 720 * cw / ch * .62)));
  } else {
    G.W = 480;
    G.H = Math.round(Math.max(640, Math.min(900, 480 * ch / cw)));
  }
  G.s = Math.min(cw / G.W, ch / G.H);
  G.ox = Math.round((cw - G.W * G.s) / 2);
  G.oy = Math.round((ch - G.H * G.s) / 2);
  G.cw = cw;
  G.ch = ch;
  // Op een gsm staan rechtsonder de knoppen: daar vliegt de ridder niet onder.
  const touch = getComputedStyle(document.querySelector('#cg-game .ar-touch')).display !== 'none';
  G.bottomPad = touch ? Math.max(46, G.H - (ch - 128 * dpr - G.oy) / G.s + 20) : 46;
  if (G.ship && (oldW !== G.W || oldH !== G.H)) {
    G.ship.x = G.ship.x * G.W / oldW;
    G.ship.y = Math.min(G.ship.y, G.H - G.bottomPad);
  }
}
window.addEventListener('resize', cgResize);

function drawSky(ctx, t) {
  const { cw, ch } = G;
  // Sterren alleen boven het speelveld: de randen zitten al in de gebakken achtergrond. Scheelt veel pixels per beeld.
  const pw = Math.ceil(G.W * G.s);
  const px = G.ox > 4 ? G.ox : 0, sw = G.ox > 4 ? pw : cw;
  ctx.drawImage(CgArt.frame(cw, ch, G.ox > 4 ? G.ox : 0, pw), 0, 0);
  const layers = [[60, 1, 11, 18], [40, 1.6, 23, 40], [16, 2.4, 37, 90]];
  layers.forEach(([count, size, seed, speed], i) => {
    const img = CgArt.stars(sw, ch, Math.round(count * sw * ch / 500000) + 20, size * G.s, seed);
    const off = (t * speed * G.s) % ch;
    ctx.drawImage(img, px, off - ch);
    ctx.drawImage(img, px, off);
    if (i === 0) {
      // Zwevende burchten in de verte.
      const castle = CgArt.castle(G.s * .9);
      const period = 26;
      const k = (t / period) % 1;
      const n = Math.floor(t / period);
      const x = G.ox + ((n * 197) % 360 + 20) * G.s;
      ctx.globalAlpha = .7;
      ctx.drawImage(castle, x, -castle.height + k * (ch + castle.height * 2));
      ctx.globalAlpha = 1;
    }
  });
}

function draw(t) {
  const ctx = cgCtx;
  const { s, ox, oy } = G;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawSky(ctx, t);
  if (G.shake > 0) ctx.translate((Math.random() - .5) * 14 * G.shake * s, (Math.random() - .5) * 14 * G.shake * s);
  const X = x => ox + x * s, Y = y => oy + y * s;
  // De baas.
  const B = G.boss;
  if (B && !B.gone) {
    if (B.beam) {
      const warn = G.gt < B.beam.warn;
      const bx = X(B.beam.x);
      if (warn) {
        ctx.fillStyle = `rgba(255, 77, 210, ${.15 + Math.sin(t * 30) * .1})`;
        ctx.fillRect(bx - 24 * s, Y(B.y + 60), 48 * s, (G.H - B.y) * s);
      } else {
        const grad = ctx.createLinearGradient(bx - 26 * s, 0, bx + 26 * s, 0);
        grad.addColorStop(0, 'rgba(255,77,210,0)');
        grad.addColorStop(.3, 'rgba(255,77,210,.9)');
        grad.addColorStop(.5, '#ffffff');
        grad.addColorStop(.7, 'rgba(255,77,210,.9)');
        grad.addColorStop(1, 'rgba(255,77,210,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx - 26 * s, Y(B.y + 60), 52 * s, (G.H - B.y) * s);
      }
    }
    const img = CgArt.boss(Math.floor(t * 3) % 2, s, G.gt < B.hurt);
    if (B.state === 'dead') ctx.globalAlpha = Math.max(0, 1 - B.t / 2.8);
    ctx.drawImage(img, X(B.x) - 160 * s, Y(B.y) - 100 * s);
    ctx.globalAlpha = 1;
  }
  // Draken.
  for (const e of G.enemies) {
    if (e.state === 'wait') continue;
    const img = CgArt.dragon(e.type, (Math.floor(t * 5.5) + e.frame) % 2, s, G.gt < e.hit);
    ctx.save();
    ctx.translate(X(e.x), Y(e.y));
    if (e.angle) ctx.rotate(e.angle);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }
  // Lasers.
  const boltBlue = CgArt.bolt('#4cc9ff', s), boltGold = CgArt.bolt('#ffc94a', s);
  for (const b of G.bolts) {
    const img = b.gold ? boltGold : boltBlue;
    ctx.drawImage(img, X(b.x) - img.width / 2, Y(b.y) - img.height / 2);
  }
  // Vuurballen.
  const fb = CgArt.fireball(s), fbPink = CgArt.fireball(s, '#ff4dd2');
  for (const sh of G.shots) {
    const img = B ? fbPink : fb;
    const k = sh.r / 6;
    ctx.drawImage(img, X(sh.x) - img.width * k / 2, Y(sh.y) - img.height * k / 2, img.width * k, img.height * k);
  }
  // De ridder.
  const sh = G.ship;
  if (!sh.crashed) {
    CgArt.ship(ctx, X(sh.x), Y(sh.y), s, {
      t, av: typeof Avatar !== 'undefined' ? Avatar.mine() : null, color: CgArt.COLORS[(cg.state && cg.state.color) || 0],
      shield: G.gt < sh.shieldUntil, blink: G.gt < sh.inv, hot: overheated(),
    });
  }
  // Deeltjes met optellend licht.
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.parts) {
    const k = p.life / p.max;
    if (p.ring) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = k;
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), (p.size + (1 - k) * 60) * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    const r = p.size * s * (.4 + k * .6);
    ctx.globalAlpha = Math.min(1, k * 1.4);
    ctx.drawImage(CgArt.glow(p.color, 16), X(p.x) - r, Y(p.y) - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // Punten.
  ctx.textAlign = 'center';
  ctx.font = `800 ${Math.round(15 * s)}px Orbitron, system-ui, sans-serif`;
  for (const tx of G.texts) {
    ctx.globalAlpha = Math.min(1, tx.life * 2);
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.text, X(tx.x), Y(tx.y));
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // De levensbalk van de klasbaas, van de hele klas samen.
  if (B && cg.boss && cg.boss.on) {
    const target = Math.max(0, cg.bossHp - G.dmgOut - (cg.pendingSent || 0));
    if (!cg.bossShown || target < cg.bossShown || target > cg.bossShown + cg.boss.max * .05) cg.bossShown = target;
    const w = Math.min(G.W * s - 30 * s, 520 * s), x = (G.cw - w) / 2, y = oy + 12 * s, h = 14 * s;
    ctx.fillStyle = 'rgba(10, 4, 20, .8)';
    ctx.fillRect(x - 3 * s, y - 3 * s, w + 6 * s, h + 6 * s);
    const k = cg.boss.max ? cg.bossShown / cg.boss.max : 0;
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#ff4dd2');
    grad.addColorStop(1, '#ffc94a');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w * k, h);
    ctx.strokeStyle = '#ff4dd2';
    ctx.lineWidth = 1.5 * s;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(11 * s)}px Orbitron, system-ui, sans-serif`;
    ctx.fillText(`KLASBAAS · ${Math.ceil(cg.bossShown)} / ${cg.boss.max}`, G.cw / 2, y + h + 14 * s);
  }
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${G.flash * .6})`;
    ctx.fillRect(0, 0, G.cw, G.ch);
  }
}

// De stand doorgeven aan de server (de schade aan de baas zo snel mogelijk).
setInterval(() => {
  if (!cg.joined || !cg.state || cg.state.phase !== 'play') return;
  const c = cg.sent;
  if (!G.dmgOut && c.score === G.score && c.dragons === G.dragons && c.wave === G.wave && c.crashes === G.crashes) return;
  socket.emit('cg-report', { score: G.score, dragons: G.dragons, wave: G.wave, crashes: G.crashes, dmg: G.dmgOut });
  cg.pendingSent = (cg.pendingSent || 0) + G.dmgOut;
  G.dmgOut = 0;
  cg.sent = { score: G.score, dragons: G.dragons, wave: G.wave, crashes: G.crashes };
}, 350);

let cgLast = 0;
function cgFrame(ts) {
  requestAnimationFrame(cgFrame);
  if (document.body.dataset.cg !== '1' || !cg.state || $('cg-game').classList.contains('hidden')) { cgLast = ts; return; }
  const dt = Math.min(.05, Math.max(0, (ts - cgLast) / 1000));
  cgLast = ts;
  if (!G.cw) cgResize();
  if (!G.cw) return;
  const now = cgNow();
  const st = cg.state;
  if (st.phase === 'play') {
    const left = Math.max(0, st.endsAt - now);
    $('cg-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
    const wait = st.startedAt - now;
    $('cg-countdown').classList.toggle('hidden', !(wait > 0));
    if (wait > 0) $('cg-countdown').textContent = Math.ceil(wait / 1000);
    const toBoss = st.bossAt - now;
    $('cg-boss-in').textContent = toBoss > 0 && toBoss < 20000 ? `🐲 Klasbaas over ${Math.ceil(toBoss / 1000)}` : '';
    if (G.ship.crashed) $('cg-out-timer').textContent = `Vanzelf terug over ${Math.max(0, Math.ceil((G.ship.crashEnd - performance.now()) / 1000))}…`;
    // Tijdens een vraag staat het spel stil; de sterren schuiven wel verder.
    if (wait <= 0 && !cg.question) update(dt);
  }
  draw(ts / 1000);
  cgHud(false);
}
requestAnimationFrame(cgFrame);
