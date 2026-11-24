// Instellingen › Taken: de standaardkeuzes bij een nieuwe taak (wensenlijst 20 nov, punt 5).
// Eén rij voor alles, en per vak een rij met "= standaard" of een uitzondering. Gebruikt socket en $ uit host.js.
(() => {
  if (!$('ts-raster')) return;
  const VELDEN = [
    { k: 'voorlees', kop: 'Voorlezen 🔊 (toets)', opties: [['uit', 'Uit'], ['page', 'Voor 🪶 Page'], ['iedereen', 'Iedereen']] },
    { k: 'volgorde', kop: 'Volgorde (toets)', opties: [['schud', 'Alles door elkaar'], ['vragen', 'Vragen in volgorde'], ['alles', 'Alles in volgorde']] },
    { k: 'uitslag', kop: 'Punten tonen (toets)', opties: [['nee', 'Na het verbeteren'], ['ja', 'Meteen na het inleveren']] },
    { k: 'beveiligd', kop: 'Volledig scherm 🛡 (toets)', opties: [['ja', 'Aan'], ['nee', 'Uit']] },
    { k: 'feedback', kop: 'Verbeteren (oefenblad)', opties: [['direct', 'Meteen'], ['inleveren', 'Na het inleveren']] },
    { k: 'startuur', kop: 'Startuur (gepland)', uur: true },
  ];
  let data = null;
  const LEEG = 'Leeg = standaard';
  const JANEE = ['uitslag', 'beveiligd'];
  const waarde = (v, k) => (JANEE.includes(k) ? (v === undefined ? undefined : v ? 'ja' : 'nee') : v);
  function teken() {
    const rij = (id, naam, v, vak) => `<tr data-rij="${id}"><th>${naam}</th>${VELDEN.map(f => {
      const w = waarde(v[f.k], f.k);
      if (f.uur) return `<td><input type="time" data-k="${f.k}" value="${w || ''}"${vak ? ` title="${LEEG}"` : ''}></td>`;
      return `<td><select data-k="${f.k}">${vak ? `<option value="">= standaard</option>` : ''}${f.opties.map(([o, t]) => `<option value="${o}"${w === o ? ' selected' : ''}>${t}</option>`).join('')}</select></td>`;
    }).join('')}</tr>`;
    $('ts-raster').innerHTML = `<tr><th></th>${VELDEN.map(f => `<th>${f.kop}</th>`).join('')}</tr>`
      + rij('', '<b>Alle vakken</b>', data.algemeen, false)
      + data.vakgroepen.map(g => rij(g.id, g.naam, data.vakken[g.id] || {}, true)).join('');
  }
  function lees() {
    const uit = { algemeen: {}, vakken: {} };
    for (const tr of $('ts-raster').querySelectorAll('tr[data-rij]')) {
      const d = {};
      for (const el of tr.querySelectorAll('[data-k]')) {
        if (!el.value) continue;
        d[el.dataset.k] = JANEE.includes(el.dataset.k) ? el.value === 'ja' : el.value;
      }
      if (tr.dataset.rij) uit.vakken[tr.dataset.rij] = d; else uit.algemeen = d;
    }
    return uit;
  }
  function laad(r) {
    if (!r || r.error) return;
    data = r;
    teken();
    $('ts-vandaag').checked = r.vandaag !== false;
  }
  // Vandaag op het startscherm (punt 9): meteen bewaard bij een klik.
  $('ts-vandaag').addEventListener('change', e => socket.emit('vandaag-zet', e.target.checked, laad));
  socket.emit('tk-standaard', null, laad);
  socket.on('tk-standaard', r => { if (!$('ts-raster').contains(document.activeElement)) laad(r); });
  $('ts-bewaar').addEventListener('click', () => {
    socket.emit('tk-standaard-zet', lees(), r => {
      if (r && r.error) return ($('ts-info').textContent = r.error);
      laad(r);
      $('ts-info').textContent = '✓ Bewaard.';
      setTimeout(() => { $('ts-info').textContent = ''; }, 3000);
    });
  });
  $('ts-reset').addEventListener('click', async () => {
    if (!await Ui.vraag('Alle keuzes terug naar de standaard van LANcelot zetten?', { ja: 'Ja', nee: 'Nee' })) return;
    socket.emit('tk-standaard-zet', {}, laad);
  });
})();
