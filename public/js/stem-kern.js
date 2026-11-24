// Voorlezen met de stem van LANcelot: dezelfde stukken tekst op de server (die maakt en bewaart het geluid, src/stem.js)
// en in de browser (die speelt het af, voorlees.js). Elk stuk is één geluidsbestand. Een stuk hangt alleen af van zijn
// eigen regel, zodat de server het al kan maken als de taak gegeven wordt (ook als de keuzes per leerling geschud zijn).
(function (root, maak) {
  if (typeof module === 'object' && module.exports) module.exports = maak();
  else root.StemKern = maak();
})(typeof self !== 'undefined' ? self : this, () => {
  const MAX = 180;
  const MAX_TRAAG = 150;

  // Zonder de tekens voor vet (**) en onderstreept (__) van De Proef.
  const zonderOpmaak = t => String(t ?? '').replace(/\*\*([^*\s](?:[^*]*?[^*\s])?)\*\*/g, '$1').replace(/__([^_\s](?:[^_]*?[^_\s])?)__/g, '$1');

  // Zinnen samen tot stukken van ongeveer 180 tekens (trager: 150). Een lange zin blijft heel.
  function samen(zinnen, max) {
    const uit = [];
    for (const z of zinnen) {
      const laatste = uit.length - 1;
      if (laatste >= 0 && uit[laatste].length + 1 + z.length <= max) uit[laatste] += ` ${z}`;
      else uit.push(z);
    }
    return uit;
  }
  const zinnenVan = regel => (regel.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*/g) || []).map(s => s.trim()).filter(s => /[\p{L}\p{N}]/u.test(s));

  // De stukken voor de stem van het toestel (zoals vroeger): zinnen over de regels heen samen.
  function stukken(tekst, max = MAX) {
    return samen(zonderOpmaak(tekst).split(/\n+/).flatMap(zinnenVan), max);
  }

  // De stukken voor de stem van LANcelot: per regel, een open vakje (…) is een pauze, en "A: tekst" (een keuze)
  // wordt "A:" en "tekst". Zo staat elk stuk ook zo in de taak zelf.
  function serverStukken(tekst, traag = false) {
    const max = traag ? MAX_TRAAG : MAX;
    const uit = [];
    for (const regel of zonderOpmaak(tekst).split(/\n+/)) {
      const keuze = regel.match(/^\s*([A-Z]):\s+(.+)$/);
      if (keuze) uit.push(`${keuze[1]}:`);
      for (const deel of (keuze ? keuze[2] : regel).split('…')) uit.push(...samen(zinnenVan(deel), max));
    }
    return uit;
  }

  // Een korte zin om te horen of het geluid werkt, in de taal van het voorlezen.
  const TESTZIN = {
    nl: 'Hallo! Zo klinkt het voorlezen. Hoor je mij goed?',
    fr: 'Bonjour ! Voici la voix qui lit. Tu m\'entends bien ?',
    en: 'Hello! This is the reading voice. Can you hear me well?',
    de: 'Hallo! So klingt das Vorlesen. Hörst du mich gut?',
    es: '¡Hola! Así suena la lectura. ¿Me oyes bien?',
  };
  const VAST = ['Kies uit:', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => `${l}:`)];

  return { MAX, MAX_TRAAG, zonderOpmaak, stukken, serverStukken, TESTZIN, VAST };
});
