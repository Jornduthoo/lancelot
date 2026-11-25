const fs = require('fs');
// Draait LANcelot al (een tweede dubbelklik op de snelkoppeling)? Dan gewoon het leerkrachtenscherm openen.
// Dit gebeurt nog voor het bijwerken, zodat een tweede start nooit de bestanden onder een lopend spel vervangt.
{
  const eerste = Number(process.env.PORT) || 3000;
  const probe = `const http=require('http');let n=0;for(let p=${eerste};p<=${eerste + 10};p++){const r=http.get({host:'127.0.0.1',port:p,path:'/lancelot-ping',timeout:800},res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>{if(b.includes('"lancelot":true')){console.log(p);process.exit(0)}if(++n>10)process.exit(1)})});r.on('timeout',()=>r.destroy());r.on('error',()=>{if(++n>10)process.exit(1)})}`;
  const r = require('child_process').spawnSync(process.execPath, ['-e', probe], { encoding: 'utf8', timeout: 3000 });
  const draait = r.status === 0 && Number(r.stdout.trim());
  if (draait) {
    console.log(`\n  LANcelot draait al (poort ${draait}). Het leerkrachtenscherm wordt geopend.\n`);
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
    // Zonder zwart venster (src/systeemvak.ps1): stoppen met code 75, dan start de LANcelot-knop alles opnieuw, ook zichzelf.
    if (process.env.LANCELOT_KAN_HERSTARTEN) process.exit(75);
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
const { Raketridder } = require('./src/raketridder');
const { Splijtzwaard } = require('./src/splijtzwaard');
const { Wankelwagen } = require('./src/wankelwagen');
const { Plasmapoort } = require('./src/plasmapoort');
const { Tuimelridder } = require('./src/tuimelridder');
const { Hooibergjacht } = require('./src/hooibergjacht');
const { Zwermwacht } = require('./src/zwermwacht');
const { Banierveld } = require('./src/banierveld');
const { Haakridder } = require('./src/haakridder');
const { Kegelridder } = require('./src/kegelridder');
const { Kolkridder } = require('./src/kolkridder');
const { NeonCamelot } = require('./src/neoncamelot');
const { Titanenstrijd } = require('./src/titanenstrijd');
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
const zegelrol = require('./src/zegelrol');
const postduif = require('./src/postduif');
const { OefenbladLive } = require('./src/oefenblad-live');
const proeven = require('./src/proeven');
const toetskopie = require('./src/toetskopie');
const toetsarchief = require('./src/toetsarchief');
const toetsmail = require('./src/toetsmail');
const { ProefLive } = require('./src/proef-live');
const niveaus = require('./src/niveaus');
const settings = require('./src/settings');
const vastAdres = require('./src/vast-adres');
const taal = require('./src/taal');
const klas = require('./src/klas');
const doelen = require('./src/doelen');
const logboek = require('./src/logboek');
const pauze = require('./src/pauze');
// Moet overeenkomen met de lijst in public/js/ui.js.
const THEMAS = ['nachtburcht', 'daglicht', 'ijspaleis', 'rozenkasteel', 'smaragdwoud', 'drakenvuur', 'contrast'];
const opwarmer = require('./src/opwarmer');
const startpakket = require('./src/startpakket');
const eerstestart = require('./src/eerstestart');
const overzicht = require('./src/overzicht');
const zorg = require('./src/zorg');
const opvolgen = require('./src/opvolgen');
const toestellen = require('./src/toestellen');
const takenstandaard = require('./src/takenstandaard');
const vandaag = require('./src/vandaag');
const connector = require('./src/connector');
const punten = require('./src/punten');
const notities = require('./src/notities');
const herhaal = require('./src/herhaal');
const results = require('./src/results');
const lesmap = require('./src/lesmap');
const beheer = require('./src/beheer');
const bijwerken = require('./src/bijwerken');
const store = require('./src/store');
const schermen = require('./src/schermen');
const { execFile } = require('child_process');
const { generateQuiz } = require('./src/ai');
const antigok = require('./src/antigok');
const vragenstorm = require('./src/vragenstorm');
const runen = require('./src/runen');
const lezen = require('./src/lezen');
const ontdek = require('./src/ontdek');
const burchten = require('./src/burchten');
const huisdieren = require('./src/huisdieren');
const taken = require('./src/taken');
const junior = require('./src/junior');
const inbeeld = require('./src/inbeeld');
const jrFoto = require('./src/jr-foto');
const klastaken = require('./src/klastaken');
const klasindeling = require('./src/klasindeling');
const soloSpel = require('./src/solo');
const ai = require('./src/ai');
const aiJson = require('./src/ai-json');
const stem = require('./src/stem');

// Is poort 3000 bezet door een ander programma, dan neemt LANcelot de volgende vrije (tot 3010), tenzij PORT vastgezet is.
const VASTE_POORT = Boolean(process.env.PORT);
let PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = http.createServer(app);
// Elke start van de server krijgt een eigen nummer (zie ook 'server-start' hieronder).
const SERVER_START = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
// Na een update moet elk scherm meteen de nieuwe scripts gebruiken, ook als de browser een oude versie bewaarde:
// elke pagina krijgt haar scripts, stijlen en beelden met het nummer van deze start in de link (/js/x.js?v=...), en de
// pagina zelf wordt nooit bewaard. Een link met het juiste nummer mag de browser bewaren tot de volgende start: zo
// vraagt een pagina die opnieuw opent niet honderden bestanden opnieuw na (snel op een trage klas-pc).
// Het nummer krijgt ook de datum en grootte van het bestand mee: zo ziet de browser een bijgewerkt bestand ook als
// LANcelot na een update nog niet opnieuw startte (anders: nieuwe pagina met oude stijl en scripts).
const bewaarTotHerstart = req => !!(req.query && typeof req.query.v === 'string' && req.query.v.split('.')[0] === SERVER_START);
const PUBLIC_MAP = path.join(__dirname, 'public');
const bestandStempel = rel => {
  try { const st = fs.statSync(path.join(PUBLIC_MAP, rel)); return `${Math.round(st.mtimeMs).toString(36)}${st.size.toString(36)}`; } catch { return ''; }
};
const BEWAAR = ['private', 'max-age=31536000', 'immutable'].join(', ');
const cacheVoor = req => (bewaarTotHerstart(req) ? BEWAAR : 'no-cache');
const paginaCache = new Map();
function paginaMetVersie(file) {
  const st = fs.statSync(file);
  const hit = paginaCache.get(file);
  if (hit && hit.mtime === st.mtimeMs && hit.size === st.size && hit.delen.every(([rel, stempel]) => bestandStempel(rel) === stempel)) return hit;
  const delen = [];
  const html = fs.readFileSync(file, 'utf8').replace(/((?:src|href)=")(\/[\w./-]+\.(?:js|css|webp|png|jpg|svg))"/g, (_, a, rel) => {
    const stempel = bestandStempel(rel);
    delen.push([rel, stempel]);
    return `${a}${rel}?v=${SERVER_START}.${stempel}"`;
  });
  const out = { mtime: st.mtimeMs, size: st.size, delen, html, gz: zlib.gzipSync(html) };
  paginaCache.set(file, out);
  return out;
}
function stuurPagina(req, res, file) {
  let p;
  try { p = paginaMetVersie(file); } catch { return false; }
  res.set({ 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=utf-8', Vary: 'Accept-Encoding' });
  if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) res.set('Content-Encoding', 'gzip').send(p.gz);
  else res.send(p.html);
  return true;
}
// Wanneer kwam er nog iets van een ander toestel (een leerling, of de gekoppelde bureau-pc)? Voor vanzelf bijwerken.
let laatsteVanBuiten = 0;
app.use((req, res, next) => {
  if (!isLocal(req.socket.remoteAddress)) laatsteVanBuiten = Date.now();
  next();
});
app.use((req, res, next) => {
  const send = res.sendFile.bind(res);
  res.sendFile = (file, ...rest) => (typeof file === 'string' && file.endsWith('.html') && !rest.length && stuurPagina(req, res, file) ? undefined : send(file, ...rest));
  next();
});
// Ruim genoeg voor lesstof (screenshots en pdf's) die naar Gemini gaat.
const io = new Server(server, { maxHttpBufferSize: 30e6 });
// Na elk spel: de lijst met resultaten bijwerken, de sessie in het logboek afsluiten en het overzicht ervan naar het leerkrachtenscherm sturen.
function finished(file) {
  sendLibrary('resultaat');
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

const raket = new Raketridder(io, s => {
  const file = s.save();
  return finished(file);
});

const wankel = new Wankelwagen(io, s => {
  const file = s.save();
  return finished(file);
});

const hooi = new Hooibergjacht(io, s => {
  const file = s.save();
  return finished(file);
});

const zwerm = new Zwermwacht(io, s => {
  const file = s.save();
  return finished(file);
});

const banier = new Banierveld(io, s => {
  const file = s.save();
  return finished(file);
});

const haak = new Haakridder(io, s => {
  const file = s.save();
  return finished(file);
});

const kegel = new Kegelridder(io, s => {
  const file = s.save();
  return finished(file);
});

const kolk = new Kolkridder(io, s => {
  const file = s.save();
  return finished(file);
});

const camelot = new NeonCamelot(io, s => {
  const file = s.save();
  return finished(file);
});

const titan = new Titanenstrijd(io, s => {
  const file = s.save();
  return finished(file);
});

const plasma = new Plasmapoort(io, s => {
  const file = s.save();
  return finished(file);
});

const tuimel = new Tuimelridder(io, s => {
  const file = s.save();
  return finished(file);
});

const zwaard = new Splijtzwaard(io, s => {
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

// De Proef: een afgenomen toets wordt een afname. Zonder open vragen is hij meteen verbeterd en komt hij in het logboek.
const proef = new ProefLive(io, rec => {
  const file = proeven.bewaarAfname(rec);
  const hand = rec.spelers.some(s => proeven.stand(rec, s).open);
  if (!hand) proeven.klaar(file, results.saveProef);
  vandaagSoon(); io.to('host').emit('pf-afnames', afnameLijst());
  finished(null);
  return file;
});

// Een toets als taak (Mijn klas > Taken): elke ingeleverde toets komt bij de afname van die taak.
// Niets meer met de hand te verbeteren? Dan is ze meteen verbeterd, met een nieuw Excel-bestand in de plaats van het oude.
taken.bijAfname = file => {
  const rec = proeven.laadAfname(file);
  if (!rec.spelers.some(s => proeven.stand(rec, s).open)) {
    if (rec.resultaten) try { fs.unlinkSync(results.filePath(rec.resultaten)); } catch {}
    // Meteen verbeterd: ook dan de kopie en de mail, zoals na Klaar in De Proef (wie al gemaild werd, krijgt geen tweede).
    naKlaar(file, proeven.klaar(file, results.saveProef));
  }
  vandaagSoon(); io.to('host').emit('pf-afnames', afnameLijst());
};

// De afnames voor De Proef en het startscherm: bij een toets als taak ook wie nog bezig is of nog niet begon.
function afnameLijst() {
  // De stand van je andere pc's één keer lezen, niet opnieuw voor elke toets.
  let per = null;
  return proeven.afnames().map(a => {
    const ll = a.taak && taken.toetsLeerlingen(a.taak, per || (per = taken.standen()));
    return ll ? { ...a, bezig: ll.filter(l => l.status === 'bezig').length, nog: ll.filter(l => l.status === 'nieuw').length } : a;
  });
}

// Een afname veranderde (een leerling leverde in, de leerkracht verbeterde): de andere schermen en, via de lesmap, je andere pc's.
let afnameTimer = null;
let afnamesGeteld = -1;
proeven.naSchrijf = () => {
  if (afnameTimer) return;
  afnameTimer = setTimeout(() => {
    afnameTimer = null;
    const lijst = afnameLijst();
    vandaagSoon(); io.to('host').emit('pf-afnames', lijst);
    io.to('host').emit('pf-afname-gewijzigd');
    // Een nieuwe afname: bij de toets staat dan "gegeven op …".
    if (lijst.length !== afnamesGeteld) { afnamesGeteld = lijst.length; sendLibrary('proef', null, true); }
    if (settings.read().lesmap) syncSoon();
  }, 1500);
};

// Elk spel met leerlingen, bij het adres van zijn leerkrachtenscherm. Een nieuw spel komt hier ook bij:
// zo werken de grijze (bezette) namen bij het aanmelden en de knop "Namen" op het bord meteen mee.
const SPELLEN = { '/host': game, '/toren': toren, '/schattenjacht': schat, '/laserslag': laserslag, '/ridderrace': race, '/kristalroof': roof, '/verrader': verrader, '/burchtbouwers': burcht, '/duel': duel, '/packnight': knight, '/strijdrossen': rossen, '/gauntlet': gauntlet, '/ridder-royale': royale, '/sterrenvreter': sterren, '/ridderslang': slang, '/burchtstorm': storm, '/poortwacht': poort, '/neonvlucht': vlucht, '/diepboor': diep, '/raketridder': raket, '/splijtzwaard': zwaard, '/wankelwagen': wankel, '/plasmapoort': plasma, '/tuimelridder': tuimel, '/hooibergjacht': hooi, '/zwermwacht': zwerm, '/haakridder': haak, '/kegelridder': kegel, '/kolkridder': kolk, '/neoncamelot': camelot, '/titanenstrijd': titan, '/banierveld': banier, '/pixelridder': pixel, '/robomol': robomol, '/kerker': kerker, '/hofschilder': hof, '/robopaarden': paarden, '/neonduel': neon, '/leraarbaas': baas, '/cybergalaga': galaga, '/bomberknight': bomber, '/rijk': rijk, '/oefenblad': oefenblad, '/proef': proef };
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

// Wie zit waar? Voor de knop "Namen" op elk leerkrachtenscherm. Een spel weet zijn spelers; op het Runenraadsel,
// Mijn burcht, Mijn taken en het startscherm onthoudt de verbinding zelf welke naam erop staat.
const ZONDER_SPEL = { runen: 'Runenraadsel', ontdek: ontdek.NAAM, burcht: 'Mijn burcht', huisdier: 'Mijn huisdier', taken: 'Mijn taken', lezen: 'Leescheck', junior: 'LANcelot Junior', solo: 'Taak in een spel', start: 'Wacht op een spel' };
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
  knight: gok.guard(knight, 'knight', 'Doolhofridder', { own: true }),
  rossen: gok.guard(rossen, 'rossen', 'Strijdrossen', { own: true }),
  galaga: gok.guard(galaga, 'galaga', 'Drakenjacht', { own: true }),
  neon: gok.guard(neon, 'neon', 'Neon Duel', { own: true }),
  gauntlet: gok.guard(gauntlet, 'gauntlet', 'Schaduwburcht', { own: true }),
  bomber: gok.guard(bomber, 'bomber', 'Kruitridder', { own: true }),
  baas: gok.guard(baas, 'baas', 'Leraar-baas', { own: true }),
  royale: gok.guard(royale, 'royale', 'Ridder-Royale', { own: true }),
  sterren: gok.guard(sterren, 'sterren', 'Sterrenvreter', { own: true }),
  slang: gok.guard(slang, 'slang', 'Ridderslang', { own: true }),
  poort: gok.guard(poort, 'poort', 'Poortwacht', { own: true }),
  vlucht: gok.guard(vlucht, 'vlucht', 'Neonvlucht', { own: true }),
  diep: gok.guard(diep, 'diep', 'Diepboor', { own: true }),
  raket: gok.guard(raket, 'raket', 'Raketridder', { own: true }),
  zwaard: gok.guard(zwaard, 'zwaard', 'Splijtzwaard', { own: true }),
  wankel: gok.guard(wankel, 'wankel', 'Wankelwagen', { own: true }),
  plasma: gok.guard(plasma, 'plasma', 'Plasmapoort', { own: true }),
  tuimel: gok.guard(tuimel, 'tuimel', 'Tuimelridder', { own: true }),
  hooi: gok.guard(hooi, 'hooi', 'Hooibergjacht', { own: true }),
  zwerm: gok.guard(zwerm, 'zwerm', 'Zwermwacht', { own: true }),
  banier: gok.guard(banier, 'banier', 'Banierveld', { own: true }),
  haak: gok.guard(haak, 'haak', 'Haakridder', { own: true }),
  kegel: gok.guard(kegel, 'kegel', 'Kegelridder', { own: true }),
  kolk: gok.guard(kolk, 'kolk', 'Kolkridder', { own: true }),
  camelot: gok.guard(camelot, 'camelot', 'Neon-Camelot', { own: true }),
  titan: gok.guard(titan, 'titan', 'Titanenstrijd', { own: true }),
  storm: gok.guard(storm, 'storm', 'Burchtstorm', { own: true }),
  pixel: gok.guard(pixel, 'pixel', 'Pixelridder', { own: true }),
  robomol: gok.guard(robomol, 'robomol', 'Robomol', { own: true }),
  kerker: gok.guard(kerker, 'kerker', 'Ontsnap uit de kerker', { own: true }),
  paarden: gok.guard(paarden, 'paarden', 'Robopaarden', { own: true }),
};

// Taken die een leerling alleen speelt, elk in een eigen spel (los van het spel op het bord).
const solo = soloSpel.create(io, gok, () => takenSoon());

// Vragenstorm: de leerkracht drukt op het bord, elke leerling in het spel krijgt meteen een paar vragen.
const vstorm = vragenstorm.create(io, SPELLEN, guarded);

// Er loopt altijd hooguit één spel tegelijk.
const busyError = message => Object.assign(new Error(message), { busy: true });

// Alles stoppen wat nog loopt (behalve het spel dat je wil starten). De resultaten worden bewaard zoals bij Stop.
function stopOthers(except) {
  const all = { toernooi: game, rondetafel: rt, toren, schat, laserslag, race, roof, verrader, burcht, duel, knight, rossen, gauntlet, royale, sterren, slang, storm, poort, vlucht, diep, raket, zwaard, wankel, plasma, tuimel, hooi, zwerm, banier, haak, kegel, kolk, titan, camelot, pixel, robomol, kerker, hofschilder: hof, paarden, neon, baas, rijk, oefenblad, proef, galaga, bomber };
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
  if (except !== 'knight' && knight.active) return 'Doolhofridder loopt nog. Stop dat spel eerst.';
  if (except !== 'rossen' && rossen.active) return 'Strijdrossen loopt nog. Stop dat spel eerst.';
  if (except !== 'galaga' && galaga.active) return 'Drakenjacht loopt nog. Stop dat spel eerst.';
  if (except !== 'bomber' && bomber.active) return 'Kruitridder loopt nog. Stop dat spel eerst.';
  if (except !== 'neon' && neon.active) return 'Neon Duel loopt nog. Stop dat spel eerst.';
  if (except !== 'baas' && baas.active) return 'Leraar-baas loopt nog. Stop dat spel eerst.';
  if (except !== 'gauntlet' && gauntlet.active) return 'Schaduwburcht loopt nog. Stop dat spel eerst.';
  if (except !== 'royale' && royale.active) return 'Ridder-Royale loopt nog. Stop dat spel eerst.';
  if (except !== 'sterren' && sterren.active) return 'Sterrenvreter loopt nog. Stop dat spel eerst.';
  if (except !== 'slang' && slang.active) return 'Ridderslang loopt nog. Stop dat spel eerst.';
  if (except !== 'poort' && poort.active) return 'Poortwacht loopt nog. Stop dat spel eerst.';
  if (except !== 'vlucht' && vlucht.active) return 'Neonvlucht loopt nog. Stop dat spel eerst.';
  if (except !== 'diep' && diep.active) return 'Diepboor loopt nog. Stop dat spel eerst.';
  if (except !== 'raket' && raket.active) return 'Raketridder loopt nog. Stop dat spel eerst.';
  if (except !== 'zwaard' && zwaard.active) return 'Splijtzwaard loopt nog. Stop dat spel eerst.';
  if (except !== 'wankel' && wankel.active) return 'Wankelwagen loopt nog. Stop dat spel eerst.';
  if (except !== 'plasma' && plasma.active) return 'Plasmapoort loopt nog. Stop dat spel eerst.';
  if (except !== 'tuimel' && tuimel.active) return 'Tuimelridder loopt nog. Stop dat spel eerst.';
  if (except !== 'hooi' && hooi.active) return 'Hooibergjacht loopt nog. Stop dat spel eerst.';
  if (except !== 'zwerm' && zwerm.active) return 'Zwermwacht loopt nog. Stop dat spel eerst.';
  if (except !== 'banier' && banier.active) return 'Banierveld loopt nog. Stop dat spel eerst.';
  if (except !== 'haak' && haak.active) return 'Haakridder loopt nog. Stop dat spel eerst.';
  if (except !== 'kegel' && kegel.active) return 'Kegelridder loopt nog. Stop dat spel eerst.';
  if (except !== 'kolk' && kolk.active) return 'Kolkridder loopt nog. Stop dat spel eerst.';
  if (except !== 'camelot' && camelot.active) return 'Neon-Camelot loopt nog. Stop dat spel eerst.';
  if (except !== 'titan' && titan.active) return 'Titanenstrijd loopt nog. Stop dat spel eerst.';
  if (except !== 'storm' && storm.active) return 'Burchtstorm loopt nog. Stop dat spel eerst.';
  if (except !== 'pixel' && pixel.active) return 'Pixelridder loopt nog. Stop dat spel eerst.';
  if (except !== 'robomol' && robomol.active) return 'Robomol loopt nog. Stop dat spel eerst.';
  if (except !== 'kerker' && kerker.active) return 'Ontsnap uit de kerker loopt nog. Stop dat spel eerst.';
  if (except !== 'hofschilder' && hof.active) return 'De Hofschilder loopt nog. Stop dat spel eerst.';
  if (except !== 'paarden' && paarden.active) return 'Robopaarden loopt nog. Stop die race eerst.';
  if (except !== 'rijk' && rijk.active) return 'Het Rijk loopt nog. Stop dat spel eerst.';
  if (except !== 'oefenblad' && oefenblad.active) return 'Er staat nog een oefenblad open. Sluit dat eerst.';
  if (except !== 'proef' && proef.active) return 'Er loopt nog een toets. Sluit die eerst.';
  return null;
}

// Quizzen, oefenbladen en Ronde Tafel-sessies: lijst en mappen werken overal hetzelfde.
const LIBS = {
  quiz: { mod: quizzes, list: 'quizzes', folders: 'quiz-folders' },
  oefenblad: { mod: oefenbladen, list: 'ob-sheets', folders: 'ob-folders' },
  sessie: { mod: rondetafel, list: 'rt-sessions', folders: 'rt-folders' },
  proef: { mod: proeven, list: 'pf-lijst', folders: 'pf-mappen' },
  // De resultaten (Excel-bestanden) ordenen in mappen. Die gaan nooit naar de lesmap.
  resultaat: { mod: { lib: results.lib, list: results.items }, list: 'res-lijst', folders: 'res-mappen' },
};

// "In map:" uit de editor: het bewaarde item meteen in die map zetten. Een verdwenen map: dan blijft het waar het was.
function plaatsIn(kind, file, folder) {
  if (typeof folder !== 'string') return;
  try { LIBS[kind].mod.lib.move(file, folder); } catch {}
}

// Zonder target: naar alle leerkrachtenschermen, en daarna ook naar de lesmap (er werd iets bewaard, verplaatst of verwijderd).
function sendLibrary(kind, target, fromSync = false) {
  const l = LIBS[kind];
  const to = target || io.to('host');
  // Eerst de lijst: bij de resultaten kan die vanzelf nieuwe mappen maken.
  const list = l.mod.list();
  to.emit(l.folders, l.mod.lib.folders());
  to.emit(l.list, list);
  if (!target && !fromSync && kind !== 'resultaat') syncSoon();
}

// Mijn lesmap (OneDrive of Google Drive): bij opstart, elke minuut en kort na elke wijziging.
lesmap.init([
  { kind: 'quiz', dir: quizzes.DIR, remote: 'quizzen', validate: quizzes.validate },
  { kind: 'oefenblad', dir: oefenbladen.DIR, remote: 'oefenbladen', validate: oefenbladen.validate },
  { kind: 'sessie', dir: rondetafel.DIR, remote: 'ronde-tafel', validate: rondetafel.validate },
  // Toetsen thuis maken, op het digibord afnemen. De afnames (antwoorden van leerlingen) blijven op deze pc.
  { kind: 'proef', dir: proeven.DIR, remote: 'toetsen', validate: proeven.K.validate },
  // De planning van De Zonnewijzer: thuis voorbereiden, op het bord gebruiken.
  { kind: 'zonnewijzer', dir: zonnewijzer.DIR, remote: 'zonnewijzer', validate: d => { if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Ongeldig bestand.'); } },
  // De Kronieken: mappen, online bordboeken en koppelingen per les.
  { kind: 'kronieken', dir: kronieken.LINKS_DIR, remote: 'kronieken', validate: kronieken.geldigeLinks },
  // Taken: thuis klaarzetten, op het digibord werken de leerlingen eraan. Alleen de taak zelf, nooit het werk.
  // perKlas: hoort bij de klas die nu gekozen is (Meerdere klassen); de eerste klas staat waar ze altijd stond.
  { kind: 'taak', dir: () => taken.PLAN, perKlas: true, remote: 'taken', validate: taken.planGeldig },
  // Hoe ver de leerlingen zijn met elke taak: de pc waar ze werken zet het hier, je andere pc's tonen het.
  // De afnames van toetsen (De Proef, ook een toets als taak): zo zie en verbeter je ze op elke pc. Per leerling en per vraag samenvoegen.
  { kind: 'afnames', dir: () => proeven.AFNAMES, perKlas: true, remote: 'toetsen-resultaten', validate: proeven.afnameGeldig, merge: proeven.afnameSamen, voorWeg: p => toetsarchief.voorWeg(p) },
  // Welke pc's er zijn en wanneer ze het laatst iets stuurden (statusregel "Bijgewerkt van …").
  // De standaardkeuzes voor taken (Instellingen › Taken): per leerkracht, dus niet per klas.
  { kind: 'takenstandaard', dir: takenstandaard.DIR, remote: 'taken-standaard', validate: takenstandaard.geldig },
  // Eigen vakken (Mijn klas › Klas › Vakken): toevoegen, hernoemen, verbergen. Op twee pc's tegelijk: samenvoegen.
  { kind: 'vakken', dir: niveaus.DIR, remote: 'vakken', validate: niveaus.geldig, merge: niveaus.samen, altijdSamen: true },
  // Welke poging telt bij een herkansing (Opvolgen › Punten).
  { kind: 'punten', dir: punten.DIR, remote: 'punten', validate: punten.geldig, merge: punten.samen, altijdSamen: true },
  { kind: 'toestellen', dir: toestellen.DIR, remote: 'toestellen', validate: toestellen.geldig },
  { kind: 'takenstand', dir: () => taken.STAND, perKlas: true, remote: 'taken-stand', validate: taken.standGeldig },
  // De klastaken van De Wachtlijst (de taken en de beurt, niet de volgorde van de leerlingen).
  { kind: 'klastaken', dir: () => klastaken.DIR, perKlas: true, remote: 'klastaken', validate: klastaken.geldig },
  // De Klasindeling: je lokaal en wie waar zit, thuis klaar te zetten.
  { kind: 'klasindeling', dir: () => klasindeling.DIR, perKlas: true, remote: 'klasindeling', validate: klasindeling.geldig },
  // De klaslijst (alleen namen en niveaus), zodat je thuis taken per kind klaarzet. Twee lijsten worden samengevoegd.
  { kind: 'klas', dir: () => klas.LESMAP, perKlas: true, remote: 'klas', validate: klas.lesmapGeldig, merge: klas.lesmapSamen },
  // Welke klassen er zijn (Meerdere klassen): een klas die thuis gemaakt werd, staat dan ook op het digibord.
  { kind: 'klassen', dir: klas.KLASSEN_LESMAP, remote: 'klassen-lijst', validate: klas.klassenGeldig, merge: klas.klassenSamen },
  // Toetsen mailen: adressen en vinkjes per leerling en de mailbox (nooit het app-wachtwoord). De laatste wijziging wint.
  // Voorlezen: de spraakdienst met sleutel, regio, stem en grens (Jorn wil ze maar één keer invullen). De laatste wijziging wint.
  { kind: 'stem', dir: stem.LESMAP_DIR, remote: 'voorlezen', validate: stem.syncGeldig, merge: stem.lesmapSamen },
  { kind: 'toetsmail', dir: toetsmail.LESMAP_DIR, remote: 'toetsen-mailen', validate: toetsmail.syncGeldig, merge: toetsmail.lesmapSamen },
  // Het Klaseiland en het ridderboek: de pc waar de klas speelt zet een kopie klaar, thuis kan je die bekijken.
  { kind: 'burchten', dir: () => burchten.LESMAP, perKlas: true, remote: 'klaseiland', validate: burchten.kopieGeldig },
  // De woorden van de week van het Runenraadsel: thuis klaarzetten, op het bord raden. De resultaten blijven op deze pc.
  { kind: 'runen', dir: () => runen.WOORDEN_DIR, perKlas: true, remote: 'runenraadsel', validate: runen.lijstGeldig },
  // In Beeld: welke kaartensets je ophaalde en de kaarten van de week. De andere pc haalt die sets dan zelf op.
  // Niet in de Store-versie (alleen voor België).
  ...(inbeeld.aan() ? [{ kind: 'inbeeld', dir: () => inbeeld.LESMAP_DIR, remote: 'in-beeld', validate: inbeeld.keuzeGeldig }] : []),
  // De spelresultaten (Excel-bestanden): wat op het bord gespeeld werd, zie je ook thuis (nacontrole 20 nov, 5).
  { kind: 'resultaat', bestanden: true, dir: () => results.DIR, remote: 'spelresultaten', toegelaten: results.syncNaam, weg: results.syncWeg, inPrullenbak: results.inPrullenbak },
  // De bordboeken zelf (pdf's en afbeeldingen van Mijn methodes): groot, dus apart en uit te zetten bij Instellingen.
  // Als laatste: zo staat al het kleine werk er al terwijl een groot boek nog kopieert.
  { kind: 'bordboeken', bestanden: true, dir: kronieken.DIR, remote: 'bordboeken', toegelaten: kronieken.syncNaam, weg: kronieken.syncWeg, inPrullenbak: kronieken.inPrullenbak },
], {
  // Instellingen › Lesmap, "Wat kwam er binnen?": van welke pc's de stand van de taken hier staat.
  overzicht: () => {
    const van = Object.entries(taken.standPerPc()).map(([pc, n]) => ({ pc: toestellen.naamVan(pc), n }));
    return van.length ? { takenstand: van } : {};
  },
  // Grote bordboeken kopiëren duurt even: tussendoor tonen hoe ver het staat (hooguit twee keer per seconde).
  voortgang: (() => {
    let laatst = 0;
    return () => {
      const nu = Date.now();
      if (nu - laatst < 500) return;
      laatst = nu;
      io.to('host').emit('lesmap', lesmap.view());
    };
  })(),
});
let syncTimer = null;
function runSync() {
  try { klas.naarLesmap(); } catch (err) { console.error('Klaslijst voor de lesmap bewaren mislukt:', err.message); }
  try { klas.naarLesmapKlassen(); } catch (err) { console.error('Klassen voor de lesmap bewaren mislukt:', err.message); }
  try { toetsmail.naarLesmap(); } catch (err) { console.error('Adressen voor toetsen mailen bewaren mislukt:', err.message); }
  try { stem.naarLesmap(); } catch (err) { console.error('Voorleesinstellingen voor de lesmap bewaren mislukt:', err.message); }
  runen.verhuis();
  if (settings.read().lesmap) {
    try { toestellen.hartslag(false, taken.openIds()); } catch (err) { console.error('Toestel voor de lesmap bewaren mislukt:', err.message); }
    try { const i = echteKaart(); taken.naarLesmapStand(i ? `${i.address}:${PORT}` : ''); } catch (err) { console.error('Stand van de taken voor de lesmap bewaren mislukt:', err.message); }
    try { burchten.naarLesmap(); } catch (err) { console.error('Klaseiland voor de lesmap bewaren mislukt:', err.message); }
  }
  syncBezig = lesmap.sync().then(changed => {
    // Eerst de klaslijst: taken uit de lesmap gaan alleen naar wie op de klaslijst staat.
    if (changed.includes('klassen') && klas.uitLesmapKlassen()) io.to('host').emit('klassen', klas.klassen());
    if (changed.includes('klas') && klas.uitLesmap()) {
      io.emit('klas-namen', klas.names());
      io.to('host').emit('klas-gewijzigd');
    }
    for (const kind of changed) {
      if (LIBS[kind]) sendLibrary(kind, null, true);
      else if (kind === 'zonnewijzer') io.to('host').emit('zw-gewijzigd');
      else if (kind === 'punten') takenNaarBord();
      else if (kind === 'takenstandaard') io.to('host').emit('tk-standaard', takenstandaard.read());
      else if (kind === 'stem') { if (stem.uitLesmap()) { io.to('host').emit('stem-standen', stem.standenView()); io.to('host').emit('stem-gewijzigd'); stemSoon(); } }
      else if (kind === 'toetsmail') { if (toetsmail.uitLesmap()) io.to('host').emit('toetsmail-gewijzigd'); }
      else if (kind === 'kronieken' || kind === 'bordboeken') io.to('host').emit('kr-lijst', kronieken.lijst());
      else if (kind === 'klastaken') io.to('host').emit('wk-taken', klastaken.read());
      else if (kind === 'klasindeling') io.to('host').emit('wk-indeling', klasindeling.read());
      else if (kind === 'burchten') io.to('host').emit('bu-eiland', burchten.eiland());
      else if (kind === 'runen') { runen.uitLesmap(); io.to('host').emit('rn-bord', runen.bord()); }
      else if (kind === 'inbeeld') inbeeld.uitLesmap().then(() => io.to('host').emit('ib-view', inbeeld.view()));
    }
    if (changed.includes('takenstand') || changed.includes('afnames')) takenNaarBord();
    if (changed.includes('afnames')) {
      vandaagSoon(); io.to('host').emit('pf-afnames', afnameLijst());
      io.to('host').emit('pf-afname-gewijzigd');
      // Klaar op een pc zonder app-wachtwoord (rec.mailWacht): een pc die wel kan mailen, doet het (elke leerling één keer).
      try { if (toetsmail.view().klaar) wachtendeMails(); } catch {}
    }
    if (taken.uitLesmap()) {
      takenNaarBord();
      stemSoon();
      // Ook wie een taak open heeft die op een andere pc gesloten of gewist werd: zijn scherm kijkt het meteen na.
      io.emit('tk-nieuw');
      solo.controleer();
      // Welke taken hier nu open staan, meteen ook naar je andere pc's (alleen als dat veranderde).
      try { if (toestellen.hartslag(false, taken.openIds())) syncSoon(); } catch {}
    }
    io.to('host').emit('lesmap', lesmap.view());
  });
  const p = syncBezig;
  p.catch(() => {}).finally(() => { if (syncBezig === p) syncBezig = null; });
  return p;
}
// Een taak die op een andere pc gesloten, gewist of opnieuw gegeven werd: om de 5 seconden kijken of er in de lesmap
// iets veranderde aan de taken (alleen namen en tijdstippen, niets lezen). Dan meteen synchroniseren, niet pas na een minuut.
// Hoe snel het bestand van de andere pc hier aankomt, hangt verder af van OneDrive of Google Drive.
setInterval(() => {
  if (syncBezig || !settings.read().lesmap) return;
  lesmap.nieuwInLesmap().then(nieuw => { if (nieuw && !syncBezig) runSync(); }).catch(() => {});
}, 5000).unref();
// Loopt de lesmap net te synchroniseren? Dan wacht een automatische update daar eerst op.
let syncBezig = null;
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

// De lijst van taken alleen naar de schermen die ze tonen (Taken, De Zonnewijzer): die vragen haar eerst op (tk-lijst).
// Zo krijgen het startscherm en de spellen niet twee keer per seconde alle taken door wifi, en rekenen we niets voor niemand.
const TAKEN_KIJKERS = 'taken-kijkers';
// Voorlezen met de stem van LANcelot (src/stem.js): wat open taken en een live toets of oefenblad voorlezen,
// meteen maken en bewaren. Even wachten, zodat vijf snelle wijzigingen één ronde geven. Ook elk kwartier (internet terug?).
let stemTimer = null;
function stemBronnen() {
  const K = require('./public/js/pf-kern');
  const b = taken.voorleesBronnen();
  try {
    if (proef.active && proef.toets) {
      const taal = stem.taalVanVak(proeven.vakVan(proef.toets));
      for (const n of K.niveausVan(proef.toets)) b.push({ view: K.studentView(proef.toets, K.lijstVoor(proef.toets, n)), taal, voorlees: proef.inst.voorlees !== 'uit' });
    }
  } catch {}
  try {
    if (oefenblad.active && oefenblad.sheet) {
      const taal = stem.taalVanVak(oefenblad.vak);
      for (const n of oefenbladen.niveausOf(oefenblad.sheet)) {
        const blad = oefenbladen.forNiveau(oefenblad.sheet, n);
        b.push({ view: oefenbladen.studentView(blad, oefenbladen.shufflesFor(blad, 'stem')), taal, voorlees: oefenblad.voorlees !== 'uit' });
      }
    }
  } catch {}
  return b;
}
function stemSoon(ms = 3000) {
  clearTimeout(stemTimer);
  stemTimer = setTimeout(() => {
    try { stem.zorgVoor(stemBronnen()); } catch (err) { console.error('Voorlezen klaarzetten mislukt:', err.message); }
  }, ms);
}
setTimeout(() => stemSoon(0), 20000).unref();
setInterval(() => stemSoon(0), 15 * 60 * 1000).unref();

function takenNaarBord() {
  const r = io.sockets.adapter.rooms.get(TAKEN_KIJKERS);
  if (r && r.size) io.to(TAKEN_KIJKERS).emit('tk-lijst', taken.lijst());
  vandaagSoon();
}

// Het blok "Vandaag" op het startscherm (wensenlijst 20 nov, punt 9): alleen naar wie het startscherm open heeft,
// hooguit om de twee seconden, en alleen als de leerkracht het niet uitzette (Instellingen › Taken).
const VANDAAG_KIJKERS = 'vandaag-kijkers';
function vandaagData() {
  if (!takenstandaard.read().vandaag) return { uit: true };
  const d = vandaag.samenvatting(taken.lijst(), afnameLijst());
  // De dagpresentatie van vandaag (Mijn methodes › Dagpresentaties, bv. via de connector geplaatst): één tik om te openen.
  const p = connector.presentatieVan();
  return p ? { ...d, presentatie: p, leeg: false } : d;
}
let vandaagTimer = null;
function vandaagSoon() {
  if (vandaagTimer) return;
  const r = io.sockets.adapter.rooms.get(VANDAAG_KIJKERS);
  if (!r || !r.size) return;
  vandaagTimer = setTimeout(() => {
    vandaagTimer = null;
    try { io.to(VANDAAG_KIJKERS).emit('vandaag', vandaagData()); } catch {}
  }, 2000);
}

// Taken: een leerling werkte iets bij. Het bord hooguit twee keer per seconde bijwerken.
let takenTimer = null;
function takenSoon() {
  if (takenTimer) return;
  takenTimer = setTimeout(() => {
    takenTimer = null;
    takenNaarBord();
    // Ook het toetsoverzicht in De Proef en op het startscherm (wie bezig is).
    vandaagSoon(); io.to('host').emit('pf-afnames', afnameLijst());
    // Alleen wie hoe ver is (de afname zelf verandert pas bij inleveren): Verbeteren haalt dan niet de hele toets opnieuw.
    io.to('host').emit('pf-afname-voortgang');
  }, 500);
  // De stand ook snel naar je andere pc's (via de lesmap), hooguit om de 20 seconden.
  if (!standTimer && settings.read().lesmap) standTimer = setTimeout(() => { standTimer = null; syncSoon(); }, 20000);
}
let standTimer = null;

// Geplande taken: op het moment dat er een verschijnt, krijgen de leerlingen en het bord een seintje.
// Eén keer per halve minuut kijken is genoeg (een taak die om 10:25 gepland staat, is er uiterlijk om 10:25:30).
let takenGekeken = Date.now();
setInterval(() => {
  const sinds = takenGekeken;
  takenGekeken = Date.now();
  try {
    if (!taken.gestartSinds(sinds)) return;
    takenNaarBord();
    io.emit('tk-nieuw');
  } catch {}
}, 30000).unref();

// Einddatum en tijdslimiet van taken: om de vijf seconden kijken. Een taak met een voorbije einddatum sluit (op elke pc
// zelf), wie geen tijd meer heeft, levert in. Leerlingen en bord krijgen meteen een seintje (zoals bij 🔒 Afsluiten).
setInterval(() => {
  try {
    if (!taken.tik()) return;
    takenNaarBord();
    stemSoon();
    io.emit('tk-nieuw');
    solo.controleer();
    try { toestellen.hartslag(false, taken.openIds()); } catch {}
    syncSoon();
  } catch (err) {
    console.error('Taken nakijken mislukt:', err.message);
  }
}, 5000).unref();

// De ontdekwereld: wie wat oploste, hooguit om de twee seconden naar de leerkrachtenschermen.
let ontdekTimer = null;
const ontdekBinnen = () => [...io.sockets.sockets.values()].filter(s => !s.data.host && s.data.waar === 'ontdek' && s.data.naam).map(s => s.data.naam);
function ontdekSoon() {
  if (ontdekTimer) return;
  ontdekTimer = setTimeout(() => {
    ontdekTimer = null;
    io.to('host').emit('od-bord', ontdek.bord(ontdekBinnen()));
  }, 2000);
}

// LANcelot Junior: welke kinderen nu op een tablet ingelogd zijn, en het overzicht voor de leerkracht (hooguit om de halve seconde).
function juniorBezet() {
  const ids = new Set();
  for (const s of io.sockets.sockets.values()) for (const id of s.data.jr || []) ids.add(id);
  return ids;
}
let juniorTimer = null;
function juniorSoon() {
  if (juniorTimer) return;
  juniorTimer = setTimeout(() => {
    juniorTimer = null;
    const bezet = juniorBezet();
    io.to('host').emit('jr-overzicht', junior.overzicht(bezet));
    io.emit('jr-kinderen', { kinderen: junior.kinderen().map(({ id, naam, team, dier, eigen, beeld, feest, maat }) => ({ id, naam, team, dier, eigen, beeld, feest, maat })), bezet: [...bezet] });
  }, 500);
}

// De leerkrachtenschermen, elk bij zijn adres.
const PAGINAS = [['/host', 'host.html'], ['/rondetafel', 'rondetafel.html'], ['/toren', 'toren.html'], ['/schattenjacht', 'schattenjacht.html'], ['/laserslag', 'laserslag.html'], ['/ridderrace', 'ridderrace.html'], ['/kristalroof', 'kristalroof.html'], ['/verrader', 'verrader.html'], ['/burchtbouwers', 'burchtbouwers.html'], ['/duel', 'duel.html'], ['/packnight', 'packnight.html'], ['/strijdrossen', 'strijdrossen.html'], ['/gauntlet', 'gauntlet.html'], ['/ridder-royale', 'royale.html'], ['/sterrenvreter', 'sterrenvreter.html'], ['/ridderslang', 'ridderslang.html'], ['/burchtstorm', 'burchtstorm.html'], ['/poortwacht', 'poortwacht.html'], ['/neonvlucht', 'neonvlucht.html'], ['/diepboor', 'diepboor.html'], ['/raketridder', 'raketridder.html'], ['/splijtzwaard', 'splijtzwaard.html'], ['/wankelwagen', 'wankelwagen.html'], ['/plasmapoort', 'plasmapoort.html'], ['/tuimelridder', 'tuimelridder.html'], ['/hooibergjacht', 'hooibergjacht.html'], ['/zwermwacht', 'zwermwacht.html'], ['/haakridder', 'haakridder.html'], ['/kegelridder', 'kegelridder.html'], ['/kolkridder', 'kolkridder.html'], ['/neoncamelot', 'neoncamelot.html'], ['/titanenstrijd', 'titanenstrijd.html'], ['/banierveld', 'banierveld.html'], ['/pixelridder', 'pixelridder.html'], ['/robomol', 'robomol.html'], ['/kerker', 'kerker.html'], ['/hofschilder', 'hofschilder.html'], ['/robopaarden', 'robopaarden.html'], ['/neonduel', 'neonduel.html'], ['/leraarbaas', 'leraarbaas.html'], ['/cybergalaga', 'cybergalaga.html'], ['/bomberknight', 'bomberknight.html'], ['/rijk', 'rijk.html'], ['/oefenblad', 'oefenblad.html'], ['/proef', 'proef.html'], ['/proef-print', 'proef-print.html'], ['/proef-proberen', 'proef-proberen.html'], ['/reeks', 'reeks.html'], ['/wapenkamer', 'wapenkamer.html'], ['/kringgesprek', 'kringgesprek.html'], ['/kronieken', 'kronieken.html'], ['/zonnewijzer', 'zonnewijzer.html'], ['/zegelrol', 'zegelrol.html'], ['/zegelrol-print', 'zegelrol-print.html'], ['/postduif', 'postduif.html'], ['/postduif-print', 'postduif-print.html'], ['/oefenblad-print', 'oefenblad-print.html'], ['/klas', 'klas.html'], ['/zorg', 'zorg.html'], ['/taken', 'taken.html'], ['/opvolgen', 'opvolgen.html'], ['/zorg-fiche', 'zorg-fiche.html'], ['/runenraadsel', 'runenraadsel.html'], ['/lezen', 'lezen.html'], ['/ontdek-beheer', 'ontdek-beheer.html'], ['/klaseiland', 'klaseiland.html'], ['/netwerk', 'netwerk.html'], ['/welkom', 'welkom.html'], ['/privacy', 'privacy.html']];

// Het leerkrachtenscherm werkt op de pc waar de server draait (meestal het digibord),
// en op een tweede scherm dat de leerkracht met een koppelcode koppelde (de bureau-pc).
function isLocal(address) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}
function isLeerkracht(req) {
  return isLocal(req.socket.remoteAddress) || !!schermen.uitCookie(req.headers.cookie);
}
const GEEN_TOEGANG = '<!doctype html><meta charset="utf-8"><script src="/taal.js"></script><meta name="viewport" content="width=device-width, initial-scale=1"><title>LANcelot</title>'
  + '<body style="font-family:system-ui,sans-serif;background:#0f1424;color:#e8ecf6;display:grid;place-items:center;min-height:90vh;text-align:center;padding:16px">'
  + '<div><h2>Dit is het scherm van de leerkracht</h2><p>Leerlingen spelen via het adres op het bord.</p>'
  + '<p style="opacity:.75">Ben jij de leerkracht op je bureau-pc? <a style="color:#7fc8ff" href="/koppel">Koppel deze pc met een code van het digibord</a>.</p></div>';

for (const [route, page] of PAGINAS) {
  app.get(route, (req, res) => {
    if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
    // De instellingen openen vanuit Junior zet LANcelot niet terug als opstartscherm.
    if (route === '/host' && !('instellingen' in req.query)) zetJuniorModus(false);
    if (route === '/host') zetStartOnthouden(req);
    // Store-versie na de proefmaand zonder aankoop: eerst kopen. Privacy blijft altijd leesbaar.
    if (route !== '/privacy' && store.geblokkeerd()) return res.redirect('/licentie');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, 'public', page));
  });
}
// De licentie van de Store-versie: proefmaand, kopen, opnieuw controleren (zie src/store.js).
app.get('/licentie', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'licentie.html'));
});
app.get('/licentie/stand', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).end();
  (req.query.opnieuw ? store.controleer() : Promise.resolve(store.view())).then(v => res.json(v));
});
// Het Runenraadsel voor leerlingen: elke dag te spelen op hun eigen toestel, ook als er geen spel loopt.
app.get('/runen', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'runen.html'));
});
// De Leescheck voor leerlingen: in één minuut tonen dat je las (alleen als de leerkracht hem aanzette).
app.get('/leescheck', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'leescheck.html'));
});
// In Beeld: begrippenkaarten aanbrengen op het bord (alleen voor België, niet in de Store-versie). Zie src/inbeeld.js.
app.get('/inbeeld', (req, res) => {
  if (!inbeeld.aan()) return res.status(404).end();
  if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'inbeeld.html'));
});
app.get('/inbeeld/beeld/:naam', (req, res) => {
  const f = inbeeld.aan() && inbeeld.beeldBestand(req.params.naam);
  if (!f) return res.status(404).end();
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.sendFile(f, err => err && !res.headersSent && res.status(404).end());
});
// De ontdekwereld voor leerlingen: op hun eigen toestel, als de leerkracht hem openzet.
app.get('/ontdek', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'ontdek.html'));
});
// De Proef: de toets voor leerlingen, in een eigen, lichte pagina (het startscherm stuurt de leerling hierheen).
app.get('/toets', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'toets.html'));
});
// De kopie van één leerling (De Proef), als pdf voor Mijn lesmap: de gegevens zitten meteen in de pagina,
// zodat de browser zonder venster (Edge of Chrome) niets hoeft te laden. Ook bruikbaar om af te drukken.
app.get('/proef-kopie', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
  let data;
  try { data = proeven.kopieData(String(req.query.afname || ''), req.query.naam ? String(req.query.naam) : Number(req.query.speler)); } catch (err) { return res.status(404).send(err.message); }
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const html = fs.readFileSync(path.join(__dirname, 'public', 'proef-print.html'), 'utf8')
    .replace('<script src="/socket.io/socket.io.js"></script>', () => `<script>window.KOPIE = ${json};</script>`);
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(html);
});

// Weekrapport per leerling (wens 25 nov, punt 5): de gegevens meteen in de pagina, ook voor de pdf zonder venster.
// Export voor Bingel (wens 25 nov, punt 7): de punten en feedback van één toets, om over te nemen in Bingel.
app.get('/bingel', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'bingel.html'));
});
app.get('/weekrapport', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
  let data;
  try { data = require('./src/weekrapport').data({ van: req.query.van ? String(req.query.van) : undefined, tot: req.query.tot ? String(req.query.tot) : undefined, naam: req.query.pdf && req.query.naam ? String(req.query.naam) : undefined }); } catch (err) { return res.status(400).send(err.message); }
  if (req.query.pdf) data.pdf = true;
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const html = fs.readFileSync(path.join(__dirname, 'public', 'weekrapport.html'), 'utf8')
    .replace('<script src="/socket.io/socket.io.js"></script>', () => `<script>window.RAPPORT = ${json};</script><script src="/socket.io/socket.io.js"></script>`);
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(html);
});

// Het toetsarchief (src/toetsarchief.js): de pdf's maakt dezelfde browser zonder venster, uit de afname in het geheugen
// (zo lukt het ook als de afname net verwijderd werd). De opgave: de toets zoals ze toen afgenomen werd.
const metData = (naam, json) => fs.readFileSync(path.join(__dirname, 'public', 'proef-print.html'), 'utf8')
  .replace('<script src="/socket.io/socket.io.js"></script>', () => `<script>window.${naam} = ${JSON.stringify(json).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')};</script>`);
app.get('/archief-kopie', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
  let data;
  try { data = toetsarchief.werkKopie(req.query.werk, req.query.naam); } catch (err) { return res.status(404).send(err.message); }
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(metData('KOPIE', data));
});
app.get('/archief-opgave', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
  let data;
  try { data = toetsarchief.werkOpgave(req.query.werk); } catch (err) { return res.status(404).send(err.message); }
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(metData('OPGAVE', data));
});
toetsarchief.pdfUrl = (werk, { naam, sleutel } = {}) => naam !== undefined
  ? `http://127.0.0.1:${PORT}/archief-kopie?werk=${werk}&naam=${encodeURIComponent(naam)}`
  : `http://127.0.0.1:${PORT}/archief-opgave?werk=${werk}&niveau=alle${sleutel ? '&sleutel=1' : ''}`;
// Een schooljaar uit het archief als zip.
app.get('/toetsarchief-export', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
  const jaar = String(req.query.jaar || '');
  const tmp = path.join(require('os').tmpdir(), `lancelot-archief-${Date.now()}.zip`);
  toetsarchief.exporteer(jaar, tmp)
    .then(() => res.download(tmp, `${toetsarchief.MAP_NAAM} ${jaar}.zip`, () => fs.rm(tmp, { force: true }, () => {})))
    .catch(err => { fs.rm(tmp, { force: true }, () => {}); res.status(404).type('text/plain; charset=utf-8').send(err.message); });
});
// Een afname in het archief zetten (na Klaar), met de klas die nu gekozen is.
function archiveer(file) {
  try {
    const rec = proeven.laadAfname(file);
    rec.file = rec.file || file;
    const r = toetsarchief.bewaar(rec, toetsarchief.klasCtx(gegevens.actieveKlas()));
    if (r) r.pdf.then(() => io.to('host').emit('archief', toetsarchief.view()), () => {});
  } catch (err) { console.error('Toetsarchief:', err.message); }
}
// Bij het opstarten (na de kopieën en mails) en daarna om de zes uur: wat nog niet in het archief staat.
const archiefRonde = () => toetsarchief.vanzelf().then(() => io.to('host').emit('archief', toetsarchief.view())).catch(err => console.error('Toetsarchief:', err.message));
setTimeout(archiefRonde, 90000).unref();
setInterval(archiefRonde, 6 * 3600 * 1000).unref();

// Na het verbeteren: per leerling een pdf in Mijn lesmap (als de leerkracht dat aanzette). Loopt op de achtergrond.
// Een afname die nog gemaild moet worden zodra de mailbox op deze pc klaar is (proeven/_afnames, rec.mailWacht).
function zetMailWacht(file, aan) {
  try {
    const rec = proeven.laadAfname(file);
    if (!!rec.mailWacht === aan) return;
    if (aan) rec.mailWacht = true; else delete rec.mailWacht;
    proeven.schrijfAfname(rec);
  } catch {}
}
// inhalen (bij het opstarten): ook elke verbeterde toets van de laatste 7 dagen zonder pdf in de lesmap. Alleen wat op deze pc afgenomen werd.
function wachtendeMails({ inhalen = false } = {}) {
  let n = 0;
  const k = klas.klassen();
  const deze = k.klassen.find(x => x.id === k.actief);
  const klasNaam = k.klassen.length > 1 && deze ? (deze.naam || `Klas ${deze.nr}`) : '';
  for (const a of proeven.afnames()) {
    try {
      const rec = proeven.laadAfname(a.file);
      const recent = inhalen && rec.klaar && (!rec.pc || rec.pc === proeven.PC) && rec.spelers.some(s => Date.now() - Date.parse(s.ingeleverd || rec.datum || 0) < 7 * 864e5);
      if (!rec.mailWacht && !recent) continue;
      const mail = toetsmail.view().klaar && toetsmail.nodig(rec.spelers.filter(s => !s.gemaild));
      const pdf = recent && toetskopie.ontbreekt(rec, klasNaam);
      if (mail || pdf) { toetsKopieen(a.file); n++; } else if (rec.mailWacht && toetsmail.view().klaar) zetMailWacht(a.file, false);
    } catch {}
  }
  return n;
}

// Na Klaar (in De Proef, of vanzelf bij een toets als taak zonder open vragen): de kopie in de lesmap en de mail.
function naKlaar(file, rec) {
  const kopie = toetskopie.aan() && !!settings.read().lesmap;
  // Wie een mailadres heeft (bv. de GON-begeleider), krijgt zijn toets ook gemaild.
  const mail = toetsmail.nodig(rec.spelers);
  // Daarna (één browser tegelijk) in het toetsarchief.
  (kopie || mail ? toetsKopieen(file) : Promise.resolve()).catch(() => {}).then(() => archiveer(file));
  // Wel adressen, maar op deze pc nog geen app-wachtwoord: onthouden en mailen zodra het ingevuld is (niet stil overslaan).
  const mailWacht = !mail && toetsmail.heeftAdres(rec.spelers);
  if (mailWacht) zetMailWacht(file, true);
  return { kopie, mail, mailWacht };
}

// Bij het opstarten: wat nog gemaild moest worden, en de pdf's in de lesmap die ontbreken van een toets als taak
// die vanzelf verbeterd werd (vóór #578 kwam er dan geen pdf en geen mail). Elke leerling krijgt maar één mail.
setTimeout(() => { try { wachtendeMails({ inhalen: true }); } catch {} }, 20000).unref();

function toetsKopieen(file) {
  let rec;
  try { rec = proeven.laadAfname(file); } catch { return Promise.resolve({ gemaakt: 0, fout: 'Die afname is niet te vinden.' }); }
  const k = klas.klassen();
  const deze = k.klassen.find(x => x.id === k.actief);
  const klasNaam = k.klassen.length > 1 && deze ? (deze.naam || `Klas ${deze.nr}`) : '';
  io.to('host').emit('pf-kopie', { file, bezig: true, aantal: rec.spelers.length });
  // Op naam (niet op plaats): intussen kan er iemand bijgekomen zijn, hier of via de lesmap.
  const gemaildBij = i => {
    try {
      const nu = proeven.laadAfname(file);
      const s = nu.spelers.find(x => proeven.sleutelVan(x.naam) === proeven.sleutelVan(rec.spelers[i].naam));
      if (s) { s.gemaild = new Date().toISOString(); proeven.schrijfAfname(nu); }
    } catch {}
  };
  return toetskopie.maak({ rec, klas: klasNaam, stand: s => proeven.stand(rec, s), gemaildBij, url: i => `http://127.0.0.1:${PORT}/proef-kopie?afname=${encodeURIComponent(file)}&speler=${i}&naam=${encodeURIComponent(rec.spelers[i].naam)}` })
    .then(r => {
      // Iedereen met een adres is gemaild: niets meer in de wacht.
      try { if (!toetsmail.heeftAdres(proeven.laadAfname(file).spelers)) zetMailWacht(file, false); } catch {}
      io.to('host').emit('pf-kopie', { file, ...r });
      return r;
    });
}

// De afbeeldingen van de toets die nu loopt (zo zitten ze niet in elke stand die naar de leerlingen gaat).
app.get('/toets-beeld/:run/:nr', (req, res) => {
  const b = proef.beeld(req.params.run, req.params.nr);
  if (!b) return res.status(404).end();
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.type(b.mime).send(b.buf);
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
// LANcelot Junior (3e kleuterklas tot 3e leerjaar), in dezelfde app. Ook in de Store-versie (Jorn, 2026-11-19);
// uitzetten kan met juniorInStore: false in settings.json.
const juniorAan = () => !store.ACTIEF || settings.read().juniorInStore !== false;
// De leerlingen volgen de leerkracht: staat het leerkrachtenscherm op Junior, dan gaat het leerlingadres naar Junior,
// anders naar het gewone LANcelot (ook wie /junior intikt). Onthouden in settings.json (juniorModus).
function zetJuniorModus(aan) {
  if ((settings.read().juniorModus === true) === aan) return;
  settings.write({ juniorModus: aan });
  io.emit('jr-modus', { junior: aan });
}
const juniorModus = () => juniorAan() && settings.read().juniorModus === true;
// Het keuzescherm LANcelot of Junior: met "Onthoud mijn keuze" opent het opstarten voortaan meteen de laatst gebruikte
// versie (gewisseld wordt met de knop bovenaan). Onthouden in settings.json (startOnthouden).
function zetStartOnthouden(req) {
  const o = req.query.onthoud;
  if (o === '1' || o === '0') settings.write({ startOnthouden: o === '1' });
}
app.get('/junior-leerkracht', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
  if (!juniorAan()) return res.redirect('/host');
  zetJuniorModus(true);
  zetStartOnthouden(req);
  if (store.geblokkeerd()) return res.redirect('/licentie');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'junior-leerkracht.html'));
});
// Bij het opstarten: kiezen tussen LANcelot en LANcelot Junior (zonder Junior meteen naar LANcelot).
app.get('/kies', (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).send(GEEN_TOEGANG);
  if (!juniorAan()) return res.redirect('/host');
  // Keuze onthouden: meteen naar de versie van de vorige keer. Met /kies?vraag=1 toch het keuzescherm.
  if (settings.read().startOnthouden === true && !('vraag' in req.query)) return res.redirect(juniorModus() ? '/junior-leerkracht' : '/host');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'kies.html'));
});
app.get('/junior', (req, res) => {
  if (!juniorAan()) return res.redirect('/');
  // Het leerkrachtenscherm staat op LANcelot en er loopt geen Junior-spel: dan hoort de leerling op LANcelot.
  if (!juniorModus() && !junior.actief) return res.redirect('/');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'junior.html'));
});
// De eigen symbooltjes van de klas (Junior > De dieren van de klas): opladen en wissen door de leerkracht, tonen aan iedereen.
app.get('/junior/symbool/:id', (req, res) => {
  const b = junior.symboolBestand(String(req.params.id));
  if (!b) return res.status(404).end();
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.sendFile(b.file, err => err && !res.headersSent && res.status(404).end());
});
app.post('/junior/symbool/:id', express.json({ limit: '700kb' }), (req, res) => {
  if (!isLeerkracht(req)) return res.status(403).end();
  try {
    res.json({ ok: true, kinderen: junior.zetSymbool(String(req.params.id), (req.body || {}).data || '') });
    juniorSoon();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// De echte foto's bij de eigen vragen (Junior > Maken), bewaard in de klasmap: voor iedereen in de klas.
app.get('/junior/foto/:naam', (req, res) => {
  const f = jrFoto.bestand(req.params.naam);
  if (!f) return res.status(404).end();
  res.setHeader('Cache-Control', 'private, max-age=604800, immutable');
  res.sendFile(f, err => err && !res.headersSent && res.status(404).end());
});
// De eigen stem van de leerkracht bij een vraag (Junior > Maken > 🎤).
app.get('/junior/stem/:naam', (req, res) => {
  const f = jrFoto.stemBestand(req.params.naam);
  if (!f) return res.status(404).end();
  res.setHeader('Cache-Control', 'private, max-age=604800, immutable');
  res.sendFile(f, err => err && !res.headersSent && res.status(404).end());
});
// Wat het draakje zegt en toont, in de taal van LANcelot, plus de spelletjes (namen voor de leerkracht).
app.get('/junior/inhoud.js', (req, res) => {
  const inh = junior.inhoud(taal.huidig());
  const spellen = junior.SPELLEN.map(s => ({ id: s.id, naam: s.naam, zin: s.zin, groep: s.groep, beeld: s.beeld, niveaus: junior.niveausVan(s), bordAlleen: !!s.bordAlleen, verborgen: !!s.verborgen }));
  res.setHeader('Cache-Control', 'no-cache');
  res.type('application/javascript').send(`window.JR=${JSON.stringify({ ...inh, spellen, sets: junior.sets() })};`);
});
// Mijn huisdier: een ei kiezen, verzorgen en zien groeien, op het eigen toestel.
app.get('/huisdier', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'huisdier.html'));
});
// De taal van alle schermen: /taal.js zet het woordenboek klaar (Nederlands: niets te doen).
taal.route(app);
beheer.routes(app, isLeerkracht);
// De Kronieken: eigen bordboeken en handleidingen tonen en toevoegen (enkel de leerkracht).
kronieken.routes(app, isLeerkracht, express, () => { io.to('host').emit('kr-lijst', kronieken.lijst()); syncSoon(); });
// De connector voor Claude (Instellingen › Connector, docs/connector.md): MCP op /mcp en dezelfde tools op /api/v1.
// Alleen met een sleutel die de leerkracht zelf maakte; standaard uit en alleen lezen.
connector.routes(app, express);
connector.init({
  express,
  versie: () => { try { return (bijwerken.view().huidig || {}).sha || ''; } catch { return ''; } },
  hooks: {
    naTaken: ({ toets, keuzes } = {}) => {
      takenNaarBord();
      stemSoon();
      io.emit('tk-nieuw');
      if (keuzes) io.emit('tk-keuzes', { id: keuzes });
      solo.controleer();
      if (toets) sendLibrary('proef', null, true);
      syncSoon();
    },
    naToetsen: () => sendLibrary('proef'),
    naBib: kind => sendLibrary(kind),
    // Peilen: de peiling die op het bord loopt (De Ronde Tafel), klaarzetten en stoppen.
    rondeTafel: () => rt,
    peilingStarten: sessie => {
      const busy = busyWith();
      if (busy) throw busyError(busy);
      rt.load(sessie);
    },
    peilingStoppen: () => rt.stop(),
    syncNu: async () => {
      if (!settings.read().lesmap) return { ingesteld: false };
      try { await runSync(); } catch {}
      const lm = lesmap.view();
      return { ingesteld: true, ...Object.fromEntries(Object.entries(lm).filter(([k]) => !['lesmap', 'soorten'].includes(k))) };
    },
    naKronieken: () => { io.to('host').emit('kr-lijst', kronieken.lijst()); syncSoon(); vandaagSoon(); },
    gezondheid: () => {
      const b = (() => { try { return bijwerken.view(); } catch { return {}; } })();
      const lm = (() => { try { return lesmap.view(); } catch { return {}; } })();
      return {
        draait: true, sinds: new Date(Date.now() - process.uptime() * 1000).toISOString(), pc: os.hostname(), poort: PORT,
        versie: b.huidig || null, store: !!b.store, update_klaar: !!b.klaar, update_melding: b.melding || '',
        lesmap: { ingesteld: !!lm.lesmap, ...Object.fromEntries(Object.entries(lm).filter(([k]) => !['lesmap', 'soorten'].includes(k))) },
        leerlingen_verbonden: [...io.sockets.sockets.values()].filter(x => !x.data.host).length,
      };
    },
  },
  bijLog: r => io.to('host').emit('cn-log', r),
  bijTunnel: v => io.to('host').emit('cn-tunnel', v),
});
// Voorlezen: de leerling meldt welke stem hij hoort (Vlaams, een andere, geen). Het live overzicht toont het bij zijn naam.
app.post('/api/stem/stand', express.json({ limit: '1kb' }), (req, res) => {
  if (stem.zetStand(req.body || {})) io.to('host').emit('stem-standen', stem.standenView());
  res.json({ ok: true });
});
// Staat de stem van LANcelot aan? (Dan vraagt voorlees.js eerst hier het geluid.)
app.get('/api/stem/info', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.json({ aan: stem.aan() });
});
// Het geluid van één stuk tekst. Alleen wat in een taak of les staat (de leerkracht: alles). Anders 404: dan het toestel.
app.get('/api/stem', async (req, res) => {
  try {
    const f = await stem.geluid({ tekst: req.query.t, taal: req.query.taal, traag: req.query.traag === '1', leerkracht: isLeerkracht(req) });
    if (!f) return res.status(404).end();
    res.setHeader('Cache-Control', 'private, max-age=604800');
    res.sendFile(f);
  } catch {
    res.status(404).end();
  }
});
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
    const file = results.filePath(req.params.file);
    // Het bestand blijft in het Nederlands bewaard; in een andere taal vertalen we bij het downloaden.
    if (taal.huidig() === 'nl') return res.download(file);
    res.attachment(req.params.file);
    res.type('text/csv; charset=utf-8').send(taal.csv(fs.readFileSync(file, 'utf8')));
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
  res.type('text/csv; charset=utf-8').send(taal.csv(out.text));
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
// Het leerlingadres (/) brengt de kinderen naar Junior zolang het leerkrachtenscherm op Junior staat.
app.get(['/', '/index.html'], (req, res, next) => (juniorModus() ? res.redirect('/junior') : next()));
app.get(/^\/(?:[\w./-]*\.(?:js|css|html))?$/, (req, res, next) => {
  const file = path.join(PUBLIC, req.path === '/' ? 'index.html' : req.path);
  if (!/\bgzip\b/.test(req.headers['accept-encoding'] || '') && !file.endsWith('.html')) return next();
  if (!file.startsWith(PUBLIC + path.sep)) return next();
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return next();
    if (file.endsWith('.html')) { if (stuurPagina(req, res, file)) return; return next(); }
    const tag = `W/"${st.size.toString(16)}-${st.mtimeMs.toString(16)}-gz"`;
    let hit = gzipped.get(file);
    if (!hit || hit.tag !== tag) {
      try { hit = { tag, body: zlib.gzipSync(fs.readFileSync(file)) }; } catch { return next(); }
      gzipped.set(file, hit);
    }
    res.set({ 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding', ETag: tag, 'Cache-Control': cacheVoor(req) }).type(path.extname(file));
    if (req.headers['if-none-match'] === tag) return res.status(304).end();
    res.send(hit.body);
  });
});
// Altijd even navragen of een bestand veranderd is, zodat gsm's en Chromebooks na een update meteen de nieuwe versie hebben.
// Dezelfde opkuis van geplakte chatbot-antwoorden in de browser (verbetersleutel bij oefenbladen en toetsen).
app.get('/js/ai-json.js', (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, 'src', 'ai-json.js')); });
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html', setHeaders: res => res.setHeader('Cache-Control', cacheVoor(res.req)) }));

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
setInterval(() => { probeRoute(); noteerAdres(); }, 60000).unref();
// Even wachten: na het opstarten van Windows is de wifi soms nog niet verbonden.
setTimeout(noteerAdres, 3000).unref();

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

// Het hoofdadres van deze pc (wifi of kabel, geen hotspot of virtuele kaart), om wisselingen te zien.
function echteKaart() {
  return lanInterfaces().find(i => !VIRTUAL.test(i.name) && !/^192\.168\.(137|42|225)\.|^172\.20\.10\./.test(i.address));
}
// Kreeg deze pc van het schoolnetwerk een nieuw adres? Dan tonen we in de lobby één keer de tip voor een vast adres.
function noteerAdres() {
  const i = echteKaart();
  if (!i) return;
  const s = settings.read();
  const { adressen, vorig, nieuw } = vastAdres.volg(s.adressen, i.address);
  if (!nieuw) return;
  settings.write({ adressen, adresTip: vorig || '' });
  if (vorig && typeof io !== 'undefined') io.to('host').emit('adres-tip', { van: vorig, nu: i.address });
}
// Alles wat de leerkracht nodig heeft om ICT om een vast adres te vragen.
function netwerkInfo() {
  const i = echteKaart() || lanInterfaces()[0];
  const ip = i ? i.address : '';
  return { pc: os.hostname(), ip, kaart: i ? i.name : '', mac: i ? vastAdres.mac(i.mac) : '', eerder: vastAdres.eerder(settings.read().adressen, ip), poort: PORT };
}

// Adressen met QR-code voor het leerkrachtenscherm. Het eerste is het grote adres op het bord.
function sendAddresses(target) {
  const list = lanInterfaces();
  const preferred = settings.read().preferredAddress;
  const urls = list.map(i => `http://${i.address}:${PORT}`);
  // Junior heeft een eigen QR-code: die brengt de kinderen meteen op /junior.
  return Promise.all(urls.flatMap(url => [QRCode.toString(url, { type: 'svg', margin: 1 }), QRCode.toString(`${url}/junior`, { type: 'svg', margin: 1 })]))
    .then(qrs => target.emit('addresses', urls.map((url, k) => ({ url, qr: qrs[2 * k], jrQr: qrs[2 * k + 1], name: list[k].name, sure: list[k].address === preferred }))));
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

const SPELLEN_MET_WEG = [sterren, slang, raket, zwaard, wankel, plasma, tuimel, hooi, zwerm, banier, haak, kegel, kolk, titan, camelot, storm, pixel];

// Elke start van de server krijgt een eigen nummer. Een scherm dat al openstond en na een update (herstart) opnieuw
// verbindt, ziet een ander nummer en laadt zichzelf opnieuw: zo draait elk scherm meteen de nieuwe versie (ui.js).
io.on('connection', socket => {
  safeHandlers(socket);
  socket.emit('server-start', SERVER_START);
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
  // Een leerkrachtenscherm meldt of het in beeld staat en of er iemand op klikt of typt (ui.js): voor vanzelf bijwerken.
  // Een leerling (of de bureau-pc) kwam binnen of viel weg: ook dat telt als "net nog bezig" (een wifi-onderbreking is geen einde van de les).
  if (!isLocal(socket.handshake.address)) {
    laatsteVanBuiten = Date.now();
    socket.on('disconnect', () => { laatsteVanBuiten = Date.now(); });
  }
  // Instellingen > Bijwerken > "Nu herstarten": de klaargezette update meteen installeren. Zijn er leerlingen of loopt er
  // een spel, dan eerst vragen (ok: true betekent: de leerkracht zei al "toch herstarten").
  if (host) socket.on('update-nu', (ok, cb) => {
    if (typeof cb !== 'function') return;
    if (!bijwerken.view().klaar) return cb({ error: 'Er staat geen update klaar.' });
    if (ok !== true && lesBezig()) return cb({ vraag: true });
    cb({ ok: true });
    bijwerken.stopAuto();
    setTimeout(() => herstartVoorUpdate().catch(err => { console.error('Bijwerken mislukt:', err.message); process.exit(process.env.LANCELOT_KAN_HERSTARTEN ? 75 : 1); }), 300);
  });
  if (host) socket.on('in-gebruik', st => {
    socket.data.zichtbaar = !(st && st.zichtbaar === false);
    if (st && st.invoer) laatsteInvoer = Date.now();
  });
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
  // Bij het aanmelden: de ridder die op de pc bewaard is, met de runenkrans die je verdiende.
  socket.on('avatar-get', (name, cb) => {
    if (typeof cb !== 'function') return;
    const av = avatars.get(name);
    cb({ avatar: av, krans: runen.kransVan(name) });
  });
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
  // LANcelot Junior: de tablet van een kind (of twee). Wie ingelogd is, staat in socket.data.jr.
  socket.on('jr-get', (_, cb) => {
    if (typeof cb !== 'function') return;
    if (!juniorAan()) return cb({ stand: { actief: false }, kinderen: [], bezet: [] });
    cb({ stand: junior.stand(), kinderen: junior.kinderen().map(({ id, naam, team, dier, eigen, beeld, feest, maat }) => ({ id, naam, team, dier, eigen, beeld, feest, maat })), bezet: [...juniorBezet()] });
  });
  socket.on('jr-login', ({ ids } = {}, cb) => {
    const geldig = new Set(junior.kinderen().map(k => k.id));
    const lijst = (Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string' && geldig.has(id)).slice(0, 2);
    socket.data.jr = lijst;
    const namen = junior.kinderen().filter(k => lijst.includes(k.id)).map(k => k.naam);
    if (namen.length) hier(socket, namen.join(' & '), 'junior');
    else if (socket.data.waar === 'junior') { socket.data.naam = ''; socket.data.waar = ''; }
    juniorSoon();
    typeof cb === 'function' && cb({ ok: true });
  });
  socket.on('jr-antwoord', ({ id, vraag, juist, apart } = {}, cb) => {
    try {
      if (!(socket.data.jr || []).includes(id)) throw new Error('Tik op je dier.');
      const res = junior.antwoord(id, { vraag, juist, apart });
      if (res.avontuur) io.to('host').emit('jr-avontuur', res.avontuur);
      juniorSoon();
      typeof cb === 'function' && cb({ ok: true, ...res });
    } catch (err) {
      typeof cb === 'function' && cb({ error: err.message });
    }
  });
  // Mijn burcht (Junior): alleen voor een kind dat op deze tablet is aangemeld.
  socket.on('jr-burcht', ({ id } = {}, cb) => {
    if (typeof cb !== 'function') return;
    try {
      if (!(socket.data.jr || []).includes(id)) throw new Error('Tik op je dier.');
      cb({ ok: true, ...junior.burcht(id) });
    } catch (err) { cb({ error: err.message }); }
  });
  socket.on('jr-burcht-bouw', ({ id, plek, stuk } = {}, cb) => {
    if (typeof cb !== 'function') return;
    try {
      if (!(socket.data.jr || []).includes(id)) throw new Error('Tik op je dier.');
      cb({ ok: true, ...junior.burchtBouw(id, plek, stuk) });
    } catch (err) { cb({ error: err.message }); }
  });
  socket.on('jr-stickers', ({ id } = {}, cb) => typeof cb === 'function' && cb({ stickers: (socket.data.jr || []).includes(id) ? junior.stickers(id) : [] }));
  socket.on('jr-kring-kies', ({ id, keuze } = {}, cb) => {
    try {
      if (!(socket.data.jr || []).includes(id)) throw new Error('Tik op je dier.');
      io.emit('jr-kring', junior.kringKies(id, keuze));
      typeof cb === 'function' && cb({ ok: true });
    } catch (err) {
      typeof cb === 'function' && cb({ error: err.message });
    }
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
  // Mijn huisdier: kijken, een ei kiezen, naam/kleur/hoedje en verzorgen. Het Klaseiland toont het mee.
  socket.on('hd-get', (naam, cb) => {
    if (typeof cb !== 'function') return;
    hier(socket, naam, 'huisdier');
    try { cb({ ok: true, ...huisdieren.view(naam) }); } catch (err) { cb({ error: err.message }); }
  });
  socket.on('hd-teken', (naam, cb) => {
    if (typeof cb !== 'function') return;
    try { cb(huisdieren.tekenNaam(naam)); } catch { cb(null); }
  });
  for (const [event, fn] of [['hd-kies', huisdieren.kies], ['hd-stijl', huisdieren.stijl], ['hd-zorg', huisdieren.zorg]]) {
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
  for (const [event, fn, bord] of [['tk-mijn', taken.mijn], ['tk-open', taken.open], ['tk-antwoord', taken.antwoord, true], ['tk-inleveren', taken.inleveren, true], ['tk-quiz', taken.quizAntwoord, true], ['tk-toets', taken.toetsAntwoord, true], ['tk-verlaat', taken.verlaat, true], ['tk-terugin', taken.terugIn], ['tk-rest', taken.rest], ['tk-nogeens', taken.nogEens, true]]) {
    socket.on(event, (arg, cb) => {
      if (typeof cb !== 'function') return;
      if (event === 'tk-mijn') hier(socket, arg, 'taken');
      try {
        const r = fn(arg);
        cb({ ok: true, ...r });
        // Een leerling verliet een beveiligde toets: meteen een melding bij de leerkracht.
        if (event === 'tk-verlaat' && r && r.naam) io.to('host').emit('tk-alarm', { naam: r.naam, titel: r.titel, soort: r.soort, n: r.n });
        if (bord) takenSoon();
      } catch (err) {
        cb({ error: err.message });
      }
    });
  }
  // De Leescheck: is hij aan (voor de knop op het startscherm), de stand van een leerling en zijn antwoord van vandaag.
  socket.on('lz-aan', (_, cb) => typeof cb === 'function' && cb(lezen.staat().aan));
  socket.on('lz-get', (naam, cb) => {
    if (typeof cb !== 'function') return;
    try { cb({ ok: true, ...lezen.view(naam) }); } catch (err) { cb({ error: err.message }); }
  });
  socket.on('lz-bewaar', (arg, cb) => {
    if (typeof cb !== 'function') return;
    try {
      cb({ ok: true, ...lezen.bewaar(arg || {}) });
      io.to('host').emit('lz-nieuw');
    } catch (err) {
      cb({ error: err.message });
    }
  });
  socket.on('tk-aantal', (naam, cb) => {
    if (typeof cb !== 'function') return;
    if (socket.data.waar !== 'taken') hier(socket, naam, 'start');
    cb(taken.aantal(naam));
  });

  // De ontdekwereld: je stand, een raadsel openen, een poging, bouwen en je boeken (woordenboek en ontdekkersboek).
  for (const [event, fn, bord] of [['od-get', ontdek.view], ['od-open', ontdek.open], ['od-poging', ontdek.poging, true], ['od-bouw', ontdek.bouw, true], ['od-boek', ontdek.boek], ['od-vind', ontdek.vind, true], ['od-opdracht', ontdek.opdracht, true]]) {
    socket.on(event, (arg, cb) => {
      if (typeof cb !== 'function') return;
      // De leerkracht kijkt zelf rond (vanuit de beheerpagina): zijn naam wordt de vaste leerkrachtnaam.
      const lk = socket.data.host && socket.handshake.query.leerkracht === '1';
      const naamVan = a => (a && typeof a === 'object' ? a.naam : a);
      if (!lk && naamVan(arg) === ontdek.LK) return cb({ error: 'Kies eerst je naam.' });
      if (lk) arg = arg && typeof arg === 'object' ? { ...arg, naam: ontdek.LK } : ontdek.LK;
      if (event === 'od-get' && !lk) {
        hier(socket, arg, 'ontdek');
        ontdekSoon();
      }
      try {
        cb({ ok: true, ...fn(arg) });
        if (bord) ontdekSoon();
      } catch (err) {
        cb({ error: err.message });
      }
    });
  }

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
    socket.on('stem-standen', () => socket.emit('stem-standen', stem.standenView()));
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
    const tip = settings.read().adresTip;
    if (tip) socket.emit('adres-tip', { van: tip, nu: (echteKaart() || {}).address || '' });
    socket.on('adres-tip-weg', () => settings.write({ adresTip: '' }));
    socket.on('netwerk-info', (_, cb) => typeof cb === 'function' && cb(netwerkInfo()));
    // De knop QR-code op elk leerkrachtenscherm vraagt de adressen opnieuw (de pagina kan ze bij het verbinden gemist hebben).
    socket.on('adressen', () => sendAddresses(socket).catch(() => {}));
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
    socket.on('lesmap-boeken', (aan, cb) => {
      lesmap.zetBoeken(aan);
      io.to('host').emit('lesmap', lesmap.view());
      if (aan) syncSoon();
      if (typeof cb === 'function') cb(lesmap.view());
    });
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
    socket.on('open-results-folder', () => {
      fs.mkdirSync(results.DIR, { recursive: true });
      if (process.platform === 'win32') execFile('explorer', [store.echtPad(results.DIR)]);
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
    socket.emit('pf-state', proef.hostState());

    socket.on('pauze-zet', ({ aan, tekst } = {}) => pauze.zet(aan, tekst));
    socket.emit('storm-stand', vstorm.stand());
    socket.on('storm-start', (pad, cb) => { const res = vstorm.start(String(pad || '')); if (typeof cb === 'function') cb(res); });
    socket.on('storm-stop', () => vstorm.stop());
    socket.on('thema-zet', id => {
      if (!THEMAS.includes(id)) return;
      settings.write({ thema: id });
      io.emit('thema', id);
    });
    // De taal kiezen: elk scherm (ook bij de leerlingen) laadt zich dan opnieuw in de nieuwe taal.
    socket.on('taal-zet', id => {
      try { io.emit('taal', taal.zet(String(id || ''))); } catch { /* onbekende taal */ }
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
    // Instellingen > Voorlezen: de stem van LANcelot (dienst, sleutel, vrouw/man, grens per maand) en testen.
    socket.on('stem-get', handle(() => stem.view()));
    socket.on('stem-bewaar', handle(arg => {
      const v = stem.bewaar(arg || {});
      stemSoon(200);
      io.to('host').emit('stem-standen', stem.standenView());
      return v;
    }));
    socket.on('stem-wis-sleutel', handle(arg => stem.wisSleutel(arg && arg.dienst)));
    socket.on('stem-test', ({ taal } = {}, cb) => {
      if (typeof cb !== 'function') return;
      const tekst = require('./public/js/stem-kern').TESTZIN[taal] || require('./public/js/stem-kern').TESTZIN.nl;
      stem.maak(tekst, taal || 'nl', false).then(() => cb({ ok: true, url: `/api/stem?t=${encodeURIComponent(tekst)}&taal=${encodeURIComponent(taal || 'nl')}`, ...stem.view() }), err => cb({ error: err.message, ...stem.view() }));
    });
    const refreshList = () => sendLibrary('quiz');
    // Mijn klas: de klaslijst, de leerplandoelen en wat het logboek al weet.
    socket.on('klas-get', handle(() => ({ klas: klas.read(), vakgroepen: niveaus.VAKGROEPEN })));
    // LANcelot Junior voor de leerkracht: een spel starten en volgen, het klasdraakje, de dieren van de klas.
    socket.on('jr-lk-get', handle(() => ({ stand: junior.stand(), kinderen: junior.kinderen(), overzicht: junior.overzicht(juniorBezet()) })));
    socket.on('jr-start', handle(arg => {
      if (!juniorAan()) throw new Error('LANcelot Junior staat niet aan.');
      const st = junior.start(arg || {});
      io.emit('jr-stand', st);
      juniorSoon();
      return { stand: st };
    }));
    socket.on('jr-stop', () => {
      junior.stop();
      io.emit('jr-stand', junior.stand());
      juniorSoon();
    });
    socket.on('jr-team-goed', handle(({ team } = {}) => {
      const res = junior.teamGoed(team);
      io.to('host').emit('jr-draak', res.draak);
      return res;
    }));
    socket.on('jr-beloning', handle(({ n } = {}) => {
      const res = junior.klasBeloning(Math.min(10, Number(n) || 0));
      io.emit('jr-stand', junior.stand());
      return res;
    }));
    let bordTel = 0;
    socket.on('jr-kring-tel', handle(({ keuze } = {}) => {
      const k = junior.kringKies(`bord-${socket.id}-${bordTel++}`, keuze);
      io.emit('jr-kring', k);
      return {};
    }));
    socket.on('jr-kring-volgende', handle(({ stap } = {}) => {
      const k = junior.kringVolgende(stap);
      io.emit('jr-kring', k);
      return {};
    }));
    socket.on('jr-kring-stand', (_, cb) => typeof cb === 'function' && cb(junior.kringStand()));
    socket.on('jr-dier', handle(({ id } = {}) => {
      const lijst = junior.wisselDier(String(id || ''));
      juniorSoon();
      return { kinderen: lijst };
    }));
    // Opvolging per kind en per spel, en de eigen vragen (blok Maken).
    socket.on('jr-voortgang', handle(() => junior.voortgang()));
    socket.on('jr-sets', handle(() => ({ sets: junior.sets(), mappen: junior.mappen(), ai: !!settings.actief().key })));
    // De verkenner van de eigen reeksen: { actie: 'nieuw' | 'hernoem' | 'wis' | 'zet', naam, nieuw, id }.
    socket.on('jr-map', handle((arg = {}) => {
      const a = arg.actie;
      if (a === 'nieuw') junior.nieuweMap(arg.naam);
      else if (a === 'hernoem') junior.hernoemMap(arg.naam, arg.nieuw);
      else if (a === 'wis') junior.wisMap(arg.naam);
      else if (a === 'zet') junior.zetMap(String(arg.id || ''), arg.naam);
      else throw new Error('Onbekende actie.');
      const uit = { sets: junior.sets(), mappen: junior.mappen() };
      io.emit('jr-mappen', uit);
      return uit;
    }));
    socket.on('jr-set-bewaar', handle(set => {
      const lijst = junior.bewaarSet(set || {});
      io.emit('jr-sets', lijst);
      return { sets: lijst };
    }));
    socket.on('jr-set-wis', handle(({ id } = {}) => {
      const lijst = junior.wisSet(String(id || ''));
      io.emit('jr-sets', lijst);
      return { sets: lijst };
    }));
    socket.on('jr-set-prompt', handle((arg = {}) => ({ prompt: junior.eigenPrompt({ ...arg, taal: taal.huidig() }) })));
    socket.on('jr-set-lees', handle(text => ({ set: junior.leesEigen(aiJson.extract(text, 'vragenreeks', d => Array.isArray(d.vragen))) })));
    socket.on('jr-set-ai', (arg = {}, cb) => {
      if (typeof cb !== 'function') return;
      let prompt;
      try { prompt = junior.eigenPrompt({ ...arg, taal: taal.huidig() }); } catch (err) { return cb({ error: err.message }); }
      if (!settings.actief().key) return cb({ error: 'Er is nog geen AI-sleutel. Kopieer de prompt en plak het antwoord.' });
      generateQuiz(prompt, [], text => junior.leesEigen(aiJson.extract(text, 'vragenreeks', d => Array.isArray(d.vragen))))
        .then(set => cb({ set }))
        .catch(err => cb({ error: err.message }))
        .finally(() => io.to('host').emit('settings', settings.publicView()));
    });
    // Woorden van de week voor het raadsel van vandaag: zelf typen, de prompt kopiëren of met de AI-sleutel laten maken.
    socket.on('jr-woorden', handle(lijst => {
      const w = lijst == null ? junior.woorden() : junior.zetWoorden(lijst);
      if (lijst != null) io.emit('jr-stand', junior.stand());
      return { woorden: w };
    }));
    socket.on('jr-woorden-prompt', handle((arg = {}) => ({ prompt: junior.woordPrompt({ ...arg, taal: taal.huidig() }) })));
    socket.on('jr-woorden-lees', handle(text => ({ woorden: junior.leesWoorden(aiJson.extract(text, 'woordenlijst', d => Array.isArray(d.woorden))) })));
    socket.on('jr-woorden-ai', (arg = {}, cb) => {
      if (typeof cb !== 'function') return;
      let prompt;
      try { prompt = junior.woordPrompt({ ...arg, taal: taal.huidig() }); } catch (err) { return cb({ error: err.message }); }
      if (!settings.actief().key) return cb({ error: 'Er is nog geen AI-sleutel. Kopieer de prompt en plak het antwoord.' });
      generateQuiz(prompt, [], text => junior.leesWoorden(aiJson.extract(text, 'woordenlijst', d => Array.isArray(d.woorden))))
        .then(woorden => cb({ woorden }))
        .catch(err => cb({ error: err.message }))
        .finally(() => io.to('host').emit('settings', settings.publicView()));
    });
    // Echte foto's bij de eigen vragen: zoeken op Wikimedia Commons en één foto bewaren in de klasmap.
    socket.on('jr-foto-zoek', ({ woord } = {}, cb) => {
      if (typeof cb !== 'function') return;
      jrFoto.zoek(woord).then(fotos => cb({ fotos })).catch(err => cb({ error: err.message }));
    });
    socket.on('jr-stem-neem', handle(({ data, soort } = {}) => ({ s: jrFoto.stemBewaar(data, String(soort || '')) })));
    socket.on('jr-foto-neem', ({ thumb } = {}, cb) => {
      if (typeof cb !== 'function') return;
      jrFoto.neem(thumb).then(f => cb({ f })).catch(err => cb({ error: err.message }));
    });
    // Lukt het ophalen op de server niet (Wikimedia weigert soms), dan stuurt de browser de foto zelf door.
    socket.on('jr-foto-bewaar', handle(({ data, soort } = {}) => ({ f: jrFoto.bewaar(data, String(soort || '')) })));
    socket.on('jr-instellingen', handle(arg => {
      const inst = arg ? junior.zetInstellingen(arg) : junior.instellingen();
      if (arg) { io.emit('jr-stand', junior.stand()); juniorSoon(); }
      return { instellingen: inst };
    }));
    socket.on('jr-draaknaam', handle(({ naam } = {}) => {
      const d = junior.noemDraak(naam);
      io.to('host').emit('jr-draak', d);
      return { draak: d };
    }));
    // Het hol van het klasdraakje: samen iets kopen met de sterren van de klas, een hoedje opzetten.
    socket.on('jr-maat', handle(({ id, stap, minder } = {}) => {
      const lijst = junior.zetMaat(String(id || ''), { stap, minder });
      juniorSoon();
      return { kinderen: lijst };
    }));
    socket.on('jr-jarig', handle(({ id, datum } = {}) => {
      const lijst = junior.zetJarig(String(id || ''), String(datum || ''));
      juniorSoon();
      return { kinderen: lijst };
    }));
    socket.on('jr-hol-koop', handle(({ id } = {}) => {
      const d = junior.holKoop(id);
      io.to('host').emit('jr-draak', d);
      return { draak: d };
    }));
    socket.on('jr-eiland', handle(() => ({ eiland: junior.eiland() })));
    socket.on('jr-hol-zet', handle(({ id } = {}) => {
      const d = junior.holZet(id);
      io.to('host').emit('jr-draak', d);
      return { draak: d };
    }));
    // De Wapenkamer: de klastaken (Wachtlijst). Elke wijziging gaat naar alle leerkrachtenschermen.
    socket.on('wk-taken-get', handle(() => ({ data: klastaken.read() })));
    socket.on('wk-taken-zet', handle(arg => {
      const data = klastaken.write(arg || {});
      socket.to('host').emit('wk-taken', data);
      syncSoon();
      return { data };
    }));
    // De Klasindeling: het lokaal en de plaatsen. Ook naar de andere leerkrachtenschermen.
    socket.on('wk-indeling-get', handle(() => ({ data: klasindeling.read() })));
    socket.on('wk-indeling-zet', handle(arg => {
      const data = klasindeling.write(arg || {});
      socket.to('host').emit('wk-indeling', data);
      syncSoon();
      return { data };
    }));
    socket.on('klas-niveau', handle(({ id, niveau, vak } = {}) => {
      const data = klas.setNiveau(id, niveau, vak);
      syncSoon();
      return { klas: data };
    }));
    // Een hele kolom tegelijk, of "wie volgt dit vak niet bij mij" met vinkjes (verbeterpunten 20 nov, 8).
    socket.on('klas-niveaus', handle(({ lijst } = {}) => {
      if (!Array.isArray(lijst) || lijst.length > 500) throw new Error('Kies leerlingen.');
      const data = klas.setNiveaus(lijst.map(x => ({ id: String((x && x.id) || ''), niveau: String((x && x.niveau) || ''), vak: String((x && x.vak) || '') })));
      syncSoon();
      return { klas: data };
    }));
    // Eigen vakken: de lijst (ook verborgen) en de vakken uit je doelen om te koppelen.
    const vakkenView = () => ({ groepen: niveaus.alle(), doelVakken: [...new Set(doelen.all().map(d => d.vak).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl')) });
    socket.on('vakken-get', handle(() => vakkenView()));
    socket.on('vakken-zet', handle(({ groepen } = {}) => { niveaus.bewaar(groepen); syncSoon(); return vakkenView(); }));
    socket.on('vakken-nieuw', handle(({ naam } = {}) => { niveaus.nieuw(naam); syncSoon(); return vakkenView(); }));
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
    socket.on('jr-klas', handle(({ actie, namen, id, naam } = {}) => {
      if (actie === 'nieuw') klas.voegToe(namen);
      else if (actie === 'hernoem') klas.hernoem(String(id || ''), naam);
      else if (actie === 'wis') klas.wis(String(id || ''));
      else throw new Error('Onbekend.');
      io.emit('klas-namen', klas.names());
      juniorSoon();
      syncSoon();
      return { kinderen: junior.kinderen() };
    }));
    socket.on('klas-save', handle(data => {
      const saved = klas.write(data);
      io.emit('klas-namen', klas.names());
      io.to('host').emit('klassen', klas.klassen());
      juniorSoon();
      syncSoon();
      return { klas: saved };
    }));
    // Meerdere klassen op één toestel: de kiezer bovenaan Mijn klas en Onze klas (Junior).
    // Kiezen geldt voor heel LANcelot: het aanmelden, de spellen, het logboek, de taken, Junior...
    const naKlasWissel = () => {
      io.emit('klas-namen', klas.names());
      io.to('host').emit('klassen', klas.klassen());
      io.to('host').emit('klas-gewijzigd');
      io.emit('tk-nieuw');
      juniorSoon();
      syncSoon();
    };
    socket.on('klassen-get', handle(() => klas.klassen()));
    socket.on('klassen-kies', handle(({ id } = {}) => {
      const uit = klas.kiesKlas(id);
      naKlasWissel();
      return uit;
    }));
    socket.on('klassen-nieuw', handle(({ naam, leerjaar } = {}) => {
      const uit = klas.nieuweKlas({ naam, leerjaar });
      naKlasWissel();
      return uit;
    }));
    socket.on('klassen-naam', handle(({ naam } = {}) => {
      const k = klas.read();
      klas.write({ naam, leerjaar: k.leerjaar, namen: k.leerlingen.map(l => l.naam) });
      io.to('host').emit('klassen', klas.klassen());
      io.to('host').emit('klas-gewijzigd');
      syncSoon();
      return klas.klassen();
    }));
    socket.on('klassen-weg', handle(({ id } = {}) => {
      // De toetsen van die klas eerst vast in het toetsarchief.
      try { toetsarchief.heleKlas(String(id || '')); } catch (err) { console.error('Toetsarchief:', err.message); }
      const uit = klas.verwijderKlas(id);
      naKlasWissel();
      return uit;
    }));
    socket.on('doelen-get', handle(() => ({ doelen: doelen.all(), leerjaar: klas.read().leerjaar, leerjaren: doelen.leerjaren(), land: doelen.land() })));
    // Welke doelen: een land kiezen, eigen doelen plakken, of een prompt om ze door een AI te laten voorstellen.
    socket.on('doelen-keuze', handle(() => ({ ...doelen.keuze(), tekst: doelen.eigenTekst() })));
    socket.on('doelen-land', handle(({ land } = {}) => {
      const k = doelen.kiesLand(String(land || ''));
      io.emit('doelen-gewijzigd');
      return { ...k, tekst: doelen.eigenTekst() };
    }));
    socket.on('doelen-eigen', handle(({ tekst } = {}) => {
      const k = doelen.zetEigen(String(tekst || '').slice(0, 100000));
      io.emit('doelen-gewijzigd');
      return { ...k, tekst: doelen.eigenTekst() };
    }));
    socket.on('doelen-prompt', handle(arg => ({ prompt: doelen.aiPrompt(arg || {}) })));
    socket.on('logboek-get', handle(() => ({ logboek: logboek.summary() })));
    // De Opwarmer: herhaalvragen uit vorige lessen, gespeeld als Toernooi.
    socket.on('opwarmer-maak', handle(opts => opwarmer.make(opts || {})));
    socket.on('opwarmer-start', handle(quiz => {
      const busy = busyWith('toernooi');
      if (busy) throw busyError(busy);
      game.load(opwarmer.prepare(quiz));
      return {};
    }));
    // De eerste start: proefspel, drie stappen en startquizzen per leerjaar (src/eerstestart.js).
    eerstestart.host(socket, handle, sendLibrary);
    // Het startpakket 6e leerjaar: kant-en-klare quizzen en oefenbladen erbij zetten.
    socket.on('startpakket-status', handle(() => startpakket.status()));
    socket.on('startpakket-nee', handle(() => startpakket.nee()));
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
    // De Leescheck voor de leerkracht: aan of uit, eigen vragen, en het overzicht per leerling.
    socket.on('lz-overzicht', handle(opts => ({ overzicht: lezen.overzicht(opts || {}), staat: lezen.staat() })));
    socket.on('lz-zet', handle(arg => {
      const st = lezen.zet(arg || {});
      io.emit('lz-staat', st.aan);
      return { staat: st };
    }));
    // Taken geven: een oefenblad of quiz aan een of meer leerlingen, elk op zijn niveau.
    // Na elke wijziging krijgen alle leerlingschermen een seintje, zodat Mijn taken meteen klopt.
    const taak = fn => handle(arg => {
      const out = fn(arg || {});
      takenNaarBord();
      stemSoon();
      io.emit('tk-nieuw');
      solo.controleer();
      // Een nieuwe of gewiste taak gaat ook naar Mijn lesmap.
      syncSoon();
      return out || {};
    });
    socket.on('tk-bronnen', handle(() => ({ quizzen: quizzes.list(), bladen: oefenbladen.list(), toetsen: proeven.list(), klas: klas.names(), gast: klas.read().leerlingen.filter(l => l.gast).map(l => l.naam) })));
    socket.on('tk-lijst', handle(() => { socket.join(TAKEN_KIJKERS); return { taken: taken.lijst() }; }));
    // Mijn klas › Opvolgen: leerlingen × taken en toetsen.
    socket.on('pt-telt', handle(arg => { const r = punten.zet(arg || {}); takenNaarBord(); syncSoon(); return r; }));
    // Herkansing alleen als de leerkracht het zegt: koppelen of ontkoppelen ("Dit is geen herkansing").
    socket.on('pt-herk', handle(arg => { const r = punten.koppel(arg || {}); syncSoon(); return r; }));
    socket.on('tk-standaard', handle(() => takenstandaard.read()));
    socket.on('tk-standaard-zet', handle(d => { const r = takenstandaard.write(d || {}); io.to('host').emit('tk-standaard', r); syncSoon(); return r; }));
    socket.on('vandaag', handle(() => { socket.join(VANDAAG_KIJKERS); return vandaagData(); }));
    socket.on('tk-oud-zet', handle(aan => { const r = takenstandaard.zetOudeSluiten(aan); io.to('host').emit('tk-standaard', r); syncSoon(); return r; }));
    socket.on('vandaag-zet', handle(aan => { const r = takenstandaard.zetVandaag(aan); io.to('host').emit('tk-standaard', r); io.to(VANDAAG_KIJKERS).emit('vandaag', vandaagData()); syncSoon(); return r; }));
    socket.on('toestel-stand', handle(() => toestellen.stand(taken.standen(), lesmap.view(), taken.openIds().length)));
    socket.on('toestel-naam', handle(n => { const r = toestellen.zetNaam(n); syncSoon(); return r; }));
    socket.on('op-overzicht', handle(() => { socket.join(TAKEN_KIJKERS); return opvolgen.overzicht(); }));
    socket.on('tk-voorbeeld', handle(arg => taken.voorbeeld(arg || {})));
    socket.on('tk-les', handle(arg => ({ les: taken.lesVan(arg), start: zonnewijzer.lesStart(arg || {}) })));
    socket.on('tk-detail', handle(arg => taken.detail(arg || {})));
    socket.on('tk-inhoud', handle(arg => taken.inhoud(arg || {})));
    socket.on('tk-maak', taak(arg => {
      const t = taken.maak(arg);
      if (t.soort === 'proef') sendLibrary('proef', null, true);
      // Via "↻ Herkansing geven" (Opvolgen › Punten): deze taak is een herkansing van die kolom.
      if (t.soort === 'proef' && arg.herkansing) try { punten.koppel({ kolom: t.id, van: String(arg.herkansing) }); } catch {}
      return { id: t.id };
    }));
    // Herkansing met één klik (wens 25 nov, punt 6): eerst tonen wie, dan een kopie van de toets als taak voor hen.
    socket.on('hk-voorstel', handle(arg => require('./src/herkansing').voorstel(arg || {})));
    socket.on('hk-geef', taak(arg => { const r = require('./src/herkansing').geef(arg || {}); sendLibrary('proef', null, true); return r; }));
    // Remediëring na een toets (wens 25 nov, punt 4): eerst tonen wie wat krijgt, dan per leerling een oefenblad als taak.
    socket.on('rm-voorstel', handle(arg => { const r = require('./src/remediering'); const a = arg || {}; return r.samenvatting(r.voorstel(r.afnameVan(a), { grens: Number(a.grens) || 0.5 })); }));
    socket.on('rm-maak', taak(arg => { const r = require('./src/remediering'); const a = arg || {}; const out = r.maak(r.afnameVan(a), { grens: Number(a.grens) || 0.5 }); sendLibrary('oefenblad'); return out; }));
    socket.on('bg-data', handle(arg => require('./src/bingel').data(arg || {})));
    // Weekrapport: de feedback van de leerkracht bewaren, en een pdf per leerling in Mijn lesmap.
    socket.on('wr-opmerking', handle(arg => require('./src/weekrapport').zetOpmerking(arg || {})));
    socket.on('wr-lesmap', (arg, cb) => {
      if (typeof cb !== 'function') return;
      const a = arg || {};
      require('./src/weekrapport').naarLesmap({ van: a.van, tot: a.tot, url: (naam, van, tot) => `http://127.0.0.1:${PORT}/weekrapport?pdf=1&van=${van}&tot=${tot}&naam=${encodeURIComponent(naam)}` })
        .then(r => { cb({ ok: true, ...r }); if (r.gemaakt) syncSoon(); }).catch(err => cb({ error: err.message }));
    });
    socket.on('tk-toevoegen', taak(arg => ({ n: taken.voegToe(arg) })));
    socket.on('tk-weg', taak(taken.haalWeg));
    socket.on('tk-niveau', taak(taken.zetNiveau));
    socket.on('tk-sluit', taak(arg => taken.sluit(arg.id)));
    socket.on('tk-opruimen', taak(arg => taken.ruimOp(arg)));
    socket.on('tk-start', taak(taken.startNu));
    socket.on('tk-heropen', taak(taken.heropen));
    // Voorlezen aan of uit voor één leerling bij een toets als taak: zijn scherm past zich meteen aan.
    socket.on('tk-voorlees', handle(arg => {
      const r = taken.zetVoorlees(arg || {});
      io.emit('tk-voorlees', { id: arg.id, naam: r.naam, aan: r.aan });
      takenNaarBord();
      return r;
    }));
    socket.on('tk-afwezig', taak(taken.zetAfwezig));
    // Een toets als taak beveiligen (volledig scherm, wegklikken gemeld), ook terwijl leerlingen werken.
    // Keuzes van een gegeven taak achteraf veranderen (voorlezen, punten tonen, volgorde, verbeteren).
    socket.on('tk-keuzes', taak(arg => {
      const r = taken.zetKeuzes(arg);
      io.emit('tk-keuzes', { id: r.id });
      return r;
    }));
    socket.on('tk-keuzes-get', handle(arg => taken.keuzesVoor((arg || {}).id)));
    // Een andere tijdslimiet voor één leerling (bv. meer tijd voor een zorgleerling), ook terwijl hij werkt.
    socket.on('tk-tijd', taak(arg => {
      const r = taken.zetTijd(arg);
      io.emit('tk-keuzes', { id: r.id });
      return r;
    }));
    socket.on('tk-beveiligd', handle(arg => {
      const r = taken.zetBeveiligd(arg || {});
      io.emit('tk-beveiligd', r);
      takenNaarBord();
      return r;
    }));
    socket.on('tk-wis', taak(arg => taken.wis(arg.id)));
    // Instellingen › Connector: aan of uit, alleen lezen, sleutels maken en intrekken, de tunnel en het logboek.
    const cnView = () => connector.view(lanAddresses()[0] ? `http://${lanAddresses()[0]}:${PORT}` : '');
    socket.on('cn-view', handle(() => cnView()));
    socket.on('cn-zet', handle(arg => { connector.zet(arg || {}); return cnView(); }));
    socket.on('cn-sleutel', handle(arg => ({ ...connector.maakSleutel((arg || {}).naam), ...cnView() })));
    socket.on('cn-intrek', handle(arg => { connector.trekIn((arg || {}).id); return cnView(); }));
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
      if (process.platform === 'win32') execFile('explorer', [store.echtPad(logboek.DIR)]);
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
    socket.on('save', handle(({ quiz, file, folder } = {}) => {
      const saved = quizzes.save(quiz, file);
      plaatsIn('quiz', saved, folder);
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
    // De ontdekwereld: open of dicht, wie wat oploste, en eigen weetjes en woorden (met AI of uit een chatbot).
    socket.on('od-bord', handle(() => ({ bord: ontdek.bord(ontdekBinnen()), eigen: ontdek.eigenView(), leerjaar: klas.read().leerjaar })));
    socket.on('od-toegang', handle(toegang => {
      const res = ontdek.zetToegang(toegang);
      io.emit('od-toegang', res.toegang);
      ontdekSoon();
      return res;
    }));
    socket.on('od-woorden', handle(text => ({ eigen: ontdek.zetWoorden(text) })));
    socket.on('od-weetje-wis', handle(i => ({ eigen: ontdek.wisWeetje(i) })));
    socket.on('od-wis-alles', handle(() => ({ eigen: ontdek.wisAlles() })));
    socket.on('od-prompt', handle(({ leerjaar, onderwerp } = {}) => ({ prompt: ontdek.aiPrompt(leerjaar, onderwerp) })));
    socket.on('od-plak', handle(arg => ({ eigen: ontdek.plak(arg, aiJson) })));
    socket.on('od-ai', (arg, cb) => {
      ontdek.aiMaak(arg, ai, aiJson)
        .then(eigen => cb && cb({ ok: true, eigen }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });
    socket.on('rn-onthul', handle(() => runen.onthul()));
    // In Beeld: kaarten ophalen, aanbrengen op het bord, woorden van de week, een quiz en Junior (src/inbeeld.js).
    const ib = fn => handle(arg => {
      if (!inbeeld.aan()) throw new Error('In Beeld staat niet in deze versie.');
      return fn(arg || {});
    });
    const ibAsync = fn => (arg, cb) => {
      if (!inbeeld.aan()) return cb && cb({ error: 'In Beeld staat niet in deze versie.' });
      fn(arg || {}).then(r => cb && cb({ ok: true, ...r }), err => cb && cb({ error: err.message }));
    };
    socket.on('ib-view', ib(() => ({ view: inbeeld.view() })));
    socket.on('ib-online', ibAsync(() => inbeeld.online()));
    socket.on('ib-haal', ibAsync(async ({ id }) => {
      const r = await inbeeld.haalSet(String(id || ''));
      syncSoon();
      return { ...r, view: inbeeld.view() };
    }));
    socket.on('ib-wis-set', ib(({ id }) => { inbeeld.wisSet(String(id || '')); syncSoon(); return { view: inbeeld.view() }; }));
    socket.on('ib-week', ib(({ nrs }) => { const week = inbeeld.zetWeek(nrs); syncSoon(); return { week }; }));
    socket.on('ib-melden', ib(({ aan }) => { inbeeld.zetMelden(aan); return { view: inbeeld.view() }; }));
    socket.on('ib-aangebracht', ib(({ nr, leerjaar }) => ({ aangebracht: inbeeld.aangebracht(nr, leerjaar) })));
    socket.on('ib-runen', ib(({ nrs }) => {
      const r = inbeeld.naarRunen(nrs, runen);
      io.to('host').emit('rn-bord', runen.bord());
      syncSoon();
      return r;
    }));
    socket.on('ib-quiz', ib(({ nrs, titel, leerjaar }) => {
      const quiz = inbeeld.maakQuiz(nrs, titel, Math.random, leerjaar);
      const file = quizzes.save(quiz);
      try {
        if (!quizzes.lib.folders().includes('In Beeld')) quizzes.lib.addFolder('In Beeld');
        quizzes.lib.move(file, 'In Beeld');
      } catch {}
      sendLibrary('quiz');
      return { file, title: quiz.title, aantal: quiz.questions.length };
    }));
    socket.on('ib-jr-woorden', ib(({ nrs }) => {
      const woorden = inbeeld.naarJuniorWoorden(nrs, junior);
      io.emit('jr-stand', junior.stand());
      return { woorden };
    }));
    socket.on('ib-jr-reeks', ib(({ nrs }) => {
      const lijst = inbeeld.naarJuniorReeks(nrs, junior, jrFoto, path.join(__dirname, 'public'));
      io.emit('jr-sets', lijst);
      return { aantal: lijst.length };
    }));
    socket.on('rn-lijst-get', handle(() => ({ lijst: runen.lijstView(), kaarten: inbeeld.weekKaarten().map(k => k.woord), prompt: runen.chatPrompt(), doelen: doelen.all().filter(d => d.vak === 'Nederlands' && doelen.inJaar(d, klas.read().leerjaar)) })));
    socket.on('rn-lijst-save', handle(arg => {
      const lijst = runen.bewaarLijst(arg || {});
      io.to('host').emit('rn-bord', runen.bord());
      syncSoon();
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
    // Een sessie die nergens bewaard is, zoals het exit-ticket van een les uit De Zonnewijzer.
    socket.on('rt-direct', handle(session => {
      const busy = busyWith('rondetafel');
      if (busy) throw busyError(busy);
      rt.load(rondetafel.validate(session));
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

    // Doolhofridder
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

    // Drakenjacht
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

    // Kruitridder
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

    // Schaduwburcht en Ridder-Royale
    gauntlet.attachHost(socket, handle, busyWith, busyError, quizzes);
    royale.attachHost(socket, handle, busyWith, busyError, quizzes);
    sterren.attachHost(socket, handle, busyWith, busyError, quizzes);
    slang.attachHost(socket, handle, busyWith, busyError, quizzes);
    poort.attachHost(socket, handle, busyWith, busyError, quizzes);
    vlucht.attachHost(socket, handle, busyWith, busyError, quizzes);
    diep.attachHost(socket, handle, busyWith, busyError, quizzes);
    raket.attachHost(socket, handle, busyWith, busyError, quizzes);
    zwaard.attachHost(socket, handle, busyWith, busyError, quizzes);
    wankel.attachHost(socket, handle, busyWith, busyError, quizzes);
    plasma.attachHost(socket, handle, busyWith, busyError, quizzes);
    tuimel.attachHost(socket, handle, busyWith, busyError, quizzes);
    hooi.attachHost(socket, handle, busyWith, busyError, quizzes);
    zwerm.attachHost(socket, handle, busyWith, busyError, quizzes);
    banier.attachHost(socket, handle, busyWith, busyError, quizzes);
    haak.attachHost(socket, handle, busyWith, busyError, quizzes);
    kegel.attachHost(socket, handle, busyWith, busyError, quizzes);
    kolk.attachHost(socket, handle, busyWith, busyError, quizzes);
    camelot.attachHost(socket, handle, busyWith, busyError, quizzes);
    titan.attachHost(socket, handle, busyWith, busyError, quizzes);
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
    socket.on('ob-save', handle(({ sheet, file, folder } = {}) => {
      const saved = oefenbladen.save(sheet, file);
      plaatsIn('oefenblad', saved, folder);
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
    socket.on('zw-get', handle(({ week } = {}) => ({ ...zonnewijzer.roosters(), mijnLessen: zonnewijzer.mijnLessen(), weekData: zonnewijzer.week(week), vandaag: zonnewijzer.weekVan(new Date()) })));
    socket.on('zw-roosters', zwWijzig(arg => zonnewijzer.bewaarRoosters(arg)));
    socket.on('zw-vul', zwWijzig(arg => ({ weekData: zonnewijzer.vul(arg) })));
    socket.on('zw-roosters-import', zwWijzig(arg => zonnewijzer.importeerRoosters(arg)));
    socket.on('zw-les', zwWijzig(arg => ({ weekData: zonnewijzer.zetLes(arg) })));
    socket.on('zw-week-rooster', zwWijzig(arg => ({ weekData: zonnewijzer.zetWeekRooster(arg) })));
    socket.on('zw-vink', zwWijzig(arg => ({ weekData: zonnewijzer.vink(arg) })));
    socket.on('zw-schuif', zwWijzig(arg => ({ weekData: zonnewijzer.schuif(arg) })));
    socket.on('zw-dagen', zwWijzig(arg => ({ weekData: zonnewijzer.zetDagen(arg) })));
    socket.on('zw-vrij', zwWijzig(arg => ({ weekData: zonnewijzer.zetVrij(arg) })));
    socket.on('zw-laatste', handle(arg => zonnewijzer.laatsteVan(arg)));
    socket.on('zw-doelen', handle(({ codes } = {}) => zonnewijzer.doelInfo(codes)));
    // De doelen van een les uit zijn quiz: de codes die het vaakst voorkomen (Ridder-vragen niet, dat is de uitdaging).
    socket.on('zw-mijn-les', zwWijzig(arg => zonnewijzer.bewaarMijnLes(arg)));
    socket.on('zw-mijn-les-weg', zwWijzig(({ id } = {}) => zonnewijzer.verwijderMijnLes(String(id || ''))));
    // Help me invullen: met een AI-sleutel slim, anders (of als de AI faalt) het ingebouwde voorstel.
    socket.on('zw-voorstel', (arg = {}, cb) => {
      if (typeof cb !== 'function') return;
      let basis;
      try { basis = zonnewijzer.ingebouwdVoorstel(arg); } catch (err) { return cb({ error: err.message }); }
      if (arg.zonderAi || !settings.actief().key) return cb({ ok: true, ...basis, bron: 'ingebouwd' });
      const prompt = zonnewijzer.voorstelPrompt({ ...arg, leerjaar: `${klas.read().leerjaar}e leerjaar` });
      generateQuiz(prompt, [], text => zonnewijzer.leesVoorstel(aiJson.extract(text, 'voorstel')))
        .then(res => cb({ ok: true, ...res, bron: 'ai' }))
        .catch(err => cb({ ok: true, ...basis, bron: 'ingebouwd', fout: err.message }))
        .finally(() => io.to('host').emit('settings', settings.publicView()));
    });
    // Zonder sleutel (of liever zelf): de prompt voor een chatbot, en het geplakte antwoord terug inlezen.
    socket.on('zw-voorstel-prompt', handle((arg = {}) => {
      zonnewijzer.ingebouwdVoorstel(arg);
      return { prompt: zonnewijzer.voorstelPrompt({ ...arg, leerjaar: `${klas.read().leerjaar}e leerjaar` }) };
    }));
    socket.on('zw-voorstel-lees', handle(text => zonnewijzer.leesVoorstel(aiJson.extract(text, 'voorstel'))));
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
      stemSoon(500);
      return {};
    }));
    socket.on('ob-reveal', () => oefenblad.reveal());
    socket.on('ob-kick', id => oefenblad.kick(id));
    socket.on('ob-finish', () => oefenblad.finish());
    socket.on('ob-reopen', (id, cb) => { const res = oefenblad.reopen(id); if (typeof cb === 'function') cb(res); });
    socket.on('ob-detail', (id, cb) => cb && cb(oefenblad.detail(id)));
    socket.on('ob-set-niveau', ({ id, niveau } = {}, cb) => { const res = oefenblad.setNiveau(id, niveau); if (typeof cb === 'function') cb(res); });
    socket.on('ob-stop', (_, cb) => cb && cb({ file: oefenblad.stop() }));

    // De Proef: toetsen maken (zelf of met AI), afnemen en verbeteren.
    const refreshProeven = () => sendLibrary('proef');
    socket.on('pf-parse', handle(text => ({ toets: proeven.parseAiText(text) })));
    socket.on('pf-open', handle(file => ({ toets: proeven.load(file) })));
    socket.on('pf-save', handle(({ toets, file, folder } = {}) => {
      const saved = proeven.save(toets, file);
      plaatsIn('proef', saved, folder);
      refreshProeven();
      return { file: saved };
    }));
    socket.on('pf-delete', handle(file => {
      proeven.remove(file);
      refreshProeven();
      return {};
    }));
    // Maken of bijsturen met de eigen AI-sleutel. Bij bijsturen gaat de hele toets mee, dus een langere prompt.
    socket.on('pf-generate', ({ prompt, files, lang } = {}, cb) => {
      generateQuiz(prompt, files || [], proeven.parseAiText, { max: lang ? 120000 : 30000 })
        .then(toets => cb && cb({ ok: true, toets }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });
    // De verbetersleutel voor de vakjes op een blad uit de pdf: de AI krijgt de bladen met genummerde kaders.
    socket.on('pf-sleutel', ({ prompt, files } = {}, cb) => {
      generateQuiz(prompt, files || [], proeven.parseSleutel, { max: 30000 })
        .then(velden => cb && cb({ ok: true, velden }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });
    // Grondig nakijken in de editor (wens 25 nov, punt 3): beelden, andere goede schrijfwijzen, de 6- en 6+-versie.
    socket.on('pf-controle', handle(({ toets, file } = {}) => {
      const t = proeven.K.validate(toets);
      const f = file && proeven.list().some(x => x.file === file) ? file : null;
      return { bevindingen: require('./src/toetscontrole').controleer({ file: f, toets: t, taken: taken.lijst() }), versies: f ? require('./src/toetscontrole').andereVersies(f, proeven.list()) : [] };
    }));
    socket.on('pf-load', handle(({ file, inst } = {}) => {
      const busy = busyWith('proef');
      if (busy) throw busyError(busy);
      proef.load(proeven.load(file), file, inst);
      stemSoon(500);
      return {};
    }));
    socket.emit('pf-toets', proef.hostToets());
    socket.on('pf-toets', (_, cb) => typeof cb === 'function' && cb(proef.hostToets()));
    socket.on('pf-kick', id => proef.kick(id));
    socket.on('pf-finish', () => proef.finish());
    socket.on('pf-stop', (_, cb) => cb && cb({ afname: proef.stop() }));
    const pfHost = fn => (arg, cb) => { const res = fn(arg || {}); if (typeof cb === 'function') cb(res || { ok: true }); };
    socket.on('pf-vrij', pfHost(({ id }) => proef.vrijgeven(id)));
    socket.on('pf-extra', pfHost(({ id, minuten }) => proef.extraTijd(id, minuten)));
    socket.on('pf-heropen', pfHost(({ id, opnieuw }) => proef.heropen(id, opnieuw === true)));
    socket.on('pf-detail', pfHost(({ id }) => proef.detail(id)));
    socket.on('pf-zet-niveau', pfHost(({ id, niveau }) => proef.setNiveau(id, niveau)));
    socket.on('pf-uitslag', pfHost(({ aan }) => proef.toonUitslag(aan)));
    // Afnames: verder verbeteren na de les (open vragen, op papier, de werkwijze), dan klaar: Excel en logboek.
    socket.emit('pf-afnames', afnameLijst());
    socket.on('pf-afnames', (_, cb) => typeof cb === 'function' && cb(afnameLijst()));
    socket.on('pf-afname', handle(file => {
      const afname = proeven.laadAfname(file);
      // Het Excel-bestand van een andere pc staat hier niet: dan geen link die nergens naartoe gaat.
      if (afname.resultaten) try { if (!fs.existsSync(results.filePath(afname.resultaten))) delete afname.resultaten; } catch { delete afname.resultaten; }
      return { afname, leerlingen: afname.taak ? taken.toetsLeerlingen(afname.taak) : null };
    }));
    socket.on('pf-afname-leerlingen', handle(taak => ({ leerlingen: typeof taak === 'string' ? taken.toetsLeerlingen(taak) : null })));
    socket.on('pf-cijfer', handle(arg => ({ stand: proeven.cijfer(arg) })));
    socket.on('pf-klaar', handle(file => {
      const rec = proeven.klaar(file, results.saveProef);
      sendLibrary('resultaat');
      vandaagSoon(); io.to('host').emit('pf-afnames', afnameLijst());
      return { resultaten: rec.resultaten, ...naKlaar(file, rec) };
    }));
    // Het toetsarchief: aan of uit, elke maand, de map, nu archiveren, openen, een schooljaar als zip.
    socket.on('archief-view', (_, cb) => typeof cb === 'function' && cb(toetsarchief.view()));
    socket.on('archief-zet', handle(arg => {
      const v = toetsarchief.zet(arg || {});
      io.to('host').emit('archief', v);
      if (v.aan) archiefRonde();
      return v;
    }));
    socket.on('archief-nu', (_, cb) => {
      io.to('host').emit('archief', { ...toetsarchief.view(), bezig: true });
      toetsarchief.ronde({ alles: true }).then(r => {
        const v = toetsarchief.view();
        io.to('host').emit('archief', v);
        if (typeof cb === 'function') cb({ ...r, ...v, fout: r.fout || v.fout });
      }, err => typeof cb === 'function' && cb({ error: err.message }));
    });
    socket.on('archief-open', () => {
      const dir = toetsarchief.map();
      try { fs.mkdirSync(dir, { recursive: true }); } catch {}
      if (process.platform === 'win32') execFile('explorer', [store.echtPad(dir)]);
    });
    socket.on('archief-kies', (_, cb) => {
      if (scherm) return cb && cb({ error: 'Dat venster zou op het digibord openen. Typ het pad van de map hieronder.' });
      if (process.platform !== 'win32') return cb && cb({ error: 'Typ het pad van de map hieronder.' });
      const ps = 'Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; '
        + '$d.Description = \'Kies de map voor je toetsarchief\'; $d.ShowNewFolderButton = $true; '
        + '$w = New-Object System.Windows.Forms.Form -Property @{TopMost=$true}; '
        + 'if ($d.ShowDialog($w) -eq \'OK\') { [Console]::OutputEncoding = [Text.Encoding]::UTF8; $d.SelectedPath }';
      execFile('powershell', ['-NoProfile', '-STA', '-Command', ps], { windowsHide: true }, (err, out) => {
        cb && cb(err ? { error: 'Het venster om een map te kiezen opende niet. Typ het pad hieronder.' } : { path: String(out).trim() });
      });
    });
    // Toetsen mailen: afzender (eigen mailbox) en een adres per leerling.
    socket.on('pf-mail-view', (_, cb) => typeof cb === 'function' && cb(toetsmail.view()));
    socket.on('pf-mail-afzender', handle(arg => {
      const v = toetsmail.zetAfzender(arg || {});
      // Toetsen die klaar waren terwijl het wachtwoord hier nog ontbrak: nu alsnog mailen (elke leerling maar één keer).
      return { ...v, wachtend: v.klaar ? wachtendeMails() : 0 };
    }));
    socket.on('pf-mail-adres', handle(arg => toetsmail.zetAdres(arg && arg.naam, arg && arg.adres)));
    socket.on('pf-mail-leerling', handle(arg => toetsmail.zetLeerling(arg && arg.naam, arg || {})));
    socket.on('pf-mail-test', (_, cb) => { toetsmail.test().then(() => cb && cb({ ok: true }), err => cb && cb({ error: err.message })); });
    // Een kopie per leerling in Mijn lesmap: aan of uit zetten, of nu (opnieuw) maken.
    socket.on('pf-kopie-view', (_, cb) => typeof cb === 'function' && cb(toetskopie.view()));
    socket.on('pf-kopie-zet', handle(aan => toetskopie.zet(aan)));
    socket.on('pf-kopie-nu', handle(file => { proeven.laadAfname(file); toetsKopieen(file); return { ok: true }; }));
    socket.on('pf-afname-weg', handle(file => {
      // Eerst vast in het toetsarchief: wat je hier verwijdert, blijft daar staan.
      toetsarchief.voorWeg(file);
      proeven.verwijderAfname(file);
      vandaagSoon(); io.to('host').emit('pf-afnames', afnameLijst());
      return {};
    }));

    // De Zegelrol: rapporten. De toetsen van De Proef komen er vanzelf in; alles blijft op deze pc (niet naar de lesmap).
    const zrWijzig = fn => handle(arg => {
      const res = fn(arg || {});
      socket.broadcast.to('host').emit('zr-gewijzigd');
      return res;
    });
    socket.on('zr-lijst', handle(() => ({ lijst: zegelrol.lijst(), opmaak: zegelrol.opmaak() })));
    socket.on('zr-laad', handle(({ id } = {}) => ({ ...zegelrol.laad(String(id || '')), opmaak: zegelrol.opmaak() })));
    socket.on('zr-nieuw', zrWijzig(arg => zegelrol.nieuw(arg)));
    socket.on('zr-bewaar', zrWijzig(arg => zegelrol.bewaar(arg)));
    socket.on('zr-weg', zrWijzig(({ id }) => { zegelrol.verwijder(String(id || '')); return {}; }));
    socket.on('zr-opmaak', zrWijzig(arg => ({ opmaak: zegelrol.bewaarOpmaak(arg) })));
    // Commentaar voorstellen: met een AI-sleutel meteen, anders een prompt voor een chatbot. Zonder naam van de leerling.
    socket.on('zr-commentaar', (arg = {}, cb) => {
      if (typeof cb !== 'function') return;
      const prompt = zegelrol.commentaarPrompt({ ...arg, leerjaar: `${klas.read().leerjaar}e leerjaar` });
      if (!settings.actief().key) return cb({ ok: true, prompt });
      generateQuiz(prompt, [], text => zegelrol.leesCommentaar(aiJson.extract(text, 'commentaar')))
        .then(res => cb({ ok: true, ...res }))
        .catch(err => cb({ ok: true, prompt, fout: err.message }))
        .finally(() => io.to('host').emit('settings', settings.publicView()));
    });
    socket.on('zr-commentaar-lees', handle(text => zegelrol.leesCommentaar(aiJson.extract(text, 'commentaar'))));

    // De Postduif: een brief voor thuis per leerling (toetsen, doelen, Eer, klasnieuws). Blijft op deze pc.
    const pdWijzig = fn => handle(arg => {
      const res = fn(arg || {});
      socket.broadcast.to('host').emit('pd-gewijzigd');
      return res;
    });
    socket.on('pd-lijst', handle(() => ({ lijst: postduif.lijst() })));
    socket.on('pd-laad', handle(({ id } = {}) => postduif.laad(String(id || ''))));
    socket.on('pd-nieuw', pdWijzig(arg => postduif.nieuw(arg)));
    socket.on('pd-bewaar', pdWijzig(arg => postduif.bewaar(arg)));
    socket.on('pd-weg', pdWijzig(({ id }) => { postduif.verwijder(String(id || '')); return {}; }));

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
    // De knop "Namen" op elk leerkrachtenscherm: wie is er binnen en waar, ook tijdens het spel een verkeerde naam wegklikken.
    socket.on('namen-lijst', (pad, cb) => {
      if (typeof cb !== 'function') return;
      const spel = SPELLEN[pad];
      cb({ actief: !!(spel && spel.players instanceof Map && spel.phase !== 'idle'), storm: vstorm.kan(pad), ...namenOveral() });
    });
    socket.on('namen-weg', ({ pad, id, sock } = {}) => {
      const spel = SPELLEN[pad];
      if (spel && typeof id === 'string') return spel.kick(id);
      // Buiten een spel: dat toestel vergeet de naam en vraagt opnieuw wie je bent.
      const s = typeof sock === 'string' && io.sockets.sockets.get(sock);
      if (s && !s.data.host) {
        s.data.naam = null;
        s.emit('naam-weg');
        if (s.data.jr && s.data.jr.length) { s.data.jr = []; s.emit('jr-weg'); juniorSoon(); }
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

  // Vragenstorm (src/vragenstorm.js): de vragen van de leerling, langs het spel waarin hij zit.
  socket.on('storm-vraag', (_, cb) => typeof cb === 'function' && cb(vstorm.vraag(socket)));
  socket.on('storm-antwoord', (choice, cb) => typeof cb === 'function' && cb(vstorm.antwoord(socket, choice)));

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

  // Doolhofridder
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
  socket.on('pk-dir', pk((id, dir) => (dir && typeof dir === 'object' ? knight.steer(id, Number(dir.d), 'x' in dir ? { x: Number(dir.x), y: Number(dir.y) } : false) : knight.steer(id, Number(dir)))));
  socket.on('pk-power', pk(id => knight.power(id)));
  socket.on('pk-asking', pk((id, on) => knight.asking(id, on)));
  socket.on('pk-question', pk(id => guarded.knight.question(id)));
  socket.on('pk-answer', pk((id, choice) => guarded.knight.answer(id, choice)));

  // Drakenjacht
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

  // Kruitridder
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
  // Schaduwburcht en Ridder-Royale
  gauntlet.attachPlayer(socket, validId, guarded.gauntlet);
  royale.attachPlayer(socket, validId, guarded.royale);
  sterren.attachPlayer(socket, validId, guarded.sterren);
  slang.attachPlayer(socket, validId, guarded.slang);
  poort.attachPlayer(socket, validId, guarded.poort);
  vlucht.attachPlayer(socket, validId, guarded.vlucht);
  diep.attachPlayer(socket, validId, guarded.diep);
  raket.attachPlayer(socket, validId, guarded.raket);
  zwaard.attachPlayer(socket, validId, guarded.zwaard);
  wankel.attachPlayer(socket, validId, guarded.wankel);
  plasma.attachPlayer(socket, validId, guarded.plasma);
  tuimel.attachPlayer(socket, validId, guarded.tuimel);
  hooi.attachPlayer(socket, validId, guarded.hooi);
  zwerm.attachPlayer(socket, validId, guarded.zwerm);
  banier.attachPlayer(socket, validId, guarded.banier);
  haak.attachPlayer(socket, validId, guarded.haak);
  kegel.attachPlayer(socket, validId, guarded.kegel);
  kolk.attachPlayer(socket, validId, guarded.kolk);
  camelot.attachPlayer(socket, validId, guarded.camelot);
  titan.attachPlayer(socket, validId, guarded.titan);
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

  // De Proef (een toets)
  socket.emit('pf-state', proef.base());
  socket.on('pf-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = proef.join(playerId, name, socket.id);
    socket.data.pfId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) proef.sendPlayer(playerId);
  });
  const pf = fn => (arg, cb) => {
    const out = socket.data.pfId ? fn(socket.data.pfId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('pf-start', pf(id => proef.start(id)));
  socket.on('pf-answer', pf((id, a) => proef.answer(id, a)));
  socket.on('pf-pos', pf((id, i) => proef.pos(id, i)));
  socket.on('pf-weg', pf((id, soort) => proef.weg(id, soort)));
  socket.on('pf-terug', pf(id => proef.terug(id)));
  socket.on('pf-submit', pf(id => proef.submit(id)));
  socket.on('pf-niveau', pf((id, niveau) => proef.choose(id, niveau)));

  // Wie wegvalt tijdens een vraag, blijft niet onkwetsbaar staan.
  socket.on('disconnect', () => {
    if (socket.data.lsId) laserslag.asking(socket.data.lsId, false);
    if (socket.data.rrId) race.asking(socket.data.rrId, false);
    if (socket.data.pkId) knight.asking(socket.data.pkId, false);
    if (socket.data.srId) rossen.asking(socket.data.srId, false);
    if (socket.data.bkId) bomber.asking(socket.data.bkId, false);
    // Eén listener voor alle spellen: anders krijgt elke socket 15+ 'disconnect'-listeners
    // en toont Node een MaxListenersExceededWarning.
    for (const spel of SPELLEN_MET_WEG) spel.weg(socket);
    if (socket.data.jr && socket.data.jr.length) juniorSoon();
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

// Vanzelf bijwerken: alleen als er geen les loopt. Dat is: geen leerling verbonden, geen spel met spelers, de laatste 10 minuten
// niets van een ander toestel, en niemand aan het werk op een leerkrachtenscherm: 15 minuten als geen enkel scherm in beeld
// staat (geminimaliseerd, ander tabblad, pc vergrendeld), anders 90 minuten (een timer of een bordboek kan lang op het bord staan).
let laatsteInvoer = Date.now();
const RUSTIG = { buiten: 10, verborgen: 15, zichtbaar: 90 };
// Zijn er nu leerlingen verbonden, of loopt er een spel met spelers?
function lesBezig() {
  if ([...io.sockets.sockets.values()].some(s => !s.data.host && !isLocal(s.handshake.address))) return true;
  for (const spel of Object.values(SPELLEN)) {
    if (!spel || spel.phase === 'idle' || !(spel.players instanceof Map)) continue;
    for (const p of spel.players.values()) if (online(p.socketId)) return true;
  }
  return false;
}
function rustig() {
  const nu = Date.now();
  const min = m => m * 60 * 1000 / bijwerken.SNEL;
  const sockets = [...io.sockets.sockets.values()];
  if (lesBezig()) return false;
  if (nu - laatsteVanBuiten < min(RUSTIG.buiten)) return false;
  const inBeeld = sockets.some(s => s.data.host && s.data.zichtbaar !== false);
  return nu - laatsteInvoer >= min(inBeeld ? RUSTIG.zichtbaar : RUSTIG.verborgen);
}
// De server stopt, de klaargezette update wordt geïnstalleerd en LANcelot start opnieuw op dezelfde poort.
// Met de LANcelot-knop in de taakbalk (systeemvak.ps1): stoppen met code 75, de knop start alles opnieuw.
// Zonder die knop (het zwarte venster): de nieuwe versie start hier meteen, in hetzelfde venster.
async function herstartVoorUpdate() {
  console.log('\n  Er is een nieuwe versie van LANcelot. Bijwerken en opnieuw starten...');
  if (syncBezig) await Promise.race([syncBezig.catch(() => {}), new Promise(r => setTimeout(r, 60 * 1000))]);
  bijwerken.zetStil();
  io.close();
  server.closeAllConnections?.();
  await new Promise(r => server.close(() => r()));
  const { spawnSync } = require('child_process');
  const gedaan = bijwerken.pasToe();
  if (gedaan && gedaan.npm) spawnSync('npm', ['install', '--omit=dev'], { cwd: __dirname, stdio: 'inherit', shell: true });
  if (process.env.LANCELOT_KAN_HERSTARTEN) process.exit(75);
  // Het zwarte venster van een oudere start: opnieuw starten via Start LANcelot.bat. Dan komt de LANcelot-knop in de
  // taakbalk en gaat dit venster dicht. Anders zou een pc die nooit helemaal afsluit altijd het zwarte venster houden.
  const bat = path.join(__dirname, 'Start LANcelot.bat');
  if (process.platform === 'win32' && !store.ACTIEF && !process.env.LANCELOT_VENSTER && fs.existsSync(bat)) {
    console.log('  LANcelot start opnieuw, met de LANcelot-knop in de taakbalk. Dit venster gaat dicht.');
    // start ... cmd /c (niet start "bat"): anders blijft het nieuwe venster na de bat openstaan.
    require('child_process').spawn(process.env.ComSpec || 'cmd.exe', ['/d /s /c "start "" /min cmd /c ""' + bat + '"""'], {
      cwd: __dirname, detached: true, stdio: 'ignore', windowsVerbatimArguments: true,
      env: { ...process.env, LANCELOT_BIJGEWERKT: gedaan ? '1' : '' },
    }).unref();
    setTimeout(() => process.exit(0), 500);
    return;
  }
  const r = spawnSync(process.execPath, [__filename, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, LANCELOT_BIJGEWERKT: gedaan ? '1' : '' } });
  process.exit(r.status || 0);
}

const EERSTE_POORT = PORT;
server.once('listening', () => {
  server.removeListener('error', poortBezet);
  gegevens.dagelijks();
  if (avatars.herstelUitBackups(gegevens, settings, runen.kransVan).length) io.emit('avatars', avatars.all());
  runSync();
  setInterval(runSync, 60 * 1000);
  console.log('\n  LANcelot draait!\n');
  console.log(`  Leerkrachtenscherm:  http://localhost:${PORT}/host`);
  if (gegevens.DATA !== gegevens.APP) console.log(`  Gegevens:        ${gegevens.DATA}`);
  for (const a of lanAddresses()) console.log(`  Leerlingen:      http://${a}:${PORT}`);
  if (PORT !== EERSTE_POORT) console.log(`\n  Let op: poort ${EERSTE_POORT} is bezet door een ander programma, daarom gebruikt LANcelot nu poort ${PORT}.\n  Leerlingen gebruiken gewoon het adres op het bord. Lukt het niet, druk dan in Instellingen nog eens op "Firewall goed zetten".`);
  if (PORT !== EERSTE_POORT) { const wie = require('./src/poortgebruiker').uitleg(EERSTE_POORT); if (wie) console.log(wie); }
  if (!store.ACTIEF && !process.env.LANCELOT_VERBORGEN) console.log('\n  Sluit dit venster om te stoppen.\n');
  if (process.env.LANCELOT_KNOPFOUT) console.log(`  (De LANcelot-knop in de taakbalk lukte niet op deze pc: ${process.env.LANCELOT_KNOPFOUT})\n`);
  // Start LANcelot.bat vraagt om het leerkrachtenscherm te openen zodra de server echt luistert, op de juiste poort.
  bijwerken.startAuto({ rustig, herstart: () => herstartVoorUpdate().catch(err => { console.error('Bijwerken mislukt:', err.message); process.exit(process.env.LANCELOT_KAN_HERSTARTEN ? 75 : 1); }) });
  if (bijwerken.wasStil()) return;
  if ((process.env.LANCELOT_OPEN || store.ACTIEF) && process.platform === 'win32') execFile('cmd', ['/c', 'start', '', `http://localhost:${PORT}/${juniorAan() ? 'kies' : 'host'}`], { windowsHide: true });
});
function poortBezet(err) {
  if (err.code === 'EADDRINUSE' && !VASTE_POORT && PORT < EERSTE_POORT + 10) {
    PORT++;
    return server.listen(PORT);
  }
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Poort ${PORT} is bezet door een ander programma, dus LANcelot kan niet starten.`);
    const wie = require('./src/poortgebruiker').uitleg(PORT); if (wie) console.error(wie);
    console.error(VASTE_POORT ? '  Kies een andere poort met set PORT=... in Start LANcelot.bat, of sluit het andere programma.\n' : '  Sluit andere programma\'s (of herstart de pc) en probeer opnieuw.\n');
    process.exit(1);
  }
  throw err;
}
server.on('error', poortBezet);
server.listen(PORT);
