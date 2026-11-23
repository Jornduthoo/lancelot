// Voorlezen met de stem die al in de browser zit (speechSynthesis): geen bestanden, geen bibliotheek.
// Liefst een Vlaamse stem (nl-BE), anders een Nederlandse (nl-NL), anders eender welke Nederlandse.
// Een stem die op het toestel zelf staat (localService) gaat voor: die werkt ook zonder internet.
const Voorlees = (() => {
  const synth = window.speechSynthesis;
  const ok = !!(synth && window.SpeechSynthesisUtterance);
  let voice = null;
  let busy = null;

  function pick() {
    const all = synth.getVoices();
    const score = v => {
      const lang = (v.lang || '').replace('_', '-').toLowerCase();
      if (!lang.startsWith('nl')) return -1;
      // Bekende goede Nederlandse stemmen (Google Nederlands, Microsoft Frank) iets voor.
      return (lang === 'nl-be' ? 20 : lang === 'nl-nl' ? 10 : 5) + (v.localService ? 2 : 0) + (/natural|online/i.test(v.name) ? 1 : 0) + (/google|frank/i.test(v.name) ? 1 : 0);
    };
    voice = all.map(v => [score(v), v]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).map(([, v]) => v)[0] || null;
  }
  if (ok) {
    pick();
    synth.addEventListener ? synth.addEventListener('voiceschanged', pick) : (synth.onvoiceschanged = pick);
  }

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
    if (!ok) return;
    clearTimeout(wacht);
    wacht = null;
    clearInterval(wachter);
    wachter = null;
    synth.cancel();
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
    if (!ok) return;
    const again = btn && busy === btn;
    stop(true);
    if (again) return slaap();
    const parts = chunks(text, traag ? 150 : 180);
    if (!parts.length) return slaap();
    busy = btn || null;
    if (btn) btn.classList.add('praat');
    const warm = wakker();
    const mijn = busy;
    const start = () => {
      wacht = null;
      if (busy !== mijn) return;
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = voice ? voice.lang : 'nl-BE';
        if (voice) u.voice = voice;
        u.rate = traag ? .5 : .9;
        if (i === parts.length - 1) {
          u.onend = u.onerror = () => {
            if (busy !== mijn) return;
            if (mijn) mijn.classList.remove('praat');
            busy = null;
            clearInterval(wachter);
            wachter = null;
            uit = setTimeout(slaap, UITLOOP);
          };
        }
        synth.speak(u);
      });
    };
    // Al wakker (bv. vlak na een vorige zin): meteen. Anders eerst even opwarmen.
    if (warm) start(); else wacht = setTimeout(start, OPWARMEN);
    // Is de knop weg of verborgen (de leerling ging naar een andere vraag), dan stoppen we, ook het stille signaal.
    if (btn) wachter = setInterval(() => { if (busy === btn && (!btn.isConnected || !btn.getClientRects().length)) stop(); }, 500);
  }

  return { ok, speak, stop: () => stop(), chunks, voice: () => voice };
})();
