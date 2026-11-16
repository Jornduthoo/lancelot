// Thor's dagplanning van 17/11 tot het laatste examen (15/12).
// Werkt zoals bij Eli: eerst alles één keer leren, dan een tweede ronde (herhalen), dan proefexamens.
// Wat niet af is, schuift als inhaalwerk door. De planning bouwt zich op uit de onderwerpen die er zijn:
// komen er vakken bij (na woensdag 18/11), dan schuiven ze vanzelf mee in.
(function(){
const VAKKEN = {
  wis:  { naam:'Wiskunde',            kort:'Wiskunde',  kleur:'#1c7ed6', icoon:'📐', examen:'2026-12-09', uur:'wo 9/12 + ma 14/12', trofee:'Rekenkoning' },
  ges:  { naam:'Geschiedenis',        kort:'Geschiedenis', kleur:'#c2255c', icoon:'🏛️', examen:'2026-12-10', uur:'do 10/12 · 8u30', trofee:'Tijdreiziger' },
  stem: { naam:'STEM',                kort:'STEM',      kleur:'#f08c00', icoon:'⚙️', examen:'2026-12-10', uur:'do 10/12 · 10u25', trofee:'Uitvinder' },
  nat:  { naam:'Natuurweten­schappen', kort:'Natuur',    kleur:'#2f9e44', icoon:'🔬', examen:'2026-12-11', uur:'vr 11/12 · 10u25', trofee:'Onderzoeker' },
  tech: { naam:'Techniek',            kort:'Techniek',  kleur:'#5f3dc4', icoon:'🛠️', examen:'2026-12-14', uur:'ma 14/12 · 10u25', trofee:'Bouwmeester' },
  ned:  { naam:'Nederlands',          kort:'Nederlands', kleur:'#e8590c', icoon:'📝', examen:'2026-12-15', uur:'di 15/12 · 10u25', trofee:'Taalkampioen' },
};
// Wiskunde heeft 2 examendagen: deel 2 op maandag 14/12.
const EXTRA_EXAMEN = { '2026-12-14': ['wis'] };

const START = '2026-11-17';
const EINDE = '2026-12-15';

// Hoeveel minuten per dag (papa 16/11: 30 min op schooldagen, een uur in het weekend).
function budget(datum){
  const d = new Date(datum + 'T12:00:00');
  const wd = d.getDay(); // 0 zo … 6 za
  if (datum < START) return 0;            // voor de start: alleen kennismaken
  if (datum === EINDE) return 0;          // laatste examen
  if (wd === 0 || wd === 6) return 60;    // weekend: een uur
  return 30;                              // schooldag: 30 minuutjes
}

const dag = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };
const dagen = () => { const out = []; for (let d = START; d <= EINDE; d = dag(d, 1)) out.push(d); return out; };

const KAART_MIN = 5;            // herhaalkaartjes elke dag (weekend 10)
const OVERHOOR_MIN = 5;         // uitleggen aan een supporter
const LEER_MIN = 20, HERHAAL_MIN = 7, PROEF_MIN = 20, ZWAK_MIN = 10;
const EXAMENS_START = '2026-12-09';

function maak(){
  const T = window.ELI_ONDERWERPEN || [];
  const per = {}; for (const t of T) (per[t.vak] = per[t.vak] || []).push(t);
  // Vakken met inhoud, vroegste examen eerst.
  const volg = Object.keys(VAKKEN).filter(v => per[v]).sort((a, b) => VAKKEN[a].examen < VAKKEN[b].examen ? -1 : 1);
  // Eerste ronde: vakken door elkaar (afwisseling helpt onthouden).
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

  // Proefexamens en zwakke punten: de laatste dagen vóór elk examen (vast in de planning).
  const vast = {};
  const zet = (d, it) => { (vast[d] = vast[d] || []).push(it); };
  for (const v of volg) {
    const ex = VAKKEN[v].examen, k = VAKKEN[v].kort;
    // Examens vóór de examenperiode-start: generale repetitie op de dag ervoor, proefexamen 2 dagen ervoor.
    // In de examenperiode zelf: de namiddag van de dag ervoor.
    const voor1 = dag(ex, -1), voor2 = ex <= dag(EXAMENS_START, 1) ? dag(ex, -3) : dag(ex, -2);
    zet(voor2, { id:'proef:' + v + ':1', soort:'proef', vak:v, titel:'Proefexamen ' + k, min: PROEF_MIN });
    zet(voor2, { id:'zwak:' + v + ':1',  soort:'zwak',  vak:v, titel:'Zwakke punten ' + k + ' wegwerken', min: ZWAK_MIN });
    zet(voor1, { id:'proef:' + v + ':2', soort:'proef', vak:v, titel:'Generale repetitie ' + k, min: PROEF_MIN });
  }
  // Wiskunde deel 2: nog eens herhalen tussen de twee examens.
  if (per.wis) zet('2026-12-13', { id:'proef:wis:3', soort:'proef', vak:'wis', titel:'Proefexamen Wiskunde deel 2', min: PROEF_MIN });

  // Vanaf deze dag geen nieuwe leerstof meer: dan alleen proefexamens en herhalen.
  const laatsteLeerdag = dag(EXAMENS_START, -4); // za 5/12
  const plan = {};
  for (const d of dagen()) {
    const b = budget(d);
    const items = [];
    const kaart = (b > 0 && d > START) ? { id:'kaarten:' + d, soort:'kaarten', titel:'Herhaalkaartjes van vandaag', min: Math.min(b >= 60 ? 10 : KAART_MIN, b), dyn:true } : null;
    const sluit = () => {
      const gebruikt = items.reduce((a, i) => a + i.min, 0) + (kaart ? kaart.min : 0);
      if (b >= 30 && d > START && d < EXAMENS_START && b - gebruikt >= OVERHOOR_MIN) items.push({ id:'overhoor:' + d, soort:'overhoor', titel:'Leg het uit aan een supporter', min: OVERHOOR_MIN, dyn:true });
      if (kaart) items.push(kaart); plan[d] = items;
    };
    let over = b - (kaart ? kaart.min : 0);
    if (vast[d]) { for (const it of vast[d]) { items.push(it); over -= it.min; } }
    if (d <= laatsteLeerdag) {
      while (wachtrij.length && over >= wachtrij[0].min) {
        const t = wachtrij.shift();
        items.push(t);
        over -= t.min;
      }
    }
    sluit();
  }
  // Wat er na de laatste leerdag nog in de wachtrij zit, komt er die dag nog bij.
  if (wachtrij.length && plan[laatsteLeerdag]) plan[laatsteLeerdag].splice(-1, 0, ...wachtrij.splice(0));
  return plan;
}

window.ELI_PLAN = { VAKKEN, EXTRA_EXAMEN, START, EINDE, budget, dag, dagen, maak, LEER_MIN, HERHAAL_MIN, PROEF_MIN };
})();
