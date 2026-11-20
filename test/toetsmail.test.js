// De Proef: de verbeterde toets van een leerling mailen naar zijn begeleider (bv. GON).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Een piepkleine SMTP-server op 127.0.0.1 die alles bijhoudt wat binnenkomt.
function nepServer({ weigerLogin = false } = {}) {
  const ontvangen = [];
  const server = net.createServer(sock => {
    const mail = { auth: '', van: '', naar: [], data: '' };
    let inData = false;
    let buf = '';
    sock.write('220 nep ESMTP\r\n');
    sock.on('data', chunk => {
      buf += chunk.toString('utf8');
      while (true) {
        if (inData) {
          const eind = buf.indexOf('\r\n.\r\n');
          if (eind < 0) return;
          mail.data = buf.slice(0, eind);
          buf = buf.slice(eind + 5);
          inData = false;
          ontvangen.push(mail);
          sock.write('250 OK queued\r\n');
          continue;
        }
        const i = buf.indexOf('\r\n');
        if (i < 0) return;
        const regel = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (/^EHLO/.test(regel)) sock.write('250-nep\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
        else if (/^AUTH PLAIN/.test(regel)) { mail.auth = Buffer.from(regel.split(' ')[2], 'base64').toString('utf8'); sock.write(weigerLogin ? '535 5.7.8 Username and Password not accepted\r\n' : '235 OK\r\n'); }
        else if (/^MAIL FROM/.test(regel)) { mail.van = regel; sock.write('250 OK\r\n'); }
        else if (/^RCPT TO/.test(regel)) { mail.naar.push(regel.replace(/^RCPT TO:<(.*)>$/, '$1')); sock.write('250 OK\r\n'); }
        else if (regel === 'DATA') { inData = true; sock.write('354 go\r\n'); }
        else if (regel === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); }
        else sock.write('500 ?\r\n');
      }
    });
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port, ontvangen })));
}

// Een script in een apart proces, met een eigen datamap (settings.json).
function runner(data, extraEnv = {}) {
  // Asynchroon: zo kan de nep-server in dit proces intussen antwoorden.
  return code => new Promise((resolve, reject) => execFile(process.execPath, ['-e', `
    const M = require('./src/toetsmail'), K = require('./src/toetskopie'), settings = require('./src/settings');
    (async () => { ${code} })().then(r => process.stdout.write('\\n@@' + JSON.stringify(r)), e => process.stdout.write('\\n@@' + JSON.stringify({ fout: e.message })));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, ...extraEnv }, encoding: 'utf8' }, (err, out) => {
    if (err) return reject(err);
    const t = out.split('\n@@').pop();
    resolve(t === '' || t === 'undefined' ? undefined : JSON.parse(t));
  }));
}

test('toetsmail: afzender en adressen, het wachtwoord komt nooit terug naar het scherm', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toetsmail-'));
  const run = runner(data);
  assert.match((await run(`return M.zetAfzender({ van: 'geen-adres', pass: 'x' });`)).fout, /e-mailadres/);
  assert.match((await run(`return M.zetAfzender({ van: 'jorn@example.com' });`)).fout, /app-wachtwoord/);
  const v = await run(`return M.zetAfzender({ van: 'jorn@example.com', pass: 'abcd efgh ijkl mnop', naam: 'Jorn Peeters' });`);
  assert.equal(v.klaar, true);
  assert.equal(v.heeftPass, true);
  assert.equal(JSON.stringify(v).includes('abcd'), false);
  // een leeg wachtwoord laat het oude staan
  assert.equal((await run(`return M.zetAfzender({ van: 'jorn@example.com', naam: 'Jorn' });`)).heeftPass, true);
  assert.equal((await run(`return settings.read().toetsMail.pass;`)), 'abcdefghijklmnop');
  assert.match((await run(`return M.zetAdres('Testkind', 'morgan@');`)).fout, /geen geldig/);
  const a = await run(`return M.zetAdres(' Testkind ', 'morgan@example.be; zorg@example.be');`);
  assert.equal(a.adressen.testkind, 'morgan@example.be, zorg@example.be');
  assert.equal((await run(`return M.adresVoor('TESTKIND');`)), 'morgan@example.be, zorg@example.be');
  assert.equal((await run(`return M.nodig([{ naam: 'Ada' }]);`)), false);
  assert.equal((await run(`return M.nodig([{ naam: 'Ada' }, { naam: 'Testkind' }]);`)), true);
  assert.equal((await run(`return M.zetAdres('Testkind', '').adressen.testkind;`)), undefined);
  assert.equal((await run(`return M.zetAfzender({ wis: true }).klaar;`)), false);
});

test('toetsmail: de mail heeft de pdf als bijlage en gaat naar het adres van de leerling', async () => {
  const { server, port, ontvangen } = await nepServer();
  try {
    const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toetsmail-'));
    const pdf = path.join(data, 'kopie.pdf');
    fs.writeFileSync(pdf, '%PDF-1.4 nep\n.\n');
    const run = runner(data);
    await run(`M.zetAfzender({ van: 'jorn@example.com', pass: 'geheim', naam: 'Jorn Peeters', host: '127.0.0.1', port: ${port} }); return M.zetAdres('Testkind', 'morgan@example.be');`);
    const r = await run(`return M.toets({ naam: 'Testkind', titel: 'Driehoeken', datum: '2026-11-20T09:00:00.000Z', stand: { punten: 17.5, max: 20 }, pdf: ${JSON.stringify(pdf)}, bestand: '2026-11-20 Driehoeken.pdf' }, { onveilig: true });`);
    assert.deepEqual(r, { ok: true });
    assert.equal(ontvangen.length, 1);
    const m = ontvangen[0];
    assert.equal(m.auth, '\u0000jorn@example.com\u0000geheim');
    assert.deepEqual(m.naar, ['morgan@example.be']);
    assert.match(m.data, /^To: morgan@example\.be$/m);
    assert.match(m.data, /^Subject: Toets Testkind: Driehoeken \(20 november 2026\)$/m);
    assert.match(m.data, /filename="2026-11-20 Driehoeken\.pdf"/);
    const delen = m.data.split(/\r\n\r\n/);
    const tekst = Buffer.from(delen[2].split('\r\n--')[0].replace(/\r\n/g, ''), 'base64').toString('utf8');
    assert.match(tekst, /verbeterde toets "Driehoeken" van Testkind \(20 november 2026\)/);
    assert.match(tekst, /Score: 17\.5 op 20\./);
    assert.match(tekst, /Jorn Peeters/);
    const b64 = /Content-Disposition: attachment[^\r\n]*\r\n\r\n([\s\S]*?)\r\n--/.exec(m.data)[1];
    const bijlage = Buffer.from(b64.replace(/\r\n/g, ''), 'base64').toString('utf8');
    assert.equal(bijlage, '%PDF-1.4 nep\n.\n');
    // geen adres: niets versturen
    assert.equal((await run(`return M.toets({ naam: 'Ada', titel: 't', pdf: '', bestand: 't.pdf' }, { onveilig: true });`)).overgeslagen, true);
    assert.equal(ontvangen.length, 1);
  } finally { server.close(); }
});

test('toetsmail: een fout wachtwoord geeft een duidelijke melding', async () => {
  const { server, port } = await nepServer({ weigerLogin: true });
  try {
    const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toetsmail-'));
    const run = runner(data);
    await run(`return M.zetAfzender({ van: 'jorn@example.com', pass: 'fout', host: '127.0.0.1', port: ${port} });`);
    assert.match((await run(`return M.test({ onveilig: true });`)).fout, /app-wachtwoord/);
  } finally { server.close(); }
});

test('toetskopie + toetsmail: na Klaar alleen een mail voor wie een adres heeft, en maar één keer', { skip: process.platform === 'win32' }, async () => {
  const { server, port, ontvangen } = await nepServer();
  try {
    const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toetsmail-'));
    // Een nep-browser: schrijft een pdf waar --print-to-pdf= naar wijst.
    const browser = path.join(data, 'nep-browser.sh');
    fs.writeFileSync(browser, '#!/bin/sh\nfor a in "$@"; do case "$a" in --print-to-pdf=*) printf "%%PDF-1.4 nep" > "${a#--print-to-pdf=}";; esac; done\n');
    fs.chmodSync(browser, 0o755);
    const run = runner(data, { LANCELOT_BROWSER: browser });
    await run(`M.zetAfzender({ van: 'jorn@example.com', pass: 'geheim', host: '127.0.0.1', port: ${port} }); return M.zetAdres('Testkind', 'morgan@example.be');`);
    const rec = JSON.stringify({ title: 'Driehoeken', datum: '2026-11-20T09:00:00.000Z', spelers: [{ naam: 'Ada' }, { naam: 'Testkind' }, { naam: 'Bo', gemaild: '2026-11-19' }] });
    // De kopie in de lesmap staat uit (en er is geen lesmap): toch een mail voor Testkind.
    const r = await run(`const gemaild = []; const r = await K.maak({ rec: ${rec}, url: i => 'http://127.0.0.1/' + i, stand: () => ({ punten: 8, max: 10 }), gemaildBij: i => gemaild.push(i), mailOpties: { onveilig: true } }); return { ...r, gemaildBij: gemaild };`);
    assert.equal(r.gemaild, 1);
    assert.equal(r.gemaakt, 0);
    assert.equal(r.fout, '');
    assert.deepEqual(r.gemaildBij, [1]);
    assert.equal(ontvangen.length, 1);
    assert.deepEqual(ontvangen[0].naar, ['morgan@example.be']);
    // Wie al gemaild werd, krijgt geen tweede mail.
    const rec2 = JSON.stringify({ title: 'Driehoeken', datum: '2026-11-20T09:00:00.000Z', spelers: [{ naam: 'Testkind', gemaild: '2026-11-20' }] });
    const r2 = await run(`return K.maak({ rec: ${rec2}, url: () => '', mailOpties: { onveilig: true } });`);
    assert.equal(r2.gemaild, 0);
    assert.equal(ontvangen.length, 1);
  } finally { server.close(); }
});

test('toetsmail: het app-wachtwoord gaat niet mee in de back-up en blijft staan na terugzetten', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toetsmail-backup-'));
  fs.writeFileSync(path.join(data, 'settings.json'), JSON.stringify({ geminiKey: 'g-sleutel', toetsMail: { van: 'jorn@example.com', pass: 'geheimwachtwoord', adressen: { testkind: 'zorg@example.be' } } }));
  const out = await new Promise((resolve, reject) => execFile(process.execPath, ['-e', `
    const G = require('./src/gegevens'), zip = require('./src/zip');
    const s = JSON.parse(zip.read(G.maakBackup()).find(f => f.name === 'settings.json').data.toString('utf8'));
    process.stdout.write('\\n@@' + JSON.stringify(s));
  `], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, encoding: 'utf8' }, (err, o) => (err ? reject(err) : resolve(o))));
  const s = JSON.parse(out.split('\n@@').pop());
  assert.equal(s.geminiKey, undefined);
  assert.equal(s.toetsMail.pass, undefined);
  assert.equal(s.toetsMail.van, 'jorn@example.com');
  assert.equal(s.toetsMail.adressen.testkind, 'zorg@example.be');
  assert.equal(JSON.parse(fs.readFileSync(path.join(data, 'settings.json'), 'utf8')).toetsMail.pass, 'geheimwachtwoord');
});

test('toetsmail: Mijn klas zet twee adressen per leerling en het vinkje automatisch mailen', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'toetsmail-leerling-'));
  const run = runner(data);
  await run(`return M.zetAfzender({ van: 'jorn@example.com', pass: 'geheim' });`);
  const v = await run(`return M.zetLeerling('Testkind', { adres1: 'gon@example.be', adres2: 'ouder@example.be', aan: true });`);
  assert.equal(v.adressen.testkind, 'gon@example.be, ouder@example.be');
  assert.equal(await run(`return M.nodig([{ naam: 'Testkind' }]);`), true);
  // Vinkje uit: adressen blijven staan, maar er gaat geen mail meer.
  const uit = await run(`return M.zetLeerling('Testkind', { adres1: 'gon@example.be', adres2: 'ouder@example.be', aan: false });`);
  assert.equal(uit.adressen.testkind, 'gon@example.be, ouder@example.be');
  assert.equal(uit.uit.testkind, true);
  assert.equal(await run(`return M.adresVoor('Testkind');`), '');
  assert.equal(await run(`return M.nodig([{ naam: 'Testkind' }]);`), false);
  assert.match((await run(`return M.zetLeerling('Testkind', { adres1: 'fout@', aan: true });`)).fout, /geen geldig/);
  // Beide adressen leeg: de leerling staat nergens meer.
  const leeg = await run(`return M.zetLeerling('Testkind', { adres1: '', adres2: '', aan: true });`);
  assert.equal(leeg.adressen.testkind, undefined);
  assert.equal(leeg.uit.testkind, undefined);
});
