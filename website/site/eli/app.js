// Eli's leerploeg: de app zelf.
(function(){
const { rpc: rpcEcht, sessie, lokaal, vandaag, opDag, mooiDatum, dagenTussen, esc, $, toast, confetti, xpPop, piep, naamVan } = window.ELI;
const P = window.ELI_PLAN, V = P.VAKKEN;
const T = window.ELI_ONDERWERPEN;
const TOPIC = Object.fromEntries(T.map(t => [t.id, t]));

// Meekijken: een supporter ziet de app zoals Eli, maar er wordt niets bewaard.
const MEEKIJK = new URLSearchParams(location.search).has('meekijk');
const rpc = (fn, args, opts) => (MEEKIJK && fn !== 'eli_ouder') ? Promise.resolve(fn === 'eli_antwoord' ? false : true) : rpcEcht(fn, args, opts);
const S = {
  naam: null, pin: null, stand: null, plan: null,
  taken: {}, kaarten: {}, vuil: new Set(), xpLokaal: 0, minLokaal: 0,
  actief: Date.now(), werkSec: 0, pauze: false, huidigVak: null, huidigAct: 'menu',
};

// ---------------- Levels ----------------
const LEVELS = [
  [0,'Pupil'],[150,'Miniem'],[400,'Kadet'],[800,'Scholier'],[1300,'Junior'],[2000,'Belofte'],
  [2800,'Basisspeler'],[3800,'Kapitein'],[5000,'Topscorer'],[6500,'Rode Duivel'],[8500,'Gouden Schoen'],[11000,"Ballon d'Or"],
];
function level(xp){
  let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  const [van, naam] = LEVELS[i]; const tot = LEVELS[i + 1] ? LEVELS[i + 1][0] : van + 3000;
  return { nr: i + 1, naam, van, tot, pct: Math.min(100, (xp - van) / (tot - van) * 100), volgende: LEVELS[i + 1] && LEVELS[i + 1][1] };
}
const xpTotaal = () => (S.stand ? S.stand.xp : 0) + S.xpLokaal;

// ---------------- Helpers ----------------
const schud = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const stripAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = s => String(s || '').toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').replace(/[.!?;:]+$/,'').trim();
const vk = vak => (V[vak] && V[vak].kleur) || 'var(--gras)';

// ---------------- Login ----------------
let pinWaarde = '';
function tekenToetsen(){
  const k = $('toetsen');
  k.innerHTML = [1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].map(x => `<button type="button" data-k="${x}" aria-label="${x === '⌫' ? 'wis' : x === '✓' ? 'inloggen' : x}">${x}</button>`).join('');
  k.onclick = e => { const b = e.target.closest('button'); if (!b) return; druk(b.dataset.k); };
  document.addEventListener('keydown', e => {
    if ($('login').hidden || document.activeElement === $('naam')) return;
    if (/^[0-9]$/.test(e.key)) druk(e.key); else if (e.key === 'Backspace') druk('⌫'); else if (e.key === 'Enter') druk('✓');
  });
}
function druk(k){
  if (k === '⌫') pinWaarde = pinWaarde.slice(0, -1);
  else if (k === '✓') return inloggen();
  else if (pinWaarde.length < 4) pinWaarde += k;
  [...$('bolletjes').children].forEach((b, i) => b.classList.toggle('vol', i < pinWaarde.length));
  piep('klik');
  if (pinWaarde.length === 4) setTimeout(inloggen, 150);
}
async function inloggen(){
  const naam = $('naam').value.trim();
  if (!naam || pinWaarde.length !== 4) return;
  $('loginfout').textContent = '';
  try {
    const res = await rpc('eli_aanmelden', { p_naam: naam, p_pin: pinWaarde });
    if (!res) throw new Error('fout');
    if (res.rol === 'ouder') {
      sessie.set({ naam: naam.toLowerCase(), pin: pinWaarde, rol: 'ouder' });
      location.href = 'ouder.html';
      return;
    }
    sessie.set({ naam: naam.toLowerCase(), pin: pinWaarde, rol: 'eli' });
    S.naam = naam.toLowerCase(); S.pin = pinWaarde;
    start(res);
  } catch (e) {
    pinWaarde = '';
    [...$('bolletjes').children].forEach(b => b.classList.remove('vol'));
    $('bolletjes').classList.remove('schud'); void $('bolletjes').offsetWidth; $('bolletjes').classList.add('schud');
    $('loginfout').textContent = /te_veel/.test(e.message) ? 'Te veel pogingen. Wacht een kwartiertje.' : 'Oeps, die naam of code klopt niet.';
    piep('fout');
  }
}

// ---------------- Start ----------------
function start(stand){
  S.stand = stand;
  S.taken = stand.taken || {};
  S.kaarten = stand.kaarten || {};
  POP.zet(stand.figuren || [], stand.figkey);
  S.eliFiguur = (stand.figuren || []).find(f => f.rol === 'eli');
  S.plan = P.maak();
  $('login').hidden = true; $('app').hidden = false;
  document.title = "Eli's leerploeg";
  thuis();
  hartslag();
  const ses = sessie.get();
  if (ses && ses.terugNaPauze) { sessie.set({ ...ses, terugNaPauze: false }); setTimeout(() => toast('Welkom terug van je pauze! Verder met de training. ⚽'), 600); }
  teller();
  const nieuw = (stand.berichten || []).filter(b => !b.gezien);
  if (nieuw.length) setTimeout(() => toonBerichten(nieuw, true), 400);
  else setTimeout(() => welkom(), 300);
}

// ---------------- Planning-logica ----------------
function klaarOp(id){ const t = S.taken[id]; return t ? opDag(t.op) : null; }
function isKlaar(id){ return !!S.taken[id]; }
function itemsVandaag(){
  const d = vandaag();
  const out = [];
  // Voor de start: alleen kennismaken met de leerploeg.
  if (d < P.START) return [{ id:'kennis:ploeg', soort:'kennis', titel:'Maak kennis met je leerploeg', min:5 }];
  // Inhaalwerk: alles van vroegere dagen dat niet af is (behalve de dagelijkse kaartjes).
  for (const [dag, items] of Object.entries(S.plan)) {
    if (dag >= d) continue;
    for (const it of items) if (it.soort !== 'kaarten' && !isKlaar(it.id)) out.push({ ...it, inhaal: dag });
  }
  for (const it of (S.plan[d] || [])) out.push(it);
  // Zwakke onderwerpen: een extra herhaling als een quiz de laatste dagen slecht ging (max 2 per dag).
  const zwak = zwakkeOnderwerpen().slice(0, 2);
  for (const z of zwak) {
    const id = 'extra:' + z.id + ':' + d;
    if (!out.some(o => o.onderwerp === z.id && o.soort !== 'leer')) out.push({ id, soort:'extra', vak: z.vak, onderwerp: z.id, titel: 'Extra: ' + z.titel, min: 8 });
  }
  return out;
}
function zwakkeOnderwerpen(vak){
  const o = (S.stand && S.stand.onderwerpen) || {};
  const lijst = [];
  for (const t of T) {
    if (vak && t.vak !== vak) continue;
    const r = o[t.id];
    const kaartFout = t.kaarten.reduce((a, _, i) => { const k = S.kaarten[t.id + '-' + i]; return a + (k && k.d <= 1 && k.f > 0 ? 1 : 0); }, 0);
    const score = r && r.t ? r.s / r.t : null;
    if ((score !== null && score < .7) || kaartFout >= 4) lijst.push({ ...t, score: score ?? .5, kaartFout });
  }
  return lijst.sort((a, b) => a.score - b.score || b.kaartFout - a.kaartFout);
}
function minutenVandaag(){ return ((S.stand.dagen || {})[vandaag()] || 0) + S.minLokaal; }
function dagGehaald(d){
  const items = S.plan[d] || [];
  if (!items.length) return null;
  return items.every(it => { const k = klaarOp(it.id); return k && k <= d; });
}
function reeks(){
  const d = vandaag();
  let n = 0;
  if (dagGehaald(d)) n++;
  for (let x = P.dag(d, -1); x >= P.START; x = P.dag(x, -1)) {
    const g = dagGehaald(x);
    if (g === null) continue;
    if (!g) break;
    n++;
  }
  return n;
}
function geleerd(id){ return isKlaar('leer:' + id); }
function klaarheid(vak){
  const ts = T.filter(t => t.vak === vak);
  let leer = 0, doos = 0, n = 0, qs = 0, qt = 0;
  for (const t of ts) {
    if (geleerd(t.id)) leer++;
    t.kaarten.forEach((_, i) => { const k = S.kaarten[t.id + '-' + i]; n++; doos += k ? Math.min(5, k.d) : 0; });
    const r = (S.stand.onderwerpen || {})[t.id]; if (r) { qs += r.s; qt += r.t; }
  }
  const a = leer / ts.length, b = n ? doos / (n * 5) : 0, c = qt ? qs / qt : 0;
  return Math.round((a * .35 + b * .35 + c * .30) * 100);
}

// ---------------- Thuis ----------------
function thuis(){
  $('taak').hidden = true; $('thuis').hidden = false; document.querySelector('.veld').hidden = false;
  S.huidigVak = null; S.huidigAct = 'menu';
  const d = vandaag();
  const xp = xpTotaal(), L = level(xp);
  $('datumlabel').textContent = mooiDatum(d);
  const uur = Number(new Intl.DateTimeFormat('nl-BE', { timeZone:'Europe/Brussels', hour:'numeric' }).format(new Date()));
  $('groet').textContent = (uur < 12 ? 'Goeiemorgen' : uur < 18 ? 'Hoi' : 'Goeienavond') + ' Eli!';
  $('st-streak').textContent = reeks();
  $('st-xp').textContent = xp.toLocaleString('nl-BE');
  const tot = dagenTussen(d, '2026-12-07');
  $('st-examen').textContent = tot > 0 ? tot : tot === 0 ? 'Vandaag!' : '💪';
  $('lvl-balk').style.width = L.pct + '%';
  $('lvl-naam').textContent = `Level ${L.nr} · ${L.naam}`;
  $('lvl-volgende').textContent = L.volgende ? `nog ${L.tot - xp} XP tot ${L.volgende}` : 'Hoogste level!';

  const budget = P.budget(d), min = minutenVandaag();
  $('ring').style.setProperty('--p', budget ? Math.min(100, min / budget * 100) : 100);
  $('ring-min').textContent = min;
  $('ring-van').textContent = '/ ' + budget + ' min';
  const wd = new Date(d + 'T12:00:00').getDay();
  $('dagtitel').textContent = d > P.EINDE ? 'Examens voorbij!' : budget === 0 ? 'Laatste examen: Cultuur' : wd === 2 ? 'Voetbaldag: korte training' : (wd === 0 || wd === 6) ? 'Weekendtraining' : 'Training van vandaag';
  $('dagsub').textContent = budget ? `${budget} minuten actief werken. Na elke 25 minuten krijg je een pauze.` : 'Succes vandaag! Je hebt hard gewerkt.';

  // Opdrachten
  const items = itemsVandaag();
  const lijst = $('takenlijst');
  let eersteOpen = items.findIndex(it => !isKlaar(it.id));
  const klaar = items.filter(it => isKlaar(it.id)).length;
  $('takenteller').textContent = items.length ? `${klaar} van ${items.length} klaar` : '';
  lijst.innerHTML = items.length ? '' : '<div class="leeg kaart">Geen opdrachten vandaag. Geniet ervan!</div>';
  items.forEach((it, i) => {
    const el = document.createElement('div');
    const done = isKlaar(it.id), slot = !done && i !== eersteOpen;
    el.className = 'taak' + (done ? ' klaar' : '') + (slot ? ' slot' : '') + (it.inhaal ? ' inhaal' : '');
    el.style.setProperty('--vk', vk(it.vak));
    const ic = done ? '✅' : it.soort === 'kennis' ? '⭐' : it.soort === 'kaarten' ? '🃏' : it.soort === 'proef' ? '📝' : it.soort === 'drill' ? '⚡' : it.soort === 'zwak' || it.soort === 'extra' ? '🎯' : (V[it.vak] || {}).icoon || '📘';
    const wat = { kennis:'Kennismaking', leer:'Leren + kaartjes + quiz', herhaal:'Herhalen + quiz', proef:'Proefexamen', zwak:'Zwakke punten', extra:'Extra herhaling (ging moeilijk)', drill:'Werkwoorden-sprint', kaarten:'Herhaalkaartjes' }[it.soort] || '';
    el.innerHTML = `<div class="ic">${ic}</div><div class="tx">${it.inhaal ? `<span class="tag">Inhaalwerk van ${mooiDatum(it.inhaal, true)}</span>` : ''}<b></b><span>${esc((V[it.vak] || {}).kort || 'Alle vakken')} · ${wat} · ± ${it.min} min</span></div>`;
    el.querySelector('b').textContent = it.titel;
    const knop = document.createElement('button');
    knop.className = 'knop klein' + (done ? ' licht' : '');
    knop.textContent = done ? 'Nog eens' : slot ? '🔒' : 'Start';
    knop.disabled = slot;
    if (slot) knop.title = 'Eerst de opdracht hierboven';
    knop.onclick = () => voerUit(it);
    el.append(knop);
    lijst.append(el);
  });

  // Beloning
  const alles = items.length && items.every(it => isKlaar(it.id));
  const bel = $('beloning');
  if (d < P.START) {
    bel.innerHTML = `<div class="beloning dicht"><div class="groot">🐉</div><div><h3>Drakenjacht</h3><p style="margin:2px 0 0">Vanaf morgen: maak je opdrachten af en jaag 10 minuten op draken.</p></div></div>`;
  } else if (alles) {
    bel.innerHTML = `<div class="beloning"><div class="groot">🐉</div><div style="flex:1"><h3>Alles gedaan! Tijd voor Drakenjacht</h3><p style="margin:2px 0 0;opacity:.9">10 minuten vliegen. Juist antwoorden geeft lasers en schilden.</p></div><a class="knop goud" href="spel.html?beloning=1${MEEKIJK ? '&meekijk=1' : ''}" style="text-decoration:none;padding:12px 16px;border-radius:14px">Spelen</a></div>`;
    if (!lokaal.get('feest-' + d, false)) { lokaal.set('feest-' + d, true); confetti(3000); piep('klaar'); }
  } else {
    bel.innerHTML = `<div class="beloning dicht"><div class="groot">🔒</div><div><h3>Drakenjacht</h3><p style="margin:2px 0 0">Maak eerst alle opdrachten van vandaag af. Dan mag je 10 minuten draken jagen.</p></div></div>`;
  }

  // Week
  const ws = $('weekstrip'); ws.innerHTML = '';
  const maandag = P.dag(d, -((new Date(d + 'T12:00:00').getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const x = P.dag(maandag, i), g = dagGehaald(x);
    const s = x > d ? (S.plan[x] ? '·' : '') : g === null ? '–' : g ? '✅' : x === d ? '⏳' : '⚠️';
    ws.insertAdjacentHTML('beforeend', `<div class="wdag${x === d ? ' nu' : ''}">${mooiDatum(x, true).split(' ')[0]}<span class="s">${s}</span><span class="klein muted">${P.budget(x) || ''}${P.budget(x) ? "'" : ''}</span></div>`);
  }

  // Examens
  $('examens').innerHTML = Object.entries(V).map(([k, v]) => {
    const p = klaarheid(k);
    return `<div class="examen" style="--vk:${v.kleur}"><span class="em">${v.icoon}</span><b>${esc(v.naam)}</b><span class="wanneer">${esc(v.uur)}</span><div class="klaarbalk"><i style="width:${p}%"></i></div><div class="pct">${p}% klaar</div></div>`;
  }).join('');

  // Babbel
  const mot = motivatie(items, alles);
  const maat = Math.random() < .75 && POP.kring();
  POP.babbel($('dagbabbel'), mot, maat ? { figuur: maat, eigen: !/inhaal|Toppie/.test(mot) } : { rol: alles ? ['supporter','manager','trainer'] : ['manager','trainer','supporter','coach'] });
}

function motivatie(items, alles){
  const r = reeks();
  const open = items.filter(it => !isKlaar(it.id)).length;
  const inhaal = items.filter(it => it.inhaal && !isKlaar(it.id)).length;
  if (alles) return 'Toppie! Alles gedaan vandaag. 🏆 Morgen gaan we verder.';
  if (inhaal) return `Er staat nog <b>${inhaal} opdracht${inhaal > 1 ? 'en' : ''} inhaalwerk</b> klaar. Eerst die, dan de rest. Je kan het!`;
  const zinnen = [
    `Nog <b>${open} opdracht${open > 1 ? 'en' : ''}</b> te gaan. Elke dag een beetje = op 7 december klaar!`,
    r > 1 ? `Al <b>${r} dagen</b> op rij! Laat die reeks niet breken. 🔥` : 'Vandaag starten we een nieuwe reeks. Hup!',
    'Een kampioen traint ook als het regent. Kom op! ⚽',
    'Wie elke dag herhaalt, onthoudt het voor altijd. Echt waar.',
  ];
  return zinnen[Math.floor(Math.random() * zinnen.length)];
}

// Tabs
document.addEventListener('click', e => {
  const b = e.target.closest('#tabs button'); if (!b) return;
  [...$('tabs').children].forEach(x => x.classList.toggle('aan', x === b));
  document.querySelectorAll('[data-paneel]').forEach(p => p.hidden = p.dataset.paneel !== b.dataset.tab);
  if (b.dataset.tab === 'planning') tekenPlanning();
  if (b.dataset.tab === 'vakken') tekenVakken();
  if (b.dataset.tab === 'trofeeen') tekenTrofeeen();
  if (b.dataset.tab === 'ploeg') $('ploeg').innerHTML = POP.ploegHtml();
});

function tekenPlanning(){
  const d = vandaag();
  $('planlijst').innerHTML = P.dagen().map(x => {
    const items = S.plan[x] || [];
    const exam = Object.values(V).filter(v => v.examen === x).map(v => `<div class="pitem"><i>🎓</i><b>EXAMEN ${esc(v.naam)}</b></div>`).join('');
    const rij = items.map(it => {
      const k = isKlaar(it.id);
      const s = k ? '✓' : x < d ? (it.soort === 'kaarten' ? '–' : '⚠️') : x === d ? '⏳' : '🔒';
      return `<div class="pitem" style="${k ? 'opacity:.6' : ''}"><i>${s}</i><span>${esc(it.titel)} <span class="muted">· ${esc((V[it.vak] || {}).kort || '')}</span></span></div>`;
    }).join('');
    return `<div class="pdag${x === d ? ' nu' : ''}" ${x === d ? 'id="plan-nu"' : ''}><div class="d">${mooiDatum(x, true)}<br><span class="muted">${P.budget(x)} min</span></div><div>${exam}${rij || '<span class="muted klein">vrij</span>'}</div></div>`;
  }).join('');
  const nu = $('plan-nu'); if (nu) nu.scrollIntoView({ block:'center' });
}

let vrijVak = 'kf';
function tekenVakken(){
  $('vaktabs').innerHTML = Object.entries(V).map(([k, v]) => `<button data-vak="${k}" class="${k === vrijVak ? 'aan' : ''}">${v.icoon} ${esc(v.kort)}</button>`).join('');
  $('vaktabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; vrijVak = b.dataset.vak; tekenVakken(); };
  const lijst = $('onderwerplijst'); lijst.innerHTML = '';
  if (vrijVak === 'fr') {
    const el = document.createElement('div'); el.className = 'taak'; el.style.setProperty('--vk', vk('fr'));
    el.innerHTML = `<div class="ic">⚡</div><div class="tx"><b>Werkwoorden-sprint</b><span>Vervoegen in het présent en passé composé</span></div>`;
    const b = document.createElement('button'); b.className = 'knop klein'; b.textContent = 'Start';
    b.onclick = () => voerUit({ id:'vrij:drill', soort:'drill', vak:'fr', titel:'Werkwoorden-sprint', vrij:true });
    el.append(b); lijst.append(el);
  }
  for (const t of T.filter(t => t.vak === vrijVak)) {
    const el = document.createElement('div'); el.className = 'taak'; el.style.setProperty('--vk', vk(t.vak));
    const r = (S.stand.onderwerpen || {})[t.id];
    el.innerHTML = `<div class="ic">${geleerd(t.id) ? '✅' : V[t.vak].icoon}</div><div class="tx"><b></b><span>${t.kaarten.length} kaartjes · ${t.quiz.length} vragen${r ? ` · laatste score ${Math.round(r.s / r.t * 100)}%` : ''}</span></div>`;
    el.querySelector('b').textContent = t.titel;
    const rij = document.createElement('div'); rij.className = 'rij'; rij.style.flexWrap = 'nowrap';
    for (const [lbl, soort] of [['📖', 'lees'], ['🃏', 'kaartjes'], ['❓', 'quiz']]) {
      const b = document.createElement('button'); b.className = 'knop licht klein'; b.textContent = lbl; b.title = { lees:'Leerkaart', kaartjes:'Kaartjes', quiz:'Quiz' }[soort];
      b.onclick = () => voerUit({ id:'vrij:' + soort + ':' + t.id, soort:'vrij-' + soort, vak:t.vak, onderwerp:t.id, titel:t.titel, vrij:true });
      rij.append(b);
    }
    el.append(rij); lijst.append(el);
  }
}

function trofeeLijst(){
  const kaartGoed = Object.values(S.kaarten).reduce((a, k) => a + (k.g || 0), 0);
  const leer = T.filter(t => geleerd(t.id)).length;
  const r = Math.max(reeks(), lokaal.get('beste-reeks', 0));
  lokaal.set('beste-reeks', r);
  const perfect = lokaal.get('perfect', 0);
  const vakKlaar = k => T.filter(t => t.vak === k).every(t => geleerd(t.id));
  const xp = xpTotaal();
  return [
    ['⚽','Aftrap','Eerste opdracht gedaan', Object.keys(S.taken).length >= 1],
    ['🔥','Op dreef','3 dagen op rij', r >= 3],
    ['🌟','Week van staal','7 dagen op rij', r >= 7],
    ['🏟️','Volle tribune','14 dagen op rij', r >= 14],
    ['🃏','Kaartenkoning','100 kaartjes juist', kaartGoed >= 100],
    ['🧠','Geheugenreus','500 kaartjes juist', kaartGoed >= 500],
    ['💯','Perfect','Een quiz met 100%', perfect >= 1],
    ['🎯','Scherpschutter','5 quizzen met 100%', perfect >= 5],
    ['🎨','Kunstkenner','Alle K&F-onderwerpen geleerd', vakKlaar('kf')],
    ['🧒','Mensenkenner','Alle Gedrag-onderwerpen geleerd', vakKlaar('gsw')],
    ['🥐','Bon élève','Alle Frans-onderwerpen geleerd', vakKlaar('fr')],
    ['🔬','Wetenschapper','Alle Wetenschappen-onderwerpen geleerd', vakKlaar('wet')],
    ['🏛️','Historicus','Alle Cultuur-onderwerpen geleerd', vakKlaar('cul')],
    ['📚','Halverwege','Helft van alle onderwerpen geleerd', leer >= T.length / 2],
    ['👑','Kapitein','Level 8 gehaald', xp >= 3800],
    ['🏆',"Ballon d'Or",'Hoogste level', xp >= 11000],
  ];
}
function tekenTrofeeen(){
  $('trofeeen').innerHTML = trofeeLijst().map(([i, n, w, ok]) => `<div class="trofee${ok ? '' : ' dicht'}"><span class="t">${i}</span><b>${esc(n)}</b><span>${esc(w)}</span></div>`).join('');
}

// ---------------- Tijd bijhouden ----------------
['pointerdown','keydown','scroll','touchstart'].forEach(ev => addEventListener(ev, () => { S.actief = Date.now(); }, { passive:true }));
let hartslagT = null;
function hartslag(){
  clearInterval(hartslagT);
  hartslagT = setInterval(async () => {
    if (document.hidden || S.pauze || Date.now() - S.actief > 120000) return;
    S.werkSec += 60;
    try {
      const ok = await rpc('eli_tik', { p_naam: S.naam, p_pin: S.pin, p_vak: S.huidigVak || 'algemeen', p_activiteit: S.huidigAct || 'menu' });
      if (ok !== false) S.minLokaal++;
    } catch {}
    if ($('taak').hidden) { $('ring-min').textContent = minutenVandaag(); }
  }, 60000);
}
function pauzeNodig(){ return S.werkSec >= 25 * 60; }

// ---------------- XP en opslaan ----------------
function geefXP(n, el){
  if (!n) return;
  S.xpLokaal += n;
  S.taakXP = (S.taakXP || 0) + n;
  $('taak-xp').textContent = '+' + S.taakXP + ' XP';
  if (el) { const r = el.getBoundingClientRect(); xpPop(n, r.left + r.width / 2 - 30, r.top); } else xpPop(n);
}
async function bewaarKaarten(){
  if (!S.vuil.size) return;
  const lijst = [...S.vuil].map(id => ({ id, ...S.kaarten[id] }));
  S.vuil.clear();
  for (let i = 0; i < lijst.length; i += 300) {
    try { await rpc('eli_kaarten', { p_naam: S.naam, p_pin: S.pin, p_kaarten: lijst.slice(i, i + 300) }); }
    catch { lijst.slice(i, i + 300).forEach(k => S.vuil.add(k.id)); }
  }
}
async function logResultaat(soort, vak, onderwerp, score, totaal, xp, detail){
  try { await rpc('eli_log', { p_naam: S.naam, p_pin: S.pin, p_soort: soort, p_vak: vak || null, p_onderwerp: onderwerp || null, p_score: score, p_totaal: totaal, p_xp: Math.max(0, Math.min(500, Math.round(xp || 0))), p_detail: detail || {} }); }
  catch {}
}
async function taakKlaar(it, score, totaal){
  if (it.vrij) return;
  S.taken[it.id] = { op: new Date().toISOString(), score, totaal };
  try { await rpc('eli_taak', { p_naam: S.naam, p_pin: S.pin, p_taak: it.id, p_score: score ?? null, p_totaal: totaal ?? null }); } catch {}
}
addEventListener('pagehide', () => { if (S.vuil.size) bewaarKaarten(); });

// ---------------- Leitner ----------------
const INTERVAL = [0, 1, 2, 4, 7, 14];
function kaartAntwoord(id, goed){
  const k = S.kaarten[id] || { d: 0, v: vandaag(), g: 0, f: 0 };
  if (goed) { k.d = Math.min(5, (k.d || 0) + 1); k.g = (k.g || 0) + 1; k.v = P.dag(vandaag(), INTERVAL[k.d]); }
  else { k.d = 1; k.f = (k.f || 0) + 1; k.v = P.dag(vandaag(), 1); }
  S.kaarten[id] = k; S.vuil.add(id);
  if (S.vuil.size >= 15) bewaarKaarten();
}
function kaartenVanDag(){
  const d = vandaag();
  return Object.entries(S.kaarten).filter(([, k]) => k.v <= d && k.d < 6)
    .sort((a, b) => a[1].d - b[1].d || (a[1].v < b[1].v ? -1 : 1)).slice(0, 40).map(([id]) => id);
}
function kaartInhoud(id){
  const [tid, i] = id.split('-'); const t = TOPIC[tid];
  return t && t.kaarten[i] ? { t, voor: t.kaarten[i][0], achter: t.kaarten[i][1] } : null;
}

// ---------------- Vragen maken ----------------
function vragenVan(t, n){
  let qs = t.quiz.map(q => ({ ...q, tid: t.id, vak: t.vak }));
  qs = qs.concat(extraVragen(t));
  return schud(qs).slice(0, n);
}
function extraVragen(t){
  const out = [];
  const W = window.ELI_WW, PERS = window.ELI_PERS, PC = window.ELI_PC;
  if (t.drill && t.drill.ww) for (let i = 0; i < 4; i++) out.push(vervoegVraag(schud(t.drill.ww)[0], t));
  if (t.drillPC) for (let i = 0; i < 4; i++) out.push(pcVraag(schud(Object.keys(PC))[0], t));
  if (t.reken) for (let i = 0; i < 4; i++) out.push(rekenVraag(t.reken, t));
  return out.filter(Boolean);
}
function persoon(i){ return window.ELI_PERS[i].split(' / ')[0]; }
function vervoegVraag(w, t){
  const f = window.ELI_WW[w]; if (!f) return null;
  const i = Math.floor(Math.random() * 6);
  return { t:'invul', fr:true, v:`Vervoeg in het présent: <b>${persoon(i)} … (${w})</b> <span class="muted">= ${esc(f[6])}</span>`, a:[f[i]], tid: t.id, vak: 'fr', pron: true };
}
const PC_AVOIR = ['ai','as','a','avons','avez','ont'], PC_ETRE = ['suis','es','est','sommes','êtes','sont'];
function pcVraag(w, t){
  const x = window.ELI_PC[w]; if (!x) return null;
  const i = Math.floor(Math.random() * 6);
  const hulp = x[0] === 'être' ? PC_ETRE[i] : PC_AVOIR[i];
  let part = x[1];
  if (x[0] === 'être' && i >= 3) part += 's';
  return { t:'invul', fr:true, v:`Passé composé: <b>${persoon(i)} … (${w})</b> <span class="muted">= ${esc(x[2])}</span>`, a:[hulp + ' ' + part], tid: t.id, vak:'fr', pron:true,
    u: x[0] === 'être' ? 'Met être: het participe past zich aan (meervoud → +s, vrouwelijk → +e).' : 'Met avoir.' };
}
const getal = x => { const s = String(x); return s.replace('.', ','); };
const rond = (x, bc) => Number(x.toPrecision(bc));
function rekenVraag(soort, t){
  const r = (a, b) => a + Math.random() * (b - a);
  if (soort === 'eenheden') {
    const VV = [['k',3],['h',2],['da',1],['',0],['d',-1],['c',-2],['m',-3]];
    const eenh = schud(['m','g','L'])[0];
    let a = VV[Math.floor(Math.random() * VV.length)], b;
    do { b = VV[Math.floor(Math.random() * VV.length)]; } while (b === a);
    const n = rond(r(1, 99), 2);
    const ant = n * Math.pow(10, a[1] - b[1]);
    return { t:'getal', v:`Zet om: <b>${getal(n)} ${a[0]}${eenh}</b> = … ${b[0]}${eenh}`, a: ant, tol: .001, tid: t.id, vak:'wet', u:`${a[0] || '(geen voorvoegsel)'} = 10^${a[1]}, ${b[0] || '(geen voorvoegsel)'} = 10^${b[1]} → × 10^${a[1] - b[1]}. Je mag ook 4,5e3 of 4,5·10^3 typen.` };
  }
  if (soort === 'bc') {
    const voorbeelden = [['0,0450 m',3],['23,0 g',3],['1,05 kg',3],['0,23 g',2],['120,40 s',5],['0,007 L',1],['5,00 N',3],['3,1416',5],['0,0102 m',3],['70,0 km',3]];
    const [x, n] = voorbeelden[Math.floor(Math.random() * voorbeelden.length)];
    return { t:'getal', v:`Hoeveel beduidende cijfers heeft <b>${x}</b>?`, a:n, tol:0, tid:t.id, vak:'wet', u:'Nullen vooraan tellen niet, nullen in het midden of achteraan (na de komma) wel.' };
  }
  if (soort === 'zwaartekracht') {
    const m = rond(r(1, 80), 3);
    if (Math.random() < .5) return { t:'getal', v:`Een voorwerp heeft een massa van <b>${getal(m)} kg</b>. Bereken F<sub>z</sub> op aarde (g = 9,81 N/kg). Antwoord in N.`, a: m * 9.81, tol: .012, tid:t.id, vak:'wet', u:`F_z = m · g = ${getal(m)} · 9,81 = ${getal(rond(m * 9.81, 3))} N` };
    const F = rond(m * 9.81, 3);
    return { t:'getal', v:`De zwaartekracht op een rugzak is <b>${getal(F)} N</b> (g = 9,81 N/kg). Wat is de massa in kg?`, a: F / 9.81, tol: .012, tid:t.id, vak:'wet', u:`m = F_z / g = ${getal(F)} / 9,81 = ${getal(rond(F / 9.81, 3))} kg` };
  }
  if (soort === 'hooke') {
    const k = Math.round(r(10, 400)), cm = rond(r(1, 15), 2), F = k * cm / 100;
    const keuze = Math.floor(Math.random() * 3);
    if (keuze === 0) return { t:'getal', v:`Veerconstante k = <b>${k} N/m</b>, uitrekking Δl = <b>${getal(cm)} cm</b>. Bereken F<sub>v</sub> in N.`, a:F, tol:.012, tid:t.id, vak:'wet', u:`Eerst cm → m: ${getal(cm)} cm = ${getal(cm / 100)} m. F = k · Δl = ${k} · ${getal(cm / 100)} = ${getal(rond(F, 3))} N` };
    if (keuze === 1) return { t:'getal', v:`Een veer rekt <b>${getal(cm)} cm</b> uit bij <b>${getal(rond(F, 3))} N</b>. Bereken k in N/m.`, a:k, tol:.015, tid:t.id, vak:'wet', u:`k = F / Δl = ${getal(rond(F, 3))} / ${getal(cm / 100)} = ${k} N/m` };
    return { t:'getal', v:`k = <b>${k} N/m</b>, F<sub>v</sub> = <b>${getal(rond(F, 3))} N</b>. Hoe groot is Δl in m?`, a:cm / 100, tol:.015, tid:t.id, vak:'wet', u:`Δl = F / k = ${getal(rond(F, 3))} / ${k} = ${getal(rond(cm / 100, 3))} m` };
  }
  return null;
}
function leesGetal(s){
  s = String(s || '').trim().replace(/\s/g, '').replace(/[a-zA-Zµ/²³]+$/,'')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, c => ({'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'}[c]))
    .replace(',', '.').replace(/(\d)\.(\d{3})\.(\d{3})/, '$1$2$3');
  s = s.replace(/[x×·*]10\^?(-?\d+)/i, 'e$1').replace(/^10\^?(-?\d+)$/, '1e$1');
  const n = Number(s);
  return isFinite(n) && s !== '' ? n : null;
}

// ---------------- Een taak uitvoeren ----------------
let lopend = null;
function voerUit(it){
  const t = it.onderwerp && TOPIC[it.onderwerp];
  const stappen = [];
  if (it.soort === 'leer') stappen.push(['lees', t], ['kaartjes', t.kaarten.map((_, i) => t.id + '-' + i)], ['quiz', vragenVan(t, Math.min(10, t.quiz.length + 2))]);
  else if (it.soort === 'herhaal') stappen.push(['kaartjes', schud(t.kaarten.map((_, i) => t.id + '-' + i)).filter(id => !S.kaarten[id] || S.kaarten[id].d < 4).slice(0, 10)], ['quiz', vragenVan(t, 8)]);
  else if (it.soort === 'extra') stappen.push(['lees', t], ['quiz', vragenVan(t, 8)]);
  else if (it.soort === 'kaarten') stappen.push(['kaartjes', kaartenVanDag(), true]);
  else if (it.soort === 'proef') {
    const ts = T.filter(x => x.vak === it.vak);
    const zwak = new Set(zwakkeOnderwerpen(it.vak).map(z => z.id));
    let qs = [];
    for (const x of ts) qs = qs.concat(vragenVan(x, zwak.has(x.id) ? 4 : 3));
    stappen.push(['quiz', schud(qs).slice(0, 20), 'proef']);
  } else if (it.soort === 'zwak') {
    let zs = zwakkeOnderwerpen(it.vak).slice(0, 3);
    if (!zs.length) zs = schud(T.filter(x => x.vak === it.vak)).slice(0, 3);
    let qs = []; for (const z of zs) qs = qs.concat(vragenVan(TOPIC[z.id], 5));
    const kaart = [];
    for (const z of zs) TOPIC[z.id].kaarten.forEach((_, i) => { const id = z.id + '-' + i; if (!S.kaarten[id] || S.kaarten[id].d <= 2) kaart.push(id); });
    if (kaart.length) stappen.push(['kaartjes', kaart.slice(0, 15)]);
    stappen.push(['quiz', schud(qs).slice(0, 12)]);
  } else if (it.soort === 'drill') {
    const ws = Object.keys(window.ELI_WW), pcs = Object.keys(window.ELI_PC);
    const qs = [];
    for (let i = 0; i < 14; i++) qs.push(vervoegVraag(schud(ws)[0], TOPIC.F4 || T[0]));
    for (let i = 0; i < 6; i++) qs.push(pcVraag(schud(pcs)[0], TOPIC.F6 || T[0]));
    stappen.push(['quiz', qs, 'drill']);
  } else if (it.soort === 'vrij-lees') stappen.push(['lees', t]);
  else if (it.soort === 'vrij-kaartjes') stappen.push(['kaartjes', t.kaarten.map((_, i) => t.id + '-' + i)]);
  else if (it.soort === 'vrij-quiz') stappen.push(['quiz', vragenVan(t, 10)]);
  else if (it.soort === 'kennis') stappen.push(['kennis']);

  lopend = { it, stappen, i: 0, resultaten: [] };
  S.taakXP = 0;
  $('taak-xp').textContent = '+0 XP';
  $('taak-titel').textContent = it.titel;
  $('taak').style.setProperty('--vk', vk(it.vak));
  $('thuis').hidden = true; document.querySelector('.veld').hidden = true; $('taak').hidden = false;
  scrollTo(0, 0);
  S.huidigVak = it.vak || 'alle';
  volgendeStap();
}
$('taak-terug').onclick = () => { bewaarKaarten(); lopend = null; thuis(); };

function tekenStappen(){
  const namen = { lees:'📖 Leren', kaartjes:'🃏 Kaartjes', quiz:'❓ Quiz', kennis:'⭐ Je ploeg' };
  $('taak-stappen').innerHTML = lopend.stappen.map((s, i) => `<span class="${i < lopend.i ? 'ok' : i === lopend.i ? 'aan' : ''}">${i < lopend.i ? '✓ ' : ''}${namen[s[0]]}${s[2] === 'proef' ? ' (proefexamen)' : ''}</span>`).join('');
}
function balk(p){ $('taak-balk').style.width = Math.round(p * 100) + '%'; }

function volgendeStap(){
  if (!lopend) return;
  if (lopend.i >= lopend.stappen.length) return taakAf();
  tekenStappen();
  const [soort, data, extra] = lopend.stappen[lopend.i];
  const verder = res => { if (res) lopend.resultaten.push(res); lopend.i++; volgendeStap(); };
  if (pauzeNodig()) return pauze(() => volgendeStap());
  S.huidigAct = soort;
  if (soort === 'kennis') stapKennis(verder);
  else if (soort === 'lees') stapLees(data, verder);
  else if (soort === 'kaartjes') stapKaartjes(data, verder, extra);
  else stapQuiz(data, verder, extra);
}

// --- Leren ---
// Kennismaking: elk lid van de ploeg stelt zich voor, daarna hoe het werkt.
const VOORSTEL = {
  eli: 'Dit ben jij! Nummer 10, de kampioen van deze ploeg. Wij spelen allemaal voor jou. ⚽',
  marieke: 'Ik ben je ploegmanager. Ik hou je planning in de gaten en stuur je af en toe een berichtje. 💌',
  papa: 'Krachttrainer hier! Bij de pauzes doen we samen oefeningen. Spieren én hersenen trainen! 💪',
  boeboe: 'Hey maat! Ik help je met Gedrag. Samen krijgen we dat examen klein. 😉',
  moemoe: 'Dag schat! Ik help je ook bij Gedrag. En ik ben altijd supertrots op je. 💛',
  thor: 'Ik ben je supporter nummer 1. Ik sta altijd langs de lijn te roepen! 📣',
  bjorn: 'Ik ben de hoofdcoach. Bij de quizzen stel ik de vragen. Geen half werk, hé!',
  onno: 'Ik ben de pauzekapitein. Na 25 minuten werken roep ik: PAUZE! 🧸',
};
const VAKZIN = { kf:'Kunst & Filosofie', gsw:'Gedrag', fr:'Frans', wet:'Wetenschappen', cul:'Cultuur' };
function stapKennis(verder){
  const box = $('taakinhoud');
  const volg = ['eli','marieke','papa','boeboe','moemoe','thor','bjorn','onno'];
  const lijst = (S.stand.figuren || []).filter(f => f.rol !== 'weg' && f.img).sort((a, b) => { const ia = volg.indexOf(a.id), ib = volg.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  let n = 0;
  const toon = () => {
    if (n >= lijst.length) return slot();
    const f = lijst[n];
    const zin = VOORSTEL[f.id] || `Ik ben ${f.naam}. Ik leg je ${VAKZIN[f.vak] || 'van alles'} uit en stel je er vragen over. Samen gaan we ervoor!`;
    balk((n + 1) / (lijst.length + 1));
    box.innerHTML = `<div class="kaart center" style="padding:18px 14px"><div class="label">${n + 1} van ${lijst.length}</div><div class="kennis-pop">${POP.html(f, true)}</div><h2 style="margin-top:6px">${esc(f.naam)}</h2><p class="muted" style="margin:0">${esc(POP.ROLNAAM[f.rol] || '')}${f.vak ? ' · ' + esc(VAKZIN[f.vak]) : ''}</p><div class="ballon" style="margin:14px 0 6px;text-align:left"><div class="tx"></div></div><div class="onder" style="justify-content:center"><button class="knop groot" id="kn">${n + 1 < lijst.length ? 'Volgende speler →' : 'Hoe werkt het? →'}</button></div></div>`;
    box.querySelector('.tx').textContent = zin;
    piep('klik');
    $('kn').onclick = () => { n++; toon(); };
  };
  const slot = () => {
    balk(1);
    box.innerHTML = `<div class="kaart" style="padding:20px 16px"><h2>Zo werkt jouw training</h2>
      <ol style="padding-left:20px;line-height:1.6">
        <li><b>Elke dag inloggen.</b> Morgen (zaterdag) start de echte training.</li>
        <li>Je opdrachten doe je <b>van boven naar onder</b>: eerst leren, dan kaartjes en een quiz.</li>
        <li>Wat je niet afmaakt, komt de volgende dag terug als <b>inhaalwerk</b>.</li>
        <li>Na <b>25 minuten</b> werken krijg je <b>5 minuten pauze</b>, met Drakenjacht of een oefening van papa.</li>
        <li>Alles af? Dan mag je <b>10 minuten Drakenjacht</b> spelen als beloning. 🐉</li>
        <li>Je verdient <b>XP</b>, stijgt in level en verzamelt trofeeën. 🏆</li>
      </ol>
      <div class="babbel" id="kp"></div>
      <div class="onder" style="justify-content:center"><button class="knop groot goud" id="kn">Ik ben er klaar voor! ⚽</button></div></div>`;
    POP.babbel($('kp'), 'Pak je tijd, geen half werk! Tot morgen, kampioen. 💪', { id:'papa' });
    $('kn').onclick = () => verder({ soort:'kennis' });
  };
  POP.klaar().then(toon);
}

function stapLees(t, verder){
  const box = $('taakinhoud');
  const punten = t.samenvatting;
  let n = 0, laatst = Date.now();
  box.innerHTML = `<div class="babbel" id="lees-pop"></div><div class="bronnen">${t.bron.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">📄 ${esc(l)}</a>`).join('')}</div><div id="punten"></div><div class="onder"><button class="knop groot" id="lees-verder">Volgende punt ↓</button></div>`;
  POP.babbel($('lees-pop'), `We gaan <b>${esc(t.titel)}</b> leren. Lees elk punt rustig. Hardop zeggen helpt!`, { vak: t.vak });
  const knop = $('lees-verder');
  const toon = () => {
    const el = document.createElement('div'); el.className = 'leerpunt'; el.innerHTML = punten[n]; $('punten').append(el);
    n++; balk(n / punten.length * (1 / lopend.stappen.length));
    knop.textContent = n < punten.length ? `Volgende punt ↓ (${n}/${punten.length})` : 'Ik heb alles gelezen ✓';
    el.scrollIntoView({ block:'nearest', behavior:'smooth' });
    laatst = Date.now();
    knop.disabled = true; setTimeout(() => knop.disabled = false, Math.min(5000, 1500 + punten[n - 1].length * 18));
  };
  toon();
  knop.onclick = () => {
    if (n < punten.length) return toon();
    geefXP(15, knop);
    verder({ soort:'lees' });
  };
}

// --- Kaartjes ---
function stapKaartjes(ids, verder, dagelijks){
  const box = $('taakinhoud');
  ids = ids.filter(id => kaartInhoud(id));
  if (!ids.length) {
    box.innerHTML = `<div class="babbel" id="kp"></div><div class="onder"><button class="knop groot" id="kv">Verder</button></div>`;
    POP.babbel($('kp'), dagelijks ? 'Vandaag geen herhaalkaartjes! Ze komen terug zodra je onderwerpen leert. 👍' : 'Deze kaartjes ken je al heel goed!', { rol:'coach' });
    $('kv').onclick = () => verder({ soort:'kaartjes', goed:0, totaal:0 });
    return;
  }
  const rij = schud(ids).map(id => ({ id, poging: 0 }));
  const totaal = rij.length; let goedEerst = 0, gedaan = 0;
  const eerste = new Set();
  const toon = () => {
    if (!rij.length) { bewaarKaarten(); return verder({ soort:'kaartjes', goed: goedEerst, totaal }); }
    const k = rij[0], c = kaartInhoud(k.id), st = S.kaarten[k.id];
    balk((lopend.i + gedaan / totaal) / lopend.stappen.length);
    box.innerHTML = `<p class="muted center klein">${gedaan} van ${totaal} · ${esc(c.t.titel)}</p>
      <div class="flip" id="flip" style="--vk:${vk(c.t.vak)}" tabindex="0" role="button" aria-label="Draai de kaart om"><div class="binnen">
        <div class="zij voor"><span class="doos">${st ? 'doos ' + st.d : 'nieuw'}</span><p></p><span class="hint">Denk eerst na, tik dan om te draaien</span></div>
        <div class="zij achter"><p></p></div></div></div>
      <div class="onder" id="kk" style="justify-content:center"><button class="knop licht groot" id="draai">Draai om</button></div>`;
    box.querySelector('.voor p').textContent = c.voor;
    box.querySelector('.achter p').textContent = c.achter;
    const flip = $('flip');
    const draai = () => {
      if (flip.classList.contains('om')) return;
      flip.classList.add('om');
      $('kk').innerHTML = `<button class="knop" style="background:var(--fout);box-shadow:0 4px 0 #a61e4d" id="nee">✗ Wist ik niet</button><button class="knop" id="ja">✓ Wist ik!</button>`;
      $('ja').onclick = () => antwoord(true); $('nee').onclick = () => antwoord(false);
    };
    flip.onclick = draai; $('draai').onclick = draai;
    flip.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); draai(); } };
  };
  const antwoord = goed => {
    const k = rij.shift();
    if (!eerste.has(k.id)) { eerste.add(k.id); kaartAntwoord(k.id, goed); if (goed) goedEerst++; gedaan++; }
    if (goed) { geefXP(k.poging ? 1 : 2, $('flip')); piep('goed'); }
    else { piep('fout'); k.poging++; if (k.poging < 3) rij.splice(Math.min(rij.length, 3 + Math.floor(Math.random() * 3)), 0, k); }
    if (pauzeNodig() && rij.length > 3) return pauze(toon);
    toon();
  };
  toon();
}

// --- Quiz ---
function stapQuiz(vragen, verder, modus){
  vragen = vragen.filter(Boolean);
  const box = $('taakinhoud');
  const totaal = vragen.length;
  let i = 0, score = 0;
  const fouten = [], perOnderwerp = {};
  const opnieuw = [];
  const vragers = {};
  const vrager = vak => (vragers[vak] = vragers[vak] || POP.kies(vak, 'coach'));
  const toon = () => {
    if (i >= vragen.length) {
      if (opnieuw.length) { vragen.push(...opnieuw.splice(0).map(q => ({ ...q, herkans: true }))); }
      else return einde();
    }
    const q = vragen[i];
    balk((lopend.i + Math.min(i, totaal) / totaal) / lopend.stappen.length);
    box.innerHTML = `<div class="vraagkaart" style="--vk:${vk(q.vak)}"><div class="rij" style="justify-content:space-between"><span class="label">${q.herkans ? '🔁 Nog eens' : `Vraag ${i + 1} van ${totaal}`}</span><span class="pil">${esc((V[q.vak] || {}).kort || '')}</span></div><div class="babbel vraagbabbel" id="qpop"></div><div id="ant"></div><div id="fb"></div><div class="onder" id="qv"></div></div>`;
    POP.babbel($('qpop'), `<div class="vtekst">${q.v}</div>`, { figuur: vrager(q.vak) });
    tekenAntwoord(q, (pt, uitleg) => resultaat(q, pt, uitleg));
  };
  const resultaat = (q, pt, uitleg) => {
    if (!q.herkans) {
      score += pt;
      const o = perOnderwerp[q.tid] = perOnderwerp[q.tid] || { s:0, t:0, vak:q.vak };
      o.s += pt; o.t += 1;
      if (pt < 1) { fouten.push(q.v.replace(/<[^>]+>/g, '')); opnieuw.push(q); }
      if (pt >= 1) geefXP(5, $('fb'));
    }
    const fb = $('fb');
    const goed = pt >= 1, half = pt > 0 && pt < 1;
    fb.className = 'feedback ' + (goed ? 'goed' : half ? 'info' : 'fout');
    const lof = ['Juist! ⚽','Goal! 🎉','Top! 💪','Netjes!','Helemaal juist!'];
    fb.innerHTML = (goed ? lof[Math.floor(Math.random() * lof.length)] : half ? 'Bijna!' : 'Niet juist.') + (uitleg ? `<span>${uitleg}</span>` : '') + (q.u ? `<span>💡 ${q.u}</span>` : '');
    if (Math.random() < .2) {
      const wie = POP.metId(goed ? (Math.random() < .5 ? 'boeboe' : 'moemoe') : 'moemoe');
      const zin = goed
        ? (wie && wie.id === 'boeboe' ? schud(['Goal! Zelfs ik had dat niet geweten. 😜','Slimmerik! Heb je dat van mij? 😎','Juist! Dat verdient een high five. ✋ Mis! Ah nee, toch raak.'])[0] : schud(['Goed zo, schatteke! 💛','Zie je wel dat je het kan! 🥰','Moemoe is trots! 💛'])[0])
        : schud(['Geeft niks, lieverd. Volgende keer weet je het! 💛','Fouten maken is leren. Kop op! 🤗'])[0];
      if (wie) fb.insertAdjacentHTML('beforeend', `<span class="commentaar">${esc(wie.naam)}: ${zin}</span>`);
    }
    piep(goed ? 'goed' : 'fout');
    const b = document.createElement('button'); b.className = 'knop groot'; b.textContent = 'Volgende →';
    b.onclick = () => { i++; if (pauzeNodig() && i < vragen.length - 2) pauze(toon); else toon(); };
    $('qv').append(b); b.focus();
  };
  const einde = async () => {
    const pct = totaal ? score / totaal : 1;
    const nodig = modus === 'drill' ? .6 : .7;
    const gehaald = pct >= nodig;
    if (pct === 1 && totaal >= 5) lokaal.set('perfect', lokaal.get('perfect', 0) + 1);
    const bonus = gehaald ? (pct === 1 ? 50 : 30) : 5;
    geefXP(bonus);
    // Per onderwerp loggen (voor de zwakke punten en de ouderpagina).
    const entries = Object.entries(perOnderwerp);
    for (const [tid, o] of entries) {
      logResultaat('quiz', o.vak, tid, o.s, o.t, 0, { taak: lopend && lopend.it.id, modus: modus || 'quiz' });
      const r = (S.stand.onderwerpen[tid] = S.stand.onderwerpen[tid] || { s:0, t:0 });
      r.s += o.s; r.t += o.t;
    }
    const sterren = pct >= .95 ? 3 : pct >= .8 ? 2 : pct >= nodig ? 1 : 0;
    box.innerHTML = `<div class="kaart resultaat"><div class="sterren">${'⭐'.repeat(sterren)}${'☆'.repeat(3 - sterren)}</div><div class="groot">${Math.round(pct * 100)}%</div><p class="muted">${Math.round(score * 10) / 10} van ${totaal} juist bij de eerste poging</p><div class="babbel" id="rp" style="text-align:left"></div>${fouten.length ? `<div class="foutlijst"><div class="label" style="margin-bottom:6px">Deze komen extra terug</div>${fouten.slice(0, 8).map(f => `<div>${esc(f)}</div>`).join('')}</div>` : ''}<div class="onder" style="justify-content:center" id="rk"></div></div>`;
    POP.babbel($('rp'), gehaald ? (pct === 1 ? 'PERFECT! Dat is een hattrick! 🎩⚽' : 'Goed gedaan! Opdracht gehaald. 💪') : `Nog niet genoeg (nodig: ${Math.round(nodig * 100)}%). Geen probleem: <b>nog een keer</b>, nu met andere volgorde. Lees eerst even je fouten.`, gehaald && Math.random() < .5 ? { figuur: POP.kring() || undefined, eigen: true } : { vak: lopend.it.vak });
    if (gehaald) { confetti(sterren === 3 ? 3500 : 1800); piep('klaar'); }
    const rk = $('rk');
    if (gehaald) {
      const b = document.createElement('button'); b.className = 'knop groot'; b.textContent = 'Verder →';
      b.onclick = () => verder({ soort:'quiz', score, totaal, gehaald:true });
      rk.append(b);
    } else {
      const b = document.createElement('button'); b.className = 'knop groot goud'; b.textContent = '🔁 Nog een keer';
      b.onclick = () => { const zelfde = vragen.slice(0, totaal).map(q => ({ ...q, herkans: false })); stapQuiz(schud(zelfde), verder, modus); };
      const t = lopend && lopend.it.onderwerp && TOPIC[lopend.it.onderwerp];
      if (t) { const l = document.createElement('button'); l.className = 'knop licht'; l.textContent = '📖 Eerst nog eens lezen'; l.onclick = () => stapLees(t, () => stapQuiz(schud(vragen.slice(0, totaal).map(q => ({ ...q, herkans:false }))), verder, modus)); rk.append(l); }
      rk.append(b);
    }
  };
  toon();
}

function tekenAntwoord(q, klaar){
  const ant = $('ant');
  let af = false;
  const done = (pt, uitleg) => { if (af) return; af = true; klaar(pt, uitleg); };
  if (q.t === 'mc') {
    const opties = schud(q.o.map((o, j) => ({ o, goed: j === (q.a || 0) })));
    ant.innerHTML = `<div class="opties">${opties.map((x, j) => `<button class="optie" data-j="${j}"><span class="lt">${'ABCD'[j] || j + 1}</span><span></span></button>`).join('')}</div>`;
    [...ant.querySelectorAll('.optie')].forEach((b, j) => {
      b.querySelector('span:last-child').textContent = opties[j].o;
      b.onclick = () => {
        ant.querySelectorAll('.optie').forEach((x, k) => { x.disabled = true; if (opties[k].goed) x.classList.add('goed'); });
        if (!opties[j].goed) b.classList.add('fout');
        done(opties[j].goed ? 1 : 0, opties[j].goed ? '' : 'Juist was: <b>' + esc(q.o[q.a || 0]) + '</b>');
      };
    });
  } else if (q.t === 'jf') {
    ant.innerHTML = `<div class="opties jf"><button class="optie" data-v="1">👍 Juist</button><button class="optie" data-v="0">👎 Fout</button></div>`;
    ant.querySelectorAll('.optie').forEach(b => b.onclick = () => {
      const keuze = b.dataset.v === '1', goed = keuze === q.a;
      ant.querySelectorAll('.optie').forEach(x => { x.disabled = true; if ((x.dataset.v === '1') === q.a) x.classList.add('goed'); });
      if (!goed) b.classList.add('fout');
      done(goed ? 1 : 0, goed ? '' : `De stelling is <b>${q.a ? 'juist' : 'fout'}</b>.`);
    });
  } else if (q.t === 'invul' || q.t === 'getal') {
    ant.innerHTML = `<form id="if" class="rij" style="flex-wrap:nowrap"><input id="iv" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${q.t === 'getal' ? 'Getal (bv. 4,5 of 4,5e3)' : 'Typ je antwoord'}" ${q.t === 'getal' ? 'inputmode="decimal"' : ''}><button class="knop">OK</button></form>${q.fr ? '<div class="rij" style="margin-top:8px" id="acc"></div>' : ''}`;
    if (q.fr) $('acc').innerHTML = ['é','è','ê','à','ç','ô','î','ë'].map(c => `<button type="button" class="knop licht klein" data-c="${c}">${c}</button>`).join('');
    if (q.fr) $('acc').onclick = e => { const b = e.target.closest('button'); if (!b) return; const iv = $('iv'); const p = iv.selectionStart ?? iv.value.length; iv.value = iv.value.slice(0, p) + b.dataset.c + iv.value.slice(p); iv.focus(); iv.setSelectionRange(p + 1, p + 1); };
    const iv = $('iv'); setTimeout(() => iv.focus(), 50);
    $('if').onsubmit = e => {
      e.preventDefault();
      if (!iv.value.trim()) return;
      iv.disabled = true;
      if (q.t === 'getal') {
        const n = leesGetal(iv.value);
        const goed = n !== null && (q.tol ? Math.abs(n - q.a) <= Math.abs(q.a) * q.tol + 1e-12 : n === q.a);
        return done(goed ? 1 : 0, goed ? '' : `Juist antwoord: <b>${getal(rond(q.a, 4))}</b>`);
      }
      let x = norm(iv.value);
      const opties = q.a.map(norm);
      if (q.pron) x = x.replace(/^(je|j'|tu|il|elle|on|nous|vous|ils|elles)\s*/, '');
      const exact = opties.includes(x);
      const zonder = !exact && opties.map(stripAccent).includes(stripAccent(x));
      if (exact) return done(1, '');
      if (zonder) return done(q.fr ? .5 : 1, q.fr ? `Let op de accenten: <b>${esc(q.a[0])}</b>` : '');
      done(0, `Juist antwoord: <b>${esc(q.a[0])}</b>`);
    };
  } else if (q.t === 'open') {
    ant.innerHTML = `<textarea id="ov" rows="4" placeholder="Schrijf je antwoord (in je eigen woorden)"></textarea><div class="onder"><button class="knop" id="om">Toon het modelantwoord</button></div><div id="mod"></div>`;
    $('om').onclick = () => {
      $('om').disabled = true;
      $('mod').innerHTML = `<div class="feedback info">Modelantwoord<span></span></div><p class="muted klein">Vergelijk eerlijk. Hoe goed was jouw antwoord?</p><div class="rij"><button class="knop" data-p="1">✓ Juist</button><button class="knop goud" data-p="0.5">± Half</button><button class="knop licht" data-p="0">✗ Fout</button></div>`;
      $('mod').querySelector('span').textContent = q.m;
      $('mod').querySelectorAll('[data-p]').forEach(b => b.onclick = () => { $('mod').querySelectorAll('[data-p]').forEach(x => x.disabled = true); done(Number(b.dataset.p), ''); });
    };
  } else if (q.t === 'volgorde') {
    const juist = q.o, rest = schud(juist.map((o, j) => ({ o, j })));
    const gekozen = [];
    ant.innerHTML = `<p class="muted klein">Tik in de juiste volgorde.</p><div class="volgorde-gekozen" id="vg"></div><div class="opties" id="vo"></div>`;
    const teken = () => {
      $('vg').innerHTML = gekozen.map((x, k) => `<div>${k + 1}. ${esc(x.o)}</div>`).join('');
      $('vo').innerHTML = ''; rest.forEach((x, k) => {
        const b = document.createElement('button'); b.className = 'optie'; b.textContent = x.o;
        b.onclick = () => { gekozen.push(rest.splice(k, 1)[0]); teken(); if (!rest.length) { const goed = gekozen.every((g, k) => g.o === juist[k]); done(goed ? 1 : 0, goed ? '' : 'Juiste volgorde: ' + juist.map(esc).join(' → ')); } };
        $('vo').append(b);
      });
    };
    teken();
  }
}

async function taakAf(){
  const it = lopend.it;
  const q = lopend.resultaten.filter(r => r.soort === 'quiz').pop();
  const k = lopend.resultaten.filter(r => r.soort === 'kaartjes').pop();
  const score = q ? q.score : k ? k.goed : null, totaal = q ? q.totaal : k ? k.totaal : null;
  bewaarKaarten();
  if (!it.vrij) {
    await taakKlaar(it, score, totaal);
    geefXP(25);
  }
  logResultaat('taak', it.vak, it.onderwerp, score ?? 0, totaal ?? 0, S.taakXP, { taak: it.id, soort: it.soort, titel: it.titel });
  const box = $('taakinhoud');
  balk(1); lopend.i = lopend.stappen.length; tekenStappen();
  const items = itemsVandaag(), allesAf = it.soort !== 'kennis' && items.length && items.every(x => isKlaar(x.id));
  box.innerHTML = `<div class="kaart center" style="padding:26px 18px"><div style="font-size:3.4rem">${allesAf ? '🏆' : '✅'}</div><h2>${allesAf ? 'Alles gedaan voor vandaag!' : it.soort === 'kennis' ? 'Je kent je ploeg!' : 'Opdracht klaar!'}</h2><p class="muted">Je verdiende <b>${S.taakXP} XP</b> met deze opdracht.</p><div class="babbel" id="ap" style="text-align:left;margin-top:12px"></div><div class="onder" style="justify-content:center"><button class="knop groot" id="naar">${allesAf ? 'Naar de beloning 🐉' : it.soort === 'kennis' ? 'Bekijk je ploeg ⭐' : 'Volgende opdracht →'}</button></div></div>`;
  POP.babbel($('ap'), allesAf ? 'Wat een training! Ik ben trots op je. Nu mag je even draken jagen. 🐉' : it.soort === 'kennis' ? 'Welkom in de ploeg, kampioen! Morgen beginnen we eraan. 💪' : 'Lekker bezig! Op naar de volgende.', { figuur: POP.kring() || undefined, vak: it.vak, eigen: !allesAf });
  confetti(allesAf ? 4000 : 1500); piep('klaar');
  $('naar').onclick = () => {
    if (allesAf) { location.href = 'spel.html?beloning=1' + (MEEKIJK ? '&meekijk=1' : ''); return; }
    if (it.soort === 'kennis') { thuis(); document.querySelector('#tabs [data-tab="ploeg"]').click(); return; }
    if (it.vrij) return thuis();
    const volgende = itemsVandaag().find(x => !isKlaar(x.id));
    if (volgende && !pauzeNodig()) voerUit(volgende); else thuis();
  };
}

// ---------------- Pauze ----------------
function pauze(daarna){
  S.pauze = true; S.huidigAct = 'pauze';
  bewaarKaarten();
  const m = $('modaal'), c = $('modaal-inhoud');
  const weetjes = [
    'Je hersenen slaan nieuwe dingen vooral op tijdens pauzes en slaap. Pauze is dus ook leren!',
    'Een octopus heeft drie harten en blauw bloed. 🐙',
    'Cristiano Ronaldo trainde als kind met gewichten aan zijn enkels om sneller te worden.',
    'Honing bederft nooit. Archeologen vonden 3000 jaar oude honing die nog eetbaar was.',
    'De Eiffeltoren is in de zomer tot 15 cm hoger door de warmte.',
    'Een slak kan drie jaar slapen. 🐌',
    'Bananen zijn eigenlijk bessen, aardbeien niet.',
    'Je botten zijn per gram sterker dan staal.',
  ];
  c.innerHTML = `<div class="babbel" id="pp"></div><h2 class="center">⏸️ Rust! 5 minuten pauze</h2><p class="center muted">Je werkte 25 minuten. Kies wat je doet:</p>
    <div class="pauzekeuze">
      <button data-p="spel"><span>🐉</span>Drakenjacht<small class="muted">5 min, met vragen</small></button>
      <button data-p="adem"><span>🫧</span>Ademhalen<small class="muted">rustig worden</small></button>
      <button data-p="beweeg"><span>🤸</span>Bewegen<small class="muted">voetbal-oefening</small></button>
      <button data-p="weetje"><span>🤯</span>Weetje<small class="muted">iets gek leren</small></button>
    </div><div id="pz" style="margin-top:14px"></div>`;
  POP.babbel($('pp'), 'Even de benen strekken, kampioen! Na de pauze gaan we weer verder.', Math.random() < .5 ? { figuur: POP.kring() || undefined } : { rol:'pauze' });
  m.hidden = false;
  const eindPauze = () => { S.pauze = false; S.werkSec = 0; m.hidden = true; daarna && daarna(); };
  const klok = (sec, el, klaarTekst) => {
    const eind = Date.now() + sec * 1000;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((eind - Date.now()) / 1000));
      el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      if (!s) { clearInterval(t); el.textContent = klaarTekst || 'Klaar!'; }
    }, 250);
    return t;
  };
  c.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    const pz = $('pz'); const soort = b.dataset.p;
    if (soort === 'spel') { sessie.set({ ...sessie.get(), terugNaPauze: true }); location.href = 'spel.html?pauze=1' + (MEEKIJK ? '&meekijk=1' : ''); return; }
    if (soort === 'adem') pz.innerHTML = `<div class="adem">adem in…</div><p class="center muted">Adem 4 tellen in als de bol groeit, 4 tellen uit als hij krimpt.</p>`;
    if (soort === 'beweeg') pz.innerHTML = `<div class="babbel" id="pzp"></div><div class="kaart"><h3>Voetbal-pauze ⚽</h3><p>1. 20 keer hooghouden (of doen alsof met een prop papier).<br>2. 10 squats als een keeper.<br>3. 30 seconden op één been staan, dan het andere.<br>4. Een glas water drinken. 💧</p></div>`;
    if (soort === 'beweeg') POP.babbel($('pzp'), 'Kom op, kampioen! Spieren wakker maken. Ik doe mee! 💪', { id:'papa' });
    if (soort === 'weetje') pz.innerHTML = `<div class="kaart"><h3>Wist je dat…</h3><p>${schud(weetjes)[0]}</p></div>`;
    if (soort === 'adem') { const el = pz.querySelector('.adem'); let in_ = true; const t = setInterval(() => { if (m.hidden) return clearInterval(t); in_ = !in_; el.textContent = in_ ? 'adem in…' : 'adem uit…'; }, 4000); }
  });
  const kl = document.createElement('div'); kl.className = 'pauzeklok'; kl.style.marginTop = '12px';
  c.append(kl);
  const v = document.createElement('div'); v.className = 'onder'; v.style.justifyContent = 'center';
  const kb = document.createElement('button'); kb.className = 'knop groot'; kb.textContent = 'Ik ben er weer! Verder ▶'; kb.disabled = true;
  v.append(kb); c.append(v);
  klok(180, kl, 'Klaar om verder te gaan!');
  setTimeout(() => kb.disabled = false, 180000);
  const skip = document.createElement('p'); skip.className = 'center muted klein'; skip.textContent = 'Je kan na 3 minuten verder. Maximaal 5 minuten.'; c.append(skip);
  kb.onclick = eindPauze;
  setTimeout(() => { if (!m.hidden && S.pauze) { toast('De pauze is voorbij. Op naar de volgende!'); eindPauze(); } }, 300000);
}

// ---------------- Berichten ----------------
function toonBerichten(lijst, nieuw){
  const m = $('modaal'), c = $('modaal-inhoud');
  lijst = lijst || (S.stand.berichten || []);
  c.innerHTML = `<h2 style="margin-bottom:4px">${nieuw ? (lijst.length > 1 ? `💌 Je hebt ${lijst.length} nieuwe berichtjes!` : '💌 Je hebt een berichtje!') : '💌 Je inbox'}</h2>${nieuw ? '' : '<p class="muted klein" style="margin:0 0 10px">Berichtjes van je supporters (laatste 2 weken). Stuur gerust iets terug!</p>'}` + (lijst.length ? '' : '<p class="muted">Nog geen berichtjes.</p>');
  for (const b of lijst) {
    const el = document.createElement('div'); el.className = 'bericht' + (!b.gezien ? ' nieuw' : '');
    if (b.foto) { const img = document.createElement('img'); img.src = b.foto; img.alt = 'Selfie van ' + naamVan(b.van); el.append(img); }
    else if (b.heeftFoto) { const f = document.createElement('div'); f.className = 'muted klein'; f.textContent = '📷 met een selfie (is na een paar dagen verdwenen)'; el.append(f); }
    const afz = document.createElement('div'); afz.className = 'afz';
    const fig = POP.vanLogin(b.van); if (fig) afz.insertAdjacentHTML('beforeend', POP.html(fig));
    const van = document.createElement('div'); van.className = 'van'; van.textContent = (!b.gezien ? '🆕 ' : '') + naamVan(b.van) + ' · ' + new Date(b.op).toLocaleString('nl-BE', { weekday:'short', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit' }); afz.append(van); el.append(afz);
    if (b.tekst) { const p = document.createElement('p'); p.textContent = b.tekst; el.append(p); }
    const antw = () => {
      el.querySelectorAll('.antwoord,.mijnantw').forEach(x => x.remove());
      if (b.antwoord) { const m = document.createElement('div'); m.className = 'mijnantw'; m.textContent = '💬 Jij: ' + b.antwoord; el.append(m); return; }
      const f = document.createElement('form'); f.className = 'antwoord';
      f.innerHTML = `<input maxlength="300" placeholder="Stuur iets terug naar ${esc(naamVan(b.van))}…" aria-label="Antwoord"><button class="knop klein">Stuur</button>`;
      f.onsubmit = async e => {
        e.preventDefault(); const tekst = f.querySelector('input').value.trim(); if (!tekst) return;
        f.querySelector('button').disabled = true;
        try { const ok = await rpc('eli_antwoord', { p_naam: S.naam, p_pin: S.pin, p_id: b.id, p_tekst: tekst }); if (ok === false) throw 0; b.antwoord = tekst; antw(); toast('Verstuurd naar ' + naamVan(b.van) + '! 💌'); piep('goed'); }
        catch { f.querySelector('button').disabled = false; toast('Versturen lukte niet. Probeer nog eens.'); }
      };
      el.append(f);
    };
    if (b.id) antw();
    c.append(el);
  }
  const k = document.createElement('div'); k.className = 'onder';
  const ok = document.createElement('button'); ok.className = 'knop groot'; ok.textContent = nieuw ? 'Merci! Aan de slag ⚽' : 'Sluiten';
  ok.onclick = () => { m.hidden = true; };
  k.append(ok); c.append(k);
  m.hidden = false;
  const ongelezen = (S.stand.berichten || []).filter(b => !b.gezien);
  if (ongelezen.length) { if (nieuw) confetti(1500); rpc('eli_gezien', { p_naam: S.naam, p_pin: S.pin }).catch(() => {}); ongelezen.forEach(b => b.gezien = new Date().toISOString()); }
  teller();
}
function welkom(){
  if (lokaal.get('welkom-' + vandaag(), false)) return;
  lokaal.set('welkom-' + vandaag(), true);
  const items = itemsVandaag();
  const m = $('modaal'), c = $('modaal-inhoud');
  c.innerHTML = `<div class="babbel" id="wp"></div><h2>Klaar voor de training?</h2><p class="muted">${items.length} opdracht${items.length === 1 ? '' : 'en'} vandaag, ± ${P.budget(vandaag())} minuten. Begin bovenaan en werk ze één voor één af.</p><div class="onder"><button class="knop groot" id="wk">Let's go! ⚽</button></div>`;
  POP.babbel($('wp'), 'Welkom terug, Eli! Elke dag een beetje, dan haal je die examens met glans. 💪', { figuur: POP.kring() || undefined, eigen: true });
  m.hidden = false;
  $('wk').onclick = () => m.hidden = true;
}
function teller(){
  const n = ((S.stand && S.stand.berichten) || []).filter(b => !b.gezien).length;
  const k = $('knop-berichten');
  k.innerHTML = '💌' + (n ? `<b class="badge">${n}</b>` : '');
  k.setAttribute('aria-label', n ? `Inbox, ${n} nieuw` : 'Inbox');
}
$('knop-berichten').onclick = () => toonBerichten(null, false);
$('knop-uit').onclick = () => { if (MEEKIJK) { location.href = 'ouder.html'; return; } bewaarKaarten(); sessie.wis(); location.reload(); };
$('knop-geluid').onclick = () => { const s = !lokaal.get('stil', false); lokaal.set('stil', s); $('knop-geluid').textContent = s ? '🔇' : '🔊'; };
$('knop-geluid').textContent = lokaal.get('stil', false) ? '🔇' : '🔊';
$('modaal').addEventListener('click', e => { if (e.target === $('modaal') && !S.pauze) $('modaal').hidden = true; });

// ---------------- Opstart ----------------
tekenToetsen();
(async () => {
  const s = sessie.get();
  if (s && s.rol === 'ouder' && MEEKIJK) {
    try {
      const res = await rpc('eli_ouder', { p_naam: s.naam, p_pin: s.pin });
      if (res) {
        S.naam = s.naam; S.pin = s.pin;
        document.body.classList.add('meekijk');
        const band = document.createElement('div'); band.className = 'meekijkband';
        band.innerHTML = `👀 Je kijkt mee met Eli's app. Niets wordt bewaard. <a href="ouder.html">Terug</a>`;
        document.body.prepend(band);
        lokaal.set('welkom-' + vandaag(), true);
        start({ ...res.stand, berichten: [] });
        return;
      }
    } catch {}
  }
  if (s && s.rol === 'ouder') { location.href = 'ouder.html'; return; }
  if (s && s.naam && s.pin) {
    try {
      const res = await rpc('eli_aanmelden', { p_naam: s.naam, p_pin: s.pin });
      if (res && res.rol === 'eli') { S.naam = s.naam; S.pin = s.pin; start(res); return; }
    } catch {}
    sessie.wis();
  }
  $('login').hidden = false;
})();
window.ELI_APP = { S, leesGetal, rekenVraag, itemsVandaag };
})();
