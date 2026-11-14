// Spelregels voor Eli rond Drakenjacht: alleen na inloggen, de beloning één keer per dag, de pauze alleen vanuit een pauze.
(function(){
const { sessie, lokaal, vandaag, rpc } = window.ELI;
const s = sessie.get();
const dag = vandaag();
const dicht = tekst => {
  $('eli-dicht-tekst').textContent = tekst;
  document.body.dataset.cg = '';
  $('galaga').style.display = 'none';
  $('eli-dicht').classList.remove('hidden');
};
const MEEKIJK = new URLSearchParams(location.search).has('meekijk') && s && s.rol === 'ouder';
if (!s || (s.rol !== 'eli' && !MEEKIJK)) return dicht('Log eerst in bij je leerploeg.');
if (MEEKIJK) { /* supporter probeert het spel uit: geen slot, niets bewaard */ }
else if (MODUS === 'beloning') {
  if (lokaal.get('beloning-' + dag, false)) return dicht('Je hebt vandaag al gespeeld. Morgen weer, na je training! 🐉');
  lokaal.set('beloning-' + dag, true);
} else {
  if (!s.terugNaPauze) return dicht('Drakenjacht kan je spelen in een pauze of als alle opdrachten af zijn.');
}

// Klokje bovenaan: hoeveel speeltijd nog.
const klok = document.createElement('div'); klok.id = 'eli-klok'; document.body.append(klok);
const eind = Date.now() + MINUTEN * 60000 + 4000;
const t = setInterval(() => {
  const sec = Math.max(0, Math.round((eind - Date.now()) / 1000));
  klok.textContent = (MODUS === 'pauze' ? 'Pauze · ' : 'Beloning · ') + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  if (!sec) clearInterval(t);
}, 500);

// Opstarten: de nep-server meldt dat er een spel klaarstaat.
fire('connect');
fire('cg-state', { active:true, run:1, phase:'lobby', minutes:MINUTEN, now:Date.now(), boss:{ on:false }, players:0 });

addEventListener('spel-einde', e => {
  clearInterval(t); klok.remove();
  const r = e.detail;
  $('eli-einde-tekst').textContent = MODUS === 'pauze' ? 'De pauze is voorbij. Terug naar de training, kampioen!' : 'Goed gespeeld! Tot morgen.';
  if (!MEEKIJK) rpc('eli_log', { p_naam: s.naam, p_pin: s.pin, p_soort: 'spel', p_vak: null, p_onderwerp: null, p_score: r.right, p_totaal: r.right + r.wrong,
    p_xp: Math.min(100, r.right * 3), p_detail: { modus: MODUS, score: r.score, draken: r.dragons, golf: r.wave, baas: r.boss } }).catch(() => {});
});
$('eli-terug').onclick = () => location.href = MEEKIJK ? 'index.html?meekijk=1' : 'index.html';
})();
