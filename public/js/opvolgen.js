// Mijn klas › Opvolgen: leerlingen × taken en toetsen in één tabel (src/opvolgen.js).
// Grijs = nog niet begonnen, geel = bezig, blauw = te verbeteren, groen = klaar (met punt), – = niet voor deze leerling.
const socket = io({ query: { role: 'host' } });
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = n => String(Math.round(Number(n) * 10) / 10).replace('.', ',');
const key = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
KlasKiezer.start(socket, $('klaskiezer'));
$('brand').addEventListener('click', () => { location.href = '/host'; });
$('to-home').addEventListener('click', () => { location.href = '/host'; });

let data = null;
const SOORT = { oefenblad: '📄', quiz: '❓', proef: '📝' };
// De gekozen filters blijven staan (per toestel).
const BEWAAR = 'lancelot-opvolgen';
try {
  const f = JSON.parse(localStorage.getItem(BEWAAR) || '{}');
  for (const k of ['periode', 'soort']) if (f[k] !== undefined && $(`op-${k}`).querySelector(`option[value="${f[k]}"]`)) $(`op-${k}`).value = f[k];
  if (f.vak) $('op-vak').dataset.wil = f.vak;
} catch {}

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
  if (v.status === 'nieuw') return '';
  if (v.status === 'bezig') return (v.totaal ? `${v.gedaan}/${v.totaal}` : '…') + (v.elders ? ' 💻' : '');
  if (v.status === 'verbeteren') return v.max ? `${nl(v.punten)}/${nl(v.max)} ✎` : '✎';
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

function teken() {
  if (!data) return;
  // De vakken uit de taken zelf (niets vast).
  const vakSel = $('op-vak');
  const wil = vakSel.value || vakSel.dataset.wil || '';
  const vakken = [...new Set(data.kolommen.map(k => k.vak).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
  vakSel.innerHTML = '<option value="">Alle vakken</option>' + vakken.map(v => `<option>${esc(v)}</option>`).join('');
  vakSel.value = vakken.includes(wil) ? wil : '';
  delete vakSel.dataset.wil;
  vakSel.parentElement.classList.toggle('hidden', !vakken.length);
  try { localStorage.setItem(BEWAAR, JSON.stringify({ periode: $('op-periode').value, soort: $('op-soort').value, vak: vakSel.value })); } catch {}

  const kol = data.kolommen.filter(k => inPeriode(k.dag) && (!$('op-soort').value || k.soort === $('op-soort').value) && (!vakSel.value || k.vak === vakSel.value));
  const rijen = data.rijen;
  const leeg = !kol.length || !rijen.length;
  $('op-leeg').classList.toggle('hidden', !leeg);
  $('op-leeg').textContent = !rijen.length ? 'Er staat nog geen klaslijst. Zet je leerlingen in Mijn klas › Klas.'
    : 'Geen taken of toetsen in deze periode. Kies een andere periode of geef een taak bij Taken.';
  $('op-wrap').classList.toggle('hidden', leeg);
  if (leeg) return;

  const dagTekst = d => new Date(d).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });
  const kop = kol.map(k => {
    const voor = rijen.filter(r => k.vakjes[key(r.naam)]);
    const klaar = voor.filter(r => ['klaar', 'verbeteren'].includes(k.vakjes[key(r.naam)].status)).length;
    return `<th class="op-kol" title="${esc(k.titel)}"><a href="${k.soort === 'proef' && k.afname ? `/proef?verbeter=${encodeURIComponent(k.afname)}` : `/taken?soort=${k.soort}`}">
      <span class="op-kol-titel">${SOORT[k.soort] || ''} ${esc(k.titel)}</span>
      <span class="op-kol-dag">${esc(dagTekst(k.dag))}${k.gepland && Date.parse(k.dag) > Date.now() ? ' ⏰' : ''}${k.vak ? ` · ${esc(k.vak)}` : ''}</span>
      <span class="op-kol-tel">${klaar}/${voor.length} klaar</span></a></th>`;
  }).join('');
  const lijnen = rijen.map(r => {
    const k0 = key(r.naam);
    let open = 0;
    const cellen = kol.map(k => {
      const v = k.vakjes[k0];
      if (v && (v.status === 'nieuw' || v.status === 'bezig')) open++;
      if (!v) return '<td class="op-v niet" title="' + esc(vakjeTitel(r.naam, k, v)) + '">–</td>';
      const pct = v.max ? v.punten / v.max : null;
      return `<td class="op-v ${v.status}${v.inhalen ? ' inhalen' : ''}${pct !== null && v.status === 'klaar' ? (pct >= .8 ? ' hoog' : pct < .5 ? ' laag' : '') : ''}" title="${esc(vakjeTitel(r.naam, k, v))}"><a href="${doel(k, r.naam, v)}">${esc(vakjeTekst(v))}</a></td>`;
    }).join('');
    return `<tr><th class="op-naam" scope="row">${esc(r.naam)}<span class="op-open${open ? '' : ' nul'}">${open ? `nog ${open} open` : '✔ alles af'}</span></th>${cellen}</tr>`;
  }).join('');
  $('op-gasten').textContent = (data.gasten || []).length ? `👤 Gasten staan niet in de tabel: ${data.gasten.join(', ')}.` : '';
  $('op-wrap').innerHTML = `<table class="op-tabel"><thead><tr><th class="op-hoek">Leerling</th>${kop}</tr></thead><tbody>${lijnen}</tbody></table>`;
}

function laad() {
  socket.emit('op-overzicht', null, res => {
    if (!res || res.error) return;
    data = res;
    teken();
  });
}
for (const id of ['op-periode', 'op-soort', 'op-vak']) $(id).addEventListener('change', teken);
socket.on('connect', laad);
// Live: een leerling werkt, levert in, of je verbeterde (ook op een andere pc).
let timer = null;
const later = () => { clearTimeout(timer); timer = setTimeout(laad, 700); };
socket.on('tk-lijst', later);
socket.on('pf-afnames', later);
