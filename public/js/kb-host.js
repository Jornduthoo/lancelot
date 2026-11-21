// Kegelridder op het bord, als een tv-uitzending: de kegelhal speelt de mooiste worpen van de klas na (strikes en spares
// eerst, een strike in vertraging met de naam groot in beeld), met daarna de scorekaart van die speler. Tussen de
// herhalingen de top 5 van de klas. Naast de baan de stand en wat er net gebeurde. Elke worp is vier getallen; het bord rekent hem zelf na (kb-world.js).
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK, KbWorld en KbDraw.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const W = KbWorld;
let state = null;
let prev = null;
let offset = 0;
let roster = new Map();

let view = 'setup';
const VIEWS = ['setup', 'lobby', 'play', 'podium'];
function show(name) {
  if (view !== name) window.scrollTo(0, 0);
  view = name;
  for (const s of VIEWS) $(s).classList.toggle('hidden', s !== name);
}

document.addEventListener('click', () => sfx.unlock(), { once: true });
$('mute').innerHTML = Ui.ic(sfx.muted ? 'stil' : 'geluid');
$('mute').addEventListener('click', () => { $('mute').innerHTML = Ui.ic(sfx.toggle() ? 'stil' : 'geluid'); });
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
    loadGame('kb-load', {
      file: q.file, minutes: Number($('kb-minutes').value), tempo: $('kb-tempo').value,
      per: Number($('kb-per').value), telling: $('kb-telling').value, mikken: $('kb-mikken').value,
    }, res => { $('load-error').textContent = res.error || ''; });
  },
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});

// Echte telling met weinig tijd of 1 bal per vraag: een korte tip, want dan raakt een spel van 10 beurten niet af.
function tipTelling() {
  const echt = $('kb-telling').value === 'echt';
  $('kb-tip-telling').classList.toggle('hidden', !(echt && (Number($('kb-per').value) === 1 || Number($('kb-minutes').value) < 5)));
}
for (const id of ['kb-telling', 'kb-per', 'kb-minutes']) $(id).addEventListener('change', tipTelling);
// Wie de echte telling kiest, krijgt meteen 2 ballen per vraag en minstens 5 minuten voorgesteld.
$('kb-telling').addEventListener('change', () => {
  if ($('kb-telling').value !== 'echt') return;
  $('kb-per').value = '2';
  if (Number($('kb-minutes').value) < 5) $('kb-minutes').value = '5';
  tipTelling();
});
tipTelling();

socket.on('kb-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  roster = new Map(s.roster.map(r => [r.n, r]));
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `Kegelridder · ${s.title}` : 'Kegelridder';
  if (prev && prev.run !== s.run) { queue.length = 0; replay = null; idle = null; seen = 0; held.clear(); shown = []; rawRanking = []; rawFeed = []; }
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    take(s.throws);
    renderSide(s.ranking, s.feed);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('kb-tick', msg => {
  if (!state || state.phase !== 'play') return;
  state.ranking = msg.ranking;
  state.feed = msg.feed;
  take(msg.throws);
  renderSide(msg.ranking, msg.feed);
});

// ---------- De worpen naspelen ----------
const queue = [];
let seen = 0;
let replay = null;
let idle = null; // de stand van de laatste speler tussen twee herhalingen
function take(throws) {
  for (const t of throws || []) {
    if (t.id <= seen) continue;
    seen = t.id;
    t.got = performance.now();
    queue.push(t);
  }
  // Te veel in de wachtrij: gewone worpen vallen weg, strikes en spares blijven (maar nooit meer dan 4).
  while (queue.length > 3) {
    const i = queue.findIndex(t => !t.kind);
    if (i >= 0) queue.splice(i, 1); else queue.shift();
  }
}

function nextReplay(t) {
  const th = queue.shift();
  if (!th) return null;
  const sim = W.create(th.t, th.standing, th.gold);
  // De server wist al welke kegels vielen; dat tonen we ook als de uitslag.
  return { th, sim, clock: 0, hitAt: -1, ended: 0, hits: 0, shown: false };
}

function renderLobby() {
  const list = state.roster;
  $('player-count').textContent = list.length;
  $('player-word').textContent = list.length === 1 ? 'kegelridder' : 'kegelridders';
  $('start').disabled = list.length === 0;
  const box = $('names');
  const current = new Set(list.map(p => p.id));
  for (const el of [...box.children]) if (!current.has(el.dataset.id)) el.remove();
  const known = new Set([...box.children].map(el => el.dataset.id));
  for (const p of list) {
    if (known.has(p.id)) continue;
    const el = document.createElement('span');
    el.className = 'name';
    el.dataset.id = p.id;
    el.style.setProperty('--cape', p.color);
    el.textContent = p.name;
    el.title = 'Verwijderen';
    el.addEventListener('click', () => socket.emit('kb-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

// Het bord verklapt niets: zolang een worp nog niet nagespeeld is (tot de uitslag op de baan verschijnt), blijven de score van
// die speler, de teller "N kegels om" en het bericht over die worp zoals ze waren. Zo kijkt de klas mee naar de bal.
const held = new Map(); // n -> de rij die het bord toont
let shown = [];
let rawRanking = [], rawFeed = [];
function pending() {
  const ids = new Set(), ns = new Set();
  for (const th of queue) { ids.add(th.id); ns.add(th.n); }
  if (replay && !replay.counted) { ids.add(replay.th.id); ns.add(replay.th.n); }
  return { ids, ns };
}
let pinsShown = -1;
let lastSide = '';
let lastFeed = '';
function renderSide(ranking, feed) {
  if (ranking) rawRanking = ranking;
  if (feed) rawFeed = feed;
  const wait = pending();
  shown = rawRanking.map(r => {
    if (!wait.ns.has(r.n) || !held.has(r.n)) {
      if (!wait.ns.has(r.n)) held.set(r.n, r);
      return wait.ns.has(r.n) ? { ...r, score: 0, pins: 0, strikes: 0, spares: 0 } : r;
    }
    return { ...held.get(r.n), name: r.name, color: r.color };
  }).sort((a, b) => b.score - a.score || b.strikes - a.strikes || b.pins - a.pins);
  const html = shown.slice(0, 14).map(r => `<li><i class="bb-dot" style="background:${r.color}"></i><span>${AK.esc(r.name)} <small class="muted">${r.strikes ? `X ${r.strikes}` : ''}${r.spares ? ` · / ${r.spares}` : ''}</small></span><b>${r.score}</b></li>`).join('');
  if (html !== lastSide) { lastSide = html; $('p-top').innerHTML = html; }
  const list = rawFeed.filter(f => !(f.tid && wait.ids.has(f.tid)));
  const key = JSON.stringify(list);
  if (key !== lastFeed) {
    lastFeed = key;
    $('p-feed').innerHTML = list.map(f => `<li>${AK.esc(f.text)}</li>`).join('');
  }
  const n = shown.reduce((a, r) => a + r.pins, 0);
  if (n !== pinsShown) {
    pinsShown = n;
    $('p-alive').textContent = `🎳 ${n} ${n === 1 ? 'kegel' : 'kegels'} om`;
  }
}

// De scorekaart van de speler van de herhaling, onderaan het spelbeeld.
let cardTimer = null;
function showCard(th) {
  const c = W.card(th.rolls || []);
  const simpel = state && state.telling === 'eenvoudig';
  let html = `<div class="kb-bord-naam" style="--cape:${th.color}">${AK.esc(th.name)}</div>`;
  for (let f = 0; f < 10; f++) {
    const fr = c.frames[f] || { marks: [], total: null };
    let marks = '';
    for (let k = 0; k < (f === 9 ? 3 : 2); k++) marks += `<b>${fr.marks[k] || ''}</b>`;
    const tot = simpel || !fr.marks.length ? '' : fr.total !== null ? fr.total : `<em>${fr.live}</em>`;
    html += `<div class="kb-cel${f + 1 === th.frame ? ' nu' : ''}"><small>${f + 1}</small><span>${marks}</span><i>${tot}</i></div>`;
  }
  const el = $('p-card');
  el.innerHTML = html;
  el.classList.remove('hidden');
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

let bannerTimer = null;
function banner(text) {
  const el = $('p-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

// ---------- Tekenen ----------
const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
const fx = new AK.Particles();
let camY = KbDraw.REST, camX = 0;
let last = performance.now();
const SPEED = 1.3; // het bord speelt iets sneller na, zo blijft het bij
function frame(t) {
  requestAnimationFrame(frame);
  // Op echte tijd, ook als de pc maar 1 beeld per seconde haalt (tot 10 s tussen twee beelden).
  const real = Math.min(10, Math.max(0, (t - last) / 1000));
  const dt = Math.min(.05, real);
  last = t;
  if (view !== 'play' || !state) return;
  const fit = AK.fit(canvas, 1.25);
  const w = fit.w, h = fit.h;
  if (!replay && queue.length) {
    replay = nextReplay(t);
    // De kaart en de uitslag van de vorige speler weg, zodat ze niet bij de nieuwe worp lijkt te horen.
    clearTimeout(cardTimer);
    clearTimeout(bannerTimer);
    $('p-card').classList.add('hidden');
    $('p-banner').classList.add('hidden');
  }
  const o = { t: t / 1000 };
  let wantY = KbDraw.REST, wantX = 0;
  if (replay) {
    const r = replay;
    // Een strike in vertraging (de klas juicht mee), de rest iets sneller zodat het bord bijblijft.
    // Loopt het bord achter (worpen in de wachtrij, of een trage pc), dan gaat het sneller en zonder vertraging.
    const late = t - r.th.got;
    const behind = queue.length > 0 || late > 10000 || real > .25;
    const slow = !behind && r.hitAt >= 0 && r.sim.t - r.hitAt < (r.th.kind === 'strike' ? 1.4 : .9);
    r.clock += real * (slow ? (r.th.kind === 'strike' ? .3 : .45) : behind ? SPEED * 2 : SPEED);
    if (late > 20000) r.clock = 60; // veel te laat: meteen de uitslag
    W.runTo(r.sim, r.clock);
    const down = r.sim.pins.filter(p => p.down).length;
    // Met een volle klas alleen geluid bij strikes en spares (zachter bord).
    if (down > r.hits) { if (!r.hits) { if (r.th.kind || roster.size <= 15) sfx.boom(); r.hitAt = r.sim.t; } r.hits = down; }
    o.sim = r.sim;
    o.name = r.th;
    wantY = KbDraw.camFor(r.sim.b.pit ? W.HEAD : r.sim.b.y);
    wantX = r.sim.b.gutter ? 0 : r.sim.b.x * .4;
    if (r.sim.done) {
      if (!r.ended) r.ended = t;
      if (!r.shown) {
        r.shown = true;
        r.counted = true; // teller, score en melding tegelijk
        const n = r.th.down.length;
        if (r.th.kind === 'strike') { banner(`🎳 STRIKE! ${r.th.name}`); sfx.fanfare(); stars(w / fit.dpr / 2, h / fit.dpr * .35, 50); }
        else if (r.th.kind === 'spare') { banner(r.th.split ? `💥 SPLIT OM! ${r.th.name}` : `✨ SPARE! ${r.th.name}`); sfx.go(); stars(w / fit.dpr / 2, h / fit.dpr * .35, r.th.split ? 40 : 26); }
        else banner(`${r.th.name}: ${n} ${n === 1 ? 'kegel' : 'kegels'}`);
        showCard(r.th);
      }
      o.fade = Math.max(0, 1 - (t - r.ended) / 900);
      if (t - r.ended > (queue.length ? 500 : r.th.kind ? 2200 : 1100)) {
        // Staat er na deze bal nog iets (de beurt is niet af), dan toont de baan tussendoor die echte stand.
        const th = r.th;
        const pos = W.where(th.rolls || []);
        const after = th.standing.map((up, i) => up && !th.down.includes(i));
        idle = th.gameScore == null && !pos.fresh && after.some(Boolean) ? { th, standing: after } : null; // blijft staan tot de volgende worp op het bord
        replay = null;
      }
    }
  } else {
    o.standing = idle ? idle.standing : Array(10).fill(true);
  }
  renderSide();
  camY += (wantY - camY) * Math.min(1, dt * 5);
  camX += (wantX - camX) * Math.min(1, dt * 3);
  o.camY = camY;
  o.camX = camX;
  KbDraw.render(ctx, w, h, o);
  // Wie gooit er nu?
  if (replay && replay.th.kind === 'strike' && !replay.ended) {
    // Een strike: de naam groot in beeld, zoals op tv.
    const th = replay.th;
    ctx.save();
    ctx.font = `900 ${Math.round(h * .075)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(5,6,15,.55)';
    const tw = Math.min(ctx.measureText(th.name).width, w * .8);
    ctx.fillRect(w / 2 - tw / 2 - h * .03, h * .03, tw + h * .06, h * .1);
    ctx.fillStyle = th.color;
    ctx.fillRect(w / 2 - tw / 2 - h * .03, h * .125, tw + h * .06, h * .006);
    ctx.fillStyle = '#ffc94a';
    ctx.fillText(th.name, w / 2, h * .045, w * .8);
    ctx.restore();
  } else if (replay && !replay.shown) {
    const th = replay.th;
    ctx.save();
    ctx.font = `800 ${Math.round(h * .036)}px Orbitron, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(5,6,15,.6)';
    // Onderaan links: bovenaan staat de scorekaart van de vorige worp nog.
    const label = `${th.name} · beurt ${th.frame} · bal ${th.ball}${th.gold ? ' · ✨' : ''}`;
    const tw = Math.min(ctx.measureText(label).width, w * .6);
    const y = h * .9;
    ctx.fillRect(h * .02, y, tw + h * .05, h * .065);
    ctx.fillStyle = th.color;
    ctx.fillRect(h * .02, y, h * .012, h * .065);
    ctx.fillStyle = '#e8f1ff';
    ctx.fillText(label, h * .045, y + h * .015, w * .6);
    ctx.restore();
  } else {
    top5(w, h, t);
    if (idle) {
      const n = idle.standing.filter(Boolean).length;
      ctx.save();
      ctx.font = `800 ${Math.round(h * .036)}px Orbitron, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      // Onderaan rechts: bovenaan staat dan de scorekaart.
      const label = `${idle.th.name} · nog ${n} ${n === 1 ? 'kegel' : 'kegels'}${W.isSplit(idle.standing) ? ' · SPLIT!' : ''}`;
      const tw = Math.min(ctx.measureText(label).width, w * .5);
      const y = h * .9;
      ctx.fillStyle = 'rgba(5,6,15,.6)';
      ctx.fillRect(w - tw - h * .07, y, tw + h * .05, h * .065);
      ctx.fillStyle = idle.th.color;
      ctx.fillRect(w - h * .02 - h * .012, y, h * .012, h * .065);
      ctx.fillStyle = '#e8f1ff';
      ctx.fillText(label, w - h * .045, y + h * .015, w * .5);
      ctx.restore();
    }
  }
  fx.update(dt);
  ctx.save();
  ctx.scale(fit.dpr, fit.dpr);
  fx.draw(ctx);
  ctx.restore();
  // Aftellen voor de start
  const wait = state.startedAt - (Date.now() + offset);
  if (wait > 0) {
    ctx.save();
    ctx.font = `900 ${Math.round(h * .16)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc94a';
    ctx.fillText(String(Math.ceil(wait / 1000)), w / 2, h / 2 + h * .05);
    ctx.restore();
  }
}
requestAnimationFrame(frame);

// Tussen de herhalingen: de scorekaart van de klas (top 5), groot in beeld.
function top5(w, h, t) {
  const list = shown.filter(r => r.pins > 0).slice(0, 5);
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `800 ${Math.round(h * .045)}px Orbitron, sans-serif`;
  ctx.fillStyle = '#ffc94a';
  ctx.globalAlpha = .8 + .2 * Math.sin(t / 400);
  if (list.length) { ctx.textAlign = 'left'; ctx.fillText('Top 5 van de klas', w * .025, h * .3, w * .3); }
  else ctx.fillText('Wie gooit de eerste strike?', w / 2, h * .08);
  ctx.globalAlpha = 1;
  if (list.length) {
    // Links naast de baan, zodat de kegels in beeld blijven.
    const bw = Math.min(w * .3, h * .6), rh = h * .062, x0 = w * .025, y0 = h * .345; // onder de scorekaart
    ctx.fillStyle = 'rgba(5,6,15,.72)';
    ctx.fillRect(x0, y0, bw, rh * list.length + h * .02);
    ctx.strokeStyle = 'rgba(255,201,74,.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, bw, rh * list.length + h * .02);
    ctx.font = `700 ${Math.round(rh * .55)}px Orbitron, sans-serif`;
    list.forEach((r, i) => {
      const y = y0 + h * .01 + rh * (i + .5);
      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? '#ffc94a' : '#e8f1ff';
      ctx.fillText(`${i + 1}`, x0 + rh * .4, y);
      ctx.fillStyle = r.color;
      ctx.fillRect(x0 + rh * 1.1, y - rh * .2, rh * .14, rh * .4);
      ctx.fillStyle = '#e8f1ff';
      const sw = ctx.measureText(String(r.score)).width;
      ctx.fillText(r.name, x0 + rh * 1.45, y, Math.max(rh, bw - rh * 1.45 - sw - rh * .8));
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffc94a';
      ctx.fillText(String(r.score), x0 + bw - rh * .4, y);
    });
  }
  ctx.restore();
}

// Glimmende runensterren (geen confetti).
function stars(x, y, n) {
  fx.burst(x, y, { n, color: '#ffc94a', speed: 520, life: 1.1, size: 6, up: 140 });
  fx.sparks(x, y, { n: Math.round(n / 2), color: '#5ee7ff', speed: 620 });
  fx.shock(x, y, 120, '#ffc94a');
}

setInterval(() => {
  if (view !== 'play' || !state) return;
  const now = Date.now() + offset;
  const left = state.endsAt - now;
  $('p-clock').textContent = AK.clock(left);
  $('p-clock').classList.toggle('low', left < 60000);
}, 200);

$('start').addEventListener('click', () => socket.emit('kb-start'));
$('restart').addEventListener('click', () => socket.emit('kb-restart'));
$('close').addEventListener('click', () => socket.emit('kb-stop', null, () => show('setup')));
// Eén knop Stoppen: tijdens het spel toont hij de eindstand, in de wachtzaal gaat hij terug naar het begin.
$('stop').addEventListener('click', async () => {
  if (state && state.phase === 'play') {
    if (await Ui.vraag('Het spel stoppen en de eindstand tonen?', { ja: 'Ja, eindstand tonen', nee: 'Verder spelen' })) socket.emit('kb-finish');
    return;
  }
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('kb-stop', null, res => {
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
  const right = s.ranking.reduce((a, r) => a + r.right, 0);
  const pins = s.ranking.reduce((a, r) => a + r.pins, 0);
  const strikes = s.ranking.reduce((a, r) => a + r.strikes, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} wint Kegelridder!` : 'Kegelridder is voorbij';
  $('w-why').textContent = `Samen ${pins} kegels om, ${strikes} strikes en ${right} vragen juist.`;
  // Voluit geschreven, zodat kinderen het kunnen lezen.
  const w = (n, een, meer) => `${n} ${n === 1 ? een : meer}`;
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">${w(p.pins, 'kegel', 'kegels')} · ${w(p.strikes, 'strike', 'strikes')} · ${w(p.spares, 'spare', 'spares')} · ${p.right} juist</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
