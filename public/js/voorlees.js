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
      return (lang === 'nl-be' ? 20 : lang === 'nl-nl' ? 10 : 5) + (v.localService ? 2 : 0) + (/natural|online/i.test(v.name) ? 1 : 0);
    };
    voice = all.map(v => [score(v), v]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).map(([, v]) => v)[0] || null;
  }
  if (ok) {
    pick();
    synth.addEventListener ? synth.addEventListener('voiceschanged', pick) : (synth.onvoiceschanged = pick);
  }

  function stop() {
    if (!ok) return;
    synth.cancel();
    if (busy) busy.classList.remove('praat');
    busy = null;
  }

  // Lange teksten in regels en zinnen knippen: Chrome breekt een lange zin met een online stem soms af.
  function chunks(text) {
    return String(text).split(/\n+/).flatMap(line => line.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*/g) || [])
      .map(s => s.trim()).filter(s => /[\p{L}\p{N}]/u.test(s));
  }

  // Nog eens klikken op dezelfde knop stopt het voorlezen.
  function speak(text, btn) {
    if (!ok) return;
    const again = btn && busy === btn;
    stop();
    if (again) return;
    const parts = chunks(text);
    if (!parts.length) return;
    busy = btn || null;
    if (btn) btn.classList.add('praat');
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = voice ? voice.lang : 'nl-BE';
      if (voice) u.voice = voice;
      u.rate = .9;
      if (i === parts.length - 1) u.onend = u.onerror = () => { if (busy === btn) stop(); };
      synth.speak(u);
    });
  }

  return { ok, speak, stop, voice: () => voice };
})();
