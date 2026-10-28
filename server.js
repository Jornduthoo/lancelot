const fs = require('fs');
// Draait LANcelot al (een tweede dubbelklik op de snelkoppeling)? Dan gewoon het docentenscherm openen.
// Dit gebeurt nog voor het bijwerken, zodat een tweede start nooit de bestanden onder een lopend spel vervangt.
{
  const eerste = Number(process.env.PORT) || 3000;
  const probe = `const http=require('http');let n=0;for(let p=${eerste};p<=${eerste + 10};p++){const r=http.get({host:'127.0.0.1',port:p,path:'/lancelot-ping',timeout:800},res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>{if(b.includes('"lancelot":true')){console.log(p);process.exit(0)}if(++n>10)process.exit(1)})});r.on('timeout',()=>r.destroy());r.on('error',()=>{if(++n>10)process.exit(1)})}`;
  const r = require('child_process').spawnSync(process.execPath, ['-e', probe], { encoding: 'utf8', timeout: 3000 });
  const draait = r.status === 0 && Number(r.stdout.trim());
  if (draait) {
    console.log(`\n  LANcelot draait al (poort ${draait}). Het docentenscherm wordt geopend.\n`);
    if (process.platform === 'win32') require('child_process').spawnSync('cmd', ['/c', 'start', '', `http://localhost:${draait}/host`], { windowsHide: true });
    process.exit(0);
  }
}
// Een klaargezette update eerst installeren en dan de nieuwe versie starten, nog voor er iets anders geladen is.
{
  const bijgewerkt = require('./src/bijwerken').pasToe();
  if (bijgewerkt) {
    const { spawnSync } = require('child_process');
    console.log('\n  LANcelot is bijgewerkt.');
    if (bijgewerkt.npm) {
      console.log('  Nieuwe onderdelen installeren...');
      spawnSync('npm', ['install', '--omit=dev'], { cwd: __dirname, stdio: 'inherit', shell: true });
    }
    const r = spawnSync(process.execPath, [__filename, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, LANCELOT_BIJGEWERKT: '1' } });
    process.exit(r.status || 0);
  }
}
// Eerst de gegevensmap: een verhuis of een terug te zetten back-up gebeurt nog voordat iets de bestanden leest.
const gegevens = require('./src/gegevens');
const http = require('http');
const os = require('os');
const dgram = require('dgram');
const zlib = require('zlib');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const { Game } = require('./src/game');
const QRCode = require('qrcode');
const quizzes = require('./src/quizzes');
const rondetafel = require('./src/rondetafel');
const { Toren } = require('./src/toren');
const { Schat } = require('./src/schat');
const { Laserslag } = require('./src/laserslag');
const { Ridderrace } = require('./src/ridderrace');
const { Kristalroof } = require('./src/kristalroof');
const { Burcht } = require('./src/burcht');
const { Duel } = require('./src/duel');
const { PacKnight } = require('./src/packnight');
const { Strijdrossen } = require('./src/strijdrossen');
const { Galaga } = require('./src/galaga');
const { Bomber } = require('./src/bomber');
const { NeonDuel } = require('./src/neonduel');
const { LeraarBaas } = require('./src/leraarbaas');
const { Gauntlet } = require('./src/gauntlet');
const { Royale } = require('./src/royale');
const { Sterrenvreter } = require('./src/sterrenvreter');
const { Ridderslang } = require('./src/ridderslang');
const { Poortwacht } = require('./src/poortwacht');
const { Neonvlucht } = require('./src/neonvlucht');
const { Diepboor } = require('./src/diepboor');
const { Burchtstorm } = require('./src/burchtstorm');
const { Pixelridder } = require('./src/pixelridder');
const { Robomol } = require('./src/robomol');
const { Kerker } = require('./src/kerker');
const { Hofschilder } = require('./src/hofschilder');
const { Robopaarden } = require('./src/robopaarden');
const rijken = require('./src/rijk');
const avatars = require('./src/avatars');
const { Verrader } = require('./src/verrader');
const oefenbladen = require('./src/oefenbladen');
const reeks = require('./src/reeks');
const kronieken = require('./src/kronieken');
const zonnewijzer = require('./src/zonnewijzer');
const { OefenbladLive } = require('./src/oefenblad-live');
const niveaus = require('./src/niveaus');
const settings = require('./src/settings');
const klas = require('./src/klas');
const doelen = require('./src/doelen');
const logboek = require('./src/logboek');
const pauze = require('./src/pauze');
// Moet overeenkomen met de lijst in public/js/ui.js.
const THEMAS = ['nachtburcht', 'daglicht', 'ijspaleis', 'rozenkasteel', 'smaragdwoud', 'drakenvuur', 'contrast'];
const opwarmer = require('./src/opwarmer');
const startpakket = require('./src/startpakket');
const overzicht = require('./src/overzicht');
const zorg = require('./src/zorg');
const notities = require('./src/notities');
const herhaal = require('./src/herhaal');
const results = require('./src/results');
const lesmap = require('./src/lesmap');
const beheer = require('./src/beheer');
const schermen = require('./src/schermen');
const { execFile } = require('child_process');
const { generateQuiz } = require('./src/ai');
const antigok = require('./src/antigok');
const runen = require('./src/runen');
const burchten = require('./src/burchten');
const taken = require('./src/taken');
const klastaken = require('./src/klastaken');
const soloSpel = require('./src/solo');
const ai = require('./src/ai');
const aiJson = require('./src/ai-json');

// Is poort 3000 bezet door een ander programma, dan neemt LANcelot de volgende vrije (tot 3010), tenzij PORT vastgezet is.
const VASTE_POORT = Boolean(process.env.PORT);
let PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = http.createServer(app);
// Ruim genoeg voor lesstof (screenshots en pdf's) die naar Gemini gaat.
const io = new Server(server, { maxHttpBufferSize: 30e6 });
// Na elk spel: de lijst met resultaten bijwerken, de sessie in het logboek afsluiten en het overzicht ervan naar het docentenscherm sturen.
function finished(file) {
  io.to('host').emit('results', results.list());
  const id = logboek.endSession();
  const o = id && overzicht.session(id);
  if (o) io.to('host').emit('sessie-klaar', o);
  return file;
}

const game = new Game(io, g => {
  const file = results.save(g);
  return finished(file);
});
const rt = new rondetafel.RondeTafel(io, r => {
  const file = results.saveRondeTafel(r);
  return finished(file);
});
const toren = new Toren(io, t => {
  const file = results.saveToren(t);
  return finished(file);
});

const schat = new Schat(io, s => {
  const file = results.saveSchat(s);
  return finished(file);
});

const laserslag = new Laserslag(io, l => {
  const file = results.saveLaserslag(l);
  return finished(file);
});

const race = new Ridderrace(io, r => {
  const file = results.saveRace(r);
  return finished(file);
});

const roof = new Kristalroof(io, k => {
  const file = results.saveRoof(k);
  return finished(file);
});

const verrader = new Verrader(io, v => {
  const file = results.saveVerrader(v);
  return finished(file);
});

const burcht = new Burcht(io, b => {
  const file = results.saveBurcht(b);
  return finished(file);
});

const duel = new Duel(io, d => {
  const file = results.saveDuel(d);
  return finished(file);
});

const knight = new PacKnight(io, k => {
  const file = results.saveKnight(k);
  return finished(file);
});

const rossen = new Strijdrossen(io, r => {
  const file = results.saveRossen(r);
  return finished(file);
});

const galaga = new Galaga(io, g => {
  const file = results.saveGalaga(g);
  return finished(file);
});

const neon = new NeonDuel(io, d => {
  const file = results.saveNeon(d);
  return finished(file);
});

const gauntlet = new Gauntlet(io, g => {
  const file = g.save();
  return finished(file);
});

const bomber = new Bomber(io, b => {
  const file = results.saveBomber(b);
  return finished(file);
});

const baas = new LeraarBaas(io, b => {
  const file = results.saveBaas(b);
  return finished(file);
});

const royale = new Royale(io, r => {
  const file = r.save();
  return finished(file);
});

const sterren = new Sterrenvreter(io, s => {
  const file = s.save();
  return finished(file);
});

const slang = new Ridderslang(io, s => {
  const file = s.save();
  return finished(file);
});

const poort = new Poortwacht(io, s => {
  const file = s.save();
  return finished(file);
});

const vlucht = new Neonvlucht(io, s => {
  const file = s.save();
  return finished(file);
});

const diep = new Diepboor(io, s => {
  const file = s.save();
  return finished(file);
});

const storm = new Burchtstorm(io, s => {
  const file = s.save();
  return finished(file);
});

const pixel = new Pixelridder(io, s => {
  const file = s.save();
  return finished(file);
});

const robomol = new Robomol(io, s => {
  const file = s.save();
  return finished(file);
});

const kerker = new Kerker(io, s => {
  const file = s.save();
  return finished(file);
});

const hof = new Hofschilder(io, s => {
  const file = s.save();
  return finished(file);
});

const paarden = new Robopaarden(io, s => {
  const file = s.save();
  return finished(file);
});

const rijk = new rijken.Rijk(io, r => {
  const file = results.saveRijk(r);
  return finished(file);
});

const oefenblad = new OefenbladLive(io, o => {
  const file = results.saveOefenblad(o);
  return finished(file);
});

// Elk spel met leerlingen, bij het adres van zijn docentenscherm. Een nieuw spel komt hier ook bij:
// zo werken de grijze (bezette) namen bij het aanmelden en de knop "Namen" op het bord meteen mee.
const SPELLEN = { '/host': game, '/toren': toren, '/schattenjacht': schat, '/laserslag': laserslag, '/ridderrace': race, '/kristalroof': roof, '/verrader': verrader, '/burchtbouwers': burcht, '/duel': duel, '/packnight': knight, '/strijdrossen': rossen, '/gauntlet': gauntlet, '/ridder-royale': royale, '/sterrenvreter': sterren, '/ridderslang': slang, '/burchtstorm': storm, '/poortwacht': poort, '/neonvlucht': vlucht, '/diepboor': diep, '/pixelridder': pixel, '/robomol': robomol, '/kerker': kerker, '/hofschilder': hof, '/robopaarden': paarden, '/neonduel': neon, '/leraarbaas': baas, '/cybergalaga': galaga, '/bomberknight': bomber, '/rijk': rijk, '/oefenblad': oefenblad };
const online = socketId => !!(socketId && io.sockets.sockets.get(socketId));
function* spelers() {
  for (const spel of Object.values(SPELLEN)) {
    if (spel.phase === 'idle' || !(spel.players instanceof Map)) continue;
    for (const [id, p] of spel.players) yield { id, p };
  }
}
// Namen die al bij een verbonden leerling horen. De eigen naam telt niet mee, zodat terugkomen na een wifi-onderbreking gewoon werkt.
function bezetteNamen(playerId) {
  const uit = new Set();
  for (const { id, p } of spelers()) if (id !== playerId && p.name && online(p.socketId)) uit.add(p.name.toLowerCase());
  return [...uit];
}
// Kiest een leerling een naam die bij een speler zonder verbinding hoort (andere Chromebook, pagina herladen),
// dan neemt hij die speler terug over: zijn punten blijven en de naam is niet "al bezet".
function oudeSpeler(name) {
  const want = String(name || '').trim().toLowerCase();
  if (!want || !klas.names().some(n => n.toLowerCase() === want)) return null;
  for (const { id, p } of spelers()) if (p.name && p.name.toLowerCase() === want && !online(p.socketId)) return id;
  return null;
}

// Wie zit waar? Voor de knop "Namen" op elk docentenscherm. Een spel weet zijn spelers; op het Runenraadsel,
// Mijn burcht, Mijn taken en het startscherm onthoudt de verbinding zelf welke naam erop staat.
const ZONDER_SPEL = { runen: 'Runenraadsel', burcht: 'Mijn burcht', taken: 'Mijn taken', solo: 'Taak in een spel', start: 'Wacht op een spel' };
function hier(socket, naam, waar) {
  if (typeof naam !== 'string' || !naam.trim() || naam.length > 60 || !ZONDER_SPEL[waar]) return;
  socket.data.naam = naam.trim();
  socket.data.waar = waar;
}
let spelTitels = null;
function spelTitel(pad) {
  if (!spelTitels) {
    spelTitels = { '/host': 'Toernooi' };
    for (const [route, page] of PAGINAS) {
      if (spelTitels[route] || !SPELLEN[route]) continue;
      try {
        const t = /<title>[^<]*·\s*([^<]+)<\/title>/.exec(fs.readFileSync(path.join(__dirname, 'public', page), 'utf8'));
        if (t) spelTitels[route] = t[1].trim();
      } catch { /* dan de naam van het adres */ }
    }
  }
  return spelTitels[pad] || pad.slice(1);
}
function namenOveral() {
  const binnen = [];
  const gezien = new Set();
  for (const [pad, spel] of Object.entries(SPELLEN)) {
    if (spel.phase === 'idle' || !(spel.players instanceof Map)) continue;
    for (const [id, p] of spel.players) {
      if (!p.name) continue;
      const aan = online(p.socketId);
      binnen.push({ name: p.name, waar: spelTitel(pad), online: aan, pad, id });
      if (aan) gezien.add(p.socketId);
    }
  }
  let zonderNaam = 0;
  for (const s of io.sockets.sockets.values()) {
    if (s.data.host || gezien.has(s.id)) continue;
    // Wie in een spel zit, staat daar al: niet nog eens als "wacht op een spel".
    if (s.data.naam && !binnen.some(b => b.online && b.name.toLowerCase() === s.data.naam.toLowerCase())) {
      binnen.push({ name: s.data.naam, waar: ZONDER_SPEL[s.data.waar], online: true, sock: s.id });
    } else if (!s.data.naam) zonderNaam++;
  }
  const namen = new Set(binnen.filter(b => b.online).map(b => b.name.toLowerCase()));
  return { spelers: binnen, zonderNaam, afwezig: klas.names().filter(n => !namen.has(n.toLowerCase())) };
}

// Tegen gokken: elk spel krijgt dezelfde regels (wachten na fout, vraag komt terug, seintje bij snel gokken).
const gok = antigok.create(io);
oefenblad.gok = gok;
const guarded = {
  toren: gok.guard(toren, 'toren', 'De prinses in de toren'),
  schat: gok.guard(schat, 'schat', 'Schattenjacht'),
  laserslag: gok.guard(laserslag, 'laserslag', 'Laserslag'),
  race: gok.guard(race, 'race', 'Ridderrace'),
  roof: gok.guard(roof, 'roof', 'Kristalroof'),
  verrader: gok.guard(verrader, 'verrader', 'De Verrader'),
  burcht: gok.guard(burcht, 'burcht', 'Burchtbouwers'),
  rijk: gok.guard(rijk, 'rijk', 'Het Rijk'),
  knight: gok.guard(knight, 'knight', 'Pac-Knight', { own: true }),
  rossen: gok.guard(rossen, 'rossen', 'Strijdrossen', { own: true }),
  galaga: gok.guard(galaga, 'galaga', 'Cyber-Galaga', { own: true }),
  neon: gok.guard(neon, 'neon', 'Neon Duel', { own: true }),
  gauntlet: gok.guard(gauntlet, 'gauntlet', 'Gauntlet', { own: true }),
  bomber: gok.guard(bomber, 'bomber', 'Bomber-Knight', { own: true }),
  baas: gok.guard(baas, 'baas', 'Leraar-baas', { own: true }),
  royale: gok.guard(royale, 'royale', 'Ridder-Royale', { own: true }),
  sterren: gok.guard(sterren, 'sterren', 'Sterrenvreter', { own: true }),
  slang: gok.guard(slang, 'slang', 'Ridderslang', { own: true }),
  poort: gok.guard(poort, 'poort', 'Poortwacht', { own: true }),
  vlucht: gok.guard(vlucht, 'vlucht', 'Neonvlucht', { own: true }),
  diep: gok.guard(diep, 'diep', 'Diepboor', { own: true }),
  storm: gok.guard(storm, 'storm', 'Burchtstorm', { own: true }),
  pixel: gok.guard(pixel, 'pixel', 'Pixelridder', { own: true }),
  robomol: gok.guard(robomol, 'robomol', 'Robomol', { own: true }),
  kerker: gok.guard(kerker, 'kerker', 'Ontsnap uit de kerker', { own: true }),
  paarden: gok.guard(paarden, 'paarden', 'Robopaarden', { own: true }),
};

// Taken die een leerling alleen speelt, elk in een eigen spel (los van het spel op het bord).
const solo = soloSpel.create(io, gok, () => takenSoon());

// Er loopt altijd hooguit één spel tegelijk.
const busyError = message => Object.assign(new Error(message), { busy: true });

// Alles stoppen wat nog loopt (behalve het spel dat je wil starten). De resultaten worden bewaard zoals bij Stop.
function stopOthers(except) {
  const all = { toernooi: game, rondetafel: rt, toren, schat, laserslag, race, roof, verrader, burcht, duel, knight, rossen, gauntlet, royale, sterren, slang, storm, poort, vlucht, diep, pixel, robomol, kerker, hofschilder: hof, paarden, neon, baas, rijk, oefenblad, galaga, bomber };
  for (const [key, mod] of Object.entries(all)) {
    if (key === except) continue;
    if (key === 'toernooi' ? game.phase !== 'idle' : mod.active) mod.stop();
  }
}

function busyWith(except) {
  if (except !== 'toernooi' && game.phase !== 'idle') return 'Er loopt nog een toernooi. Stop dat eerst.';
  if (except !== 'rondetafel' && rt.active) return 'De Ronde Tafel loopt nog. Stop die eerst.';
  if (except !== 'toren' && toren.active) return 'De prinses in de toren loopt nog. Stop dat spel eerst.';
  if (except !== 'schat' && schat.active) return 'Schattenjacht loopt nog. Stop dat spel eerst.';
  if (except !== 'laserslag' && laserslag.active) return 'Laserslag loopt nog. Stop dat spel eerst.';
  if (except !== 'race' && race.active) return 'De Ridderrace loopt nog. Stop die eerst.';
  if (except !== 'roof' && roof.active) return 'Kristalroof loopt nog. Stop dat spel eerst.';
  if (except !== 'verrader' && verrader.active) return 'De Verrader loopt nog. Stop dat spel eerst.';
  if (except !== 'burcht' && burcht.active) return 'Burchtbouwers loopt nog. Stop dat spel eerst.';
  if (except !== 'duel' && duel.active) return 'Duel in de arena loopt nog. Stop dat eerst.';
  if (except !== 'knight' && knight.active) return 'Pac-Knight loopt nog. Stop dat spel eerst.';
  if (except !== 'rossen' && rossen.active) return 'Strijdrossen loopt nog. Stop dat spel eerst.';
  if (except !== 'galaga' && galaga.active) return 'Cyber-Galaga loopt nog. Stop dat spel eerst.';
  if (except !== 'bomber' && bomber.active) return 'Bomber-Knight loopt nog. Stop dat spel eerst.';
  if (except !== 'neon' && neon.active) return 'Neon Duel loopt nog. Stop dat spel eerst.';
  if (except !== 'baas' && baas.active) return 'Leraar-baas loopt nog. Stop dat spel eerst.';
  if (except !== 'gauntlet' && gauntlet.active) return 'Gauntlet loopt nog. Stop dat spel eerst.';
  if (except !== 'royale' && royale.active) return 'Ridder-Royale loopt nog. Stop dat spel eerst.';
  if (except !== 'sterren' && sterren.active) return 'Sterrenvreter loopt nog. Stop dat spel eerst.';
  if (except !== 'slang' && slang.active) return 'Ridderslang loopt nog. Stop dat spel eerst.';
  if (except !== 'poort' && poort.active) return 'Poortwacht loopt nog. Stop dat spel eerst.';
  if (except !== 'vlucht' && vlucht.active) return 'Neonvlucht loopt nog. Stop dat spel eerst.';
  if (except !== 'diep' && diep.active) return 'Diepboor loopt nog. Stop dat spel eerst.';
  if (except !== 'storm' && storm.active) return 'Burchtstorm loopt nog. Stop dat spel eerst.';
  if (except !== 'pixel' && pixel.active) return 'Pixelridder loopt nog. Stop dat spel eerst.';
  if (except !== 'robomol' && robomol.active) return 'Robomol loopt nog. Stop dat spel eerst.';
  if (except !== 'kerker' && kerker.active) return 'Ontsnap uit de kerker loopt nog. Stop dat spel eerst.';
  if (except !== 'hofschilder' && hof.active) return 'De Hofschilder loopt nog. Stop dat spel eerst.';
  if (except !== 'paarden' && paarden.active) return 'Robopaarden loopt nog. Stop die race eerst.';
  if (except !== 'rijk' && rijk.active) return 'Het Rijk loopt nog. Stop dat spel eerst.';
  if (except !== 'oefenblad' && oefenblad.active) return 'Er staat nog een oefenblad open. Sluit dat eerst.';
  return null;
}

// Quizzen, oefenbladen en Ronde Tafel-sessies: lijst en mappen werken overal hetzelfde.
const LIBS = {
  quiz: { mod: quizzes, list: 'quizzes', folders: 'quiz-folders' },
  oefenblad: { mod: oefenbladen, list: 'ob-sheets', folders: 'ob-folders' },
  sessie: { mod: rondetafel, list: 'rt-sessions', folders: 'rt-folders' },
};

// Zonder target: naar alle docentenschermen, en daarna ook naar de lesmap (er werd iets bewaard, verplaatst of verwijderd).
function sendLibrary(kind, target, fromSync = false) {
  const l = LIBS[kind];
  const to = target || io.to('host');
  to.emit(l.folders, l.mod.lib.folders());
  to.emit(l.list, l.mod.list());
  if (!target && !fromSync) syncSoon();
}

// Mijn lesmap (OneDrive of Google Drive): bij opstart, elke minuut en kort na elke wijziging.
lesmap.init([
  { kind: 'quiz', dir: quizzes.DIR, remote: 'quizzen', validate: quizzes.validate },
  { kind: 'oefenblad', dir: oefenbladen.DIR, remote: 'oefenbladen', validate: oefenbladen.validate },
  { kind: 'sessie', dir: rondetafel.DIR, remote: 'ronde-tafel', validate: rondetafel.validate },
  // De planning van De Zonnewijzer: thuis voorbereiden, op het bord gebruiken.
  { kind: 'zonnewijzer', dir: zonnewijzer.DIR, remote: 'zonnewijzer', validate: d => { if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Ongeldig bestand.'); } },
  // De Kronieken: mappen, online bordboeken en koppelingen per les (de pdf's zelf blijven op elke pc).
  { kind: 'kronieken', dir: kronieken.LINKS_DIR, remote: 'kronieken', validate: kronieken.geldigeLinks },
  // Taken: thuis klaarzetten, op het digibord werken de leerlingen eraan. Alleen de taak zelf, nooit het werk.
  { kind: 'taak', dir: taken.PLAN, remote: 'taken', validate: taken.planGeldig },
  // De klastaken van De Wachtlijst (de taken en de beurt, niet de volgorde van de leerlingen).
  { kind: 'klastaken', dir: klastaken.DIR, remote: 'klastaken', validate: klastaken.geldig },
]);
let syncTimer = null;
function runSync() {
  return lesmap.sync().then(changed => {
    for (const kind of changed) {
      if (LIBS[kind]) sendLibrary(kind, null, true);
      else if (kind === 'zonnewijzer') io.to('host').emit('zw-gewijzigd');
      else if (kind === 'kronieken') io.to('host').emit('kr-lijst', kronieken.lijst());
      else if (kind === 'klastaken') io.to('host').emit('wk-taken', klastaken.read());
    }
    if (taken.uitLesmap()) {
      io.to('host').emit('tk-lijst', taken.lijst());
      io.emit('tk-nieuw');
    }
    io.to('host').emit('lesmap', lesmap.view());
  });
}
function syncSoon() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(runSync, 3000);
}

// Een leerling bouwde iets: het Klaseiland op het bord even later bijwerken (niet bij elke klik).
let eilandTimer = null;
function eilandSoon() {
  if (eilandTimer) return;
  eilandTimer = setTimeout(() => {
    eilandTimer = null;
    io.to('host').emit('bu-eiland', burchten.eiland());
  }, 3000);
}

// Taken: een leerling werkte iets bij. Het bord hooguit twee keer per seconde bijwerken.
let takenTimer = null;
function takenSoon() {
  if (takenTimer) return;
  takenTimer = setTimeout(() => {
    takenTimer = null;
    io.to('host').emit('tk-lijst', taken.lijst());
  }, 500);
}

// De docentenschermen, elk bij zijn adres.
const PAGINAS = [['/host', 'host.html'], ['/rondetafel', 'rondetafel.html'], ['/toren', 'toren.html'], ['/schattenjacht', 'schattenjacht.html'], ['/laserslag', 'laserslag.html'], ['/ridderrace', 'ridderrace.html'], ['/kristalroof', 'kristalroof.html'], ['/verrader', 'verrader.html'], ['/burchtbouwers', 'burchtbouwers.html'], ['/duel', 'duel.html'], ['/packnight', 'packnight.html'], ['/strijdrossen', 'strijdrossen.html'], ['/gauntlet', 'gauntlet.html'], ['/ridder-royale', 'royale.html'], ['/sterrenvreter', 'sterrenvreter.html'], ['/ridderslang', 'ridderslang.html'], ['/burchtstorm', 'burchtstorm.html'], ['/poortwacht', 'poortwacht.html'], ['/neonvlucht', 'neonvlucht.html'], ['/diepboor', 'diepboor.html'], ['/pixelridder', 'pixelridder.html'], ['/robomol', 'robomol.html'], ['/kerker', 'kerker.html'], ['/hofschilder', 'hofschilder.html'], ['/robopaarden', 'robopaarden.html'], ['/neonduel', 'neonduel.html'], ['/leraarbaas', 'leraarbaas.html'], ['/cybergalaga', 'cybergalaga.html'], ['/bomberknight', 'bomberknight.html'], ['/rijk', 'rijk.html'], ['/oefenblad', 'oefenblad.html'], ['/reeks', 'reeks.html'], ['/wapenkamer', 'wapenkamer.html'], ['/kringgesprek', 'kringgesprek.html'], ['/kronieken', 'kronieken.html'], ['/zonnewijzer', 'zonnewijzer.html'], ['/oefenblad-print', 'oefenblad-print.html'], ['/klas', 'klas.html'], ['/zorg', 'zorg.html'], ['/taken', 'taken.html'], ['/zorg-fiche', 'zorg-fiche.html'], ['/runenraadsel', 'runenraadsel.html'], ['/klaseiland', 'klaseiland.html'], ['/netwerk', 'netwerk.html'], ['/welkom', 'welkom.html'], ['/privacy', 'privacy.html']];

// Het docentenscherm werkt op de pc waar de server draait (meestal het digibord),
// en op een tweede scherm dat de leerkracht met een koppelcode koppelde (de bureau-pc).
function isLocal(address) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}
function isLeerkracht(req) {
  return isLocal(req.socket.remoteAddress) || !!schermen.uitCookie(req.headers.cookie);
}
const GEEN_TOEGANG = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LANcelot</title>'
  + '<body style="font-family:system-ui,sans-serif;background:#0f1424;color:#e8ecf6;display:grid;place-items:center;min-height:90vh;text-align:center;padding:16px">'
  + '<div><h2>Dit is het scherm van de leerkracht</h2><p>Leerlingen spelen via het adres op het bord.</p>'
  + '<p style="opacity:.75">Ben jij de leerkracht op je bureau-pc? <a style="color:#7fc8ff" href="/koppel">Koppel deze pc met een code van het digibord</a>.</p></div>';

for (const [route, page] of PAGINAS) {
  app.get(route, (req, res) => {
    if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, 'public', page));
  });
}
// Het Runenraadsel voor leerlingen: elke dag te spelen op hun eigen toestel, ook als er geen spel loopt.
app.get('/runen', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'runen.html'));
});
// Mijn taken: de leerling werkt aan wat de leerkracht hem gaf, op zijn eigen toestel, ook als er geen spel loopt.
app.get('/mijn-taken', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'mijn-taken.html'));
});
// Mijn burcht: elke leerling bouwt met zijn Eer, op zijn eigen toestel, ook als er geen spel loopt.
app.get('/burcht', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'burcht.html'));
});
beheer.routes(app, isLeerkracht);
// De Kronieken: eigen bordboeken en handleidingen tonen en toevoegen (enkel de leerkracht).
kronieken.routes(app, isLeerkracht, express, () => io.to('host').emit('kr-lijst', kronieken.lijst()));
// Een tweede leerkrachtscherm koppelen: de bureau-pc tikt hier de code van het digibord in.
app.get('/koppel', (req, res) => {
  if (isLeerkracht(req)) return res.redirect('/host');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'koppel.html'));
});
app.post('/koppel', express.json({ limit: '2kb' }), (req, res) => {
  try {
    const { code, naam } = req.body || {};
    const { sleutel, scherm } = schermen.koppel(code, naam, req.socket.remoteAddress);
    res.setHeader('Set-Cookie', `${schermen.COOKIE}=${sleutel}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${5 * 365 * 24 * 3600}`);
    stuurSchermen();
    io.to('host').emit('scherm-gekoppeld', scherm.naam);
    res.json({ ok: true });
  } catch (err) {
    stuurSchermen();
    res.status(400).json({ error: err.message });
  }
});
// Wie gekoppeld is, en of dat scherm nu open staat.
// De koppelcode zelf gaat alleen naar het digibord, nooit naar een gekoppeld scherm.
function stuurSchermen(alleen) {
  const open = new Set();
  for (const s of io.sockets.sockets.values()) if (s.data.scherm) open.add(s.data.scherm);
  const lijst = schermen.lijst().map(s => ({ ...s, open: open.has(s.id) }));
  const code = schermen.codeView();
  for (const s of alleen ? [alleen] : io.sockets.sockets.values()) {
    if (s.data.host) s.emit('schermen', { lijst, code: s.data.scherm ? null : code, extern: !!s.data.scherm });
  }
}
// Zo herkent een tweede start dat LANcelot al draait.
app.get('/lancelot-ping', (req, res) => res.json({ lancelot: true }));
// Resultaten downloaden kan alleen op de pc van de leerkracht.
app.get('/resultaten/:file', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).end();
  try {
    res.download(results.filePath(req.params.file));
  } catch {
    res.status(404).end();
  }
});
// Het logboek voor Excel: het overzicht van één sessie, één leerplandoel of de hele doelenkaart.
app.get('/logboek/:what', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).end();
  const what = req.params.what;
  const out = what === 'sessie' ? overzicht.sessionCsv(String(req.query.id || ''))
    : what === 'doel' ? overzicht.doelCsv(String(req.query.code || ''))
      : what === 'doelenkaart' ? overzicht.kaartCsv() : null;
  if (!out) return res.status(404).type('text/plain; charset=utf-8').send('Niets gevonden in het logboek.');
  res.attachment(out.name);
  res.type('text/csv; charset=utf-8').send(out.text);
});
// Exporteren: één item (?file=), een map (?folder=) of alles, als bestand om op een andere pc te importeren.
app.get('/export/:kind', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).end();
  const l = LIBS[req.params.kind];
  if (!l) return res.status(404).end();
  try {
    const { name, bundle } = l.mod.lib.exportBundle({ file: req.query.file, folder: req.query.folder });
    res.attachment(name);
    res.type('application/json').send(JSON.stringify(bundle, null, 2));
  } catch (err) {
    res.status(400).type('text/plain; charset=utf-8').send(err.message);
  }
});
// Posters voor aan de muren van de arena's. Eigen foto's in de map posters/ bij de gegevens;
// die map gaat nooit mee naar GitHub. De grappige standaardposters (public/img/posters) kunnen uit in de instellingen.
const POSTERS = gegevens.pad('posters');
app.get('/posters/lijst', (req, res) => {
  let files = [];
  try { files = fs.readdirSync(POSTERS).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f)).sort(); } catch {}
  const s = settings.read();
  if (s.posters === false) return res.json({ eigen: [], grappig: false });
  res.json({ eigen: files.slice(0, 40), grappig: s.grappigePosters !== false });
});
app.use('/posters', express.static(POSTERS, { setHeaders: res => res.setHeader('Cache-Control', 'no-cache') }));
// Pagina's, scripts en stijlen gezipt versturen: een gsm laadt de leerlingpagina dan in een kwart van de tijd
// (1,9 MB wordt ongeveer 0,5 MB). Elk bestand wordt één keer gezipt en bewaard tot het verandert.
const PUBLIC = path.join(__dirname, 'public');
const gzipped = new Map();
app.get(/^\/(?:[\w./-]*\.(?:js|css|html))?$/, (req, res, next) => {
  if (!/\bgzip\b/.test(req.headers['accept-encoding'] || '')) return next();
  const file = path.join(PUBLIC, req.path === '/' ? 'index.html' : req.path);
  if (!file.startsWith(PUBLIC + path.sep)) return next();
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return next();
    const tag = `W/"${st.size.toString(16)}-${st.mtimeMs.toString(16)}-gz"`;
    let hit = gzipped.get(file);
    if (!hit || hit.tag !== tag) {
      try { hit = { tag, body: zlib.gzipSync(fs.readFileSync(file)) }; } catch { return next(); }
      gzipped.set(file, hit);
    }
    res.set({ 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding', ETag: tag, 'Cache-Control': 'no-cache' }).type(path.extname(file));
    if (req.headers['if-none-match'] === tag) return res.status(304).end();
    res.send(hit.body);
  });
});
// Altijd even navragen of een bestand veranderd is, zodat gsm's en Chromebooks na een update meteen de nieuwe versie hebben.
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html', setHeaders: res => res.setHeader('Cache-Control', 'no-cache') }));

// Virtuele netwerkkaarten (WSL, VirtualBox, VPN, hotspot, gsm via usb) komen achteraan, want leerlingen kunnen die meestal niet bereiken.
const VIRTUAL = /vethernet|virtualbox|vmware|wsl|docker|hyper-v|tailscale|zerotier|vpn|nordlynx|wireguard|openvpn|tap-|bluetooth|loopback|lokale verbinding\*|local area connection\*|rndis|remote ndis|tether|hotspot/i;
const REAL = /wi-?fi|wlan|wireless|draadloos|ethernet|^eth|^en/i;

// Het adres waarlangs Windows naar buiten gaat (de standaardroute). Een UDP-'verbinding' verstuurt niets,
// maar vertelt wel welke netwerkkaart het systeem kiest. Dat is bijna altijd het echte wifi- of kabelnetwerk.
let routeAddress = '';
function probeRoute() {
  const sock = dgram.createSocket('udp4');
  sock.on('error', () => sock.close());
  try {
    sock.connect(53, '8.8.8.8', err => {
      if (!err) {
        try { routeAddress = sock.address().address; } catch {}
      }
      sock.close();
    });
  } catch {
    sock.close();
  }
}
probeRoute();
setInterval(probeRoute, 60000).unref();

// Hoe kleiner het getal, hoe eerder het adres op het bord komt.
// Eerst het adres waarlangs leerlingen echt binnenkwamen (of dat de leerkracht koos), dan de standaardroute.
function rank(i, preferred) {
  if (i.address === preferred) return -10;
  let score = 0;
  if (i.address === routeAddress) score -= 4;
  if (VIRTUAL.test(i.name)) score += 10;
  else if (REAL.test(i.name)) score -= 2;
  // Windows-hotspot (192.168.137.x) en gsm-tethering (192.168.42.x, 192.168.225.x, 172.20.10.x) zijn zelden het schoolnetwerk.
  if (/^192\.168\.(137|42|225)\.|^172\.20\.10\./.test(i.address)) score += 5;
  return score;
}

function lanInterfaces() {
  const preferred = settings.read().preferredAddress;
  return Object.entries(os.networkInterfaces())
    .flatMap(([name, list]) => (list || []).map(i => ({ name, ...i })))
    .filter(i => i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.'))
    .sort((a, b) => rank(a, preferred) - rank(b, preferred));
}

function lanAddresses() {
  return lanInterfaces().map(i => i.address);
}

// Adressen met QR-code voor het docentenscherm. Het eerste is het grote adres op het bord.
function sendAddresses(target) {
  const list = lanInterfaces();
  const preferred = settings.read().preferredAddress;
  const urls = list.map(i => `http://${i.address}:${PORT}`);
  return Promise.all(urls.map(url => QRCode.toString(url, { type: 'svg', margin: 1 })))
    .then(qrs => target.emit('addresses', urls.map((url, k) => ({ url, qr: qrs[k], name: list[k].name, sure: list[k].address === preferred }))));
}

// Eén fout in een spel mag nooit de hele server (en dus de les) laten vallen.
// Elke handler vangt zijn eigen fouten op; de leerling krijgt een foutmelding in plaats van een vastgelopen knop.
function safeHandlers(socket) {
  const on = socket.on.bind(socket);
  socket.on = (event, fn) => on(event, (...args) => {
    try {
      return fn(...args);
    } catch (err) {
      console.error(`Fout bij '${event}':`, (err && err.stack) || err);
      const cb = args[args.length - 1];
      if (typeof cb === 'function') {
        try { cb({ error: 'Er ging iets mis. Probeer het opnieuw.' }); } catch {}
      }
    }
  });
}
// Ook een fout in een speltimer laat de server gewoon verder draaien.
process.on('uncaughtException', err => console.error('Onverwachte fout:', (err && err.stack) || err));
process.on('unhandledRejection', err => console.error('Onverwachte fout:', (err && err.stack) || err));

pauze.opWijziging(stand => io.emit('pauze', stand));

io.on('connection', socket => {
  safeHandlers(socket);
  // De namen op de klaslijst, om bij het aanmelden aan te tikken. Meteen meesturen, nog voor de stand van
  // een spel: zo weet de leerling al of een onthouden naam op de lijst staat voordat hij automatisch meedoet.
  socket.emit('klas-namen', klas.names());
  // Staat de pauzeknop aan, dan ziet ook wie nu pas binnenkomt meteen het slot.
  if (pauze.stand().aan) socket.emit('pauze', pauze.stand());
  // Het thema dat de leerkracht koos (Instellingen > Uiterlijk), voor elk scherm.
  socket.emit('thema', settings.read().thema || 'nachtburcht');
  socket.on('klas-namen', (_, cb) => typeof cb === 'function' && cb(klas.names()));
  socket.on('klas-bezet', (playerId, cb) => typeof cb === 'function' && cb(bezetteNamen(playerId)));
  socket.on('klas-claim', (name, cb) => typeof cb === 'function' && cb({ id: oudeSpeler(name) }));
  const scherm = isLocal(socket.handshake.address) ? null : schermen.uitCookie(socket.handshake.headers.cookie);
  const host = socket.handshake.query.role === 'host' && (isLocal(socket.handshake.address) || !!scherm);
  socket.data.host = host;
  if (host && scherm) socket.data.scherm = scherm.id;

  // Een leerling kwam binnen: via welk adres van deze pc? Dat adres werkt dus, en komt voortaan vooraan.
  if (!isLocal(socket.handshake.address)) {
    const local = String(socket.request.socket.localAddress || '').replace(/^::ffff:/, '');
    if (local && local !== settings.read().preferredAddress && lanAddresses().includes(local)) {
      settings.write({ preferredAddress: local });
      sendAddresses(io.to('host'));
    }
  }

  // Eigen ridders: iedereen mag ze zien, een leerling stelt de zijne in.
  socket.on('avatars-get', (_, cb) => typeof cb === 'function' && cb(avatars.all()));
  socket.on('avatar-set', ({ name, avatar } = {}) => {
    // De runenkrans moet je verdienen in het Runenraadsel.
    const av = avatar && typeof avatar === 'object' ? { ...avatar, runen: Math.min(Number(avatar.runen) || 0, runen.kransVan(name)) } : avatar;
    if (avatars.set(name, av)) io.emit('avatars', avatars.all());
  });

  // Het Runenraadsel: de stand van een leerling en een poging. Het bord krijgt na elke poging de kleuren (nooit de letters).
  socket.on('hier', ({ naam, waar } = {}) => hier(socket, naam, waar));
  socket.on('rn-get', (naam, cb) => {
    if (typeof cb !== 'function') return;
    try { cb({ ok: true, ...runen.view(naam) }); } catch (err) { cb({ error: err.message }); }
  });
  // Mijn burcht: je Eer, je rang en je burcht. Bouwen kan alleen tijdens Kasteeltijd.
  socket.on('bu-get', (naam, cb) => {
    if (typeof cb !== 'function') return;
    hier(socket, naam, 'burcht');
    try { cb({ ok: true, ...burchten.view(naam) }); } catch (err) { cb({ error: err.message }); }
  });
  for (const [event, fn] of [['bu-zet', burchten.zet], ['bu-eilandje', burchten.eilandje], ['bu-stijl', burchten.stijl]]) {
    socket.on(event, ({ naam, ...arg } = {}, cb) => {
      if (typeof cb !== 'function') return;
      try {
        cb({ ok: true, ...fn(naam, arg) });
        eilandSoon();
      } catch (err) {
        cb({ error: err.message });
      }
    });
  }
  // Mijn taken: de lijst, een taak openen, een vakje of een quizvraag beantwoorden en inleveren.
  // Een leerling meldt zich aan met zijn naam, net zoals bij Mijn burcht.
  for (const [event, fn, bord] of [['tk-mijn', taken.mijn], ['tk-open', taken.open], ['tk-antwoord', taken.antwoord, true], ['tk-inleveren', taken.inleveren, true], ['tk-quiz', taken.quizAntwoord, true]]) {
    socket.on(event, (arg, cb) => {
      if (typeof cb !== 'function') return;
      if (event === 'tk-mijn') hier(socket, arg, 'taken');
      try {
        cb({ ok: true, ...fn(arg) });
        if (bord) takenSoon();
      } catch (err) {
        cb({ error: err.message });
      }
    });
  }
  socket.on('tk-aantal', (naam, cb) => {
    if (typeof cb !== 'function') return;
    if (socket.data.waar !== 'taken') hier(socket, naam, 'start');
    cb(taken.aantal(naam));
  });

  socket.on('rn-raad', (arg, cb) => {
    if (typeof cb !== 'function') return;
    try {
      cb({ ok: true, ...runen.raad(arg) });
      io.to('host').emit('rn-bord', runen.bord());
    } catch (err) {
      cb({ error: err.message, onbekend: !!err.onbekend });
    }
  });



  if (host) {
    socket.join('host');
    // Tweede leerkrachtscherm: welk scherm dit is, de lijst van gekoppelde schermen en de koppelcode.
    // Een nieuwe code maken kan alleen op de pc waar LANcelot draait, zodat één gestolen cookie er geen nieuwe kan bijmaken.
    socket.emit('scherm-info', { extern: !!scherm, naam: scherm ? scherm.naam : '' });
    stuurSchermen(socket);
    if (scherm) stuurSchermen();
    socket.on('disconnect', () => { if (scherm) setTimeout(() => stuurSchermen(), 100); });
    socket.on('schermen-code', (aan, cb) => {
      if (scherm) return cb && cb({ error: 'Een koppelcode maak je op het digibord zelf.' });
      if (aan === false) schermen.stopCode();
      else schermen.nieuweCode();
      stuurSchermen();
      cb && cb({ ok: true });
    });
    socket.on('schermen-ontkoppel', (id, cb) => {
      try {
        schermen.ontkoppel(String(id || ''));
      } catch (err) {
        return cb && cb({ error: err.message });
      }
      for (const s of io.sockets.sockets.values()) if (s.data.scherm === id) {
        s.emit('scherm-ontkoppeld');
        s.leave('host');
        s.data.host = false;
        setTimeout(() => s.disconnect(true), 500);
      }
      stuurSchermen();
      cb && cb({ ok: true });
    });
    for (const kind of Object.keys(LIBS)) sendLibrary(kind, socket);
    sendAddresses(socket);
    // De leerkracht kiest het adres dat werkt; dat onthouden we voor de volgende keer.
    socket.on('choose-address', address => {
      if (!lanAddresses().includes(address)) return;
      settings.write({ preferredAddress: address });
      sendAddresses(io.to('host'));
    });
    socket.emit('settings', settings.publicView());
    beheer.host(socket, { port: PORT, extern: !!scherm });
    // Mijn lesmap: kiezen, nu synchroniseren, openen.
    socket.emit('lesmap', lesmap.view());
    socket.on('lesmap-suggest', (_, cb) => typeof cb === 'function' && cb(lesmap.suggestions()));
    socket.on('lesmap-choose', (folder, cb) => {
      try {
        lesmap.choose(folder);
      } catch (err) {
        return cb && cb({ error: err.message });
      }
      io.to('host').emit('lesmap', lesmap.view());
      runSync().then(() => cb && cb({ ok: true, ...lesmap.view() }));
    });
    socket.on('lesmap-sync', (_, cb) => runSync().then(() => cb && cb(lesmap.view())));
    // Het gewone Windows-venster om een map te kiezen.
    socket.on('lesmap-pick', (_, cb) => {
      if (scherm) return cb && cb({ error: 'Dat venster zou op het digibord openen. Typ het pad van de map hieronder.' });
      if (process.platform !== 'win32') return cb && cb({ error: 'Typ het pad van de map hieronder.' });
      const ps = 'Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; '
        + '$d.Description = \'Kies je lesmap in OneDrive of Google Drive\'; $d.ShowNewFolderButton = $true; '
        + '$w = New-Object System.Windows.Forms.Form -Property @{TopMost=$true}; '
        + 'if ($d.ShowDialog($w) -eq \'OK\') { [Console]::OutputEncoding = [Text.Encoding]::UTF8; $d.SelectedPath }';
      execFile('powershell', ['-NoProfile', '-STA', '-Command', ps], { windowsHide: true }, (err, out) => {
        cb && cb(err ? { error: 'Het venster om een map te kiezen opende niet. Typ het pad hieronder.' } : { path: String(out).trim() });
      });
    });
    socket.on('lesmap-open', () => {
      const dir = settings.read().lesmap;
      if (dir && process.platform === 'win32') execFile('explorer', [dir]);
    });
    socket.emit('results', results.list());
    socket.on('open-results-folder', () => {
      fs.mkdirSync(results.DIR, { recursive: true });
      if (process.platform === 'win32') execFile('explorer', [results.DIR]);
    });
    socket.emit('state', game.hostState());
    socket.emit('rt-state', rt.hostState());
    socket.emit('tw-state', toren.hostState());
    socket.emit('sj-state', schat.hostState());
    socket.emit('ls-state', laserslag.hostState());
    socket.emit('rr-state', race.hostState());
    socket.emit('kr-state', roof.hostState());
    socket.emit('bb-state', burcht.hostState());
    socket.emit('du-state', duel.hostState());
    socket.emit('pk-state', knight.hostState());
    socket.emit('sr-state', rossen.hostState());
    socket.emit('cg-state', galaga.hostState());
    socket.emit('bk-state', bomber.hostState());
    socket.emit('nd-state', neon.hostState());
    socket.emit('lb-state', baas.hostState());
    socket.emit('rk-state', rijk.hostState());
    socket.emit('vr-state', verrader.hostState());
    socket.emit('ob-state', oefenblad.hostState());

    socket.on('pauze-zet', ({ aan, tekst } = {}) => pauze.zet(aan, tekst));
    socket.on('thema-zet', id => {
      if (!THEMAS.includes(id)) return;
      settings.write({ thema: id });
      io.emit('thema', id);
    });
    socket.on('stop-others', (except, cb) => {
      stopOthers(String(except || ''));
      if (typeof cb === 'function') cb({ ok: true });
    });
    socket.on('load', (file, cb) => {
      try {
        const busy = busyWith('toernooi');
        if (busy) throw busyError(busy);
        game.load(quizzes.play(file, { shared: true }));
        cb && cb({ ok: true });
      } catch (err) {
        cb && cb({ error: err.message, busy: !!err.busy });
      }
    });
    // Quizzen maken en bewerken. Elke handler antwoordt met { ok, ... } of { error }.
    const handle = fn => (arg, cb) => {
      try {
        cb && cb({ ok: true, ...fn(arg) });
      } catch (err) {
        cb && cb({ error: err.message, busy: !!err.busy });
      }
    };
    const refreshList = () => sendLibrary('quiz');
    // Mijn klas: de klaslijst, de leerplandoelen en wat het logboek al weet.
    socket.on('klas-get', handle(() => ({ klas: klas.read(), vakgroepen: niveaus.VAKGROEPEN })));
    // De Wapenkamer: de klastaken (Wachtlijst). Elke wijziging gaat naar alle docentenschermen.
    socket.on('wk-taken-get', handle(() => ({ data: klastaken.read() })));
    socket.on('wk-taken-zet', handle(arg => {
      const data = klastaken.write(arg || {});
      socket.to('host').emit('wk-taken', data);
      syncSoon();
      return { data };
    }));
    socket.on('klas-niveau', handle(({ id, niveau, vak } = {}) => ({ klas: klas.setNiveau(id, niveau, vak) })));
    // Op welk niveau de klas de quizspellen speelt (Page, Schildknaap, Ridder of alles door elkaar).
    // Uitleg na een fout antwoord in de spellen (in het Toernooi en het Duel altijd).
    socket.emit('uitleg-spellen', settings.read().uitlegSpellen !== false);
    socket.on('uitleg-spellen', aan => {
      settings.write({ uitlegSpellen: aan !== false });
      io.to('host').emit('uitleg-spellen', aan !== false);
    });
    socket.emit('quiz-niveau', quizzes.classNiveau());
    socket.on('quiz-niveau', niveau => {
      settings.write({ quizNiveau: ['alle', 'leerling'].includes(niveau) ? niveau : niveaus.clean(niveau) || 'schildknaap' });
      io.to('host').emit('quiz-niveau', quizzes.classNiveau());
    });
    socket.on('klas-save', handle(data => {
      const saved = klas.write(data);
      io.emit('klas-namen', klas.names());
      return { klas: saved };
    }));
    socket.on('doelen-get', handle(() => ({ doelen: doelen.all(), leerjaar: klas.read().leerjaar, leerjaren: doelen.LEERJAREN })));
    socket.on('logboek-get', handle(() => ({ logboek: logboek.summary() })));
    // De Opwarmer: herhaalvragen uit vorige lessen, gespeeld als Toernooi.
    socket.on('opwarmer-maak', handle(opts => opwarmer.make(opts || {})));
    socket.on('opwarmer-start', handle(quiz => {
      const busy = busyWith('toernooi');
      if (busy) throw busyError(busy);
      game.load(opwarmer.prepare(quiz));
      return {};
    }));
    // Het startpakket 6e leerjaar: kant-en-klare quizzen en oefenbladen erbij zetten.
    socket.on('startpakket-status', handle(() => startpakket.status()));
    socket.on('startpakket-installeer', handle(() => {
      const out = startpakket.installeer();
      sendLibrary('quiz');
      sendLibrary('oefenblad');
      return out;
    }));
    socket.on('sessies-get', handle(() => ({ sessies: overzicht.sessions() })));
    socket.on('sessie-get', handle(id => {
      const sessie = overzicht.session(String(id || ''));
      if (!sessie) throw new Error('Die sessie staat niet (meer) in het logboek.');
      return { sessie };
    }));
    socket.on('doelenkaart-get', handle(() => ({ kaart: overzicht.kaart() })));
    socket.on('zorg-get', handle(opts => ({ zorg: zorg.overzicht(opts || {}) })));
    // Taken geven: een oefenblad of quiz aan een of meer leerlingen, elk op zijn niveau.
    // Na elke wijziging krijgen alle leerlingschermen een seintje, zodat Mijn taken meteen klopt.
    const taak = fn => handle(arg => {
      const out = fn(arg || {});
      io.to('host').emit('tk-lijst', taken.lijst());
      io.emit('tk-nieuw');
      // Een nieuwe of gewiste taak gaat ook naar Mijn lesmap.
      syncSoon();
      return out || {};
    });
    socket.on('tk-bronnen', handle(() => ({ quizzen: quizzes.list(), bladen: oefenbladen.list(), klas: klas.names() })));
    socket.on('tk-lijst', handle(() => ({ taken: taken.lijst() })));
    socket.on('tk-voorbeeld', handle(arg => taken.voorbeeld(arg || {})));
    socket.on('tk-detail', handle(arg => taken.detail(arg || {})));
    socket.on('tk-maak', taak(arg => ({ id: taken.maak(arg).id })));
    socket.on('tk-toevoegen', taak(arg => ({ n: taken.voegToe(arg) })));
    socket.on('tk-weg', taak(taken.haalWeg));
    socket.on('tk-niveau', taak(taken.zetNiveau));
    socket.on('tk-sluit', taak(arg => taken.sluit(arg.id)));
    socket.on('tk-heropen', taak(taken.heropen));
    socket.on('tk-wis', taak(arg => taken.wis(arg.id)));
    socket.on('notitie-add', handle(({ leerling, tekst } = {}) => ({ notities: notities.add(leerling, tekst).slice().reverse() })));
    socket.on('notitie-del', handle(({ leerling, t } = {}) => ({ notities: notities.remove(leerling, t).slice().reverse() })));
    // Herhaalquizzen maken vanuit het zorgoverzicht. Ze komen bij je quizzen in de map Herhaling.
    socket.on('herhaal-doelen', handle(opts => {
      const out = herhaal.voorDoelen(opts || {});
      refreshList();
      return out;
    }));
    socket.on('herhaal-persoonlijk', handle(opts => {
      const out = herhaal.persoonlijk(opts || {});
      refreshList();
      return out;
    }));
    socket.on('open-logboek-folder', () => {
      fs.mkdirSync(logboek.DIR, { recursive: true });
      if (process.platform === 'win32') execFile('explorer', [logboek.DIR]);
    });
    // Quizzen, oefenbladen en sessies ordenen in mappen, en importeren van een andere pc.
    const lib = fn => handle(({ kind, ...arg } = {}) => {
      if (!LIBS[kind]) throw new Error('Onbekende soort.');
      const res = fn(LIBS[kind].mod.lib, arg);
      sendLibrary(kind);
      return res || {};
    });
    socket.on('lib-folder-add', lib((l, { name, parent }) => l.addFolder(name, parent || '')));
    socket.on('lib-folder-move', lib((l, { from, into }) => l.moveFolder(from, into || '')));
    socket.on('lib-folder-rename', lib((l, { from, to }) => l.renameFolder(from, to)));
    socket.on('lib-folder-remove', lib((l, { name }) => l.removeFolder(name)));
    socket.on('lib-move', lib((l, { file, folder }) => l.move(file, folder || '')));
    // Meerdere items tegelijk verwijderen (naar de prullenbak).
    socket.on('lib-remove', lib((l, { files }) => {
      if (!Array.isArray(files) || !files.length || files.length > 5000) throw new Error('Kies eerst wat je wil verwijderen.');
      return { count: l.trash(files) };
    }));
    socket.on('lib-import', lib((l, { text, folder }) => l.importBundle(text, folder || '')));
    socket.on('parse', handle(text => ({ quiz: quizzes.parseAiText(text) })));
    socket.on('open-quiz', handle(file => ({ quiz: quizzes.load(file) })));
    socket.on('save', handle(({ quiz, file } = {}) => {
      const saved = quizzes.save(quiz, file);
      refreshList();
      return { file: saved };
    }));
    socket.on('delete', handle(file => {
      quizzes.remove(file);
      refreshList();
      return {};
    }));

    // Eigen AI-sleutel (optioneel): Gemini, Claude of ChatGPT. De sleutel gaat nooit terug naar de browser.
    socket.on('save-settings', handle((arg = {}) => {
      const changes = {};
      if (typeof arg.aiDienst === 'string' && settings.DIENSTEN[arg.aiDienst]) changes.aiDienst = arg.aiDienst;
      for (const d of Object.values(settings.DIENSTEN)) {
        if (typeof arg[d.key] === 'string') changes[d.key] = arg[d.key].trim().slice(0, 300);
        if (typeof arg[d.model] === 'string') {
          const model = arg[d.model].trim() || settings.DEFAULTS[d.model];
          if (/^[\w.-]{1,80}$/.test(model)) changes[d.model] = model;
        }
      }
      if ('geminiKey' in changes || 'geminiModel' in changes) changes.geminiAutoModel = '';
      settings.write(changes);
      io.to('host').emit('settings', settings.publicView());
      return {};
    }));
    socket.on('generate', ({ prompt, files } = {}, cb) => {
      generateQuiz(prompt, files)
        .then(quiz => cb && cb({ ok: true, quiz }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });

    // Het Klaseiland: alle burchten op het bord, Kasteeltijd, Eer geven en het klasdoel.
    socket.on('bu-eiland', handle(() => ({ eiland: burchten.eiland() })));
    socket.on('bu-ridderboek', handle(() => ({ boek: burchten.ridderboek() })));
    socket.on('bu-kasteeltijd', handle(aan => {
      burchten.setKasteeltijd(aan);
      io.emit('bu-kasteeltijd', burchten.kasteeltijd());
      eilandSoon();
      return {};
    }));
    const eerWijzigt = fn => handle(arg => {
      const out = fn(arg);
      io.emit('bu-eer');
      eilandSoon();
      return { ...out, boek: burchten.ridderboek() };
    });
    socket.on('bu-geef', eerWijzigt(arg => burchten.geef(arg || {})));
    socket.on('bu-terug', eerWijzigt(id => burchten.neemTerug(String(id || ''))));
    socket.on('bu-wisnaam', eerWijzigt(id => burchten.wisNaam(String(id || ''))));
    socket.on('bu-klasdoel', eerWijzigt(arg => burchten.setKlasdoel(arg || {})));

    // Het Runenraadsel op het bord, en de woorden van de week.
    socket.on('rn-bord', handle(() => ({ bord: runen.bord() })));
    socket.on('rn-onthul', handle(() => runen.onthul()));
    socket.on('rn-lijst-get', handle(() => ({ lijst: runen.lijstView(), prompt: runen.chatPrompt(), doelen: doelen.all().filter(d => d.vak === 'Nederlands' && String(d.leerjaar) === String(klas.read().leerjaar)) })));
    socket.on('rn-lijst-save', handle(arg => {
      const lijst = runen.bewaarLijst(arg || {});
      io.to('host').emit('rn-bord', runen.bord());
      return { lijst };
    }));
    socket.on('rn-lijst-ai', ({ text } = {}, cb) => {
      runen.vulAan(text, ai, aiJson)
        .then(res => cb && cb({ ok: true, ...res }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });

    socket.on('rn-lijst-thema', ({ thema, text } = {}, cb) => {
      runen.maakLijst(thema, text, ai, aiJson)
        .then(res => cb && cb({ ok: true, ...res }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });

    socket.on('rt-generate', ({ prompt } = {}, cb) => {
      generateQuiz(prompt, [], rondetafel.parseAiText)
        .then(session => cb && cb({ ok: true, session }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });

    // De Ronde Tafel
    const refreshSessions = () => sendLibrary('sessie');
    socket.on('rt-parse', handle(text => ({ session: rondetafel.parseAiText(text) })));
    socket.on('rt-open', handle(file => ({ session: rondetafel.load(file) })));
    socket.on('rt-save', handle(({ session, file } = {}) => {
      const saved = rondetafel.save(session, file);
      refreshSessions();
      return { file: saved };
    }));
    socket.on('rt-delete', handle(file => {
      rondetafel.remove(file);
      refreshSessions();
      return {};
    }));
    socket.on('rt-load', handle(file => {
      const busy = busyWith('rondetafel');
      if (busy) throw busyError(busy);
      rt.load(rondetafel.load(file));
      return {};
    }));
    socket.on('rt-go', index => Number.isInteger(index) && rt.go(index));
    socket.on('rt-lock', () => rt.toggleLock());
    socket.on('rt-results', () => rt.toggleResults());
    socket.on('rt-hide', key => rt.hide(key));
    socket.on('rt-stop', (_, cb) => cb && cb({ file: rt.stop() }));

    // De prinses in de toren
    socket.on('tw-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('toren');
      if (busy) throw busyError(busy);
      toren.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('tw-start', () => toren.start());
    socket.on('tw-kick', id => toren.kick(id));
    socket.on('tw-finish', () => toren.finish());
    socket.on('tw-restart', () => toren.quiz && toren.load(toren.quiz, toren.minutes, toren.tempo));
    socket.on('tw-stop', (_, cb) => cb && cb({ file: toren.stop() }));

    // Schattenjacht
    socket.on('sj-load', handle(({ file, minutes } = {}) => {
      const busy = busyWith('schat');
      if (busy) throw busyError(busy);
      schat.load(quizzes.play(file), Number(minutes));
      return {};
    }));
    socket.on('sj-start', () => schat.start());
    socket.on('sj-kick', id => schat.kick(id));
    socket.on('sj-finish', () => schat.finish());
    socket.on('sj-restart', () => schat.quiz && schat.load(schat.quiz, schat.minutes));
    socket.on('sj-stop', (_, cb) => cb && cb({ file: schat.stop() }));

    // Laserslag
    socket.on('ls-load', handle(({ file, minutes, mode, tempo } = {}) => {
      const busy = busyWith('laserslag');
      if (busy) throw busyError(busy);
      laserslag.load(quizzes.play(file), Number(minutes), mode, tempo);
      return {};
    }));
    socket.on('ls-start', () => laserslag.start());
    socket.on('ls-kick', id => laserslag.kick(id));
    socket.on('ls-team', id => laserslag.switchTeam(id));
    socket.on('ls-finish', () => laserslag.finish());
    socket.on('ls-restart', () => laserslag.quiz && laserslag.load(laserslag.quiz, laserslag.minutes, laserslag.mode, laserslag.tempo));
    socket.on('ls-stop', (_, cb) => cb && cb({ file: laserslag.stop() }));

    // Ridderrace
    socket.on('rr-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('race');
      if (busy) throw busyError(busy);
      race.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('rr-start', () => race.start());
    socket.on('rr-kick', id => race.kick(id));
    socket.on('rr-finish', () => race.finish());
    socket.on('rr-restart', () => race.quiz && race.load(race.quiz, race.minutes, race.tempo));
    socket.on('rr-stop', (_, cb) => cb && cb({ file: race.stop() }));

    // Burchtbouwers
    socket.on('bb-load', handle(({ file, minutes, level } = {}) => {
      const busy = busyWith('burcht');
      if (busy) throw busyError(busy);
      burcht.load(quizzes.play(file), Number(minutes), level);
      return {};
    }));
    socket.on('bb-start', () => burcht.start());
    socket.on('bb-kick', id => burcht.kick(id));
    socket.on('bb-dragon', () => burcht.dragon());
    socket.on('bb-restart', () => burcht.quiz && burcht.load(burcht.quiz, burcht.minutes, burcht.level));
    socket.on('bb-stop', (_, cb) => cb && cb({ file: burcht.stop() }));

    // Duel in de arena
    socket.on('du-load', handle(({ file, hearts } = {}) => {
      const busy = busyWith('duel');
      if (busy) throw busyError(busy);
      duel.load(quizzes.play(file, { shared: true }), Number(hearts));
      return {};
    }));
    socket.on('du-start', (_, cb) => { const res = duel.start(); if (typeof cb === 'function') cb(res || {}); });
    socket.on('du-kick', id => duel.kick(id));
    socket.on('du-decide', () => duel.decide());
    socket.on('du-finish', () => duel.finish());
    socket.on('du-restart', () => duel.quiz && duel.load(duel.quiz, duel.hearts));
    socket.on('du-stop', (_, cb) => cb && cb({ file: duel.stop() }));

    // Pac-Knight
    socket.on('pk-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('knight');
      if (busy) throw busyError(busy);
      knight.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('pk-start', () => knight.start());
    socket.on('pk-kick', id => knight.kick(id));
    socket.on('pk-finish', () => knight.finish());
    socket.on('pk-restart', () => knight.quiz && knight.load(knight.quiz, knight.minutes, knight.tempo));
    socket.on('pk-stop', (_, cb) => cb && cb({ file: knight.stop() }));

    // Cyber-Galaga
    socket.on('cg-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('galaga');
      if (busy) throw busyError(busy);
      galaga.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('cg-start', () => galaga.start());
    socket.on('cg-kick', id => galaga.kick(id));
    socket.on('cg-finish', () => galaga.finish());
    socket.on('cg-restart', () => galaga.quiz && galaga.load(galaga.quiz, galaga.minutes, galaga.tempo));
    socket.on('cg-stop', (_, cb) => cb && cb({ file: galaga.stop() }));

    // Bomber-Knight
    socket.on('bk-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('bomber');
      if (busy) throw busyError(busy);
      bomber.load(quizzes.play(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('bk-start', () => bomber.start());
    socket.on('bk-kick', id => bomber.kick(id));
    socket.on('bk-finish', () => bomber.finish());
    socket.on('bk-restart', () => bomber.quiz && bomber.load(bomber.quiz, bomber.minutes, bomber.tempo));
    socket.on('bk-stop', (_, cb) => cb && cb({ file: bomber.stop() }));

    // Neon Duel
    socket.on('nd-load', handle(({ file, rounds, seconds, tempo } = {}) => {
      const busy = busyWith('neon');
      if (busy) throw busyError(busy);
      neon.load(quizzes.play(file), Number(rounds), Number(seconds), tempo);
      return {};
    }));
    socket.on('nd-start', (_, cb) => { const res = neon.start(); if (typeof cb === 'function') cb(res || {}); });
    socket.on('nd-kick', id => neon.kick(id));
    socket.on('nd-swap', id => neon.swap(id));
    socket.on('nd-shuffle', () => neon.shuffle());
    socket.on('nd-finish', () => neon.finish());
    socket.on('nd-restart', () => neon.quiz && neon.load(neon.quiz, neon.bestOf, neon.roundSec, neon.tempo));
    socket.on('nd-stop', (_, cb) => cb && cb({ file: neon.stop() }));

    // Leraar-baas, met de eindbaas die de leerkracht zelf samenstelt (bewaard in settings.json).
    socket.on('lb-load', handle(({ file, minutes, tempo, auto } = {}) => {
      const busy = busyWith('baas');
      if (busy) throw busyError(busy);
      baas.load(quizzes.play(file), Number(minutes), tempo, auto !== false);
      return {};
    }));
    socket.on('lb-start', () => baas.start());
    socket.on('lb-kick', id => baas.kick(id));
    socket.on('lb-move', (move, cb) => { const res = baas.teacherMove(String(move || '')); if (typeof cb === 'function') cb(res || {}); });
    socket.on('lb-auto', on => baas.setAuto(Boolean(on)));
    socket.on('lb-finish', () => baas.finish());
    socket.on('lb-restart', () => baas.quiz && baas.load(baas.quiz, baas.minutes, baas.tempo, baas.auto));
    socket.on('lb-stop', (_, cb) => cb && cb({ file: baas.stop() }));
    socket.on('lb-boss-get', (_, cb) => typeof cb === 'function' && cb(settings.read().teacherBoss || null));
    socket.on('lb-boss-set', (boss, cb) => {
      const clean = LeraarBaas.cleanBoss(boss);
      if (clean) {
        settings.write({ teacherBoss: clean });
        baas.boss = clean;
        baas.broadcast();
      }
      if (typeof cb === 'function') cb(clean ? { ok: true, boss: clean } : { error: 'Ongeldige eindbaas.' });
    });

    // Gauntlet en Ridder-Royale
    gauntlet.attachHost(socket, handle, busyWith, busyError, quizzes);
    royale.attachHost(socket, handle, busyWith, busyError, quizzes);
    sterren.attachHost(socket, handle, busyWith, busyError, quizzes);
    slang.attachHost(socket, handle, busyWith, busyError, quizzes);
    poort.attachHost(socket, handle, busyWith, busyError, quizzes);
    vlucht.attachHost(socket, handle, busyWith, busyError, quizzes);
    diep.attachHost(socket, handle, busyWith, busyError, quizzes);
    storm.attachHost(socket, handle, busyWith, busyError, quizzes);
    pixel.attachHost(socket, handle, busyWith, busyError, quizzes);
    robomol.attachHost(socket, handle, busyWith, busyError, quizzes);
    kerker.attachHost(socket, handle, busyWith, busyError, quizzes);
    hof.attachHost(socket, handle, busyWith, busyError, quizzes, runen, ai, aiJson);
    paarden.attachHost(socket, handle, busyWith, busyError, quizzes);

    // Strijdrossen
    socket.on('sr-load', handle(({ file, minutes, mode, tempo } = {}) => {
      const busy = busyWith('rossen');
      if (busy) throw busyError(busy);
      rossen.load(quizzes.play(file), Number(minutes), mode, tempo);
      return {};
    }));
    socket.on('sr-start', () => rossen.start());
    socket.on('sr-kick', id => rossen.kick(id));
    socket.on('sr-team', id => rossen.switchTeam(id));
    socket.on('sr-finish', () => rossen.finish());
    socket.on('sr-restart', () => rossen.quiz && rossen.load(rossen.quiz, rossen.minutes, rossen.mode, rossen.tempo));
    socket.on('sr-stop', (_, cb) => cb && cb({ file: rossen.stop() }));

    // Het Rijk
    socket.on('rk-list', (_, cb) => cb && cb(rijken.list()));
    socket.on('rk-create', handle(({ name, teams, names } = {}) => ({ file: rijken.create(name, Number(teams), names) })));
    socket.on('rk-delete', handle(({ file } = {}) => {
      if (rijk.active && rijk.file === file) throw new Error('Dit rijk is nu in gebruik. Stop eerst het spel.');
      rijken.remove(file);
      return {};
    }));
    socket.on('rk-peek', handle(({ file } = {}) => {
      const d = rijken.read(file);
      const titles = {};
      for (const [id, q] of Object.entries(d.quizzes)) titles[id] = q.title;
      return { name: d.name, teams: d.teams, cells: d.cells, cols: d.cols, rows: d.rows, lessons: d.lessons, titles, members: Object.values(d.members) };
    }));
    socket.on('rk-load', handle(({ rijk: file, quiz, minutes } = {}) => {
      const busy = busyWith('rijk');
      if (busy) throw busyError(busy);
      rijk.load(file, quizzes.play(quiz, { shared: true }), quiz, Number(minutes));
      return {};
    }));
    socket.on('rk-start', () => rijk.start());
    socket.on('rk-kick', id => rijk.kick(id));
    socket.on('rk-move', id => rijk.move(id));
    socket.on('rk-finish', () => rijk.finish());
    socket.on('rk-stop', (_, cb) => cb && cb({ file: rijk.stop() }));

    // Kristalroof
    socket.on('kr-load', handle(({ file, minutes } = {}) => {
      const busy = busyWith('roof');
      if (busy) throw busyError(busy);
      roof.load(quizzes.play(file), Number(minutes));
      return {};
    }));
    socket.on('kr-start', () => roof.start());
    socket.on('kr-kick', id => roof.kick(id));
    socket.on('kr-finish', () => roof.finish());
    socket.on('kr-restart', () => roof.quiz && roof.load(roof.quiz, roof.minutes));
    socket.on('kr-stop', (_, cb) => cb && cb({ file: roof.stop() }));

    // De Verrader
    socket.on('vr-load', handle(({ file, ...opts } = {}) => {
      const busy = busyWith('verrader');
      if (busy) throw busyError(busy);
      verrader.load(quizzes.play(file), { ...opts, minutes: Number(opts.minutes) });
      return {};
    }));
    socket.on('vr-start', (_, cb) => { const res = verrader.start(); if (typeof cb === 'function') cb(res || {}); });
    socket.on('vr-kick', id => verrader.kick(id));
    socket.on('vr-horn', () => verrader.horn(null));
    socket.on('vr-skip', () => verrader.skipTalk());
    socket.on('vr-finish', () => verrader.finish('verrader', 'De leerkracht stopte het spel.'));
    socket.on('vr-restart', () => verrader.quiz && verrader.load(verrader.quiz, { minutes: verrader.minutes, traitors: verrader.traitorSetting, length: verrader.length, talk: verrader.talk }));
    socket.on('vr-stop', (_, cb) => cb && cb({ file: verrader.stop() }));

    // Oefenbladen maken, bewaren en live openzetten
    const refreshSheets = () => sendLibrary('oefenblad');
    socket.on('ob-parse', handle(text => ({ sheet: oefenbladen.parseAiText(text) })));
    socket.on('ob-check', handle(sheet => ({ sheet: oefenbladen.validate(sheet) })));
    socket.on('ob-open', handle(file => ({ sheet: oefenbladen.load(file) })));
    socket.on('ob-save', handle(({ sheet, file } = {}) => {
      const saved = oefenbladen.save(sheet, file);
      refreshSheets();
      return { file: saved };
    }));
    socket.on('ob-delete', handle(file => {
      oefenbladen.remove(file);
      refreshSheets();
      return {};
    }));
    // Printblad en verbeterblad: vaste volgorde bij verbinden, zodat ze overeenkomen.
    // Per niveau een eigen blad (Page, Schildknaap, Ridder).
    socket.on('ob-print', handle(arg => {
      const { file, niveau } = typeof arg === 'string' ? { file: arg } : arg || {};
      const full = oefenbladen.load(file);
      const avail = oefenbladen.niveausOf(full);
      const pages = (niveau === 'alle' ? avail : [avail.includes(niveau) ? niveau : 'schildknaap']).map(n => {
        const sheet = oefenbladen.forNiveau(full, n);
        const shuffles = oefenbladen.shufflesFor(sheet, `${sheet.title}${n === 'schildknaap' ? '' : `:${n}`}`);
        return { niveau: n, view: oefenbladen.studentView(sheet, shuffles), solutions: oefenbladen.solutions(sheet, shuffles) };
      });
      return { ...pages[0], pages, niveaus: avail };
    }));
    socket.on('ob-generate', ({ prompt, files } = {}, cb) => {
      generateQuiz(prompt, files, oefenbladen.parseAiText)
        .then(sheet => cb && cb({ ok: true, sheet }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });
    // Een reeks met AI: de lessenlijst uit een handleiding, dan per les een quiz en een oefenblad in hun map.
    const reeksAi = (event, parse) => socket.on(event, ({ prompt, files } = {}, cb) => {
      generateQuiz(prompt, files || [], parse)
        .then(res => cb && cb({ ok: true, ...res }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });
    reeksAi('reeks-plan-ai', reeks.parsePlan);
    reeksAi('reeks-ai', reeks.parsePakket);
    socket.on('reeks-plan-parse', handle(text => reeks.parsePlan(text)));
    socket.on('reeks-parse', handle(text => reeks.parsePakket(text)));
    socket.on('reeks-bewaar', handle(arg => {
      const res = reeks.bewaar(arg);
      sendLibrary(arg.soort);
      return res;
    }));
    // De Kronieken: mappen per vak en blok, boeken, de pagina waar je stopte en koppelingen per les.
    const krWijzig = fn => handle(arg => {
      const res = fn(arg || {});
      io.to('host').emit('kr-lijst', kronieken.lijst());
      syncSoon();
      return res;
    });
    socket.on('kr-lijst', handle(() => kronieken.lijst()));
    socket.on('kr-map', krWijzig(({ map }) => kronieken.nieuweMap(map)));
    socket.on('kr-map-weg', krWijzig(({ map }) => kronieken.verwijderMap(map)));
    socket.on('kr-weg', krWijzig(({ map, naam }) => kronieken.verwijder(map, naam)));
    socket.on('kr-koppel', krWijzig(arg => kronieken.koppel(arg)));
    socket.on('kr-ontkoppel', krWijzig(arg => kronieken.ontkoppel(arg)));
    socket.on('kr-link', krWijzig(arg => {
      const res = kronieken.voegLinkToe(arg);
      kronieken.testInbed(res.id).then(() => io.to('host').emit('kr-lijst', kronieken.lijst()), () => {});
      return res;
    }));
    socket.on('kr-link-apart', krWijzig(({ id }) => kronieken.linkApart(String(id || ''))));
    socket.on('kr-link-weg', krWijzig(({ id }) => kronieken.verwijderLink(String(id || ''))));
    // De Zonnewijzer: roosters, de planning per week, doel en succescriteria. Elke wijziging gaat ook naar Mijn lesmap.
    const zwWijzig = fn => handle(arg => {
      const res = fn(arg || {});
      socket.broadcast.to('host').emit('zw-gewijzigd');
      syncSoon();
      return res;
    });
    socket.on('zw-get', handle(({ week } = {}) => ({ ...zonnewijzer.roosters(), weekData: zonnewijzer.week(week), vandaag: zonnewijzer.weekVan(new Date()) })));
    socket.on('zw-roosters', zwWijzig(arg => zonnewijzer.bewaarRoosters(arg)));
    socket.on('zw-vul', zwWijzig(arg => ({ weekData: zonnewijzer.vul(arg) })));
    socket.on('zw-roosters-import', zwWijzig(arg => zonnewijzer.importeerRoosters(arg)));
    socket.on('zw-les', zwWijzig(arg => ({ weekData: zonnewijzer.zetLes(arg) })));
    socket.on('zw-week-rooster', zwWijzig(arg => ({ weekData: zonnewijzer.zetWeekRooster(arg) })));
    socket.on('zw-vink', zwWijzig(arg => ({ weekData: zonnewijzer.vink(arg) })));
    socket.on('zw-schuif', zwWijzig(arg => ({ weekData: zonnewijzer.schuif(arg) })));
    socket.on('zw-laatste', handle(arg => zonnewijzer.laatsteVan(arg)));
    socket.on('zw-doelen', handle(({ codes } = {}) => zonnewijzer.doelInfo(codes)));
    // De doelen van een les uit zijn quiz: de codes die het vaakst voorkomen (Ridder-vragen niet, dat is de uitdaging).
    socket.on('zw-quiz-doelen', handle(({ file } = {}) => {
      const quiz = quizzes.load(file);
      const tel = new Map();
      for (const q of quiz.questions || []) if (q.doel && q.niveau !== 'ridder') tel.set(q.doel, (tel.get(q.doel) || 0) + 1);
      return zonnewijzer.doelInfo([...tel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c));
    }));
    socket.on('kr-pagina', ({ map, naam, pagina } = {}) => {
      try { kronieken.zetPagina(map, naam, pagina); } catch { /* een verdwenen boek: niets te onthouden */ }
    });
    socket.on('ob-load', handle(({ file, feedback, niveau, voorlees } = {}) => {
      const busy = busyWith('oefenblad');
      if (busy) throw busyError(busy);
      oefenblad.load(oefenbladen.load(file), file, feedback, niveau, voorlees);
      return {};
    }));
    socket.on('ob-reveal', () => oefenblad.reveal());
    socket.on('ob-kick', id => oefenblad.kick(id));
    socket.on('ob-finish', () => oefenblad.finish());
    socket.on('ob-reopen', (id, cb) => { const res = oefenblad.reopen(id); if (typeof cb === 'function') cb(res); });
    socket.on('ob-detail', (id, cb) => cb && cb(oefenblad.detail(id)));
    socket.on('ob-set-niveau', ({ id, niveau } = {}, cb) => { const res = oefenblad.setNiveau(id, niveau); if (typeof cb === 'function') cb(res); });
    socket.on('ob-stop', (_, cb) => cb && cb({ file: oefenblad.stop() }));

    // Zeker of twijfel vragen na elk antwoord in het Toernooi (en de Opwarmer). Staat standaard aan.
    socket.emit('zekerheid', settings.read().zekerheid !== false);
    socket.on('zekerheid', on => {
      settings.write({ zekerheid: !!on });
      game.zekerheid = !!on;
      io.to('host').emit('zekerheid', !!on);
    });
    socket.on('start', () => game.start());
    socket.on('next', () => game.next());
    socket.on('reveal', () => game.reveal());
    socket.on('kick', id => game.kick(id));
    // De knop "Namen" op elk docentenscherm: wie is er binnen en waar, ook tijdens het spel een verkeerde naam wegklikken.
    socket.on('namen-lijst', (pad, cb) => {
      if (typeof cb !== 'function') return;
      const spel = SPELLEN[pad];
      cb({ actief: !!(spel && spel.players instanceof Map && spel.phase !== 'idle'), ...namenOveral() });
    });
    socket.on('namen-weg', ({ pad, id, sock } = {}) => {
      const spel = SPELLEN[pad];
      if (spel && typeof id === 'string') return spel.kick(id);
      // Buiten een spel: dat toestel vergeet de naam en vraagt opnieuw wie je bent.
      const s = typeof sock === 'string' && io.sockets.sockets.get(sock);
      if (s && !s.data.host) {
        s.data.naam = null;
        s.emit('naam-weg');
      }
    });
    socket.on('restart', () => game.quiz && game.load(game.quiz));
    socket.on('close', () => game.stop());
    socket.on('stop', (_, cb) => cb && cb({ file: game.stop() }));
    return;
  }

  // Een taak alleen spelen in een spel (startscherm met ?taak=...): alleen de handlers van dat eigen spel.
  if (socket.handshake.query.taak) {
    hier(socket, socket.handshake.query.naam, 'solo');
    solo.verbind(socket);
    return;
  }

  socket.join('players');
  const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 64;
  socket.emit('state', { phase: game.phase === 'idle' ? 'idle' : 'join' });

  socket.on('join', ({ playerId, name } = {}, cb) => {
    if (typeof playerId !== 'string' || playerId.length > 64) return cb && cb({ error: 'Ongeldige speler.' });
    const result = game.join(playerId, name, socket.id);
    socket.data.playerId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('state', game.playerState(playerId));
  });

  socket.on('zeker', value => {
    const id = socket.data.playerId;
    if (id) game.zeker(id, value);
  });

  socket.on('answer', choice => {
    const id = socket.data.playerId;
    if (!id) return;
    const p = game.players.get(id);
    const q = p && game.question && game.qFor(p);
    const open = p && q && game.phase === 'question' && p.answer === null;
    game.answer(id, choice);
    // Te snel en fout, drie keer na elkaar: een seintje voor de leerkracht.
    if (open && p.answer !== null) {
      gok.judge('toernooi', id, { correct: p.answer === q.correct, ms: p.answeredAt, limit: antigok.fastMs(q.question, q.answers), name: p.name, socketId: socket.id, spel: 'Toernooi' });
    }
  });

  // De prinses in de toren
  socket.emit('tw-state', toren.base());
  socket.on('tw-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = toren.join(playerId, name, socket.id);
    socket.data.twId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('tw-state', toren.playerState(playerId));
  });
  const tw = fn => (arg, cb) => {
    const out = socket.data.twId ? fn(socket.data.twId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('tw-jump', tw(id => toren.jump(id)));
  socket.on('tw-move', tw((id, pos) => toren.move(id, pos)));
  socket.on('tw-hit', tw((id, what) => toren.hit(id, what)));
  socket.on('tw-question', tw(id => guarded.toren.question(id)));
  socket.on('tw-answer', tw((id, choice) => guarded.toren.answer(id, choice)));

  // Schattenjacht
  socket.emit('sj-state', schat.base());
  socket.on('sj-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = schat.join(playerId, name, socket.id);
    socket.data.sjId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('sj-state', schat.playerState(playerId));
  });
  const sj = fn => (arg, cb) => {
    const out = socket.data.sjId ? fn(socket.data.sjId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('sj-question', sj(id => guarded.schat.question(id)));
  socket.on('sj-answer', sj((id, choice) => guarded.schat.answer(id, choice)));
  socket.on('sj-buy', sj((id, item) => schat.buy(id, item)));

  // Laserslag
  socket.emit('ls-state', laserslag.base());
  socket.on('ls-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = laserslag.join(playerId, name, socket.id);
    socket.data.lsId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) {
      socket.emit('ls-state', laserslag.playerState(playerId));
      const p = laserslag.players.get(playerId);
      if (laserslag.phase === 'play') laserslag.sendMe(p);
    }
  });
  const ls = fn => (arg, cb) => {
    const out = socket.data.lsId ? fn(socket.data.lsId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('ls-move', ls((id, pos) => laserslag.move(id, pos)));
  socket.on('ls-shoot', ls((id, angle) => laserslag.shoot(id, angle)));
  socket.on('ls-asking', ls((id, on) => laserslag.asking(id, on)));
  socket.on('ls-question', ls(id => guarded.laserslag.question(id)));
  socket.on('ls-answer', ls((id, choice) => guarded.laserslag.answer(id, choice)));
  // Ridderrace
  socket.emit('rr-state', race.base());
  socket.on('rr-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = race.join(playerId, name, socket.id);
    socket.data.rrId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) {
      socket.emit('rr-state', race.playerState(playerId));
      if (race.phase === 'play') race.sendMe(race.players.get(playerId));
    }
  });
  const rr = fn => (arg, cb) => {
    const out = socket.data.rrId ? fn(socket.data.rrId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('rr-move', rr((id, pos) => race.move(id, pos)));
  socket.on('rr-crystal', rr((id, seg) => race.crystal(id, seg)));
  socket.on('rr-turbo', rr(id => race.turbo(id)));
  socket.on('rr-asking', rr((id, on) => race.asking(id, on)));
  socket.on('rr-question', rr(id => guarded.race.question(id)));
  socket.on('rr-answer', rr((id, choice) => guarded.race.answer(id, choice)));

  // Burchtbouwers
  socket.emit('bb-state', burcht.base());
  socket.on('bb-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = burcht.join(playerId, name, socket.id);
    socket.data.bbId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('bb-state', burcht.playerState(playerId));
  });
  const bb = fn => (arg, cb) => {
    const out = socket.data.bbId ? fn(socket.data.bbId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('bb-question', bb(id => guarded.burcht.question(id)));
  socket.on('bb-answer', bb((id, choice) => guarded.burcht.answer(id, choice)));
  socket.on('bb-place', bb((id, i) => burcht.place(id, Number(i))));

  // Duel in de arena
  socket.emit('du-state', duel.base());
  socket.on('du-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = duel.join(playerId, name, socket.id);
    socket.data.duId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('du-state', duel.playerState(playerId));
  });
  socket.on('du-answer', (choice, cb) => {
    const id = socket.data.duId;
    const m = id && duel.matchOf(id);
    const q = m && m.q !== null && duel.quiz.questions[m.q];
    const ms = m ? Date.now() - m.qAt : 0;
    const out = id ? duel.answer(id, choice) : { error: 'Meld je eerst aan.' };
    if (q && out && typeof out.correct === 'boolean') {
      gok.judge('duel', id, { correct: out.correct, ms, limit: antigok.fastMs(q.question, q.answers), name: duel.players.get(id).name, socketId: socket.id, spel: 'Duel in de arena' });
    }
    if (typeof cb === 'function') cb(out || {});
  });

  // Pac-Knight
  socket.emit('pk-state', knight.base());
  socket.on('pk-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = knight.join(playerId, name, socket.id);
    socket.data.pkId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('pk-state', knight.playerState(playerId));
  });
  const pk = fn => (arg, cb) => {
    const out = socket.data.pkId ? fn(socket.data.pkId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('pk-dir', pk((id, dir) => knight.steer(id, Number(dir))));
  socket.on('pk-power', pk(id => knight.power(id)));
  socket.on('pk-asking', pk((id, on) => knight.asking(id, on)));
  socket.on('pk-question', pk(id => guarded.knight.question(id)));
  socket.on('pk-answer', pk((id, choice) => guarded.knight.answer(id, choice)));

  // Cyber-Galaga
  socket.emit('cg-state', galaga.base());
  socket.on('cg-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = galaga.join(playerId, name, socket.id);
    socket.data.cgId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('cg-state', galaga.playerState(playerId));
  });
  const cg = fn => (arg, cb) => {
    const out = socket.data.cgId ? fn(socket.data.cgId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('cg-question', cg(id => guarded.galaga.question(id)));
  socket.on('cg-answer', cg((id, choice) => guarded.galaga.answer(id, choice)));
  socket.on('cg-reward', cg((id, kind) => galaga.reward(id, String(kind))));
  socket.on('cg-bomb', cg(id => galaga.bomb(id)));
  socket.on('cg-report', cg((id, r) => galaga.report(id, r)));

  // Bomber-Knight
  socket.emit('bk-state', bomber.base());
  socket.on('bk-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = bomber.join(playerId, name, socket.id);
    socket.data.bkId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('bk-state', bomber.playerState(playerId));
  });
  const bk = fn => (arg, cb) => {
    const out = socket.data.bkId ? fn(socket.data.bkId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('bk-dir', bk((id, dir) => bomber.steer(id, Number(dir))));
  socket.on('bk-mine', bk(id => bomber.mine(id)));
  socket.on('bk-asking', bk((id, on) => bomber.asking(id, on)));
  socket.on('bk-question', bk(id => guarded.bomber.question(id)));
  socket.on('bk-answer', bk((id, choice) => guarded.bomber.answer(id, choice)));
  // Gauntlet en Ridder-Royale
  gauntlet.attachPlayer(socket, validId, guarded.gauntlet);
  royale.attachPlayer(socket, validId, guarded.royale);
  sterren.attachPlayer(socket, validId, guarded.sterren);
  slang.attachPlayer(socket, validId, guarded.slang);
  poort.attachPlayer(socket, validId, guarded.poort);
  vlucht.attachPlayer(socket, validId, guarded.vlucht);
  diep.attachPlayer(socket, validId, guarded.diep);
  storm.attachPlayer(socket, validId, guarded.storm);
  pixel.attachPlayer(socket, validId, guarded.pixel);
  robomol.attachPlayer(socket, validId, guarded.robomol);
  kerker.attachPlayer(socket, validId, guarded.kerker);
  hof.attachPlayer(socket, validId);
  paarden.attachPlayer(socket, validId, guarded.paarden);

  // Strijdrossen
  socket.emit('sr-state', rossen.base());
  socket.on('sr-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = rossen.join(playerId, name, socket.id);
    socket.data.srId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('sr-state', rossen.playerState(playerId));
  });
  const sr = fn => (arg, cb) => {
    const out = socket.data.srId ? fn(socket.data.srId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('sr-move', sr((id, pos) => rossen.move(id, pos)));
  socket.on('sr-fire', sr((id, shot) => rossen.fire(id, shot)));
  socket.on('sr-asking', sr((id, on) => rossen.asking(id, on)));
  socket.on('sr-question', sr(id => guarded.rossen.question(id)));
  socket.on('sr-answer', sr((id, choice) => guarded.rossen.answer(id, choice)));

  // Neon Duel
  socket.emit('nd-state', neon.base());
  socket.on('nd-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = neon.join(playerId, name, socket.id);
    socket.data.ndId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('nd-state', neon.playerState(playerId));
  });
  const nd = fn => (arg, cb) => {
    const out = socket.data.ndId ? fn(socket.data.ndId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('nd-question', nd(id => guarded.neon.question(id)));
  socket.on('nd-answer', nd((id, choice) => guarded.neon.answer(id, choice)));

  // Leraar-baas
  socket.emit('lb-state', baas.base());
  socket.on('lb-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = baas.join(playerId, name, socket.id);
    socket.data.lbId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('lb-state', baas.playerState(playerId));
  });
  const lb = fn => (arg, cb) => {
    const out = socket.data.lbId ? fn(socket.data.lbId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('lb-question', lb(id => guarded.baas.question(id)));
  socket.on('lb-answer', lb((id, choice) => guarded.baas.answer(id, choice)));

  // Het Rijk
  socket.emit('rk-state', rijk.base());
  socket.on('rk-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = rijk.join(playerId, name, socket.id);
    socket.data.rkId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('rk-state', rijk.playerState(playerId));
  });
  const rk = fn => (arg, cb) => {
    const out = socket.data.rkId ? fn(socket.data.rkId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('rk-question', rk(id => guarded.rijk.question(id)));
  socket.on('rk-answer', rk((id, choice) => guarded.rijk.answer(id, choice)));
  socket.on('rk-act', rk((id, i) => rijk.act(id, Number(i))));

  // Kristalroof
  socket.emit('kr-state', roof.base());
  socket.on('kr-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = roof.join(playerId, name, socket.id);
    socket.data.krId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('kr-state', roof.playerState(playerId));
  });
  const kr = fn => (arg, cb) => {
    const out = socket.data.krId ? fn(socket.data.krId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('kr-secret', kr((id, word) => roof.secret(id, word)));
  socket.on('kr-question', kr(id => guarded.roof.question(id)));
  socket.on('kr-answer', kr((id, choice) => guarded.roof.answer(id, choice)));
  socket.on('kr-open', kr((id, i) => roof.open(id, i)));
  socket.on('kr-target', kr((id, t) => roof.target(id, t)));
  socket.on('kr-guess', kr((id, w) => roof.guess(id, w)));
  socket.on('kr-skip', kr(id => roof.skip(id)));

  // De Verrader
  socket.emit('vr-state', verrader.base());
  socket.on('vr-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = verrader.join(playerId, name, socket.id);
    socket.data.vrId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('vr-state', verrader.playerState(playerId));
  });
  const vr = fn => (arg, cb) => {
    const out = socket.data.vrId ? fn(socket.data.vrId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('vr-question', vr(id => guarded.verrader.question(id)));
  socket.on('vr-answer', vr((id, choice) => guarded.verrader.answer(id, choice)));
  socket.on('vr-spell', vr((id, t) => verrader.spell(id, t)));
  socket.on('vr-horn', vr(id => verrader.horn(id)));
  socket.on('vr-vote', vr((id, t) => verrader.vote(id, t === null ? null : String(t))));

  // Oefenblad
  socket.emit('ob-state', oefenblad.base());
  socket.on('ob-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = oefenblad.join(playerId, name, socket.id);
    socket.data.obId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('ob-state', oefenblad.playerState(playerId));
  });
  const ob = fn => (arg, cb) => {
    const out = socket.data.obId ? fn(socket.data.obId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('ob-answer', ob((id, a) => oefenblad.answer(id, a)));
  socket.on('ob-submit', ob(id => oefenblad.submit(id)));
  socket.on('ob-niveau', ob((id, niveau) => oefenblad.choose(id, niveau)));

  // Wie wegvalt tijdens een vraag, blijft niet onkwetsbaar staan.
  socket.on('disconnect', () => {
    if (socket.data.lsId) laserslag.asking(socket.data.lsId, false);
    if (socket.data.rrId) race.asking(socket.data.rrId, false);
    if (socket.data.pkId) knight.asking(socket.data.pkId, false);
    if (socket.data.srId) rossen.asking(socket.data.srId, false);
    if (socket.data.bkId) bomber.asking(socket.data.bkId, false);
  });

  // De Ronde Tafel: anoniem, alleen een vaste id per browser.
  socket.emit('rt-state', rt.playerState());
  socket.on('rt-join', (playerId, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    socket.data.rtId = playerId;
    cb && cb({ ok: true, mine: rt.join(playerId) });
  });
  socket.on('rt-answer', (value, cb) => {
    if (!socket.data.rtId) return cb && cb({ error: 'Herlaad de pagina en probeer opnieuw.' });
    cb && cb(rt.answer(socket.data.rtId, value));
  });
});

const EERSTE_POORT = PORT;
server.once('listening', () => {
  server.removeListener('error', poortBezet);
  gegevens.dagelijks();
  runSync();
  setInterval(runSync, 60 * 1000);
  console.log('\n  LANcelot draait!\n');
  console.log(`  Docentenscherm:  http://localhost:${PORT}/host`);
  if (gegevens.DATA !== gegevens.APP) console.log(`  Gegevens:        ${gegevens.DATA}`);
  for (const a of lanAddresses()) console.log(`  Leerlingen:      http://${a}:${PORT}`);
  if (PORT !== EERSTE_POORT) console.log(`\n  Let op: poort ${EERSTE_POORT} is bezet door een ander programma, daarom gebruikt LANcelot nu poort ${PORT}.\n  Leerlingen gebruiken gewoon het adres op het bord. Lukt het niet, druk dan in Instellingen nog eens op "Firewall goed zetten".`);
  console.log('\n  Sluit dit venster om te stoppen.\n');
  // Start LANcelot.bat vraagt om het docentenscherm te openen zodra de server echt luistert, op de juiste poort.
  if (process.env.LANCELOT_OPEN && process.platform === 'win32') execFile('cmd', ['/c', 'start', '', `http://localhost:${PORT}/host`], { windowsHide: true });
});
function poortBezet(err) {
  if (err.code === 'EADDRINUSE' && !VASTE_POORT && PORT < EERSTE_POORT + 10) {
    PORT++;
    return server.listen(PORT);
  }
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Poort ${PORT} is bezet door een ander programma, dus LANcelot kan niet starten.`);
    console.error(VASTE_POORT ? '  Kies een andere poort met set PORT=... in Start LANcelot.bat, of sluit het andere programma.\n' : '  Sluit andere programma\'s (of herstart de pc) en probeer opnieuw.\n');
    process.exit(1);
  }
  throw err;
}
server.on('error', poortBezet);
server.listen(PORT);
