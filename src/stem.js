// Voorlezen: welke stem elke leerling hoort. De leerling meldt het zelf (voorlees.js, POST /api/stem/stand) als het
// voorlezen begint of bij "Test geluid"; de leerkracht ziet in het live overzicht een icoontje bij wie geen goede stem
// heeft. Alleen in het geheugen: na een herstart of na 8 uur is het weg (het gaat alleen over de les van vandaag).
const STANDEN = ['server', 'toestel-be', 'toestel-nl', 'toestel', 'geen'];
const HOUD = 8 * 60 * 60 * 1000;

let standen = new Map(); // naam in kleine letters -> { naam, stand, tijd }

const sleutel = naam => String(naam || '').trim().toLowerCase();

function zetStand({ naam, stand } = {}, nu = Date.now()) {
  const n = String(naam || '').trim().slice(0, 60);
  if (!n || !STANDEN.includes(stand)) return false;
  const oud = standen.get(sleutel(n));
  standen.set(sleutel(n), { naam: n, stand, tijd: nu });
  return !oud || oud.stand !== stand;
}

// Voor het leerkrachtenscherm: { leerlingen: { 'naam in kleine letters': stand } }.
function standenView(nu = Date.now()) {
  const leerlingen = {};
  for (const [k, v] of standen) {
    if (nu - v.tijd > HOUD) standen.delete(k);
    else leerlingen[k] = v.stand;
  }
  return { leerlingen };
}

function wisStanden() {
  standen = new Map();
}

module.exports = { STANDEN, zetStand, standenView, wisStanden };
