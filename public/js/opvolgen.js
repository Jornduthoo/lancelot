// Mijn klas › Opvolgen: leerlingen × taken en toetsen in één tabel (src/opvolgen.js).
// ○ grijs = nog niet begonnen, ✎ geel = bezig, ! blauw = te verbeteren, groen = klaar (rood onder de grens), – = niet voor deze leerling.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = n => String(Math.round(Number(n) * 10) / 10).replace('.', ',');
const key = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
KlasKiezer.start(socket, $('klaskiezer'));
$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });

let data = null;
let modus = 'stand';
const SOORT = { oefenblad: '📄', quiz: '❓', proef: '📝' };
// De gekozen filters blijven staan (per toestel).
const BEWAAR = 'lancelot-opvolgen';
try {
  const f = JSON.parse(localStorage.getItem(BEWAAR) || '{}');
  if (f.modus === 'punten') modus = 'punten';
  if (f.gem && $('op-gem').querySelector(`option[value="${f.gem}"]`)) $('op-gem').value = f.gem;
  if (f.op && $('op-op').querySelector(`option[value="${f.op}"]`)) $('op-op').value = f.op;
  for (const k of ['periode', 'soort']) if (f[k] !== undefined && $(`op-${k}`).querySelector(`option[value="${f[k]}"]`)) $(`op-${k}`).value = f[k];
  if (f.vak) $('op-vak').dataset.wil = f.vak;
  if (f.grens && $('op-grens').querySelector(`option[value="${f.grens}"]`)) $('op-grens').value = f.grens;
} catch {}
// Onder deze grens kleurt een vakje rood (instelbaar: 50 % of 60 %, verbeterpunten 20 nov, 3).
const grens = () => Number($('op-grens').value) / 100 || .5;
const kleur = p => (p >= .8 ? ' hoog' : p < grens() ? ' laag' : '');
function tekenLegende() {
  $('op-grens-tekst').textContent = `klaar, onder ${$('op-grens').value}%`;
}

function maandag(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function inPeriode(dag) {
  const p = $('op-periode').value;
  if (p === 'alles') return true;
  const t = Date.parse(dag);
  if (!t) return false;
  const nu = new Date();
  if (p === 'maand') return new Date(t).getFullYear() === nu.getFullYear() && new Date(t).getMonth() === nu.getMonth();
  const begin = maandag(nu);
  if (p === 'vorige') begin.setDate(begin.getDate() - 7);
  const eind = new Date(begin);
  eind.setDate(eind.getDate() + 7);
  return t >= begin.getTime() && t < eind.getTime();
}

function vakjeTekst(v) {
  if (!v) return '–';
  if (v.inhalen && v.status === 'nieuw') return 'inhalen';
  // Een teken per stand, ook zonder kleur te lezen: ○ nog niet, ✎ bezig, ! te verbeteren (verbeterpunten 20 nov, 3).
  if (v.status === 'nieuw') return '○';
  // Hoe ver ("7 van 10"), nooit "7/10": dat is een punt (verbeterpunten 20 nov, 1).
  if (v.status === 'bezig') return '✎ ' + (v.totaal ? `${v.gedaan} van ${v.totaal}` : '…') + (v.elders ? ' 💻' : '');
  if (v.status === 'verbeteren') return v.max ? `! ${nl(v.punten)}/${nl(v.max)}` : '!';
  return v.max ? `${nl(v.punten)}/${nl(v.max)}` : '✔';
}
function vakjeTitel(naam, k, v) {
  if (!v) return `${naam}: niet voor deze leerling`;
  const s = { nieuw: 'nog niet begonnen', bezig: 'bezig', verbeteren: 'te verbeteren', klaar: 'klaar' }[v.status];
  return `${naam} · ${k.titel}: ${s}${v.inhalen ? ' (afwezig, haalt in)' : ''}${v.elders ? ` (op ${v.elders})` : ''}`;
}
// Waar een klik naartoe gaat: verbeteren of live meekijken bij een toets, anders het werk in Taken.
function doel(k, naam, v) {
  if (k.soort === 'proef' && k.afname && v && v.status !== 'nieuw') {
    return `/proef?verbeter=${encodeURIComponent(k.afname)}&${v.status === 'bezig' ? 'live' : 'leerling'}=${encodeURIComponent(naam)}`;
  }
  if (k.live) return `/proef?verbeter=${encodeURIComponent(k.afname)}`;
  return `/taken?taak=${encodeURIComponent(k.id)}&naam=${encodeURIComponent(naam)}`;
}

// Dezelfde titel meer dan eens gegeven (bv. twee keer dezelfde toets): "1e keer", "2e keer" erbij, op datum.
function keerVan(kolommen = data.kolommen) {
  const per = new Map();
  for (const k of [...kolommen].sort((a, b) => String(a.dag || '').localeCompare(String(b.dag || '')))) {
    const t = String(k.titel || '').trim().toLowerCase();
    if (!per.has(t)) per.set(t, []);
    per.get(t).push(k.id);
  }
  const uit = {};
  for (const ids of per.values()) if (ids.length > 1) ids.forEach((id, i) => { uit[id] = i + 1; });
  return uit;
}
const vakPast = (vak, kies) => !kies || (kies === '-' ? !vak : vak === kies);
const keerTekst = n => (n ? ` · ${n}e keer` : '');

function teken() {
  if (!data) return;
  // De vakken uit de taken zelf (niets vast).
  const vakSel = $('op-vak');
  const wil = vakSel.value || vakSel.dataset.wil || '';
  const vakken = [...new Set(data.kolommen.map(k => k.vak).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
  // "Zonder vak": wat geen vak heeft, verdwijnt nooit uit zicht (verbeterpunten nacontrole, 3).
  const zonder = data.kolommen.some(k => !k.vak);
  vakSel.innerHTML = '<option value="">Alle vakken</option>' + vakken.map(v => `<option>${esc(v)}</option>`).join('') + (zonder ? '<option value="-">Zonder vak</option>' : '');
  vakSel.value = vakken.includes(wil) || (wil === '-' && zonder) ? wil : '';
  delete vakSel.dataset.wil;
  vakSel.parentElement.classList.toggle('hidden', !vakken.length);
  try { localStorage.setItem(BEWAAR, JSON.stringify({ periode: $('op-periode').value, soort: $('op-soort').value, vak: vakSel.value, modus, op: $('op-op').value, gem: $('op-gem').value, grens: $('op-grens').value })); } catch {}
  tekenLegende();
  for (const b of document.querySelectorAll('.op-modus button')) b.classList.toggle('on', b.dataset.modus === modus);
  for (const id of ['op-op-label', 'op-gem-label', 'op-kopieer', 'op-punten-uitleg']) $(id).classList.toggle('hidden', modus !== 'punten');
  $('op-soort').parentElement.classList.toggle('hidden', modus === 'punten');
  if (modus === 'punten') return tekenPunten(vakSel.value);

  const kol = data.kolommen.filter(k => inPeriode(k.dag) && (!$('op-soort').value || k.soort === $('op-soort').value) && vakPast(k.vak, vakSel.value));
  const rijen = data.rijen;
  const leeg = !kol.length || !rijen.length;
  $('op-leeg').classList.toggle('hidden', !leeg);
  $('op-leeg').textContent = !rijen.length ? 'Er staat nog geen klaslijst. Zet je leerlingen in Mijn klas › Klas.'
    : 'Geen taken of toetsen in deze periode. Kies een andere periode of geef een taak bij Taken.';
  $('op-wrap').classList.toggle('hidden', leeg);
  if (leeg) return;

  const dagTekst = d => new Date(d).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });
  const keer = keerVan();
  const kop = kol.map(k => {
    const voor = rijen.filter(r => k.vakjes[key(r.naam)]);
    const klaar = voor.filter(r => ['klaar', 'verbeteren'].includes(k.vakjes[key(r.naam)].status)).length;
    return `<th class="op-kol" title="${esc(k.titel + keerTekst(keer[k.id]))}"><a href="${k.soort === 'proef' && k.afname ? `/proef?verbeter=${encodeURIComponent(k.afname)}` : `/taken?soort=${k.soort}`}">
      <span class="op-kol-titel">${SOORT[k.soort] || ''} ${esc(k.titel)}</span>${keer[k.id] ? `<span class="op-kol-keer">${keer[k.id]}e keer</span>` : ''}
      <span class="op-kol-dag">${esc(dagTekst(k.dag))}${k.gepland && Date.parse(k.dag) > Date.now() ? ' ⏰' : ''}${k.vak ? ` · ${esc(k.vak)}` : ''}</span>
      <span class="op-kol-tel">${klaar}/${voor.length} klaar</span></a></th>`;
  }).join('');
  const lijnen = rijen.map(r => {
    const k0 = key(r.naam);
    let open = 0;
    let heeft = 0;
    const cellen = kol.map(k => {
      const v = k.vakjes[k0];
      if (v) heeft++;
      if (v && (v.status === 'nieuw' || v.status === 'bezig')) open++;
      if (!v) return '<td class="op-v niet" title="' + esc(vakjeTitel(r.naam, k, v)) + '">–</td>';
      const pct = v.max ? v.punten / v.max : null;
      return `<td class="op-v ${v.status}${v.inhalen ? ' inhalen' : ''}${pct !== null && v.status === 'klaar' ? kleur(pct) : ''}" title="${esc(vakjeTitel(r.naam, k, v))}"><a href="${doel(k, r.naam, v)}">${esc(vakjeTekst(v))}</a></td>`;
    }).join('');
    return `<tr><th class="op-naam" scope="row">${esc(r.naam)}${!heeft ? '<span class="op-open geen">geen taken</span>' : `<span class="op-open${open ? '' : ' nul'}">${open ? `nog ${open} open` : '✔ alles af'}</span>`}</th>${cellen}</tr>`;
  }).join('');
  $('op-gasten').textContent = (data.gasten || []).length ? `👤 Gasten staan niet in de tabel: ${data.gasten.join(', ')}.` : '';
  $('op-wrap').innerHTML = `<table class="op-tabel"><thead><tr><th class="op-hoek">Leerling</th>${kop}</tr></thead><tbody>${lijnen}</tbody></table>`;
}

// ---------- Punten: per leerling, omgerekend, met herkansingen ----------
const TELT = { hoogste: 'de hoogste', laatste: 'de laatste', eerste: 'de eerste', gemiddelde: 'het gemiddelde' };
function telt(pogingen, keuze) {
  const p = pogingen.filter(x => x && x.max > 0);
  if (!p.length) return null;
  if (keuze === 'laatste') return p[p.length - 1];
  if (keuze === 'eerste') return p[0];
  if (keuze === 'gemiddelde') {
    const pct = p.reduce((n, x) => n + x.punten / x.max, 0) / p.length;
    return { punten: pct * p[p.length - 1].max, max: p[p.length - 1].max, open: p.some(x => x.open) };
  }
  return p.reduce((a, b) => (b.punten / b.max > a.punten / a.max ? b : a));
}
let puntenTabel = [];
// Kopiëren zonder iets ervoor (Ui.kopieer zet een taalopdracht voor AI-prompts).
function kopieerTekst(tekst) {
  const t = document.createElement('textarea');
  t.value = tekst;
  t.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
  document.body.appendChild(t);
  t.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  t.remove();
  if (!ok && navigator.clipboard) navigator.clipboard.writeText(tekst).catch(() => {});
}
function tekenPunten(vak) {
  const op = Number($('op-op').value) || 0;
  const omreken = (p, max) => (op ? (p / max) * op : p);
  const totaal = max => (op || max);
  const rijen = data.rijen;
  const dagTekst = d => new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });
  // Eén groep per toets: de eerste keer, daarna de herkansingen. Een herkansing is er alleen als de leerkracht
  // het zei (↻ Herkansing geven, of zelf gekoppeld): dezelfde toets twee keer geven = twee kolommen (verbeterpunten 20 nov, 2).
  const herk = (data.telt && data.telt.herk) || {};
  const proefKols = [...data.kolommen].filter(k => k.soort === 'proef').sort((a, b) => String(a.dag).localeCompare(String(b.dag)));
  const bestaat = new Set(proefKols.map(k => k.id));
  const wortel = id => { let r = id; const gezien = new Set([r]); while (herk[r] && bestaat.has(herk[r]) && !gezien.has(herk[r])) { r = herk[r]; gezien.add(r); } return r; };
  const groepen = new Map();
  for (const k of proefKols) {
    const id = wortel(k.id);
    if (!groepen.has(id)) groepen.set(id, []);
    groepen.get(id).push(k);
  }
  // Om te koppelen: de andere toetsen (eerste kolom van elke groep), met datum.
  const andere = id => [...groepen.entries()].filter(([g]) => g !== id).map(([g, ks]) => [g, `${ks[0].titel} (${dagTekst(ks[0].dag)})`]);
  const zicht = [...groepen.entries()].filter(([, ks]) => ks.some(k => inPeriode(k.dag)) && vakPast(ks[0].vak, vak))
    .sort((a, b) => String(b[1][0].dag).localeCompare(String(a[1][0].dag)));
  const leeg = !zicht.length || !rijen.length;
  $('op-leeg').classList.toggle('hidden', !leeg);
  $('op-leeg').textContent = !rijen.length ? 'Er staat nog geen klaslijst. Zet je leerlingen in Mijn klas › Klas.' : 'Geen toetsen in deze periode. Kies een andere periode.';
  $('op-wrap').classList.toggle('hidden', leeg);
  $('op-gasten').textContent = (data.gasten || []).length ? `👤 Gasten staan niet in de tabel: ${data.gasten.join(', ')}.` : '';
  if (leeg) { puntenTabel = []; return; }
  const keuze = id => (data.telt && data.telt.telt[id]) || (data.telt && data.telt.standaard) || 'hoogste';
  // Per leerling en per toets: alle pogingen (oudste eerst) en wat telt.
  const uitkomst = (ks, naam) => {
    const pog = [];
    for (const k of ks) {
      const v = k.vakjes[key(naam)];
      if (v && (v.status === 'klaar' || v.status === 'verbeteren') && v.max) pog.push({ punten: v.punten, max: v.max, open: v.status === 'verbeteren', dag: k.dag, k });
    }
    const bezig = ks.some(k => { const v = k.vakjes[key(naam)]; return v && v.status === 'bezig'; });
    const voor = ks.some(k => k.vakjes[key(naam)]);
    return { pog, bezig, voor };
  };
  // Alleen tussen aparte toetsen (een herkansing staat al in dezelfde kolom).
  const keer = keerVan([...groepen.entries()].map(([g, ks]) => ({ ...ks[0], id: g })));
  const kop = zicht.map(([id, ks]) => {
    const herk = ks.length - 1;
    const laag = rijen.filter(r => { const u = uitkomst(ks, r.naam); const t = telt(u.pog, keuze(id)); return t && t.punten / t.max < grens(); }).map(r => r.naam);
    return `<th class="op-kol op-pt-kol" title="${esc(ks[0].titel + keerTekst(keer[id]))}">
      <a href="${ks[ks.length - 1].afname ? `/proef?verbeter=${encodeURIComponent(ks[ks.length - 1].afname)}` : '/taken?soort=proef'}"><span class="op-kol-titel">📝 ${esc(ks[0].titel)}</span>${keer[id] ? `<span class="op-kol-keer">${keer[id]}e keer</span>` : ''}
      <span class="op-kol-dag">${esc(ks.map(k => dagTekst(k.dag)).join(' · '))}${ks[0].vak ? ` · ${esc(ks[0].vak)}` : ''}</span></a>
      ${herk ? `<label class="op-telt">🔁 ${herk === 1 ? '1 herkansing' : `${herk} herkansingen`}, telt: <select data-toets="${esc(id)}">${Object.entries(TELT).map(([w, t]) => `<option value="${w}"${keuze(id) === w ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>` : ''}
      ${ks[0].toets ? `<a class="op-herk" href="/taken?soort=proef&file=${encodeURIComponent(ks[0].toets)}&herkansing=${encodeURIComponent(id)}${laag.length ? `&namen=${encodeURIComponent(laag.join('|'))}` : ''}" title="${esc(laag.length ? `Dezelfde toets nog eens geven, met ${laag.join(', ')} al aangetikt (onder ${$('op-grens').value}%)` : 'Dezelfde toets nog eens geven')}">↻ Herkansing geven</a>` : ''}
      <details class="op-meer"><summary>Meer ▾</summary>
        ${ks.slice(1).map(k => `<button type="button" class="op-geen" data-geen="${esc(k.id)}">✕ ${esc(dagTekst(k.dag))}: dit is geen herkansing</button>`).join('')}
        <label>🔗 Herkansing van: <select data-herk="${esc(id)}"><option value="">geen (een eigen toets)</option>${andere(id).map(([g, t]) => `<option value="${esc(g)}"${herk[id] === g ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      </details></th>`;
  }).join('');
  // Het gemiddelde in dezelfde eenheid als de punten (verbeterpunten 20 nov, 4): op 10/20/100 als je omrekent,
  // anders op het totaal van de toetsen als dat overal hetzelfde is; procent alleen als je dat kiest of als de totalen verschillen.
  const inProcent = $('op-gem').value === 'pct';
  const eenheid = maxen => (inProcent ? 0 : op || (maxen.length && maxen.every(m => m === maxen[0]) ? maxen[0] : 0));
  const gemTekstVan = (g, maxen) => { const e = eenheid(maxen); return e ? `${nl(g * e)}/${nl(e)}` : `${Math.round(g * 100)}%`; };
  const alleMaxen = rijen.flatMap(r => zicht.map(([id, ks]) => telt(uitkomst(ks, r.naam).pog, keuze(id))).filter(Boolean).map(t => t.max));
  const gemKop = (() => { const e = eenheid(alleMaxen); return e ? `Gemiddelde (op ${nl(e)})` : 'Gemiddelde (%)'; })();
  puntenTabel = [['Leerling', ...zicht.map(([, ks]) => (op ? `${ks[0].titel} (op ${op})` : ks[0].titel)), gemKop]];
  const perKol = zicht.map(() => []);
  const perKolMax = zicht.map(() => []);
  const lijnen = rijen.map(r => {
    const pct = [];
    const tsv = [r.naam];
    const cellen = zicht.map(([id, ks], i) => {
      const u = uitkomst(ks, r.naam);
      const t = telt(u.pog, keuze(id));
      if (!t) {
        tsv.push('');
        return `<td class="op-v ${u.bezig ? 'bezig' : u.voor ? 'nieuw' : 'niet'}">${u.bezig ? '✎' : u.voor ? '○' : '–'}</td>`;
      }
      const p = t.punten / t.max;
      pct.push(p);
      perKol[i].push(p);
      perKolMax[i].push(t.max);
      const tekst = `${nl(omreken(t.punten, t.max))}/${nl(totaal(t.max))}`;
      // Voor Excel: met een totaal alleen het getal (de kop zegt "op 10"), anders "7 / 10" (geen datum).
      tsv.push(op ? nl(omreken(t.punten, t.max)) : tekst.replace('/', ' / '));
      const meer = u.pog.length > 1;
      const titel = `${r.naam} · ${ks[0].titel}: ${u.pog.map(x => `${dagTekst(x.dag)} ${nl(omreken(x.punten, x.max))}/${nl(totaal(x.max))}${x.open ? ' (te verbeteren)' : ''}`).join(' · ')}${meer ? ` → telt: ${TELT[keuze(id)]}` : ''}`;
      const laatste = u.pog[u.pog.length - 1].k;
      return `<td class="op-v ${t.open || u.pog.some(x => x.open) ? 'verbeteren' : 'klaar'}${t.open || u.pog.some(x => x.open) ? '' : kleur(p)}" title="${esc(titel)}"><a href="/proef?verbeter=${encodeURIComponent(laatste.afname || '')}&leerling=${encodeURIComponent(r.naam)}">${u.pog.some(x => x.open) ? '! ' : ''}${esc(tekst)}${meer ? ' 🔁' : ''}</a></td>`;
    }).join('');
    const gem = pct.length ? pct.reduce((a, b) => a + b, 0) / pct.length : null;
    // Eén vaste eenheid voor de hele kolom (ook in Excel): die van de kop.
    const e = eenheid(alleMaxen);
    const gemTekst = gem === null ? '–' : e ? `${nl(gem * e)}/${nl(e)}` : `${Math.round(gem * 100)}%`;
    tsv.push(gem === null ? '' : e ? nl(gem * e) : gemTekst);
    puntenTabel.push(tsv);
    // Over maar één toets: grijs, met "1 toets" eronder.
    const een = pct.length === 1;
    return `<tr><th class="op-naam" scope="row">${esc(r.naam)}</th>${cellen}<td class="op-gem${gem === null ? '' : een ? ' een' : kleur(gem)}"${een ? ` title="${esc('Gemiddelde over maar 1 toets')}"` : ''}>${esc(gemTekst)}${een ? '<span class="op-gem-een">1 toets</span>' : ''}</td></tr>`;
  }).join('');
  const klasGem = perKol.map(l => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null));
  const onder = `<tr class="op-klasgem"><th class="op-naam" scope="row">Klasgemiddelde</th>${klasGem.map((g, i) => `<td>${g === null ? '–' : gemTekstVan(g, perKolMax[i])}</td>`).join('')}<td></td></tr>`;
  $('op-wrap').innerHTML = `<table class="op-tabel op-punten"><thead><tr><th class="op-hoek">Leerling</th>${kop}<th class="op-kol">${esc(gemKop)}</th></tr></thead><tbody>${lijnen}${onder}</tbody></table>`;
  const naHerk = res => { if (res && res.error) return Ui.melding(res.error); data.telt = res; teken(); };
  for (const d of $('op-wrap').querySelectorAll('.op-meer')) d.addEventListener('click', e => e.stopPropagation());
  for (const b of $('op-wrap').querySelectorAll('[data-geen]')) b.addEventListener('click', () => socket.emit('pt-herk', { kolom: b.dataset.geen, van: '' }, naHerk));
  for (const sel of $('op-wrap').querySelectorAll('select[data-herk]')) sel.addEventListener('change', () => socket.emit('pt-herk', { kolom: sel.dataset.herk, van: sel.value }, naHerk));
  for (const sel of $('op-wrap').querySelectorAll('select[data-toets]')) {
    sel.addEventListener('click', e => e.stopPropagation());
    sel.addEventListener('change', () => socket.emit('pt-telt', { toets: sel.dataset.toets, telt: sel.value }, res => {
      if (res && res.error) return Ui.melding(res.error);
      data.telt = res;
      teken();
    }));
  }
}
for (const b of document.querySelectorAll('.op-modus button')) b.addEventListener('click', () => { modus = b.dataset.modus; teken(); });
$('op-op').addEventListener('change', teken);
$('op-gem').addEventListener('change', teken);
$('op-kopieer').addEventListener('click', () => {
  if (!puntenTabel.length) return;
  kopieerTekst(puntenTabel.map(r => r.join('\t')).join('\n'));
  Ui.melding('De punten staan klaar om te plakken, in Excel of in je rapport.');
});

function laad() {
  socket.emit('op-overzicht', null, res => {
    if (!res || res.error) return;
    // Vanaf het startscherm (Mijn klas) en nog geen klaslijst: eerst naar Klas, om de namen in te vullen.
    if (new URLSearchParams(location.search).has('start') && !res.rijen.length && !(res.gasten || []).length) return location.replace('/klas#klas');
    data = res;
    $('op-paneel').classList.remove('laden');
    teken();
  });
}
for (const id of ['op-periode', 'op-soort', 'op-vak', 'op-grens']) $(id).addEventListener('change', teken);
socket.on('connect', laad);
// Live: een leerling werkt, levert in, of je verbeterde (ook op een andere pc).
let timer = null;
const later = () => { clearTimeout(timer); timer = setTimeout(laad, 700); };
socket.on('tk-lijst', later);
socket.on('pf-afnames', later);
