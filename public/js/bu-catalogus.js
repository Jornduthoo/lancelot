// Eer en burchten: wat je kan bouwen, wat het kost en welke rang je nodig hebt.
// Gedeeld door de server (src/burchten.js) en de pagina's (Mijn burcht en het Klaseiland).
(function (root) {
  // Rangen volgen alle Eer die je ooit verdiende (uitgeven doet je rang niet zakken).
  // Met een hogere rang wordt je bouwgrond groter en kan je meer bouwen.
  const RANGEN = [
    { naam: 'Rekruut', vanaf: 0, grond: 5 },
    { naam: 'Wapenknecht', vanaf: 150, grond: 6 },
    { naam: 'Banierdrager', vanaf: 400, grond: 7 },
    { naam: 'Burchtheer', vanaf: 900, grond: 8 },
    { naam: 'Paladijn', vanaf: 1800, grond: 9 },
    { naam: 'Legende', vanaf: 3500, grond: 10 },
  ];
  const MAX_GROND = 10;
  // Is je burcht af? Vanaf de hoogste rang koop je er een zwevend eilandje bij, met een brug naar je burcht.
  const EILANDJE = { prijs: 300, rang: 5, grond: 5 };

  // grond: de vloer van een vakje. stuk: iets dat erop staat. Wat je weghaalt, krijg je volledig terug.
  const STUKKEN = [
    { id: 'pad', naam: 'Kasseien', prijs: 1, rang: 0, soort: 'grond' },
    { id: 'bloemen', naam: 'Bloemenweide', prijs: 2, rang: 0, soort: 'grond' },
    { id: 'water', naam: 'Water', prijs: 3, rang: 0, soort: 'grond' },
    { id: 'neon', naam: 'Neonplaat', prijs: 5, rang: 2, soort: 'grond' },
    { id: 'lava', naam: 'Lava', prijs: 6, rang: 2, soort: 'grond' },
    { id: 'sterrenglas', naam: 'Sterrenglas', prijs: 6, rang: 3, soort: 'grond' },

    { id: 'boom', naam: 'Eik', prijs: 3, rang: 0 },
    { id: 'den', naam: 'Den', prijs: 3, rang: 0 },
    { id: 'fakkel', naam: 'Plasmafakkel', prijs: 4, rang: 0 },
    { id: 'lichtpaal', naam: 'Holo-lantaarn', prijs: 5, rang: 0 },
    { id: 'muur', naam: 'Muur', prijs: 5, rang: 0 },
    { id: 'banier', naam: 'Banier', prijs: 6, rang: 0 },
    { id: 'huisje', naam: 'Huisje', prijs: 12, rang: 0 },
    { id: 'toren', naam: 'Toren', prijs: 15, rang: 0 },
    { id: 'poort', naam: 'Poort', prijs: 20, rang: 1 },
    { id: 'smidse', naam: 'Smidse', prijs: 25, rang: 1 },
    { id: 'molen', naam: 'Molen', prijs: 30, rang: 1 },
    { id: 'wachttoren', naam: 'Wachttoren', prijs: 30, rang: 1 },
    { id: 'robopaard', naam: 'Robopaard', prijs: 28, rang: 1 },
    { id: 'zwaardsteen', naam: 'Zwaard in de steen', prijs: 32, rang: 1 },
    { id: 'fontein', naam: 'Fontein', prijs: 35, rang: 2 },
    { id: 'ridderbeeld', naam: 'Ridderbeeld', prijs: 40, rang: 2 },
    { id: 'donjon', naam: 'Donjon', prijs: 60, rang: 2 },
    { id: 'holoridder', naam: 'Hologram-ridder', prijs: 50, rang: 2 },
    { id: 'radar', naam: 'Radarschotel', prijs: 45, rang: 2 },
    { id: 'kristal', naam: 'Kristal', prijs: 45, rang: 3 },
    { id: 'baken', naam: 'Neonbaken', prijs: 70, rang: 3 },
    { id: 'drakenbeeld', naam: 'Drakenbeeld', prijs: 80, rang: 3 },
    { id: 'rondetafel', naam: 'Holo-Ronde Tafel', prijs: 75, rang: 3 },
    { id: 'schildkoepel', naam: 'Schildkoepel', prijs: 90, rang: 3 },
    { id: 'portaal', naam: 'Runenportaal', prijs: 100, rang: 4 },
    { id: 'goudtoren', naam: 'Gouden toren', prijs: 120, rang: 4 },
    { id: 'laserkanon', naam: 'Laserkanon', prijs: 130, rang: 4 },
    { id: 'mechridder', naam: 'Mech-ridder', prijs: 160, rang: 4 },
    { id: 'draak', naam: 'Draak', prijs: 200, rang: 5 },
    { id: 'ruimteschip', naam: 'Ruimteschip', prijs: 250, rang: 5 },
    { id: 'robodraak', naam: 'Robodraak', prijs: 300, rang: 5 },
  ];
  const BY_ID = Object.fromEntries(STUKKEN.map(s => [s.id, s]));

  // De kleur van je daken en banieren.
  const KLEUREN = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff', '#9be15d', '#e8edf5'];

  // Wapenschilden: verdien je met inzet, niet met de hoogste score.
  const SCHILDEN = [
    { id: 'eerste', naam: 'Eerste zwaardslag', uitleg: 'Je eerste vraag beantwoord', teken: '⚔️' },
    { id: 'trouw', naam: 'Trouwe ridder', uitleg: '5 schooldagen na elkaar meegedaan', teken: '🔥' },
    { id: 'groeier', naam: 'Groeier', uitleg: '3 keer beter gedaan dan je vorige spellen', teken: '📈' },
    { id: 'herhaler', naam: 'Herhaler', uitleg: 'Een herhaalquiz uitgespeeld', teken: '🔁' },
    { id: 'runen', naam: 'Runenlezer', uitleg: '10 runenraadsels gekraakt', teken: '🔮' },
    { id: 'volhouder', naam: 'Volhouder', uitleg: '500 vragen beantwoord', teken: '🛡️' },
    { id: 'bouwmeester', naam: 'Bouwmeester', uitleg: '25 dingen gebouwd', teken: '🏰' },
    { id: 'geeerd', naam: 'Geëerd', uitleg: 'Eer gekregen van je leerkracht', teken: '👑' },
  ];

  function rangVan(eer) {
    let i = 0;
    for (let k = 0; k < RANGEN.length; k++) if (eer >= RANGEN[k].vanaf) i = k;
    return i;
  }

  // Een vakje op je grond: "x,y" met x en y van 0 tot MAX_GROND-1. Je grond ligt midden in je perceel.
  const sleutel = (x, y) => `${x},${y}`;
  function binnen(rang, x, y) {
    const n = RANGEN[rang].grond;
    const o = Math.floor((MAX_GROND - n) / 2);
    return x >= o && y >= o && x < o + n && y < o + n;
  }

  // Een vakje op je eilandje: "e:x,y" met x en y van 0 tot EILANDJE.grond-1.
  const eSleutel = (x, y) => `e:${x},${y}`;

  // Wat een burcht gekost heeft.
  function kost(b) {
    let n = b && b.eiland ? EILANDJE.prijs : 0;
    for (const id of Object.values((b && b.grond) || {})) n += BY_ID[id] ? BY_ID[id].prijs : 0;
    for (const id of Object.values((b && b.stukken) || {})) n += BY_ID[id] ? BY_ID[id].prijs : 0;
    return n;
  }

  const api = { RANGEN, MAX_GROND, EILANDJE, eSleutel, STUKKEN, BY_ID, KLEUREN, SCHILDEN, rangVan, sleutel, binnen, kost };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Burcht = api;
})(this);
