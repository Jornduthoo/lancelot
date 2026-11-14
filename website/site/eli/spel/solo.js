// Drakenjacht solo voor Eli: dezelfde game als in LANcelot (cg-player.js + cg-art.js),
// maar de "server" draait hier in de browser. Vragen komen uit Eli's eigen leerstof.
// Moet geladen worden NA gemeen.js/inhoud/plan en VOOR fx.js/cg-art.js/cg-player.js.
const MODUS = new URLSearchParams(location.search).has('beloning') ? 'beloning' : 'pauze';
const MINUTEN = MODUS === 'beloning' ? 10 : 4;

// --- Wat cg-player.js verwacht uit player.js ---
const $ = id => document.getElementById(id);
const playerId = 'eli';
function store(key, value){
  if (key === 'lancelot-name') return value === undefined ? 'Eli' : null;
  try { if (value === undefined) return localStorage.getItem('eli-spel-' + key); if (value === null) localStorage.removeItem('eli-spel-' + key); else localStorage.setItem('eli-spel-' + key, value); } catch { return null; }
}
function buzz(p){ try { navigator.vibrate && navigator.vibrate(p); } catch {} }

// --- Vragen: meerkeuze en juist/fout uit de onderwerpen die al in de planning stonden ---
const Vragen = (() => {
  const P = window.ELI_PLAN, T = window.ELI_ONDERWERPEN || [];
  const vandaag = window.ELI.vandaag();
  let ids = new Set();
  try {
    const plan = P.maak();
    for (const [d, items] of Object.entries(plan)) if (d <= vandaag) for (const it of items) if (it.onderwerp) ids.add(it.onderwerp);
  } catch {}
  const bron = T.filter(t => ids.size < 3 || ids.has(t.id));
  const strip = s => String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  const lijst = [];
  for (const t of bron) for (const q of t.quiz || []) {
    if (q.t === 'mc' && q.o && q.o.length >= 2 && q.o.length <= 4) lijst.push({ question: strip(q.v), answers: q.o.map(strip), correct: q.a || 0, vak: t.vak });
    else if (q.t === 'jf') lijst.push({ question: strip(q.v), answers: ['Juist', 'Fout'], correct: q.a ? 0 : 1, vak: t.vak });
  }
  // Antwoorden schudden zodat het juiste niet altijd eerst staat.
  for (const q of lijst) {
    if (q.answers[0] === 'Juist') continue;
    const goed = q.answers[q.correct];
    const s = q.answers.slice().sort(() => Math.random() - .5);
    q.answers = s; q.correct = s.indexOf(goed);
  }
  return lijst.sort(() => Math.random() - .5);
})();

// --- De "server" ---
const Solo = (() => {
  const LASER_MS = 12000, SHIELD_MS = 20000, WRONG_WAIT_MS = 3000, MAX_REWARDS = 3, MAX_BOMBS = 3;
  const bossMs = MINUTEN <= 4 ? 75000 : 120000;
  const S = { run: 1, phase: 'lobby', startedAt: 0, endsAt: 0, bossAt: 0, feed: [], feedChanged: false,
    boss: { on:false, hp:0, max:0, down:false, escaped:false }, joined: false };
  const p = { n:0, name:'Eli', color:2, score:0, dragons:0, wave:1, crashes:0, bossDmg:0, lastDmgAt:0, right:0, wrong:0, streak:0,
    rewards:0, bombs:0, question:null, order:[], waitUntil:0, log:[] };
  let ticker = null, endT = null;
  const feed = t => { S.feed.unshift({ text: t, at: Date.now() }); S.feed.length = Math.min(S.feed.length, 6); S.feedChanged = true; };
  const bossView = () => ({ on:S.boss.on, hp:Math.max(0, Math.round(S.boss.hp)), max:S.boss.max, down:S.boss.down, escaped:S.boss.escaped });
  const me = () => ({ n:0, score:p.score, rewards:p.rewards, bombs:p.bombs, wait:Math.max(0, p.waitUntil - Date.now()), rank:1, players:1,
    bossDmg:p.bossDmg, right:p.right, wrong:p.wrong, dragons:p.dragons, wave:p.wave });
  const base = () => ({ active:true, run:S.run, phase:S.phase, title:"Eli's leerstof", tempo:'normaal', minutes:MINUTEN, now:Date.now(),
    startedAt:S.startedAt, endsAt:S.endsAt, bossAt:S.bossAt, laserMs:LASER_MS, shieldMs:SHIELD_MS, boss:bossView(), players:1 });
  const state = () => S.joined ? { ...base(), name:p.name, color:p.color, me:me() } : base();
  const broadcast = () => fire('cg-state', state());

  function start(){
    const now = Date.now();
    S.phase = 'play'; S.startedAt = now + 3000; S.endsAt = S.startedAt + MINUTEN * 60000; S.bossAt = S.endsAt - bossMs;
    feed('🐉 De cyberdraken komen eraan. Vlieg, Eli!');
    ticker = setInterval(tick, 500);
    endT = setTimeout(finish, S.endsAt - now);
    broadcast();
  }
  function tick(){
    if (S.phase !== 'play') return;
    const b = S.boss;
    if (!b.on && Date.now() >= S.bossAt) { b.on = true; b.max = Math.round(320 * bossMs / 90000); b.hp = b.max; feed('🐲 DE DRAKENKONING VERSCHIJNT!'); broadcast(); }
    const msg = { boss: bossView(), now: Date.now(), me: me(), top: [[p.name, p.score]] };
    if (S.feedChanged) { msg.feed = S.feed; S.feedChanged = false; }
    fire('cg-tick', msg);
  }
  function finish(){
    if (S.phase !== 'play') return;
    clearInterval(ticker); clearTimeout(endT);
    S.phase = 'einde';
    if (S.boss.on && !S.boss.down) { S.boss.escaped = true; feed('🐲 De drakenkoning is ontsnapt…'); }
    broadcast();
    window.dispatchEvent(new CustomEvent('spel-einde', { detail: { score:p.score, right:p.right, wrong:p.wrong, dragons:p.dragons, wave:p.wave, boss:S.boss.down } }));
  }
  const H = {
    'cg-join'(){ S.joined = true; setTimeout(() => { broadcast(); setTimeout(start, 600); }, 0); return { ok:true, name:p.name }; },
    'cg-question'(){
      const now = Date.now();
      if (S.phase !== 'play') return { error:'Het spel loopt niet.' };
      if (now < p.waitUntil) return { error:'Je jetpack koelt nog af.', wait:p.waitUntil - now };
      if (!Vragen.length) return { error:'Geen vragen gevonden.' };
      if (p.question === null) {
        if (!p.order.length) p.order = Vragen.map((_, i) => i).sort(() => Math.random() - .5);
        p.question = p.order.shift();
      }
      const q = Vragen[p.question];
      return { question:q.question, answers:q.answers, rewards:p.rewards, max:MAX_REWARDS };
    },
    'cg-answer'(choice){
      if (S.phase !== 'play' || p.question === null) return { error:'Er staat geen vraag open.' };
      const q = Vragen[p.question], correct = choice === q.correct;
      let gained = 0, wait = 0;
      p.log.push({ v:q.question, ok:correct });
      if (correct) { p.right++; p.streak++; gained = p.streak % 3 === 0 ? 2 : 1; p.rewards = Math.min(MAX_REWARDS, p.rewards + gained);
        if (p.streak === 5 || p.streak === 10) feed(`🔥 ${p.streak} antwoorden op rij juist!`); }
      else { p.wrong++; p.streak = 0; wait = WRONG_WAIT_MS; p.waitUntil = Date.now() + wait; p.order.splice(Math.min(2, p.order.length), 0, p.question); }
      p.question = null;
      return { correct, right:q.correct, gained, rewards:p.rewards, streak:p.streak, wait };
    },
    'cg-reward'(kind){
      if (S.phase !== 'play') return { error:'Het spel loopt niet.' };
      if (!['laser','schild','bom'].includes(kind)) return { error:'Onbekende beloning.' };
      if (p.rewards <= 0) return { error:'Beantwoord eerst een vraag.' };
      if (kind === 'bom' && p.bombs >= MAX_BOMBS) return { error:'Je hebt al drie bommen.' };
      p.rewards--; if (kind === 'bom') p.bombs++;
      return { ok:true, kind, rewards:p.rewards, bombs:p.bombs, ms: kind === 'laser' ? LASER_MS : kind === 'schild' ? SHIELD_MS : 0 };
    },
    'cg-bomb'(){
      if (S.phase !== 'play') return { error:'Het spel loopt niet.' };
      if (p.bombs <= 0) return { error:'Geen bommen. Beantwoord een vraag!' };
      p.bombs--; return { ok:true, bombs:p.bombs };
    },
    'cg-report'(r){
      if (S.phase !== 'play' || !r) return;
      const num = (v, m) => Math.max(0, Math.min(m, Math.floor(Number(v) || 0)));
      p.score = Math.max(p.score, num(r.score, 1e7)); p.dragons = Math.max(p.dragons, num(r.dragons, 1e5));
      p.wave = Math.max(p.wave, num(r.wave, 999)); p.crashes = Math.max(p.crashes, num(r.crashes, 999));
      const dmg = num(r.dmg, 2000), b = S.boss;
      if (dmg && b.on && !b.down && !b.escaped) {
        const done = Math.min(dmg, b.hp); p.bossDmg += done; b.hp -= done;
        if (b.hp <= 0) { b.hp = 0; b.down = true; feed('🏆 De drakenkoning is verslagen!'); broadcast(); setTimeout(finish, 5000); }
      }
    },
  };
  return { handle: (ev, arg) => H[ev] ? H[ev](arg) : undefined, stop: finish, stand: () => ({ ...p }) };
})();

// --- Nep-socket ---
const _h = {};
function fire(ev, data){ (_h[ev] || []).forEach(f => { try { f(data); } catch (e) { console.error(e); } }); }
const socket = {
  on(ev, fn){ (_h[ev] = _h[ev] || []).push(fn); },
  emit(ev, arg, cb){ if (typeof arg === 'function') { cb = arg; arg = undefined; } setTimeout(() => { const r = Solo.handle(ev, arg); if (typeof cb === 'function') cb(r); }, 0); },
  connect(){}, connected: true,
};
