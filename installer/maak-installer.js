#!/usr/bin/env node
// Maakt LANcelot-installatie.exe: de schoolversie van LANcelot in één bestand, voor collega's zonder technische kennis.
//   node installer/maak-installer.js [--uit map]
// Nodig: git, npm, makensis (Linux: apt install nsis; Windows: NSIS 3) en internet (Node.js voor Windows).
// Wat erin zit: de app zoals in git (zonder website, tests en hulpmiddelen), node_modules, Node.js voor Windows met npm
// (map node: bijwerken in de app kan dan zelf nieuwe onderdelen installeren), installatie.json (de gegevens van de klas
// komen in %LOCALAPPDATA%\LANcelot) en versie.json (zodat Instellingen > Bijwerken weet welke versie er staat).
// Geen store.json: dit is de volledige versie, met De Kronieken, Woordkaarten, Junior en de Vlaamse doelen.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const zip = require('../src/zip');

const HIER = __dirname;
const ROOT = path.resolve(HIER, '..');
const NODE_LIJN = 'latest-v24.x';
// Wat van de repository in de app hoort.
const MEE = ['public/', 'src/', 'lang/', 'doelen/', 'doelen-landen/', 'voorbeelden/', 'startpakket/', 'quizzes/', 'oefenbladen/', 'rondetafel/', 'docs/',
  'server.js', 'package.json', 'package-lock.json', 'LICENSE', 'README.md', 'Start LANcelot.bat'];

function arg(naam, standaard) {
  const i = process.argv.indexOf(`--${naam}`);
  return i > 0 ? process.argv[i + 1] : standaard;
}

async function haal(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Node.js voor Windows (zip van nodejs.org, gecontroleerd met SHASUMS256), volledig: node.exe, npm en npx.
async function nodeVoorWindows(cache, doel) {
  const sums = (await haal(`https://nodejs.org/dist/${NODE_LIJN}/SHASUMS256.txt`)).toString();
  const m = sums.match(/^([0-9a-f]{64})\s+(node-v[\d.]+-win-x64\.zip)$/m);
  if (!m) throw new Error('Node.js voor Windows niet gevonden.');
  const [, sha, naam] = m;
  const bestand = path.join(cache, naam);
  let buf = fs.existsSync(bestand) ? fs.readFileSync(bestand) : null;
  if (!buf || crypto.createHash('sha256').update(buf).digest('hex') !== sha) {
    console.log(`  ${naam} downloaden...`);
    buf = await haal(`https://nodejs.org/dist/${NODE_LIJN}/${naam}`);
    if (crypto.createHash('sha256').update(buf).digest('hex') !== sha) throw new Error(`${naam}: controlegetal klopt niet.`);
    fs.writeFileSync(bestand, buf);
  }
  let n = 0;
  for (const f of zip.read(buf)) {
    const kort = f.name.replace(/^[^/]+\//, '');
    if (!kort || kort.endsWith('/')) continue;
    const doelPad = path.join(doel, ...kort.split('/'));
    if (!doelPad.startsWith(doel + path.sep)) continue;
    fs.mkdirSync(path.dirname(doelPad), { recursive: true });
    fs.writeFileSync(doelPad, f.data);
    n++;
  }
  if (!fs.existsSync(path.join(doel, 'node.exe')) || !fs.existsSync(path.join(doel, 'npm.cmd'))) throw new Error('node.exe of npm ontbreekt in de zip.');
  return { versie: naam.match(/node-(v[\d.]+)/)[1], bestanden: n };
}

function grootteKb(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? grootteKb(p) * 1024 : e.isFile() ? fs.statSync(p).size : 0;
  }
  return Math.round(n / 1024);
}

// Bij verwijderen, als er toch gegevens van een klas in de map van de app staan: alleen wat de installer zelf neerzette.
// De voorbeeldmappen (quizzes, oefenbladen, rondetafel) blijven dan staan: daar kunnen eigen quizzen in zitten.
const NOOIT_WEG = new Set(['quizzes', 'oefenbladen', 'rondetafel']);
function verwijderLijst(stage) {
  return fs.readdirSync(stage, { withFileTypes: true })
    .filter(e => !NOOIT_WEG.has(e.name))
    .map(e => (e.isDirectory() ? `    RMDir /r "$INSTDIR\\${e.name}"` : `    Delete "$INSTDIR\\${e.name}"`))
    .concat('    RMDir /r "$INSTDIR\\_update"')
    .join('\n') + '\n';
}

// Versie uit de laatste commit: datum en tijd (voor Windows) en de sha (voor Instellingen > Bijwerken).
function gitVersie() {
  const [sha, datum, bericht] = execFileSync('git', ['log', '-1', '--format=%H%n%cI%n%s'], { cwd: ROOT }).toString().split('\n');
  const d = new Date(datum);
  const versie = `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
  return { sha, datum: d.toISOString(), bericht: bericht.slice(0, 120), versie, vi: `${versie}.${d.getUTCHours() * 100 + d.getUTCMinutes()}` };
}

async function main() {
  const uitMap = path.resolve(arg('uit', path.join(HIER, 'uit')));
  fs.mkdirSync(uitMap, { recursive: true });
  const cache = path.join(os.tmpdir(), 'lancelot-installer-cache');
  fs.mkdirSync(cache, { recursive: true });
  const werk = fs.mkdtempSync(path.join(os.tmpdir(), 'lancelot-installer-'));
  const stage = path.join(werk, 'LANcelot');
  fs.mkdirSync(stage);
  console.log(`  Klaarzetten in ${stage}`);

  // 1. De app zoals ze in git staat (geen gegevens van een klas, geen website).
  const git = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0').filter(Boolean);
  for (const f of git.filter(f => MEE.some(m => (m.endsWith('/') ? f.startsWith(m) : f === m)))) {
    fs.mkdirSync(path.join(stage, path.dirname(f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(stage, f));
  }
  // 2. De onderdelen van npm (alleen wat de app nodig heeft; allemaal gewoon JavaScript, dus ook goed voor Windows).
  console.log('  npm ci --omit=dev');
  execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: stage, stdio: 'inherit' });
  // 3. Node.js voor Windows.
  const node = await nodeVoorWindows(cache, path.join(stage, 'node'));
  // 4. De markeringen.
  const v = gitVersie();
  fs.copyFileSync(path.join(HIER, 'installatie.json'), path.join(stage, 'installatie.json'));
  fs.writeFileSync(path.join(stage, 'versie.json'), JSON.stringify({ sha: v.sha, datum: v.datum, bericht: v.bericht, geinstalleerd: 'installer' }, null, 2) + '\n');
  const lijst = path.join(werk, 'verwijder-lijst.nsh');
  fs.writeFileSync(lijst, verwijderLijst(stage));

  // 5. Inpakken met NSIS.
  const uit = path.join(uitMap, 'LANcelot-installatie.exe');
  execFileSync('makensis', ['-V2', '-INPUTCHARSET', 'UTF8',
    `-DSTAGE=${stage}`, `-DLIJST=${lijst}`, `-DUIT=${uit}`, `-DVERSIE=${v.versie}`, `-DVIVERSIE=${v.vi}`, `-DKB=${grootteKb(stage)}`,
    path.join(HIER, 'lancelot.nsi')], { stdio: 'inherit' });
  fs.rmSync(werk, { recursive: true, force: true });
  const mb = (fs.statSync(uit).size / 1e6).toFixed(1);
  console.log(`\n  Klaar: ${uit}\n  ${mb} MB, Node.js ${node.versie}, versie ${v.versie} (${v.sha.slice(0, 7)})\n`);
  return uit;
}

if (require.main === module) main().catch(err => { console.error(`\n  Mislukt: ${err.message}\n`); process.exit(1); });
module.exports = { main, verwijderLijst, MEE };
