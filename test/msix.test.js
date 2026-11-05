// Het Store-pakket (installer/store/msix.js): blokken van 64 kB, elk apart te lezen, met de juiste SHA-256 in AppxBlockMap.xml.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { maak, zipNaam } = require('../installer/store/msix');

test('namen in het pakket worden gecodeerd zoals Windows dat verwacht', () => {
  assert.equal(zipNaam('node_modules/@socket.io/a b.js'), 'node_modules/%40socket.io/a%20b.js');
  assert.equal(zipNaam('lang\\fr\\é.json'), 'lang/fr/%C3%A9.json');
});

test('elk blok in de blockmap klopt en is apart te lezen', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-msix-'));
  const groot = Buffer.from(Array.from({ length: 150000 }, (_, i) => (i * 7919) % 251));
  fs.writeFileSync(path.join(dir, 'groot.js'), groot);
  fs.writeFileSync(path.join(dir, 'beeld.png'), Buffer.from('nep-png'));
  const uit = path.join(dir, 'test.msix');
  maak({ bestanden: [{ naam: 'src/groot.js', pad: path.join(dir, 'groot.js') }, { naam: 'Assets/beeld.png', pad: path.join(dir, 'beeld.png') }], manifest: '<Package/>', uit });
  const buf = fs.readFileSync(uit);
  // Zip64-einde: waar de centrale map begint.
  const eind = buf.length - 22 - 20 - 56;
  assert.equal(buf.readUInt32LE(eind), 0x06064b50);
  let p = Number(buf.readBigUInt64LE(eind + 48));
  const lfh = {};
  while (buf.readUInt32LE(p) === 0x02014b50) {
    const n = buf.readUInt16LE(p + 28);
    lfh[buf.toString('utf8', p + 46, p + 46 + n)] = { off: buf.readUInt32LE(p + 42), methode: buf.readUInt16LE(p + 10) };
    p += 46 + n;
  }
  assert.deepEqual(Object.keys(lfh), ['src/groot.js', 'Assets/beeld.png', 'AppxManifest.xml', 'AppxBlockMap.xml', '[Content_Types].xml']);
  const lees = naam => {
    const { off } = lfh[naam];
    const start = off + 30 + buf.readUInt16LE(off + 26);
    return zlib.inflateRawSync(buf.subarray(start, buf.indexOf(Buffer.from([0x50, 0x4b, 0x07, 0x08]), start)));
  };
  const kaart = lees('AppxBlockMap.xml').toString();
  const veld = kaart.match(/<File Name="src\\groot.js" Size="150000" LfhSize="(\d+)">(.*?)<\/File>/);
  assert.ok(veld, kaart.slice(0, 300));
  const blokken = [...veld[2].matchAll(/<Block Hash="([^"]+)" Size="(\d+)"\/>/g)];
  assert.equal(blokken.length, 3);
  let pos = lfh['src/groot.js'].off + Number(veld[1]);
  blokken.forEach(([, hash, size], i) => {
    const stuk = zlib.inflateRawSync(Buffer.concat([buf.subarray(pos, pos + Number(size)), Buffer.from([0x03, 0x00])]));
    assert.deepEqual(stuk, groot.subarray(i * 65536, (i + 1) * 65536));
    assert.equal(crypto.createHash('sha256').update(stuk).digest('base64'), hash);
    pos += Number(size);
  });
  // Afbeeldingen worden opgeslagen, niet gecomprimeerd (geen Size in de blockmap).
  assert.equal(lfh['Assets/beeld.png'].methode, 0);
  assert.match(kaart, /<File Name="Assets\\beeld.png" Size="7" LfhSize="\d+"><Block Hash="[^"]+"\/><\/File>/);
  assert.match(lees('[Content_Types].xml').toString(), /PartName="\/AppxManifest.xml" ContentType="application\/vnd.ms-appx.manifest\+xml"/);
});
