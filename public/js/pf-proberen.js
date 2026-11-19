// 👁 Proberen als leerling (De Proef): de leerkracht ziet de toets precies zoals de leerling hem krijgt,
// met echte invulvakjes, keuzes en sleepkaartjes, vraag per vraag. Er wordt niets bewaard of doorgestuurd:
// de antwoorden blijven in deze pagina en verdwijnen bij Opnieuw of sluiten.
// Buitenkant (zonder scherm=1): de keuze Chromebook of gsm en het niveau, met het leerlingscherm in een venster.
// Binnenkant (scherm=1): het leerlingscherm zelf. Gebruikt PfKern, PfPaper, Niveau en Ui.
(function () {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const file = params.get('file');
  const socket = io({ query: { role: 'host' } });

  // ---------- Buitenkant ----------
  if (params.get('scherm') !== '1') {
    $('pr-kop').classList.remove('hidden');
    $('pr-kader').classList.remove('hidden');
    let toestel = 'cb';
    let niveau = params.get('niveau') || 'schildknaap';
    const laad = () => {
      $('pr-kader').classList.toggle('gsm', toestel === 'gsm');
      $('pr-scherm').src = `/proef-proberen?scherm=1&file=${encodeURIComponent(file)}&niveau=${niveau}&t=${Date.now()}`;
    };
    $('pr-toestel').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      toestel = b.dataset.toestel;
      for (const x of $('pr-toestel').children) x.classList.toggle('on', x === b);
      laad();
    });
    $('pr-opnieuw').addEventListener('click', laad);
    // Met bekijk=1 staat de pagina in het 👁 Bekijken-venster van de lijst.
    if (params.get('bekijk') === '1') document.body.classList.add('pf-pr-bekijk');
    socket.emit('pf-open', file, res => {
      if (!res || res.error) return ($('pr-fout').textContent = (res && res.error) || 'Deze toets kan niet open.');
      const niveaus = PfKern.niveausVan(res.toets);
      if (!niveaus.includes(niveau)) niveau = niveaus.includes('schildknaap') ? 'schildknaap' : niveaus[0];
      if (niveaus.length > 1) {
        const bar = $('pr-niveaus');
        bar.classList.remove('hidden');
        bar.innerHTML = niveaus.map(n => `<button type="button" class="secondary${n === niveau ? ' on' : ''}" data-niveau="${n}">${PfPaper.esc(Niveau.label(n))}</button>`).join('');
        bar.addEventListener('click', e => {
          const b = e.target.closest('button');
          if (!b) return;
          niveau = b.dataset.niveau;
          for (const x of bar.children) x.classList.toggle('on', x === b);
          laad();
        });
      }
      document.title = `${res.toets.title} · Proberen als leerling`;
      laad();
    });
    return;
  }

  // ---------- Het leerlingscherm ----------
  document.body.classList.add('pf-pr-scherm');
  $('pr-leerling').classList.remove('hidden');
  const pf = { toets: null, lijst: null, view: null, perms: {}, answers: {}, pos: 0 };

  socket.emit('pf-open', file, res => {
    if (!res || res.error) return ($('pr-fout').textContent = (res && res.error) || 'Deze toets kan niet open.');
    pf.toets = res.toets;
    const niveaus = PfKern.niveausVan(pf.toets);
    const niveau = niveaus.includes(params.get('niveau')) ? params.get('niveau') : 'schildknaap';
    pf.lijst = PfKern.lijstVoor(pf.toets, niveau);
    // Door elkaar zoals bij een echte afname: de vragen en keuzes, en altijd verbinden en ordenen.
    const seed = `proberen|${Date.now()}`;
    const order = PfKern.volgorde(pf.lijst, `${seed}|vragen`, true);
    for (const { id, q } of PfKern.vragenVan(pf.lijst)) {
      if (q.type === 'meerkeuze') pf.perms[id] = PfKern.schud(q.opties.length, `${seed}|${id}`);
      if (q.type === 'verbinden') pf.perms[id] = PfKern.schud(q.paren.length, `${seed}|${id}`, true);
      if (q.type === 'ordenen') pf.perms[id] = PfKern.schud(q.items.length, `${seed}|${id}`, true);
    }
    pf.view = PfKern.studentView(pf.toets, pf.lijst, { order, perms: pf.perms, img: d => d });
    $('pf-naam').textContent = `${pf.toets.title}${niveaus.length > 1 ? ` · ${Niveau.label(niveau)}` : ''}`;
    teken();
  });

  function teken() {
    const pages = pf.view.pages;
    pf.pos = Math.max(0, Math.min(pages.length - 1, pf.pos));
    PfPaper.render($('pf-paper'), [pages[pf.pos]], { mode: 'live', answers: pf.answers, start: pf.pos, nummer: true, voorlees: false, onAnswer: (id, v) => { pf.answers[id] = v; bolletjes(); } });
    $('pf-teller').textContent = `Vraag ${pf.pos + 1} van ${pages.length}`;
    $('pf-vorige').classList.toggle('hidden', pf.pos === 0);
    const laatste = pf.pos === pages.length - 1;
    $('pf-volgende').textContent = laatste ? 'Inleveren ✔' : 'Volgende ▶';
    $('pf-volgende').classList.toggle('gold', laatste);
    bolletjes();
    window.scrollTo(0, 0);
  }

  const idsVan = p => (p.type === 'bron' ? p.vragen.map(q => q.id) : [p.id]);
  function bolletjes() {
    $('pf-bolletjes').innerHTML = pf.view.pages.map((p, i) => {
      const klaar = idsVan(p).every(id => PfPaper.beantwoord(pf.answers[id]));
      const half = !klaar && idsVan(p).some(id => PfPaper.beantwoord(pf.answers[id]));
      return `<button type="button" class="pf-bol${i === pf.pos ? ' nu' : ''}${klaar ? ' ok' : half ? ' half' : ''}" data-i="${i}" aria-label="Vraag ${i + 1}">${i + 1}</button>`;
    }).join('');
  }
  function ga(i) {
    if ($('pf-paper').pfFlush) $('pf-paper').pfFlush();
    pf.pos = i;
    teken();
  }
  $('pf-bolletjes').addEventListener('click', e => {
    const b = e.target.closest('.pf-bol');
    if (b) ga(Number(b.dataset.i));
  });
  $('pf-vorige').addEventListener('click', () => ga(pf.pos - 1));
  $('pf-volgende').addEventListener('click', () => (pf.pos < pf.view.pages.length - 1 ? ga(pf.pos + 1) : inleveren()));

  // Inleveren: verbeterd zoals bij een echte afname (dezelfde regels als op de server), maar nergens bewaard.
  async function inleveren() {
    if ($('pf-paper').pfFlush) $('pf-paper').pfFlush();
    const leeg = pf.view.pages.flatMap(p => (p.type === 'bron' ? p.vragen : [p])).filter(q => q.type !== 'papier' && !PfPaper.beantwoord(pf.answers[q.id])).length;
    if (!await Ui.vraag(leeg ? `Nog ${leeg} ${leeg === 1 ? 'vraag' : 'vragen'} niet ingevuld. Toch inleveren?` : 'De toets inleveren?', { ja: 'Inleveren' })) return;
    const antwoorden = {};
    const punten = {};
    const vakken = {};
    const sleutel = {};
    const zones = {};
    let kreeg = 0;
    let max = 0;
    let hand = 0;
    for (const { id, q } of PfKern.vragenVan(pf.lijst)) {
      const ruw = PfKern.schoon(q, pf.answers[id]);
      const a = ruw === null || ruw === '' ? undefined : PfKern.canoniek(q, ruw, pf.perms[id]);
      if (a !== undefined) antwoorden[id] = a;
      const auto = a === undefined ? (PfKern.MANUEEL.has(q.type) ? null : 0) : PfKern.auto(q, a);
      // Wat de leerkracht zelf verbetert (open vragen, de uitwerking...), telt nog niet mee.
      max += PfKern.maxVan(q);
      hand += PfKern.handPunten(q);
      kreeg += auto || 0;
      punten[id] = [PfKern.handPunten(q) ? null : auto, PfKern.maxVan(q)];
      if (q.type === 'blad') vakken[id] = { goed: PfKern.vakGoed(q, a, {}), zelf: {} };
      sleutel[id] = q.type === 'blad' ? PfKern.veldSleutel(q) : PfKern.oplossing(q) || ' ';
      if (q.type === 'aanduiden') zones[id] = q.zones;
      else if (q.type === 'markeren' && (q.per || q.inBron || q.kleuren || q.aantal)) zones[id] = PfKern.markeerSleutel(q);
      else if (q.type === 'blad') zones[id] = q.velden;
    }
    const rond = x => Math.round(x * 100) / 100;
    $('pf-uitslag').innerHTML = `<strong>De computer geeft ${PfPaper.nl(rond(kreeg))} van de ${PfPaper.nl(rond(max - hand))} punten.</strong>${hand ? ` <span>De leerkracht verbetert nog ${PfPaper.ptn(rond(hand))}.</span>` : ''}`;
    PfPaper.render($('pf-nagekeken'), PfKern.studentView(pf.toets, pf.lijst, { img: d => d }).pages, { mode: 'view', nummer: true, answers: antwoorden, sleutel, zones, punten, vakken });
    $('pf-werk').classList.add('hidden');
    $('pf-klaar').classList.remove('hidden');
    window.scrollTo(0, 0);
  }
  $('pf-terug').addEventListener('click', () => {
    $('pf-klaar').classList.add('hidden');
    $('pf-werk').classList.remove('hidden');
    teken();
  });
})();
