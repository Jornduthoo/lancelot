// Ouderpagina: overzicht van Eli's werk + berichtje met selfie sturen.
(function(){
const { rpc, sessie, vandaag, opDag, mooiDatum, dagenTussen, esc, $, toast, confetti, verklein, naamVan } = window.ELI;
const P = window.ELI_PLAN, V = P.VAKKEN;
const T = window.ELI_ONDERWERPEN;
const TOPIC = Object.fromEntries(T.map(t => [t.id, t]));
const s = sessie.get();
if (!s || s.rol !== 'ouder') { location.href = 'index.html'; return; }

let D = null, foto = null;

async function laad(){
  try {
    D = await rpc('eli_ouder', { p_naam: s.naam, p_pin: s.pin });
    if (!D) throw new Error('geen toegang');
  } catch (e) {
    sessie.wis(); location.href = 'index.html'; return;
  }
  $('laden').hidden = true; $('pagina').hidden = false;
  teken();
}

function teken(){
  const st = D.stand, d = vandaag();
  const taken = st.taken || {};
  const klaarOp = id => taken[id] ? opDag(taken[id].op) : null;
  const plan = P.maak();
  const dagen = st.dagen || {};
  $('wie').textContent = 'Ingelogd als ' + naamVan(s.naam) + ' · ' + mooiDatum(d);

  // --- Kerncijfers ---
  const minVandaag = dagen[d] || 0, budget = P.budget(d);
  const verleden = P.dagen().filter(x => x < d);
  const gehaald = x => { const it = plan[x] || []; return it.length ? it.every(i => { const k = klaarOp(i.id); return k && k <= x; }) : null; };
  let reeks = 0;
  for (let x = gehaald(d) ? d : P.dag(d, -1); x >= P.START; x = P.dag(x, -1)) { const g = gehaald(x); if (g === null) continue; if (!g) break; reeks++; }
  const achter = [];
  for (const x of verleden) for (const it of (plan[x] || [])) if (it.soort !== 'kaarten' && !taken[it.id]) achter.push({ ...it, dag: x });
  const totMin = Object.values(dagen).reduce((a, b) => a + b, 0);
  const logins = D.logins || [];
  const laatst = logins[0] ? new Date(logins[0]).toLocaleString('nl-BE', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : 'nog nooit';
  $('cijfers').innerHTML = [
    [`${minVandaag}<small style="font-size:1rem">/${budget}</small>`, 'minuten vandaag'],
    [reeks, 'dagen op rij volgens plan'],
    [achter.length, achter.length === 1 ? 'opdracht achterstand' : 'opdrachten achterstand'],
    [totMin, 'minuten in totaal'],
    [esc(laatst), 'laatst ingelogd'],
  ].map(([b, t]) => `<div class="cijfer"><b>${b}</b><span>${t}</span></div>`).join('');

  // --- Minuten per dag ---
  const toonDagen = P.dagen().filter(x => x <= P.EINDE);
  $('dagen').innerHTML = toonDagen.map(x => {
    const m = dagen[x] || 0, b = P.budget(x) || 1, toekomst = x > d;
    const h = Math.min(100, m / Math.max(b, 60) * 100);
    const kl = toekomst ? '' : m === 0 && x < d ? 'nul' : m < b * .9 ? 'laag' : '';
    return `<div class="dag${x === d ? ' nu' : ''}" title="${mooiDatum(x)}: ${m} van ${P.budget(x)} min"><span>${toekomst ? '' : m}</span><div class="zuil"><i class="${kl}" style="height:${toekomst ? 0 : Math.max(m ? 4 : (x < d ? 3 : 0), h)}%"></i></div><span>${mooiDatum(x, true).replace(' ', '<br>')}</span></div>`;
  }).join('');
  const nu = $('dagen').querySelector('.nu'); if (nu) nu.scrollIntoView({ inline:'center', block:'nearest' });

  // --- Planning ---
  const vandaagItems = plan[d] || [];
  const rijen = vandaagItems.map(it => `<tr><td>${esc(it.titel)} <span class="muted klein">· ${esc((V[it.vak] || {}).kort || 'alle vakken')}</span></td><td class="n">${taken[it.id] ? '<span class="ok">✓ klaar</span>' : '<span class="muted">open</span>'}</td></tr>`).join('');
  $('planning').innerHTML = `<h3>Vandaag (${budget} min)</h3>${vandaagItems.length ? `<table><tbody>${rijen}</tbody></table>` : '<p class="muted">Niets gepland.</p>'}
    <h3 style="margin-top:14px">Achterstand ${achter.length ? `<span class="tag">${achter.length}</span>` : '<span class="tag ok">geen</span>'}</h3>
    ${achter.length ? `<p class="muted klein" style="margin:0 0 6px">Deze staan bij Eli bovenaan als inhaalwerk. Hij kan niets anders doen tot ze af zijn.</p><table><tbody>${achter.map(it => `<tr><td>${esc(it.titel)}</td><td class="n muted">${mooiDatum(it.dag, true)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Alles van de vorige dagen is gedaan. 👏</p>'}
    <h3 style="margin-top:14px">Vorige dagen</h3>
    <table><tbody>${verleden.slice().reverse().map(x => { const it = plan[x] || []; const k = it.filter(i => { const o = klaarOp(i.id); return o && o <= x; }).length; const ooit = it.filter(i => taken[i.id]).length;
      return `<tr><td>${mooiDatum(x)}</td><td class="n">${dagen[x] || 0} / ${P.budget(x)} min</td><td class="n">${k}/${it.length} op tijd${ooit > k ? ` <span class="muted">(+${ooit - k} later)</span>` : ''}</td></tr>`; }).join('') || '<tr><td class="muted">Nog geen vorige dagen.</td></tr>'}</tbody></table>`;

  // --- Per vak ---
  const minVak = {};
  for (const r of (D.minuten || [])) minVak[r.vak] = (minVak[r.vak] || 0) + r.min;
  const qv = {};
  for (const [tid, r] of Object.entries(st.onderwerpen || {})) { const t = TOPIC[tid]; if (!t) continue; const q = qv[t.vak] = qv[t.vak] || { s:0, t:0 }; q.s += r.s; q.t += r.t; }
  $('vakken').innerHTML = Object.entries(V).map(([k, v]) => {
    const ts = T.filter(t => t.vak === k), g = ts.filter(t => taken['leer:' + t.id]).length;
    const q = qv[k];
    return `<tr><td><b>${v.icoon} ${esc(v.kort)}</b></td><td class="muted klein">${esc(v.uur)}</td><td class="n">${minVak[k] || 0}</td><td><div class="rij" style="flex-wrap:nowrap;gap:6px"><div class="balkje" style="flex:1"><i style="width:${g / ts.length * 100}%;background:${v.kleur}"></i></div><span class="klein">${g}/${ts.length}</span></div></td><td class="n">${q && q.t ? Math.round(q.s / q.t * 100) + '%' : '–'}</td></tr>`;
  }).join('');

  // --- Zwakke punten ---
  const zwak = Object.entries(st.onderwerpen || {}).filter(([, r]) => r.t && r.s / r.t < .7).map(([id, r]) => ({ t: TOPIC[id], p: r.s / r.t })).filter(z => z.t).sort((a, b) => a.p - b.p);
  $('zwak').innerHTML = zwak.length ? `<table><tbody>${zwak.map(z => `<tr><td>${V[z.t.vak].icoon} ${esc(z.t.titel)}</td><td class="n nok">${Math.round(z.p * 100)}%</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Geen zwakke punten op dit moment. 💪</p>';

  // --- Log ---
  const soortTekst = l => {
    const t = TOPIC[l.onderwerp];
    if (l.soort === 'taak') return `✅ Opdracht klaar: <b>${esc((l.detail && l.detail.titel) || (t && t.titel) || '')}</b>`;
    if (l.soort === 'quiz') return `❓ Quiz ${esc(t ? t.titel : l.onderwerp || '')}: <b>${Math.round(l.score / Math.max(1, l.totaal) * 100)}%</b> <span class="muted">(${l.score}/${l.totaal})</span>`;
    if (l.soort === 'spel') return `🐉 Drakenjacht gespeeld${l.score ? ` (${l.score} juist)` : ''}`;
    return esc(l.soort) + (t ? ' · ' + esc(t.titel) : '');
  };
  const log = (D.log || []).slice(0, 40);
  $('log').innerHTML = log.length ? log.map(l => `<div><span class="t">${new Date(l.op).toLocaleString('nl-BE', { weekday:'short', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit' })}</span><span>${soortTekst(l)}</span></div>`).join('') : '<p class="muted">Nog niets gedaan.</p>';
  $('logins').textContent = logins.slice(0, 12).map(x => new Date(x).toLocaleString('nl-BE', { weekday:'short', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit' })).join(' · ') || 'Nog niet ingelogd.';

  tekenBerichten();
}

function tekenBerichten(){
  const lijst = D.berichten || [];
  const el = $('berichten'); el.innerHTML = lijst.length ? '' : '<p class="muted klein">Nog geen berichtjes gestuurd.</p>';
  for (const b of lijst.slice(0, 10)) {
    const r = document.createElement('div'); r.className = 'ber';
    if (b.foto) { const i = document.createElement('img'); i.src = b.foto; i.alt = ''; r.append(i); }
    const tx = document.createElement('div');
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.innerHTML = `${esc(naamVan(b.van))} · ${new Date(b.op).toLocaleString('nl-BE', { weekday:'short', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit' })} · ${b.gezien ? `<span class="ok">👀 gezien ${new Date(b.gezien).toLocaleString('nl-BE', { weekday:'short', hour:'2-digit', minute:'2-digit' })}</span>` : 'nog niet gezien'}${b.heeftFoto && !b.foto ? ' · 📷' : ''}`;
    const p = document.createElement('div'); p.textContent = b.tekst || '';
    tx.append(meta, p); r.append(tx); el.append(r);
  }
}

// --- Selfie ---
let stroom = null;
function zetFoto(url){
  foto = url;
  $('voorbeeld').innerHTML = '';
  if (!url) return;
  const i = document.createElement('img'); i.src = url; i.alt = 'Je selfie'; i.style.cssText = 'width:110px;height:110px;object-fit:cover;border-radius:18px;border:3px solid var(--goud)';
  const w = document.createElement('button'); w.className = 'link'; w.textContent = '✕ weg'; w.onclick = () => zetFoto(null);
  $('voorbeeld').append(i, w);
}
function stopCamera(){ if (stroom) stroom.getTracks().forEach(t => t.stop()); stroom = null; $('camera').hidden = true; }
$('maak-selfie').onclick = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('bestand').click(); return; }
  try {
    stroom = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'user', width:{ ideal:1280 } }, audio:false });
    $('video').srcObject = stroom; $('camera').hidden = false;
    $('camera').scrollIntoView({ block:'center', behavior:'smooth' });
  } catch { $('bestand').click(); }
};
$('cam-weg').onclick = stopCamera;
$('klik').onclick = async () => {
  const v = $('video');
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
  const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(v, 0, 0);
  stopCamera();
  zetFoto(await verklein(c, 720, .8));
};
$('bestand').onchange = async e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  try { zetFoto(await verklein(f, 720, .8)); } catch { toast('Die foto kon ik niet openen.'); }
  e.target.value = '';
};
$('stuur').onclick = async () => {
  const tekst = $('tekst').value.trim();
  if (!tekst && !foto) { toast('Schrijf iets of trek een selfie.'); return; }
  let f = foto;
  if (f && f.length > 390000) { try { const img = new Image(); img.src = f; await img.decode(); f = await verklein(img, 480, .7); } catch {} }
  $('stuur').disabled = true; $('stuurstatus').textContent = 'Versturen…';
  try {
    const ok = await rpc('eli_bericht', { p_naam: s.naam, p_pin: s.pin, p_tekst: tekst, p_foto: f || null });
    if (ok === false) throw new Error('de server weigerde het (te lang of foto te groot?)');
    $('tekst').value = ''; zetFoto(null);
    $('stuurstatus').textContent = '';
    toast('Verstuurd! Eli ziet het als hij de app opent.'); confetti(1200);
    D = await rpc('eli_ouder', { p_naam: s.naam, p_pin: s.pin }) || D;
    tekenBerichten();
  } catch (e) {
    $('stuurstatus').textContent = 'Lukte niet: ' + e.message;
  } finally { $('stuur').disabled = false; }
};
$('uit').onclick = () => { sessie.wis(); location.href = 'index.html'; };
$('ververs').onclick = laad;
laad();
})();
