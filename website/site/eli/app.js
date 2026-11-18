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
// Soepel vergelijken: hoofdletters, spaties en leestekens (. … , ! ? ; : " « » haakjes) tellen niet mee.
// Accenten, apostrofs en streepjes (viens-tu) tellen wel.
const norm = s => String(s || '').toLowerCase().normalize('NFC').replace(/[’`´‘]/g, "'").replace(/[  ]/g, ' ')
  .replace(/[.…,!?¡¿;:"«»“”()[\]]/g, ' ').replace(/\s*'\s*/g, "'").replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();
// "perdu(e)" → perdu én perdue; "Je prends… (le train)" → met en zonder het stuk tussen haakjes.
const varianten = a => { const s = String(a); return /\(/.test(s) ? [s, s.replace(/\(([^)]*)\)/g, '$1'), s.replace(/\([^)]*\)/g, '')] : [s]; };
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
  let terug = false;
  let wacht = false; try { wacht = !!localStorage.getItem('eli-hervat'); } catch {}
  if ((ses && ses.terugNaPauze) || wacht) { if (ses && ses.terugNaPauze) sessie.set({ ...ses, terugNaPauze: false }); terug = hervat(); setTimeout(() => toast(terug ? 'Welkom terug! Je gaat verder waar je was. ⚽' : 'Welkom terug van je pauze! Verder met de training. ⚽'), 600); }
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
    for (const it of items) if (!it.dyn && !isKlaar(it.id)) out.push({ ...it, inhaal: dag });
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
  if (d < P.START) { $('ring').style.setProperty('--p', 0); $('ring-min').textContent = '⭐'; $('ring-van').textContent = 'start morgen'; }
  $('dagtitel').textContent = d < P.START ? 'Kennismaken met je ploeg' : d > P.EINDE ? 'Examens voorbij!' : budget === 0 ? 'Laatste examen: Cultuur' : wd === 2 ? 'Voetbaldag: korte training' : (wd === 0 || wd === 6) ? 'Weekendtraining' : 'Training van vandaag';
  $('dagsub').textContent = d < P.START ? 'Vandaag nog geen training: maak kennis met je ploeg (5 minuutjes). Morgen, zaterdag, start de echte training!' : budget ? `${budget} minuten actief werken. Na elke 25 minuten krijg je een pauze.` : 'Succes vandaag! Je hebt hard gewerkt.';

  // Opdrachten
  const items = itemsVandaag();
  const lijst = $('takenlijst');
  let eersteOpen = items.findIndex(it => !isKlaar(it.id));
  const klaar = items.filter(it => isKlaar(it.id)).length;
  const restMin = items.filter(it => !isKlaar(it.id)).reduce((a, it) => a + (it.min || 0), 0);
  $('takenteller').textContent = items.length ? `${klaar} van ${items.length} klaar` + (restMin ? ` · nog ± ${restMin} min` : ' ✅') : '';
  lijst.innerHTML = items.length ? '' : '<div class="leeg kaart">Geen opdrachten vandaag. Geniet ervan!</div>';
  items.forEach((it, i) => {
    const el = document.createElement('div');
    const done = isKlaar(it.id), slot = !done && i !== eersteOpen;
    el.className = 'taak' + (done ? ' klaar' : '') + (slot ? ' slot' : '') + (it.inhaal ? ' inhaal' : '');
    el.style.setProperty('--vk', vk(it.vak));
    const ic = done ? '✅' : it.soort === 'kennis' ? '⭐' : it.soort === 'kaarten' ? '🃏' : it.soort === 'overhoor' ? '🗣️' : it.soort === 'proef' ? '📝' : it.soort === 'drill' ? '⚡' : it.soort === 'zwak' || it.soort === 'extra' ? '🎯' : (V[it.vak] || {}).icoon || '📘';
    const wat = { kennis:'Kennismaking', leer:'Leren + zelf uitleggen + quiz', herhaal:'Herhalen + quiz', proef:'Proefexamen', zwak:'Zwakke punten', extra:'Extra herhaling (ging moeilijk)', drill:'Werkwoorden-sprint', kaarten:'Herhaalkaartjes', overhoor:'3 vragen, samen met mama, papa of een supporter' }[it.soort] || '';
    el.innerHTML = `<div class="ic">${ic}</div><div class="tx">${it.inhaal ? `<span class="tag">Inhaalwerk van ${mooiDatum(it.inhaal, true)}</span>` : ''}<b></b><span>${esc((V[it.vak] || {}).kort || 'Alle vakken')}${wat ? ' · ' + wat : ''} · ± ${it.min} min</span></div>`;
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
  verrassing(lijst, d);
  fotoronde(lijst);

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
  // Nonkel Tim, de afleider: lokt met zijn consoles zolang er werk ligt, en geeft gamen vrij als alles af is.
  if (POP.tim() && Math.random() < .35) {
    if (alles) return POP.babbel($('dagbabbel'), 'Alles af? Oké… <b>NU</b> mag je gamen. 🤘🎮', { figuur: POP.tim() });
    if (items.length) return POP.babbel($('dagbabbel'), mot, { figuur: POP.tim(), eigen: true });
  }
  const maat = Math.random() < .75 && POP.kring();
  POP.babbel($('dagbabbel'), mot, maat ? { figuur: maat, eigen: !/inhaal|Toppie/.test(mot) } : { rol: alles ? ['supporter','manager','trainer'] : ['manager','trainer','supporter','coach'] });
}

function motivatie(items, alles){
  const r = reeks();
  const open = items.filter(it => !isKlaar(it.id)).length;
  const inhaal = items.filter(it => it.inhaal && !isKlaar(it.id)).length;
  if (vandaag() < P.START) return alles ? 'Welkom in de ploeg! Morgen start de training. Slaap goed, kampioen. 😴' : 'Hey Eli! Kom kennismaken met je ploeg. Morgen beginnen we eraan! ⚽';
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
  if (b.dataset.tab === 'hulp') tekenHulp();
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
      const s = k ? '✓' : x < d ? (it.dyn ? '–' : '⚠️') : x === d ? '⏳' : '🔒';
      return `<div class="pitem" style="${k ? 'opacity:.6' : ''}"><i>${s}</i><span>${esc(it.titel)} <span class="muted">· ${esc((V[it.vak] || {}).kort || '')}</span></span></div>`;
    }).join('');
    return `<div class="pdag${x === d ? ' nu' : ''}" ${x === d ? 'id="plan-nu"' : ''}><div class="d">${mooiDatum(x, true)}<br><span class="muted">${P.budget(x)} min</span></div><div>${exam}${rij || '<span class="muted klein">vrij</span>'}</div></div>`;
  }).join('');
  const nu = $('plan-nu'); if (nu) nu.scrollIntoView({ block:'center' });
}

// ⚡ Verrassingstoets: duikt willekeurig op (± om de 2 dagen), 10 vragen over wat Eli al leerde.
function verrassing(lijst, d){
  if (MEEKIJK || d < P.START) return;
  const geleerdT = T.filter(t => geleerd(t.id));
  if (geleerdT.length < 2) return;
  let keuze = lokaal.get('verr-dag-' + d, null);
  if (keuze === null) {
    const laatst = lokaal.get('verr-laatst', null);
    const dagen = laatst ? Math.round((new Date(d) - new Date(laatst)) / 864e5) : 99;
    keuze = dagen >= 2 && Math.random() < .6;
    lokaal.set('verr-dag-' + d, keuze);
  }
  if (!keuze || lokaal.get('verr-af-' + d, false)) return;
  const el = document.createElement('div'); el.className = 'verrassing';
  el.innerHTML = `<div class="groot">⚡</div><div style="flex:1"><h3>Verrassingstoets!</h3><p class="klein" style="margin:0">10 vragen over wat je al leerde. Haal je 8 of meer? Dan krijg je <b>50 XP</b> extra.</p></div>`;
  const b = document.createElement('button'); b.className = 'knop goud'; b.textContent = 'Start';
  b.onclick = () => {
    let qs = []; for (const t of geleerdT) qs = qs.concat(vragenVan(t, 3).filter(q => q.t !== 'open'));
    voerUit({ id:'verrassing:' + d, soort:'verrassing', vak:'alle', titel:'⚡ Verrassingstoets', vrij:true, vragen: schud(qs).slice(0, 10) });
  };
  el.append(b); lijst.prepend(el);
}

// --- Hulp: vraag + leerstof klaarzetten voor Gemini ---
let hulpVak = null;
function tekenHulp(){
  if (!hulpVak) { const laatst = T.filter(t => geleerd(t.id)).pop(); hulpVak = laatst ? laatst.vak : 'kf'; }
  $('hulpvakken').innerHTML = Object.entries(V).map(([k, v]) => `<button data-vak="${k}" class="${k === hulpVak ? 'aan' : ''}">${v.icoon} ${esc(v.kort)}</button>`).join('');
  $('hulpvakken').onclick = e => { const b = e.target.closest('button'); if (!b) return; hulpVak = b.dataset.vak; tekenHulp(); };
  const sel = $('hulp-ond'), ts = T.filter(t => t.vak === hulpVak);
  const kies = ts.filter(t => geleerd(t.id)).pop() || ts[0];
  sel.innerHTML = ts.map(t => `<option value="${t.id}" ${t === kies ? 'selected' : ''}>${esc(t.titel)}</option>`).join('');
  $('hulp-go').onclick = hulpKlaarzetten;
}
function hulpPrompt(t, vraag){
  if (!t) return `Je bent een geduldige bijlesleerkracht voor Eli. Hij is 13 jaar en zit in het 3de middelbaar Humane Wetenschappen in Vlaanderen. Leg in eenvoudig Nederlands, kort en stap voor stap, uit wat hij niet snapt, met een voorbeeld. Stel op het einde 1 korte controlevraag.\n\n${vraag}`;
  const stof = kaal(t.samenvatting.join(' \n ')).slice(0, 4000);
  return `Je bent een geduldige bijlesleerkracht voor Eli. Hij is 13 jaar en zit in het 3de middelbaar Humane Wetenschappen in Vlaanderen. Binnenkort heeft hij een examen ${VAKZIN[t.vak] || ''}.

Leg in eenvoudig Nederlands uit wat hij niet snapt:
- kort en stap voor stap, met een voorbeeld uit het dagelijks leven;
- gebruik de leerstof hieronder uit zijn cursus; staat iets er niet in, zeg dat dan;
- stel op het einde 1 korte controlevraag en wacht op zijn antwoord.

Onderwerp: ${kaal(t.titel)}

Leerstof uit zijn cursus:
${stof}

Eli's vraag: ${vraag}`;
}
async function hulpKlaarzetten(){
  const t = TOPIC[$('hulp-ond').value], vraag = $('hulp-tx').value.trim();
  if (!t) return;
  if (vraag.length < 5) { $('hulp-fb').innerHTML = '<p class="klein" style="color:#d33">Schrijf eerst wat je niet snapt. 🙂</p>'; $('hulp-tx').focus(); return; }
  const tekst = hulpPrompt(t, vraag);
  let gekopieerd = false;
  try { await navigator.clipboard.writeText(tekst); gekopieerd = true; } catch {}
  window.open('https://gemini.google.com/app', '_blank', 'noopener');
  $('hulp-fb').innerHTML = gekopieerd
    ? '<div class="lp-tip" style="margin-top:12px">✅ Gekopieerd! Gemini gaat open in een nieuw tabblad. Klik daar in het tekstvak en <b>plak</b> (Ctrl + V), dan Enter.</div>'
    : '<div class="lp-tip" style="margin-top:12px">Kopiëren lukte niet automatisch. Selecteer de tekst hieronder, kopieer hem en plak hem in Gemini.</div><textarea readonly rows="8" style="width:100%;margin-top:8px" id="hulp-kopie"></textarea>';
  if (!gekopieerd) { $('hulp-kopie').value = tekst; $('hulp-kopie').select(); }
  try { lokaal.set('hulp-' + vandaag(), (lokaal.get('hulp-' + vandaag(), 0) || 0) + 1); } catch {}
}

// Knop tijdens de oefeningen: de oefening van nu + de leerstof naar Gemini.
$('taak-hulp').onclick = async () => {
  const box = $('taakinhoud');
  const tid = lopend && lopend.it && lopend.it.onderwerp;
  const t = tid ? TOPIC[tid] : null;
  const nu = (box.innerText || '').replace(/\n{2,}/g, '\n').trim().slice(0, 900);
  const tekst = hulpPrompt(t, 'Eli zit vast bij deze oefening en snapt het niet. Leg uit hoe hij het moet aanpakken (geef niet meteen alleen het antwoord):\n---\n' + nu + '\n---');
  let ok = false; try { await navigator.clipboard.writeText(tekst); ok = true; } catch {}
  window.open('https://gemini.google.com/app', '_blank', 'noopener');
  toast(ok ? '📋 Gekopieerd! Plak het in Gemini (Ctrl + V). Je oefening blijft hier openstaan.' : 'Kopiëren lukte niet. Gebruik de Hulp-tab.');
};

let vrijVak = 'kf';
// Examendoelen per vak (doelen.js): wat moet ik kennen, op 3 niveaus, met links naar de lessen.
let doelenOpen = false;
function doelenKaart(vak){
  const D = (window.ELI_DOELEN || {})[vak] || [];
  const kan = lokaal.get('doelen-kan', {});
  const el = document.createElement('details'); el.className = 'doelen'; el.style.setProperty('--vk', vk(vak)); el.open = doelenOpen;
  el.ontoggle = () => { doelenOpen = el.open; };
  const ok = D.filter((d, i) => kan[vak + i]).length;
  el.innerHTML = `<summary><span class="ic">🎯</span><span class="tx"><b>Wat moet ik kennen voor het examen?</b><span>${D.length} doelen van je leerkracht · ${ok} afgevinkt</span></span><span class="pijl">▾</span></summary>`;
  const NIV = ['✓ Check', '✓✓ Double check', '✓✓✓ Triple check'];
  D.forEach((d, i) => {
    const r = document.createElement('div'); r.className = 'doel' + (d.mist ? ' mist' : '') + (kan[vak + i] ? ' kan' : '');
    const niv = d.n.map((t, j) => t ? `<li><i>${NIV[j]}</i>${esc(t)}</li>` : '').join('');
    r.innerHTML = `<div class="doelkop"><b>${esc(d.d)}</b>${d.mist ? '<span class="tag">📭 komt nog</span>' : ''}</div><ul>${niv}</ul>${d.tip ? `<p class="klein muted">💡 ${esc(d.tip)}</p>` : ''}`;
    const knoppen = document.createElement('div'); knoppen.className = 'doelknoppen';
    for (const tid of d.t) {
      const t = T.find(x => x.id === tid); if (!t) continue;
      const b = document.createElement('button'); b.className = 'knop licht klein'; b.textContent = '📖 ' + t.titel;
      b.onclick = () => voerUit({ id:'vrij:lees:' + t.id, soort:'vrij-lees', vak:t.vak, onderwerp:t.id, titel:t.titel, vrij:true });
      knoppen.append(b);
    }
    if (!d.mist) {
      const v = document.createElement('button'); v.className = 'knop klein vink'; v.textContent = kan[vak + i] ? '👍 Ik kan dit' : 'Ik kan dit?';
      v.onclick = () => { const k = lokaal.get('doelen-kan', {}); k[vak + i] = !k[vak + i]; lokaal.set('doelen-kan', k); tekenVakken(); };
      knoppen.append(v);
    }
    r.append(knoppen); el.append(r);
  });
  return el;
}

function tekenVakken(){
  $('vaktabs').innerHTML = Object.entries(V).map(([k, v]) => `<button data-vak="${k}" class="${k === vrijVak ? 'aan' : ''}">${v.icoon} ${esc(v.kort)}</button>`).join('');
  $('vaktabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; vrijVak = b.dataset.vak; tekenVakken(); };
  const lijst = $('onderwerplijst'); lijst.innerHTML = '';
  lijst.append(doelenKaart(vrijVak));
  { const f = VAKVORM[vrijVak];
    const el = document.createElement('div'); el.className = 'taak'; el.style.setProperty('--vk', vk(vrijVak));
    el.innerHTML = `<div class="ic">${f.ic}</div><div class="tx"><b>${f.titel}</b><span>${f.uitleg}</span></div>`;
    const b = document.createElement('button'); b.className = 'knop klein'; b.textContent = 'Start';
    b.onclick = () => voerUit({ id:'vrij:vakvorm:' + vrijVak, soort:'vakvorm', vak:vrijVak, titel:f.ic + ' ' + f.titel, vrij:true });
    el.append(b); lijst.append(el); }
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
    el.style.flexWrap = 'wrap'; const rij = document.createElement('div'); rij.className = 'rij'; rij.style.cssText = 'flex-wrap:wrap;width:100%;justify-content:flex-end;gap:6px';
    const vormen = [['📖', 'lees'], ['🃏', 'kaartjes'], ['🔗', 'koppel'], ['⏱️', 'race'], ['❓', 'quiz']];
    if (FOTO.some(f => f.tid === t.id)) vormen.splice(4, 0, ['📸', 'foto']);
    for (const [lbl, soort] of vormen) {
      const b = document.createElement('button'); b.className = 'knop licht klein'; b.textContent = lbl; b.title = { lees:'Leerkaart', kaartjes:'Kaartjes', koppel:'Koppelen', race:'Tijdrace (60 s)', foto:'Fotoronde', quiz:'Quiz' }[soort];
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
let hartslagT = null, klokT = null;
// Live klok: hoelang Eli vandaag al bezig is, op de seconde. Telt alleen als hij actief is (zelfde regels als de minuten).
const klokTekst = s => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
function startKlok(){
  clearInterval(klokT);
  const sleutel = 'klok-' + vandaag();
  S.klokSec = Math.max(Number(lokaal.get(sleutel, 0)) || 0, minutenVandaag() * 60);
  const toon = () => document.querySelectorAll('.liveklok').forEach(el => el.textContent = klokTekst(S.klokSec));
  toon();
  klokT = setInterval(() => {
    if (document.hidden || S.pauze || Date.now() - S.actief > 120000) return;
    S.klokSec++; toon();
    if (S.klokSec % 5 === 0) lokaal.set(sleutel, S.klokSec);
  }, 1000);
}
function hartslag(){
  startKlok();
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
  try { await rpc('eli_log', { p_naam: S.naam, p_pin: S.pin, p_soort: soort, p_vak: vak || null, p_onderwerp: onderwerp || null, p_score: Math.round(score ?? 0), p_totaal: Math.round(totaal ?? 0), p_xp: Math.max(0, Math.min(500, Math.round(xp || 0))), p_detail: detail || {} }); }
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
  if (soort === 'vector') {
    const g = () => Math.round(r(-9, 9)), co = (x, y) => `(${x} ; ${y})`, ant = (x, y) => [`(${x};${y})`];
    const keuze = Math.floor(Math.random() * 4);
    const xa = g(), ya = g(), xb = g(), yb = g();
    if (keuze === 0) return { t:'invul', v:`A${co(xa, ya)} en B${co(xb, yb)}. Bereken co(AB). <span class="muted">Schrijf zo: (x;y)</span>`, a: ant(xb - xa, yb - ya), tid:t.id, vak:'wet', u:`co(AB) = co(B) − co(A) = (${xb} − ${xa < 0 ? '(' + xa + ')' : xa} ; ${yb} − ${ya < 0 ? '(' + ya + ')' : ya}) = ${co(xb - xa, yb - ya)}` };
    if (keuze === 1) { const X = xb === xa && yb === ya ? xb + 3 : xb, dx = X - xa, dy = yb - ya, nn = Math.sqrt(dx * dx + dy * dy);
      return { t:'getal', v:`A${co(xa, ya)} en B${co(X, yb)}. Bereken de norm ‖AB‖ (op 2 decimalen).`, a: nn, tol: .005, tid:t.id, vak:'wet', u:`‖AB‖ = √((${dx})² + (${dy})²) = √(${dx * dx} + ${dy * dy}) = √${dx * dx + dy * dy} ≈ ${getal(rond(nn, 3))}` }; }
    if (keuze === 2) { const plus = Math.random() < .5; return { t:'invul', v:`a${co(xa, ya)} en b${co(xb, yb)}. Bereken co(a ${plus ? '+' : '−'} b). <span class="muted">Schrijf zo: (x;y)</span>`, a: plus ? ant(xa + xb, ya + yb) : ant(xa - xb, ya - yb), tid:t.id, vak:'wet', u: plus ? 'Tel de coördinaten op: ' + co(xa + xb, ya + yb) : 'Trek de coördinaten af: ' + co(xa - xb, ya - yb) }; }
    const k = schud([-3, -2, 2, 3, 4])[0];
    return { t:'invul', v:`a${co(xa, ya)}. Bereken co(${k} · a). <span class="muted">Schrijf zo: (x;y)</span>`, a: ant(k * xa, k * ya), tid:t.id, vak:'wet', u:`Vermenigvuldig elke coördinaat met ${k}: ${co(k * xa, k * ya)}` };
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
  if (it.soort === 'leer') { stappen.push(['lees', t]); if (VOORBEELD[t.id]) stappen.push(['voorbeeld', t]); if (SNAP[t.id]) stappen.push(['uitleg', t]); const pr = parenVan([t]), v = vormVoor(t);
    // Geen kaartjes meer in de les: koppelen (telt mee voor de herhaalkaartjes) + een speciale vorm, daarna de quiz.
    if (pr.length >= 4) stappen.push(['koppel', pr, Math.min(3, Math.ceil(pr.length / 5))]); else stappen.push(['kaartjes', t.kaarten.map((_, i) => t.id + '-' + i)]);
    if (v) stappen.push(v); stappen.push(['quiz', vragenVan(t, Math.min(10, t.quiz.length + 2))]); }
  else if (it.soort === 'herhaal') {
    // Drie soorten herhaling die elkaar afwisselen (geen kaartjes, de quiz blijft).
    const v = vormVoor(t), pr = parenVan([t]), keus = (Number(vandaag().slice(-2)) + T.indexOf(t)) % 3;
    if (pr.length < 4) stappen.push(['kaartjes', schud(t.kaarten.map((_, i) => t.id + '-' + i)).filter(id => !S.kaarten[id] || S.kaarten[id].d < 4).slice(0, 10)]);
    else if (keus === 0 && v) stappen.push(v);
    else if (keus === 1) stappen.push(['race', raceVragen([t]), t.id]);
    else stappen.push(['koppel', pr, 2]);
    stappen.push(['quiz', vragenVan(t, 8)]);
  }
  else if (it.soort === 'extra') { stappen.push(['lees', t]); if (VOORBEELD[t.id]) stappen.push(['voorbeeld', t]); if (SNAP[t.id]) stappen.push(['uitleg', t]); stappen.push(['quiz', vragenVan(t, 8)]); }
  else if (it.soort === 'overhoor') stappen.push(['overhoor', it]);
  else if (it.soort === 'kaarten') stappen.push(['kaartjes', kaartenVanDag(), true]);
  else if (it.soort === 'proef') {
    const ts = T.filter(x => x.vak === it.vak);
    const zwak = new Set(zwakkeOnderwerpen(it.vak).map(z => z.id));
    let qs = [];
    for (const x of ts) qs = qs.concat(vragenVan(x, zwak.has(x.id) ? 4 : 3));
    const open = schud(ts.filter(x => SNAP[x.id])).slice(0, 3).map(x => ({ t:'open', v: SNAP[x.id].kern.v, m: SNAP[x.id].kern.m, k: SNAP[x.id].kern.k, tid: x.id, vak: x.vak }));
    stappen.push(['quiz', schud(qs.filter(q => q.t !== 'open')).slice(0, 17).concat(open), 'proef']);
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
  else if (it.soort === 'vrij-koppel') stappen.push(['koppel', parenVan([t]), 3]);
  else if (it.soort === 'vrij-race') stappen.push(['race', raceVragen([t]), t.id]);
  else if (it.soort === 'verrassing' || it.soort === 'fotoronde') stappen.push([it.soort === 'fotoronde' ? 'foto' : 'quiz', it.vragen]);
  else if (it.soort === 'vakvorm') { const s = VAKVORM[it.vak].soort; stappen.push(s === 'omzet' ? ['omzet', omzetVragen(12)] : [s]); }
  else if (it.soort === 'vrij-foto') stappen.push(['foto', fotoVragen([t])]);
  else if (it.soort === 'kennis') stappen.push(['kennis']);

  startTaak({ it, stappen, i: 0, resultaten: [] }, 0);
}

// Na het spelletje in de pauze ga je verder waar je was (de pagina laadt opnieuw).
const HERVAT = 'eli-hervat';
function bewaarHervat(){
  if (!lopend) return;
  const stappen = lopend.stappen.map(([s, d, x]) => [s, d && d.id && TOPIC[d.id] === d ? { tid: d.id } : d, x]);
  const st = { datum: vandaag(), tijd: Date.now(), it: lopend.it, stappen, i: lopend.i, resultaten: lopend.resultaten, xp: S.taakXP || 0, sub: lopend.subGet ? lopend.subGet() : null };
  try { localStorage.setItem(HERVAT, JSON.stringify(st)); } catch {}
}
function hervat(){
  let st = null;
  try { st = JSON.parse(localStorage.getItem(HERVAT)); localStorage.removeItem(HERVAT); } catch {}
  // Ook als het spel in een ander tabblad of venster eindigde: tot 20 minuten na de pauze ga je verder waar je was.
  if (!st || st.datum !== vandaag() || !st.it || !(Date.now() - (st.tijd || 0) < 20 * 60000)) return false;
  const stappen = st.stappen.map(([s, d, x]) => [s, d && d.tid ? TOPIC[d.tid] : d, x]);
  if (stappen.some(([s, d]) => ['lees','voorbeeld','uitleg'].includes(s) && !d)) return false;
  startTaak({ it: st.it, stappen, i: st.i, resultaten: st.resultaten || [], herstel: st.sub ? { ...st.sub, stap: st.i } : null }, st.xp);
  return true;
}
// Gebruik de bewaarde toestand van de stap waarin de pauze begon (maar één keer).
function neemHerstel(soort){
  const h = lopend && lopend.herstel;
  if (!h || h.soort !== soort || h.stap !== lopend.i) return null;
  lopend.herstel = null;
  return h;
}
function startTaak(l, xp){
  const it = l.it;
  lopend = l;
  S.taakXP = xp || 0;
  $('taak-xp').textContent = '+' + S.taakXP + ' XP';
  $('taak-titel').textContent = it.titel;
  $('taak').style.setProperty('--vk', vk(it.vak));
  $('thuis').hidden = true; document.querySelector('.veld').hidden = true; $('taak').hidden = false;
  scrollTo(0, 0);
  S.huidigVak = it.vak || 'alle';
  volgendeStap();
}
$('taak-terug').onclick = () => { bewaarKaarten(); lopend = null; S.proefStart = null; thuis(); };

function tekenStappen(){
  const namen = { lees:'📖 Leren', voorbeeld:'🧮 Voorbeeld', uitleg:'✍️ Zelf uitleggen', kaartjes:'🃏 Kaartjes', quiz:'❓ Quiz', kennis:'⭐ Je ploeg', overhoor:'🗣️ Uitleggen', koppel:'🔗 Koppelen', race:'⏱️ Tijdrace', letters:'🔤 Letterpuzzel', omzet:'🔁 Omzetten', foto:'📸 Foto\'s', sorteer:'🗂️ Sorteren', tijdlijn:'📅 Tijdlijn', foutzoek:'🔍 Fout zoeken' };
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
  else if (soort === 'voorbeeld') stapVoorbeeld(data, verder);
  else if (soort === 'uitleg') stapUitleg(data, verder);
  else if (soort === 'overhoor') stapOverhoor(data, verder);
  else if (soort === 'kaartjes') stapKaartjes(data, verder, extra);
  else if (soort === 'koppel') stapKoppel(data, verder, extra);
  else if (soort === 'race') stapRace(data, verder, extra);
  else if (soort === 'omzet' || soort === 'foto') stapQuiz(data, verder);
  else if (soort === 'letters') stapLetters(verder, data);
  else if (soort === 'sorteer') stapSorteer(verder, data);
  else if (soort === 'tijdlijn') stapTijdlijn(verder, data, extra);
  else if (soort === 'foutzoek') stapFoutZoek(verder, data, extra);
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
  tim: 'Ik ben de afleider. 😈 Ik gaf je net een PS3, een PS4 én een Xbox 360… Benieuwd of jij eerst je werk afmaakt. 🎮🤘',
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

// Bij een fout antwoord: het best passende stukje uit de les erbij.
const STOP = new Set('de het een en van in op is te dat die met voor zijn wat wie hoe welke waarom niet als er aan om bij of ook door naar dan je hij ze we wordt worden was uit tot over nog meer heeft hebben kan deze dit juist fout'.split(' '));
const woorden = x => String(x).replace(/<[^>]+>/g, ' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
function goedAntwoord(q){
  if (q.t === 'mc') return q.o[q.a || 0];
  if (q.t === 'volgorde') return q.o.join(' ');
  if (Array.isArray(q.a)) return q.a.join(' ');
  return typeof q.a === 'string' ? q.a : '';
}
function uitDeLes(q){
  if (q.u || q.pron || q.w) return '';
  const t = TOPIC[q.tid]; if (!t) return '';
  const zoek = woorden(q.v + ' ' + goedAntwoord(q) + ' ' + goedAntwoord(q));
  let best = null, bs = 0;
  for (const p of t.samenvatting) {
    const pw = new Set(woorden(p));
    let sc = 0; for (const w of zoek) if (pw.has(w) || [...pw].some(x => x.length > 4 && (x.startsWith(w.slice(0, 5)) && w.length > 4))) sc += w.length > 6 ? 2 : 1;
    if (sc > bs) { bs = sc; best = p; }
  }
  return bs >= 2 ? `<span class="uitdeles"><small>📖 Uit de les</small>${best}</span>` : '';
}

function stapLees(t, verder){
  const box = $('taakinhoud');
  const punten = t.samenvatting;
  let n = 0, laatst = Date.now();
  const vis = (window.ELI_VISUEEL || {})[t.id];
  box.innerHTML = `<div class="babbel" id="lees-pop"></div>${vis ? `<div class="visueel">${vis}</div>` : ''}<div class="bronnen">${t.bron.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">📄 ${esc(l)}</a>`).join('')}</div><div id="punten"></div><div class="onder"><button class="knop groot" id="lees-verder">Volgende punt ↓</button></div>`;
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

// --- Snap je het? Zelf uitleggen, uitgewerkte voorbeelden, uitleggen aan een supporter ---
const SNAP = window.ELI_SNAP || {};
const plat = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Welke kernwoorden staan in de tekst? k = ['a|b', ...]
function kernCheck(tekst, k){
  const x = plat(tekst);
  return (k || []).map(alt => {
    const opties = alt.split('|');
    const hit = opties.some(w => { const p = plat(w); return p.length <= 2 ? new RegExp('(^|[^a-z])' + p.replace(/[.*+?^${}()[\]\\]/g, '\\$&') + '([^a-z]|$)').test(x) : x.includes(p); });
    return { woord: opties[0], hit };
  });
}
const kernHtml = res => `<div class="kernw">${res.map(r => `<span class="${r.hit ? 'ja' : 'nee'}">${r.hit ? '✅' : '⬜'} ${esc(r.woord)}</span>`).join('')}</div>`;

function stapUitleg(t, verder){
  const s = SNAP[t.id]; if (!s) return verder();
  const box = $('taakinhoud');
  box.innerHTML = `<div class="babbel" id="ul-pop"></div><div class="kaart uitlegkaart"><div class="label">✍️ Leg het uit in je eigen woorden</div><h3 style="margin:6px 0 10px">${s.kern.v}</h3>
    <textarea id="ul-t" rows="5" maxlength="1200" placeholder="Schrijf alsof je het uitlegt aan een vriend. Zonder terug te kijken!"></textarea>
    <div class="rij" style="justify-content:space-between;margin-top:6px"><span class="muted klein" id="ul-n">Minstens 2 zinnen</span><button class="knop" id="ul-ok" disabled>Vergelijk met het modelantwoord</button></div><div id="ul-mod"></div></div>`;
  POP.babbel($('ul-pop'), 'Wie het kan uitleggen, snapt het echt. Probeer het eerst helemaal zelf. 💪', { vak: t.vak });
  const ta = $('ul-t'); setTimeout(() => ta.focus(), 50);
  ta.oninput = () => { const n = ta.value.trim().split(/\s+/).filter(Boolean).length; $('ul-ok').disabled = n < 8; $('ul-n').textContent = n < 8 ? `Nog ${8 - n} woorden…` : 'Klaar? Vergelijk maar!'; };
  $('ul-ok').onclick = () => {
    ta.disabled = true; $('ul-ok').hidden = true;
    const res = kernCheck(ta.value, s.kern.k), n = res.filter(r => r.hit).length;
    $('ul-mod').innerHTML = `<div class="feedback info">Modelantwoord<span>${s.kern.m}</span></div>
      <p class="label" style="margin:12px 0 4px">Kernwoorden in jouw uitleg: ${n} van ${res.length}</p>${kernHtml(res)}
      <p class="muted klein" style="margin-top:10px">Vergelijk eerlijk: had je de kern?</p>
      <div class="rij"><button class="knop" data-p="2">✅ Ja, helemaal</button><button class="knop goud" data-p="1">🤏 Deels</button><button class="knop licht" data-p="0">❌ Nog niet</button></div>`;
    $('ul-mod').querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
      const p = Number(b.dataset.p);
      $('ul-mod').querySelectorAll('[data-p]').forEach(x => x.disabled = true);
      logResultaat('uitleg', t.vak, t.id, p, 2, 0, { vraag: s.kern.v.replace(/<[^>]+>/g, ''), tekst: ta.value.trim().slice(0, 1200), kern: n, van: res.length });
      const r = (S.stand.onderwerpen[t.id] = S.stand.onderwerpen[t.id] || { s:0, t:0 }); r.s += p / 2; r.t += 1;
      geefXP(p === 2 ? 15 : 10, b);
      const nog = document.createElement('div'); nog.className = 'onder';
      if (p < 2) nog.insertAdjacentHTML('beforeend', `<p class="muted klein" style="flex:1 1 100%">Lees het modelantwoord nog eens hardop. ${p === 0 ? 'Dit onderwerp komt extra terug.' : ''}</p>`);
      const k = document.createElement('button'); k.className = 'knop groot'; k.textContent = 'Verder →'; k.onclick = () => verder({ soort:'uitleg', score:p });
      nog.append(k); $('ul-mod').append(nog); k.scrollIntoView({ block:'nearest', behavior:'smooth' });
    });
  };
}

// Uitgewerkte voorbeelden voor de rekenonderwerpen. Een generator geeft een opgave met stappen.
const kies = l => l[Math.floor(Math.random() * l.length)];
const VOORBEELD = {
  W6: vast => {
    const k = vast ? 40 : kies([20, 25, 40, 50, 80, 120, 150]), cm = vast ? 5.0 : kies([2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 12]);
    const F = k * cm / 100;
    return { opgave:`Een veer met veerconstante <b>k = ${k} N/m</b> wordt <b>${getal(cm.toFixed(1))} cm</b> uitgerekt. Hoe groot is de veerkracht F<sub>v</sub>?`, stappen:[
      { label:'Gegeven', v:'Wat is gegeven en wat wordt gevraagd?', uit:`k = ${k} N/m · Δl = ${getal(cm.toFixed(1))} cm · gevraagd: F<sub>v</sub>`, q:{ t:'mc', v:'Wat wordt gevraagd?', o:['De veerkracht F<sub>v</sub>','De veerconstante k','De uitrekking Δl'].map(x => x.replace(/<[^>]+>/g, '')), a:0 } },
      { label:'Formule', v:'Welke formule heb je nodig?', uit:'F<sub>v</sub> = k · Δl (wet van Hooke)', q:{ t:'mc', v:'Welke formule?', o:['Fv = k · Δl','Fv = k / Δl','Fv = Δl / k'], a:0 } },
      { label:'Eenheden', v:'Zet Δl om naar meter.', uit:`${getal(cm.toFixed(1))} cm = ${getal(cm / 100)} m (cm → m: delen door 100)`, q:{ t:'getal', v:`${getal(cm.toFixed(1))} cm = … m`, a: cm / 100, tol:.001 }, hint:'1 cm = 0,01 m. Deel door 100.' },
      { label:'Oplossing', v:'Vul in en reken uit.', uit:`F<sub>v</sub> = ${k} · ${getal(cm / 100)} = <b>${getal(rond(F, 3))} N</b>`, q:{ t:'getal', v:`F<sub>v</sub> = ${k} · ${getal(cm / 100)} = … N`, a: F, tol:.012 }, hint:'Vermenigvuldig k met Δl in meter.' },
    ] };
  },
  W5: vast => {
    const g = vast ? 750 : kies([250, 400, 500, 650, 750, 1200, 1500, 2500]);
    const F = g / 1000 * 9.81;
    return { opgave:`Een voetbal(tas) heeft een massa van <b>${g} g</b>. Bereken de zwaartekracht op aarde (g = 9,81 N/kg).`, stappen:[
      { label:'Gegeven', v:'Wat is gegeven?', uit:`m = ${g} g · g = 9,81 N/kg · gevraagd: F<sub>z</sub>`, q:{ t:'mc', v:'Wat is hier "g = 9,81 N/kg"?', o:['De zwaarteveldsterkte','De massa','Het gewicht'], a:0 } },
      { label:'Formule', v:'Welke formule?', uit:'F<sub>z</sub> = m · g', q:{ t:'mc', v:'Welke formule?', o:['Fz = m · g','Fz = m / g','Fz = g / m'], a:0 } },
      { label:'Eenheden', v:'Massa in kg zetten.', uit:`${g} g = ${getal(g / 1000)} kg (delen door 1000)`, q:{ t:'getal', v:`${g} g = … kg`, a: g / 1000, tol:.001 }, hint:'1 kg = 1000 g. Deel door 1000.' },
      { label:'Oplossing', v:'Invullen en uitrekenen.', uit:`F<sub>z</sub> = ${getal(g / 1000)} · 9,81 = <b>${getal(rond(F, 3))} N</b>`, q:{ t:'getal', v:`F<sub>z</sub> = ${getal(g / 1000)} · 9,81 = … N`, a: F, tol:.012 }, hint:'Massa in kg maal 9,81.' },
    ] };
  },
  W2: vast => {
    const [van, naar, n] = vast ? [['k', 3], ['m', -3], 4] : [kies([['k', 3], ['M', 6], ['h', 2]]), kies([['m', -3], ['c', -2], ['d', -1], ['µ', -6]]), kies([2, 3, 5, 7, 8])];
    const eh = vast ? 'm' : kies(['m', 'g', 's']);
    const exp = van[1] - naar[1];
    return { opgave:`Zet om: <b>${n} ${van[0]}${eh}</b> = … ${naar[0]}${eh}`, stappen:[
      { label:'Stap 1', v:`Wat is de macht van 10 van "${van[0]}"?`, uit:`${van[0]} = 10<sup>${van[1]}</sup>`, q:{ t:'getal', v:`${van[0]} = 10 tot de macht …`, a: van[1], tol:0 }, hint:'Kijk naar de voorvoegsel-trap: kilo = 3, mega = 6, hecto = 2.' },
      { label:'Stap 2', v:`Wat is de macht van 10 van "${naar[0]}"?`, uit:`${naar[0]} = 10<sup>${naar[1]}</sup>`, q:{ t:'getal', v:`${naar[0]} = 10 tot de macht … (negatief? typ -)`, a: naar[1], tol:0 }, hint:'Onder de basis zijn de machten negatief: deci -1, centi -2, milli -3, micro -6.' },
      { label:'Stap 3', v:'Verschil van de exponenten = hoeveel keer × 10?', uit:`${van[1]} − (${naar[1]}) = ${exp} → × 10<sup>${exp}</sup>`, q:{ t:'getal', v:`${van[1]} − (${naar[1]}) = …`, a: exp, tol:0 }, hint:'Min een negatief getal = plus.' },
      { label:'Oplossing', v:'Schrijf het resultaat.', uit:`${n} ${van[0]}${eh} = <b>${n}·10<sup>${exp}</sup> ${naar[0]}${eh}</b>`, q:{ t:'getal', v:`${n} ${van[0]}${eh} = … ${naar[0]}${eh} (bv. ${n}e${exp})`, a: n * 10 ** exp, tol:.001 }, hint:`Typ ${n}e${exp} of ${n}·10^${exp}.` },
    ] };
  },
  W3: vast => {
    const [a, ab] = vast ? ['2,50', 3] : kies([['2,50', 3], ['4,0', 2], ['1,25', 3], ['0,80', 2], ['12,0', 3]]);
    const [b, bb] = vast ? ['1,2', 2] : kies([['1,2', 2], ['3,456', 4], ['0,5', 1], ['2,00', 3], ['7,5', 2]]);
    const x = Number(a.replace(',', '.')) * Number(b.replace(',', '.')), bc = Math.min(ab, bb);
    return { opgave:`Een tegel is <b>${a} m</b> lang en <b>${b} m</b> breed. Bereken de oppervlakte met het juiste aantal BC.`, stappen:[
      { label:'BC 1', v:`Hoeveel beduidende cijfers heeft ${a}?`, uit:`${a} heeft ${ab} BC`, q:{ t:'getal', v:`${a} → … BC`, a: ab, tol:0 }, hint:'Nullen vooraan tellen niet, nullen achteraan na de komma wel.' },
      { label:'BC 2', v:`Hoeveel beduidende cijfers heeft ${b}?`, uit:`${b} heeft ${bb} BC`, q:{ t:'getal', v:`${b} → … BC`, a: bb, tol:0 }, hint:'Tel vanaf het eerste cijfer dat geen 0 is.' },
      { label:'Regel', v:'Vermenigvuldigen: hoeveel BC krijgt de uitkomst?', uit:`Het minste: ${bc} BC`, q:{ t:'getal', v:'De uitkomst krijgt … BC', a: bc, tol:0 }, hint:'Bij vermenigvuldigen en delen: evenveel als het minste.' },
      { label:'Oplossing', v:'Reken uit en rond af.', uit:`${a} · ${b} = ${getal(Number(x.toFixed(6)))} → <b>${getal(rond(x, bc))} m²</b>`, q:{ t:'getal', v:`${a} · ${b} = … m² (afgerond op ${bc} BC)`, a: rond(x, bc), tol:.0001 }, hint:`Reken uit, rond dan af op ${bc} beduidende cijfers.` },
    ] };
  },
  W4: vast => {
    const f1 = vast ? 50 : kies([20, 30, 45, 60, 80]), f2 = vast ? 30 : kies([10, 15, 25, 35]), zelf = vast ? false : Math.random() < .5;
    const r = zelf ? f1 + f2 : f1 - f2;
    return { opgave:`Op een kar werken 2 horizontale krachten: <b>${f1} N naar rechts</b> en <b>${f2} N naar ${zelf ? 'rechts' : 'links'}</b>. Hoe groot is de resulterende kracht en wat is de zin?`, stappen:[
      { label:'Zin', v:'Hebben de krachten dezelfde of een tegengestelde zin?', uit: zelf ? 'Dezelfde zin → optellen' : 'Tegengestelde zin → aftrekken', q:{ t:'mc', v:'Wat doe je?', o:['Optellen','Aftrekken'], a: zelf ? 0 : 1 } },
      { label:'Grootte', v:'Bereken de grootte.', uit:`${f1} ${zelf ? '+' : '−'} ${f2} = <b>${r} N</b>`, q:{ t:'getal', v:`F<sub>R</sub> = … N`, a: r, tol:0 }, hint: zelf ? 'Zelfde zin: tel op.' : 'Tegengestelde zin: grootste min kleinste.' },
      { label:'Zin', v:'In welke zin wijst de resultante?', uit:'Naar rechts (de zin van de grootste kracht)', q:{ t:'mc', v:'Zin van de resultante?', o:['Naar rechts','Naar links'], a:0 }, hint:'De resultante wijst in de zin van de grootste kracht.' },
    ] };
  },
};
function stapVoorbeeld(t, verder){
  const gen = VOORBEELD[t.id]; if (!gen) return verder();
  const box = $('taakinhoud');
  const vb = gen(true);
  let n = 0;
  box.innerHTML = `<div class="babbel" id="vb-pop"></div><div class="kaart"><div class="label">🧮 Uitgewerkt voorbeeld</div><p style="margin:6px 0 10px">${vb.opgave}</p><div id="vb-st"></div><div class="onder"><button class="knop groot" id="vb-v">Toon stap 1</button></div></div>`;
  POP.babbel($('vb-pop'), 'Eerst kijken hoe het moet, stap voor stap. Zo doe je het ook op je examen!', { vak: t.vak });
  const knop = $('vb-v');
  knop.onclick = () => {
    if (n < vb.stappen.length) {
      const s = vb.stappen[n++];
      $('vb-st').insertAdjacentHTML('beforeend', `<div class="vb-stap"><span class="vb-n">${n}</span><div><b>${s.label}</b><small>${s.v}</small><div>${s.uit}</div></div></div>`);
      knop.textContent = n < vb.stappen.length ? `Toon stap ${n + 1}` : 'Nu jij! ✏️';
      return;
    }
    oefen(1);
  };
  // Oefening 1 met hulp (stap per stap), oefening 2 zonder hulp.
  const oefen = nr => {
    const o = gen(false), metHulp = nr === 1;
    let k = metHulp ? 0 : o.stappen.length - 1, fouten = 0;
    box.innerHTML = `<div class="kaart"><div class="label">${metHulp ? '✏️ Nu jij, met hulp per stap' : '🎯 En nu helemaal zelf'}</div><p style="margin:6px 0 10px">${o.opgave}</p><div id="vb-st"></div><div id="vb-q"></div></div>`;
    const volgende = () => {
      if (k >= o.stappen.length) {
        const eind = document.createElement('div'); eind.className = 'onder';
        const b = document.createElement('button'); b.className = 'knop groot'; b.textContent = metHulp ? 'Nog eentje, zonder hulp →' : 'Verder →';
        b.onclick = () => metHulp ? oefen(2) : verder({ soort:'voorbeeld' });
        eind.append(b); $('vb-q').innerHTML = ''; $('vb-q').append(eind); b.focus(); return;
      }
      const s = o.stappen[k];
      $('vb-q').innerHTML = `<div class="vb-vraag"><b>${metHulp ? `Stap ${k + 1}: ${s.label}` : 'Eindantwoord'}</b> <span class="muted klein">${metHulp ? s.v : ''}</span><p style="margin:6px 0">${s.q.v}</p><div id="ant"></div><div id="fb"></div>${s.hint ? '<button class="link klein" id="vb-h">💡 Hint</button>' : ''}</div>`;
      if (s.hint) $('vb-h').onclick = () => { $('vb-h').outerHTML = `<p class="muted klein">💡 ${s.hint}</p>`; };
      tekenAntwoord(s.q, pt => {
        const fb = $('fb'); const h = $('vb-h'); if (h) h.remove();
        if (pt >= 1) {
          fb.className = 'feedback goed'; fb.innerHTML = 'Juist! ✓'; geefXP(3, fb); piep('goed');
          setTimeout(() => { $('vb-st').insertAdjacentHTML('beforeend', `<div class="vb-stap"><span class="vb-n">✓</span><div><b>${s.label}</b><div>${s.uit}</div></div></div>`); k++; volgende(); }, 700);
        } else {
          fouten++; piep('fout');
          fb.className = 'feedback fout'; fb.innerHTML = `Nog niet.<span>Zo moest het: ${s.uit}</span>${!metHulp ? `<span>Tip: doe het stap voor stap: ${o.stappen.slice(0, -1).map(x => x.label.toLowerCase()).join(' → ')}.</span>` : ''}`;
          const b = document.createElement('button'); b.className = 'knop'; b.textContent = 'Begrepen, verder →'; b.style.marginTop = '8px';
          b.onclick = () => { $('vb-st').insertAdjacentHTML('beforeend', `<div class="vb-stap fout"><span class="vb-n">!</span><div><b>${s.label}</b><div>${s.uit}</div></div></div>`); k++; volgende(); };
          fb.after(b);
        }
      });
    };
    volgende();
  };
}

// Uitleggen aan een supporter (zelfde 3 vragen als op de supporterspagina).
function stapOverhoor(it, verder){
  const box = $('taakinhoud');
  const vragen = window.ELI_OVERHOOR(vandaag(), S.stand, P);
  const wie = POP.kring();
  box.innerHTML = `<div class="babbel" id="oh-pop"></div><div class="kaart"><div class="label">🗣️ Leg het uit aan een supporter</div>
    <p style="margin:6px 0 10px">Ga naar mama, papa of iemand anders van je ploeg (of bel ze op). Zij stellen je deze 3 vragen. <b>Zij zien de antwoorden op hun eigen pagina</b>, jij niet!</p>
    <ol class="oh-lijst">${vragen.map(q => `<li>${q.v}</li>`).join('')}</ol>
    <p class="label" style="margin-top:14px">Aan wie heb je het uitgelegd?</p><div class="rij" id="oh-wie">${['mama','papa','boeboe','moemoe','iemand anders'].map(n => `<button class="knop licht" data-w="${n}">${n === 'boeboe' ? 'Boeboe' : n === 'moemoe' ? 'Moemoe' : n[0].toUpperCase() + n.slice(1)}</button>`).join('')}</div>
    <p class="label" style="margin-top:14px">Hoeveel wist je goed uit te leggen?</p><div class="rij" id="oh-score">${[0, 1, 2, 3].map(n => `<button class="knop licht" data-s="${n}">${n} / 3</button>`).join('')}</div>
    <div class="onder"><button class="knop groot" id="oh-ok" disabled>Klaar ✓</button></div></div>`;
  POP.babbel($('oh-pop'), 'Wie het kan uitleggen aan een ander, snapt het echt. En wij leren mee! 💛', { figuur: wie || undefined });
  let w = null, sc = null;
  const zet = () => $('oh-ok').disabled = w === null || sc === null;
  $('oh-wie').onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; w = b.dataset.w; $('oh-wie').querySelectorAll('button').forEach(x => x.className = 'knop ' + (x === b ? '' : 'licht')); zet(); };
  $('oh-score').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; sc = Number(b.dataset.s); $('oh-score').querySelectorAll('button').forEach(x => x.className = 'knop ' + (x === b ? '' : 'licht')); zet(); };
  $('oh-ok').onclick = () => {
    $('oh-ok').disabled = true;
    logResultaat('overhoor', null, null, sc, 3, 0, { wie: w, vragen: vragen.map(q => q.v.replace(/<[^>]+>/g, '')) });
    for (const q of vragen) if (q.tid && sc < 3) { const r = (S.stand.onderwerpen[q.tid] = S.stand.onderwerpen[q.tid] || { s:0, t:0 }); r.s += sc / 3; r.t += 1; }
    geefXP(10 + sc * 5, $('oh-ok'));
    verder({ soort:'kaartjes', goed: sc, totaal: 3 });
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
  const h = neemHerstel('kaartjes');
  const rij = h ? h.rij : schud(ids).map(id => ({ id, poging: 0 }));
  const totaal = h ? h.totaal : rij.length; let goedEerst = h ? h.goedEerst : 0, gedaan = h ? h.gedaan : 0;
  const eerste = new Set(h ? h.eerste : []);
  lopend.subGet = () => ({ soort:'kaartjes', rij, totaal, goedEerst, gedaan, eerste: [...eerste] });
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
// --- Nieuwe leervormen: koppelen en tijdrace ---
const kaal = h => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// Paren uit de kaartjes van één of meer onderwerpen (korte, duidelijke paren).
function parenVan(ts){
  const p = [];
  for (const t of ts) t.kaarten.forEach(([v, a], i) => { const x = kaal(v), y = kaal(a); if (x && y && x.length <= 80 && y.length <= 90) p.push([x, y, t.vak, t.id + '-' + i]); });
  // Elk antwoord maar één keer, en van woordkaartjes in 2 richtingen enkel de eerste richting.
  const antw = new Set(), vraag = new Set();
  return schud(p.filter(([x, y]) => { const a = y.toLowerCase(), v = x.toLowerCase(); if (antw.has(a) || antw.has(v) || vraag.has(a)) return false; antw.add(a); vraag.add(v); return true; }));
}
// --- Fotoronde: kijk naar de foto en kies het juiste antwoord ---
const FOTO = window.ELI_FOTO || [];
const fotoTag = q => q.img ? `<img class="fotovraag" src="foto/${q.img}.webp" alt="" onerror="this.remove()">` : '';
function fotoVragen(ts){
  const ids = new Set(ts.map(t => t.id));
  return schud(FOTO.filter(f => ids.has(f.tid) && TOPIC[f.tid]).map(f => {
    const pool = f.o || [...new Set(FOTO.filter(g => g.v === f.v && g.a !== f.a).map(g => g.a))];
    const fout = schud(pool.filter(x => x !== f.a)).slice(0, 3);
    return { t:'mc', img: f.f, v: f.v, o: [f.a, ...fout], a: 0, tid: f.tid, vak: TOPIC[f.tid].vak };
  }));
}
function fotoronde(lijst){
  if (MEEKIJK) return;
  const qs = fotoVragen(T.filter(t => geleerd(t.id)));
  if (qs.length < 5) return;
  const el = document.createElement('div'); el.className = 'taak'; el.style.setProperty('--vk', '#7c4dff');
  el.innerHTML = `<div class="ic">📸</div><div class="tx"><b>Fotoronde</b><span>Kijk naar de foto en kies het juiste antwoord · ${Math.min(10, qs.length)} foto's · extra</span></div>`;
  const b = document.createElement('button'); b.className = 'knop klein licht'; b.textContent = 'Start';
  b.onclick = () => voerUit({ id:'vrij:fotoronde', soort:'fotoronde', vak:'alle', titel:'📸 Fotoronde', vrij:true, vragen: qs.slice(0, 10) });
  el.append(b); lijst.append(el);
}
// Vragen voor de tijdrace: meerkeuze en juist/fout uit de quiz, aangevuld met meerkeuze uit de kaartjes.
function raceVragen(ts){
  let qs = [];
  for (const t of ts) qs = qs.concat(vragenVan(t, 99).filter(q => q.t === 'mc' || q.t === 'jf'));
  qs = qs.concat(fotoVragen(ts));
  const p = []; for (const t of ts) for (const [x, y] of parenVan([t])) p.push([x, y, t]);
  for (const [x, y, t] of p) {
    const fout = schud(p.filter(z => z[1] !== y && z[2].vak === t.vak)).slice(0, 3).map(z => z[1]);
    if (fout.length === 3) qs.push({ t:'mc', v: x, o: [y, ...fout], a: 0, tid: t.id, vak: t.vak });
  }
  return schud(qs);
}
function stapKoppel(paren, verder, rondes){
  const box = $('taakinhoud');
  rondes = Math.max(1, Math.min(rondes || 2, Math.floor(paren.length / 4)));
  if (paren.length < 4) return verder();
  let ronde = 0, fout = 0, goed = 0;
  const t0 = Date.now();
  const speel = () => {
    const set = paren.slice(ronde * 5, ronde * 5 + 5);
    if (set.length < 3) return einde();
    balk((lopend.i + ronde / rondes) / lopend.stappen.length);
    const links = schud(set.map((p, i) => ({ i, tx: p[0] }))), rechts = schud(set.map((p, i) => ({ i, tx: p[1] })));
    box.innerHTML = `<div class="babbel" id="kpop"></div><div class="kaart koppelkaart"><div class="rij" style="justify-content:space-between"><span class="label">🔗 Koppelen · ronde ${ronde + 1} van ${rondes}</span><span class="pil" id="kp-st">0 / ${set.length}</span></div>
      <div class="koppel"><div class="kol" id="kl"></div><div class="kol" id="kr"></div></div></div>`;
    POP.babbel($('kpop'), ronde === 0 ? 'Tik links een begrip en rechts de uitleg die erbij hoort. Hoe minder fouten, hoe beter! 🔗' : 'Nog een ronde, kampioen!', { vak: set[0][2] });
    const maak = (lijst, kol, kant) => lijst.forEach(o => { const b = document.createElement('button'); b.className = 'kp ' + kant; b.textContent = o.tx; b.dataset.i = o.i; kol.append(b); });
    maak(links, $('kl'), 'l'); maak(rechts, $('kr'), 'r');
    let sel = null, af = 0; const misK = new Set();
    box.querySelector('.koppel').onclick = e => {
      const b = e.target.closest('.kp'); if (!b || b.disabled) return;
      if (b.classList.contains('l')) { box.querySelectorAll('.kp.l').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b; piep('klik'); return; }
      if (!sel) { b.classList.add('wiebel'); setTimeout(() => b.classList.remove('wiebel'), 400); return; }
      if (sel.dataset.i === b.dataset.i) {
        { const pr = set[Number(sel.dataset.i)]; if (pr[3] && !misK.has(sel.dataset.i)) kaartAntwoord(pr[3], true); }
        sel.classList.remove('sel'); sel.classList.add('ok'); b.classList.add('ok'); sel.disabled = b.disabled = true; sel = null; af++; goed++;
        $('kp-st').textContent = af + ' / ' + set.length; piep('goed');
        if (af === set.length) { geefXP(5, $('kp-st')); setTimeout(() => { ronde++; ronde < rondes ? speel() : einde(); }, 600); }
      } else { fout++; if (!misK.has(sel.dataset.i)) { misK.add(sel.dataset.i); const pr = set[Number(sel.dataset.i)]; if (pr[3]) kaartAntwoord(pr[3], false); } b.classList.add('mis'); sel.classList.add('mis'); const s2 = sel; setTimeout(() => { b.classList.remove('mis'); s2.classList.remove('mis'); }, 500); piep('fout'); }
    };
  };
  const einde = () => {
    const sec = Math.round((Date.now() - t0) / 1000);
    box.innerHTML = `<div class="kaart center" style="padding:22px"><div style="font-size:2.6rem">🔗</div><h2>${goed} paren gekoppeld</h2><p class="muted">${fout === 0 ? 'Zonder één fout! 🔥' : fout + ' keer mis'} · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</p><div class="onder" style="justify-content:center"><button class="knop groot" id="kpv">Verder →</button></div></div>`;
    if (fout === 0) confetti(1200);
    $('kpv').onclick = () => verder({ soort:'koppel', goed, fout });
  };
  speel();
}
// Tijdrace: zoveel mogelijk juist in 60 seconden (meerkeuze en juist/fout).
function stapRace(vragen, verder, sleutel){
  const box = $('taakinhoud');
  vragen = schud(vragen.filter(q => q && (q.t === 'mc' || q.t === 'jf')));
  if (vragen.length < 4) return verder();
  const DUUR = 60; let i = 0, goed = 0, fout = 0, eind = 0, tik = null;
  const best = Number(lokaal.get('race-' + sleutel, 0)) || 0;
  box.innerHTML = `<div class="babbel" id="rpop"></div><div class="kaart center" style="padding:22px"><div style="font-size:2.6rem">⏱️</div><h2>Tijdrace!</h2><p class="muted">60 seconden. Zoveel mogelijk juist. Een fout kost je 3 seconden.${best ? `<br>Jouw record: <b>${best}</b>` : ''}</p><div class="onder" style="justify-content:center"><button class="knop groot" id="rgo">Start! 🏁</button></div></div>`;
  POP.babbel($('rpop'), 'Klaar? Snel maar niet slordig! ⚡', { vak: vragen[0].vak });
  const klok = () => { const s = Math.max(0, Math.ceil((eind - Date.now()) / 1000)); const el = $('rk'); if (el) { el.textContent = s + 's'; el.classList.toggle('laat', s <= 10); } const bar = $('rbar'); if (bar) bar.style.width = (s / DUUR * 100) + '%'; if (s <= 0) einde(); };
  const toon = () => {
    if (i >= vragen.length) { vragen = vragen.concat(schud(vragen.slice())); }
    const q = vragen[i];
    box.innerHTML = `<div class="vraagkaart race" style="--vk:${vk(q.vak)}"><div class="rij" style="justify-content:space-between"><span class="label">⏱️ <b id="rk">${DUUR}s</b></span><span class="pil">✅ ${goed}</span></div><div class="racebalk"><i id="rbar"></i></div>${fotoTag(q)}<div class="vtekst" style="margin:10px 0">${q.v}</div><div id="ant"></div></div>`;
    klok();
    tekenAntwoord(q, pt => { if (pt >= 1) { goed++; piep('goed'); } else { fout++; eind -= 3000; piep('fout'); } i++; setTimeout(() => { if (Date.now() < eind) toon(); }, pt >= 1 ? 250 : 700); });
  };
  let klaar = false;
  const einde = () => {
    if (klaar) return; klaar = true; clearInterval(tik);
    const record = goed > best; if (record) lokaal.set('race-' + sleutel, goed);
    geefXP(Math.min(20, goed * 2));
    box.innerHTML = `<div class="kaart center" style="padding:22px"><div style="font-size:2.6rem">${record ? '🏆' : '🏁'}</div><h2>${goed} juist in 60 seconden</h2><p class="muted">${record ? 'Nieuw record!' : best ? 'Record: ' + best : ''}${fout ? ' · ' + fout + ' fout' : ''}</p><div class="onder" style="justify-content:center"><button class="knop groot" id="rv">Verder →</button></div></div>`;
    if (record) confetti(1500);
    $('rv').onclick = () => verder({ soort:'race', goed, fout });
  };
  $('rgo').onclick = () => { eind = Date.now() + DUUR * 1000; tik = setInterval(klok, 250); toon(); };
}

// Welke speciale vorm past bij dit onderwerp? (in de opdrachten van de dag, in plaats van een stuk quiz)
function vormVoor(t){
  const ids = T.filter(x => x.vak === t.vak && (geleerd(x.id) || x.id === t.id)).map(x => x.id);
  if (t.id === 'F1' || t.id === 'F7') return ['letters', 6];
  if (t.id === 'W2') return ['omzet', omzetVragen(6)];
  if (t.id === 'G2') return ['sorteer', 6];
  if (t.vak === 'cul' && window.ELI_TIJDLIJN.filter(x => ids.includes(x.tid)).length >= 5) return ['tijdlijn', 2, ids];
  if (t.vak === 'kf' && window.ELI_FOUT.filter(z => ids.includes(z[2])).length >= 3) return ['foutzoek', 5, ids];
  const f = fotoVragen([t]); if (f.length >= 4) return ['foto', f.slice(0, 6)];
  return null;
}
// --- Eén eigen leervorm per vak ---
const VAKVORM = {
  fr:  { soort:'letters', ic:'🔤', titel:'Letterpuzzel', uitleg:'Zet de letters van het Franse woord in de juiste volgorde' },
  wet: { soort:'omzet', ic:'🔁', titel:'Omzetmachine', uitleg:'Eenheden omzetten en machten van 10, telkens nieuwe opgaven' },
  gsw: { soort:'sorteer', ic:'🗂️', titel:'Sorteren', uitleg:'Steek elke situatie in het juiste bakje' },
  cul: { soort:'tijdlijn', ic:'📅', titel:'Tijdlijn', uitleg:'Zet de gebeurtenissen in de juiste volgorde' },
  kf:  { soort:'foutzoek', ic:'🔍', titel:'Fout zoeken', uitleg:'In elke zin staat één fout. Tik ze aan!' },
};
const eindKaart = (box, ic, titel, sub, cb) => {
  box.innerHTML = `<div class="kaart center" style="padding:22px"><div style="font-size:2.6rem">${ic}</div><h2>${titel}</h2><p class="muted">${sub}</p><div class="onder" style="justify-content:center"><button class="knop groot" id="vvv">Verder →</button></div></div>`;
  $('vvv').onclick = cb;
};
// Frans: letterpuzzel
function letterWoorden(){
  const bron = window.ELI_VOCAB || [];
  const gezien = new Set();
  return schud(bron.filter(([fr]) => {
    const m = fr.match(/^(un|une|le|la|les)\s+(\S+)$/i), woord = m ? m[2] : fr;
    return !/[\s\/…?!()']/.test(woord) && woord.length >= 3 && woord.length <= 11 && !gezien.has(fr) && gezien.add(fr);
  }));
}
function stapLetters(verder, max){
  const box = $('taakinhoud');
  const lijst = letterWoorden().slice(0, max || 8);
  if (lijst.length < 3) return verder();
  let n = 0, goed = 0, fout = 0;
  const volgende = () => {
    if (n >= lijst.length) return eindKaart(box, '🔤', `${goed} van ${lijst.length} woorden juist`, fout ? fout + ' keer mis getikt' : 'Zonder één fout! 🔥', () => verder({ soort:'letters', goed, fout }));
    balk((lopend.i + n / lijst.length) / lopend.stappen.length);
    const [fr, nl] = lijst[n];
    const m = fr.match(/^(un|une|le|la|les)\s+(.*)$/i);
    const lidw = m ? m[1] : '', woord = (m ? m[2] : fr);
    const letters = [...woord.replace(/\s/g, '')];
    let tegels = schud(letters.map((c, i) => ({ c, i })));
    if (letters.length > 2 && tegels.every((t, k) => t.i === k)) tegels = tegels.reverse();
    let pos = 0, misHier = 0;
    box.innerHTML = `<div class="kaart lp-puzzel" style="--vk:${vk('fr')}"><div class="rij" style="justify-content:space-between"><span class="label">🔤 Woord ${n + 1} van ${lijst.length}</span><span class="pil">✅ ${goed}</span></div>
      <p class="muted" style="margin:10px 0 4px">Hoe zeg je in het Frans:</p><h2 style="margin:0 0 12px">${esc(nl)}</h2>
      <div class="lpz-vak">${lidw ? `<span class="lpz-lw">${esc(lidw)}</span>` : ''}${letters.map(() => '<span class="lpz-plek"></span>').join('')}</div>
      <div class="lpz-tegels">${tegels.map((t, k) => `<button class="lpz-t" data-k="${k}">${esc(t.c)}</button>`).join('')}</div>
      <div class="onder"><button class="knop licht klein" id="lpz-hint">💡 Hint</button></div></div>`;
    const plekken = box.querySelectorAll('.lpz-plek');
    const zet = (c) => { plekken[pos].textContent = c; plekken[pos].classList.add('vol'); pos++; };
    const klaar = () => { if (pos < letters.length) return; if (misHier === 0) goed++; piep('goed'); geefXP(misHier ? 2 : 5); box.querySelector('.lpz-vak').classList.add('ok'); setTimeout(() => { n++; volgende(); }, 900); };
    box.querySelector('.lpz-tegels').onclick = e => {
      const b = e.target.closest('.lpz-t'); if (!b || b.disabled) return;
      const c = tegels[b.dataset.k].c;
      if (c.toLowerCase() === letters[pos].toLowerCase()) { b.disabled = true; zet(letters[pos]); piep('klik'); klaar(); }
      else { fout++; misHier++; b.classList.add('wiebel'); piep('fout'); setTimeout(() => b.classList.remove('wiebel'), 400); }
    };
    $('lpz-hint').onclick = () => {
      if (pos >= letters.length) return;
      const k = tegels.findIndex((t, k) => !box.querySelector(`.lpz-t[data-k="${k}"]`).disabled && t.c === letters[pos]);
      if (k < 0) return; misHier++; box.querySelector(`.lpz-t[data-k="${k}"]`).disabled = true; zet(letters[pos]); klaar();
    };
  };
  volgende();
}
// Wetenschappen: omzetmachine (nieuwe opgaven elke keer)
function omzetVragen(aantal){
  const VV = [['k', 3], ['h', 2], ['da', 1], ['', 0], ['d', -1], ['c', -2], ['m', -3]];
  const GROOT = [['G', 9], ['M', 6], ['k', 3], ['m', -3], ['µ', -6], ['n', -9]];
  const r = a => a[Math.floor(Math.random() * a.length)];
  const qs = [];
  while (qs.length < aantal) {
    const soort = qs.length % 3;
    if (soort < 2) {
      const e = r(['m', 'g', 'L']);
      let a = r(VV), b = r(VV); if (a === b || Math.abs(a[1] - b[1]) > 3) continue;
      const val = r([1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 25, 40, 1.5, 2.5, 7.5]);
      const ant = val * Math.pow(10, a[1] - b[1]);
      qs.push({ t:'getal', v:`🔁 Zet om: <b>${getal(val)} ${a[0]}${e} = … ${b[0]}${e}</b>`, a: Number(ant.toPrecision(10)), tol: 1e-9, tid:'W2', vak:'wet' });
    } else {
      const g = r(GROOT), e = r(['m', 's', 'g', 'A']); const val = r([2, 3, 5, 8]);
      qs.push({ t:'getal', v:`🔁 Vul de exponent in: <b>${val} ${g[0]}${e} = ${val} · 10<sup>?</sup> ${e}</b>`, a: g[1], tid:'W2', vak:'wet' });
    }
  }
  return qs;
}
// Gedrag: sorteren in bakjes
function stapSorteer(verder, max){
  const S0 = window.ELI_SORTEER; const box = $('taakinhoud');
  const items = schud(S0.items.slice()).slice(0, max || 10);
  let n = 0, goed = 0, fout = 0; const telling = {};
  const volgende = () => {
    if (n >= items.length) return eindKaart(box, '🗂️', `${goed} van ${items.length} juist gesorteerd`, goed === items.length ? 'Perfect! 🔥' : 'Kijk nog eens naar de fouten in de samenvatting.', () => verder({ soort:'sorteer', goed, fout }));
    balk((lopend.i + n / items.length) / lopend.stappen.length);
    const [tekst, juist] = items[n];
    box.innerHTML = `<div class="kaart" style="--vk:${vk('gsw')}"><div class="rij" style="justify-content:space-between"><span class="label">🗂️ Situatie ${n + 1} van ${items.length}</span><span class="pil">✅ ${goed}</span></div>
      <div class="srt-item">${esc(tekst)}</div><p class="muted klein center" style="margin:6px 0 10px">In welk bakje hoort dit?</p>
      <div class="srt-bakjes">${S0.bakjes.map(([k, l]) => `<button class="srt-bak" data-k="${k}"><b>${l}</b><small>${telling[k] || 0} erin</small></button>`).join('')}</div><div id="srt-fb"></div></div>`;
    box.querySelector('.srt-bakjes').onclick = e => {
      const b = e.target.closest('.srt-bak'); if (!b || box.querySelector('.srt-bak:disabled')) return;
      box.querySelectorAll('.srt-bak').forEach(x => { x.disabled = true; if (x.dataset.k === juist) x.classList.add('goed'); });
      if (b.dataset.k === juist) { goed++; telling[juist] = (telling[juist] || 0) + 1; piep('goed'); geefXP(3); setTimeout(() => { n++; volgende(); }, 700); }
      else { fout++; b.classList.add('fout'); piep('fout'); $('srt-fb').innerHTML = `<p class="muted center">Het juiste bakje is groen.</p><div class="onder" style="justify-content:center"><button class="knop" id="srt-v">Volgende →</button></div>`; $('srt-v').onclick = () => { n++; volgende(); }; }
    };
  };
  volgende();
}
// Cultuur: tijdlijn (tik van oud naar nieuw)
function stapTijdlijn(verder, rondes, ids){
  const box = $('taakinhoud'); const alle = window.ELI_TIJDLIJN.filter(x => !ids || ids.includes(x.tid));
  if (alle.length < 5) return verder();
  const RONDES = rondes || 3; let ronde = 0, goed = 0, fout = 0;
  const speel = () => {
    if (ronde >= RONDES) return eindKaart(box, '📅', `${goed} rondes zonder fout`, fout ? fout + ' keer mis getikt' : 'Alles meteen juist! 🔥', () => verder({ soort:'tijdlijn', goed, fout }));
    balk((lopend.i + ronde / RONDES) / lopend.stappen.length);
    const set = schud(schud(alle.slice()).slice(0, 5));
    const juist = set.slice().sort((a, b) => a.j - b.j);
    let pos = 0, misHier = 0;
    box.innerHTML = `<div class="kaart" style="--vk:${vk('cul')}"><div class="rij" style="justify-content:space-between"><span class="label">📅 Ronde ${ronde + 1} van ${RONDES}</span><span class="pil" id="tl-st">0 / 5</span></div>
      <p class="muted" style="margin:10px 0">Tik de gebeurtenissen aan van <b>oud</b> naar <b>nieuw</b>.</p><div class="tl-lijst">${set.map((x, k) => `<button class="tl-e" data-k="${k}"><span class="tl-nr"></span><span>${esc(x.e)}</span><small></small></button>`).join('')}</div></div>`;
    box.querySelector('.tl-lijst').onclick = e => {
      const b = e.target.closest('.tl-e'); if (!b || b.disabled) return;
      const x = set[b.dataset.k];
      if (x === juist[pos]) { b.disabled = true; b.classList.add('ok'); b.querySelector('.tl-nr').textContent = pos + 1; b.querySelector('small').textContent = x.t; pos++; $('tl-st').textContent = pos + ' / 5'; piep('klik');
        if (pos === 5) { if (!misHier) goed++; geefXP(misHier ? 3 : 8); piep('goed'); const lijst = box.querySelector('.tl-lijst'); juist.forEach(j => lijst.append(box.querySelector(`.tl-e[data-k="${set.indexOf(j)}"]`))); setTimeout(() => { const o = document.createElement('div'); o.className = 'onder'; o.innerHTML = '<button class="knop groot" id="tl-v">Verder →</button>'; box.querySelector('.kaart').append(o); $('tl-v').onclick = () => { ronde++; speel(); }; }, 300); }
      } else { fout++; misHier++; b.classList.add('wiebel'); piep('fout'); setTimeout(() => b.classList.remove('wiebel'), 400); }
    };
  };
  speel();
}
// K&F: fout zoeken (tik het foute woord)
function stapFoutZoek(verder, max, ids){
  const box = $('taakinhoud');
  const zinnen = schud(window.ELI_FOUT.filter(z => TOPIC[z[2]] && (!ids || ids.includes(z[2])))).slice(0, max || 8);
  if (zinnen.length < 3) return verder();
  let n = 0, goed = 0;
  const volgende = () => {
    if (n >= zinnen.length) return eindKaart(box, '🔍', `${goed} van ${zinnen.length} fouten meteen gevonden`, goed === zinnen.length ? 'Scherp! 🔥' : '', () => verder({ soort:'foutzoek', goed, fout: zinnen.length - goed }));
    balk((lopend.i + n / zinnen.length) / lopend.stappen.length);
    const [zin, uitleg] = zinnen[n];
    const m = zin.match(/^(.*)\[([^|]+)\|([^\]]+)\](.*)$/);
    const stukken = [...m[1].split(/\s+/).filter(Boolean).map(w => [w, false]), [m[2], true], ...m[4].split(/\s+/).filter(Boolean).map(w => [w, false])];
    // Leestekens aan het foute stuk blijven gewoon in de zin staan.
    box.innerHTML = `<div class="kaart" style="--vk:${vk('kf')}"><div class="rij" style="justify-content:space-between"><span class="label">🔍 Zin ${n + 1} van ${zinnen.length}</span><span class="pil">✅ ${goed}</span></div>
      <p class="muted" style="margin:10px 0">Eén woord klopt niet. Tik het aan!</p><div class="fz-zin">${stukken.map(([w], k) => /^[.,!?;:…]+$/.test(w) ? `<span>${esc(w)}</span>` : `<button class="fz-w" data-k="${k}">${esc(w)}</button>`).join(' ')}</div><div id="fz-fb"></div></div>`;
    let pogingen = 0;
    box.querySelector('.fz-zin').onclick = e => {
      const b = e.target.closest('.fz-w'); if (!b || box.querySelector('.fz-w.fout-g')) return;
      const k = Number(b.dataset.k);
      if (stukken[k][1]) {
        if (pogingen === 0) { goed++; geefXP(5); }
        b.classList.add('fout-g'); b.innerHTML = `<s>${esc(m[2])}</s> <b>${esc(m[3])}</b>`; piep('goed');
        $('fz-fb').innerHTML = `<div class="lp-tip" style="margin-top:12px">💡 ${esc(uitleg)}</div><div class="onder"><button class="knop groot" id="fz-v">Volgende →</button></div>`;
        $('fz-v').onclick = () => { n++; volgende(); };
      } else { pogingen++; b.classList.add('wiebel', 'mis'); piep('fout'); setTimeout(() => b.classList.remove('wiebel'), 400); }
    };
  };
  volgende();
}

function stapQuiz(vragen, verder, modus){
  const h = neemHerstel('quiz');
  vragen = h ? h.vragen : vragen.filter(Boolean);
  const box = $('taakinhoud');
  const totaal = h ? h.totaal : vragen.length;
  let i = h ? h.i : 0, score = h ? h.score : 0;
  const fouten = h ? h.fouten : [], perOnderwerp = h ? h.perOnderwerp : {};
  const opnieuw = h ? h.opnieuw : [];
  if (h && h.proefSec != null) S.proefStart = Date.now() - h.proefSec * 1000;
  lopend.subGet = () => ({ soort:'quiz', vragen, totaal, i, score, fouten, perOnderwerp, opnieuw, proefSec: S.proefStart ? Math.round((Date.now() - S.proefStart) / 1000) : null });
  const vragers = {};
  const vrager = vak => (vragers[vak] = vragers[vak] || POP.kies(vak, 'coach'));
  const toon = () => {
    if (i >= vragen.length) {
      if (opnieuw.length) { vragen.push(...opnieuw.splice(0).map(q => ({ ...q, herkans: true }))); }
      else return einde();
    }
    const q = vragen[i];
    if (modus === 'proef' && !S.proefStart) { S.proefStart = Date.now(); const iv = setInterval(() => { const el = $('pk-t'); if (!S.proefStart) return clearInterval(iv); if (!el) return; const sec = Math.round((Date.now() - S.proefStart) / 1000); el.textContent = ' · ⏱️ ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + ' / ' + P.PROEF_MIN + ' min'; el.classList.toggle('laat', sec > P.PROEF_MIN * 60); }, 500); }
    balk((lopend.i + Math.min(i, totaal) / totaal) / lopend.stappen.length);
    box.innerHTML = `<div class="vraagkaart" style="--vk:${vk(q.vak)}"><div class="rij" style="justify-content:space-between"><span class="label">${q.herkans ? '🔁 Nog eens' : `Vraag ${i + 1} van ${totaal}`}<span id="pk-t" class="pk"></span></span><span class="pil">${esc((V[q.vak] || {}).kort || '')}</span></div>${fotoTag(q)}<div class="babbel vraagbabbel" id="qpop"></div><div id="ant"></div><div id="fb"></div><div class="onder" id="qv"></div></div>`;
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
    fb.innerHTML = (goed ? lof[Math.floor(Math.random() * lof.length)] : half ? 'Bijna!' : 'Niet juist.') + (uitleg ? `<span>${uitleg}</span>` : '') + (q.u ? `<span>💡 ${q.u}</span>` : '') + (!goed ? uitDeLes(q) : '');
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
    const duur = S.proefStart ? Math.round((Date.now() - S.proefStart) / 60000) : null; S.proefStart = null;
    const nogNiet = modus === 'proef' ? entries.filter(([, o]) => o.s / o.t < .7).map(([tid]) => TOPIC[tid]).filter(Boolean) : [];
    const sterren = pct >= .95 ? 3 : pct >= .8 ? 2 : pct >= nodig ? 1 : 0;
    box.innerHTML = `<div class="kaart resultaat"><div class="sterren">${'⭐'.repeat(sterren)}${'☆'.repeat(3 - sterren)}</div><div class="groot">${Math.round(pct * 100)}%</div><p class="muted">${Math.round(score * 10) / 10} van ${totaal} juist bij de eerste poging</p><div class="babbel" id="rp" style="text-align:left"></div>${modus === 'proef' ? (nogNiet.length ? `<div class="foutlijst nognie"><div class="label" style="margin-bottom:6px">🎯 Dit zit nog niet goed (wordt extra ingepland)</div>${nogNiet.map(t => `<button class="link" data-herlees="${t.id}">📖 ${esc(t.titel)}</button>`).join('')}</div>` : '<p class="goed-tekst">🎯 Alle onderwerpen boven 70%. Klaar voor het examen!</p>') + (duur !== null ? `<p class="muted klein">⏱️ Je deed er ${duur} minuten over (examen-tempo: ${P.PROEF_MIN} min).</p>` : '') : ''}${fouten.length ? `<div class="foutlijst"><div class="label" style="margin-bottom:6px">Deze komen extra terug</div>${fouten.slice(0, 8).map(f => `<div>${esc(f)}</div>`).join('')}</div>` : ''}<div class="onder" style="justify-content:center" id="rk"></div></div>`;
    const timPest = gehaald && POP.tim() && Math.random() < .25;
    POP.babbel($('rp'), timPest ? 'Verdorie. Je liet je niet afleiden. 😤🎮' : gehaald ? (pct === 1 ? 'PERFECT! Dat is een hattrick! 🎩⚽' : 'Goed gedaan! Opdracht gehaald. 💪') : `Nog niet genoeg (nodig: ${Math.round(nodig * 100)}%). Geen probleem: <b>nog een keer</b>, nu met andere volgorde. Lees eerst even je fouten.`, timPest ? { figuur: POP.tim() } : gehaald ? (Math.random() < .5 ? { figuur: POP.kring() || undefined, eigen: true } : { vak: lopend.it.vak }) : { vak: lopend.it.vak });
    box.querySelectorAll('[data-herlees]').forEach(b => b.onclick = () => stapLees(TOPIC[b.dataset.herlees], () => verder({ soort:'quiz', score, totaal, gehaald })));
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
    const opties = schud(q.o.map((o, j) => ({ o, j, goed: j === (q.a || 0) })));
    ant.innerHTML = `<div class="opties">${opties.map((x, j) => `<button class="optie" data-j="${j}"><span class="lt">${'ABCD'[j] || j + 1}</span><span></span></button>`).join('')}</div>`;
    [...ant.querySelectorAll('.optie')].forEach((b, j) => {
      b.querySelector('span:last-child').textContent = opties[j].o;
      b.onclick = () => {
        ant.querySelectorAll('.optie').forEach((x, k) => { x.disabled = true; if (opties[k].goed) x.classList.add('goed'); });
        if (!opties[j].goed) b.classList.add('fout');
        done(opties[j].goed ? 1 : 0, opties[j].goed ? '' : 'Juist was: <b>' + esc(q.o[q.a || 0]) + '</b>' + (q.w && q.w[opties[j].j] ? `<span class="waaromniet">🤔 <b>Waarom niet "${esc(opties[j].o)}"?</b> ${q.w[opties[j].j]}</span>` : ''));
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
      const opties = q.a.flatMap(varianten).map(norm);
      if (q.pron) x = x.replace(/^(je|j'|tu|il|elle|on|nous|vous|ils|elles)\s*/, '');
      const exact = opties.includes(x);
      const zonder = !exact && opties.map(stripAccent).includes(stripAccent(x));
      if (exact) return done(1, '');
      if (zonder) return done(q.fr ? .5 : 1, q.fr ? `Let op de accenten: <b>${esc(q.a[0])}</b>` : '');
      const los = s => stripAccent(s).replace(/-/g, ' ');
      if (opties.map(los).includes(los(x))) return done(q.fr ? .5 : 1, q.fr ? `Bijna! Let op de schrijfwijze (accent of streepje): <b>${esc(q.a[0])}</b>` : '');
      done(0, `Juist antwoord: <b>${esc(q.a[0])}</b>`);
    };
  } else if (q.t === 'open') {
    ant.innerHTML = `<textarea id="ov" rows="4" placeholder="Schrijf je antwoord (in je eigen woorden)"></textarea><div class="onder"><button class="knop" id="om">Toon het modelantwoord</button></div><div id="mod"></div>`;
    $('om').onclick = () => {
      if (!$('ov').value.trim()) return $('ov').focus();
      $('om').disabled = true; $('ov').disabled = true;
      $('mod').innerHTML = `<div class="feedback info">Modelantwoord<span></span></div><p class="muted klein">Vergelijk eerlijk. Hoe goed was jouw antwoord?</p><div class="rij"><button class="knop" data-p="1">✓ Juist</button><button class="knop goud" data-p="0.5">± Half</button><button class="knop licht" data-p="0">✗ Fout</button></div>`;
      $('mod').querySelector('span').innerHTML = q.m; // modelantwoorden komen uit onze eigen inhoud
      if (q.k) $('mod').querySelector('.feedback').insertAdjacentHTML('afterend', `<p class="label" style="margin:10px 0 4px">Kernwoorden in jouw antwoord</p>${kernHtml(kernCheck($('ov').value, q.k))}`);
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
  if (it.soort === 'verrassing') { const d = vandaag(); lokaal.set('verr-af-' + d, true); lokaal.set('verr-laatst', d); if (score >= 8) { geefXP(50); toast('⚡ ' + score + '/10! +50 XP bonus'); } }
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
      <button data-p="gsm"><span>📱</span>Gsm<small class="muted">5 min op je gsm</small></button>
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
    if (soort === 'spel') { bewaarHervat(); sessie.set({ ...sessie.get(), terugNaPauze: true }); location.href = 'spel.html?pauze=1' + (MEEKIJK ? '&meekijk=1' : ''); return; }
    if (soort === 'adem') pz.innerHTML = `<div class="adem">adem in…</div><p class="center muted">Adem 4 tellen in als de bol groeit, 4 tellen uit als hij krimpt.</p>`;
    if (soort === 'beweeg') pz.innerHTML = `<div class="babbel" id="pzp"></div><div class="kaart"><h3>Voetbal-pauze ⚽</h3><p>1. 20 keer hooghouden (of doen alsof met een prop papier).<br>2. 10 squats als een keeper.<br>3. 30 seconden op één been staan, dan het andere.<br>4. Een glas water drinken. 💧</p></div>`;
    if (soort === 'beweeg') POP.babbel($('pzp'), 'Kom op, kampioen! Spieren wakker maken. Ik doe mee! 💪', { id:'papa' });
    if (soort === 'gsm') pz.innerHTML = `<div class="kaart"><h3>📱 5 minuten gsm</h3><p>Geniet ervan! Zet een wekker van <b>5 minuten</b>. Gaat hij af? Dan gaat je gsm weg en klik je op <b>Verder</b>. Na 5 minuten gaat het hier ook vanzelf verder.</p></div>`;
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
  c.innerHTML = `<div class="babbel" id="wp"></div><h2>Klaar voor de training?</h2><p class="muted">${vandaag() < P.START ? 'Vandaag maak je kennis met je leerploeg. Morgen start de echte training!' : `${items.length} opdracht${items.length === 1 ? '' : 'en'} vandaag, ± ${P.budget(vandaag())} minuten. Begin bovenaan en werk ze één voor één af.`}</p><div class="onder"><button class="knop groot" id="wk">Let's go! ⚽</button></div>`;
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
