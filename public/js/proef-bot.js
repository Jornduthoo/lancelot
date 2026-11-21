// Proefspelen: een proefleerling in een venster op het bord (/?proef=1, 2 of 3), zodat een leerkracht een spel
// kan uitproberen zonder klas. Proefridder 1 bestuurt de leerkracht zelf; 2 en 3 melden zich aan en antwoorden
// vanzelf, zodat ook ploegspellen kunnen starten. Zie namen-host.js (knop Proefspelen) en src/logboek.js.
(() => {
  if (typeof PROEF === 'undefined' || !PROEF) return;
  const nr = Number(PROEF) || 1;
  // Is de naam nog bezet (bord herladen, andere browser), dan schuift de proefridder een nummer op: 1 wordt 4, 7 ...
  let pogingen = 0;
  const naamNu = () => `Proefridder ${nr + 3 * Math.floor(pogingen / 4)}`;
  const zichtbaar = el => !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  let wachtTot = 0;
  // Wat een proefridder na een vraag als juist antwoord ziet oplichten, onthoudt hij: komt die vraag terug, dan weet
  // hij het. Zo verdienen ook gokkende proefridders genoeg (bv. ballen in Kegelridder).
  const geweten = new Map();
  const vraagVan = el => {
    const box = el.closest('.ak-question, [class*="question"], [class*="vraag"], section');
    const tekst = box && box.querySelector('.tw-q-text, .q-small, [class*="q-text"], h2, h3');
    return tekst ? tekst.textContent.trim() : '';
  };
  setInterval(() => {
    for (const juist of document.querySelectorAll('.answers button.right, .antwoorden button.right')) {
      const vraag = vraagVan(juist);
      if (vraag && zichtbaar(juist)) geweten.set(vraag, juist.textContent.trim());
    }
    // De ridder aanpassen slaan we over.
    const klaar = document.querySelector('#av-done');
    if (zichtbaar(klaar)) return klaar.click();
    // Een aanmeldscherm: naam invullen en binnengaan.
    for (const form of document.querySelectorAll('form')) {
      if (!zichtbaar(form)) continue;
      const veld = form.querySelector('input[maxlength], input:not([type]), input[type="text"]');
      if (!veld || !zichtbaar(veld)) continue;
      const naam = naamNu(); pogingen++;
      if (veld.value !== naam) { veld.value = naam; veld.dispatchEvent(new Event('input', { bubbles: true })); }
      if (form.requestSubmit) form.requestSubmit(); else form.querySelector('button')?.click();
      return;
    }
    if (nr === 1) return; // de leerkracht speelt zelf
    // Een vraag: even nadenken, dan een antwoord kiezen (twee op de drie keer het juiste weten ze niet: gewoon gokken).
    const knoppen = [...document.querySelectorAll('.answers button, .antwoorden button, [class*="vraag"] button, [class*="quiz"] button')].filter(b => zichtbaar(b) && !b.disabled);
    // Geen vraag: een spel kan zelf iets laten doen (bv. Kegelridder gooit een bal), via window.proefActie.
    if (!knoppen.length) { wachtTot = 0; if (typeof window.proefActie === 'function') window.proefActie(); return; }
    if (!wachtTot) { wachtTot = Date.now() + 1500 + Math.random() * 2500; return; }
    if (Date.now() < wachtTot) return;
    wachtTot = 0;
    const weet = geweten.get(vraagVan(knoppen[0]));
    const kies = weet && knoppen.find(b => b.textContent.trim() === weet);
    (kies || knoppen[Math.floor(Math.random() * knoppen.length)]).click();
  }, 700);
})();
