// Een MSIX-pakket maken zonder Windows SDK. Een MSIX is een zip (altijd zip64) met daarin:
// - de bestanden van de app, elk in blokken van 64 kB: gedeflate blok per blok (Z_FULL_FLUSH), of opgeslagen;
// - AppxManifest.xml, AppxBlockMap.xml (SHA-256 van elk blok) en [Content_Types].xml.
// Dezelfde opbouw als makemsix van Microsoft (github.com/microsoft/msix-packaging, src/msix/pack).
// De Store ondertekent het pakket zelf; een eigen handtekening (AppxSignature.p7x) is dus niet nodig.
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const { crc32 } = require('../../src/zip');

const BLOK = 65536;
// Wat al gecomprimeerd is, wordt opgeslagen (zoals makemsix): afbeeldingen, video, zips.
const OPGESLAGEN = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'webm', 'mp4', 'mp3', 'm4a', 'ogg', 'zip', 'gz', 'woff2', 'glb']);
const TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', ico: 'image/vnd.microsoft.icon', svg: 'image/svg+xml',
  exe: 'application/x-msdownload', dll: 'application/x-msdownload', json: 'application/json', js: 'application/x-javascript',
  css: 'text/css', html: 'text/html', htm: 'text/html', txt: 'text/plain', xml: 'text/xml', csv: 'text/csv', pdf: 'application/pdf',
  zip: 'application/x-zip-compressed', gz: 'application/x-gzip-compressed', mp3: 'audio/mpeg', wav: 'audio/wav',
};
const MANIFEST_TYPE = 'application/vnd.ms-appx.manifest+xml';
const BLOCKMAP_TYPE = 'application/vnd.ms-appx.blockmap+xml';

const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Namen in de zip: / als scheiding, sommige tekens en alles buiten ASCII procent-gecodeerd (zoals Encoding::EncodeFileName).
const CODEER = new Set([' ', '!', '#', '$', '%', '&', "'", '(', ')', '+', ',', ';', '=', '@', '[', ']', '^', '`', '{', '}']);
function zipNaam(naam) {
  let uit = '';
  for (const ch of naam.replace(/\\/g, '/')) {
    if (CODEER.has(ch)) uit += `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`;
    else if (ch.codePointAt(0) > 0x7e) for (const b of Buffer.from(ch, 'utf8')) uit += `%${b.toString(16).toUpperCase().padStart(2, '0')}`;
    else uit += ch;
  }
  return uit;
}
const ext = naam => (naam.match(/\.([^./\\]+)$/) || [, ''])[1].toLowerCase();

function dosNu() {
  const d = new Date();
  return {
    tijd: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    datum: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

// bestanden: [{ naam: 'public/index.html', pad: '/abs/pad' }]; manifest: tekst van AppxManifest.xml. Schrijft naar uit.
function maak({ bestanden, manifest, uit }) {
  const fd = fs.openSync(uit, 'w');
  let pos = 0;
  const schrijf = buf => { fs.writeSync(fd, buf); pos += buf.length; };
  const centraal = [];
  const kaart = [];
  const types = { defaults: new Map(), overrides: [] };
  const { tijd, datum } = dosNu();

  function typeErbij(naam, type, forceer) {
    const zn = '/' + zipNaam(naam);
    const e = ext(naam);
    if (forceer || !e) return void types.overrides.push([zn, type]);
    if (!types.defaults.has(e)) types.defaults.set(e, type);
    else if (types.defaults.get(e) !== type) types.overrides.push([zn, type]);
  }

  // Eén bestand in de zip: lokale kop, data in blokken, data descriptor (zip64). Geeft de blokken terug voor de blockmap.
  function bestand(naam, data, comprimeer, metType, inKaart) {
    // [Content_Types].xml staat er altijd letterlijk in (niet gecodeerd).
    const zn = Buffer.from(naam === '[Content_Types].xml' ? naam : zipNaam(naam), 'utf8');
    if (metType) typeErbij(naam, metType, false);
    const start = pos;
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(45, 4);
    lfh.writeUInt16LE(0x0008, 6);
    lfh.writeUInt16LE(comprimeer ? 8 : 0, 8);
    lfh.writeUInt16LE(tijd, 10);
    lfh.writeUInt16LE(datum, 12);
    lfh.writeUInt16LE(zn.length, 26);
    schrijf(lfh);
    schrijf(zn);
    const blokken = [];
    let gecomprimeerd = 0;
    for (let i = 0; i < data.length; i += BLOK) {
      const stuk = data.subarray(i, i + BLOK);
      const hash = crypto.createHash('sha256').update(stuk).digest('base64');
      if (comprimeer) {
        const z = zlib.deflateRawSync(stuk, { level: 9, memLevel: 9, finishFlush: zlib.constants.Z_FULL_FLUSH });
        schrijf(z);
        gecomprimeerd += z.length;
        blokken.push({ hash, size: z.length });
      } else {
        schrijf(stuk);
        gecomprimeerd += stuk.length;
        blokken.push({ hash });
      }
    }
    if (comprimeer) {
      // Het einde van de deflate-stroom (een leeg laatste blok), net als makemsix: hoort bij geen enkel blok.
      const eind = Buffer.from([0x03, 0x00]);
      schrijf(eind);
      gecomprimeerd += eind.length;
    }
    const dd = Buffer.alloc(24);
    dd.writeUInt32LE(0x08074b50, 0);
    dd.writeUInt32LE(crc32(data), 4);
    dd.writeBigUInt64LE(BigInt(gecomprimeerd), 8);
    dd.writeBigUInt64LE(BigInt(data.length), 16);
    schrijf(dd);
    centraal.push({ zn, crc: crc32(data), gecomprimeerd, grootte: data.length, start, methode: comprimeer ? 8 : 0 });
    if (inKaart) {
      kaart.push({ naam: naam.replace(/\//g, '\\'), grootte: data.length, lfh: 30 + zn.length, blokken });
    }
  }

  const gezien = new Set();
  for (const b of bestanden) {
    const sleutel = b.naam.toLowerCase();
    if (gezien.has(sleutel)) throw new Error(`Dubbel bestand in het pakket: ${b.naam}`);
    gezien.add(sleutel);
    const e = ext(b.naam);
    bestand(b.naam, fs.readFileSync(b.pad), !OPGESLAGEN.has(e), TYPES[e] || 'application/octet-stream', true);
  }
  // De manifest: in de blockmap, met zijn eigen type.
  bestand('AppxManifest.xml', Buffer.from(manifest, 'utf8'), true, null, true);
  typeErbij('AppxManifest.xml', MANIFEST_TYPE, true);

  const bm = ['<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    '<BlockMap xmlns="http://schemas.microsoft.com/appx/2010/blockmap" HashMethod="http://www.w3.org/2001/04/xmlenc#sha256">'];
  for (const f of kaart) {
    bm.push(`<File Name="${xml(f.naam)}" Size="${f.grootte}" LfhSize="${f.lfh}">`);
    for (const b of f.blokken) bm.push(b.size === undefined ? `<Block Hash="${b.hash}"/>` : `<Block Hash="${b.hash}" Size="${b.size}"/>`);
    bm.push('</File>');
  }
  bm.push('</BlockMap>');
  bestand('AppxBlockMap.xml', Buffer.from(bm.join(''), 'utf8'), true, null, false);
  typeErbij('AppxBlockMap.xml', BLOCKMAP_TYPE, true);

  const ct = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'];
  for (const [e, t] of types.defaults) ct.push(`<Default Extension="${xml(e)}" ContentType="${xml(t)}"/>`);
  for (const [n, t] of types.overrides) ct.push(`<Override PartName="${xml(n)}" ContentType="${xml(t)}"/>`);
  ct.push('</Types>');
  bestand('[Content_Types].xml', Buffer.from(ct.join(''), 'utf8'), true, null, false);

  // Centrale map, dan zip64-einde, zip64-locator en het gewone einde (met 0xFFFF... zoals makemsix).
  const cdStart = pos;
  for (const c of centraal) {
    const h = Buffer.alloc(46);
    h.writeUInt32LE(0x02014b50, 0);
    h.writeUInt16LE(45, 4);
    h.writeUInt16LE(45, 6);
    h.writeUInt16LE(0x0008, 8);
    h.writeUInt16LE(c.methode, 10);
    h.writeUInt16LE(tijd, 12);
    h.writeUInt16LE(datum, 14);
    h.writeUInt32LE(c.crc, 16);
    h.writeUInt32LE(c.gecomprimeerd, 20);
    h.writeUInt32LE(c.grootte, 24);
    h.writeUInt16LE(c.zn.length, 28);
    h.writeUInt32LE(c.start, 42);
    if (c.start > 0xfffffffe || c.gecomprimeerd > 0xfffffffe) throw new Error('Pakket groter dan 4 GB wordt niet ondersteund.');
    schrijf(h);
    schrijf(c.zn);
  }
  const cdGrootte = pos - cdStart;
  const z64Start = pos;
  const z64 = Buffer.alloc(56);
  z64.writeUInt32LE(0x06064b50, 0);
  z64.writeBigUInt64LE(44n, 4);
  z64.writeUInt16LE(45, 12);
  z64.writeUInt16LE(45, 14);
  z64.writeBigUInt64LE(BigInt(centraal.length), 24);
  z64.writeBigUInt64LE(BigInt(centraal.length), 32);
  z64.writeBigUInt64LE(BigInt(cdGrootte), 40);
  z64.writeBigUInt64LE(BigInt(cdStart), 48);
  schrijf(z64);
  const loc = Buffer.alloc(20);
  loc.writeUInt32LE(0x07064b50, 0);
  loc.writeBigUInt64LE(BigInt(z64Start), 8);
  loc.writeUInt32LE(1, 16);
  schrijf(loc);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0xffff, 8);
  eocd.writeUInt16LE(0xffff, 10);
  eocd.writeUInt32LE(0xffffffff, 12);
  eocd.writeUInt32LE(0xffffffff, 16);
  schrijf(eocd);
  fs.closeSync(fd);
  return { bestanden: centraal.length, grootte: pos };
}

module.exports = { maak, zipNaam };
