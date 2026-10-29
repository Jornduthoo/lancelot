// De Klasindeling in de Wapenkamer: bouw je eigen lokaal na (banken, bord, deur, ramen, kasten en leuke accenten)
// en laat de leerlingen van Mijn klas vanzelf over de banken verdelen. Slepen om te wisselen, vastzetten, plaatsen dicht.
// Het lokaal is een rooster van vakjes; elk stuk heeft een plaats (x, y) en een draaiing (r = 0 tot 3, per kwart).
// De server bewaart alles in klas/klasindeling/ (gaat mee met Mijn lesmap); per plaats id én naam van de leerling.
// Gebruikt socket, klas, vakgroepen, aanwezigen, $, esc, schud en bewaarLees uit wapenkamer.js.
const Indeling = (() => {
  // ---------- De stukken ----------
  // w × h vakjes (ongedraaid), plaatsen = [x, y] van elk naamkaartje, muur = staat altijd tegen een muur,
  // laag 0 ligt op de vloer (onder de rest), kleuren = hoeveel kleuren je kunt kiezen.
  const HOUT = 'url(#ki-g-blad)', RAND = '#5a3a1c';
  const tafel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.6" fill="${HOUT}" stroke="${RAND}" stroke-width=".9"/><rect x="${x + 1.2}" y="${y + 1}" width="${w - 2.4}" height="1" rx=".5" fill="#fff" opacity=".22"/>`;
  // Een stoel; de leuning aan de kant van de rug (onder = de leerling kijkt naar voren).
  const stoel = (cx, cy, rug = 1) => `<rect x="${cx - 3.6}" y="${cy - 3}" width="7.2" height="6" rx="1.8" fill="url(#ki-g-stoel)" stroke="#123a55" stroke-width=".7"/><path d="M${cx - 3.8} ${cy + rug * 3.4} Q${cx} ${cy + rug * 5.6} ${cx + 3.8} ${cy + rug * 3.4}" fill="none" stroke="#0e2f45" stroke-width="1.6" stroke-linecap="round"/>`;
  const rij = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
  // De naamkaartjes rond de Ridderronde: zes plaatsen op een cirkel.
  function rij6() { return Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3 - Math.PI / 2; return [+(3 + Math.cos(a) * 1.68).toFixed(2), +(3 + Math.sin(a) * 1.68).toFixed(2)]; }); }
  const KLEUR = [['#b8323e', '#6a1220'], ['#2c62b8', '#122d63'], ['#2f8a4c', '#11411f'], ['#7a3fa0', '#3a1452'], ['#d9a632', '#7a5310'], ['#d9621a', '#6a2a05']];

  const STUK = {
    bank: { naam: 'Bank', w: 2, h: 2, groep: 'banken', plaatsen: [[1, .58]], teken: () => tafel(1, 1, 18, 9.5) + stoel(10, 15) },
    duo: { naam: 'Duobank', w: 4, h: 2, groep: 'banken', plaatsen: [[1, .58], [3, .58]], teken: () => tafel(1, 1, 38, 9.5) + stoel(10, 15) + stoel(30, 15) },
    trio: { naam: 'Driebank', w: 6, h: 2, groep: 'banken', plaatsen: [[1, .58], [3, .58], [5, .58]], teken: () => tafel(1, 1, 58, 9.5) + rij(3, i => stoel(10 + i * 20, 15)) },
    groep: { naam: 'Groepstafel', w: 4, h: 4, groep: 'banken', plaatsen: [[1, 1.42], [3, 1.42], [1, 2.58], [3, 2.58]],
      teken: () => tafel(1.5, 8.5, 37, 23) + stoel(10, 4.6, -1) + stoel(30, 4.6, -1) + stoel(10, 35.4) + stoel(30, 35.4) },
    zes: { naam: 'Zestafel', w: 6, h: 4, groep: 'banken', plaatsen: [[1, 1.42], [3, 1.42], [5, 1.42], [1, 2.58], [3, 2.58], [5, 2.58]],
      teken: () => tafel(1.5, 8.5, 57, 23) + rij(3, i => stoel(10 + i * 20, 4.6, -1) + stoel(10 + i * 20, 35.4)) },
    bureau: { naam: 'Bureau juf/meester', w: 4, h: 2, groep: 'lokaal',
      teken: () => `<rect x="10" y="1" width="20" height="5" rx="2" fill="#3b2412"/><rect x="13" y="0" width="14" height="3" rx="1.4" fill="#5a3a1c"/>
        <rect x="1" y="5" width="38" height="14" rx="1.6" fill="url(#ki-g-donker)" stroke="#2a1808" stroke-width="1"/>
        <rect x="5" y="8" width="11" height="7" rx=".8" fill="#1c2233" stroke="#5ee7ff" stroke-width=".6"/><rect x="6" y="9" width="9" height="4.6" fill="#2a6f99" opacity=".8"/>
        <rect x="21" y="8.5" width="8" height="6" fill="#f4ecd8" transform="rotate(-8 25 11.5)"/><rect x="23" y="9" width="8" height="6" fill="#fffaf0" transform="rotate(6 27 12)"/>
        <circle cx="34.5" cy="12" r="2.4" fill="#c9962e"/><circle cx="34.5" cy="12" r="1.4" fill="#5a3005"/>` },
    bord: { naam: 'Digibord', w: 8, h: 1, groep: 'lokaal', muur: true,
      teken: () => `<rect x="0" y="0" width="80" height="3" fill="#59607a"/><rect x="2" y="1" width="76" height="6" rx="1" fill="#0b1a2e" stroke="#9aa2b2" stroke-width="1"/>
        <rect x="4" y="2.4" width="72" height="3.2" fill="url(#ki-g-scherm)"/><rect x="6" y="7" width="68" height="2" rx="1" fill="#9aa2b2"/>` },
    deur: { naam: 'Deur', w: 3, h: 1, groep: 'lokaal', muur: true,
      teken: () => `<rect x="0" y="0" width="30" height="2.4" fill="#3a4258"/><rect x="2" y="0" width="26" height="2.4" fill="#e9dfc8"/>
        <path d="M3 2.4 A 24 24 0 0 0 27 2.4" fill="none" stroke="#c9d6ea" stroke-width=".6" stroke-dasharray="1.6 1.2" opacity=".8" transform="scale(1 .3)" transform-origin="0 2.4"/>
        <rect x="3" y="1.2" width="2.2" height="8.6" fill="#8a5a2f" stroke="#3b2412" stroke-width=".6" transform="rotate(-62 4 2)"/>
        <circle cx="27" cy="1.3" r="1" fill="#c9962e"/>` },
    raam: { naam: 'Raam', w: 4, h: 1, groep: 'lokaal', muur: true,
      teken: () => `<rect x="0" y="0" width="40" height="4" fill="#3a4258"/><rect x="1.5" y=".8" width="37" height="2.6" fill="url(#ki-g-glas)" stroke="#e6edf7" stroke-width=".7"/>
        <path d="M20 .8 V3.4 M10.75 .8 V3.4 M29.25 .8 V3.4" stroke="#e6edf7" stroke-width=".6"/><rect x="1" y="4" width="38" height="1.6" fill="#c9d6ea" opacity=".7"/>` },
    kast: { naam: 'Kast', w: 4, h: 1, groep: 'lokaal',
      teken: () => `<rect x=".5" y=".5" width="39" height="9" rx="1" fill="url(#ki-g-donker)" stroke="#2a1808" stroke-width="1"/>
        <path d="M20 1 V9" stroke="#2a1808" stroke-width=".8"/><circle cx="18" cy="6" r=".9" fill="#c9962e"/><circle cx="22" cy="6" r=".9" fill="#c9962e"/>` },
    boeken: { naam: 'Boekenkast', w: 4, h: 1, groep: 'lokaal',
      teken: () => `<rect x=".5" y=".5" width="39" height="9" rx=".8" fill="#5a3a1c" stroke="#2a1808" stroke-width="1"/>` +
        rij(12, i => `<rect x="${2 + i * 3}" y="${1.6 + (i % 3) * .5}" width="2.6" height="${6.6 - (i % 3) * .5}" rx=".4" fill="${['#c0183c', '#2a5fd0', '#d99a1c', '#12996c', '#7c45d0', '#e9dfc8'][i % 6]}"/>`) },
    wasbak: { naam: 'Wasbak', w: 2, h: 1, groep: 'lokaal',
      teken: () => `<rect x="1" y=".5" width="18" height="9" rx="2" fill="#e6edf7" stroke="#9aa2b2" stroke-width=".8"/><rect x="4" y="2.5" width="12" height="5.6" rx="2.4" fill="#b9c6d8"/>
        <rect x="9" y=".6" width="2" height="3" rx=".6" fill="#7d8596"/><circle cx="10" cy="5.3" r=".8" fill="#59607a"/>` },
    kapstok: { naam: 'Kapstok', w: 4, h: 1, groep: 'lokaal',
      teken: () => `<rect x="0" y="0" width="40" height="2" fill="#8a5a2f"/>` + rij(6, i => `<circle cx="${4 + i * 6.4}" cy="${5}" r="3.2" fill="${KLEUR[i % 6][0]}" stroke="${KLEUR[i % 6][1]}" stroke-width=".7"/>`) },
    computer: { naam: 'Computer', w: 2, h: 2, groep: 'lokaal',
      teken: () => tafel(1, 1, 18, 11) + `<rect x="5" y="2" width="10" height="2.4" rx=".6" fill="#1c2233"/><rect x="6" y="2.6" width="8" height="1.2" fill="#5ee7ff" opacity=".7"/>
        <rect x="5" y="6" width="10" height="3.4" rx=".6" fill="#2a2f3c"/>` + stoel(10, 15.5) },
    tapijt: { naam: 'Tapijt', w: 6, h: 4, groep: 'accent', laag: 0, kleuren: 6,
      teken: k => `<rect x="1" y="1" width="58" height="38" rx="2" fill="${KLEUR[k][0]}"/><rect x="4" y="4" width="52" height="32" rx="1.4" fill="none" stroke="#f3dfb7" stroke-width="1.2" stroke-dasharray="3 1.6"/>
        <rect x="8" y="8" width="44" height="24" rx="1" fill="${KLEUR[k][1]}" opacity=".55"/><path d="M30 12 L36 20 L30 28 L24 20Z" fill="#f3dfb7" opacity=".7"/>` },
    kring: { naam: 'Kringtapijt', w: 6, h: 6, groep: 'accent', laag: 0, kleuren: 6,
      teken: k => `<circle cx="30" cy="30" r="29" fill="${KLEUR[k][0]}"/><circle cx="30" cy="30" r="24" fill="none" stroke="#f3dfb7" stroke-width="1.2" stroke-dasharray="3 1.8"/>
        <circle cx="30" cy="30" r="16" fill="${KLEUR[k][1]}" opacity=".6"/><circle cx="30" cy="30" r="6" fill="#f3dfb7" opacity=".75"/>` },
    leeshoek: { naam: 'Leeshoek (zetel)', w: 4, h: 2, groep: 'accent', kleuren: 6,
      teken: k => `<rect x="1" y="1" width="38" height="18" rx="4" fill="${KLEUR[k][1]}"/><rect x="1" y="1" width="38" height="6" rx="3" fill="${KLEUR[k][0]}" opacity=".9"/>
        <rect x="1" y="1" width="5" height="18" rx="2.5" fill="${KLEUR[k][0]}"/><rect x="34" y="1" width="5" height="18" rx="2.5" fill="${KLEUR[k][0]}"/>
        <rect x="7" y="8" width="12.5" height="10" rx="2" fill="${KLEUR[k][0]}" opacity=".75"/><rect x="20.5" y="8" width="12.5" height="10" rx="2" fill="${KLEUR[k][0]}" opacity=".75"/>` },
    zitzak: { naam: 'Zitzak', w: 2, h: 2, groep: 'accent', kleuren: 6,
      teken: k => `<path d="M10 1.5 C17 1 19.5 6 18.8 11 C18 17 14 19 9.5 18.6 C4 18 1 14.5 1.4 9.5 C1.8 4.5 5 2 10 1.5Z" fill="${KLEUR[k][0]}" stroke="${KLEUR[k][1]}" stroke-width="1"/>
        <ellipse cx="10" cy="11" rx="5" ry="4" fill="${KLEUR[k][1]}" opacity=".45"/><ellipse cx="7" cy="6" rx="2.6" ry="1.4" fill="#fff" opacity=".25"/>` },
    plant: { naam: 'Plant', w: 1, h: 1, groep: 'accent',
      teken: () => `<circle cx="5" cy="5" r="3.4" fill="#b8561c" stroke="#5a2405" stroke-width=".6"/>` +
        rij(7, i => { const a = i * 0.9; return `<ellipse cx="${5 + Math.cos(a) * 2.4}" cy="${5 + Math.sin(a) * 2.4}" rx="2.4" ry="1.1" fill="${i % 2 ? '#2f8a4c' : '#46b06a'}" transform="rotate(${a * 57.3} ${5 + Math.cos(a) * 2.4} ${5 + Math.sin(a) * 2.4})"/>`; }) },
    wereldbol: { naam: 'Wereldbol', w: 1, h: 1, groep: 'accent',
      teken: () => `<circle cx="5" cy="5" r="4.4" fill="#c9962e"/><circle cx="5" cy="5" r="3.6" fill="#2a6fc9"/>
        <path d="M2.6 3.6 C3.6 2.6 5 3 4.6 4.4 C4.3 5.4 3 5.6 2.6 4.6Z M5.6 5 C6.8 4.6 7.8 5.6 7.2 6.8 C6.6 7.8 5.4 7.4 5.4 6.4Z M5.4 2.2 C6.4 2 7.4 2.6 7 3.2 C6.4 3.6 5.6 3.2 5.4 2.2Z" fill="#46b06a"/>` },
    aquarium: { naam: 'Aquarium', w: 3, h: 1, groep: 'accent',
      teken: () => `<rect x=".5" y=".5" width="29" height="9" rx="1" fill="#1d6fa0" stroke="#c9d6ea" stroke-width="1"/><rect x="1.5" y="1.5" width="27" height="2" fill="#7fdcff" opacity=".35"/>
        <path d="M8 5 l3 -1.6 v3.2Z M6 5 a2 1.3 0 1 0 2.4 0 a2 1.3 0 1 0 -2.4 0" fill="#ff8c42"/><path d="M20 6.4 l2.4 -1.2 v2.4Z M18.4 6.4 a1.6 1 0 1 0 2 0 a1.6 1 0 1 0 -2 0" fill="#ffc94a"/>
        <path d="M14 9 q1 -3 0 -5 M25 9 q-1 -2.4 .4 -4" stroke="#46b06a" stroke-width=".8" fill="none"/>` },
    prullenbak: { naam: 'Vuilbak', w: 1, h: 1, groep: 'accent',
      teken: () => `<circle cx="5" cy="5" r="3.8" fill="#59607a" stroke="#2a2f3c" stroke-width=".8"/><circle cx="5" cy="5" r="2.8" fill="#2a2f3c"/><circle cx="4.4" cy="4.6" r="1.2" fill="#f4ecd8"/>` },
    schatkist: { naam: 'Schatkist', w: 2, h: 1, groep: 'accent',
      teken: () => `<rect x="1" y="1" width="18" height="8" rx="1.4" fill="#8a5a2f" stroke="#3b2412" stroke-width=".8"/><path d="M5 1 V9 M15 1 V9" stroke="#d9a632" stroke-width="1.4"/>
        <rect x="8.6" y="3.6" width="2.8" height="2.8" rx=".5" fill="#ffc94a" stroke="#6e4a0c" stroke-width=".5"/><circle cx="3" cy="3" r=".6" fill="#5ee7ff"/>` },
    harnas: { naam: 'Ridderharnas', w: 1, h: 1, groep: 'accent',
      teken: () => `<ellipse cx="5" cy="5.6" rx="4.4" ry="3" fill="#7d8596" stroke="#2a2f3c" stroke-width=".5"/><circle cx="5" cy="5" r="2.8" fill="url(#ki-g-staal)" stroke="#2a2f3c" stroke-width=".5"/>
        <path d="M5 2.2 V7.8" stroke="#2a2f3c" stroke-width=".5"/><path d="M5 1.2 Q6.6 .4 7 2" fill="none" stroke="#c0183c" stroke-width="1.2" stroke-linecap="round"/>` },
    banier: { naam: 'Banier', w: 2, h: 1, groep: 'accent', muur: true, kleuren: 6,
      teken: k => `<rect x="0" y="0" width="20" height="1.6" fill="#c9962e"/><path d="M3 1.6 H17 V7 L10 9.6 L3 7Z" fill="${KLEUR[k][0]}" stroke="${KLEUR[k][1]}" stroke-width=".6"/>
        <path d="M10 2.8 L11.6 4.6 L10 6.6 L8.4 4.6Z" fill="#ffc94a"/>` },
    lamp: { naam: 'Lamp', w: 1, h: 1, groep: 'accent',
      teken: () => `<circle cx="5" cy="5" r="4.8" fill="url(#ki-g-licht)"/><circle cx="5" cy="5" r="2.2" fill="#fff6c8" stroke="#c9962e" stroke-width=".6"/>` },

    // Meer banken: zitbank, lange tafel, ronde tafels, poef.
    zitbank: { naam: 'Lange zitbank', w: 8, h: 1, groep: 'banken', plaatsen: [[1, .5], [3, .5], [5, .5], [7, .5]],
      teken: () => `<rect x=".6" y="1.2" width="78.8" height="7.6" rx="1.4" fill="url(#ki-g-donker)" stroke="#2a1808" stroke-width=".9"/>` +
        rij(4, i => `<path d="M${2 + i * 20} 3.6 H${18 + i * 20} M${2 + i * 20} 6.4 H${18 + i * 20}" stroke="#2a1808" stroke-width=".5" opacity=".6"/>`) +
        rij(3, i => `<rect x="${19.4 + i * 20}" y="1.2" width="1.2" height="7.6" fill="#2a1808" opacity=".5"/>`) },
    langetafel: { naam: 'Lange tafel', w: 8, h: 2, groep: 'banken', plaatsen: [[1, .58], [3, .58], [5, .58], [7, .58]],
      teken: () => tafel(1, 1, 78, 9.5) + `<rect x="2" y="12" width="76" height="6.4" rx="1.4" fill="url(#ki-g-donker)" stroke="#2a1808" stroke-width=".8"/>` },
    rond: { naam: 'Ronde tafel', w: 4, h: 4, groep: 'banken', plaatsen: [[2, 1.02], [3.02, 2], [2, 2.98], [.98, 2]],
      teken: () => rij(4, i => { const a = i * Math.PI / 2 - Math.PI / 2, x = 20 + Math.cos(a) * 16.4, y = 20 + Math.sin(a) * 16.4; return `<g transform="rotate(${i * 90 + 180} ${x} ${y})">${stoel(x, y)}</g>`; }) +
        `<circle cx="20" cy="20" r="13" fill="${HOUT}" stroke="${RAND}" stroke-width="1"/><circle cx="20" cy="20" r="10.5" fill="none" stroke="#fff" stroke-width=".8" opacity=".25"/>` },
    ridderronde: { naam: 'Ridderronde (6)', w: 6, h: 6, groep: 'banken', plaatsen: rij6(),
      teken: () => Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3 - Math.PI / 2, x = 30 + Math.cos(a) * 26.4, y = 30 + Math.sin(a) * 26.4; return `<g transform="rotate(${i * 60 + 180} ${x} ${y})">${stoel(x, y)}</g>`; }).join('') +
        `<circle cx="30" cy="30" r="23" fill="url(#ki-g-donker)" stroke="#c9962e" stroke-width="1.6"/><circle cx="30" cy="30" r="20" fill="${HOUT}"/>
        <circle cx="30" cy="30" r="5" fill="none" stroke="#c9962e" stroke-width="1"/><path d="M30 25 V35 M25 30 H35" stroke="#c9962e" stroke-width=".8"/>` },
    poef: { naam: 'Poef', w: 1, h: 1, groep: 'banken', kleuren: 6, plaatsen: [[.5, .5]],
      teken: k => `<circle cx="5" cy="5" r="4.4" fill="${KLEUR[k][0]}" stroke="${KLEUR[k][1]}" stroke-width=".8"/><circle cx="5" cy="5" r="1" fill="${KLEUR[k][1]}"/>` },
    // Meer voor het lokaal
    krijtbord: { naam: 'Oud krijtbord', w: 6, h: 1, groep: 'lokaal', muur: true,
      teken: () => `<rect x="0" y="0" width="60" height="2.6" fill="#59607a"/><rect x="1.5" y=".8" width="57" height="6.6" rx=".6" fill="#2f4a3a" stroke="#8a5a2f" stroke-width="1.4"/>
        <path d="M6 3 q3 -1.4 6 0 t6 0 M24 4.6 h10 M40 3 l3 2 l3 -2 l3 2" stroke="#f4ecd8" stroke-width=".6" fill="none" opacity=".75"/>
        <rect x="2" y="7.4" width="56" height="1.8" fill="#6b4220"/><rect x="10" y="7.6" width="3" height="1.2" rx=".5" fill="#fffaf0"/><rect x="40" y="7.6" width="4" height="1.4" rx=".4" fill="#c9a274"/>` },
    piano: { naam: 'Piano', w: 4, h: 2, groep: 'lokaal',
      teken: () => `<rect x="1" y="1" width="38" height="11" rx="1.2" fill="#14161c" stroke="#3a3f4c" stroke-width=".8"/><rect x="3" y="12" width="34" height="5.4" fill="#f4f1ea" stroke="#9aa2b2" stroke-width=".5"/>` +
        rij(16, i => `<path d="M${3 + i * 2.125} 12 V17.4" stroke="#9aa2b2" stroke-width=".3"/>`) + rij(11, i => `<rect x="${4.3 + i * 3.05}" y="12" width="1.2" height="3.2" fill="#14161c"/>`) },
    laadkar: { naam: 'Laptopkar', w: 2, h: 1, groep: 'lokaal',
      teken: () => `<rect x="1" y=".8" width="18" height="8.4" rx="1" fill="#59607a" stroke="#2a2f3c" stroke-width=".8"/>` + rij(6, i => `<rect x="${2.6 + i * 2.6}" y="2" width="1.6" height="6" fill="#1c2233"/><rect x="${2.9 + i * 2.6}" y="2.4" width="1" height=".8" fill="#2ee6a6"/>`) },
    printer: { naam: 'Printer', w: 2, h: 1, groep: 'lokaal',
      teken: () => `<rect x="2" y="1" width="16" height="8" rx="1.4" fill="#d9dee8" stroke="#7d8596" stroke-width=".8"/><rect x="5" y="1.6" width="10" height="3" fill="#fffaf0"/><rect x="4" y="6" width="12" height="1.2" rx=".6" fill="#2a2f3c"/><circle cx="16" cy="3" r=".7" fill="#2ee6a6"/>` },
    // Meer accenten uit de burcht
    troon: { naam: 'Troon', w: 2, h: 2, groep: 'accent',
      teken: () => `<rect x="2" y="1" width="16" height="6" rx="2" fill="#c9962e" stroke="#6e4a0c" stroke-width=".8"/><path d="M5 1 L6.5 -1 L8 1 M12 1 L13.5 -1 L15 1" fill="#ffc94a" stroke="#6e4a0c" stroke-width=".5"/>
        <rect x="3" y="6" width="14" height="12" rx="2" fill="#8a1426" stroke="#c9962e" stroke-width="1.2"/><rect x="5.5" y="8" width="9" height="8" rx="1.5" fill="#b8323e"/><circle cx="10" cy="4" r="1.4" fill="url(#ki-g-gem)"/>` },
    zwaard: { naam: 'Zwaard in de steen', w: 2, h: 2, groep: 'accent',
      teken: () => `<path d="M3 10 C2 5 6 2 10 2.4 C15 2 18.4 6 17.4 11 C16.6 16 13 18 9.6 17.6 C5 17.4 3.4 14 3 10Z" fill="#7d8596" stroke="#3a3f4c" stroke-width=".8"/>
        <path d="M6 7 Q9 5.6 12 6.6 M7 13 Q11 14.6 14 12" stroke="#a9b0be" stroke-width=".6" fill="none"/>
        <rect x="9.2" y="3" width="1.6" height="9" fill="url(#ki-g-staal)" stroke="#2a2f3c" stroke-width=".3"/><rect x="6" y="11.4" width="8" height="1.6" rx=".6" fill="#c9962e"/><rect x="9.3" y="13" width="1.4" height="3.6" fill="#5a3a1c"/><circle cx="10" cy="17.2" r="1" fill="url(#ki-g-gem)"/>` },
    kroonluchter: { naam: 'Kroonluchter', w: 2, h: 2, groep: 'accent',
      teken: () => `<circle cx="10" cy="10" r="9.6" fill="url(#ki-g-licht)"/><circle cx="10" cy="10" r="6.4" fill="none" stroke="#c9962e" stroke-width="1.2"/><path d="M10 3.6 V16.4 M3.6 10 H16.4" stroke="#c9962e" stroke-width=".7"/>` +
        rij(6, i => { const a = i * Math.PI / 3; return `<circle cx="${10 + Math.cos(a) * 6.4}" cy="${10 + Math.sin(a) * 6.4}" r="1.1" fill="#fff6c8" stroke="#ff8c42" stroke-width=".4"/>`; }) },
    schild: { naam: 'Schild', w: 1, h: 1, groep: 'accent', muur: true, kleuren: 6,
      teken: k => `<rect x="0" y="0" width="10" height="1.4" fill="#59607a"/><path d="M1.6 1.4 H8.4 V5 Q8.4 8 5 9.4 Q1.6 8 1.6 5Z" fill="${KLEUR[k][0]}" stroke="#c9962e" stroke-width=".7"/><path d="M5 2.4 V8 M2.6 4.6 H7.4" stroke="#ffc94a" stroke-width=".7"/>` },
    haard: { naam: 'Open haard', w: 4, h: 1, groep: 'accent', muur: true,
      teken: () => `<rect x="0" y="0" width="40" height="4" fill="#59607a"/><rect x="2" y="0" width="36" height="9" rx="1" fill="#7d8596" stroke="#3a3f4c" stroke-width=".8"/>
        <rect x="8" y="0" width="24" height="7" rx="1" fill="#1b1e26"/><ellipse cx="20" cy="4.4" rx="9" ry="2.6" fill="url(#ki-g-vuur)"/><path d="M14 5.6 h12" stroke="#5a3a1c" stroke-width="1.4" stroke-linecap="round"/>` },
    draak: { naam: 'Knuffeldraak', w: 2, h: 2, groep: 'accent', kleuren: 6,
      teken: k => `<path d="M10 3 L3 1 L6 8Z M10 3 L17 1 L14 8Z" fill="${KLEUR[k][1]}" opacity=".85"/><ellipse cx="10" cy="11" rx="6" ry="6.6" fill="${KLEUR[k][0]}" stroke="${KLEUR[k][1]}" stroke-width=".8"/>
        <path d="M10 17 Q13 19.6 16.6 17.8" fill="none" stroke="${KLEUR[k][0]}" stroke-width="2.2" stroke-linecap="round"/><circle cx="10" cy="7" r="3.6" fill="${KLEUR[k][0]}" stroke="${KLEUR[k][1]}" stroke-width=".7"/>
        <circle cx="8.6" cy="6.4" r=".7" fill="#1b1e26"/><circle cx="11.4" cy="6.4" r=".7" fill="#1b1e26"/><path d="M8 12 L10 10.4 L12 12 L10 15Z" fill="#ffc94a" opacity=".8"/>` },
  };
  const GROEPEN = [['banken', 'Banken'], ['lokaal', 'Het lokaal'], ['accent', 'Leuke accenten']];
  const RANG = { page: 0, schildknaap: 1, ridder: 2 };
  const BUUR = 3.2; // plaatsen die dichter dan zoveel vakjes bij elkaar staan, zijn buren

  // Eén keer de verlopen voor alle tekeningen.
  document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="ki-g-blad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6c08a"/><stop offset="1" stop-color="#b88850"/></linearGradient>
    <linearGradient id="ki-g-donker" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a2f"/><stop offset="1" stop-color="#4a2c14"/></linearGradient>
    <linearGradient id="ki-g-stoel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fa3d1"/><stop offset="1" stop-color="#1f5f86"/></linearGradient>
    <linearGradient id="ki-g-scherm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1590c9"/><stop offset=".5" stop-color="#7fdcff"/><stop offset="1" stop-color="#1590c9"/></linearGradient>
    <linearGradient id="ki-g-glas" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bfefff"/><stop offset=".5" stop-color="#7fc8e8"/><stop offset="1" stop-color="#bfefff"/></linearGradient>
    <radialGradient id="ki-g-staal" cx=".35" cy=".35"><stop offset="0" stop-color="#f1f3f8"/><stop offset=".6" stop-color="#9aa2b2"/><stop offset="1" stop-color="#4a505e"/></radialGradient>
    <radialGradient id="ki-g-gem" cx=".35" cy=".35"><stop offset="0" stop-color="#e9fbff"/><stop offset=".45" stop-color="#5ee7ff"/><stop offset="1" stop-color="#0d4a66"/></radialGradient>
    <radialGradient id="ki-g-vuur"><stop offset="0" stop-color="#fff6c8"/><stop offset=".45" stop-color="#ffb347"/><stop offset="1" stop-color="#ff6a1a" stop-opacity=".2"/></radialGradient>
    <radialGradient id="ki-g-licht"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffc94a" stop-opacity=".5"/><stop offset="1" stop-color="#ffc94a" stop-opacity="0"/></radialGradient>
  </defs></svg>`);

  // ---------- De gegevens ----------
  let data = null;
  let modus = bewaarLees('lancelot-ki-modus', 'zit');
  let gekozen = null; // het geselecteerde stuk (id) bij het bouwen
  let sleep = null; // wat er nu gesleept wordt
  let cel = 40;
  const terug = [];
  const op = () => data && (data.opstellingen.find(o => o.id === data.actief) || data.opstellingen[0]);
  const nieuwId = p => p + Math.random().toString(36).slice(2, 9);
  // De grootte van een stuk in vakjes: zoals getekend, of uitgerekt (sw × sh, ongedraaid).
  const basis = s => [s.sw || STUK[s.s].w, s.sh || STUK[s.s].h];
  const maat = s => { const [w, h] = basis(s); return s.r % 2 ? [h, w] : [w, h]; };

  // De naamkaartjes van een stuk, in vakjes binnen het (gedraaide) stuk.
  function kaartjes(s) {
    const d = STUK[s.s], [w, h] = basis(s), fx = w / d.w, fy = h / d.h;
    return (d.plaatsen || []).map(([x0, y0], i) => {
      const x = x0 * fx, y = y0 * fy;
      const [px, py] = [[x, y], [h - y, x], [w - x, h - y], [y, w - x]][s.r];
      // Schuin: het hele stuk staat 45° gedraaid rond zijn midden (de kaartjes blijven rechtop).
      let [ax, ay] = [px, py];
      if (s.d) {
        const [ow, oh] = maat(s), dx = px - ow / 2, dy = py - oh / 2, c = Math.SQRT1_2;
        [ax, ay] = [ow / 2 + (dx - dy) * c, oh / 2 + (dx + dy) * c];
      }
      return { k: `${s.id}.${i}`, i, px, py, x: s.x + ax, y: s.y + ay, dicht: !!(s.dicht && s.dicht.includes(i)) };
    });
  }
  const allePlaatsen = () => op().stukken.filter(s => STUK[s.s].plaatsen).flatMap(kaartjes);

  // Welke leerling zit op een plaats: eerst op id, anders op naam (een andere pc heeft andere id's).
  let perId = {}, perNaam = {};
  function zoek(p) {
    if (!p) return null;
    return perId[p.id] || perNaam[String(p.naam).toLowerCase()] || null;
  }
  // Wie zit waar, zonder dubbels. Namen die hier niet in de klas zitten, blijven staan (onbekend).
  function bezetting() {
    const zit = {}, gebruikt = new Set();
    for (const p of allePlaatsen()) {
      const e = op().plaatsen[p.k];
      if (!e) continue;
      const l = zoek(e);
      if (l && gebruikt.has(l.id)) continue;
      if (l) gebruikt.add(l.id);
      zit[p.k] = { l, naam: l ? l.naam : e.naam, vast: !!e.vast };
    }
    return { zit, zonder: klas.leerlingen.filter(l => !gebruikt.has(l.id)) };
  }

  function wijzig(fn) {
    terug.push(JSON.stringify(data));
    if (terug.length > 40) terug.shift();
    fn();
    $('ki-terug').disabled = false;
    teken();
    bewaarSoon();
  }
  let wachtBewaar = null;
  function bewaarSoon() {
    clearTimeout(wachtBewaar);
    wachtBewaar = setTimeout(() => socket.emit('wk-indeling-zet', data, res => {
      if (!res || res.error) Ui.melding((res && res.error) || 'Bewaren lukte niet.');
    }), 400);
  }
  $('ki-terug').addEventListener('click', () => {
    if (!terug.length) return;
    data = JSON.parse(terug.pop());
    $('ki-terug').disabled = !terug.length;
    gekozen = null;
    teken();
    bewaarSoon();
  });

  // ---------- Tekenen ----------
  const svg = s => { const d = STUK[s.s]; return `<svg viewBox="0 0 ${d.w * 10} ${d.h * 10}" preserveAspectRatio="none">${d.teken(s.k || 0)}</svg>`; };
  const niveauVan = l => { const vak = $('ki-vak').value; return (vak && l.vakNiveaus && l.vakNiveaus[vak]) || l.niveau || 'schildknaap'; };

  function kaartje(p, b, paren) {
    if (p.dicht) return `<div class="ki-plaats dicht" data-k="${p.k}" style="--px:${p.px};--py:${p.py}"><span>✕</span></div>`;
    const z = b.zit[p.k];
    if (!z) return `<div class="ki-plaats vrij" data-k="${p.k}" style="--px:${p.px};--py:${p.py}"></div>`;
    const weg = z.l && !aanwezigen().includes(z.l);
    const niv = $('ki-niveau').checked && z.l ? `<i class="ki-niv">${Niveau.ICONS[niveauVan(z.l)]}</i>` : '';
    const f = Math.min(1, 6.5 / Math.max(5, z.naam.length + (niv ? 1.5 : 0)));
    return `<div class="ki-plaats${z.vast ? ' vast' : ''}${weg ? ' weg' : ''}${z.l ? '' : ' onbekend'}${paren.has(p.k) ? ' botst' : ''}" data-k="${p.k}" style="--px:${p.px};--py:${p.py};--f:${f.toFixed(2)}" title="${esc(z.naam)}">${niv}<span>${esc(z.naam)}</span>${z.vast ? '<b aria-label="vast">🔒</b>' : ''}</div>`;
  }

  function teken() {
    if (!data || !klas) return;
    perId = Object.fromEntries(klas.leerlingen.map(l => [l.id, l]));
    perNaam = {};
    for (const l of klas.leerlingen) if (!perNaam[l.naam.toLowerCase()]) perNaam[l.naam.toLowerCase()] = l;
    const o = op();
    $('ki-printnaam').textContent = `${o.naam}${klas.naam ? ` · ${klas.naam}` : ''}`;
    $('ki-op').innerHTML = data.opstellingen.map(x => `<option value="${x.id}" ${x.id === o.id ? 'selected' : ''}>${esc(x.naam)}</option>`).join('');
    const b = bezetting();
    const botsen = botsingen(b.zit);
    const lok = $('ki-lokaal');
    lok.style.setProperty('--W', o.w);
    lok.style.setProperty('--H', o.h);
    lok.classList.toggle('bouw', modus === 'bouw');
    const stukken = o.stukken.slice().sort((a, c) => (STUK[a.s].laag ?? 1) - (STUK[c.s].laag ?? 1));
    lok.innerHTML = stukken.map(s => {
      const d = STUK[s.s], [w, h] = maat(s), [bw, bh] = basis(s);
      const kaart = d.plaatsen ? kaartjes(s).map(p => kaartje(p, b, botsen)).join('') : '';
      return `<div class="ki-stuk${d.laag === 0 ? ' vloer' : ''}${d.muur ? ' muur' : ''}${s.d && !d.muur ? ' schuin' : ''}${s.id === gekozen ? ' gekozen' : ''}" data-id="${s.id}" style="--x:${s.x};--y:${s.y};--w:${w};--h:${h}">
        <div class="ki-vorm" style="--bw:${bw};--bh:${bh};--r:${s.r}">${svg(s)}</div>${kaart}${s.id === gekozen && modus === 'bouw' ? '<i class="ki-greep" title="Sleep om groter of kleiner te maken"></i>' : ''}</div>`;
    }).join('') + (o.stukken.length ? '' : '<p class="ki-leeg">Een leeg lokaal. Kies rechts een bank of een bord om te beginnen.</p>');
    // Het zijpaneel
    const plaatsen = allePlaatsen().filter(p => !p.dicht).length;
    $('ki-tel').textContent = `${plaatsen} plaatsen · ${klas.leerlingen.length} leerlingen`;
    $('ki-zonder-tel').textContent = b.zonder.length ? `(${b.zonder.length})` : '';
    $('ki-zonder-namen').innerHTML = b.zonder.length
      ? b.zonder.map(l => `<button class="ki-naam" data-lid="${l.id}">${esc(l.naam)}</button>`).join('')
      : `<span class="muted small">${klas.leerlingen.length ? 'Iedereen heeft een plaats.' : 'Je klaslijst is nog leeg.'}</span>`;
    $('ki-zonder').classList.toggle('vol', !b.zonder.length);
    $('ki-tip').textContent = modus === 'bouw'
      ? 'Tik op een stuk rechts of sleep het in je lokaal. Tik op een stuk in het lokaal om het te draaien (ook schuin) of weg te doen. Sleep het gouden hoekje om het groter te maken.'
      : 'Sleep een naam naar een andere plaats om te wisselen. Tik op een plaats om ze vast te zetten of dicht te doen.';
    for (const k of document.querySelectorAll('.ki-modus [data-modus]')) k.classList.toggle('on', k.dataset.modus === modus);
    $('ki-zij-zit').classList.toggle('hidden', modus !== 'zit');
    $('ki-zij-bouw').classList.toggle('hidden', modus !== 'bouw');
    if (modus === 'bouw' && document.activeElement !== $('ki-naam')) $('ki-naam').value = o.naam;
    $('ki-w').value = o.w;
    $('ki-h').value = o.h;
    $('ki-op-weg').disabled = data.opstellingen.length < 2;
    maatZet();
    toonMenu();
  }

  // De vakjesgrootte: het hele lokaal past in de breedte en op het scherm.
  function maatZet(printen) {
    const o = op();
    if (!o) return;
    const wrap = $('ki-wrap');
    if (printen) cel = Math.floor(Math.min(980 / o.w, 560 / o.h));
    else {
      // Zo hoog als het scherm (min. de kopbalk): even scrollen mag, kleine naamkaartjes niet.
      const hoog = Math.max(320, innerHeight - 130);
      cel = Math.max(14, Math.min(84, Math.floor(Math.min((wrap.clientWidth - 8) / o.w, hoog / o.h))));
      if (!wrap.clientWidth) return;
    }
    $('ki-lokaal').style.setProperty('--cel', `${cel}px`);
  }
  new ResizeObserver(() => maatZet()).observe($('ki-wrap'));
  addEventListener('beforeprint', () => maatZet(true));
  addEventListener('afterprint', () => maatZet());

  // ---------- Verdelen ----------
  // Paren die uit elkaar moeten en nu buren zijn: de plaatsen die rood oplichten.
  function paarIds() {
    return data.uitElkaar.map(([a, b]) => [perNaam[a.toLowerCase()], perNaam[b.toLowerCase()]]).filter(([a, b]) => a && b).map(([a, b]) => [a.id, b.id]);
  }
  function buren(zitVan) {
    // zitVan: leerling-id -> plaats { x, y }
    let n = 0;
    const paren = [];
    for (const [a, b] of paarIds()) {
      const p = zitVan[a], q = zitVan[b];
      if (p && q && Math.hypot(p.x - q.x, p.y - q.y) < BUUR) { n++; paren.push([a, b]); }
    }
    return { n, paren };
  }
  function botsingen(zit) {
    const plek = Object.fromEntries(allePlaatsen().map(p => [p.k, p]));
    const zitVan = {}, kVan = {};
    for (const [k, z] of Object.entries(zit)) if (z.l) { zitVan[z.l.id] = plek[k]; kVan[z.l.id] = k; }
    const uit = new Set();
    for (const [a, b] of buren(zitVan).paren) { uit.add(kVan[a]); uit.add(kVan[b]); }
    return uit;
  }

  // Plaatsen van vooraan (bij het bord) naar achteraan, per bank van links naar rechts.
  function plaatsVolgorde(vrij) {
    const bord = op().stukken.find(s => s.s === 'bord');
    const o = op();
    // Afstand tot de muur van het bord; zonder bord is vooraan de bovenkant.
    const diepte = p => !bord ? p.y : [p.y, o.w - p.x, o.h - p.y, p.x][bord.r];
    const dwars = p => !bord ? p.x : [p.x, p.y, o.w - p.x, o.h - p.y][bord.r];
    return vrij.slice().sort((a, b) => Math.round(diepte(a)) - Math.round(diepte(b)) || dwars(a) - dwars(b));
  }

  function verdeel() {
    const o = op();
    const b = bezetting();
    const vast = Object.entries(b.zit).filter(([, z]) => z.vast && z.l);
    const vastIds = new Set(vast.map(([, z]) => z.l.id));
    const vrij = plaatsVolgorde(allePlaatsen().filter(p => !p.dicht && !(b.zit[p.k] && b.zit[p.k].vast && b.zit[p.k].l)));
    let wie = schud(klas.leerlingen.filter(l => !vastIds.has(l.id)));
    const hoe = $('ki-hoe').value;
    if (hoe === 'abc') wie.sort((a, c) => a.naam.localeCompare(c.naam, 'nl'));
    else if (hoe === 'vooraan') wie.sort((a, c) => RANG[niveauVan(a)] - RANG[niveauVan(c)]);
    else if (hoe === 'gemengd') {
      // Telkens iemand van het grootste niveau dat nog over is, maar niet hetzelfde als de vorige: buren verschillen.
      const pot = { page: [], schildknaap: [], ridder: [] };
      for (const l of wie) pot[niveauVan(l)].push(l);
      wie = [];
      let vorige = '';
      while (wie.length < klas.leerlingen.length - vastIds.size) {
        const kies = Object.keys(pot).filter(n => pot[n].length).sort((a, c) => (a === vorige) - (c === vorige) || pot[c].length - pot[a].length)[0];
        wie.push(pot[kies].pop());
        vorige = kies;
      }
    }
    const nieuw = {};
    for (const [k, z] of vast) nieuw[k] = { id: z.l.id, naam: z.l.naam, vast: true };
    vrij.forEach((p, i) => { if (wie[i]) nieuw[p.k] = { id: wie[i].id, naam: wie[i].naam }; });
    uitElkaar(nieuw, vrij);
    wijzig(() => { o.plaatsen = nieuw; });
    if (wie.length > vrij.length) Ui.melding(`Er zijn ${wie.length - vrij.length} plaatsen te weinig. Zet bij Lokaal bouwen nog banken bij, of doe dichte plaatsen open.`);
    sfx.go && sfx.go();
  }

  // Wie uit elkaar moet en toch naast elkaar zit: wissel een van beiden met een ander, tot er niemand meer botst.
  function uitElkaar(plaatsen, vrij) {
    if (!data.uitElkaar.length) return;
    const plek = Object.fromEntries(allePlaatsen().map(p => [p.k, p]));
    const los = vrij.map(p => p.k);
    const zitVan = () => Object.fromEntries(Object.entries(plaatsen).map(([k, e]) => [e.id, plek[k]]));
    let nu = buren(zitVan());
    for (let poging = 0; poging < 400 && nu.n; poging++) {
      const paar = nu.paren[Math.floor(Math.random() * nu.paren.length)];
      // Een van de twee (wie niet vastzit) verhuist.
      const van = Object.keys(plaatsen).find(k => paar.includes(plaatsen[k].id) && !plaatsen[k].vast && (Math.random() < .5 || plaatsen[k].id === paar[1]));
      if (!van) continue;
      const naar = los[Math.floor(Math.random() * los.length)];
      if (naar === van) continue;
      const oud = plaatsen[naar];
      plaatsen[naar] = plaatsen[van];
      if (oud) plaatsen[van] = oud; else delete plaatsen[van];
      const later = buren(zitVan());
      if (later.n > nu.n) { // slechter: terugdraaien
        plaatsen[van] = plaatsen[naar];
        if (oud) plaatsen[naar] = oud; else delete plaatsen[naar];
      } else nu = later;
    }
  }

  // ---------- Het menu bij een plaats of een stuk ----------
  let menu = null; // { soort: 'plaats' | 'stuk', k | id }
  function toonMenu() {
    const m = $('ki-menu');
    if (!menu || huidigeTool() !== 'indeling') { m.classList.add('hidden'); return; }
    const o = op();
    let doel, html = '';
    if (menu.soort === 'stuk') {
      const s = o.stukken.find(x => x.id === menu.id);
      if (!s || modus !== 'bouw') { menu = null; m.classList.add('hidden'); return; }
      doel = document.querySelector(`.ki-stuk[data-id="${s.id}"]`);
      const d = STUK[s.s];
      const dicht = d.plaatsen && s.dicht && s.dicht.length === d.plaatsen.length;
      html = `<strong>${esc(d.naam)}</strong>
        <button class="secondary" data-doe="draai" title="${d.muur ? 'Naar de volgende muur' : 'Een achtste draai: schuin of recht'}">⟳ ${d.muur ? 'Andere muur' : 'Draai'}</button>
        <button class="secondary" data-doe="kopie">⧉ Nog een</button>
        ${d.plaatsen ? `<button class="secondary" data-doe="dicht">${dicht ? '✓ Plaatsen open' : '✕ Plaatsen dicht'}</button>` : ''}
        ${d.kleuren ? `<span class="ki-kleuren">${KLEUR.slice(0, d.kleuren).map((c, i) => `<button class="${(s.k || 0) === i ? 'on' : ''}" data-kleur="${i}" style="background:${c[0]}" aria-label="Kleur ${i + 1}"></button>`).join('')}</span>` : ''}
        ${s.sw || s.sh ? '<button class="secondary" data-doe="maat0">↺ Gewone grootte</button>' : ''}
        <button class="secondary" data-doe="weg">🗑 Weg</button>`;
    } else {
      const p = allePlaatsen().find(x => x.k === menu.k);
      if (!p || modus !== 'zit') { menu = null; m.classList.add('hidden'); return; }
      doel = document.querySelector(`.ki-plaats[data-k="${p.k}"]`);
      const z = bezetting().zit[p.k];
      const zonder = bezetting().zonder;
      html = p.dicht
        ? '<strong>Dichte plaats</strong><button class="secondary" data-doe="open">✓ Plaats open</button>'
        : z
          ? `<strong>${esc(z.naam)}</strong>
            <button class="secondary" data-doe="vast">${z.vast ? '🔓 Losmaken' : '🔒 Vastzetten'}</button>
            <button class="secondary" data-doe="eraf">Van de plaats af</button>
            <button class="secondary" data-doe="sluit">✕ Plaats dicht</button>`
          : `<strong>Vrije plaats</strong>
            ${zonder.length ? `<select data-doe="zet" aria-label="Wie zit hier?"><option value="">Wie zit hier?</option>${zonder.map(l => `<option value="${l.id}">${esc(l.naam)}</option>`).join('')}</select>` : ''}
            <button class="secondary" data-doe="sluit">✕ Plaats dicht</button>`;
    }
    if (!doel) { m.classList.add('hidden'); return; }
    m.innerHTML = html;
    m.classList.remove('hidden');
    // Onder het stuk, of erboven als er geen plaats meer is; altijd binnen het scherm.
    const r = doel.getBoundingClientRect(), mr = m.getBoundingClientRect(), sec = $('t-indeling').getBoundingClientRect();
    let x = r.left + r.width / 2 - mr.width / 2, y = r.bottom + 8;
    if (y + mr.height > innerHeight - 8) y = r.top - mr.height - 8;
    x = Math.max(8, Math.min(innerWidth - mr.width - 8, x));
    m.style.left = `${x - sec.left}px`;
    m.style.top = `${y - sec.top}px`;
  }
  const huidigeTool = () => location.hash.slice(1);

  $('ki-menu').addEventListener('click', e => {
    const kleur = e.target.closest('[data-kleur]');
    const knop = e.target.closest('button[data-doe]');
    if (!kleur && !knop) return;
    const o = op();
    if (menu.soort === 'stuk') {
      const s = o.stukken.find(x => x.id === menu.id);
      if (!s) return;
      if (kleur) return wijzig(() => { s.k = +kleur.dataset.kleur; });
      const doe = knop.dataset.doe;
      if (doe === 'draai') wijzig(() => draai(s));
      else if (doe === 'kopie') wijzig(() => { const n = { ...s, id: nieuwId('s'), dicht: undefined }; zetVrij(n, s); o.stukken.push(n); gekozen = n.id; menu = { soort: 'stuk', id: n.id }; });
      else if (doe === 'dicht') wijzig(() => { const n = STUK[s.s].plaatsen.length; s.dicht = s.dicht && s.dicht.length === n ? [] : [...Array(n).keys()]; });
      else if (doe === 'weg') verwijder(s);
      else if (doe === 'maat0') wijzig(() => {
        delete s.sw; delete s.sh;
        const [w, h] = maat(s);
        s.x = Math.max(0, Math.min(o.w - w, s.x));
        s.y = Math.max(0, Math.min(o.h - h, s.y));
      });
    } else {
      const doe = knop.dataset.doe, k = menu.k;
      const [id, i] = k.split('.');
      const s = o.stukken.find(x => x.id === id);
      if (doe === 'vast') wijzig(() => { o.plaatsen[k].vast = !o.plaatsen[k].vast; if (!o.plaatsen[k].vast) delete o.plaatsen[k].vast; });
      else if (doe === 'eraf') wijzig(() => { delete o.plaatsen[k]; menu = null; });
      else if (doe === 'sluit') wijzig(() => { s.dicht = [...new Set([...(s.dicht || []), +i])]; delete o.plaatsen[k]; });
      else if (doe === 'open') wijzig(() => { s.dicht = (s.dicht || []).filter(x => x !== +i); });
    }
  });
  $('ki-menu').addEventListener('change', e => {
    const sel = e.target.closest('select[data-doe="zet"]');
    if (!sel || !sel.value) return;
    const l = perId[sel.value];
    if (l) wijzig(() => { op().plaatsen[menu.k] = { id: l.id, naam: l.naam }; menu = null; });
  });

  function verwijder(s) {
    wijzig(() => {
      const o = op();
      o.stukken = o.stukken.filter(x => x !== s);
      for (const k of Object.keys(o.plaatsen)) if (k.startsWith(`${s.id}.`)) delete o.plaatsen[k];
      gekozen = null;
      menu = null;
    });
  }

  // Uitrekken: de rechteronderhoek volgt de muis. Een muurstuk wordt alleen langer.
  function rek(s, vx, vy) {
    const o = op(), d = STUK[s.s];
    let w = Math.max(1, Math.min(o.w - s.x, Math.round(vx - s.x))), h = Math.max(1, Math.min(o.h - s.y, Math.round(vy - s.y)));
    if (d.muur) [w, h] = s.r % 2 ? [1, h] : [w, 1];
    let [sw, sh] = s.r % 2 ? [h, w] : [w, h];
    if (d.muur) sh = d.h;
    const [ow, oh] = basis(s);
    if (sw === ow && sh === oh) return;
    if (sw === d.w) delete s.sw; else s.sw = sw;
    if (sh === d.h) delete s.sh; else s.sh = sh;
    teken();
  }

  // Draaien: een kwartslag; een muurstuk gaat naar de volgende muur.
  function draai(s) {
    const o = op();
    if (STUK[s.s].muur) { s.r = (s.r + 1) % 4; return tegenMuur(s, s.x + maat(s)[0] / 2, s.y + maat(s)[1] / 2, s.r); }
    // Per 45°: eerst schuin, dan de volgende kwartslag recht.
    if (!s.d) { s.d = true; return; }
    delete s.d;
    s.r = (s.r + 1) % 4;
    const [w, h] = maat(s);
    s.x = Math.max(0, Math.min(o.w - w, s.x));
    s.y = Math.max(0, Math.min(o.h - h, s.y));
  }
  // Een muurstuk tegen de muur die het dichtst bij (x, y) is, of tegen muur r.
  function tegenMuur(s, x, y, r) {
    const o = op();
    if (r == null) r = [y, o.w - x, o.h - y, x].reduce((best, d, i, a) => (d < a[best] ? i : best), 0);
    s.r = r;
    const [w, h] = maat(s);
    s.x = r === 1 ? o.w - 1 : r === 3 ? 0 : Math.round(Math.max(0, Math.min(o.w - w, x - w / 2)));
    s.y = r === 0 ? 0 : r === 2 ? o.h - 1 : Math.round(Math.max(0, Math.min(o.h - h, y - h / 2)));
  }
  // Een nieuw stuk op een vrije plek zetten (naast `naast`, of eender waar).
  function zetVrij(s, naast) {
    const o = op();
    if (STUK[s.s].muur) {
      tegenMuur(s, naast ? naast.x + maat(naast)[0] + 1 : o.w / 2, naast ? naast.y : 0, naast ? naast.r : 0);
      return;
    }
    const [w, h] = maat(s);
    const bezet = (x, y) => o.stukken.some(t => {
      if (STUK[t.s].laag === 0 || STUK[s.s].laag === 0) return false;
      const [tw, th] = maat(t);
      return x < t.x + tw && t.x < x + w && y < t.y + th && t.y < y + h;
    });
    const start = naast ? [naast.x + maat(naast)[0], naast.y] : [Math.floor((o.w - w) / 2), Math.floor((o.h - h) / 2)];
    for (let d = 0; d < Math.max(o.w, o.h); d++) {
      for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        const x = start[0] + dx, y = start[1] + dy;
        if (x >= 1 && y >= 1 && x + w <= o.w - 1 && y + h <= o.h - 1 && !bezet(x, y)) { s.x = x; s.y = y; return; }
      }
    }
    s.x = Math.max(0, Math.min(o.w - w, start[0]));
    s.y = Math.max(0, Math.min(o.h - h, start[1]));
  }

  // ---------- De gereedschapskist ----------
  $('ki-doos').innerHTML = GROEPEN.map(([g, titel]) => `<div class="ki-kop">${titel}</div><div class="ki-gereedschap">${
    Object.entries(STUK).filter(([, d]) => d.groep === g).map(([id, d]) => `<button class="ki-tool" data-s="${id}" title="${esc(d.naam)}"><span class="ki-mini">${svg({ s: id, k: 0 })}</span><span>${esc(d.naam)}</span></button>`).join('')
  }</div>`).join('');

  // ---------- Slepen ----------
  // Eén stel pointer-handlers voor alles: een stuk verschuiven, een nieuw stuk uit de kist, een naam naar een plaats.
  const vakVan = e => { const r = $('ki-lokaal').getBoundingClientRect(); return [(e.clientX - r.left) / cel, (e.clientY - r.top) / cel]; };

  $('t-indeling').addEventListener('pointerdown', e => {
    if (e.button > 0 || !data) return;
    const tool = e.target.closest('.ki-tool');
    const stuk = e.target.closest('.ki-stuk');
    const kaart = e.target.closest('.ki-plaats');
    const naam = e.target.closest('.ki-naam');
    const greep = e.target.closest('.ki-greep');
    if (modus === 'bouw' && greep) sleep = { soort: 'maat', s: op().stukken.find(x => x.id === greep.parentNode.dataset.id), x0: e.clientX, y0: e.clientY, start: JSON.stringify(data) };
    else if (modus === 'bouw' && tool) sleep = { soort: 'nieuw', s: tool.dataset.s, x0: e.clientX, y0: e.clientY, el: tool };
    else if (modus === 'bouw' && stuk) {
      const s = op().stukken.find(x => x.id === stuk.dataset.id);
      const [vx, vy] = vakVan(e);
      sleep = { soort: 'stuk', s, x0: e.clientX, y0: e.clientY, dx: vx - s.x, dy: vy - s.y, el: stuk, start: JSON.stringify(data) };
    } else if (modus === 'zit' && kaart && !kaart.matches('.vrij, .dicht')) sleep = { soort: 'naam', k: kaart.dataset.k, x0: e.clientX, y0: e.clientY, el: kaart };
    else if (modus === 'zit' && naam) sleep = { soort: 'naam', lid: naam.dataset.lid, x0: e.clientX, y0: e.clientY, el: naam };
    else if (modus === 'zit' && kaart) { sleep = { soort: 'klik', k: kaart.dataset.k, x0: e.clientX, y0: e.clientY }; }
    else {
      if (!e.target.closest('#ki-menu') && (menu || gekozen) && e.target.closest('#ki-lokaal, .ki-wrap')) { menu = null; gekozen = null; teken(); }
      return;
    }
    e.preventDefault();
  });

  addEventListener('pointermove', e => {
    if (!sleep) return;
    const ver = Math.hypot(e.clientX - sleep.x0, e.clientY - sleep.y0);
    if (!sleep.bezig && ver < 6) return;
    if (!sleep.bezig) {
      sleep.bezig = true;
      menu = null;
      $('ki-menu').classList.add('hidden');
      if (sleep.soort === 'naam' || sleep.soort === 'nieuw') {
        const g = sleep.el.cloneNode(true);
        g.className = `ki-spook ${sleep.soort === 'naam' ? 'ki-plaats' : 'ki-tool'}`;
        if (sleep.soort === 'naam') g.style.setProperty('--cel', `${cel}px`);
        document.body.appendChild(g);
        sleep.spook = g;
        sleep.el.classList.add('ki-weg');
      }
      if (sleep.soort === 'stuk') { gekozen = sleep.s.id; sleep.el.classList.add('gekozen', 'sleept'); }
    }
    if (sleep.spook) { sleep.spook.style.left = `${e.clientX}px`; sleep.spook.style.top = `${e.clientY}px`; }
    if (sleep.soort === 'stuk') {
      const s = sleep.s, o = op(), [vx, vy] = vakVan(e);
      if (STUK[s.s].muur) tegenMuur(s, vx, vy);
      else {
        const [w, h] = maat(s);
        s.x = Math.round(Math.max(0, Math.min(o.w - w, vx - sleep.dx)));
        s.y = Math.round(Math.max(0, Math.min(o.h - h, vy - sleep.dy)));
      }
      const [w, h] = maat(s);
      const el = sleep.el;
      el.style.setProperty('--x', s.x); el.style.setProperty('--y', s.y);
      el.style.setProperty('--w', w); el.style.setProperty('--h', h);
      el.querySelector('.ki-vorm').style.setProperty('--r', s.r);
    }
    if (sleep.soort === 'maat') rek(sleep.s, ...vakVan(e));
    if (sleep.soort === 'naam') {
      for (const x of document.querySelectorAll('.ki-plaats.doel, .ki-zonder.doel')) x.classList.remove('doel');
      const onder = waarOnder(e);
      if (onder) onder.classList.add('doel');
    }
  });

  function waarOnder(e) {
    const spook = sleep && sleep.spook;
    if (spook) spook.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (spook) spook.style.display = '';
    return el && (el.closest('.ki-plaats:not(.dicht):not(.ki-spook)') || el.closest('.ki-zonder'));
  }

  addEventListener('pointerup', e => {
    if (!sleep) return;
    const s = sleep;
    sleep = null;
    if (s.spook) s.spook.remove();
    if (s.el) s.el.classList.remove('ki-weg', 'sleept');
    for (const x of document.querySelectorAll('.doel')) x.classList.remove('doel');
    const o = op();
    if (s.soort === 'nieuw') {
      const n = { id: nieuwId('s'), s: s.s, x: 0, y: 0, r: 0 };
      const [vx, vy] = vakVan(e);
      const binnen = s.bezig && vx >= 0 && vy >= 0 && vx <= o.w && vy <= o.h;
      if (s.bezig && !binnen) return;
      wijzig(() => {
        if (!binnen) zetVrij(n);
        else if (STUK[n.s].muur) tegenMuur(n, vx, vy);
        else { const [w, h] = maat(n); n.x = Math.round(Math.max(0, Math.min(o.w - w, vx - w / 2))); n.y = Math.round(Math.max(0, Math.min(o.h - h, vy - h / 2))); }
        o.stukken.push(n);
        gekozen = n.id;
        menu = { soort: 'stuk', id: n.id };
      });
      sfx.tick && sfx.tick();
    } else if (s.soort === 'maat') {
      if (!s.bezig) return;
      terug.push(s.start);
      if (terug.length > 40) terug.shift();
      $('ki-terug').disabled = false;
      menu = { soort: 'stuk', id: s.s.id };
      teken();
      bewaarSoon();
    } else if (s.soort === 'stuk') {
      if (!s.bezig) { gekozen = s.s.id; menu = { soort: 'stuk', id: s.s.id }; teken(); return; }
      // Het verschuiven is al gebeurd; zet de oude toestand op de terug-stapel en bewaar.
      terug.push(s.start);
      if (terug.length > 40) terug.shift();
      $('ki-terug').disabled = false;
      menu = { soort: 'stuk', id: s.s.id };
      teken();
      bewaarSoon();
    } else if (s.soort === 'naam') {
      if (!s.bezig) { if (s.k) { menu = { soort: 'plaats', k: s.k }; toonMenu(); } else naarVrij(s.lid); return; }
      const doel = waarOnder(e);
      if (!doel) return;
      wijzig(() => {
        const van = s.k ? o.plaatsen[s.k] : (perId[s.lid] && { id: s.lid, naam: perId[s.lid].naam });
        if (!van) return;
        if (doel.classList.contains('ki-zonder')) { if (s.k) delete o.plaatsen[s.k]; return; }
        const naar = doel.dataset.k;
        if (naar === s.k) return;
        const oud = o.plaatsen[naar];
        o.plaatsen[naar] = { ...van };
        if (s.k) { if (oud) o.plaatsen[s.k] = oud; else delete o.plaatsen[s.k]; }
        // Wie je wegsleept, blijft vastgezet waar hij nu zit; wie verdrongen wordt zonder eigen plaats, gaat naar de lijst.
      });
      sfx.tick && sfx.tick();
    } else if (s.soort === 'klik') { menu = { soort: 'plaats', k: s.k }; toonMenu(); }
  });

  // Een naam uit de lijst aantikken: naar de eerste vrije plaats vooraan.
  function naarVrij(lid) {
    const l = perId[lid];
    const b = bezetting();
    const p = plaatsVolgorde(allePlaatsen().filter(x => !x.dicht && !b.zit[x.k]))[0];
    if (!l) return;
    if (!p) return Ui.melding('Er is geen vrije plaats meer. Sleep de naam op iemand anders om te wisselen.');
    wijzig(() => { op().plaatsen[p.k] = { id: l.id, naam: l.naam }; });
  }

  // Toetsen bij het bouwen: Delete = weg, R = draaien, pijltjes = verschuiven.
  addEventListener('keydown', e => {
    if (modus !== 'bouw' || !gekozen || huidigeTool() !== 'indeling' || e.target.closest('input, select, textarea')) return;
    const s = op().stukken.find(x => x.id === gekozen);
    if (!s) return;
    const o = op(), [w, h] = maat(s);
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); verwijder(s); }
    else if (e.key === 'r' || e.key === 'R') wijzig(() => draai(s));
    else if (e.key === 'Escape') { gekozen = null; menu = null; teken(); }
    else {
      const stap = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!stap) return;
      e.preventDefault();
      wijzig(() => {
        if (STUK[s.s].muur) return tegenMuur(s, s.x + w / 2 + stap[0], s.y + h / 2 + stap[1], s.r);
        s.x = Math.max(0, Math.min(o.w - w, s.x + stap[0]));
        s.y = Math.max(0, Math.min(o.h - h, s.y + stap[1]));
      });
    }
  });

  // ---------- De knoppen ----------
  for (const k of document.querySelectorAll('.ki-modus [data-modus]')) k.addEventListener('click', () => {
    modus = k.dataset.modus;
    bewaar('lancelot-ki-modus', modus);
    gekozen = null;
    menu = null;
    teken();
  });
  $('ki-op').addEventListener('change', () => { data.actief = $('ki-op').value; gekozen = null; menu = null; teken(); bewaarSoon(); });
  $('ki-verdeel').addEventListener('click', verdeel);
  $('ki-hoe').addEventListener('change', () => $('ki-vak-label').classList.toggle('hidden', !['gemengd', 'vooraan'].includes($('ki-hoe').value) || !vakgroepen.length));
  $('ki-vak').addEventListener('change', teken);
  $('ki-niveau').checked = bewaarLees('lancelot-ki-niveau', false);
  $('ki-niveau').addEventListener('change', () => { bewaar('lancelot-ki-niveau', $('ki-niveau').checked); teken(); });
  $('ki-leeg').addEventListener('click', async () => {
    if (!Object.keys(op().plaatsen).length) return;
    if (!(await Ui.vraag('Alle leerlingen van hun plaats halen? Ook wie vastzit.', { ja: 'Iedereen eraf' }))) return;
    wijzig(() => { op().plaatsen = {}; });
  });
  $('ki-print').addEventListener('click', () => { menu = null; toonMenu(); print(); });
  $('ki-naam').addEventListener('change', () => { const n = $('ki-naam').value.trim().slice(0, 40); if (n) wijzig(() => { op().naam = n; }); });
  for (const [veld, kant, min, max] of [['ki-w', 'w', 10, 40], ['ki-h', 'h', 8, 30]]) $(veld).addEventListener('change', () => {
    const n = Math.max(min, Math.min(max, parseInt($(veld).value, 10) || op()[kant]));
    wijzig(() => {
      const o = op();
      o[kant] = n;
      // Wat buiten het kleinere lokaal valt, schuift mee naar binnen; muurstukken blijven tegen hun muur.
      for (const s of o.stukken) {
        if (STUK[s.s].muur) { tegenMuur(s, s.x + maat(s)[0] / 2, s.y + maat(s)[1] / 2, s.r); continue; }
        const [w, h] = maat(s);
        s.x = Math.max(0, Math.min(o.w - w, s.x));
        s.y = Math.max(0, Math.min(o.h - h, s.y));
      }
    });
  });
  $('ki-nieuw').addEventListener('click', () => {
    if (data.opstellingen.length >= 8) return Ui.melding('Je kunt tot 8 opstellingen maken. Doe er eerst een weg.');
    wijzig(() => {
      const o = op();
      const n = { ...JSON.parse(JSON.stringify(o)), id: nieuwId('o'), naam: `${o.naam} (2)`.slice(0, 40), plaatsen: {} };
      data.opstellingen.push(n);
      data.actief = n.id;
    });
    Ui.melding('Een nieuwe opstelling, met hetzelfde lokaal. Geef ze hierboven een naam, bv. Toetsopstelling of Groepswerk.');
  });
  $('ki-op-weg').addEventListener('click', async () => {
    if (data.opstellingen.length < 2) return;
    if (!(await Ui.vraag(`De opstelling "${op().naam}" weggooien?`, { ja: 'Weg', gevaar: true }))) return;
    wijzig(() => { data.opstellingen = data.opstellingen.filter(o => o.id !== data.actief); data.actief = data.opstellingen[0].id; });
  });
  $('ki-alles-weg').addEventListener('click', async () => {
    if (!(await Ui.vraag('Alles uit het lokaal halen en opnieuw beginnen? Met ↶ kun je het terugzetten.', { ja: 'Leeg lokaal', gevaar: true }))) return;
    wijzig(() => { const o = op(); o.stukken = []; o.plaatsen = {}; gekozen = null; menu = null; });
  });

  // Uit elkaar zetten
  function toonParen() {
    const opties = '<option value="">Kies…</option>' + klas.leerlingen.map(l => `<option>${esc(l.naam)}</option>`).join('');
    $('ki-paar-a').innerHTML = opties;
    $('ki-paar-b').innerHTML = opties;
    $('ki-paar-lijst').innerHTML = data.uitElkaar.length
      ? data.uitElkaar.map(([a, b], i) => `<div class="ki-paar"><span>${esc(a)}</span><em>niet naast</em><span>${esc(b)}</span><button class="secondary icon" data-paar="${i}" aria-label="Weg"><i class="ic ic-kruis"></i></button></div>`).join('')
      : '<p class="muted small">Nog niemand.</p>';
  }
  $('ki-paren-knop').addEventListener('click', () => { toonParen(); $('ki-paren').showModal(); });
  $('ki-paren-dicht').addEventListener('click', () => $('ki-paren').close());
  $('ki-paren').addEventListener('click', e => { if (e.target === $('ki-paren')) $('ki-paren').close(); });
  $('ki-paar-erbij').addEventListener('click', () => {
    const a = $('ki-paar-a').value, b = $('ki-paar-b').value;
    if (!a || !b || a === b) return;
    if (data.uitElkaar.some(p => p.includes(a) && p.includes(b))) return;
    wijzig(() => data.uitElkaar.push([a, b]));
    toonParen();
  });
  $('ki-paar-lijst').addEventListener('click', e => {
    const b = e.target.closest('[data-paar]');
    if (!b) return;
    wijzig(() => data.uitElkaar.splice(+b.dataset.paar, 1));
    toonParen();
  });

  // ---------- De server ----------
  socket.on('wk-indeling', d => { if (sleep) return; data = d; menu = null; teken(); });
  socket.on('connect', () => socket.emit('wk-indeling-get', null, res => { if (res && res.data) { data = res.data; teken(); } }));

  return {
    teken,
    klasNieuw() {
      $('ki-vak').innerHTML = '<option value="">Algemeen</option>' + vakgroepen.map(g => `<option value="${g.id}">${esc(g.naam)}</option>`).join('');
      $('ki-hoe').dispatchEvent(new Event('change'));
      teken();
    },
    dicht() { menu = null; gekozen = null; $('ki-menu').classList.add('hidden'); },
    // Bij het openen: de balk bovenaan het scherm, zodat het hele lokaal past.
    open() { setTimeout(() => { if (!$('t-indeling').classList.contains('hidden')) document.querySelector('.ki-balk').scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); },
    STUK,
  };
})();
if (location.hash === '#indeling') Indeling.open();
