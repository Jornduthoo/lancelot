// De dagplanning van 13/11 tot de examens (7/12–10/12).
// Elke dag begint met de herhaalkaartjes van die dag (spaced repetition, Leitner).
// Daarna volgen vaste taken: eerst alles één keer leren, dan een tweede ronde, dan proefexamens.
// Wat niet af is, schuift als inhaalwerk door naar de volgende dag. Zwakke onderwerpen komen er extra bij.
(function(){
const VAKKEN = {
  kf:  { naam:'Kunst & Filosofie', kort:'K&F',  kleur:'#7048e8', icoon:'🎨', examen:'2026-12-07', uur:'ma 7/12 · 9u00' },
  gsw: { naam:'Gedrag (GSW)',      kort:'Gedrag', kleur:'#e8590c', icoon:'🧠', examen:'2026-12-07', uur:'ma 7/12 · 10u55' },
  fr:  { naam:'Frans',             kort:'Frans', kleur:'#1971c2', icoon:'🥐', examen:'2026-12-08', uur:'di 8/12 · 9u00 + 10u55' },
  wet: { naam:'Project Wetenschappen', kort:'Wetenschappen', kleur:'#2f9e44', icoon:'🔬', examen:'2026-12-09', uur:'wo 9/12 · 9u00 + 10u55' },
  cul: { naam:'Project Cultuur',   kort:'Cultuur', kleur:'#c2255c', icoon:'🏛️', examen:'2026-12-10', uur:'do 10/12 · 9u00 + 10u55' },
};

const START = '2026-11-14';
const EINDE = '2026-12-10';

// Hoeveel minuten per dag (afspraak met papa).
function budget(datum){
  const d = new Date(datum + 'T12:00:00');
  const wd = d.getDay(); // 0 zo … 6 za
  if (datum < START) return 0;                      // voor de start: alleen kennismaken
  if (datum === '2026-12-10') return 0;            // laatste examen
  if (wd === 2) return 10;                          // dinsdag: voetbal
  if (wd === 0 || wd === 6) return 100;             // weekend
  return 60;
}

const dag = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };
const dagen = () => { const out = []; for (let d = START; d <= EINDE; d = dag(d, 1)) out.push(d); return out; };

const KAART_MIN = 10;           // herhaalkaartjes elke dag
const OVERHOOR_MIN = 5;         // uitleggen aan een supporter
const LEER_MIN = 22, HERHAAL_MIN = 10, PROEF_MIN = 25, ZWAK_MIN = 15;

function maak(){
  const T = window.ELI_ONDERWERPEN || [];
  const per = {}; for (const t of T) (per[t.vak] = per[t.vak] || []).push(t);
  // Eerste ronde: vakken door elkaar (afwisseling helpt onthouden), vroegste examen krijgt voorrang.
  const volg = ['kf','gsw','fr','wet','cul'];
  const ronde = (soort, min) => {
    const rij = [], idx = {}; volg.forEach(v => idx[v] = 0);
    let nog = true;
    while (nog) {
      nog = false;
      for (const v of volg) {
        const lijst = per[v] || [];
        if (idx[v] < lijst.length) {
          const t = lijst[idx[v]++];
          rij.push({ id: soort + ':' + t.id, soort, vak: v, onderwerp: t.id, titel: t.titel, min });
          nog = true;
        }
      }
    }
    return rij;
  };
  const wachtrij = [...ronde('leer', LEER_MIN), ...ronde('herhaal', HERHAAL_MIN)];
  // Proefexamens Wetenschappen en Cultuur vóór het weekend van 5/12.
  wachtrij.push({ id:'proef:wet:1', soort:'proef', vak:'wet', titel:'Proefexamen Wetenschappen', min: PROEF_MIN });
  wachtrij.push({ id:'proef:cul:1', soort:'proef', vak:'cul', titel:'Proefexamen Cultuur', min: PROEF_MIN });
  wachtrij.push({ id:'zwak:wet:1', soort:'zwak', vak:'wet', titel:'Zwakke punten Wetenschappen wegwerken', min: ZWAK_MIN });

  // Vaste examenperiode (het slot van de planning).
  const vast = {
    '2026-12-05': [
      { id:'proef:kf:1',  soort:'proef', vak:'kf',  titel:'Proefexamen Kunst & Filosofie', min: PROEF_MIN },
      { id:'zwak:kf:1',   soort:'zwak',  vak:'kf',  titel:'Zwakke punten K&F wegwerken', min: ZWAK_MIN },
      { id:'proef:gsw:1', soort:'proef', vak:'gsw', titel:'Proefexamen Gedrag', min: PROEF_MIN },
      { id:'zwak:gsw:1',  soort:'zwak',  vak:'gsw', titel:'Zwakke punten Gedrag wegwerken', min: ZWAK_MIN },
    ],
    '2026-12-06': [
      { id:'proef:kf:2',  soort:'proef', vak:'kf',  titel:'Generale repetitie K&F', min: PROEF_MIN },
      { id:'proef:gsw:2', soort:'proef', vak:'gsw', titel:'Generale repetitie Gedrag', min: PROEF_MIN },
      { id:'proef:fr:1',  soort:'proef', vak:'fr',  titel:'Proefexamen Frans', min: PROEF_MIN },
    ],
    '2026-12-07': [
      { id:'zwak:fr:1',   soort:'zwak',  vak:'fr',  titel:'Zwakke punten Frans wegwerken', min: ZWAK_MIN },
      { id:'drill:fr:1',  soort:'drill', vak:'fr',  titel:'Werkwoorden-sprint', min: 10 },
      { id:'proef:fr:2',  soort:'proef', vak:'fr',  titel:'Generale repetitie Frans', min: PROEF_MIN },
    ],
    '2026-12-08': [],
    '2026-12-09': [
      { id:'zwak:cul:1',  soort:'zwak',  vak:'cul', titel:'Zwakke punten Cultuur wegwerken', min: ZWAK_MIN },
      { id:'proef:cul:2', soort:'proef', vak:'cul', titel:'Generale repetitie Cultuur', min: PROEF_MIN },
    ],
  };

  const plan = {};
  for (const d of dagen()) {
    const b = budget(d);
    const items = [];
    // Eerst leren, daarna pas de herhaalkaartjes (en op de eerste dag zijn er nog geen kaartjes).
    const kaart = (b > 0 && d > START) ? { id:'kaarten:' + d, soort:'kaarten', titel:'Herhaalkaartjes van vandaag', min: Math.min(KAART_MIN, b), dyn:true } : null;
    // Elke dag (behalve korte dagen en examendagen) 5 minuten uitleggen aan een supporter.
    // Alleen als er na het leren nog 5 minuten over zijn, zodat de planning niet opschuift.
    const sluit = () => {
      const gebruikt = items.reduce((a, i) => a + i.min, 0) + (kaart ? kaart.min : 0);
      if (b >= 30 && d > START && d < '2026-12-07' && b - gebruikt >= OVERHOOR_MIN) items.push({ id:'overhoor:' + d, soort:'overhoor', titel:'Leg het uit aan een supporter', min: OVERHOOR_MIN, dyn:true });
      if (kaart) items.push(kaart); plan[d] = items;
    };
    if (vast[d]) { items.push(...vast[d]); sluit(); continue; }
    if (d >= '2026-12-05') { sluit(); continue; }
    let over = b - (kaart ? KAART_MIN : 0);
    while (wachtrij.length && over >= Math.min(10, wachtrij[0].min)) {
      const t = wachtrij.shift();
      items.push(t);
      over -= t.min;
    }
    sluit();
  }
  // Wat er na 4/12 nog in de wachtrij zit (mag eigenlijk niet), komt op 4/12 als extra.
  if (wachtrij.length) plan['2026-12-04'].splice(-1, 0, ...wachtrij.splice(0));
  return plan;
}

window.ELI_PLAN = { VAKKEN, START, EINDE, budget, dag, dagen, maak, LEER_MIN, HERHAAL_MIN, PROEF_MIN };
})();
