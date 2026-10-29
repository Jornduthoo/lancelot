// De Hofschilder op het bord: de grote zaal met het holodoek. De tekening verschijnt live, met de hulpletters
// op runetegels erboven, de tijdring en de hofschilder zelf naast de ezel. Na elke beurt rolt het woord open.
// Gebruikt sfx, confetti en loadGame uit fx.js, quizMakerUrl uit quiz-links.js, AK en HsArt.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
let state = null;
let prev = null;
let offset = 0;
const ink = new HsArt.Ink(1.4);
let inkNr = -1;

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

// ---------- Kiezen waar de woorden vandaan komen ----------
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} return null; };
function bron(name) {
  for (const b of document.querySelectorAll('.hs-bron')) b.classList.toggle('on', b.dataset.bron === name);
  for (const k of ['quiz', 'week', 'eigen']) $(`bron-${k}`).classList.toggle('hidden', k !== name);
  store('hs-bron', name);
  if (name === 'week') weekInfo();
}
for (const b of document.querySelectorAll('.hs-bron')) b.addEventListener('click', () => { bron(b.dataset.bron); sfx.tick(); });
$('eigen-tekst').value = store('hs-eigen') || '';
$('eigen-tekst').addEventListener('input', () => store('hs-eigen', $('eigen-tekst').value));
bron(['quiz', 'week', 'eigen'].includes(store('hs-bron')) ? store('hs-bron') : 'quiz');

function weekInfo() {
  socket.emit('rn-lijst-get', null, res => {
    const woorden = (res && res.lijst && res.lijst.woorden) || [];
    $('week-info').textContent = woorden.length >= 3
      ? `${woorden.length} woorden klaar: ${woorden.slice(0, 12).map(w => w.w).join(', ')}${woorden.length > 12 ? '…' : ''}`
      : 'Er staan nog geen eigen woorden van de week klaar. Dan spelen we met de ingebouwde woordenschat van het Runenraadsel (zoals moed, oase, dijk, tolk…).';
  });
}

function load(payload) {
  $('stopped').classList.add('hidden');
  loadGame('hs-load', { ...payload, seconden: Number($('hs-seconden').value), beurten: Number($('hs-beurten').value) }, res => { $('load-error').textContent = res.error || ''; });
}
QuizList.mount($('quiz-list'), {
  play: q => load({ bron: 'quiz', file: q.file }),
  edit: q => { location.href = quizMakerUrl('bewerk', q.file); },
});
$('ai-go').addEventListener('click', () => {
  const btn = $('ai-go');
  btn.disabled = true;
  $('ai-info').textContent = '✨ De AI zoekt begrippen die je kan tekenen…';
  socket.emit('hs-ai', { thema: $('ai-thema').value }, res => {
    btn.disabled = false;
    if (!res || res.error) { $('ai-info').textContent = (res && res.error) || 'Dat lukte niet.'; return; }
    const old = $('eigen-tekst').value.trim();
    $('eigen-tekst').value = (old ? old + '\n' : '') + res.text;
    store('hs-eigen', $('eigen-tekst').value);
    $('ai-info').textContent = `${res.text.split('\n').length} begrippen erbij. Kijk ze even na en schrap wat niet past.`;
  });
});
// Zelf via een chatbot: prompt kopiëren, chatbot openen, en het antwoord bij terugkomst van het klembord halen.
let aiPrompt = '';
let gekopieerd = '';
socket.on('hs-prompt', p => { aiPrompt = p; });

const kopieer = text => Ui.kopieer(text);

for (const b of document.querySelectorAll('.chatbot')) {
  b.addEventListener('click', () => {
    const thema = $('ai-thema').value.trim();
    if (!thema) return ($('ai-info').textContent = 'Typ eerst een onderwerp, bijvoorbeeld "de middeleeuwen".');
    gekopieerd = aiPrompt.replace('{thema}', thema);
    // Eerst kopiëren (de pagina heeft dan nog de focus), dan het tabblad openen.
    kopieer(gekopieerd);
    window.open(b.dataset.url, '_blank', 'noopener');
    $('ai-info').textContent = 'Prompt gekopieerd! Plak hem met Ctrl+V, kopieer het antwoord (kopieerknop van het codeblok) en kom hier terug.';
  });
}

async function klembord() {
  if (!gekopieerd || !navigator.clipboard?.readText) return;
  let text;
  try { text = await navigator.clipboard.readText(); } catch { return; }
  if (!text || text === gekopieerd || (text.match(/=/g) || []).length < 3) return;
  gekopieerd = text;
  const regels = text.replace(/^\s*```.*$/gm, '').trim();
  const old = $('eigen-tekst').value.trim();
  $('eigen-tekst').value = (old ? old + '\n' : '') + regels;
  store('hs-eigen', $('eigen-tekst').value);
  $('ai-info').textContent = `${regels.split('\n').filter(r => r.trim()).length} begrippen van de AI geplakt. Kijk ze even na en schrap wat niet past.`;
}
window.addEventListener('focus', klembord);
$('week-go').addEventListener('click', () => load({ bron: 'week' }));
$('eigen-go').addEventListener('click', () => load({ bron: 'eigen', text: $('eigen-tekst').value }));

// ---------- Toestand ----------
socket.on('hs-state', s => {
  prev = state;
  state = s;
  offset = s.now - Date.now();
  const live = s.phase !== 'idle';
  $('stop').classList.toggle('hidden', !live);
  $('join-mini').classList.toggle('hidden', s.phase !== 'play');
  $('status').textContent = live ? `De Hofschilder · ${s.title}` : 'De Hofschilder';
  const t = s.turn;
  if (!t || t.nr !== inkNr) { ink.clear(); inkNr = t ? t.nr : -1; }
  if (s.ink) ink.set(s.ink);
  if (!live) return show('setup');
  if (s.phase === 'lobby') {
    renderLobby();
    show('lobby');
  } else if (s.phase === 'play') {
    $('p-title').textContent = s.title;
    show('play');
    renderSide(s.ranking, s.feed);
    renderTurn(prev && prev.turn, t);
  } else if (s.phase === 'einde' && (!prev || prev.phase !== 'einde' || view !== 'podium')) {
    show('podium');
    renderEnd();
  }
});

socket.on('hs-ink', msg => {
  if (!state || !state.turn) return;
  if (msg.nr !== inkNr) { ink.clear(); inkNr = msg.nr; }
  for (const part of msg.d || []) ink.add(part);
});

socket.on('hs-tick', msg => {
  if (!state || state.phase !== 'play') return;
  if (state.turn) {
    if (state.turn.hint !== msg.hint && msg.hint && state.turn.stap === 'teken') { scene.hintAt = performance.now(); sfx.marker(); }
    state.turn.hint = msg.hint;
    state.turn.got = msg.got;
  }
  state.ranking = msg.ranking;
  state.feed = msg.feed;
  renderSide(state.ranking, state.feed);
});

// Iemand heeft het! Een vonkenregen boven het doek en een naam die opstijgt.
socket.on('hs-raak', r => {
  const L = scene.L;
  if (!L) return;
  const x = L.ix + L.iw * (.15 + Math.random() * .7), y = L.iy + L.ih * .25;
  fx.sparks(x, y, { n: r.first ? 40 : 18, color: r.color, speed: L.ih * .5 });
  if (r.first) fx.shock(L.ix + L.iw / 2, L.iy + L.ih / 2, L.ih * .5, '#ffc94a', .5);
  fx.pop(x, y, `✔ ${r.name} +${r.pts}`, r.first ? '#ffc94a' : r.color, Math.max(20, L.ih * (r.first ? .075 : .06)));
  if (r.first) { sfx.go(); } else sfx.good();
});

function renderTurn(before, t) {
  if (!t) return;
  $('p-beurt').textContent = `Beurt ${t.nr} van ${state.limit}`;
  $('p-wis').disabled = t.stap !== 'teken';
  $('p-skip').textContent = t.stap === 'toon' ? '⏭ Volgende beurt' : '⏭ Overslaan';
  if (!before || before.nr !== t.nr || before.stap !== t.stap) {
    scene.stapAt = performance.now();
    if (t.stap === 'kies') sfx.whoosh();
    if (t.stap === 'teken') sfx.gong();
    if (t.stap === 'toon') {
      if (t.guessed && t.guessed.length) sfx.fanfare(); else sfx.bad();
      const L = scene.L;
      if (L) fx.burst(L.ix + L.iw / 2, L.iy + L.ih / 2, { n: 40, color: '#ffc94a', speed: L.ih * .6, life: .9, size: 4 });
    }
  }
}

function renderLobby() {
  const list = state.roster;
  $('player-count').textContent = list.length;
  $('player-word').textContent = list.length === 1 ? 'ridder' : 'ridders';
  $('start').disabled = list.length < 2;
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
    el.addEventListener('click', () => socket.emit('hs-kick', p.id));
    box.appendChild(el);
    if (prev && prev.phase === 'lobby') sfx.join();
  }
}

let lastFeed = '';
function renderSide(ranking, feed) {
  const painter = state.turn && state.turn.painter;
  $('p-top').innerHTML = (ranking || []).slice(0, 16).map(r => `<li class="${painter && painter.n === r.n ? 'hs-nu' : ''}"><i class="bb-dot" style="background:${r.color}"></i><span>${painter && painter.n === r.n ? '🖌️ ' : ''}${AK.esc(r.name)} <small class="muted">✔ ${r.geraden}</small></span><b>${r.score}</b></li>`).join('');
  const key = JSON.stringify(feed || []);
  if (key !== lastFeed) {
    lastFeed = key;
    $('p-feed').innerHTML = (feed || []).map(f => `<li>${AK.esc(f.text)}</li>`).join('');
  }
}

// ---------- De zaal tekenen ----------
const canvas = $('p-canvas');
const ctx = canvas.getContext('2d');
const fx = new AK.Particles();
const scene = { w: 0, h: 0, L: null, hall: null, stapAt: 0, hintAt: 0 };

function layout(w, h) {
  let ih = h * .56, iw = ih * HsArt.W / HsArt.H;
  if (iw > w * .56) { iw = w * .56; ih = iw * HsArt.H / HsArt.W; }
  const t = Math.max(10, ih * .058);
  const ix = (w - iw) / 2;
  const iy = h * .135 + t * 2;
  const floorY = Math.max(iy + ih + t + h * .03, h * .84);
  const side = ix - t; // ruimte links en rechts van de lijst
  return {
    w, h, iw, ih, ix, iy, t, floorY, fw: iw + 2 * t, side,
    windows: [side * .32, w - side * .32],
    banners: [[ix - t - Math.min(w * .055, h * .09) * .9, '#8c1830'], [ix + iw + t + Math.min(w * .055, h * .09) * .9, '#1d3f8f']],
    torches: [[ix - t - Math.min(w * .055, h * .09) * .9, floorY * .66], [ix + iw + t + Math.min(w * .055, h * .09) * .9, floorY * .66]],
  };
}

function bake(w, h) {
  const L = layout(w, h);
  scene.L = L;
  scene.hall = HsArt.hall(w, h, L);
  // De ezel staat vast in de zaal.
  HsArt.easel(scene.hall.getContext('2d'), w / 2, L.iy + L.ih + L.t * .6, L.floorY + (h - L.floorY) * .45, L.fw);
  // Ook het doek en de lijst: de inkt komt er elke frame bovenop, binnen de lijst.
  const fr = HsArt.frame(L.iw, L.ih, L.t);
  const g = scene.hall.getContext('2d');
  g.drawImage(HsArt.slate(L.iw, L.ih), L.ix, L.iy);
  g.drawImage(fr.canvas, L.ix - fr.x, L.iy - fr.y);
}

let last = performance.now();
function frame(pt) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (pt - last) / 1000);
  last = pt;
  if (view !== 'play' || !state || !state.turn) return;
  const { w, h } = AK.fit(canvas, 1.25);
  if (w !== scene.w || h !== scene.h) { scene.w = w; scene.h = h; bake(w, h); }
  const L = scene.L;
  const T = pt / 1000;
  const t = state.turn;
  const now = Date.now() + offset;
  ink.settle(pt);

  ctx.drawImage(scene.hall, 0, 0); // zaal, doek en lijst in één keer
  L.torches.forEach(([x, y], i) => HsArt.torch(ctx, x, y, h * .03, T, i * 2.3));
  ink.draw(ctx, L.ix, L.iy, L.iw, L.ih);

  const painter = t.painter;
  const left = Math.max(0, t.endsAt - now);
  // Bovenaan: de hulpletters (of wat er gebeurt)
  if (t.stap === 'teken' || t.stap === 'toon') {
    const pulse = Math.max(0, 1 - (pt - scene.hintAt) / 600); // een nieuwe hulpletter: de rij springt even op
    HsArt.hint(ctx, t.hint, w / 2, h * .03 - pulse * h * .012, w * .62, h * .085);
  }
  // Op het doek tijdens het kiezen
  if (t.stap === 'kies' && painter) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe7a0';
    ctx.font = `800 ${Math.round(L.ih * .085)}px Cinzel, Georgia, serif`;
    ctx.fillText(painter.name, w / 2, L.iy + L.ih * .4);
    ctx.fillStyle = '#9fd8ff';
    ctx.font = `600 ${Math.round(L.ih * .05)}px "Exo 2", sans-serif`;
    const dots = '.'.repeat(1 + Math.floor(T * 2.5) % 3);
    ctx.fillText(`kiest een woord om te tekenen${dots}`, w / 2, L.iy + L.ih * .53);
    // Een penseel dat een lus tekent
    const a = T * 2.2, rx = L.iw * .18, ry = L.ih * .08;
    for (let k = 0; k < 24; k++) {
      const b = a - k * .09;
      Glow.glow(ctx, w / 2 + Math.cos(b) * rx, L.iy + L.ih * .72 + Math.sin(b * 2) * ry, L.ih * .05 * (1 - k / 24), painter.color, .9 - k / 30);
    }
    ctx.restore();
  }
  // De hofschilder naast de ezel
  if (painter) {
    const hgt = Math.min(h * .34, L.side * 1.05);
    const px = L.ix - L.t - hgt * .62;
    const footY = L.floorY + (h - L.floorY) * .5;
    HsArt.painter(ctx, px, footY, hgt, painter.name, painter.color, T, t.stap === 'teken');
    HsArt.plaque(ctx, px, footY - hgt - h * .085, painter.name, 'HOFSCHILDER', Math.max(12, h * .024));
  }
  // De tijdring rechts
  if (t.stap !== 'toon') {
    const r = Math.min(h * .07, L.side * .3);
    const k = t.total ? left / t.total : 0;
    const rx = L.ix + L.iw + L.t + r * 1.9, ry = L.iy + L.ih * .78;
    HsArt.ring(ctx, rx, ry, r, k, String(Math.ceil(left / 1000)), t.stap === 'teken' && left < 10000);
    if (t.stap === 'teken') {
      const others = Math.max(0, state.roster.length - 1);
      HsArt.plaque(ctx, rx, ry + r * 1.35, `${t.got || 0} / ${others}`, 'GERADEN', Math.max(12, h * .024));
      const sec = Math.ceil(left / 1000);
      if (sec <= 10 && sec !== scene.lastSec && sec > 0) { scene.lastSec = sec; sfx.tick(); }
    }
  }
  // Na de beurt: de rol met het woord
  if (t.stap === 'toon' && t.word) {
    const k = (pt - scene.stapAt) / 700;
    HsArt.scroll(ctx, w / 2, L.iy + L.ih * .5, L.iw * .9, t.word, t.uitleg, k);
    const got = (t.guessed || []).length;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(h * .028)}px "Exo 2", sans-serif`;
    ctx.fillStyle = got ? '#7dffb0' : '#ff8fa3';
    ctx.globalAlpha = Math.min(1, Math.max(0, k - .8));
    const msg = got ? `${got} ${got === 1 ? 'ridder raadde' : 'ridders raadden'} het · hofschilder +${t.painterPts || 0}` : 'Niemand raadde het deze keer';
    const my = L.iy + L.ih + L.t * 2.4, mw = ctx.measureText(msg).width + h * .05;
    ctx.fillStyle = 'rgba(6,10,22,.85)';
    HsArt.rr(ctx, w / 2 - mw / 2, my - h * .032, mw, h * .046, h * .023);
    ctx.fill();
    ctx.strokeStyle = 'rgba(224,176,74,.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = got ? '#7dffb0' : '#ff8fa3';
    ctx.fillText(msg, w / 2, my);
    ctx.restore();
  }
  fx.update(dt);
  fx.draw(ctx);
}
requestAnimationFrame(frame);

$('start').addEventListener('click', () => socket.emit('hs-start'));
$('p-skip').addEventListener('click', () => socket.emit('hs-skip'));
$('p-wis').addEventListener('click', () => socket.emit('hs-wis'));
$('p-finish').addEventListener('click', async () => {
  if (await Ui.vraag('Het spel nu stoppen en de eindstand tonen?')) socket.emit('hs-finish');
});
$('restart').addEventListener('click', () => socket.emit('hs-restart'));
$('close').addEventListener('click', () => socket.emit('hs-stop', null, () => show('setup')));
$('stop').addEventListener('click', async () => {
  if (!await Ui.vraag('Het spel stoppen en terug naar het begin?')) return;
  socket.emit('hs-stop', null, res => {
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
  const guessed = s.ranking.reduce((a, r) => a + r.geraden, 0);
  $('w-title').textContent = top ? `🏆 ${top.name} wint de Hofschilder!` : 'De Hofschilder is voorbij';
  $('w-why').textContent = `${s.history.length} tekeningen, samen ${guessed} keer juist geraden.`;
  // Eretitels: de beste tekenaar (meeste raders per tekening) en het scherpste oog.
  const painters = s.ranking.filter(r => r.getekend).sort((a, b) => b.gevonden / b.getekend - a.gevonden / a.getekend);
  const eyes = [...s.ranking].sort((a, b) => b.geraden - a.geraden);
  const eer = [];
  if (painters[0] && painters[0].gevonden) eer.push(`<div class="hs-titel"><span>🖌️</span><b>Meesterschilder</b><em>${AK.esc(painters[0].name)}</em><small>${painters[0].gevonden} ${painters[0].gevonden === 1 ? 'ridder raadde' : 'ridders raadden'} de tekening${painters[0].getekend > 1 ? 'en' : ''}</small></div>`);
  if (eyes[0] && eyes[0].geraden) eer.push(`<div class="hs-titel"><span>🦅</span><b>Scherpste oog</b><em>${AK.esc(eyes[0].name)}</em><small>${eyes[0].geraden} keer juist geraden</small></div>`);
  $('w-eer').innerHTML = eer.join('');
  $('final').innerHTML = s.ranking.map((p, i) => `<li><span class="pos">${i + 1}</span><span><i class="bb-dot" style="background:${p.color}"></i>${AK.esc(p.name)}</span><span class="muted">✔ ${p.geraden} geraden · 🖌️ ${p.getekend}× getekend</span><span class="pts">${p.score}</span></li>`).join('');
  if (top) { sfx.fanfare(); confetti(5000); }
}
