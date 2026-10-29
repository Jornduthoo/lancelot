// De kaarten van de ontdekwereld en hoe ze getekend worden: zwevende eilanden in 2.5D, in de stijl van Mijn burcht.
// De vloer, de rotswanden en alle vaste stukken (bomen, muren, plekken uit BuArt.stuk) worden één keer gebakken.
// Elk beeld tekent dat ene plaatje, de ridder, en enkel de stukken die vóór de ridder staan. Zo blijft het vlot op een Chromebook.
// Tekens: . gras  , bloemen  T boom  ~ leegte (de kloof)  = pad  b brug  R ruïnemuur  : ruïnevloer  k kristal  f fakkel
// H labo (2 op 2)  D deur van het labo  S start  W muur (binnen)  _ vloer (binnen)  x kast  v plant  q uitgang
// Plekken met een raadsel: u woordenwachter  s zwaardsteen  r robotwerkplaats  l lichtbaken  c runenportaal  o sterrenwacht
// p banier bij de brug  e stroomkring  g tandwielen  w wip
// Bouwen en reizen: L luchtschip (naar de Drakenkust)  P sterrenpoort (naar de Sterrenhaven)  Q terug naar het woud  J runensteen
// Drakenkust: z zand  a water  Y palm  K rots  G robodraak  M molen  m goudsmid  i drakennest  y drakenbeeld
// Sterrenhaven: X ruimteschip  d sterrenkoepel  h donjon  t gouden toren
// Coördinaten: vakje (x, y) heeft zijn midden op ((x - y) * T/2, (x + y) * T/4), net als in Mijn burcht.
const OdWereld = (() => {
  const KAARTEN = {
    woud: {
      naam: 'Het Kristalwoud',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~TTTTTTTT.TTTTTTTTTTT~~~~TTTTTTTTTTT~~~',
        '~TJ......,.,.T....,.JT~~~T.....T..T.T~~',
        '~T..T...TT....TT......~~~~..........PT~',
        '~T,Tk.,.,T=,...TT......~~~~.RRR:RRRR.T~',
        '~T.,T,,T..=...,...kT...~~~~.R::::::R.T~',
        '~T.....,..=T...........~~~~.R:f::k:R.T~',
        '~T..T.....=......,....~~~~..R::::::R.T~',
        '~T.T......=...s.......~~~~..R::l:::R.T~',
        '~T.....u..=..........~~~~...R:::::f:.T~',
        '~T..T.....=........T.~~~~.T.R::::::R.T~',
        '~T........=..T..T0....~~~~..R::::::R.T~',
        '~T.....T..=.........p.~~~~..:::::::R.T~',
        '~T.=======S===========bbbb===::::::R.T~',
        '~T........=...,.T.....~~~~..R::::::R.T~',
        '~T........=............~~~~.RRRcRRRR.T~',
        '~T.,......=...HH...T..~~~~..R::::::R.T~',
        '~T....r...=...HH......~~~~..R::::J::.T~',
        '~T.T......=....D.....~~~~...R:::o::R.T~',
        '~T........=======....~~~~...R:k:::fR.T~',
        '~T,TTT....=.........T~~~~...R::::::R.T~',
        '~T.T...T,.=T........~~~~....RRRR:RRR.T~',
        '~TJ........T..T..,..~~~~............JT~',
        '~TTTTTTTT,.L..T..T.T~~~~.TTTTTTTTTTTTT~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: x => x >= 25,
      binnenkaart: 'labo',
    },
    labo: {
      naam: 'Het Labo',
      rijen: [
        'WWWWWWWWWW',
        'W____x_x_v',
        'W_e______v',
        'W____g___x',
        'W________v',
        'Wv_____w__',
        'Wv_______J',
        'W______q__',
      ],
      ruine: () => false,
      binnen: true,
      buiten: 'woud',
      welkom: 'Welkom in het Labo! Drie proeven wachten op je.',
    },
    draken: {
      naam: 'De Drakenkust',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~zzzzzzz~~~~~~~~~~zzzzzzz~~~~~',
        '~~zzYzzzzzzz~~~~~~zzzz.Kzzzz~~~~',
        '~zzz...T..zzz~~~~zz...KKK..zz~~~',
        '~zz..,..T...zzzzzz...KGK.N..z~~~',
        '~z..T..i....=====..........Jzz~~',
        '~z.,....T...=...,..T....T....z~~',
        '~zz..T......=.......aaa......z~~',
        '~~z.........=..m...aaaaa.....z~~',
        '~~zz..T..====......aaaa.....zz~~',
        '~~~z.....=......,....Z.....zz~~~',
        '~~~z..J..=..T......T..y....z~~~~',
        '~~~zz....=.........M.......z~~~~',
        '~~~~z....=.....T.......,..zz~~~~',
        '~~~~zz...=================zz~~~~',
        '~~~~~z.T.=..T......T.....z~~~~~~',
        '~~~~~zz..S....Y......Y..zz~~~~~~',
        '~~~~~~zz.Q..........J..zz~~~~~~~',
        '~~~~~~~zzzzzzzzzzzzzzzzz~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: () => false,
      terug: { kaart: 'woud', bij: 'L' },
    },
    sterren: {
      naam: 'De Sterrenhaven',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~v:::::::::v~~~~~v::::::::v~~',
        '~~:RRRRR:RRR:~~~~~:RRR:RRRR:~~',
        '~~:R:::::::R:~~~~~:R::::::R:~~',
        '~~:R::d::k:R::::::::::t:::R:~~',
        '~~:R:::::::R:~~~~~:R:k::::R:~~',
        '~~:RRR:RRRRR:~~~~~:RRRRR:RR:~~',
        '~~::::::::::::::::::::::::J:~~',
        '~~v::X::::::::f:::::::::::::~~',
        '~~~:::::::::RRRRRR::::::::v~~~',
        '~~~::J::::::R::::R::::X:::::~~',
        '~~~:::::::::R:h::R::::::::~~~~',
        '~~~~::::f:::R:J::R:::f::::~~~~',
        '~~~~::::O:::RR::RR::::::::~~~~',
        '~~~~~:::::::::::::::*:::::~~~~',
        '~~~~~~:::::S:Q::::::::::~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: () => true,
      terug: { kaart: 'woud', bij: 'P' },
    },
    ijs: {
      naam: 'Het IJsrijk',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~~~BBBBB~~~~~~~~BBBBBB~~~~~~',
        '~~~BB.....BB~~~~BB......BB~~~~',
        '~~B....k....B~~B....C.....B~~~',
        '~~B..A...zzz.BBB..........B~~~',
        '~~B.....zzzzz.....zz..k...B~~~',
        '~~~B...zzaazz....zzzz....B~~~~',
        '~~~B....zzzz..J...zz.....B~~~~',
        '~~~~B.........=======....B~~~~',
        '~~~~B..k..=====.....=...B~~~~~',
        '~~~~~B....=.....E...=..B~~~~~~',
        '~~~~~B..J.=.........=..B~~~~~~',
        '~~~~~~B...=..k......=.B~~~~~~~',
        '~~~~~~B...S.Q...I...=.B~~~~~~~',
        '~~~~~~~BB..........J.B~~~~~~~~',
        '~~~~~~~~~BBBBBBBBBBBB~~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: () => false,
      terug: { kaart: 'sterren', bij: 'O' },
      rots: ['#8597bd', '#5a6b94'],
      lip: ['#f4f8ff', '#cfdcee'],
    },
    vuur: {
      naam: 'De Vuurberg',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~~KKK~~~~~~~~~~~~~~KKKK~~~~~~',
        '~~~K...KK~~~~~~~~~KK....K~~~~~~',
        '~~K..F...K~~~~~~~K...aa..K~~~~~',
        '~~K.......KKKKKKK...aaaa..K~~~~',
        '~~K..f......f......aaaaa..K~~~~',
        '~~~K....=========...aaa.U.K~~~~',
        '~~~K.J..=...G...=.........K~~~~',
        '~~~~K...=.......=....f...K~~~~~',
        '~~~~K...=...J...=........K~~~~~',
        '~~~~~K..=...9...=..V....K~~~~~~',
        '~~~~~K..S.Q.....=.....J.K~~~~~~',
        '~~~~~~KK..........f....K~~~~~~~',
        '~~~~~~~~KKKKKKKKKKKKKKK~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: () => false,
      terug: { kaart: 'draken', bij: 'N' },
      rots: ['#5e3b35', '#3b2320'],
      lip: ['#4a3834', '#352624'],
    },
    koraal: {
      naam: 'Het Koraalrif',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~~zzzzzz~~~~~~~~~zzzzzzz~~~~',
        '~~~zz.Y..zzz~~~~~zzz..n..zz~~~',
        '~~zz..1....zz~~~zz...aa...zz~~',
        '~~z..n...Y..zzzzz...aaaa.3.z~~',
        '~~z...........=====.aaaaa..z~~',
        '~~zz..HH....===...=..aaa...z~~',
        '~~~z..HH...=..n...=......Jzz~~',
        '~~~z...D...=.......=====..z~~~',
        '~~~zz..====..Y..2......=..z~~~',
        '~~~~z..=..n...........=.zz~~~~',
        '~~~~z.J=.....aaa..n...=.z~~~~~',
        '~~~~zz.=....aaaaa....J=.z~~~~~',
        '~~~~~z.S.Q...aaa....Y..zz~~~~~',
        '~~~~~zz..............zz~~~~~~~',
        '~~~~~~zzzzzzzzzzzzzzzz~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: () => false,
      terug: { kaart: 'draken', bij: 'Z' },
      binnenkaart: 'koraallab',
      rots: ['#c9a46a', '#9c7a48'],
      lip: ['#f6e6b8', '#dcc48e'],
    },
    koraallab: {
      naam: 'Het Onderzeelab',
      rijen: [
        'WWWWWWWW',
        'W___x__v',
        'W_7_____',
        'W______x',
        'Wv____J_',
        'W____q__',
      ],
      ruine: () => false,
      binnen: true,
      buiten: 'koraal',
      welkom: 'Welkom in het Onderzeelab! Zinkt het, of drijft het?',
    },
    wolk: {
      naam: 'De Wolkenstad',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~~.....~~~~~~~~~~.......~~~~',
        '~~~..4.M..~~~~~~~...v...M..~~~',
        '~~.........~~~~~~.....5.....~~',
        '~~..v...j...=====..........~~~',
        '~~~.....=====...=====..j...~~~',
        '~~~..J..=...........=......~~~',
        '~~~~...=...HH.......=..M..~~~~',
        '~~~~...=...HH..j....=...J.~~~~',
        '~~~~~..=....D.......=====~~~~~',
        '~~~~~..=........./6.....~~~~~~',
        '~~~~~~.S.Q..j.........~~~~~~~~',
        '~~~~~~~...............~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: () => false,
      terug: { kaart: 'ijs', bij: 'I' },
      binnenkaart: 'weerlab',
      rots: ['#d4cef2', '#a39bd6'],
      lip: ['#ffffff', '#ebe7fc'],
    },
    weerlab: {
      naam: 'Het Weerstation',
      rijen: [
        'WWWWWWWW',
        'W__x___v',
        'W_____8_',
        'Wx______',
        'W__J___v',
        'W____q__',
      ],
      ruine: () => false,
      binnen: true,
      buiten: 'wolk',
      welkom: 'Welkom in het Weerstation! Lees de thermometers.',
    },
    mijn: {
      naam: 'De Mijnen',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~KKKKK~~~~~~~~~~~KKKKKK~~~~~',
        '~~K..k..KK~~~~~~~KK..k...K~~~~',
        '~K..<.....K~~~~~K.....+..K~~~~',
        '~K....#....KKKKK....k.....K~~~',
        '~K..k...===========........K~~',
        '~~K.....=....f....=...#....K~~',
        '~~K..J..=..........=.....J.K~~',
        '~~~K....=....k.....=.......K~~',
        '~~~K.f..=....>.....=====..K~~~',
        '~~~~K...=...............K~~~~~',
        '~~~~K..S.Q...#....J....K~~~~~~',
        '~~~~~KK...............K~~~~~~~',
        '~~~~~~~KKKKKKKKKKKKKKK~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: () => false,
      terug: { kaart: 'vuur', bij: '9' },
      rots: ['#4a3f60', '#2e2640'],
      lip: ['#5a4e72', '#463c5c'],
    },
    maan: {
      naam: 'De Maanbasis',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~~.......~~~~~~~~~.......~~~',
        '~~~..%..?...~~~~~~~...^..&..~~',
        '~~.....^.....~~~~~.....%.....~',
        '~~..%.....=========.........~~',
        '~~~......=...J.....=...X...~~~',
        '~~~..^...=..........=......~~~',
        '~~~~.....=....%.....=..^..~~~~',
        '~~~~..J..=......$...====..~~~~',
        '~~~~~....=.............J.~~~~~',
        '~~~~~~.S.Q..;^......%..~~~~~~~',
        '~~~~~~~...............~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: () => false,
      terug: { kaart: 'wolk', bij: '/' },
      rots: ['#8a8a9c', '#5e5e72'],
      lip: ['#d0d0dc', '#b0b0c0'],
    },
    cyber: {
      naam: 'De Cyberstad',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~@.....@~~~~~~~~@......@~~~~',
        '~~@...{....@~~~~~@...!.....~~~',
        '~~.....!.....~~~~....@...}..~~',
        '~~..@......=========.........~',
        '~~~......==....@...==...@...~~',
        '~~~..J..=..!........=.......~~',
        '~~~~....=.....@.....=..J...~~~',
        '~~~~..@.=...(.......====.@.~~~',
        '~~~~~...=..............!..~~~~',
        '~~~~~~.S.Q...@....J...@..~~~~~',
        '~~~~~~~................~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: () => false,
      terug: { kaart: 'sterren', bij: '*' },
      rots: ['#2a3050', '#1a1e34'],
      lip: ['#4cc9ff', '#2a8fe0'],
    },
    station: {
      naam: 'Het Ruimtestation',
      rijen: [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~~~~~~~..........~~~~~~~~~~~',
        '~----~~~..|..]...|..~~~~----~~',
        '~----.................J.----~~',
        '~----..==============...----~~',
        '~~~~...=..........=..~~~~~~~~~',
        '~~~~~..=..)....X..=..~~~~~~~~~',
        '~~~~~..=..........=..~~~~~~~~~',
        '~----..=...J...[..====..----~~',
        '~----..=..............J.----~~',
        '~----..S.Q..........|...----~~',
        '~~~~~~~...............~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      ],
      ruine: () => false,
      terug: { kaart: 'maan', bij: ';' },
      rots: ['#6a7488', '#454e62'],
      lip: ['#c8d0e0', '#a0a8b8'],
    },
  };
  const STATION = {
    u: 'uil', s: 'schuif', r: 'robot', l: 'licht', c: 'code', o: 'steen', e: 'stroom', g: 'tandwiel', w: 'wip',
    m: 'smidse', i: 'nest', y: 'beeld', d: 'koepel', h: 'donjon', t: 'goudtoren',
    A: 'ijsmeer', C: 'klokkentoren', E: 'ijsbeeld', F: 'lavapoort', U: 'vuurkristal', V: 'vuurtoren',
    '{': 'datatoren', '}': 'stroompoort', '(': 'lichtlab', ')': 'vrachtruim', '[': 'aftelling', ']': 'seinpost',
    '<': 'mijnkar', '>': 'mijnspoor', '+': 'edelsteenwand', '?': 'maanlab', '&': 'koepelbouw', $: 'sterrenkijker',
    1: 'parelschelp', 2: 'wrak', 3: 'schatkaart', 4: 'wolkentoren', 5: 'windorgel', 6: 'luchthaven', 7: 'drijfbak', 8: 'thermometer',
  };
  // Welk plaatje uit Mijn burcht bij welke plek hoort.
  const STUK = {
    uil: 'holoridder', schuif: 'zwaardsteen', robot: 'mechridder', licht: 'baken', code: 'portaal', steen: 'radar', bord: 'banier',
    smidse: 'smidse', nest: 'draak', beeld: 'drakenbeeld', koepel: 'schildkoepel', donjon: 'donjon', goudtoren: 'goudtoren',
    ijsmeer: 'fontein', klokkentoren: 'wachttoren', ijsbeeld: 'ridderbeeld', lavapoort: 'poort', vuurkristal: 'kristal', vuurtoren: 'toren',
    datatoren: 'baken', stroompoort: 'portaal', lichtlab: 'schildkoepel', vrachtruim: 'mechridder', aftelling: 'laserkanon', seinpost: 'radar',
    mijnspoor: 'poort', edelsteenwand: 'kristal', maanlab: 'schildkoepel', koepelbouw: 'baken', sterrenkijker: 'radar',
    schatkaart: 'wachttoren', wolkentoren: 'toren', windorgel: 'baken', luchthaven: 'radar',
  };
  // Eigen kleur voor sommige plekken (anders goud).
  const STUKKLEUR = { ijsmeer: '#9ff3ff', ijsbeeld: '#bfe6ff', lavapoort: '#ff7a3a', vuurkristal: '#ff7a3a', vuurtoren: '#ff5a5a', wolkentoren: '#c77dff', windorgel: '#ffe08a',
    mijnspoor: '#a0703c', edelsteenwand: '#ff7aa8', maanlab: '#9ff3ff', koepelbouw: '#ffffff', sterrenkijker: '#c77dff',
    datatoren: '#4cc9ff', stroompoort: '#2ee6a6', lichtlab: '#ff70c8', aftelling: '#ff5a5a', seinpost: '#4cc9ff' };
  // Plekken waar je iets bouwt met kristallen (en daarna mee reist).
  const BOUWPLEK = { p: 'brug', L: 'luchtschip', P: 'sterrenpoort', N: 'drakenzadel', O: 'ijsraket', Z: 'duikboot', I: 'luchtballon', 9: 'mijnlift', '/': 'maanraket', 0: 'kroonburcht', '*': 'hyperloop', ';': 'shuttle' };
  const REIS = { luchtschip: 'draken', sterrenpoort: 'sterren', drakenzadel: 'vuur', ijsraket: 'ijs', duikboot: 'koraal', luchtballon: 'wolk', mijnlift: 'mijn', maanraket: 'maan', hyperloop: 'cyber', shuttle: 'station' };
  const BLOKKEERT = new Set('T~RHWxvkfaYKGMXLPNOBZInj90/#^%*;@!-|'.split('').concat(Object.keys(STATION), ['p']));

  const hash = (x, y, k = 0) => BuArt.hash(x, y, k);

  function kaart(id) {
    const k = KAARTEN[id];
    const w = Math.max(...k.rijen.map(r => r.length));
    return { id, ...k, w, h: k.rijen.length };
  }

  const teken = (k, x, y) => (x < 0 || y < 0 || y >= k.h ? '~' : k.rijen[y][x] || '~');

  function loopbaar(k, x, y, gebouwd = []) {
    const c = teken(k, x, y);
    if (c === 'b') return gebouwd.includes('brug');
    return !BLOKKEERT.has(c);
  }

  // Waar staan de plekken met een raadsel (en de banier van de brug)?
  function plekken(k) {
    const out = [];
    for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) {
      const c = teken(k, x, y);
      if (STATION[c]) out.push({ id: STATION[c], x, y });
      if (c === 'p') out.push({ id: 'bord', bouw: 'brug', x, y });
      if (c !== 'p' && BOUWPLEK[c]) out.push({ id: BOUWPLEK[c], bouw: BOUWPLEK[c], reis: REIS[BOUWPLEK[c]], x, y });
    }
    return out;
  }

  function vind(k, c) {
    for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) if (teken(k, x, y) === c) return { x, y };
    return null;
  }

  // ---------- Bakken ----------

  // Hoeveel plaats de kaart inneemt (in pixels bij tegelbreedte T) en waar vakje (0, 0) komt.
  function maat(k, T) {
    const boven = T * 2.4; // ruimte voor hoge stukken bovenaan
    const onder = T * 3.2; // ruimte voor de rotswanden onderaan
    return { w: (k.w + k.h) * T / 2 + T, h: (k.w + k.h) * T / 4 + boven + onder, ox: k.h * T / 2 + T / 2, oy: boven };
  }

  function vloerVan(k, x, y) {
    const c = teken(k, x, y);
    if (k.binnen) return 'neon';
    if (k.id === 'ijs') {
      if (c === 'z') return 'ijs';
      if (c === 'a') return 'ijswater';
      if (c === '=' || c === 'S') return 'sneeuwpad';
      return hash(x, y, 3) < 0.3 ? 'sneeuw2' : 'sneeuw';
    }
    if (k.id === 'cyber') {
      if (c === '=' || c === 'S') return 'neonpad';
      return hash(x, y, 3) < 0.3 ? 'cyber2' : 'cyber';
    }
    if (k.id === 'station') {
      if (c === '=' || c === 'S') return 'dekpad';
      return hash(x, y, 3) < 0.3 ? 'dek2' : 'dek';
    }
    if (k.id === 'mijn') {
      if (c === '=' || c === 'S') return 'rails';
      return hash(x, y, 3) < 0.3 ? 'mijn2' : 'mijn';
    }
    if (k.id === 'maan') {
      if (c === '=' || c === 'S') return 'maanpad';
      return hash(x, y, 3) < 0.3 ? 'maan2' : 'maan';
    }
    if (k.id === 'koraal') {
      if (c === 'a') return 'lagune';
      if (c === 'z' || c === 'Q') return 'strand';
      if (c === '=' || c === 'S' || c === 'D') return 'plank';
      return hash(x, y, 3) < 0.3 ? 'zand2' : 'zand';
    }
    if (k.id === 'wolk') {
      if (c === '=' || c === 'S' || c === 'D') return 'goudpad';
      return hash(x, y, 3) < 0.3 ? 'wolk2' : 'wolk';
    }
    if (k.id === 'vuur') {
      if (c === 'a') return 'lava';
      if (c === '=' || c === 'S') return 'basalt';
      return hash(x, y, 3) < 0.3 ? 'as2' : 'as';
    }
    if (c === 'z' || c === 'Y' || c === 'Q') return 'zand';
    if (c === 'a') return 'water';
    if (c === '=' || c === 'S' || c === 'D') return 'pad';
    if (c === ',') return 'bloemen';
    if (k.ruine(x) && ':RlcokfSdhtJvXP'.includes(c)) return c === 'R' ? 'plein' : 'neon';
    if (k.ruine(x)) return 'wild';
    return hash(x, y, 3) < 0.25 ? 'wild' : 'gras';
  }

  // ---------- Low-poly grond ----------
  // Het eiland als vlakjes: elk vakje zijn twee driehoeken met een eigen tint, op een licht golvende grond.
  // De rotswanden eronder zijn grote, schuine rotsvlakken. Alles wordt één keer gebakken, dus het kost niets per beeld.
  const RGB = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const kleurStr = c => `rgb(${c.map(v => Math.max(0, Math.min(255, Math.round(v)))).join(',')})`;
  const LP = { gras: '#66c24c', wild: '#57ad43', bloemen: '#6dc650', pad: '#9a9fb3', plein: '#8d93ad', neon: '#3b4563', water: '#3a8ee0', zand: '#e3c98c',
    sneeuw: '#eef4fb', sneeuw2: '#dde8f4', sneeuwpad: '#b9c7dc', ijs: '#a6dcf2', ijswater: '#2f6fb0',
    as: '#5a4a46', as2: '#4c3e3b', basalt: '#3a3236', lava: '#ff6a1f',
    zand2: '#d9bd7e', strand: '#f0dcaa', lagune: '#2fc1c9', plank: '#a0754a', wolk: '#f5f2ff', wolk2: '#e7e2fb', goudpad: '#f0d27a',
    mijn: '#4f4660', mijn2: '#443c55', rails: '#6a5a4a', maan: '#bdbdc9', maan2: '#acacbb', maanpad: '#8e8ea3',
    cyber: '#232a46', cyber2: '#1e2540', neonpad: '#2e3866', dek: '#a3adc0', dek2: '#97a1b6', dekpad: '#7a859c' };
  const LICHT = (() => { const l = [-0.55, -0.35, 1]; const n = Math.hypot(...l); return l.map(v => v / n); })();

  function driehoek(g, a, b, c, kleur) {
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.lineTo(c[0], c[1]);
    g.closePath();
    g.fillStyle = kleur;
    g.fill();
    // dezelfde kleur als rand: geen dunne naden tussen de vlakjes
    g.strokeStyle = kleur;
    g.lineWidth = 0.6;
    g.stroke();
  }

  // Hoe fel een vlak is: hoe meer het naar het licht kijkt, hoe lichter.
  function belicht(p0, p1, p2) {
    const a = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const b = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    if (n[2] < 0) n = n.map(v => -v);
    const l = Math.hypot(...n) || 1;
    return (n[0] * LICHT[0] + n[1] * LICHT[1] + n[2] * LICHT[2]) / l;
  }

  function laagPoly(g, k, T, ox, oy) {
    const half = T / 2;
    const kwart = T / 4;
    const land = (x, y) => { const c = teken(k, x, y); return c !== '~' && c !== 'b'; };
    const golvend = c => '.,TYzBnj#%^'.includes(c) && k.id !== 'cyber' && k.id !== 'station' && !(k.id === 'ijs' && c === 'z');
    // Hoogte van elke hoek: golvend gras, maar vlak waar een pad, plek of gebouw aan raakt.
    const hoogte = (cx, cy) => {
      for (const [x, y] of [[cx - 1, cy - 1], [cx, cy - 1], [cx - 1, cy], [cx, cy]]) {
        const c = teken(k, x, y);
        if (c !== '~' && !golvend(c)) return 0;
      }
      return (hash(cx, cy, 11) - 0.35) * T * 0.16;
    };
    const H = [];
    for (let cy = 0; cy <= k.h; cy++) { H.push([]); for (let cx = 0; cx <= k.w; cx++) H[cy].push(hoogte(cx, cy)); }
    const scherm = (cx, cy, z = H[cy][cx]) => [ox + (cx - cy) * half, oy + (cx + cy - 1) * kwart - z];
    const wereld = (cx, cy) => [cx, cy, H[cy][cx] / half];

    // Rotsdiepte onder de rand: diep in het midden van een eiland, ondieper aan de punten.
    const breed = (k.w + k.h) / 2;
    const diepte = (cx, cy) => {
      const rel = Math.min(1, Math.abs(cx - cy - (k.w - k.h) / 2) / breed);
      return T * (0.7 + 2.6 * (1 - rel) ** 1.4 + 0.9 * hash(cx, cy, 5));
    };
    const ROTS = { l: RGB((k.rots || [])[0] || '#6c5a80'), r: RGB((k.rots || [])[1] || '#45395c') };
    const LIP = k.lip || ['#4f9a3a', '#3e8030'];

    function wand(a, b, da, db, zij, seed) {
      const r = BuArt.rng(seed * 2654435761);
      const basis = ROTS[zij];
      const tint = (f, donker) => kleurStr(basis.map(v => v * (1 + (r() - 0.5) * 0.22) * (1 - donker)));
      const mid = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      // drie rijen punten: de rand, het midden en de grillige onderkant
      const boven = [a, b];
      const m0 = [a[0], a[1] + da * (0.4 + r() * 0.15)];
      const m1 = [b[0], b[1] + db * (0.4 + r() * 0.15)];
      const mm = mid(0.5);
      const mc = [mm[0] + (r() - 0.5) * T * 0.12, mm[1] + (da + db) / 2 * (0.5 + r() * 0.2)];
      const o0 = [a[0], a[1] + da];
      const o1 = [b[0], b[1] + db];
      const oc = [mm[0] + (r() - 0.5) * T * 0.1, mm[1] + Math.max(da, db) * (1.05 + r() * 0.25)];
      driehoek(g, boven[0], boven[1], mc, tint(0, 0));
      driehoek(g, boven[0], mc, m0, tint(0, 0.08));
      driehoek(g, boven[1], m1, mc, tint(0, 0.12));
      driehoek(g, m0, mc, o0, tint(0, 0.3));
      driehoek(g, mc, oc, o0, tint(0, 0.42));
      driehoek(g, mc, m1, o1, tint(0, 0.34));
      driehoek(g, mc, o1, oc, tint(0, 0.48));
      // een kartelrand van gras over de rots
      const lip = T * 0.09;
      for (let i = 0; i < 2; i++) {
        const p = mid(i / 2);
        const q = mid((i + 1) / 2);
        const punt = mid((i + 0.5) / 2);
        driehoek(g, p, q, [punt[0], punt[1] + lip * (0.8 + r() * 0.7)], zij === 'l' ? LIP[0] : LIP[1]);
      }
      // de neonrand van onze eilanden
      g.save();
      g.lineCap = 'round';
      const nl = T * 0.2;
      g.strokeStyle = 'rgba(76,201,255,.28)';
      g.lineWidth = Math.max(1.5, T / 14);
      g.beginPath();
      g.moveTo(a[0], a[1] + nl);
      g.lineTo(b[0], b[1] + nl);
      g.stroke();
      g.strokeStyle = 'rgba(190,240,255,.85)';
      g.lineWidth = Math.max(0.7, T / 45);
      g.stroke();
      g.restore();
      // een kristal in de rots
      if (r() < 0.25) {
        const t = 0.3 + r() * 0.4;
        const p = mid(t);
        kristalletje(g, p[0], p[1] + Math.min(da, db) * (0.45 + r() * 0.25), T * (0.08 + r() * 0.05), r() < 0.6);
      }
    }

    for (let som = 0; som <= k.w + k.h - 2; som++) {
      for (let x = Math.max(0, som - k.h + 1); x <= Math.min(k.w - 1, som); x++) {
        const y = som - x;
        if (!land(x, y)) continue;
        // rotswanden aan de kanten die naar ons kijken
        if (!land(x, y + 1)) wand(scherm(x, y + 1), scherm(x + 1, y + 1), diepte(x, y + 1), diepte(x + 1, y + 1), 'l', x * 31 + y);
        if (!land(x + 1, y)) wand(scherm(x + 1, y + 1), scherm(x + 1, y), diepte(x + 1, y + 1), diepte(x + 1, y), 'r', x * 17 + y * 3);
        // de bovenkant: twee driehoeken, de diagonaal wisselt willekeurig
        const soort = vloerVan(k, x, y);
        const basis = RGB(LP[soort] || LP.gras);
        const hoeken = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
        const tris = hash(x, y, 12) < 0.5 ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 3], [1, 2, 3]];
        tris.forEach((t, i) => {
          const pw = t.map(j => wereld(...hoeken[j]));
          const f = belicht(...pw);
          const jitter = (hash(x * 2 + i, y, 13) - 0.5) * (soort === 'neon' ? 0.1 : 0.16);
          const mul = 0.82 + f * 0.22 + jitter;
          driehoek(g, ...t.map(j => scherm(...hoeken[j])), kleurStr(basis.map(v => v * mul)));
        });
        const c = scherm(x, y, 0);
        const mx = c[0];
        const my = c[1] + kwart;
        if (soort === 'lava') {
          // gloeiende barsten in de lava
          g.strokeStyle = 'rgba(255,230,120,.85)';
          g.lineWidth = Math.max(1, T / 30);
          g.beginPath();
          g.moveTo(mx - half * 0.6, my + (hash(x, y, 17) - 0.5) * kwart);
          g.lineTo(mx, my + (hash(x, y, 18) - 0.5) * kwart);
          g.lineTo(mx + half * 0.5, my - kwart * 0.3);
          g.stroke();
        } else if (soort === 'cyber' || soort === 'cyber2' || soort === 'neonpad') {
          // een gloeiend raster in de vloer van de stad
          g.strokeStyle = soort === 'neonpad' ? 'rgba(255,112,200,.7)' : 'rgba(76,201,255,.35)';
          g.lineWidth = Math.max(1, T / 50);
          g.beginPath();
          g.moveTo(mx - half, my);
          g.lineTo(mx, my - kwart);
          g.lineTo(mx + half, my);
          g.stroke();
          if (hash(x, y, 18) < 0.2) {
            g.fillStyle = 'rgba(46,230,166,.8)';
            g.fillRect(mx - T * 0.02, my - T * 0.02, T * 0.04, T * 0.04);
          }
        } else if (soort === 'dek' || soort === 'dek2' || soort === 'dekpad') {
          // metalen platen met naden en klinknagels
          g.strokeStyle = 'rgba(40,48,70,.35)';
          g.lineWidth = Math.max(1, T / 60);
          g.beginPath();
          g.moveTo(mx - half * 0.5, my - kwart * 0.5);
          g.lineTo(mx + half * 0.5, my + kwart * 0.5);
          g.stroke();
          if (soort === 'dekpad') {
            g.fillStyle = 'rgba(255,201,74,.75)';
            g.fillRect(mx - T * 0.1, my - T * 0.015, T * 0.2, T * 0.03);
          }
        } else if (soort === 'pad' && hash(x, y, 19) < 0.18) {
          // een oud lichtcircuit in de stenen
          g.strokeStyle = 'rgba(76,201,255,.6)';
          g.lineWidth = Math.max(1, T / 60);
          g.beginPath();
          g.moveTo(mx - half * 0.4, my + kwart * 0.1);
          g.lineTo(mx - half * 0.05, my - kwart * 0.25);
          g.lineTo(mx + half * 0.35, my - kwart * 0.05);
          g.stroke();
          g.fillStyle = 'rgba(159,243,255,.9)';
          g.fillRect(mx + half * 0.35 - 1.5, my - kwart * 0.05 - 1.5, 3, 3);
        } else if (soort === 'rails') {
          // dwarsliggers en twee rails
          for (let i = 0; i < 3; i++) {
            const f = (i + 0.5) / 3 - 0.5;
            const px = mx + f * half * 0.9;
            const py = my + f * kwart * 0.9;
            driehoek(g, [px - half * 0.28, py + kwart * 0.28], [px + half * 0.28, py - kwart * 0.28], [px + half * 0.22, py - kwart * 0.16], '#4a3424');
            driehoek(g, [px - half * 0.28, py + kwart * 0.28], [px + half * 0.22, py - kwart * 0.16], [px - half * 0.34, py + kwart * 0.4], '#3a2818');
          }
          g.strokeStyle = '#b8bcc8';
          g.lineWidth = Math.max(1, T / 40);
          for (const o of [-0.16, 0.16]) {
            g.beginPath();
            g.moveTo(mx - half * 0.5 + o * half, my - kwart * 0.5 - o * kwart);
            g.lineTo(mx + half * 0.5 + o * half, my + kwart * 0.5 - o * kwart);
            g.stroke();
          }
        } else if (soort === 'ijs' && hash(x, y, 14) < 0.5) {
          // een glimlijn over het ijs
          g.strokeStyle = 'rgba(255,255,255,.7)';
          g.lineWidth = Math.max(1, T / 40);
          g.beginPath();
          g.moveTo(mx - half * 0.4, my + kwart * 0.2);
          g.lineTo(mx + half * 0.1, my - kwart * 0.35);
          g.stroke();
        } else if (soort === 'neon' && hash(x, y, 14) < 0.35) {
          // oude lichtlijnen in de vloer van de ruïne
          g.strokeStyle = 'rgba(76,201,255,.55)';
          g.lineWidth = Math.max(0.8, T / 50);
          g.beginPath();
          g.moveTo(mx - half * 0.5, my);
          g.lineTo(mx, my + kwart * 0.5);
          g.lineTo(mx + half * 0.5, my);
          g.stroke();
        } else if (soort === 'bloemen' || (soort === 'wild' && hash(x, y, 15) < 0.4)) {
          // bloemetjes als kleine ruitjes
          const kl = ['#ff7aa8', '#ffe066', '#ffffff', '#b98cff', '#ff9a4a'];
          const n = soort === 'bloemen' ? 5 : 2;
          for (let i = 0; i < n; i++) {
            const u = hash(x, y, 20 + i) - 0.5;
            const v = hash(x, y, 30 + i) - 0.5;
            const px = mx + (u - v) * half * 0.8;
            const py = my + (u + v) * kwart * 0.8 - T * 0.02;
            const s = T * 0.03;
            g.fillStyle = kl[Math.floor(hash(x, y, 40 + i) * kl.length)];
            g.beginPath();
            g.moveTo(px, py - s);
            g.lineTo(px + s, py);
            g.lineTo(px, py + s * 0.7);
            g.lineTo(px - s, py);
            g.closePath();
            g.fill();
          }
        } else if (soort === 'pad' && hash(x, y, 16) < 0.5) {
          // een paar platte stenen in het pad
          for (let i = 0; i < 2; i++) {
            const u = (hash(x, y, 50 + i) - 0.5) * 0.6;
            const v = (hash(x, y, 60 + i) - 0.5) * 0.6;
            const px = mx + (u - v) * half;
            const py = my + (u + v) * kwart;
            const s = T * 0.09;
            driehoek(g, [px - s, py], [px, py - s * 0.45], [px + s * 0.8, py + s * 0.1], 'rgba(255,255,255,.14)');
            driehoek(g, [px - s, py], [px + s * 0.8, py + s * 0.1], [px, py + s * 0.4], 'rgba(0,0,0,.1)');
          }
        }
      }
    }
  }

  // Een klein kristal met twee vlakken.
  function kristalletje(g, x, y, s, blauw) {
    const [licht, donker] = blauw ? ['#9ff3ff', '#2a8fe0'] : ['#e6d0ff', '#7a3fe0'];
    driehoek(g, [x, y - s * 1.6], [x - s * 0.6, y], [x, y + s * 0.5], licht);
    driehoek(g, [x, y - s * 1.6], [x, y + s * 0.5], [x + s * 0.6, y], donker);
  }

  function bak(k, T, gebouwd = [], gevonden = []) {
    const m = maat(k, T);
    const c = document.createElement('canvas');
    c.width = Math.ceil(m.w);
    c.height = Math.ceil(m.h);
    const g = c.getContext('2d');
    const brug = (x, y) => teken(k, x, y) === 'b' && gebouwd.includes('brug');
    if (!k.binnen) {
      laagPoly(g, k, T, m.ox, m.oy);
      // De brug van hard licht komt uit Mijn burcht: enkel de brugvakjes, zonder rotswand.
      if (gebouwd.includes('brug')) BuArt.teken(g, { w: k.w, h: k.h, land: brug, brug, vloer: () => 'brug', stuk: () => null }, T, m.ox, m.oy);
    } else {
      BuArt.teken(g, {
        w: k.w,
        h: k.h,
        land: (x, y) => teken(k, x, y) !== '~' && (teken(k, x, y) !== 'b' || brug(x, y)),
        brug,
        vloer: (x, y) => vloerVan(k, x, y),
        stuk: () => null,
      }, T, m.ox, m.oy, { diep: 0.8 });
    }
    // Alle vaste stukken meteen mee in hetzelfde plaatje: elk beeld moet dan maar één plaatje tekenen.
    // Staat de ridder achter een stuk, dan tekent de gsm alleen dat stuk nog eens over hem heen.
    for (const st of stukken(k, gevonden, gebouwd)) {
      const p = sprite(st, k, T);
      const x = m.ox + (st.x + (st.dx || 0) - st.y - (st.dy || 0)) * T / 2;
      const y = m.oy + (st.x + (st.dx || 0) + st.y + (st.dy || 0)) * T / 4;
      g.drawImage(p.c, Math.round(x - p.ax), Math.round(y - p.ay));
    }
    return { c, ...m };
  }

  // ---------- Stukken (van achter naar voor getekend) ----------

  // Een eenvoudig blok in isometrie, voor de werktafels en kasten in het labo.
  function blok(g, T, u0, u1, v0, v1, z0, z1, kleur, licht) {
    const P = (u, v, z) => [(u - v) * T / 2, (u + v) * T / 4 - z * T];
    const vlak = (pts, f) => {
      g.beginPath();
      g.moveTo(...pts[0]);
      for (const p of pts.slice(1)) g.lineTo(...p);
      g.closePath();
      g.fillStyle = f;
      g.fill();
    };
    vlak([P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)], BuArt.shade(kleur, -0.2));
    vlak([P(u1, v1, z0), P(u1, v0, z0), P(u1, v0, z1), P(u1, v1, z1)], BuArt.shade(kleur, -0.45));
    vlak([P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], licht || BuArt.shade(kleur, 0.08));
    return P;
  }

  // Low-poly bomen: een den van gestapelde kegels en een loofboom als bol van vlakjes, licht van linksboven.
  function lpBoom(g, T, den, variant, sneeuw = false) {
    const r = BuArt.rng(variant * 977 + (den ? 13 : 7));
    g.fillStyle = 'rgba(10,20,30,.28)';
    g.beginPath();
    g.ellipse(0, 0, T * 0.3, T * 0.13, 0, 0, Math.PI * 2);
    g.fill();
    const stam = T * (den ? 0.05 : 0.06);
    const stamH = T * (den ? 0.22 : 0.34);
    driehoek(g, [-stam, 0], [0, T * 0.03], [0, -stamH], '#7a5232');
    driehoek(g, [0, T * 0.03], [stam, 0], [0, -stamH], '#553820');
    driehoek(g, [-stam, 0], [0, -stamH], [-stam, -stamH], '#7a5232');
    if (den) {
      const groen = [['#4fb06a', '#2f7d4a', '#25643c'], ['#56b873', '#348552', '#286b41'], ['#4aa865', '#2c7646', '#225e38']][variant % 3];
      const lagen = 3;
      const hoog = T * (0.95 + variant * 0.12);
      for (let i = 0; i < lagen; i++) {
        const t = i / lagen;
        const b = -T * 0.16 - hoog * t * 0.72;
        const w = T * (0.32 - t * 0.08);
        const top = b - hoog * 0.5;
        const voor = b + w * 0.28;
        driehoek(g, [-w, b], [0, voor], [0, top], groen[0]);
        driehoek(g, [0, voor], [w, b], [0, top], groen[1]);
        driehoek(g, [-w, b], [-w * 0.35, b - (b - top) * 0.25], [0, top], BuArt.shade(groen[0], 0.18));
        driehoek(g, [w, b], [w * 0.45, b - (b - top) * 0.2], [0, top], groen[2]);
        if (sneeuw) {
          // een sneeuwkapje op elke laag
          const sb = top + (b - top) * 0.55;
          driehoek(g, [-w * 0.5, sb], [0, sb + w * 0.15], [0, top], '#f6faff');
          driehoek(g, [0, sb + w * 0.15], [w * 0.45, sb], [0, top], '#c9d8ea');
        }
      }
    } else {
      const tint = [['#8bd65a', '#64b84a', '#46963c', '#33762f'], ['#a5d95a', '#7cbc45', '#5a9a38', '#41782c'], ['#7fce6a', '#58b056', '#3f9048', '#2f703a']][variant % 3];
      const cx = 0;
      const cy = -T * (0.56 + variant * 0.06);
      const R = T * (0.3 + variant * 0.03);
      // een bol van vlakjes: een ring van punten rond een iets verschoven midden
      const n = 7;
      const ring = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2 + r() * 0.25;
        const rr = R * (0.88 + r() * 0.2);
        ring.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92]);
      }
      const m = [cx - R * 0.18, cy - R * 0.2];
      for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        // hoe meer naar linksboven, hoe lichter
        const hoek = Math.atan2((a[1] + b[1]) / 2 - cy, (a[0] + b[0]) / 2 - cx);
        const f = (Math.cos(hoek - (-2.4)) + 1) / 2;
        driehoek(g, m, a, b, tint[Math.min(3, Math.floor((1 - f) * 4))]);
      }
      // een tweede, kleinere bol bovenop voor wat meer vorm
      const m2 = [cx + R * 0.2, cy - R * 0.55];
      const r2 = R * 0.55;
      for (let i = 0; i < 5; i++) {
        const a0 = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / 5) * Math.PI * 2 - Math.PI / 2;
        const f = (Math.cos((a0 + a1) / 2 + 2.4) + 1) / 2;
        driehoek(g, [m2[0] - r2 * 0.2, m2[1] - r2 * 0.2], [m2[0] + Math.cos(a0) * r2, m2[1] + Math.sin(a0) * r2], [m2[0] + Math.cos(a1) * r2, m2[1] + Math.sin(a1) * r2], tint[Math.min(3, Math.floor((1 - f) * 3.2))]);
      }
    }
  }

  // Een palm: een gebogen stam van blokjes en bladeren als lange driehoeken.
  function lpPalm(g, T, variant) {
    g.fillStyle = 'rgba(10,20,30,.25)';
    g.beginPath();
    g.ellipse(0, 0, T * 0.26, T * 0.11, 0, 0, Math.PI * 2);
    g.fill();
    const buig = (variant - 1) * 0.08;
    let x = 0;
    let y = 0;
    for (let i = 0; i < 6; i++) {
      const nx = x + T * buig;
      const ny = y - T * 0.16;
      driehoek(g, [x - T * 0.05, y], [x + T * 0.05, y], [nx + T * 0.04, ny], i % 2 ? '#a0703c' : '#8a5c2e');
      driehoek(g, [x - T * 0.05, y], [nx + T * 0.04, ny], [nx - T * 0.04, ny], i % 2 ? '#7a5028' : '#6a4422');
      x = nx;
      y = ny;
    }
    const groen = ['#5fc45a', '#3f9a44', '#2f7a38'];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + variant;
      const lx = Math.cos(a) * T * 0.42;
      const ly = Math.sin(a) * T * 0.16 + T * 0.1;
      driehoek(g, [x, y], [x + lx, y + ly], [x + lx * 0.5, y + ly * 0.5 - T * 0.08], groen[i % 3]);
    }
    driehoek(g, [x - T * 0.05, y], [x + T * 0.05, y], [x, y - T * 0.06], '#7a5028');
  }

  // Een rotsblok van vlakjes.
  function lpRots(g, T, variant, rood = false) {
    const s = T * (0.32 + variant * 0.06);
    g.fillStyle = 'rgba(10,20,30,.28)';
    g.beginPath();
    g.ellipse(0, 0, s, s * 0.42, 0, 0, Math.PI * 2);
    g.fill();
    const top = [s * 0.1, -s * 1.15];
    const l = [-s, -s * 0.1];
    const r = [s, -s * 0.15];
    const v = [s * 0.05, s * 0.25];
    const m = [-s * 0.15, -s * 0.55];
    const kl = rood ? ['#6e4a42', '#523530', '#452c28', '#33201d'] : ['#8a7d9a', '#6c5f80', '#5e5272', '#463c5c'];
    driehoek(g, l, m, top, kl[0]);
    driehoek(g, m, r, top, kl[1]);
    driehoek(g, l, v, m, kl[2]);
    driehoek(g, m, v, r, kl[3]);
    if (rood) {
      // een gloeiende ader in de rots
      g.strokeStyle = '#ff7a3a';
      g.lineWidth = Math.max(1, T / 40);
      g.beginPath();
      g.moveTo(m[0], m[1]);
      g.lineTo((m[0] + v[0]) / 2 + s * 0.1, (m[1] + v[1]) / 2);
      g.lineTo(v[0], v[1] - s * 0.1);
      g.stroke();
    }
  }

  // Een verborgen runensteen: klein, met een gloeiende rune.
  function runeSteen(g, T) {
    const s = T * 0.16;
    g.fillStyle = 'rgba(76,201,255,.25)';
    g.beginPath();
    g.ellipse(0, 0, s * 1.6, s * 0.7, 0, 0, Math.PI * 2);
    g.fill();
    driehoek(g, [-s, 0], [0, s * 0.35], [-s * 0.2, -s * 1.9], '#7d88a3');
    driehoek(g, [0, s * 0.35], [s, 0], [-s * 0.2, -s * 1.9], '#545e78');
    g.strokeStyle = '#9ff3ff';
    g.lineWidth = Math.max(1, T / 40);
    g.beginPath();
    g.moveTo(-s * 0.35, -s * 1.2);
    g.lineTo(-s * 0.15, -s * 0.3);
    g.moveTo(-s * 0.15, -s * 0.8);
    g.lineTo(s * 0.2, -s * 1.05);
    g.stroke();
  }

  const eigenCache = new Map();
  // Tekeningen die niet in Mijn burcht bestaan: de werktafels van het labo, een kast en de binnenmuren.
  function eigenStuk(id, T, variant = 0) {
    const key = `${id}|${T}|${variant}`;
    if (eigenCache.has(key)) return eigenCache.get(key);
    const c = document.createElement('canvas');
    c.width = Math.ceil(T * 1.2);
    c.height = Math.ceil(T * (id.startsWith('lp') ? 2.4 : 2));
    const g = c.getContext('2d');
    const ax = c.width / 2;
    const ay = c.height - T * 0.35;
    g.translate(ax, ay);
    const schaduw = (gg, r) => {
      gg.fillStyle = 'rgba(10,20,30,.28)';
      gg.beginPath();
      gg.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2);
      gg.fill();
    };
    const rrect = (gg, x, y, w, h, r, kleur) => {
      gg.fillStyle = kleur;
      gg.beginPath();
      if (gg.roundRect) gg.roundRect(x, y, w, h, r);
      else gg.rect(x, y, w, h);
      gg.fill();
    };
    const tafel = () => {
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.beginPath();
      g.ellipse(0, 0, T * 0.4, T * 0.18, 0, 0, Math.PI * 2);
      g.fill();
      for (const [u, v] of [[-0.32, -0.32], [0.28, -0.32], [-0.32, 0.28], [0.28, 0.28]]) blok(g, T, u, u + 0.05, v, v + 0.05, 0, 0.3, '#3b2a1c');
      return blok(g, T, -0.36, 0.36, -0.36, 0.36, 0.3, 0.36, '#6b4a2c', '#8a6038');
    };
    if (id === 'lpden' || id === 'lpboom' || id === 'lpsneeuw') {
      lpBoom(g, T, id !== 'lpboom', variant, id === 'lpsneeuw');
    } else if (id === 'lppalm') {
      lpPalm(g, T, variant);
    } else if (id === 'lprots' || id === 'lprotsrood') {
      lpRots(g, T, variant, id === 'lprotsrood');
    } else if (id === 'koraal') {
      // een koraaltak: een paar dikke takjes met ronde puntjes
      const kl = [['#ff7aa8', '#d94f80'], ['#ff9a4a', '#d06a2a'], ['#c77dff', '#9050d0']][variant % 3];
      schaduw(g, T * 0.26);
      g.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.38;
        const l = T * (0.32 + ((i * 37 + variant * 11) % 5) * 0.05);
        const ex = Math.cos(a) * l;
        const ey = Math.sin(a) * l;
        g.strokeStyle = kl[i % 2];
        g.lineWidth = T * 0.08;
        g.beginPath();
        g.moveTo(0, -T * 0.02);
        g.quadraticCurveTo(ex * 0.3, ey * 0.6, ex, ey);
        g.stroke();
        g.fillStyle = BuArt.shade(kl[0], 0.25);
        g.beginPath();
        g.arc(ex, ey, T * 0.055, 0, Math.PI * 2);
        g.fill();
      }
    } else if (id === 'parelschelp') {
      // een grote schelp met een parel
      schaduw(g, T * 0.36);
      const R = T * 0.38;
      for (let i = 0; i < 7; i++) {
        const a0 = Math.PI + (i / 7) * Math.PI;
        const a1 = Math.PI + ((i + 1) / 7) * Math.PI;
        driehoek(g, [0, -T * 0.05], [Math.cos(a0) * R, -T * 0.05 + Math.sin(a0) * R * 0.9], [Math.cos(a1) * R, -T * 0.05 + Math.sin(a1) * R * 0.9], i % 2 ? '#ffb3cf' : '#ff8fb8');
      }
      g.fillStyle = '#f8f4ff';
      g.beginPath();
      g.arc(0, -T * 0.13, T * 0.09, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.fillRect(-T * 0.04, -T * 0.18, T * 0.03, T * 0.03);
    } else if (id === 'wrak') {
      // een scheef gezakt schip met een kapotte mast
      schaduw(g, T * 0.42);
      driehoek(g, [-T * 0.45, -T * 0.2], [T * 0.4, -T * 0.05], [T * 0.25, T * 0.08], '#7a5028');
      driehoek(g, [-T * 0.45, -T * 0.2], [T * 0.25, T * 0.08], [-T * 0.3, T * 0.02], '#5a3a1c');
      driehoek(g, [-T * 0.45, -T * 0.2], [T * 0.4, -T * 0.05], [T * 0.3, -T * 0.2], '#9a6a3a');
      g.strokeStyle = '#4a2e14';
      g.lineWidth = T * 0.04;
      g.beginPath();
      g.moveTo(-T * 0.02, -T * 0.12);
      g.lineTo(T * 0.1, -T * 0.85);
      g.stroke();
      driehoek(g, [T * 0.09, -T * 0.8], [T * 0.38, -T * 0.6], [T * 0.06, -T * 0.42], '#e8dcc0');
      driehoek(g, [T * 0.06, -T * 0.42], [T * 0.38, -T * 0.6], [T * 0.26, -T * 0.4], '#cbbd9e');
      g.fillStyle = '#ffc94a';
      g.fillRect(-T * 0.22, -T * 0.22, T * 0.1, T * 0.07);
    } else if (id === 'duikboot') {
      // een gele duikboot met patrijspoorten
      schaduw(g, T * 0.42);
      g.fillStyle = '#e0a020';
      g.beginPath();
      g.ellipse(0, -T * 0.22, T * 0.45, T * 0.2, -0.25, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffc94a';
      g.beginPath();
      g.ellipse(-T * 0.03, -T * 0.27, T * 0.4, T * 0.14, -0.25, 0, Math.PI * 2);
      g.fill();
      blok(g, T, -0.12, 0.08, -0.08, 0.08, 0.38, 0.62, '#ffc94a');
      g.strokeStyle = '#3a4160';
      g.lineWidth = T * 0.03;
      g.beginPath();
      g.moveTo(-T * 0.02, -T * 0.62);
      g.lineTo(-T * 0.02, -T * 0.78);
      g.lineTo(T * 0.08, -T * 0.78);
      g.stroke();
      for (let i = 0; i < 3; i++) {
        g.fillStyle = '#3a4160';
        g.beginPath();
        g.arc(-T * 0.22 + i * T * 0.18, -T * 0.18 - i * T * 0.045, T * 0.06, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#9ff3ff';
        g.beginPath();
        g.arc(-T * 0.22 + i * T * 0.18, -T * 0.18 - i * T * 0.045, T * 0.04, 0, Math.PI * 2);
        g.fill();
      }
    } else if (id === 'lpballon') {
      // een luchtballon met een mandje
      schaduw(g, T * 0.3);
      blok(g, T, -0.14, 0.14, -0.14, 0.14, 0, 0.22, '#8a5c2e', '#a0703c');
      g.strokeStyle = '#5a3a1c';
      g.lineWidth = T * 0.015;
      g.beginPath();
      g.moveTo(-T * 0.12, -T * 0.24);
      g.lineTo(-T * 0.28, -T * 0.8);
      g.moveTo(T * 0.12, -T * 0.24);
      g.lineTo(T * 0.28, -T * 0.8);
      g.stroke();
      const cy = -T * 1.2;
      const R = T * 0.48;
      const kl = ['#ff5a5a', '#ffffff', '#ffc94a', '#ffffff', '#ff5a5a', '#4cc9ff'];
      for (let i = 0; i < 6; i++) {
        const a0 = -Math.PI / 2 - Math.PI / 2 + (i / 6) * Math.PI;
        const a1 = a0 + Math.PI / 6;
        g.fillStyle = kl[i];
        g.beginPath();
        g.moveTo(0, cy + R * 1.05);
        g.lineTo(Math.cos(a0 - Math.PI / 2) * R, cy + Math.sin(a0 - Math.PI / 2) * R);
        g.arc(0, cy, R, a0 - Math.PI / 2, a1 - Math.PI / 2);
        g.closePath();
        g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,.12)';
      g.beginPath();
      g.arc(0, cy, R, -Math.PI / 2, Math.PI / 2);
      g.lineTo(0, cy + R * 1.05);
      g.fill();
    } else if (id === 'drijfbak') {
      // een bak water met een kurk die drijft en een steen op de bodem
      tafel();
      blok(g, T, -0.3, 0.3, -0.25, 0.25, 0.36, 0.66, '#2fa0d0', 'rgba(140,220,255,.85)');
      const P = (u, v, z) => [(u - v) * T / 2, (u + v) * T / 4 - z * T];
      const [kx, ky] = P(-0.1, 0, 0.68);
      g.fillStyle = '#c08a50';
      g.fillRect(kx - T * 0.05, ky - T * 0.05, T * 0.1, T * 0.06);
      const [sx, sy] = P(0.15, 0.2, 0.42);
      g.fillStyle = '#5e5272';
      g.beginPath();
      g.arc(sx, sy, T * 0.04, 0, Math.PI * 2);
      g.fill();
    } else if (id === 'thermometer') {
      // een grote thermometer op een tafel
      const P = tafel();
      const [x, y] = P(0, 0, 0.36);
      rrect(g, x - T * 0.05, y - T * 0.75, T * 0.1, T * 0.7, T * 0.05, '#e8eef8');
      g.fillStyle = '#ff4d6d';
      g.fillRect(x - T * 0.02, y - T * 0.5, T * 0.04, T * 0.42);
      g.beginPath();
      g.arc(x, y - T * 0.06, T * 0.075, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#3a4160';
      for (let i = 0; i < 6; i++) g.fillRect(x + T * 0.05, y - T * 0.2 - i * T * 0.09, T * 0.04, T * 0.012);
    } else if (id === 'lpneontoren') {
      // een hoge toren met neonstrepen
      const kl = ['#4cc9ff', '#ff70c8', '#2ee6a6'][variant % 3];
      const h = 1.2 + variant * 0.25;
      blok(g, T, -0.3, 0.3, -0.3, 0.3, 0, h, '#252c4a', '#38406a');
      const P = (u, v, z) => [(u - v) * T / 2, (u + v) * T / 4 - z * T];
      g.strokeStyle = kl;
      g.lineWidth = Math.max(1.5, T / 30);
      for (let i = 1; i < h * 4; i++) {
        const z = i * 0.25;
        g.beginPath();
        g.moveTo(...P(-0.3, 0.3, z));
        g.lineTo(...P(0.3, 0.3, z));
        g.lineTo(...P(0.3, -0.3, z));
        g.stroke();
      }
      g.fillStyle = kl;
      g.beginPath();
      g.arc(...P(0, 0, h + 0.08), T * 0.05, 0, Math.PI * 2);
      g.fill();
    } else if (id === 'holobord') {
      // een zwevend hologrambord
      const kl = ['76,201,255', '255,112,200', '46,230,166'][variant % 3];
      schaduw(g, T * 0.2);
      g.fillStyle = '#3a4160';
      g.fillRect(-T * 0.03, -T * 0.5, T * 0.06, T * 0.5);
      g.fillStyle = `rgba(${kl},.3)`;
      g.strokeStyle = `rgba(${kl},.95)`;
      g.lineWidth = Math.max(1, T / 50);
      g.beginPath();
      g.moveTo(-T * 0.35, -T * 0.55);
      g.lineTo(T * 0.35, -T * 0.72);
      g.lineTo(T * 0.35, -T * 1.12);
      g.lineTo(-T * 0.35, -T * 0.95);
      g.closePath();
      g.fill();
      g.stroke();
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-T * 0.25, -T * (0.68 + i * 0.1));
        g.lineTo(T * (0.05 + i * 0.08), -T * (0.75 + i * 0.1));
        g.stroke();
      }
    } else if (id === 'zonnepaneel') {
      // een schuin zonnepaneel op een paaltje
      g.fillStyle = '#5a6478';
      g.fillRect(-T * 0.03, -T * 0.3, T * 0.06, T * 0.3);
      const P = (u, v, z) => [(u - v) * T / 2, (u + v) * T / 4 - z * T];
      g.fillStyle = '#1d3f8a';
      g.strokeStyle = '#7fb8ff';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(...P(-0.45, -0.45, 0.45));
      g.lineTo(...P(0.45, -0.45, 0.45));
      g.lineTo(...P(0.45, 0.45, 0.25));
      g.lineTo(...P(-0.45, 0.45, 0.25));
      g.closePath();
      g.fill();
      g.stroke();
      for (let i = 1; i < 3; i++) {
        const f = -0.45 + i * 0.3;
        g.beginPath();
        g.moveTo(...P(f, -0.45, 0.45));
        g.lineTo(...P(f, 0.45, 0.25));
        g.moveTo(...P(-0.45, f, 0.45 - (f + 0.45) * 0.22));
        g.lineTo(...P(0.45, f, 0.45 - (f + 0.45) * 0.22));
        g.stroke();
      }
    } else if (id === 'lpantenne') {
      // een hoge antenne met een schotel en een knipperlicht
      schaduw(g, T * 0.2);
      g.strokeStyle = '#c8d0e0';
      g.lineWidth = Math.max(1.5, T / 30);
      g.beginPath();
      g.moveTo(-T * 0.15, 0);
      g.lineTo(0, -T * 1.4);
      g.lineTo(T * 0.15, 0);
      g.moveTo(-T * 0.1, -T * 0.4);
      g.lineTo(T * 0.1, -T * 0.4);
      g.moveTo(-T * 0.06, -T * 0.85);
      g.lineTo(T * 0.06, -T * 0.85);
      g.stroke();
      g.fillStyle = '#e8eef8';
      g.beginPath();
      g.ellipse(T * 0.1, -T * 1.0, T * 0.16, T * 0.08, -0.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ff4d6d';
      g.beginPath();
      g.arc(0, -T * 1.44, T * 0.04, 0, Math.PI * 2);
      g.fill();
    } else if (id === 'mijnkar') {
      // een mijnkarretje vol kristallen
      schaduw(g, T * 0.34);
      for (const [u, v] of [[-0.2, 0.22], [0.2, 0.22], [0.22, -0.18]]) {
        const P = (uu, vv, z) => [(uu - vv) * T / 2, (uu + vv) * T / 4 - z * T];
        const [wx, wy] = P(u, v, 0.06);
        g.fillStyle = '#2a2a34';
        g.beginPath();
        g.arc(wx, wy, T * 0.06, 0, Math.PI * 2);
        g.fill();
      }
      blok(g, T, -0.3, 0.3, -0.22, 0.22, 0.06, 0.36, '#7a5a3a', '#3a2a1c');
      const P = (u, v, z) => [(u - v) * T / 2, (u + v) * T / 4 - z * T];
      for (const [u, v, kl] of [[-0.12, 0, '#4cc9ff'], [0.08, -0.06, '#ff7aa8'], [0.14, 0.08, '#c77dff']]) {
        const [x, y] = P(u, v, 0.36);
        driehoek(g, [x, y - T * 0.2], [x - T * 0.07, y], [x, y + T * 0.03], BuArt.shade(kl, 0.3));
        driehoek(g, [x, y - T * 0.2], [x, y + T * 0.03], [x + T * 0.07, y], kl);
      }
    } else if (id === 'krater') {
      // een krater: een donkere kom met een lichte rand
      const R = T * (0.3 + variant * 0.05);
      g.fillStyle = '#d6d6e0';
      g.beginPath();
      g.ellipse(0, -T * 0.02, R * 1.15, R * 0.55, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#7a7a8e';
      g.beginPath();
      g.ellipse(0, 0, R * 0.85, R * 0.38, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#5e5e72';
      g.beginPath();
      g.ellipse(T * 0.03, R * 0.06, R * 0.6, R * 0.24, 0, 0, Math.PI * 2);
      g.fill();
    } else if (id === 'maankoepel') {
      // een glazen koepel met plantjes erin
      schaduw(g, T * 0.42);
      g.fillStyle = '#8e8ea3';
      g.beginPath();
      g.ellipse(0, 0, T * 0.42, T * 0.18, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#5fc45a';
      g.beginPath();
      g.ellipse(0, -T * 0.03, T * 0.3, T * 0.12, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(160,230,255,.45)';
      g.beginPath();
      g.ellipse(0, -T * 0.02, T * 0.4, T * 0.4, 0, Math.PI, 0);
      g.fill();
      g.strokeStyle = 'rgba(220,245,255,.9)';
      g.lineWidth = Math.max(1, T / 40);
      g.beginPath();
      g.ellipse(0, -T * 0.02, T * 0.4, T * 0.4, 0, Math.PI, 0);
      g.moveTo(-T * 0.2, -T * 0.37);
      g.quadraticCurveTo(-T * 0.08, -T * 0.2, -T * 0.06, -T * 0.02);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.8)';
      g.fillRect(-T * 0.22, -T * 0.3, T * 0.05, T * 0.05);
    } else if (id === 'rune') {
      runeSteen(g, T);
    } else if (id === 'stroom') {
      const P = tafel();
      blok(g, T, -0.25, -0.05, -0.15, 0.05, 0.36, 0.5, '#ffc94a');
      blok(g, T, -0.2, -0.1, -0.1, 0.0, 0.5, 0.54, '#d0d8e8');
      g.strokeStyle = '#4cc9ff';
      g.lineWidth = T / 40;
      g.beginPath();
      g.moveTo(...P(-0.05, -0.05, 0.42));
      g.lineTo(...P(0.18, -0.05, 0.37));
      g.lineTo(...P(0.18, 0.15, 0.37));
      g.stroke();
      const [lx, ly] = P(0.18, 0.15, 0.5);
      g.fillStyle = '#ffe08a';
      g.beginPath();
      g.arc(lx, ly, T * 0.07, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.fillRect(lx - T * 0.02, ly - T * 0.03, T * 0.03, T * 0.03);
    } else if (id === 'tandwiel') {
      const P = tafel();
      const wiel = (u, v, r, kleur) => {
        const [x, y] = P(u, v, 0.36);
        g.save();
        g.translate(x, y - r * 0.9);
        g.fillStyle = kleur;
        g.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const rr = i % 2 ? r : r * 0.78;
          g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
        g.fillStyle = '#3b2a1c';
        g.beginPath();
        g.arc(0, 0, r * 0.25, 0, Math.PI * 2);
        g.fill();
        g.restore();
      };
      wiel(-0.12, 0, T * 0.17, '#c8d4ea');
      wiel(0.16, 0.06, T * 0.12, '#ffc94a');
    } else if (id === 'wip') {
      const P = tafel();
      const [x, y] = P(0, 0, 0.36);
      g.fillStyle = '#8aa0c0';
      g.beginPath();
      g.moveTo(x - T * 0.06, y);
      g.lineTo(x + T * 0.06, y);
      g.lineTo(x, y - T * 0.1);
      g.fill();
      g.save();
      g.translate(x, y - T * 0.1);
      g.rotate(-0.12);
      g.fillStyle = '#c8d4ea';
      g.fillRect(-T * 0.3, -T * 0.02, T * 0.6, T * 0.03);
      g.fillStyle = '#ff4d6d';
      g.fillRect(-T * 0.27, -T * 0.09, T * 0.07, T * 0.07);
      g.fillStyle = '#4cc9ff';
      g.fillRect(T * 0.16, -T * 0.07, T * 0.06, T * 0.05);
      g.restore();
    } else if (id === 'kast') {
      blok(g, T, -0.42, 0.42, -0.2, 0.3, 0, 0.9, '#4a3220');
      const P = (u, v, z) => [(u - v) * T / 2, (u + v) * T / 4 - z * T];
      const kleuren = ['#ff70c8', '#4cc9ff', '#ffc94a', '#2ee6a6', '#c77dff'];
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < 5; i++) {
          const [x, y] = P(-0.36 + i * 0.15, 0.3, 0.18 + r * 0.26);
          g.fillStyle = kleuren[(i + r * 2) % 5];
          g.fillRect(x, y - T * 0.13, T * 0.05, T * 0.13);
        }
        const a = P(-0.42, 0.3, 0.14 + r * 0.26);
        const b = P(0.42, 0.3, 0.14 + r * 0.26);
        g.strokeStyle = '#2b1d11';
        g.lineWidth = T / 50;
        g.beginPath();
        g.moveTo(...a);
        g.lineTo(...b);
        g.stroke();
      }
    } else if (id === 'binnenmuur') {
      blok(g, T, -0.5, 0.5, -0.5, 0.5, 0, 0.75, '#28324f', '#3a4870');
      g.strokeStyle = 'rgba(76,201,255,.8)';
      g.lineWidth = T / 36;
      const P = (u, v, z) => [(u - v) * T / 2, (u + v) * T / 4 - z * T];
      g.beginPath();
      g.moveTo(...P(-0.5, 0.5, 0.5));
      g.lineTo(...P(0.5, 0.5, 0.5));
      g.lineTo(...P(0.5, -0.5, 0.5));
      g.stroke();
    }
    const hit = { c, ax, ay };
    eigenCache.set(key, hit);
    return hit;
  }

  // Alle vaste stukken van een kaart, al in de goede volgorde (van achter naar voor).
  // gevonden: de runenstenen die al opgeraapt zijn ("kaart:x,y"); die staan er niet meer.
  function stukken(k, gevonden = [], gebouwd = []) {
    const out = [];
    for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) {
      const c = teken(k, x, y);
      let st = null;
      if (c === 'T') st = { eigen: hash(x, y, 1) < 0.5 ? 'lpboom' : 'lpden', v: Math.floor(hash(x, y, 3) * 3) };
      else if (c === 'k') st = { bu: 'kristal', kleur: '#4cc9ff' };
      else if (c === 'f') st = k.id === 'vuur' ? { bu: 'kampvuur', kleur: '#ff7a3a' } : { bu: 'fakkel', kleur: '#4cc9ff' };
      else if (c === 'R') st = { bu: 'muur', kleur: '#6b5bd6', muur: true };
      else if (c === 'p') st = { bu: 'banier', kleur: '#2ee6a6', plek: 'bord' };
      else if (c === 'x') st = { eigen: 'kast' };
      else if (c === 'v') st = { bu: 'lichtpaal', kleur: '#2ee6a6' };
      else if (c === 'W') st = { eigen: 'binnenmuur' };
      else if (c === 'Y') st = { eigen: 'lppalm', v: Math.floor(hash(x, y, 3) * 3) };
      else if (c === 'K') st = { eigen: k.id === 'vuur' ? 'lprotsrood' : 'lprots', v: Math.floor(hash(x, y, 3) * 3) };
      else if (c === 'G') st = { bu: 'robodraak', kleur: '#ff5a5a' };
      else if (c === 'M') st = { bu: 'molen', kleur: '#ffc94a' };
      else if (c === 'X') st = { bu: 'ruimteschip', kleur: '#4cc9ff' };
      else if (c === 'L') st = { bu: 'ruimteschip', kleur: '#ffc94a', plek: 'luchtschip' };
      else if (c === 'P') st = { bu: 'portaal', kleur: '#c77dff', plek: 'sterrenpoort' };
      else if (c === 'N') st = { bu: 'draak', kleur: '#ff5a5a', plek: 'drakenzadel' };
      else if (c === 'O') st = { bu: 'ruimteschip', kleur: '#bff3ff', plek: 'ijsraket' };
      else if (c === 'B') st = { eigen: 'lpsneeuw', v: Math.floor(hash(x, y, 3) * 3) };
      else if (c === 'n') st = { eigen: 'koraal', v: Math.floor(hash(x, y, 3) * 3) };
      else if (c === 'j') st = { bu: 'lichtpaal', kleur: '#ffe08a' };
      else if (c === 'Z') st = { eigen: 'duikboot', plek: 'duikboot' };
      else if (c === '9') st = { bu: 'wachttoren', kleur: '#a0703c', plek: 'mijnlift' };
      else if (c === '/') st = { bu: 'ruimteschip', kleur: '#ff7aa8', plek: 'maanraket' };
      else if (c === '0') st = gebouwd.includes('kroonburcht') ? { bu: 'donjon', kleur: '#ffc94a', plek: 'kroonburcht' } : { bu: 'banier', kleur: '#ffc94a', plek: 'kroonburcht' };
      else if (c === '#') st = { eigen: 'mijnkar' };
      else if (c === '*') st = { bu: 'ruimteschip', kleur: '#4cc9ff', plek: 'hyperloop' };
      else if (c === ';') st = { bu: 'ruimteschip', kleur: '#ffffff', plek: 'shuttle' };
      else if (c === '@') st = { eigen: 'lpneontoren', v: Math.floor(hash(x, y, 3) * 3) };
      else if (c === '!') st = { eigen: 'holobord', v: Math.floor(hash(x, y, 3) * 3) };
      else if (c === '-') st = { eigen: 'zonnepaneel' };
      else if (c === '|') st = { eigen: 'lpantenne' };
      else if (c === '%') st = { eigen: 'krater', v: Math.floor(hash(x, y, 3) * 3) };
      else if (c === '^') st = { eigen: 'maankoepel' };
      else if (c === 'I') st = { eigen: 'lpballon', plek: 'luchtballon' };
      else if (c === 'J' && !gevonden.includes(`${k.id}:${x},${y}`)) st = { eigen: 'rune', rune: true };
      else if (STATION[c]) {
        const id = STATION[c];
        st = STUK[id] ? { bu: STUK[id], kleur: STUKKLEUR[id] || '#ffc94a', plek: id } : { eigen: id, plek: id };
      }
      if (st) out.push({ x, y, ...st });
    }
    // Het labo: één groot gebouw op 2 op 2 vakjes, getekend vanaf het voorste vakje.
    const h = vind(k, 'H');
    if (h) out.push({ x: h.x + 1, y: h.y + 1, groot: 'huisje', kleur: { koraal: '#4cc9ff', wolk: '#c77dff' }[k.id] || '#2ee6a6', labo: true, dx: -0.5, dy: -0.5 });
    out.sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);
    return out;
  }

  function sprite(st, k, T) {
    if (st.eigen) return eigenStuk(st.eigen, T, st.v || 0);
    if (st.groot) return BuArt.stuk(st.groot, st.kleur, T * 2, {}, 0);
    let n = {};
    if (st.muur) {
      const m = (x, y) => teken(k, x, y) === 'R' || teken(k, x, y) === 'c';
      n = { xp: m(st.x + 1, st.y), xm: m(st.x - 1, st.y), yp: m(st.x, st.y + 1), ym: m(st.x, st.y - 1) };
    }
    return BuArt.stuk(st.bu, st.kleur, T, n, Math.floor(hash(st.x, st.y, 2) * 4));
  }

  // De gloed van kristallen, fakkels en de plekken (BuArt rekent de plaatsen uit).
  function gloeiers(k, T, ox, oy) {
    const lijst = stukken(k);
    const op = new Map(lijst.filter(s => s.bu).map(s => [`${s.x},${s.y}`, s]));
    return BuArt.gloeiers({
      w: k.w, h: k.h,
      land: (x, y) => op.has(`${x},${y}`),
      stuk: (x, y) => { const s = op.get(`${x},${y}`); return s ? { id: s.bu } : null; },
      vloer: () => 'gras',
    }, T, ox, oy, { glinster: false });
  }

  // Alle runenstenen in alle kaarten ("kaart:x,y"), ook voor de server.
  function runen() {
    const out = [];
    for (const id of Object.keys(KAARTEN)) {
      const k = kaart(id);
      for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) if (teken(k, x, y) === 'J') out.push(`${id}:${x},${y}`);
    }
    return out;
  }

  return { KAARTEN, STATION, STUK, BOUWPLEK, REIS, kaart, teken, loopbaar, plekken, vind, maat, bak, stukken, sprite, gloeiers, eigenStuk, runen };
})();
if (typeof module === 'object' && module.exports) module.exports = OdWereld;
