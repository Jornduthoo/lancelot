#!/usr/bin/env node
// Maakt het pakket voor de Microsoft Store: LANcelot-<versie>.msix, klaar om op te laden in Partner Center.
//   node installer/store/maak-pakket.js [--uit map] [--versie 1.2611.510.0]
// Nodig: git, npm, clang + lld + llvm (voor de starter LANcelot.exe, zie bouw-starter.sh), internet (Node.js voor Windows).
// Wat erin zit: de app zoals in git (zonder website, tests en hulpmiddelen), node_modules, Node.js voor Windows (map node),
// de starter LANcelot.exe, store.json (de app weet dan dat ze uit de Store komt, zie src/store.js),
// installatie.json (de gegevens van de klas komen in %LOCALAPPDATA%\LANcelot) en de logo's in Assets.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const msix = require('./msix');
const zip = require('../../src/zip');

const HIER = __dirname;
const ROOT = path.resolve(HIER, '..', '..');
const NODE_LIJN = 'latest-v24.x';
const STORE_ID = '9P1CLC6W364H';
// Wat van de repository in de app hoort.
const MEE = ['public/', 'src/', 'lang/', 'doelen/', 'doelen-landen/', 'voorbeelden/', 'startpakket/', 'quizzes/', 'oefenbladen/', 'rondetafel/', 'docs/', 'server.js', 'package.json', 'package-lock.json', 'LICENSE', 'README.md'];

function arg(naam, standaard) {
  const i = process.argv.indexOf(`--${naam}`);
  return i > 0 ? process.argv[i + 1] : standaard;
}

// Store-versies: drie getallen en een 0 op het einde. Standaard uit de datum: 1.JJMM.DDUU.0 (bv. 1.2611.510.0 op 5 november om 10 uur).
function versieNu() {
  const d = new Date();
  const jjmm = (d.getUTCFullYear() % 100) * 100 + d.getUTCMonth() + 1;
  return `1.${jjmm}.${d.getUTCDate() * 100 + d.getUTCHours()}.0`;
}

async function haal(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Node.js voor Windows (zip van nodejs.org, gecontroleerd met SHASUMS256): alleen node.exe en de licentie.
async function nodeVoorWindows(cache) {
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
  const uit = {};
  for (const f of zip.read(buf)) {
    const kort = f.name.replace(/^[^/]+\//, '');
    if (kort === 'node.exe' || kort === 'LICENSE') uit[kort] = f.data;
  }
  if (!uit['node.exe']) throw new Error('node.exe niet gevonden in de zip.');
  return { versie: naam.match(/node-(v[\d.]+)/)[1], ...uit };
}

function lijst(dir, basis = dir) {
  const uit = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) uit.push(...lijst(p, basis));
    else if (e.isFile()) uit.push({ naam: path.relative(basis, p).split(path.sep).join('/'), pad: p });
  }
  return uit;
}

async function main() {
  const versie = arg('versie', versieNu());
  if (!/^\d+\.\d+\.\d+\.0$/.test(versie) || versie.split('.').some(x => Number(x) > 65535)) throw new Error('Versie: vier getallen (max 65535), het laatste 0.');
  const uitMap = path.resolve(arg('uit', path.join(HIER, 'uit')));
  fs.mkdirSync(uitMap, { recursive: true });
  const cache = path.join(os.tmpdir(), 'lancelot-store-cache');
  fs.mkdirSync(cache, { recursive: true });
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'lancelot-store-'));
  console.log(`  Klaarzetten in ${stage}`);

  // 1. De app zoals ze in git staat (geen gegevens van een klas, geen website).
  const git = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0').filter(Boolean);
  for (const f of git.filter(f => MEE.some(m => (m.endsWith('/') ? f.startsWith(m) : f === m)))) {
    fs.mkdirSync(path.join(stage, path.dirname(f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(stage, f));
  }
  // 2. De onderdelen van npm (alleen wat de app nodig heeft).
  console.log('  npm ci --omit=dev');
  execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: stage, stdio: 'inherit' });
  // 3. Node.js voor Windows.
  const node = await nodeVoorWindows(cache);
  fs.mkdirSync(path.join(stage, 'node'));
  fs.writeFileSync(path.join(stage, 'node', 'node.exe'), node['node.exe']);
  if (node.LICENSE) fs.writeFileSync(path.join(stage, 'node', 'LICENSE'), node.LICENSE);
  // 4. De starter, de markeringen en de logo's.
  execFileSync('sh', [path.join(HIER, 'bouw-starter.sh'), stage], { stdio: 'inherit' });
  fs.writeFileSync(path.join(stage, 'store.json'), JSON.stringify({ store: 'microsoft', storeId: STORE_ID, versie }, null, 2) + '\n');
  fs.copyFileSync(path.join(ROOT, 'installer', 'installatie.json'), path.join(stage, 'installatie.json'));
  fs.cpSync(path.join(HIER, 'Assets'), path.join(stage, 'Assets'), { recursive: true });

  // 5. Inpakken.
  const manifest = fs.readFileSync(path.join(HIER, 'AppxManifest.xml'), 'utf8').replaceAll('{VERSIE}', versie);
  const bestanden = lijst(stage).sort((a, b) => a.naam.localeCompare(b.naam));
  const uit = path.join(uitMap, `LANcelot-${versie}.msix`);
  const r = msix.maak({ bestanden, manifest, uit });
  fs.rmSync(stage, { recursive: true, force: true });
  console.log(`\n  Klaar: ${uit}\n  ${r.bestanden} bestanden, ${(r.grootte / 1e6).toFixed(1)} MB, Node.js ${node.versie}, versie ${versie}\n`);
  return uit;
}

if (require.main === module) main().catch(err => { console.error(`\n  Mislukt: ${err.message}\n`); process.exit(1); });
module.exports = { main, versieNu };
