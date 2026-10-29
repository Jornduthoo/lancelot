// De Zegelrol: rapporten maken. Drie tabbladen: Punten (per vak een tabel), Per leerling (symbolen, commentaar,
// hoe werk ik?) en Opmaak (hoe het blad eruitziet). Rechts staat altijd het rapport zoals het op papier komt.
// Alles bewaart vanzelf. Het tekenen van een blad staat in zr-rapport.js (ook gebruikt door zegelrol-print.html).
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const Z = window.Zegelrol;
const zr = { lijst: [], opmaak: null, data: null, lid: '', tab: 'punten', kolom: null, vak: null };

$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host#kronieken'; });
for (const d of document.querySelectorAll('dialog')) {
  d.querySelectorAll('[data-sluit]').forEach(b => b.addEventListener('click', () => d.close()));
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
}

const vandaag = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const plusDag = iso => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};
const schooljaarStart = () => {
  const d = new Date();
  return `${d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1}-09-01`;
};
const getal = n => String(Math.round(n * 10) / 10).replace('.', ',');

// ---------- Bewaren (vanzelf, kort na elke wijziging) ----------

let rTimer = null;
let oTimer = null;
function bewaarRapport() {
  clearTimeout(rTimer);
  $('zr-bewaard').textContent = 'Bewaren…';
  rTimer = setTimeout(() => {
    rTimer = null;
    socket.emit('zr-bewaar', zr.data.rapport, res => {
      if (res.error) { $('zr-bewaard').textContent = ''; Ui.melding(res.error); return; }
      zr.data.rapport.gewijzigd = res.gewijzigd;
      $('zr-bewaard').textContent = '✓ Bewaard';
    });
  }, 600);
}
function bewaarOpmaak() {
  clearTimeout(oTimer);
  $('zr-bewaard').textContent = 'Bewaren…';
  oTimer = setTimeout(() => {
    oTimer = null;
    socket.emit('zr-opmaak', zr.opmaak, res => {
      if (res.error) { Ui.melding(res.error); return; }
      $('zr-bewaard').textContent = '✓ Bewaard';
    });
  }, 600);
}
// Een ander docentenscherm veranderde iets: opnieuw ophalen, tenzij hier nog iets moet bewaren.
socket.on('zr-gewijzigd', () => {
  if (rTimer || oTimer) return;
  if (zr.data) laad(zr.data.rapport.id, true); else start();
});

// ---------- Mijn rapporten ----------

function start() {
  socket.emit('zr-lijst', {}, res => {
    if (res.error) return Ui.melding(res.error);
    zr.lijst = res.lijst;
    zr.opmaak = res.opmaak;
    toonStart();
  });
}

function toonStart() {
  $('zr-start').classList.remove('hidden');
  $('zr-rapport').classList.add('hidden');
  const box = $('zr-rapporten');
  box.replaceChildren();
  const nieuw = el('button', 'zr-kaart zr-kaart-nieuw');
  nieuw.innerHTML = '<span class="zr-groot">＋</span><strong>Nieuw rapport</strong><span class="muted small">Kies een naam en een periode.</span>';
  nieuw.addEventListener('click', nieuwRapport);
  box.append(nieuw);
  for (const r of zr.lijst) {
    const k = el('div', 'zr-kaart');
    const open = el('button', 'zr-kaart-open');
    open.innerHTML = `<span class="zr-groot">📜</span><strong>${Z.esc(r.titel)}</strong><span class="muted small">${Z.kort(r.van)} – ${Z.kort(r.tot)} · ${r.onderdelen} toets${r.onderdelen === 1 ? '' : 'en'}</span>`;
    open.addEventListener('click', () => laad(r.id));
    const weg = el('button', 'secondary icon zr-kaart-weg');
    weg.innerHTML = '🗑';
    weg.title = 'Rapport verwijderen';
    weg.addEventListener('click', async () => {
      if (!await Ui.vraag(`"${r.titel}" verwijderen? Het gaat naar de prullenbak van De Zegelrol. De toetsen zelf blijven.`, { ja: 'Verwijderen', gevaar: true })) return;
      socket.emit('zr-weg', { id: r.id }, res => (res.error ? Ui.melding(res.error) : start()));
    });
    k.append(open, weg);
    box.append(k);
  }
}

function nieuwRapport() {
  const laatste = zr.lijst[0];
  $('zr-n-titel').value = `Rapport ${zr.lijst.length + 1}`;
  $('zr-n-van').value = laatste && laatste.tot ? plusDag(laatste.tot) : schooljaarStart();
  $('zr-n-tot').value = vandaag();
  const sel = $('zr-n-kopie');
  sel.replaceChildren(new Option('De gewone vakken (Wiskunde, Nederlands, Frans, WO, Muzo, LO, Godsdienst)', ''));
  for (const r of zr.lijst) sel.append(new Option(`Zoals in "${r.titel}" (eigen vakken en onderdelen mee)`, r.id));
  sel.value = laatste ? laatste.id : '';
  $('zr-n-fout').textContent = '';
  $('zr-nieuw').showModal();
}
$('zr-nieuw-form').addEventListener('submit', e => {
  e.preventDefault();
  socket.emit('zr-nieuw', { titel: $('zr-n-titel').value, van: $('zr-n-van').value, tot: $('zr-n-tot').value, kopie: $('zr-n-kopie').value }, res => {
    if (res.error) { $('zr-n-fout').textContent = res.error; return; }
    $('zr-nieuw').close();
    open(res);
  });
});

// ---------- Eén rapport ----------

function laad(id, stil) {
  socket.emit('zr-laad', { id }, res => {
    if (res.error) { if (!stil) Ui.melding(res.error); return; }
    open(res);
  });
}

let kiesTab = null;
function open(res) {
  zr.data = res;
  if (res.opmaak) zr.opmaak = res.opmaak;
  if (!res.klas.leerlingen.some(l => l.id === zr.lid)) zr.lid = res.klas.leerlingen[0] ? res.klas.leerlingen[0].id : '';
  $('zr-start').classList.add('hidden');
  $('zr-rapport').classList.remove('hidden');
  const r = res.rapport;
  $('zr-titel').value = r.titel;
  $('zr-van').value = r.van;
  $('zr-tot').value = r.tot;
  $('zr-datum').value = r.datum;
  $('zr-bewaard').textContent = '';
  if (!kiesTab) kiesTab = Ui.tabs($('zr-tabs'), 'zr-tab', naam => { zr.tab = naam; teken(); });
  else teken();
}

$('zr-terug').addEventListener('click', () => { zr.data = null; start(); });
$('zr-titel').addEventListener('input', () => { zr.data.rapport.titel = $('zr-titel').value; bewaarRapport(); voorbeeld(); });
$('zr-datum').addEventListener('change', () => { zr.data.rapport.datum = $('zr-datum').value; bewaarRapport(); voorbeeld(); });
// Een andere periode: bewaren en opnieuw laden, zodat de toetsen van de nieuwe periode erbij komen.
for (const k of ['van', 'tot']) {
  $(`zr-${k}`).addEventListener('change', () => {
    zr.data.rapport[k] = $(`zr-${k}`).value;
    clearTimeout(rTimer);
    rTimer = null;
    socket.emit('zr-bewaar', zr.data.rapport, res => (res.error ? Ui.melding(res.error) : laad(zr.data.rapport.id)));
  });
}
$('zr-print-alles').addEventListener('click', () => window.open(`/zegelrol-print?id=${zr.data.rapport.id}`, '_blank'));

function teken() {
  if (!zr.data) return;
  if (zr.tab === 'punten') tekenPunten();
  if (zr.tab === 'leerling') tekenLeerling();
  if (zr.tab === 'opmaak') tekenOpmaak();
}

// ---------- Punten ----------

const ll = lid => {
  const r = zr.data.rapport;
  if (!r.leerlingen[lid]) r.leerlingen[lid] = { p: {}, s: {}, c: {}, alg: '', afw: { g: 0, o: 0 } };
  return r.leerlingen[lid];
};

function tekenPunten() {
  const box = $('zr-vakken');
  box.replaceChildren();
  const { rapport: r, klas } = zr.data;
  if (!klas.leerlingen.length) box.append(el('p', 'notice', 'Je klaslijst is nog leeg. Zet je leerlingen eerst bij Mijn klas.'));
  r.vakken.forEach((v, vi) => {
    const p = el('div', 'panel zr-vak-paneel');
    const kop = el('div', 'zr-vak-kop2');
    const naam = el('button', 'zr-vaknaam');
    naam.innerHTML = `<span>${Z.esc(v.icoon || '📘')}</span> ${Z.esc(v.naam)} <i class="zr-pen">✎</i>`;
    naam.title = 'Vak bewerken';
    naam.addEventListener('click', () => vakBewerk(vi));
    kop.append(naam);
    if (v.punten) {
      const plus = el('button', 'secondary');
      plus.innerHTML = `${Ui.ic('plus')} Eigen punten`;
      plus.title = 'Een onderdeel zonder toets, bv. een spreekbeurt, een werkstuk of punten van op papier';
      plus.addEventListener('click', () => {
        v.onderdelen.push({ id: Math.random().toString(16).slice(2, 10), naam: 'Nieuw onderdeel', inhoud: '', max: 10, toets: '', datum: '' });
        bewaarRapport();
        tekenPunten();
        kolomBewerk(vi, v.onderdelen.length - 1);
      });
      kop.append(plus);
    }
    p.append(kop);
    if (!v.punten) {
      p.append(el('p', 'muted small', 'Zonder punten: het symbool en het commentaar vul je in bij 👤 Per leerling.'));
      box.append(p);
      return;
    }
    if (!v.onderdelen.length) {
      p.append(el('p', 'muted small', 'Nog geen toetsen in deze periode. Een toets uit De Proef komt hier vanzelf, of tik op Eigen punten.'));
      box.append(p);
      return;
    }
    const wrap = el('div', 'zr-tabel-scroll');
    const t = el('table', 'zr-punten');
    const hr = el('tr');
    hr.append(el('th', 'zr-ln', 'Leerling'));
    v.onderdelen.forEach((o, oi) => {
      const th = el('th');
      const b = el('button', 'zr-kolom');
      b.innerHTML = `${o.toets ? '<span class="zr-auto" title="Uit De Proef">⚡</span>' : ''}<strong>${Z.esc(o.naam)}</strong><span>/${getal(o.max)}${o.datum ? ` · ${Z.kort(o.datum)}` : ''}</span>`;
      b.title = o.inhoud || 'Tik om te bewerken';
      b.addEventListener('click', () => kolomBewerk(vi, oi));
      th.append(b);
      hr.append(th);
    });
    hr.append(el('th', 'zr-tot-k', 'Totaal'));
    const thead = el('thead');
    thead.append(hr);
    const tb = el('tbody');
    for (const l of klas.leerlingen) {
      const tr = el('tr');
      tr.append(el('td', 'zr-ln', l.naam));
      v.onderdelen.forEach((o, oi) => {
        const td = el('td');
        const w = Z.waarde(zr.data, l.id, o);
        const inp = el('input', 'zr-cel');
        inp.inputMode = 'decimal';
        inp.dataset.v = vi;
        inp.dataset.o = oi;
        inp.value = w.w === null ? '' : typeof w.w === 'number' ? getal(w.w) : w.w;
        if (w.auto) inp.classList.add('auto');
        if (w.eigen && o.toets) inp.classList.add('eigen');
        if (w.open) { inp.classList.add('open'); inp.title = 'Nog niet alles verbeterd in De Proef'; }
        if (typeof w.w === 'number' && w.w > o.max) inp.classList.add('te-veel');
        inp.addEventListener('change', () => zetPunt(l.id, o, inp, tr, v));
        inp.addEventListener('keydown', e => {
          if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();
          const rij = e.key === 'ArrowUp' ? tr.previousElementSibling : tr.nextElementSibling;
          const volgende = rij && rij.querySelector(`input[data-o="${oi}"]`);
          if (volgende) { volgende.focus(); volgende.select(); } else inp.blur();
        });
        td.append(inp);
        tr.append(td);
      });
      const tot = el('td', 'zr-tot-k');
      tr.append(tot);
      totaalCel(tot, l.id, v);
      tb.append(tr);
    }
    t.append(thead, tb);
    wrap.append(t);
    p.append(wrap);
    box.append(p);
  });
}

function totaalCel(td, lid, v) {
  const t = Z.totaal(zr.data, lid, v);
  td.innerHTML = t.pct === null ? '—' : `${getal(t.p)}<small>/${getal(t.m)}</small> <span class="${t.pct < 50 ? 'zr-laag' : ''}">${t.pct}%</span>`;
}

function zetPunt(lid, o, inp, tr, v) {
  const ruw = inp.value.trim().toUpperCase().replace(',', '.');
  const l = ll(lid);
  const auto = o.toets && zr.data.auto[o.id] && zr.data.auto[o.id].punten[lid];
  if (ruw === '' || (auto && Number(ruw) === auto.p)) delete l.p[o.id];
  else if (ruw === 'A' || ruw === 'V') l.p[o.id] = ruw;
  else if (Number.isFinite(Number(ruw)) && Number(ruw) >= 0) l.p[o.id] = Math.round(Number(ruw) * 2) / 2;
  else { Ui.melding('Typ een getal, A (afwezig) of V (vrijgesteld).'); inp.value = ''; return; }
  const w = Z.waarde(zr.data, lid, o);
  inp.value = w.w === null ? '' : typeof w.w === 'number' ? getal(w.w) : w.w;
  inp.classList.toggle('auto', !!w.auto);
  inp.classList.toggle('eigen', !!(w.eigen && o.toets));
  inp.classList.toggle('te-veel', typeof w.w === 'number' && w.w > o.max);
  totaalCel(tr.lastElementChild, lid, v);
  bewaarRapport();
}

// Een kolom bewerken: naam, korte inhoud, maximum en het vak.
function kolomBewerk(vi, oi) {
  const v = zr.data.rapport.vakken[vi];
  const o = v.onderdelen[oi];
  zr.kolom = { vi, oi };
  $('zr-kolom-titel').textContent = o.toets ? 'Toets' : 'Eigen onderdeel';
  $('zr-kolom-toets').classList.toggle('hidden', !o.toets);
  $('zr-k-naam').value = o.naam;
  $('zr-k-inhoud').value = o.inhoud;
  $('zr-k-max').value = o.max;
  const sel = $('zr-k-vak');
  sel.replaceChildren(...zr.data.rapport.vakken.filter(x => x.punten).map(x => new Option(`${x.icoon || ''} ${x.naam}`, x.id)));
  sel.value = v.id;
  $('zr-kolom').showModal();
  $('zr-k-naam').select();
}
$('zr-kolom-form').addEventListener('submit', e => {
  e.preventDefault();
  const { vi, oi } = zr.kolom;
  const v = zr.data.rapport.vakken[vi];
  const o = v.onderdelen[oi];
  o.naam = $('zr-k-naam').value.trim() || o.naam;
  o.inhoud = $('zr-k-inhoud').value.trim();
  const max = Math.round(Number(String($('zr-k-max').value).replace(',', '.')) * 2) / 2;
  if (max > 0 && max !== o.max) {
    // Punten uit De Proef rekent de server om naar het nieuwe maximum: opnieuw laden.
    o.max = max;
    zr.herlaad = !!o.toets;
  }
  const naar = zr.data.rapport.vakken.find(x => x.id === $('zr-k-vak').value);
  if (naar && naar !== v) {
    v.onderdelen.splice(oi, 1);
    naar.onderdelen.push(o);
  }
  $('zr-kolom').close();
  if (zr.herlaad) {
    zr.herlaad = false;
    clearTimeout(rTimer);
    rTimer = null;
    socket.emit('zr-bewaar', zr.data.rapport, res => (res.error ? Ui.melding(res.error) : laad(zr.data.rapport.id)));
    return;
  }
  bewaarRapport();
  tekenPunten();
});
$('zr-k-weg').addEventListener('click', async () => {
  const { vi, oi } = zr.kolom;
  const v = zr.data.rapport.vakken[vi];
  const o = v.onderdelen[oi];
  const tekst = o.toets ? `"${o.naam}" van dit rapport halen? De toets en de afname in De Proef blijven gewoon bestaan.` : `"${o.naam}" en de punten ervan verwijderen?`;
  if (!await Ui.vraag(tekst, { ja: 'Weghalen', gevaar: true })) return;
  v.onderdelen.splice(oi, 1);
  if (o.toets) zr.data.rapport.weg.push(o.toets);
  for (const l of Object.values(zr.data.rapport.leerlingen)) delete l.p[o.id];
  $('zr-kolom').close();
  bewaarRapport();
  tekenPunten();
});

// Een vak bewerken of toevoegen.
const ICONEN = ['🧮', '📖', '✏️', '📚', '🥐', '🌍', '🔬', '🕰️', '🎨', '🎵', '⚽', '🕊️', '💻', '🧩', '💬', '🗣️', '🧠', '🌱'];
function vakBewerk(vi) {
  const v = zr.data.rapport.vakken[vi];
  zr.vak = vi;
  $('zr-v-naam').value = v.naam;
  $('zr-v-icoon').value = v.icoon;
  $('zr-v-punten').checked = v.punten;
  $('zr-v-iconen').replaceChildren(...ICONEN.map(i => {
    const b = el('button', 'secondary icon', i);
    b.type = 'button';
    b.addEventListener('click', () => { $('zr-v-icoon').value = i; });
    return b;
  }));
  $('zr-vakdlg').showModal();
}
$('zr-vak-form').addEventListener('submit', e => {
  e.preventDefault();
  const v = zr.data.rapport.vakken[zr.vak];
  v.naam = $('zr-v-naam').value.trim() || v.naam;
  v.icoon = $('zr-v-icoon').value.trim();
  v.punten = $('zr-v-punten').checked;
  $('zr-vakdlg').close();
  bewaarRapport();
  teken();
});
const schuifVak = stap => {
  const lijst = zr.data.rapport.vakken;
  const j = zr.vak + stap;
  if (j < 0 || j >= lijst.length) return;
  [lijst[zr.vak], lijst[j]] = [lijst[j], lijst[zr.vak]];
  zr.vak = j;
  bewaarRapport();
  teken();
};
$('zr-v-op').addEventListener('click', () => schuifVak(-1));
$('zr-v-neer').addEventListener('click', () => schuifVak(1));
$('zr-v-weg').addEventListener('click', async () => {
  const v = zr.data.rapport.vakken[zr.vak];
  if (!await Ui.vraag(`Het vak "${v.naam}" met al zijn punten en commentaar van dit rapport halen?`, { ja: 'Verwijderen', gevaar: true })) return;
  zr.data.rapport.vakken.splice(zr.vak, 1);
  for (const o of v.onderdelen) if (o.toets) zr.data.rapport.weg.push(o.toets);
  $('zr-vakdlg').close();
  bewaarRapport();
  teken();
});
$('zr-vak-nieuw').addEventListener('click', () => {
  zr.data.rapport.vakken.push({ id: Math.random().toString(16).slice(2, 10), naam: 'Nieuw vak', icoon: '📘', punten: true, onderdelen: [] });
  bewaarRapport();
  tekenPunten();
  vakBewerk(zr.data.rapport.vakken.length - 1);
});

// Alle punten naar Excel (puntkomma's, zoals Excel in België ze verwacht).
$('zr-csv').addEventListener('click', () => {
  const { rapport: r, klas } = zr.data;
  const cel = s => `"${String(s).replace(/"/g, '""')}"`;
  const kop = ['Leerling'];
  for (const v of r.vakken.filter(x => x.punten)) {
    for (const o of v.onderdelen) kop.push(`${v.naam}: ${o.naam} (/${getal(o.max)})`);
    kop.push(`${v.naam} totaal`, `${v.naam} %`);
  }
  const rijen = klas.leerlingen.map(l => {
    const rij = [l.naam];
    for (const v of r.vakken.filter(x => x.punten)) {
      for (const o of v.onderdelen) {
        const w = Z.waarde(zr.data, l.id, o).w;
        rij.push(w === null ? '' : typeof w === 'number' ? getal(w) : w);
      }
      const t = Z.totaal(zr.data, l.id, v);
      rij.push(t.pct === null ? '' : `${getal(t.p)}/${getal(t.m)}`, t.pct === null ? '' : t.pct);
    }
    return rij;
  });
  const csv = '﻿' + [kop, ...rijen].map(rij => rij.map(cel).join(';')).join('\r\n');
  const a = el('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${r.titel}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

// ---------- Per leerling ----------

function symboolKnoppen(huidig, kies) {
  const rij = el('div', 'zr-symkeuze');
  for (const s of Z.SYMBOLEN) {
    const b = el('button', `zr-symknop${huidig === s ? ' on' : ''}`);
    b.type = 'button';
    b.innerHTML = Z.symbool(zr.opmaak, s, false);
    b.title = Z.labelVan(zr.opmaak, s);
    b.setAttribute('aria-pressed', huidig === s);
    b.addEventListener('click', () => {
      const nieuw = huidig === s ? '' : s;
      kies(nieuw);
      huidig = nieuw;
      rij.querySelectorAll('.zr-symknop').forEach((k, i) => { k.classList.toggle('on', Z.SYMBOLEN[i] === nieuw); k.setAttribute('aria-pressed', Z.SYMBOLEN[i] === nieuw); });
    });
    rij.append(b);
  }
  return rij;
}

function klaarTeller(lid) {
  const r = zr.data.rapport;
  const l = r.leerlingen[lid];
  if (!l) return 0;
  return r.vakken.filter(v => l.s[v.id] || l.c[v.id]).length + (l.alg ? 1 : 0);
}

function tekenLeerling() {
  const { klas, rapport: r } = zr.data;
  const namen = $('zr-namen');
  namen.replaceChildren();
  if (!klas.leerlingen.length) {
    $('zr-invul').replaceChildren(el('p', 'notice', 'Je klaslijst is nog leeg. Zet je leerlingen eerst bij Mijn klas.'));
    $('zr-voorbeeld-ll').replaceChildren();
    return;
  }
  for (const l of klas.leerlingen) {
    const b = el('button', `zr-naam${l.id === zr.lid ? ' on' : ''}`);
    const n = klaarTeller(l.id);
    b.innerHTML = `<span>${Z.esc(l.naam)}</span><small>${n ? `${n} ✓` : ''}</small>`;
    b.addEventListener('click', () => { zr.lid = l.id; tekenLeerling(); });
    namen.append(b);
  }
  const lid = zr.lid;
  const leerling = klas.leerlingen.find(x => x.id === lid);
  const data = ll(lid);
  const box = $('zr-invul');
  box.replaceChildren();
  const kop = el('div', 'zr-invul-kop');
  const vorige = el('button', 'secondary icon', '◀');
  vorige.title = 'Vorige leerling';
  const volgende = el('button', 'secondary icon', '▶');
  volgende.title = 'Volgende leerling';
  const i = klas.leerlingen.indexOf(leerling);
  vorige.disabled = i <= 0;
  volgende.disabled = i >= klas.leerlingen.length - 1;
  vorige.addEventListener('click', () => { zr.lid = klas.leerlingen[i - 1].id; tekenLeerling(); });
  volgende.addEventListener('click', () => { zr.lid = klas.leerlingen[i + 1].id; tekenLeerling(); });
  const druk = el('button', 'secondary', '🖨️ Dit rapport');
  druk.addEventListener('click', () => window.open(`/zegelrol-print?id=${r.id}&l=${lid}`, '_blank'));
  kop.append(vorige, el('h2', '', leerling.naam), volgende, druk);
  box.append(kop);

  const blok = (titel, uitleg) => {
    const p = el('div', 'panel zr-invul-blok');
    const h = el('h3', '', titel);
    if (uitleg) {
      const d = el('details', 'hulp');
      d.innerHTML = `<summary aria-label="Uitleg">?</summary><p>${uitleg}</p>`;
      h.append(d);
    }
    p.append(h);
    box.append(p);
    return p;
  };

  const vb = blok('Vakken', 'Tik een symbool aan (nog eens tikken = weg). Het commentaar komt onder het vak. {naam} wordt de voornaam.');
  for (const v of r.vakken) {
    const rij = el('div', 'zr-vakrij');
    const t = Z.totaal(zr.data, lid, v);
    rij.append(el('span', 'zr-vakrij-naam', `${v.icoon || '📘'} ${v.naam}`), el('span', 'zr-vakrij-pct muted small', v.punten && t.pct !== null ? `${t.pct}%` : ''));
    rij.append(symboolKnoppen(data.s[v.id], s => { if (s) data.s[v.id] = s; else delete data.s[v.id]; wijzigLl(); }));
    const com = el('textarea', 'zr-com-in');
    com.rows = 1;
    com.maxLength = 1200;
    com.placeholder = 'Commentaar bij dit vak (mag leeg)';
    com.value = data.c[v.id] || '';
    com.addEventListener('input', () => { if (com.value.trim()) data.c[v.id] = com.value; else delete data.c[v.id]; wijzigLl(); });
    rij.append(com);
    vb.append(rij);
  }

  if (r.attitudes.length) {
    const ab = blok('Hoe werk ik? Hoe ben ik?', 'De zinnen zelf pas je aan bij 🎨 Opmaak.');
    for (const a of r.attitudes) {
      const rij = el('div', 'zr-vakrij zr-attrij');
      rij.append(el('span', 'zr-vakrij-naam', a.tekst));
      rij.append(symboolKnoppen(data.s[`a-${a.id}`], s => { if (s) data.s[`a-${a.id}`] = s; else delete data.s[`a-${a.id}`]; wijzigLl(); }));
      ab.append(rij);
    }
  }

  const alg = blok('Een woordje van de leerkracht', 'Tik een zin uit je zinnenbank aan om hem toe te voegen. ✨ maakt een voorstel op basis van de punten en symbolen (zonder de naam van de leerling).');
  const ta = el('textarea', 'zr-alg-in');
  ta.rows = 4;
  ta.maxLength = 2000;
  ta.value = data.alg || '';
  ta.addEventListener('input', () => { data.alg = ta.value; wijzigLl(); });
  const chips = el('div', 'zr-chips');
  for (const z of zr.opmaak.zinnen) {
    const c = el('button', 'zr-chip', Z.metNaam(z, leerling.naam));
    c.type = 'button';
    c.addEventListener('click', () => {
      ta.value = (ta.value.trim() ? `${ta.value.trim()} ` : '') + z;
      data.alg = ta.value;
      wijzigLl();
    });
    chips.append(c);
  }
  const ai = el('button', 'secondary zr-ai-knop', '✨ Stel een commentaar voor');
  ai.type = 'button';
  ai.addEventListener('click', () => commentaarVoorstel(lid, ta));
  alg.append(ta, chips, ai);

  const afw = blok('Afwezigheden', 'In halve dagen. Leeg of 0 = niets op het rapport.');
  const rij = el('div', 'row zr-afw-rij');
  for (const [k, label] of [['g', 'Gewettigd'], ['o', 'Zonder wettiging']]) {
    const lab = el('label', '', label);
    const inp = el('input');
    inp.type = 'number';
    inp.min = 0;
    inp.step = 0.5;
    inp.value = data.afw[k] || '';
    inp.addEventListener('input', () => { data.afw[k] = Math.max(0, Number(inp.value) || 0); wijzigLl(); });
    lab.append(inp);
    rij.append(lab);
  }
  afw.append(rij);
  voorbeeld();
}

function wijzigLl() {
  bewaarRapport();
  voorbeeld();
  const knop = $('zr-namen').querySelector('.zr-naam.on small');
  if (knop) { const n = klaarTeller(zr.lid); knop.textContent = n ? `${n} ✓` : ''; }
}

// Commentaar voorstellen: met een AI-sleutel meteen, anders via kopiëren en plakken in een chatbot.
let aiDoel = null;
function commentaarVoorstel(lid, ta) {
  const r = zr.data.rapport;
  const data = ll(lid);
  const vakken = r.vakken.map(v => {
    const t = Z.totaal(zr.data, lid, v);
    return { naam: v.naam, pct: v.punten ? t.pct : null, symbool: data.s[v.id] ? Z.labelVan(zr.opmaak, data.s[v.id]) : '' };
  });
  const attitudes = r.attitudes.map(a => ({ tekst: a.tekst, symbool: data.s[`a-${a.id}`] ? Z.labelVan(zr.opmaak, data.s[`a-${a.id}`]) : '' }));
  const naam = (zr.data.klas.leerlingen.find(l => l.id === lid) || {}).naam;
  aiDoel = { ta, data, naam };
  const knop = document.querySelector('.zr-ai-knop');
  knop.disabled = true;
  knop.textContent = '✨ Even denken…';
  socket.emit('zr-commentaar', { vakken, attitudes }, res => {
    knop.disabled = false;
    knop.textContent = '✨ Stel een commentaar voor';
    if (res.error) return Ui.melding(res.error);
    if (res.commentaar) return zetCommentaar(res.commentaar);
    $('zr-ai').dataset.prompt = res.prompt;
    $('zr-ai-plak').value = '';
    $('zr-ai-fout').textContent = res.fout ? `De AI lukte niet (${res.fout}). Probeer het via een chatbot.` : '';
    $('zr-ai').showModal();
  });
}
function zetCommentaar(tekst) {
  const { ta, data } = aiDoel;
  ta.value = tekst;
  data.alg = tekst;
  wijzigLl();
}
$('zr-ai-kopieer').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('zr-ai').dataset.prompt); $('zr-ai-kopieer').textContent = '✓ Gekopieerd'; } catch {
    $('zr-ai-plak').value = $('zr-ai').dataset.prompt;
    $('zr-ai-plak').select();
  }
  setTimeout(() => { $('zr-ai-kopieer').textContent = '📋 Kopieer de vraag'; }, 2000);
});
$('zr-ai-ok').addEventListener('click', () => {
  socket.emit('zr-commentaar-lees', $('zr-ai-plak').value, res => {
    if (res.error) { $('zr-ai-fout').textContent = res.error; return; }
    $('zr-ai').close();
    zetCommentaar(res.commentaar);
  });
});

// ---------- Het voorbeeld rechts: het echte blad, verkleind ----------

function voorbeeld() {
  const doel = zr.tab === 'opmaak' ? $('zr-voorbeeld-op') : $('zr-voorbeeld-ll');
  if (!zr.data || !doel || !zr.data.klas.leerlingen.length) return;
  doel.innerHTML = Z.blad(zr.data, zr.opmaak, zr.lid);
  schaal(doel);
}
function schaal(doel) {
  const blad = doel.firstElementChild;
  if (!blad) return;
  const breed = doel.parentElement.clientWidth;
  const f = Math.min(1, breed / blad.offsetWidth);
  doel.style.transform = `scale(${f})`;
  doel.style.height = `${blad.offsetHeight * f}px`;
}
window.addEventListener('resize', () => { if (zr.tab !== 'punten') voorbeeld(); });

// ---------- Opmaak ----------

const SJABLONEN = [
  ['perkament', '📜 Perkament', 'Warm papier met een lakzegel, zoals een rol uit de burcht.'],
  ['strak', '📄 Strak', 'Wit en sober, met dunne lijnen.'],
  ['kleurrijk', '🌈 Kleurrijk', 'Elk vak een vrolijk gekleurde kaart.'],
  ['compact', '🗜️ Compact', 'Twee kolommen, alles op één blad.'],
];
const SETS = [['ridder', 'Kroon, duim, vinkje, plantje'], ['smileys', 'Smileys'], ['sterren', 'Sterren'], ['woorden', 'Woorden (zeer goed, goed...)']];
const KLEUREN = ['#1f4e8c', '#0f766e', '#7c3aed', '#b91c1c', '#c2410c', '#a16207', '#15803d', '#334155'];
const TOON = [
  ['onderdelen', '📋', 'Elke toets apart', 'Per vak elke toets of elk onderdeel met de punten.'],
  ['inhoud', '🔎', 'Korte inhoud', 'Klein onder elke toets: waarover ging het?'],
  ['totaal', '➕', 'Totaal per vak', 'De som van alle punten van het vak.'],
  ['procent', '%', 'Procent', 'Naast het totaal ook het percent.'],
  ['balkjes', '📊', 'Balkje', 'Een balkje per vak: in één oogopslag hoe goed het ging.'],
  ['gemiddelde', '👥', 'Klasgemiddelde', 'Een streepje op het balkje: het gemiddelde van de klas.'],
  ['evolutie', '📈', 'Evolutie', 'Een pijltje: beter ▲ of minder ▼ dan het vorige rapport.'],
  ['niveau', '🛡️', 'Niveau per vak', 'Page, Schildknaap of Ridder, zoals in Mijn klas.'],
  ['symbool', '👑', 'Symbool per vak', 'Kroon, duim, vinkje of plantje naast het vak.'],
  ['commentaar', '💬', 'Commentaar per vak', 'Een zinnetje onder elk vak.'],
  ['attitudes', '🤝', 'Hoe werk ik?', 'De zinnen over houding en werkwijze, met een symbool.'],
  ['algemeen', '✍️', 'Woordje van de leerkracht', 'Het algemene commentaar.'],
  ['afwezig', '🗓️', 'Afwezigheden', 'Hoeveel halve dagen afwezig.'],
  ['legenda', '🔤', 'Uitleg van de symbolen', 'Onderaan: wat elk symbool betekent.'],
  ['handtekening', '🖊️', 'Handtekeningen', 'Vakjes voor leerkracht, directie en ouders.'],
  ['strookje', '✂️', 'Strookje terug naar school', 'Onderaan een strookje om af te knippen en te tekenen.'],
  ['zegel', '🔴', 'Lakzegel', 'Een zegel met de eerste letter van de naam.'],
];

function tekenOpmaak() {
  const o = zr.opmaak;
  const r = zr.data.rapport;
  const box = $('zr-opties');
  box.replaceChildren();
  const blok = (titel, uitleg) => {
    const p = el('div', 'panel zr-invul-blok');
    p.append(el('h3', '', titel));
    if (uitleg) p.append(el('p', 'muted small', uitleg));
    box.append(p);
    return p;
  };
  const wijzig = () => { bewaarOpmaak(); voorbeeld(); };

  // Sjabloon
  const sj = blok('Opmaak', 'Kies hoe je rapport eruitziet. Het geldt voor al je rapporten.');
  const sjr = el('div', 'zr-keuzes');
  for (const [id, naam, zin] of SJABLONEN) {
    const b = el('button', `zr-keuze${o.sjabloon === id ? ' on' : ''}`);
    b.type = 'button';
    b.innerHTML = `<strong>${naam}</strong><span>${zin}</span>`;
    b.addEventListener('click', () => { o.sjabloon = id; tekenOpmaak(); wijzig(); });
    sjr.append(b);
  }
  sj.append(sjr);
  const kl = el('div', 'zr-kleuren');
  for (const k of KLEUREN) {
    const b = el('button', `zr-kleur${o.kleur === k ? ' on' : ''}`);
    b.type = 'button';
    b.style.background = k;
    b.setAttribute('aria-label', `Kleur ${k}`);
    b.addEventListener('click', () => { o.kleur = k; tekenOpmaak(); wijzig(); });
    kl.append(b);
  }
  const eigen = el('input');
  eigen.type = 'color';
  eigen.value = o.kleur;
  eigen.title = 'Eigen kleur';
  eigen.addEventListener('change', () => { o.kleur = eigen.value; tekenOpmaak(); wijzig(); });
  kl.append(eigen);
  sj.append(kl);

  // School en logo
  const sc = blok('School en logo', 'Komt bovenaan elk rapport.');
  const logo = el('div', 'zr-logo-rij');
  if (o.logo) {
    const img = el('img', 'zr-logo-mini');
    img.src = o.logo;
    img.alt = 'Logo';
    logo.append(img);
  }
  const up = el('label', 'button secondary');
  up.innerHTML = `${Ui.ic('upload')} ${o.logo ? 'Ander logo' : 'Logo toevoegen'}`;
  const file = el('input');
  file.type = 'file';
  file.accept = 'image/*';
  file.hidden = true;
  file.addEventListener('change', () => file.files[0] && leesLogo(file.files[0]));
  up.append(file);
  logo.append(up);
  if (o.logo) {
    const weg = el('button', 'secondary', 'Logo weg');
    weg.addEventListener('click', () => { o.logo = ''; tekenOpmaak(); wijzig(); });
    logo.append(weg);
  }
  sc.append(logo);
  const velden = el('div', 'zr-velden');
  for (const [k, label, max] of [['school', 'Naam van de school', 80], ['adres', 'Adres of slogan', 120], ['leerkracht', 'Leerkracht', 60], ['directie', 'Directie', 60], ['schooljaar', 'Schooljaar', 20]]) {
    const lab = el('label', '', label);
    const inp = el('input');
    inp.maxLength = max;
    inp.value = o[k] || '';
    inp.addEventListener('input', () => { o[k] = inp.value; wijzig(); });
    lab.append(inp);
    velden.append(lab);
  }
  sc.append(velden);

  // Symbolen
  const sy = blok('Symbolen', 'Vier symbolen, van best naar "groeit nog". Je kan de woorden erbij aanpassen.');
  const syr = el('div', 'zr-keuzes');
  for (const [id, naam] of SETS) {
    const b = el('button', `zr-keuze${o.set === id ? ' on' : ''}`);
    b.type = 'button';
    b.innerHTML = `<span class="zr-set">${Z.SYMBOLEN.map(s => Z.symbool({ ...o, set: id }, s, false)).join('')}</span><span>${naam}</span>`;
    b.addEventListener('click', () => { o.set = id; o.labels = {}; tekenOpmaak(); wijzig(); });
    syr.append(b);
  }
  sy.append(syr);
  const lab = el('div', 'zr-velden');
  for (const s of Z.SYMBOLEN) {
    const l = el('label', 'zr-symlabel');
    l.innerHTML = Z.symbool({ ...o, labels: {} }, s, false);
    const inp = el('input');
    inp.maxLength = 30;
    inp.placeholder = Z.LABELS[o.set][s];
    inp.value = (o.labels && o.labels[s]) || '';
    inp.addEventListener('input', () => { o.labels = { ...o.labels, [s]: inp.value }; voorbeeld(); bewaarOpmaak(); });
    l.append(inp);
    lab.append(l);
  }
  sy.append(lab);

  // Punten
  const pu = blok('Punten', 'Hoe het totaal per vak op het rapport komt.');
  const sel = el('select');
  for (const [w, t] of [[0, 'Zoals ze zijn (bv. 87/120)'], [10, 'Herleid op 10'], [20, 'Herleid op 20'], [100, 'Herleid op 100']]) sel.append(new Option(t, w));
  sel.value = o.herleid;
  sel.addEventListener('change', () => { o.herleid = Number(sel.value); wijzig(); });
  pu.append(sel);

  // Wat staat erop
  const wa = blok('Wat staat er op het rapport?', 'Zet aan wat je wil tonen.');
  const lijst = el('div', 'zr-toon');
  for (const [k, icoon, naam, zin] of TOON) {
    const l = el('label', 'zr-schakel');
    const c = el('input');
    c.type = 'checkbox';
    c.checked = !!o.toon[k];
    c.addEventListener('change', () => { o.toon[k] = c.checked; wijzig(); });
    l.append(c);
    const t = el('span');
    t.innerHTML = `<b>${icoon} ${naam}</b><small>${zin}</small>`;
    l.append(t);
    lijst.append(l);
  }
  wa.append(lijst);

  // Hoe werk ik? (dit rapport)
  const hw = blok(`Hoe werk ik? · ${r.titel}`, 'De zinnen die bij elke leerling een symbool krijgen. Voor dit rapport.');
  const att = el('div', 'zr-att-lijst');
  r.attitudes.forEach((a, i) => {
    const rij = el('div', 'zr-att-rij');
    const inp = el('input');
    inp.maxLength = 100;
    inp.value = a.tekst;
    inp.addEventListener('input', () => { a.tekst = inp.value; bewaarRapport(); voorbeeld(); });
    const weg = el('button', 'secondary icon');
    weg.innerHTML = Ui.ic('kruis');
    weg.title = 'Zin weghalen';
    weg.addEventListener('click', () => { r.attitudes.splice(i, 1); bewaarRapport(); tekenOpmaak(); voorbeeld(); });
    rij.append(inp, weg);
    att.append(rij);
  });
  const plus = el('button', 'secondary');
  plus.innerHTML = `${Ui.ic('plus')} Zin toevoegen`;
  plus.addEventListener('click', () => { r.attitudes.push({ id: Math.random().toString(16).slice(2, 10), tekst: 'Ik ...' }); bewaarRapport(); tekenOpmaak(); });
  hw.append(att, plus);

  // Boodschap
  const bo = blok(`Boodschap voor alle ouders · ${r.titel}`, 'Komt op elk rapport, bv. de datum van het oudercontact.');
  const bta = el('textarea');
  bta.rows = 3;
  bta.maxLength = 600;
  bta.value = r.boodschap || '';
  bta.addEventListener('input', () => { r.boodschap = bta.value; bewaarRapport(); voorbeeld(); });
  bo.append(bta);

  // Zinnenbank
  const zb = blok('Zinnenbank', 'Eén zin per regel. Je tikt ze aan bij 👤 Per leerling. {naam} wordt de voornaam.');
  const zta = el('textarea');
  zta.rows = 6;
  zta.value = o.zinnen.join('\n');
  zta.addEventListener('input', () => { o.zinnen = zta.value.split('\n').map(z => z.trim()).filter(Boolean); bewaarOpmaak(); });
  zb.append(zta);

  // Voorbeeld van welke leerling
  if (zr.data.klas.leerlingen.length) {
    const kies = el('select', 'zr-vb-kies');
    for (const l of zr.data.klas.leerlingen) kies.append(new Option(`Voorbeeld: ${l.naam}`, l.id));
    kies.value = zr.lid;
    kies.addEventListener('change', () => { zr.lid = kies.value; voorbeeld(); });
    box.prepend(kies);
  }
  voorbeeld();
}

// Een logo klein maken (max 480 px, webp): zo blijft het rapport licht.
function leesLogo(f) {
  const img = new Image();
  img.onload = () => {
    const f2 = Math.min(1, 480 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * f2);
    c.height = Math.round(img.height * f2);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    zr.opmaak.logo = c.toDataURL('image/webp', 0.85);
    URL.revokeObjectURL(img.src);
    tekenOpmaak();
    bewaarOpmaak();
  };
  img.onerror = () => Ui.melding('Dat bestand is geen afbeelding.');
  img.src = URL.createObjectURL(f);
}

start();
