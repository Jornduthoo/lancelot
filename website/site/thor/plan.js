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

const START = '2026-11-21'; // papa 19/11: Thor begint dit weekend
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
const LEER_MIN = 15, HERHAAL_MIN = 5, PROEF_MIN = 20, ZWAK_MIN = 10; // 20/11: lessen korter (15 min) zodat alle vakken passen in 30 min / 1 uur
const LEER_VOOR = 3, HERHAAL_VOOR = 2; // nieuwe leerstof ten laatste 3 dagen voor het examen, herhalen 2 dagen ervoor
const PROEF_TWEE = false;          // twee proefexamens per vak (anders enkel de generale repetitie)
const EXAMENS_START = '2026-12-09';

// Examendag van een onderwerp: eigen datum (wiskunde deel 2) of die van het vak.
const examVan = t => t.examen || VAKKEN[t.vak].examen;

function maak(){
  const T = window.ELI_ONDERWERPEN || [];
  const per = {}; for (const t of T) (per[t.vak] = per[t.vak] || []).push(t);
  // Vakken met inhoud, vroegste examen eerst.
  const volg = Object.keys(VAKKEN).filter(v => per[v]).sort((a, b) => VAKKEN[a].examen < VAKKEN[b].examen ? -1 : 1);
  // Eerste ronde: vakken door elkaar (afwisseling helpt onthouden). Elk item krijgt een uiterste dag:
  // nieuwe leerstof ten laatste LEER_VOOR dagen voor het examen, herhalen ten laatste HERHAAL_VOOR dagen ervoor.
  const ronde = (soort, min, voor) => {
    const rij = [], idx = {}; volg.forEach(v => idx[v] = 0);
    let nog = true;
    while (nog) {
      nog = false;
      for (const v of volg) {
        const lijst = per[v] || [];
        if (idx[v] < lijst.length) {
          const t = lijst[idx[v]++];
          rij.push({ id: soort + ':' + t.id, soort, vak: v, onderwerp: t.id, titel: t.titel, min, uiterlijk: soort === 'leer' && t.leerTot && t.leerTot < dag(examVan(t), -voor) ? t.leerTot : dag(examVan(t), -voor) });
          nog = true;
        }
      }
    }
    return rij;
  };
  const leer = ronde('leer', LEER_MIN, LEER_VOOR), herhaal = ronde('herhaal', HERHAAL_MIN, HERHAAL_VOOR);
  const geleerd = {}; // onderwerp → dag waarop het geleerd wordt

  // Proefexamens en zwakke punten: de laatste dagen vóór elk examen (vast in de planning).
  const vast = {};
  const zet = (d, it) => { (vast[d] = vast[d] || []).push(it); };
  for (const v of volg) {
    const ex = VAKKEN[v].examen, k = VAKKEN[v].kort;
    const deel = v === 'wis' && per.wis.some(t => t.deel === 2) ? 1 : undefined;
    const k1 = deel ? k + ' deel 1' : k;
    // Generale repetitie de dag ervoor; zwakke punten twee dagen ervoor (bij een examen in de examenperiode: dezelfde dag als de repetitie).
    const voor1 = dag(ex, -1), voor2 = ex <= dag(EXAMENS_START, 1) ? dag(ex, -3) : dag(ex, -2);
    if (PROEF_TWEE) zet(voor2, { id:'proef:' + v + ':1', soort:'proef', vak:v, deel, titel:'Proefexamen ' + k1, min: PROEF_MIN });
    zet(voor2, { id:'zwak:' + v + ':1',  soort:'zwak',  vak:v, deel, titel:'Zwakke punten ' + k1 + ' wegwerken', min: ZWAK_MIN });
    zet(voor1, { id:'proef:' + v + ':2', soort:'proef', vak:v, deel, titel:'Generale repetitie ' + k1, min: PROEF_MIN });
  }
  // Wiskunde deel 2 (ma 14/12): proefexamen in het weekend ervoor.
  if (per.wis && per.wis.some(t => t.deel === 2)) zet('2026-12-13', { id:'proef:wis:3', soort:'proef', vak:'wis', deel:2, titel:'Proefexamen Wiskunde deel 2', min: PROEF_MIN });

  const plan = {};
  const wachtrij = [...leer, ...herhaal];
  for (const d of dagen()) {
    const b = budget(d);
    const items = [];
    const kaart = (b > 0 && d > START) ? { id:'kaarten:' + d, soort:'kaarten', titel:'Herhaalkaartjes van vandaag', min: Math.min(b >= 60 ? 10 : KAART_MIN, b), dyn:true } : null;
    let over = b - (kaart ? kaart.min : 0);
    if (vast[d]) { for (const it of vast[d]) { items.push(it); over -= it.min; } }
    // Wat vandaag zijn uiterste dag heeft en nog niet gepland is, moet er sowieso bij (ook als het krap wordt).
    // Verder kiest de planning telkens het vak dat het meest achterloopt: resterende minuten ÷ dagen tot de uiterste dag.
    // Zo schuiven alle vakken samen op en komt Nederlands (laatste examen) niet allemaal op het einde.
    const mag = it => b > 0 && d <= it.uiterlijk && (it.soort !== 'herhaal' || (geleerd[it.onderwerp] && geleerd[it.onderwerp] < d));
    for (const it of wachtrij.filter(x => mag(x) && x.uiterlijk === d)) {
      items.push(it); over -= it.min; wachtrij.splice(wachtrij.indexOf(it), 1);
      if (it.soort === 'leer') geleerd[it.onderwerp] = d;
    }
    const dagenTot = x => Math.round((new Date(x + 'T12:00:00') - new Date(d + 'T12:00:00')) / 864e5) + 1;
    for (;;) {
      const kand = wachtrij.filter(x => mag(x) && x.min <= over);
      if (!kand.length) break;
      // Eerste kandidaat per vak (in volgorde), en de druk op dat vak.
      const eerste = {}, druk = {};
      for (const x of kand) if (!eerste[x.vak]) eerste[x.vak] = x;
      for (const v in eerste) {
        const rest = wachtrij.filter(x => x.vak === v && x.uiterlijk >= d);
        druk[v] = Math.max(...rest.map(x => rest.filter(y => y.uiterlijk <= x.uiterlijk).reduce((a, y) => a + y.min, 0) / dagenTot(x.uiterlijk)));
      }
      const v = Object.keys(eerste).sort((a, b2) => druk[b2] - druk[a] || (items.some(i => i.vak === a) - items.some(i => i.vak === b2)))[0];
      const it = eerste[v];
      items.push(it); over -= it.min; wachtrij.splice(wachtrij.indexOf(it), 1);
      if (it.soort === 'leer') geleerd[it.onderwerp] = d;
    }
    const gebruikt = items.reduce((a, i) => a + i.min, 0) + (kaart ? kaart.min : 0);
    if (b >= 30 && d > START && d < EXAMENS_START && b - gebruikt >= OVERHOOR_MIN) items.push({ id:'overhoor:' + d, soort:'overhoor', titel:'Leg het uit aan een supporter', min: OVERHOOR_MIN, dyn:true });
    if (kaart) items.push(kaart);
    plan[d] = items;
  }
  // Wat er dan nog over is (kan alleen als de uiterste dag voor de start lag), komt op de eerste dag.
  if (wachtrij.length && plan[START]) plan[START].push(...wachtrij.splice(0));
  return plan;
}

window.ELI_PLAN = { VAKKEN, EXTRA_EXAMEN, START, EINDE, budget, dag, dagen, maak, LEER_MIN, HERHAAL_MIN, PROEF_MIN };
})();
