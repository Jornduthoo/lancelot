// In Beeld: maakt de bestanden voor lancelot.network/inbeeld uit de kaartenbank.
//   node website/inbeeld/bouw.js
// - site/inbeeld/data/kaarten.js   : alle kaarten voor de website (kort, zonder overbodige velden)
// - site/inbeeld/api/index.json    : de lijst van sets voor LANcelot (zie docs/inbeeld-formaat.md)
// - site/inbeeld/api/sets/*.json   : één set per leerjaar, in het formaat dat LANcelot verwacht
// Beelden staan als webp in site/inbeeld/api/beelden/<nr>.webp (website en LANcelot gebruiken dezelfde).
const fs = require('fs');
const path = require('path');

const HIER = __dirname;
const UIT = path.join(HIER, '..', 'site', 'inbeeld');
const BEELDEN = path.join(UIT, 'api', 'beelden');
const LJ = ['JK', 'K2', 'K3', '1', '2', '3', '4', '5', '6'];
const LJ_NAAM = ['Jongste kleuters', '2de kleuterklas', '3de kleuterklas', '1ste leerjaar', '2de leerjaar', '3de leerjaar', '4de leerjaar', '5de leerjaar', '6de leerjaar'];
const VAK = { NL: 'Nederlands', WIS: 'Wiskunde', WO: 'Wetenschap en techniek', S: 'Schooltaal' };

function lees() {
  const ruw = JSON.parse(fs.readFileSync(path.join(HIER, 'kaartenbank.json'), 'utf8'));
  // Per beeld een korte vingerafdruk: verandert het beeld, dan verandert de url (?v=...) en haalt de browser het nieuwe.
  const beelden = new Map((fs.existsSync(BEELDEN) ? fs.readdirSync(BEELDEN).filter(f => f.endsWith('.webp')) : [])
    .map(f => [f.slice(0, -5), require('crypto').createHash('sha1').update(fs.readFileSync(path.join(BEELDEN, f))).digest('hex').slice(0, 8)]));
  return ruw.map(k => ({
    n: k.nr,
    w: k.woord.trim(),
    u: (k.uitleg || '').trim(),
    z: (k.voorbeeld || '').trim(),
    v: k.vak,
    s: k.start,
    t: (k.terug || []).filter(x => x > k.start),
    d: k.domein,
    c: (k.cluster || '').replace(/:\s*begrippen$/i, ''),
    r: (k.verwant || []).filter(x => x !== k.nr),
    f: k.verwant_vorm || '',
    o: k.codes || [],
    b: beelden.get(k.nr) || 0,
  }));
}

function bouw() {
  const kaarten = lees();
  const nrs = new Set(kaarten.map(k => k.n));
  for (const k of kaarten) k.r = k.r.filter(x => nrs.has(x));
  fs.mkdirSync(path.join(UIT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(UIT, 'data', 'kaarten.js'),
    '// Gemaakt door website/inbeeld/bouw.js uit de kaartenbank. Niet met de hand aanpassen.\n' +
    'window.KAARTEN=' + JSON.stringify(kaarten) + ';\n');

  // Voor LANcelot
  const api = path.join(UIT, 'api');
  fs.rmSync(path.join(api, 'sets'), { recursive: true, force: true });
  fs.mkdirSync(path.join(api, 'sets'), { recursive: true });
  const sets = [];
  LJ.forEach((lj, i) => {
    const lijst = kaarten.filter(k => k.s === i || k.t.includes(i)).map(k => ({
      nr: k.n,
      woord: k.w,
      uitleg: k.u,
      zin: k.z,
      ...(k.b ? { beeld: `beelden/${k.n}.webp` } : {}),
      leerjaren: [k.s, ...k.t].map(x => LJ[x]),
      doelen: k.o,
      verwant: k.r,
      vak: VAK[k.v],
    }));
    const id = `leerjaar-${lj.toLowerCase()}`;
    fs.writeFileSync(path.join(api, 'sets', `${id}.json`), JSON.stringify({ titel: LJ_NAAM[i], kaarten: lijst }));
    sets.push({ id, titel: LJ_NAAM[i], soort: 'leerjaar', leerjaren: [lj], aantal: lijst.length });
  });
  fs.writeFileSync(path.join(api, 'index.json'), JSON.stringify({ sets }, null, 1));
  return { kaarten: kaarten.length, beelden: kaarten.filter(k => k.b).length, sets: sets.length };
}

if (require.main === module) console.log(bouw());
module.exports = { bouw, lees, LJ };
