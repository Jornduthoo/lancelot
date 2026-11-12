// Mijn lesmap neemt ook de bordboeken (pdf's en afbeeldingen van Mijn methodes) mee, tussen twee LANcelots.
// Nooit een boek kwijt: vervangen of verwijderen gaat altijd naar een prullenbak.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Een nep-pdf (geen uitgeversmateriaal): kop, willekeurige inhoud, slot.
const pdf = (kb, zaad) => Buffer.concat([Buffer.from('%PDF-1.4\n'), crypto.createHash('sha256').update(String(zaad)).digest(), crypto.randomBytes(kb * 1024), Buffer.from('\n%%EOF\n')]);

test('Mijn lesmap: bordboeken gaan heen en terug, en nooit verloren', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bordboeken-lesmap-'));
  const bord = path.join(tmp, 'bord'), thuis = path.join(tmp, 'thuis'), map = path.join(tmp, 'lesmap');
  fs.mkdirSync(map);
  const sync = (data, code = '', boeken = true) => JSON.parse(execFileSync(process.execPath, ['-e', `
    const lesmap = require('./src/lesmap'), settings = require('./src/settings'), kronieken = require('./src/kronieken');
    settings.write({ lesmap: ${JSON.stringify(map)}, lesmapBoeken: ${boeken} });
    lesmap.init([
      { kind: 'kronieken', dir: kronieken.LINKS_DIR, remote: 'kronieken', validate: kronieken.geldigeLinks },
      { kind: 'bordboeken', bestanden: true, dir: kronieken.DIR, remote: 'bordboeken', toegelaten: kronieken.syncNaam, weg: kronieken.syncWeg, inPrullenbak: kronieken.inPrullenbak },
    ]);
    (async () => {
      ${code}
      const changed = await lesmap.sync();
      process.stdout.write('\\n@@' + JSON.stringify({ changed, lijst: kronieken.lijst(), view: lesmap.view() }));
    })();
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }).split('\n@@').pop());
  const kr = (data, ...p) => path.join(data, 'kronieken', ...p);
  const zet = (file, buf) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf); };
  const boeken = r => r.lijst.bestanden.filter(b => b.soort !== 'online').map(b => `${b.map}/${b.naam}`).sort();
  const bak = data => { try { return fs.readdirSync(kr(data, '_prullenbak')); } catch { return []; } };

  // Op het bord: een bordboek in Rekenen > Blok 1, met een koppeling aan les 3 en de pagina waar je stopte.
  const boek = pdf(600, 'rekenen');
  zet(kr(bord, 'Rekenen', 'Blok 1', 'Bordboek rekenen.pdf'), boek);
  let b = sync(bord, `kronieken.koppel({ map: 'Rekenen/Blok 1', les: 3, boek: 'Rekenen/Blok 1/Bordboek rekenen.pdf', pagina: 12 }); kronieken.zetPagina('Rekenen/Blok 1', 'Bordboek rekenen.pdf', 40);`);
  assert.strictEqual(b.view.error, '');
  assert.ok(fs.readFileSync(path.join(map, 'bordboeken', 'Rekenen', 'Blok 1', 'Bordboek rekenen.pdf')).equals(boek), 'het boek staat in de lesmap');

  // Thuis: een eigen boek gaat meteen weg. Dat van het bord komt pas binnen als het een ronde stil lag (niet half gedownload).
  const taal = pdf(300, 'taal');
  zet(kr(thuis, 'Taal', 'Taal thema 2.pdf'), taal);
  let t = sync(thuis);
  assert.deepStrictEqual(boeken(t), ['Taal/Taal thema 2.pdf']);
  t = sync(thuis);
  assert.deepStrictEqual(boeken(t), ['Rekenen/Blok 1/Bordboek rekenen.pdf', 'Taal/Taal thema 2.pdf']);
  assert.ok(t.changed.includes('bordboeken'));
  assert.ok(fs.readFileSync(kr(thuis, 'Rekenen', 'Blok 1', 'Bordboek rekenen.pdf')).equals(boek), 'thuis exact hetzelfde boek');
  assert.deepStrictEqual(t.lijst.lessen['Rekenen/Blok 1'][3], [{ boek: 'Rekenen/Blok 1/Bordboek rekenen.pdf', pagina: 12 }], 'de koppeling kwam mee');

  // Terug op het bord: het boek van thuis staat er ook.
  sync(bord);
  b = sync(bord);
  assert.deepStrictEqual(boeken(b), ['Rekenen/Blok 1/Bordboek rekenen.pdf', 'Taal/Taal thema 2.pdf']);
  assert.ok(fs.readFileSync(kr(bord, 'Taal', 'Taal thema 2.pdf')).equals(taal));
  assert.strictEqual(b.lijst.bestanden.find(x => x.naam === 'Bordboek rekenen.pdf').pagina, 40, 'de pagina waar je stopte bleef staan');

  // Niets meer te doen: niets wordt opnieuw gekopieerd.
  b = sync(bord);
  assert.strictEqual(b.view.pulled + b.view.pushed + b.view.removed, 0);

  // Thuis een nieuwere versie van het rekenboek: op het bord vervangen, de oude naar de prullenbak, koppeling blijft.
  const boek2 = pdf(650, 'rekenen-v2');
  const later = new Date(Date.now() + 60e3);
  zet(kr(thuis, 'Rekenen', 'Blok 1', 'Bordboek rekenen.pdf'), boek2);
  fs.utimesSync(kr(thuis, 'Rekenen', 'Blok 1', 'Bordboek rekenen.pdf'), later, later);
  sync(thuis);
  sync(bord);
  b = sync(bord);
  assert.ok(fs.readFileSync(kr(bord, 'Rekenen', 'Blok 1', 'Bordboek rekenen.pdf')).equals(boek2));
  assert.strictEqual(bak(bord).length, 1, 'de oude versie staat in de prullenbak');
  assert.ok(fs.readFileSync(kr(bord, '_prullenbak', bak(bord)[0])).equals(boek));
  assert.deepStrictEqual(b.lijst.lessen['Rekenen/Blok 1'][3], [{ boek: 'Rekenen/Blok 1/Bordboek rekenen.pdf', pagina: 12 }]);

  // Thuis een boek verwijderen: op het bord gaat het naar de prullenbak, niet weg.
  sync(thuis, `kronieken.verwijder('Taal', 'Taal thema 2.pdf');`);
  b = sync(bord);
  assert.deepStrictEqual(boeken(b), ['Rekenen/Blok 1/Bordboek rekenen.pdf']);
  assert.ok(bak(bord).some(n => n.endsWith('Taal thema 2.pdf')));
  assert.ok(fs.readdirSync(path.join(map, 'bordboeken', '_prullenbak')).some(n => n.includes('Taal thema 2')), 'ook in de lesmap in de prullenbak');

  // Rommel in de lesmap (verkeerde soort, verborgen, te diep) komt nooit binnen.
  zet(path.join(map, 'bordboeken', 'Rekenen', 'virus.exe'), Buffer.from('MZ'));
  zet(path.join(map, 'bordboeken', 'Rekenen', '_geheim.pdf'), pdf(1, 'x'));
  zet(path.join(map, 'bordboeken', '1', '2', '3', '4', '5', '6', '7', 'diep.pdf'), pdf(1, 'y'));
  sync(bord);
  b = sync(bord);
  assert.deepStrictEqual(boeken(b), ['Rekenen/Blok 1/Bordboek rekenen.pdf']);
  assert.ok(!fs.existsSync(kr(bord, 'Rekenen', 'virus.exe')));

  // Veel boeken thuis, dan is de lesmap plots leeg (OneDrive nog niet klaar): het bord verwijdert niets.
  for (let i = 1; i <= 5; i++) zet(kr(thuis, 'Wero', `Werkboek ${i}.pdf`), pdf(20, `w${i}`));
  sync(thuis); sync(bord); b = sync(bord);
  assert.strictEqual(boeken(b).length, 6);
  for (let i = 1; i <= 5; i++) fs.unlinkSync(path.join(map, 'bordboeken', 'Wero', `Werkboek ${i}.pdf`));
  b = sync(bord);
  assert.strictEqual(boeken(b).length, 6, 'niets verwijderd op het bord');
  assert.match(b.view.error, /niets verwijderd/);

  // Zet OneDrive ze terug, dan is alles weer gewoon. Daarna thuis bewust 5 boeken verwijderen in LANcelot: dat mag wel.
  // Zoals OneDrive: met het tijdstip van het origineel (anders lijkt het een nieuwere versie en houdt thuis die bij, zie onder).
  for (let i = 1; i <= 5; i++) {
    const van = kr(thuis, 'Wero', `Werkboek ${i}.pdf`), naar = path.join(map, 'bordboeken', 'Wero', `Werkboek ${i}.pdf`);
    fs.copyFileSync(van, naar);
    const st = fs.statSync(van);
    fs.utimesSync(naar, st.atime, st.mtime);
  }
  b = sync(bord);
  assert.strictEqual(b.view.error, '');
  t = sync(thuis, `for (let i = 1; i <= 5; i++) kronieken.verwijder('Wero', 'Werkboek ' + i + '.pdf');`);
  assert.strictEqual(t.view.error, '');
  assert.ok(!fs.existsSync(path.join(map, 'bordboeken', 'Wero', 'Werkboek 1.pdf')));
  b = sync(bord);
  assert.strictEqual(b.view.error, '');
  assert.deepStrictEqual(boeken(b), ['Rekenen/Blok 1/Bordboek rekenen.pdf']);
  assert.ok(bak(bord).filter(n => n.includes('Werkboek')).length === 5, 'op het bord in de prullenbak');

  // Verwijder je thuis een boek terwijl er in de lesmap net een andere versie staat, dan wint het boek: het komt terug.
  zet(kr(thuis, 'Wero', 'Extra.pdf'), pdf(20, 'extra'));
  sync(thuis);
  const extra = path.join(map, 'bordboeken', 'Wero', 'Extra.pdf');
  const nieuwer = new Date(Date.now() + 120e3);
  fs.utimesSync(extra, nieuwer, nieuwer);
  sync(thuis, `kronieken.verwijder('Wero', 'Extra.pdf');`);
  assert.ok(fs.existsSync(extra), 'niet verwijderd uit de lesmap');
  t = sync(thuis);
  assert.ok(boeken(t).includes('Wero/Extra.pdf'), 'en thuis weer terug');

  // Uitgezet: een nieuw boek blijft op deze pc.
  zet(kr(bord, 'Frans', 'Mission 9.pdf'), pdf(10, 'fr'));
  b = sync(bord, '', false);
  assert.strictEqual(b.view.boekenAan, false);
  assert.ok(!fs.existsSync(path.join(map, 'bordboeken', 'Frans')));

  fs.rmSync(tmp, { recursive: true, force: true });
});
