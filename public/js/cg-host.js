// Cyber-Galaga op het bord: alle piloten van de klas onderaan, een zwerm cyberdraken erboven,
// en op het einde de klasbaas met één levensbalk voor de hele klas.
// Elke draak die een leerling op zijn toestel neerhaalt, wordt hier ook door zijn ridder neergeschoten.
// Gebruikt sfx, confetti uit fx.js, quizMakerUrl uit quiz-links.js, CgArt uit cg-art.js.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let view = 'setup';
const VIEWS = ['setup', 'lobby', 'play', 'podium'];
function show(name) {
  if (view !== name) window.scrollTo(0, 0);
  view = name;
  for (const s of VIEWS) $(s).classList.toggle('hidden', s !== name);
}

document.addEventListener('click', () => sfx.unlock(), { once: true });
$('mute').textContent = sfx.muted ? '🔇' : '🔊';
$('mute').addEventListener('click', () => { $('mute').textContent = sfx.toggle() ? '🔇' : '🔊'; });
$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });

function downloadLink(file) {
  const link = document.createElement('a');
  link.href = `/resultaten/${encodeURIComponent(file)}`;
  link.download = file;
  link.textContent = 'Download voor Excel';
  return link;
}

QuizList.mount($('quiz-list'), {
  play: q => {
    $('stopped').classList.add('hidden');
    loadGame('cg-load', { file: q.file, minutes: Number($('cg-minutes').value), tempo: $('cg-tempo').value }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
  remove: q => {
    if (!confirm(`"${q.title}" verwijderen?`)) return;
    socket.emit('delete', q.file, res => { $('load-error').textContent = res.error || ''; });
  },
});


socket.on('cg-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Cyber-Galaga · ${s.title}` : 'Cyber-Galaga';
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    if (!prev || prev.phase !== 'play') {
      sfx.go();
      scene.reset();
    }
    show('play');
    sync(s);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('cg-tick', msg => {
  if (!state || state.phase !== 'play') return;
  offset = msg.now - Date.now();
  if (msg.ranking) state.ranking = msg.ranking;
  if (msg.feed) state.feed = msg.feed;
  state.boss = msg.boss;
  sync(state);
});

function renderLobby() {
  const n = state.ranking.length;
  $('player-count').textContent = n;
  $('player-word').textContent = n === 1 ? 'piloot' : 'piloten';
  $('start').disabled = n === 0;
  const box = $('names');
  const current = new Set(state.ranking.map(p => p.id));
  for (const el of [...box.children]) if (!current.has(el.dataset.id)) el.remove();
  const known = new Set([...box.children].map(el => el.dataset.id));
  for (const p of state.ranking) {
    if (known.has(p.id)) continue;
    const el = document.createElement('span');
    el.className = 'name';
    el.dataset.id = p.id;
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('cg-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  $('p-top').innerHTML = (ranking || []).slice(0, 10).map(r => `<li><i class="bb-dot" style="background:${CgArt.COLORS[r.color]}"></i><span data-av="${esc(r.name)}">${esc(r.name)}</span><b>${r.score}</b></li>`).join('');
  const key = JSON.stringify(feed || []);
  if (key !== lastFeed) {
    lastFeed = key;
    $('p-feed').innerHTML = (feed || []).map(f => `<li>${esc(f.text)}</li>`).join('');
  }
}

let bannerTimer = null;
function banner(text, ms = 2400) {
  const el = $('p-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

// ---------- De scène op het bord ----------

const scene = {
  ships: new Map(),   // n -> { name, color, dragons, bossDmg, x, fire }
  flock: [],
  bolts: [],
  parts: [],
  boss: null,         // { on, hp, max, down, escaped, shown, hurt, t }
  reset() {
    this.ships.clear();
    this.flock = [];
    this.bolts = [];
    this.parts = [];
    this.boss = null;
  },
};

function sync(s) {
  renderSide(s.ranking, s.feed);
  for (const r of s.ranking || []) {
    let sh = scene.ships.get(r.n);
    if (!sh) {
      sh = { n: r.n, name: r.name, color: r.color, dragons: r.dragons, bossDmg: r.bossDmg, x: .5, queue: 0, bossQueue: 0, seed: Math.random() * 6 };
      scene.ships.set(r.n, sh);
    }
    // Wat de leerling op zijn toestel neerhaalde, schiet zijn ridder hier ook neer (hooguit een paar tegelijk).
    if (r.dragons > sh.dragons) sh.queue = Math.min(4, sh.queue + r.dragons - sh.dragons);
    if (r.bossDmg > sh.bossDmg) sh.bossQueue = Math.min(6, sh.bossQueue + Math.ceil((r.bossDmg - sh.bossDmg) / 8));
    sh.dragons = r.dragons;
    sh.bossDmg = r.bossDmg;
    sh.wave = r.wave;
  }
  const ids = new Set((s.ranking || []).map(r => r.n));
  for (const n of scene.ships.keys()) if (!ids.has(n)) scene.ships.delete(n);
  const b = s.boss || {};
  const was = scene.boss;
  if (b.on && !was) {
    scene.boss = { ...b, shown: b.hp, y: -0.4, hurt: 0, t: 0 };
    banner('⚠ DE KLASBAAS VERSCHIJNT! ⚠', 3000);
    sfx.gong();
  } else if (was) {
    if (b.hp < was.hp) was.hurt = performance.now() + 80;
    Object.assign(was, { hp: b.hp, max: b.max, down: b.down, escaped: b.escaped });
    if (b.down && !was.dead) {
      was.dead = performance.now();
      banner('🏆 KLASBAAS VERSLAGEN! 🏆', 5000);
      sfx.fanfare();
      confetti(6000);
    }
  }
}

const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
let lastT = 0;

function boom(x, y, color, n, u) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 260) * u;
    scene.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .4 + Math.random() * .5, max: .9, color: Math.random() < .3 ? '#ffffff' : color, size: (6 + Math.random() * 8) * u });
  }
  if (scene.parts.length > 400) scene.parts.splice(0, scene.parts.length - 400);
}

function frame(ts) {
  requestAnimationFrame(frame);
  if (view !== 'play' || !state) { lastT = ts; return; }
  const dt = Math.min(.05, (ts - lastT) / 1000);
  lastT = ts;
  const t = ts / 1000;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(300, Math.round(r.width * dpr));
  const h = Math.max(200, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const u = h / 720;
  // Hemel.
  ctx.drawImage(CgArt.nebula(w, h), 0, 0);
  [[90, 1.2, 5, 14], [50, 2, 9, 34]].forEach(([count, size, seed, speed]) => {
    const img = CgArt.stars(w, h, count, size * u, seed);
    const off = (t * speed * u) % h;
    ctx.drawImage(img, 0, off - h);
    ctx.drawImage(img, 0, off);
  });
  const castle = CgArt.castle(u * 1.4);
  ctx.globalAlpha = .6;
  ctx.drawImage(castle, w * .08, h * .5 - castle.height / 2 + Math.sin(t * .4) * 10 * u);
  ctx.drawImage(castle, w * .78, h * .35 - castle.height / 2 + Math.sin(t * .3 + 2) * 10 * u);
  ctx.globalAlpha = 1;

  const now = Date.now() + offset;
  const B = scene.boss;
  // De zwerm draken (alleen zolang de baas er niet is).
  const want = B ? 0 : 12;
  while (scene.flock.length < want) {
    const i = scene.flock.length;
    scene.flock.push({ c: i % 6, r: Math.floor(i / 6), type: i < 6 ? (i % 3 === 0 ? 2 : 1) : 0, y: -60 * u, frame: i % 2, alive: true, back: 0 });
  }
  for (const d of scene.flock) {
    const tx = w / 2 + (d.c - 2.5) * 90 * u + Math.sin(t * .6) * 120 * u;
    const ty = 110 * u + d.r * 80 * u + Math.sin(t * 1.3 + d.c) * 8 * u;
    if (B) d.y -= 500 * u * dt;
    else if (!d.alive) {
      if (performance.now() > d.back) { d.alive = true; d.y = -60 * u; }
      continue;
    } else d.y += (ty - d.y) * Math.min(1, dt * 2);
    d.x = tx;
    const img = CgArt.dragon(d.type, (Math.floor(t * 5) + d.frame) % 2, 1.8 * u);
    ctx.drawImage(img, d.x - img.width / 2, d.y - img.height / 2);
  }
  if (B) scene.flock = scene.flock.filter(d => d.y > -100 * u);

  // De piloten onderaan, in een of twee rijen.
  const ships = [...scene.ships.values()];
  const perRow = ships.length > 15 ? Math.ceil(ships.length / 2) : ships.length;
  const k = Math.min(1.5, Math.max(.75, 11 / Math.max(perRow, 1))) * u;
  ships.forEach((sh, i) => {
    const row = perRow ? Math.floor(i / perRow) : 0;
    const col = i % perRow;
    const n = Math.min(perRow, ships.length - row * perRow);
    sh.px = w * ((col + .5) / n) * .9 + w * .05;
    sh.py = h - (70 + row * 85) * u + Math.sin(t * 2 + sh.seed) * 6 * u;
    // Schieten: op een draak uit de zwerm, of op de baas.
    sh.cool = (sh.cool || 0) - dt;
    if (sh.cool <= 0) {
      if (B && !B.dead && sh.bossQueue > 0) {
        sh.bossQueue--;
        sh.cool = .18;
        scene.bolts.push({ x: sh.px, y: sh.py - 30 * u, tx: w / 2 + (Math.random() - .5) * 140 * u, ty: (B.y * h) + 40 * u, boss: true });
      } else if (!B && sh.queue > 0) {
        const alive = scene.flock.filter(d => d.alive && Math.abs(d.y - (110 * u + d.r * 80 * u)) < 30 * u);
        if (alive.length) {
          sh.queue--;
          sh.cool = .35;
          const d = alive[Math.floor(Math.random() * alive.length)];
          d.alive = false;
          d.back = performance.now() + 2500 + Math.random() * 2000;
          scene.bolts.push({ x: sh.px, y: sh.py - 30 * u, tx: d.x, ty: d.y, color: CgArt.DRAGONS[d.type].neon });
        }
      }
    }
    CgArt.ship(ctx, sh.px, sh.py, k, { t: t + sh.seed, av: typeof Avatar !== 'undefined' ? Avatar.byName(sh.name) : null, color: CgArt.COLORS[sh.color] });
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(12 * u)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(sh.name, sh.px, sh.py + 36 * k);
  });

  // De klasbaas.
  if (B) {
    B.t += dt;
    const target = B.escaped ? -1 : .26;
    B.y += (target - B.y) * Math.min(1, dt * (B.escaped ? 1.5 : .8));
    const bs = 1.6 * u;
    const bx = w / 2 + Math.sin(t * .5) * w * .18;
    const by = B.y * h;
    if (!B.dead || performance.now() - B.dead < 3000) {
      ctx.globalAlpha = B.dead ? Math.max(0, 1 - (performance.now() - B.dead) / 3000) : 1;
      const img = CgArt.boss(Math.floor(t * 3) % 2, bs, performance.now() < B.hurt);
      ctx.drawImage(img, bx - 160 * bs, by - 100 * bs);
      ctx.globalAlpha = 1;
      if (B.dead && Math.random() < dt * 18) boom(bx + (Math.random() - .5) * 300 * u, by + (Math.random() - .5) * 180 * u, Math.random() < .5 ? '#ff4dd2' : '#ffc94a', 12, u);
    }
    // Levensbalk van de hele klas.
    B.shown += (B.hp - B.shown) * Math.min(1, dt * 6);
    const bw = Math.min(w * .7, 900 * u), bxl = (w - bw) / 2, byt = 16 * u, bh = 26 * u;
    ctx.fillStyle = 'rgba(10, 4, 20, .85)';
    ctx.fillRect(bxl - 4 * u, byt - 4 * u, bw + 8 * u, bh + 8 * u);
    const grad = ctx.createLinearGradient(bxl, 0, bxl + bw, 0);
    grad.addColorStop(0, '#ff4dd2');
    grad.addColorStop(1, '#ffc94a');
    ctx.fillStyle = grad;
    ctx.fillRect(bxl, byt, bw * (B.max ? Math.max(0, B.shown) / B.max : 0), bh);
    ctx.strokeStyle = '#ff4dd2';
    ctx.lineWidth = 2 * u;
    ctx.strokeRect(bxl, byt, bw, bh);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(16 * u)}px Orbitron, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(B.dead ? 'VERSLAGEN!' : `KLASBAAS · ${Math.ceil(Math.max(0, B.shown))} / ${B.max}`, w / 2, byt + bh * .72);
  } else if (state.bossAt) {
    const left = state.bossAt - now;
    if (left > 0) {
      ctx.fillStyle = left < 15000 ? '#ff4dd2' : 'rgba(255, 255, 255, .7)';
      ctx.font = `900 ${Math.round((left < 15000 ? 26 : 18) * u)}px Orbitron, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`🐲 KLASBAAS OVER ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`, w / 2, 40 * u);
    }
  }

  // Lasers die naar hun doel vliegen.
  const blue = CgArt.bolt('#4cc9ff', u * 1.4);
  for (const b of scene.bolts) {
    const dx = b.tx - b.x, dy = b.ty - b.y;
    const d = Math.hypot(dx, dy);
    const step = 1400 * u * dt;
    if (d <= step) {
      b.dead = true;
      boom(b.tx, b.ty, b.boss ? '#ff9be8' : b.color, b.boss ? 5 : 18, u);
      if (!b.boss) sfx.boom();
      continue;
    }
    b.x += dx / d * step;
    b.y += dy / d * step;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2);
    ctx.drawImage(blue, -blue.width / 2, -blue.height / 2);
    ctx.restore();
  }
  scene.bolts = scene.bolts.filter(b => !b.dead);
  ctx.globalCompositeOperation = 'lighter';
  for (const p of scene.parts) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - dt * 2;
    p.vy *= 1 - dt * 2;
    const kk = Math.max(0, p.life / p.max);
    const rr = p.size * (.4 + kk * .6);
    ctx.globalAlpha = Math.min(1, kk * 1.4);
    ctx.drawImage(CgArt.glow(p.color, 16), p.x - rr, p.y - rr, rr * 2, rr * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  scene.parts = scene.parts.filter(p => p.life > 0);
}
requestAnimationFrame(frame);

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = Math.max(0, state.endsAt - now);
  $('p-clock').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  $('p-clock').classList.toggle('low', left < 30000);
  const wait = state.startedAt - now;
  $('p-countdown').classList.toggle('hidden', !(wait > 0));
  if (wait > 0) $('p-countdown').textContent = Math.ceil(wait / 1000);
}, 200);

$('start').addEventListener('click', () => socket.emit('cg-start'));
$('p-finish').addEventListener('click', () => {
  if (confirm('Het spel nu stoppen en de eindstand tonen?')) socket.emit('cg-finish');
});
$('restart').addEventListener('click', () => socket.emit('cg-restart'));
$('close').addEventListener('click', () => socket.emit('cg-stop', null, () => show('setup')));
$('stop').addEventListener('click', () => {
  if (!confirm('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('cg-stop', null, res => {
    const note = $('stopped');
    note.innerHTML = '';
    note.append('Het spel is gestopt.');
    if (res && res.file) {
      note.append(' De resultaten zijn bewaard. ');
      note.append(downloadLink(res.file));
    }
    note.classList.remove('hidden');
    show('setup');
  });
});

function renderEnd() {
  const s = state;
  const saved = $('results-saved');
  saved.innerHTML = '';
  if (s.resultsFile) {
    saved.append('Resultaten opgeslagen. ');
    saved.append(downloadLink(s.resultsFile));
  }
  const top = s.ranking[0];
  const b = s.boss || {};
  $('w-title').textContent = b.down ? '🏆 De klas heeft de klasbaas verslagen!' : top ? `🏆 ${top.name} wint Cyber-Galaga!` : 'Cyber-Galaga is voorbij';
  const dragons = s.ranking.reduce((a, r) => a + r.dragons, 0);
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  const bossTop = [...s.ranking].sort((a, c) => c.bossDmg - a.bossDmg)[0];
  $('w-why').textContent = `Samen ${right} vragen juist en ${dragons} cyberdraken neergehaald.${b.escaped ? ' De klasbaas is net ontsnapt.' : ''}${bossTop && bossTop.bossDmg ? ` Meeste schade aan de baas: ${bossTop.name}.` : ''}`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${CgArt.COLORS[p.color]}"></i>${esc(p.name)}</span><span class="muted">🐉 ${p.dragons} · golf ${p.wave} · ✔ ${p.right}</span><span class="pts">${p.score}</span></li>`).join('');
  if (top || b.down) { sfx.fanfare(); confetti(5000); }
}
