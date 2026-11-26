// Deel 4 van de connector (wens 26 nov: "de connector moet zowat alles kunnen"): de inhoud die de leerkracht
// klaarzet naast de toetsen en quizzen.
// - Het Runenraadsel: de woorden van de week (gaan mee met Mijn lesmap).
// - Het rijk van Lancelot (de ontdekwereld): eigen weetjes (meerkeuze-raadsels in de Sterrenwacht), eigen woorden
//   (de Woordenwachter) en wie erin mag.
// - Mijn klas: niveau per leerling (ook per vak), zorgnotities, Eer geven, de Leescheck lezen.
// - De Zonnewijzer: de weekplanning lezen en lessen plannen.
//
// Zelfde afspraken als de rest van de connector: niets verwijderen (toevoegen en wijzigen, nooit wissen), schrijven
// enkel als de leerkracht het toeliet, en elke wijziging komt in het logboek van de connector.
const klas = require('./klas');
const runen = require('./runen');
const ontdek = require('./ontdek');
const notities = require('./notities');
const burchten = require('./burchten');
const lezen = require('./lezen');
const zonnewijzer = require('./zonnewijzer');
const niveaus = require('./niveaus');

const RUNEN_MAX = 60;

function maak(ctx) {
  const { fout } = ctx;
  const hooks = () => ctx.hooks();
  const S = (description, extra) => ({ type: 'string', description, ...extra });
  const B = description => ({ type: 'boolean', description });
  const obj = (properties, required) => ({ type: 'object', properties, ...(required ? { required } : {}), additionalProperties: false });
  const NIVEAU = S('page, schildknaap of ridder.', { enum: ['page', 'schildknaap', 'ridder'] });
  const roep = naam => { const f = hooks()[naam]; if (typeof f === 'function') f(); };

  const json = (v, wat) => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { fout(`"${wat}" is geen geldige JSON.`); }
  };

  function leerling(naam) {
    const l = klas.match(naam);
    if (!l) fout(`"${naam}" staat niet op de klaslijst. Vraag de lijst op met de tool "klas".`);
    return l;
  }

  // ---------- Het Runenraadsel ----------

  const runenRegels = 'Elk woord heeft 4 tot 7 letters, zonder spaties, cijfers of koppeltekens (accenten vallen weg). 4 letters = Page, 5 = Schildknaap, 6 of 7 = Ridder. Elke dag kiest LANcelot per niveau een woord: eerst de woorden van de week, daarna de ingebouwde. Geef bij elk woord een korte betekenis (hooguit 15 woorden, zonder het woord zelf) en een voorbeeldzin: Page ziet de betekenis als hulp, en na het raadsel ziet iedereen ze. Hooguit 60 woorden.';

  function runenwoorden() {
    const l = runen.lijstView();
    return {
      aantal: l.woorden.length, max: RUNEN_MAX, doel: l.doel,
      woorden: l.woorden.map(x => ({ woord: x.w, betekenis: x.b || '', zin: x.z || '', niveau: x.niveau, ...(x.gebruikt ? { al_gespeeld: true } : {}) })),
      regels: runenRegels,
    };
  }

  const regel = x => `${x.w}${x.b || x.z ? ` = ${x.b || ''}${x.z ? ` | ${x.z}` : ''}` : ''}`;
  const zonderScheiding = v => String(v == null ? '' : v).replace(/[=|\r\n]/g, ' ').trim();

  function runenBewaren(woorden, doel) {
    const l = runen.lijstView();
    const r = runen.bewaarLijst({ text: woorden.map(regel).join('\n'), doel: doel === undefined ? l.doel : doel });
    roep('naRunen');
    return r;
  }

  function runenwoordenToevoegen({ woorden, doel } = {}) {
    const lijst = json(woorden, 'woorden');
    if (!Array.isArray(lijst) || !lijst.length) fout('Geef "woorden": een lijst zoals [{"woord":"kompas","betekenis":"...","zin":"..."}].');
    const oud = runen.lijstView().woorden.map(x => ({ w: x.w, b: x.b || '', z: x.z || '' }));
    const nieuw = [];
    const overgeslagen = [];
    const aangevuld = [];
    for (const x of lijst) {
      const ruw = typeof x === 'string' ? x : (x && (x.woord || x.w)) || '';
      const w = runen.normaal(ruw);
      const b = zonderScheiding(x && typeof x === 'object' ? x.betekenis || x.b : '').slice(0, 200);
      const z = zonderScheiding(x && typeof x === 'object' ? x.zin || x.z : '').slice(0, 200);
      if (w.length < 4 || w.length > 7 || /[\s\d-]/.test(String(ruw).trim())) { overgeslagen.push({ woord: String(ruw).slice(0, 40), reden: '4 tot 7 letters, zonder spaties, cijfers of koppeltekens' }); continue; }
      const al = oud.find(y => y.w === w) || nieuw.find(y => y.w === w);
      if (al) {
        // Een woord dat er al staat: enkel aanvullen wat nog ontbrak, nooit overschrijven (daarvoor is runenwoord_wijzigen).
        let iets = false;
        if (!al.b && b) { al.b = b; iets = true; }
        if (!al.z && z) { al.z = z; iets = true; }
        if (iets) aangevuld.push(w); else overgeslagen.push({ woord: w, reden: 'staat er al' });
        continue;
      }
      nieuw.push({ w, b, z });
    }
    if (oud.length + nieuw.length > RUNEN_MAX) fout(`Er staan al ${oud.length} woorden; samen met deze ${nieuw.length} is dat meer dan ${RUNEN_MAX}. Woorden weghalen doet de leerkracht zelf in Het Runenraadsel › Woorden van de week.`);
    if (!nieuw.length && !aangevuld.length) return { toegevoegd: 0, overgeslagen, ...runenwoorden() };
    runenBewaren([...oud, ...nieuw], doel === undefined ? undefined : String(doel));
    return { toegevoegd: nieuw.length, nieuw: nieuw.map(x => x.w), aangevuld, overgeslagen, ...runenwoorden() };
  }

  function runenwoordWijzigen({ woord, betekenis, zin, nieuw_woord } = {}) {
    const w = runen.normaal(woord);
    const oud = runen.lijstView().woorden.map(x => ({ w: x.w, b: x.b || '', z: x.z || '' }));
    const x = oud.find(y => y.w === w);
    if (!x) fout(`"${woord}" staat niet bij de woorden van de week (zie "runenwoorden").`);
    if (nieuw_woord !== undefined && nieuw_woord !== '') {
      const n = runen.normaal(nieuw_woord);
      if (n.length < 4 || n.length > 7 || /[\s\d-]/.test(String(nieuw_woord).trim())) fout('Het nieuwe woord moet 4 tot 7 letters hebben, zonder spaties, cijfers of koppeltekens.');
      if (n !== w && oud.some(y => y.w === n)) fout(`"${n}" staat er al.`);
      x.w = n;
    }
    if (betekenis !== undefined) x.b = zonderScheiding(betekenis).slice(0, 200);
    if (zin !== undefined) x.z = zonderScheiding(zin).slice(0, 200);
    runenBewaren(oud);
    return { gewijzigd: { woord: x.w, betekenis: x.b, zin: x.z }, ...runenwoorden() };
  }

  // ---------- Het rijk van Lancelot (de ontdekwereld) ----------

  function ontdekInhoud() {
    const e = ontdek.eigenView();
    return {
      toegang: ontdek.instellingen().toegang,
      toegang_uitleg: 'dicht = niemand, klaar = wie zijn taken af heeft, open = iedereen.',
      leerjaar: e.leerjaar,
      weetjes: e.weetjes.map((x, i) => ({ nr: i + 1, niveau: x.niveau || 'alle', onderwerp: x.o, vraag: x.v, opties: x.a, juist: x.j, weetje: x.w })),
      woorden: e.woorden.map(x => ({ woord: x.w, betekenis: x.b, zin: x.z, niveau: x.niveau || 'alle' })),
      runenwoorden_met_betekenis: e.weekwoorden,
      uitleg: 'Eigen weetjes komen als meerkeuzevraag in De Sterrenwacht (leerlingen krijgen ze vóór de ingebouwde), eigen woorden bij De Woordenwachter, samen met de woorden van de week van het Runenraadsel. Hooguit 300 van elk.',
    };
  }

  function weetjesToevoegen({ weetjes, woorden, leerjaar } = {}) {
    const wj = json(weetjes, 'weetjes');
    const wd = json(woorden, 'woorden');
    if ((!Array.isArray(wj) || !wj.length) && (!Array.isArray(wd) || !wd.length)) fout('Geef "weetjes" en/of "woorden" (zie de tool-uitleg voor de velden).');
    const voor = ontdek.eigenView();
    const r = ontdek.voegToe({ weetjes: Array.isArray(wj) ? wj : [], woorden: Array.isArray(wd) ? wd : [] }, leerjaar ? String(leerjaar) : '');
    const niet = { weetjes: (Array.isArray(wj) ? wj.length : 0) - r.nieuw.weetjes, woorden: (Array.isArray(wd) ? wd.length : 0) - r.nieuw.woorden };
    return {
      toegevoegd: r.nieuw,
      ...(niet.weetjes || niet.woorden ? { niet_toegevoegd: niet, waarom: 'dubbel, onvolledig (vraag, 2 tot 4 verschillende opties, juist als plaats vanaf 0) of er staan er al 300' } : {}),
      totaal: { weetjes: r.weetjes.length, woorden: r.woorden.length },
      voorheen: { weetjes: voor.weetjes.length, woorden: voor.woorden.length },
    };
  }

  function ontdekWijzigen({ soort, nr, woord, wijziging } = {}) {
    const w = json(wijziging, 'wijziging');
    if (!w || typeof w !== 'object' || Array.isArray(w)) fout('Geef "wijziging": de velden die veranderen.');
    const isWoord = soort === 'woord';
    const r = isWoord ? ontdek.wijzigWoord(woord, w) : ontdek.wijzigWeetje(Number(nr) - 1, w);
    if (r.fout === 'geen') fout(isWoord ? `Het woord "${woord}" staat niet bij de eigen woorden (zie "ontdek_inhoud").` : `Weetje ${nr} bestaat niet (er zijn er ${r.aantal}).`);
    if (r.fout === 'kapot') fout(isWoord ? 'Zo klopt het woord niet meer: een woord en een betekenis.' : 'Zo klopt het weetje niet meer: een vraag, 2 tot 4 verschillende opties en "juist" als plaats van het juiste antwoord (vanaf 0).');
    if (r.fout === 'dubbel') fout(isWoord ? 'Dat woord staat er al.' : 'Die vraag staat er al.');
    return { gewijzigd: r.nieuw, uitleg: 'Lees alles terug met "ontdek_inhoud".' };
  }

  function ontdekToegang({ toegang } = {}) {
    const r = ontdek.zetToegang(toegang);
    const h = hooks();
    if (typeof h.naOntdekToegang === 'function') h.naOntdekToegang(r.toegang);
    return { toegang: r.toegang };
  }

  // ---------- Mijn klas ----------

  function leerlingNiveau({ naam, niveau, vak } = {}) {
    const l = leerling(naam);
    const v = String(vak || '').trim();
    let vakId = '';
    if (v) {
      const g = niveaus.alle().find(x => x.id.toLowerCase() === v.toLowerCase() || String(x.naam || '').toLowerCase() === v.toLowerCase()) || { id: niveaus.groep(v) };
      if (!g.id) fout(`Het vak "${vak}" kent LANcelot niet. Vakken: ${niveaus.alle().map(x => x.naam || x.id).join(', ')}.`);
      vakId = g.id;
    }
    if (!['page', 'schildknaap', 'ridder'].includes(niveau)) fout('Geef "niveau": page, schildknaap of ridder.');
    klas.setNiveau(l.id, niveau, vakId);
    roep('naKlas');
    return { naam: l.naam, niveau, ...(vakId ? { vak: vakId } : {}) };
  }

  function zorgNotities({ naam } = {}) {
    const alle = notities.read();
    const lijst = naam ? [leerling(naam)] : klas.read().leerlingen;
    return {
      leerlingen: lijst.map(l => ({ naam: l.naam, notities: (alle[l.id] || []).slice().reverse().map(n => ({ datum: n.t, tekst: n.tekst })) }))
        .filter(x => naam || x.notities.length),
    };
  }

  function zorgNotitie({ naam, tekst } = {}) {
    const l = leerling(naam);
    const lijst = notities.add(l.id, tekst);
    return { naam: l.naam, bewaard: lijst[lijst.length - 1], aantal: lijst.length };
  }

  function eerGeven({ namen, aantal, reden } = {}) {
    if (!Array.isArray(namen) || !namen.length) fout('Geef "namen".');
    const ll = namen.map(leerling);
    const r = burchten.geef({ leerlingen: ll.map(l => l.id), n: aantal, reden });
    roep('naEer');
    return { gegeven: r.gegeven, aan: ll.map(l => l.naam), eer: Number(aantal), reden: String(reden || '').slice(0, 40) };
  }

  function leescheck({ dagen } = {}) {
    return { aan: !!(lezen.staat && lezen.staat().aan), ...lezen.overzicht({ dagen }) };
  }

  // ---------- De Zonnewijzer (weekplanning) ----------

  const WEEK = /^\d{4}-W\d{2}$/;
  const DAG = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'];
  function weekId(week) {
    if (!week) return zonnewijzer.weekVan(new Date());
    if (WEEK.test(week)) return week;
    if (/^\d{4}-\d{2}-\d{2}$/.test(week)) return zonnewijzer.weekVan(new Date(`${week}T12:00:00Z`));
    fout('Geef "week" als JJJJ-Www (bv. 2026-W48) of een dag JJJJ-MM-DD.');
  }

  function weekplanning({ week } = {}) {
    const id = weekId(week);
    const w = zonnewijzer.week(id);
    const r = zonnewijzer.roosters();
    const rooster = r.roosters.find(x => x.id === w.rooster) || r.roosters.find(x => x.id === r.standaard) || r.roosters[0];
    const dagen = [1, 2, 3, 4, 5].map(d => {
      if (w.vrij[d]) return { dag: DAG[d], vrij: w.vrij[d] };
      const uren = (w.dagen[d] || rooster.dagen[d] || []).filter(u => u.soort === 'les');
      return {
        dag: DAG[d],
        lesuren: uren.map((u, i) => ({ plek: `${d}-${i}`, van: u.van, tot: u.tot, vak: u.vak, ...(w.lessen[`${d}-${i}`] ? { les: w.lessen[`${d}-${i}`] } : {}) })),
      };
    });
    return { week: id, rooster: rooster.naam, dagen, uitleg: 'Een les hangt aan een plek "dag-lesuur" (1 = maandag, lesuren tellen vanaf 0, pauzes niet). Plannen met "les_plannen".' };
  }

  function lesPlannen({ week, plek, les } = {}) {
    const id = weekId(week);
    const l = json(les, 'les');
    if (!l || typeof l !== 'object' || Array.isArray(l)) fout('Geef "les" met minstens een titel of doel.');
    if (!/^[1-5]-\d{1,2}$/.test(String(plek || ''))) fout('Geef "plek" als "dag-lesuur", bv. "2-0" voor het eerste lesuur op dinsdag (zie "weekplanning").');
    const oud = zonnewijzer.week(id).lessen[plek];
    // Er staat al een les: aanvullen en wijzigen wat je meegeeft, de rest (en wat al afgevinkt is) blijft.
    const samen = oud ? { ...oud, ...Object.fromEntries(Object.entries(l).filter(([, v]) => v !== undefined && v !== null && v !== '')) } : l;
    const w = zonnewijzer.zetLes({ week: id, slot: plek, les: samen });
    if (!w.lessen[plek]) fout('Die les is leeg: geef minstens een titel, doel, succescriteria of notitie.');
    roep('naPlanning');
    return { week: id, plek, ...(oud ? { bijgewerkt: true } : { nieuw: true }), les: w.lessen[plek] };
  }

  // ---------- De tools ----------

  const RUNENWOORDEN = { type: ['array', 'string'], items: { type: 'object' }, description: '[{"woord":"kompas","betekenis":"een toestel dat het noorden aanwijst","zin":"Met een kompas vind je de weg."}]' };
  const WEETJES = { type: ['array', 'string'], items: { type: 'object' }, description: 'Meerkeuze-weetjes: [{"niveau":"page","onderwerp":"Dieren","vraag":"Hoeveel harten heeft een octopus?","opties":["1","2","3"],"juist":2,"weetje":"Een octopus heeft drie harten en blauw bloed."}]. Page 3 keuzes, schildknaap en ridder 4; "juist" telt vanaf 0. Feitelijk juist, Belgisch-Nederlands.' };
  const OD_WOORDEN = { type: ['array', 'string'], items: { type: 'object' }, description: 'Woorden voor De Woordenwachter: [{"niveau":"page","woord":"oogst","betekenis":"...","zin":"..."}].' };
  const LES = { type: ['object', 'string'], description: '{"vak":"Rekenen","titel":"Breuken vergelijken","nr":12,"doel":"Ik kan ...","criteria":["Ik ...","Ik ..."],"notitie":"...","doelen":["1.5.GL6.3"]}. Bij een plek waar al een les staat, veranderen alleen de velden die je meegeeft.' };
  const naam = r => ({ naam: r.naam });

  return [
    { name: 'runenwoorden', title: 'Woorden van het Runenraadsel', description: 'De woorden van de week van Het Runenraadsel (woordraadspel: elke dag een geheim woord per niveau): woord, betekenis, voorbeeldzin, niveau, al gespeeld, het doel, en de regels. Kijk hier eerst, zodat je niets dubbel zet.', inputSchema: obj({}), fn: runenwoorden },
    { name: 'ontdek_inhoud', title: 'Weetjes en woorden in Het rijk van Lancelot', description: 'De eigen inhoud van de ontdekwereld Het rijk van Lancelot: de weetjes (meerkeuze-raadsels in De Sterrenwacht, met nr), de woorden van De Woordenwachter, en wie erin mag (dicht, klaar, open).', inputSchema: obj({}), fn: ontdekInhoud },
    { name: 'zorg_notities', title: 'Zorgnotities', description: 'De notities voor de zorg (Mijn klas › Zorg): van één leerling, of zonder naam van iedereen die er heeft. Nieuwste eerst.', inputSchema: obj({ naam: S('Naam zoals op de klaslijst (leeg = iedereen).') }), fn: zorgNotities },
    { name: 'leescheck', title: 'Leescheck', description: 'De Leescheck (Mijn klas › Lezen): per leerling de voorbije schooldagen (boek, bladzijde, antwoord) en wat opvalt (niets ingevuld, geen nieuwe bladzijden, rare sprong, kort of hetzelfde antwoord).', inputSchema: obj({ dagen: { type: 'integer', enum: [5, 10, 20, 40], description: 'Hoeveel schooldagen (standaard 10).' } }), fn: leescheck },
    { name: 'weekplanning', title: 'Weekplanning (Zonnewijzer)', description: 'De weekplanning in De Zonnewijzer: per dag de lesuren uit het rooster (van, tot, vak) met hun plek en de geplande les (titel, doel, succescriteria, notitie, gekoppelde oefeningen). Standaard deze week.', inputSchema: obj({ week: S('JJJJ-Www (bv. 2026-W48) of een dag JJJJ-MM-DD; leeg = deze week.') }), fn: weekplanning },

    { name: 'runenwoorden_toevoegen', schrijft: true, title: 'Runenwoorden toevoegen', description: `Woorden bij de woorden van de week van Het Runenraadsel zetten. Wat er al staat blijft; een woord dat er al staat wordt enkel aangevuld (betekenis of zin die ontbrak). ${runenRegels} Gaat mee met Mijn lesmap.`, inputSchema: obj({ woorden: RUNENWOORDEN, doel: S('Optioneel: de code van het leerplandoel (bv. 1.5.GL6.3).') }, ['woorden']), fn: runenwoordenToevoegen, log: (a, r) => ({ n: r.toegevoegd }) },
    { name: 'runenwoord_wijzigen', schrijft: true, title: 'Runenwoord wijzigen', description: 'Eén woord van de week van Het Runenraadsel aanpassen: betekenis, voorbeeldzin of het woord zelf (bv. een tikfout).', inputSchema: obj({ woord: S('Het woord zoals het nu staat.'), betekenis: S('Nieuwe betekenis.'), zin: S('Nieuwe voorbeeldzin.'), nieuw_woord: S('Optioneel: het verbeterde woord.') }, ['woord']), fn: runenwoordWijzigen, log: (a, r) => ({ woord: r.gewijzigd.woord }) },
    { name: 'weetjes_toevoegen', schrijft: true, title: 'Weetjes en woorden toevoegen', description: 'Eigen weetjes (meerkeuze-raadsels voor De Sterrenwacht) en/of woorden (voor De Woordenwachter) toevoegen aan Het rijk van Lancelot. Wat er al staat blijft; dubbels vallen weg. Goed mengsel: ongeveer evenveel per niveau.', inputSchema: obj({ weetjes: WEETJES, woorden: OD_WOORDEN, leerjaar: S('Optioneel: voor welk leerjaar (bv. 6).') }), fn: weetjesToevoegen, log: (a, r) => ({ weetjes: r.toegevoegd.weetjes, woorden: r.toegevoegd.woorden }) },
    { name: 'ontdek_wijzigen', schrijft: true, title: 'Weetje of woord wijzigen', description: 'Eén weetje (op nr, zie "ontdek_inhoud") of één woord van De Woordenwachter aanpassen. Geef in "wijziging" enkel wat verandert: bij een weetje niveau, onderwerp, vraag, opties, juist, weetje; bij een woord niveau, woord, betekenis, zin.', inputSchema: obj({ soort: S('weetje of woord.', { enum: ['weetje', 'woord'] }), nr: { type: 'integer', minimum: 1, description: 'Bij een weetje: het nr.' }, woord: S('Bij een woord: het woord zoals het nu staat.'), wijziging: { type: ['object', 'string'], description: 'Bv. {"vraag":"...","juist":1}.' } }, ['soort', 'wijziging']), fn: ontdekWijzigen, log: a => ({ soort: a.soort, nr: a.nr, woord: a.woord }) },
    { name: 'ontdek_toegang', schrijft: true, title: 'Wie mag in Het rijk van Lancelot', description: 'Zet de ontdekwereld dicht, open voor wie zijn taken af heeft (klaar), of open voor iedereen.', inputSchema: obj({ toegang: S('dicht, klaar of open.', { enum: ['dicht', 'klaar', 'open'] }) }, ['toegang']), fn: ontdekToegang, log: (a, r) => ({ toegang: r.toegang }) },
    { name: 'leerling_niveau', schrijft: true, title: 'Niveau van een leerling', description: 'Het niveau van een leerling zetten (Page, Schildknaap, Ridder), in het algemeen of voor één vak (zie "klas" voor de vakken per leerling). Geldt voor nieuwe taken, quizzen en oefenbladen.', inputSchema: obj({ naam: S('Naam zoals op de klaslijst.'), niveau: NIVEAU, vak: S('Optioneel: het vak (bv. Wiskunde). Leeg = algemeen niveau.') }, ['naam', 'niveau']), fn: leerlingNiveau, log: (a, r) => ({ ...naam(r), niveau: r.niveau, vak: r.vak }) },
    { name: 'zorg_notitie', schrijft: true, title: 'Zorgnotitie toevoegen', description: 'Een notitie bij een leerling zetten in Mijn klas › Zorg (een observatie, afspraak of opvolging). Blijft op deze pc. Enkel wat de leerkracht vraagt.', inputSchema: obj({ naam: S('Naam zoals op de klaslijst.'), tekst: S('De notitie (hooguit 1000 tekens).') }, ['naam', 'tekst']), fn: zorgNotitie, log: (a, r) => naam(r) },
    { name: 'eer_geven', schrijft: true, title: 'Eer geven', description: 'Leerlingen Eer geven (het beloningssysteem: met Eer bouwen ze hun burcht op het Klaseiland), met een korte reden.', inputSchema: obj({ namen: { type: 'array', items: { type: 'string' }, description: 'Namen zoals op de klaslijst.' }, aantal: { type: 'integer', minimum: 1, maximum: 50, description: 'Hoeveel Eer per leerling.' }, reden: S('Korte reden (hooguit 40 tekens), bv. "Goed samengewerkt".') }, ['namen', 'aantal']), fn: eerGeven, log: (a, r) => ({ n: r.gegeven, eer: r.eer }) },
    { name: 'les_plannen', schrijft: true, title: 'Les plannen (Zonnewijzer)', description: 'Een les zetten op een plek in de weekplanning van De Zonnewijzer (zie "weekplanning" voor de plekken). Staat er al een les, dan veranderen enkel de velden die je meegeeft; niets wordt gewist.', inputSchema: obj({ week: S('JJJJ-Www of een dag JJJJ-MM-DD; leeg = deze week.'), plek: S('"dag-lesuur", bv. "2-0".'), les: LES }, ['plek', 'les']), fn: lesPlannen, log: (a, r) => ({ week: r.week, plek: r.plek, titel: r.les.titel }) },
  ];
}

module.exports = { maak };
