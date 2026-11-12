// Het schoolnetwerk (DHCP) geeft de bord-pc af en toe een nieuw adres. Dat is normaal, maar de leerlingen
// moeten dan opnieuw verbinden. We onthouden de laatste adressen van deze pc, zodat /netwerk het kan uitleggen
// en de leerkracht met één klik een bericht voor de ICT-verantwoordelijke kan kopiëren (vast adres vragen).
'use strict';

const MAX = 8;
// Alleen adressen in hetzelfde netwerk tellen: een laptop die thuis een ander netwerk heeft, is geen wisseling.
const net = ip => String(ip).split('.').slice(0, 3).join('.');

// oud: de vorige adressen (nieuwste eerst). nu: het adres van vandaag.
// Geeft de nieuwe lijst, of er iets veranderde (nieuw) en het vorige adres in hetzelfde netwerk als het adres veranderd is (anders '').
function volg(oud, nu) {
  const lijst = Array.isArray(oud) ? oud.filter(a => typeof a === 'string') : [];
  if (!nu || lijst[0] === nu) return { adressen: lijst, vorig: '', nieuw: false };
  const vorig = lijst.find(a => net(a) === net(nu)) || '';
  return { adressen: [nu, ...lijst.filter(a => a !== nu)].slice(0, MAX), vorig, nieuw: true };
}

// De eerdere adressen in hetzelfde netwerk als nu (voor het bericht aan ICT).
function eerder(adressen, nu) {
  return (Array.isArray(adressen) ? adressen : []).filter(a => a !== nu && net(a) === net(nu));
}

// Windows toont een MAC-adres als B0-47-E9-BE-65-9F; Node geeft b0:47:e9:be:65:9f.
function mac(m) {
  if (!m || /^(00:){5}00$/.test(m)) return '';
  return m.toUpperCase().replace(/:/g, '-');
}

module.exports = { volg, eerder, mac };
