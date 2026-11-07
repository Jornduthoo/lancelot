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
    prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '500', iiextmetadatafilter: 'Artist|LicenseShortName',
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
  if (!/^image\/(png|jpe?g)/.test(soort)) throw new Error('Die foto lukt niet. Kies een andere.');
  return bewaar(buf, soort);
}

// Bewaart een foto (jpg of png) in de klasmap. Ook voor een foto die de browser van de leerkracht zelf ophaalde.
function bewaar(data, soort) {
  const buf = Buffer.isBuffer(data) ? data : data instanceof ArrayBuffer ? Buffer.from(data) : data && data.buffer ? Buffer.from(data.buffer) : null;
  const ext = /png/.test(soort) ? 'png' : /jpe?g/.test(soort) ? 'jpg' : null;
  if (!buf || !buf.length || !ext || buf.length > MAX) throw new Error('Die foto lukt niet. Kies een andere.');
  const kop = buf.subarray(0, 4).toString('hex');
  if (!(ext === 'png' ? kop === '89504e47' : kop.startsWith('ffd8'))) throw new Error('Die foto lukt niet. Kies een andere.');
  const naam = `${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16)}.${ext}`;
  fs.mkdirSync(MAP, { recursive: true });
  const f = path.join(MAP, naam);
  if (!fs.existsSync(f)) fs.writeFileSync(f, buf);
  return naam;
}

const bestand = naam => (NAAM.test(String(naam)) ? path.join(MAP, naam) : null);

// De eigen stem van de leerkracht bij een vraag (Maken > 🎤): een kort geluidsbestand uit de browser, in de klasmap.
const STEM_MAP = path.join(gegevens.pad('klas'), 'junior-stem');
const STEM_NAAM = /^[a-f0-9]{16}\.(webm|ogg|m4a)$/;
const STEM_MAX = 700 * 1024;
function stemBewaar(data, soort) {
  const buf = Buffer.isBuffer(data) ? data : data instanceof ArrayBuffer ? Buffer.from(data) : data && data.buffer ? Buffer.from(data.buffer) : null;
  const ext = /webm/.test(soort) ? 'webm' : /ogg/.test(soort) ? 'ogg' : /mp4|aac|m4a/.test(soort) ? 'm4a' : null;
  if (!buf || !buf.length || !ext) throw new Error('Opnemen lukte niet. Probeer opnieuw.');
  if (buf.length > STEM_MAX) throw new Error('De opname is te lang. Hou het kort (maximaal 10 seconden).');
  const naam = `${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16)}.${ext}`;
  fs.mkdirSync(STEM_MAP, { recursive: true });
  const f = path.join(STEM_MAP, naam);
  if (!fs.existsSync(f)) fs.writeFileSync(f, buf);
  return naam;
}
const stemBestand = naam => (STEM_NAAM.test(String(naam)) ? path.join(STEM_MAP, naam) : null);

module.exports = { zoek, neem, bewaar, bestand, NAAM, stemBewaar, stemBestand, STEM_NAAM };
