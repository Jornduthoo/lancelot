// LANcelot Junior · echte foto's bij de eigen vragen (blok Maken), van Wikimedia Commons (vrije licenties).
// Zoeken en ophalen gebeurt één keer op de pc van de leerkracht (met internet); de foto wordt dan bewaard in de klasmap,
// zodat de tablets ze over het schoolnetwerk krijgen, ook tijdens het spel.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const gegevens = require('./gegevens');

const MAP = path.join(gegevens.pad('klas'), 'junior-fotos');
const UA = 'LANcelot/1.0 (klasapp; https://lancelot.network)';
const MAX = 800 * 1024;
const NAAM = /^[a-f0-9]{16}\.(jpg|png)$/;
const tekst = html => String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);

async function zoek(woord) {
  const q = String(woord || '').trim().slice(0, 60);
  if (!q) throw new Error('Typ eerst een woord.');
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '16',
    prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '400', iiextmetadatafilter: 'Artist|LicenseShortName',
  });
  let data;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    data = await res.json();
  } catch {
    throw new Error('Foto\'s zoeken lukt niet. Is er internet op deze pc?');
  }
  const paginas = Object.values((data.query && data.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  return paginas.map(p => {
    const i = (p.imageinfo || [])[0] || {};
    const m = i.extmetadata || {};
    return { thumb: i.thumburl, mime: i.mime, bron: [tekst(m.Artist && m.Artist.value), tekst(m.LicenseShortName && m.LicenseShortName.value)].filter(Boolean).join(', ') };
  }).filter(f => f.thumb && /^image\/(jpeg|png)$/.test(f.mime)).slice(0, 12).map(({ thumb, bron }) => ({ thumb, bron }));
}

// Haalt één foto op (alleen van upload.wikimedia.org) en bewaart ze in de klasmap. Geeft de bestandsnaam terug.
async function neem(thumb) {
  let u;
  try { u = new URL(String(thumb)); } catch { throw new Error('Die foto lukt niet.'); }
  if (u.protocol !== 'https:' || u.hostname !== 'upload.wikimedia.org') throw new Error('Die foto lukt niet.');
  let buf, soort;
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
    soort = res.headers.get('content-type') || '';
    buf = Buffer.from(await res.arrayBuffer());
  } catch {
    throw new Error('De foto ophalen lukt niet. Is er internet op deze pc?');
  }
  const ext = /png/.test(soort) ? 'png' : /jpe?g/.test(soort) ? 'jpg' : null;
  if (!ext || buf.length > MAX) throw new Error('Die foto lukt niet. Kies een andere.');
  const naam = `${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16)}.${ext}`;
  fs.mkdirSync(MAP, { recursive: true });
  const f = path.join(MAP, naam);
  if (!fs.existsSync(f)) fs.writeFileSync(f, buf);
  return naam;
}

const bestand = naam => (NAAM.test(String(naam)) ? path.join(MAP, naam) : null);

module.exports = { zoek, neem, bestand, NAAM };
