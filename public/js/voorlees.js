// Voorlezen met de stem die al in de browser zit (speechSynthesis): geen bestanden, geen bibliotheek.
// Vaste volgorde: (1) een Vlaamse stem (nl-BE) van het toestel, (2) een andere Nederlandse stem, maar pas na een
// melding aan de leerling, (3) geen stem: een duidelijke melding ("steek je hand op") in plaats van stilte.
// Een andere taal (Voorlees.taal('fr'), of de taal van LANcelot) krijgt een stem in die taal.
// Wat er lukte, krijgt de leerkracht te zien in het live overzicht (Voorlees.wie(naam) zegt wie de leerling is).
const Voorlees = (() => {
  const synth = window.speechSynthesis;
  const kanToestel = !!(synth && window.SpeechSynthesisUtterance);
  // Er is altijd een knop: lukt voorlezen niet, dan zegt de knop dat (in plaats van niets te doen).
  const ok = true;
  let taal = String(window.LANCELOT_TAAL || 'nl').slice(0, 2).toLowerCase();
  let voice = null;
  let stand = null; // 'toestel-be' | 'toestel-nl' | 'toestel' | 'geen'
  let busy = null;
  let naam = '';
  let gemeld = '';
  let gewaarschuwd = false;
  // Een Vlaamse stem gaat voor, dan de stem van het eigen land (fr-BE en fr-FR zijn allebei goed).
  const LAND = { nl: 'nl-nl', fr: 'fr-fr', en: 'en-gb', de: 'de-de', es: 'es-es' };

  function pick() {
    const all = kanToestel ? synth.getVoices() : [];
    const score = v => {
      const lang = (v.lang || '').replace('_', '-').toLowerCase();
      if (!lang.startsWith(taal)) return -1;
      // Bekende goede Nederlandse stemmen (Google Nederlands, Microsoft Frank) iets voor.
      return (lang === `${taal}-be` ? 20 : lang === LAND[taal] ? 10 : 5) + (v.localService ? 2 : 0) + (/natural|online/i.test(v.name) ? 1 : 0) + (/google|frank/i.test(v.name) ? 1 : 0);
    };
    voice = all.map(v => [score(v), v]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).map(([, v]) => v)[0] || null;
    const lang = voice ? (voice.lang || '').replace('_', '-').toLowerCase() : '';
    stand = !voice ? 'geen' : taal !== 'nl' ? 'toestel' : lang === 'nl-be' ? 'toestel-be' : 'toestel-nl';
  }
  if (kanToestel) {
    pick();
    synth.addEventListener ? synth.addEventListener('voiceschanged', pick) : (synth.onvoiceschanged = pick);
  } else stand = 'geen';

  // Chrome laadt de stemmen pas even na het openen van de pagina: wacht daar kort op (hoogstens 1,5 s).
  function stemmenKlaar() {
    if (!kanToestel || synth.getVoices().length) return null;
    return new Promise(klaar => {
      const t = setTimeout(klaar, 1500);
      const f = () => { clearTimeout(t); klaar(); };
      if (synth.addEventListener) synth.addEventListener('voiceschanged', f, { once: true });
      else klaar();
    });
  }

  // De leerkracht ziet in het live overzicht wie geen goede stem heeft. Alleen als het verandert.
  function meldStand(s) {
    if (!naam || !s || s === gemeld || typeof fetch !== 'function') return;
    gemeld = s;
    fetch('/api/stem/stand', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ naam, stand: s }), keepalive: true }).catch(() => {});
  }
  const melding = tekst => (window.Ui && window.Ui.melding ? window.Ui.melding(tekst) : Promise.resolve());

  // Het geluid wakker houden. Tussen twee zinnen is het even helemaal stil: veel geluidskaarten en vooral USB- en
  // bluetooth-koptelefoons gaan dan slapen, en het wakker worden kost de eerste klank van de volgende zin. Daarom loopt er
  // tijdens het voorlezen een onhoorbaar zacht signaal (20 Hz, heel stil), dat al even speelt vóór de eerste zin.
  const OPWARMEN = 400; // ms vóór de eerste zin
  const UITLOOP = 300; // ms na de laatste zin
  let ctx = null;
  let osc = null;
  let wacht = null; // de eerste zin, na het opwarmen
  let uit = null; // het signaal stoppen, na de uitloop
  let wachter = null; // stopt als de knop weg is (bv. naar een andere vraag)

  function wakker() {
    clearTimeout(uit);
    uit = null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      // Pas na een klik (autoplay-regels): speak() komt altijd van een klik op 🎧.
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      if (osc) return true;
      osc = ctx.createOscillator();
      osc.frequency.value = 20;
      const g = ctx.createGain();
      g.gain.value = 0.001;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      return false;
    } catch {
      return true;
    }
  }
  function slaap() {
    clearTimeout(uit);
    uit = null;
    if (osc) { try { osc.stop(); osc.disconnect(); } catch {} }
    osc = null;
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  }

  // wakkerHouden: alleen intern, als er meteen een nieuwe tekst volgt (dan hoeft het geluid niet opnieuw op te warmen).
  function stop(wakkerHouden) {
    clearTimeout(wacht);
    wacht = null;
    clearInterval(wachter);
    wachter = null;
    if (kanToestel) synth.cancel();
    if (wakkerHouden !== true) slaap();
    if (busy) busy.classList.remove('praat');
    busy = null;
  }

  // Lange teksten in stukken: Chrome breekt een lange tekst met een online stem soms af. Zinnen samen tot stukken van
  // ongeveer 180 tekens (trager: 150), zodat er zo weinig mogelijk overgangen zijn. Een lange zin blijft heel.
  function chunks(text, max = 180) {
    // Zonder de tekens voor vet (**) en onderstreept (__) van De Proef.
    const zinnen = String(text).replace(/\*\*([^*\s](?:[^*]*?[^*\s])?)\*\*/g, '$1').replace(/__([^_\s](?:[^_]*?[^_\s])?)__/g, '$1').split(/\n+/).flatMap(line => line.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*/g) || [])
      .map(s => s.trim()).filter(s => /[\p{L}\p{N}]/u.test(s));
    const uitStukken = [];
    for (const z of zinnen) {
      const laatste = uitStukken.length - 1;
      if (laatste >= 0 && uitStukken[laatste].length + 1 + z.length <= max) uitStukken[laatste] += ` ${z}`;
      else uitStukken.push(z);
    }
    return uitStukken;
  }

  // Nog eens klikken op dezelfde knop stopt het voorlezen. traag: trager voorlezen (🐢, bv. bij een dictee; Jorn vroeg nog trager: .5).
  function speak(text, btn, { traag = false } = {}) {
    const again = btn && busy === btn;
    stop(true);
    if (again) return slaap();
    const parts = chunks(text, traag ? 150 : 180);
    if (!parts.length) return slaap();
    busy = btn || null;
    if (btn) btn.classList.add('praat');
    const mijn = busy;
    const klaar = () => {
      if (busy !== mijn) return;
      if (mijn) mijn.classList.remove('praat');
      busy = null;
      clearInterval(wachter);
      wachter = null;
      uit = setTimeout(slaap, UITLOOP);
    };
    const verder = () => {
      if (busy !== mijn) return;
      pick();
      meldStand(stand);
      // (3) Geen stem in deze taal op dit toestel: zeggen, niet zwijgen.
      if (stand === 'geen') {
        klaar();
        return melding('Voorlezen lukt niet op dit toestel. Steek je hand op.');
      }
      // (2) Een andere Nederlandse stem (bv. een Hollandse): eerst één keer zeggen, dan voorlezen.
      if (stand === 'toestel-nl' && !gewaarschuwd) {
        gewaarschuwd = true;
        return melding('Op dit toestel staat geen Vlaamse stem. Je hoort een andere Nederlandse stem.').then(() => { if (busy === mijn) zeg(); });
      }
      zeg();
    };
    const zeg = () => {
      const warm = wakker();
      const start = () => {
        wacht = null;
        if (busy !== mijn) return;
        parts.forEach((part, i) => {
          const u = new SpeechSynthesisUtterance(part);
          u.lang = voice.lang;
          u.voice = voice;
          u.rate = traag ? .5 : .9;
          if (i === parts.length - 1) u.onend = u.onerror = klaar;
          synth.speak(u);
        });
      };
      // Al wakker (bv. vlak na een vorige zin): meteen. Anders eerst even opwarmen.
      if (warm) start(); else wacht = setTimeout(start, OPWARMEN);
    };
    const wachten = stemmenKlaar();
    if (wachten) wachten.then(verder); else verder();
    // Is de knop weg of verborgen (de leerling ging naar een andere vraag), dan stoppen we, ook het stille signaal.
    if (btn) wachter = setInterval(() => { if (busy === btn && (!btn.isConnected || !btn.getClientRects().length)) stop(); }, 500);
  }

  // Een korte zin om te horen of het geluid werkt (de knop "Test geluid"), in de taal van het voorlezen.
  const TESTZIN = {
    nl: 'Hallo! Zo klinkt het voorlezen. Hoor je mij goed?',
    fr: 'Bonjour ! Voici la voix qui lit. Tu m\'entends bien ?',
    en: 'Hello! This is the reading voice. Can you hear me well?',
    de: 'Hallo! So klingt das Vorlesen. Hörst du mich gut?',
    es: '¡Hola! Así suena la lectura. ¿Me oyes bien?',
  };
  const test = btn => speak(TESTZIN[taal] || TESTZIN.nl, btn);
  // Elke knop met class "test-geluid" speelt de testzin.
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('.test-geluid');
      if (b) test(b);
    });
  }

  // Welke stem dit toestel gebruikt, in gewone woorden (voor de leerkracht in de instellingen).
  function info() {
    pick();
    return { stand, stem: voice ? `${voice.name} (${voice.lang})` : '' };
  }

  return {
    ok, speak, test, info, chunks, stop: () => stop(), voice: () => voice, stand: () => stand,
    // De taal van wat voorgelezen wordt (bv. 'fr' bij een Franse toets). Leeg: de taal van LANcelot.
    taal: t => { taal = String(t || window.LANCELOT_TAAL || 'nl').slice(0, 2).toLowerCase(); pick(); },
    wie: n => { const nieuw = String(n || '').trim().slice(0, 60); if (nieuw !== naam) gemeld = ''; naam = nieuw; },
  };
})();
