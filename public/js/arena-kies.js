// De Arena overzichtelijk: een zoekvak, snelkeuzes per soort spel en een rij "Laatst gespeeld".
// En vanuit een quiz in De Smidse: "Speel" opent hier het venster waarin je het spel kiest.
(() => {
  const panel = document.getElementById('realm-arena');
  if (!panel) return;
  const tegels = [...panel.querySelectorAll('.module[data-module]')];
  const koppen = [...panel.querySelectorAll('.groep-kop')];
  const padVan = m => (m === 'royale' ? '/ridder-royale' : `/${m}`);
  // Spellen waarin de klas vooral nadenkt en antwoordt, zonder snelle besturing.
  const DENKEN = new Set(['toernooi', 'opwarmer', 'hofschilder', 'duel', 'titanenstrijd', 'kerker', 'burchtbouwers', 'poortwacht', 'leraarbaas', 'verrader', 'rijk', 'schattenjacht', 'kristalroof']);
  // Spellen die geen gewone quiz gebruiken: die staan niet in het venster "Speel deze quiz in…".
  const ZONDER_QUIZ = new Set(['opwarmer', 'hofschilder']);

  // ---------- Zoeken en snelkeuzes ----------
  const balk = document.createElement('div');
  balk.className = 'arena-zoek';
  balk.innerHTML = `<input type="search" id="arena-zoek" class="lib-zoek" placeholder="Zoek een spel…" autocomplete="off" aria-label="Zoek een spel">
    <div class="arena-chips" role="group" aria-label="Soort spel"></div>`;
  const chips = balk.querySelector('.arena-chips');
  const keuzes = [['', 'Alle spellen'], ...koppen.map((k, i) => [`g${i}`, k.querySelector('h3').textContent]), ['denken', 'Vooral denken'], ['actie', 'Vooral actie']];
  let keuze = '';
  for (const [id, naam] of keuzes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'secondary chip' + (id === keuze ? ' on' : '');
    b.dataset.keuze = id;
    b.textContent = naam;
    b.addEventListener('click', () => { keuze = id; filter(); });
    chips.appendChild(b);
  }
  // Verras ons: een willekeurig spel uit wat nu in beeld staat. Zo komt elk spel eens aan de beurt.
  const verras = document.createElement('button');
  verras.type = 'button';
  verras.className = 'gold chip verras';
  verras.textContent = 'Verras ons';
  verras.title = 'Kies een willekeurig spel';
  verras.addEventListener('click', () => {
    const kan = tegels.filter(t => !t.classList.contains('weg') && !ZONDER_QUIZ.has(t.dataset.module) && t.dataset.module !== 'rijk');
    if (kan.length) kan[Math.floor(Math.random() * kan.length)].click();
  });
  chips.appendChild(verras);
  // Nog niets gespeeld? Dan staan hier vijf spellen die vanzelf lukken, om mee te beginnen.
  const BEGIN = ['toernooi', 'kerker', 'poortwacht', 'robomol', 'ridderrace'];
  const recent = document.createElement('div');
  recent.className = 'arena-recent hidden';
  recent.innerHTML = '<div class="groep-kop"><h3>Laatst gespeeld</h3></div><div class="arena-recent-rij"></div>';
  const leeg = document.createElement('p');
  leeg.className = 'leeg hidden';
  leeg.textContent = 'Geen spel gevonden. Probeer een ander woord.';
  panel.prepend(balk, recent, leeg);
  const zoek = balk.querySelector('input');
  zoek.addEventListener('input', filter);

  const groepVan = t => koppen.indexOf(t.parentElement.previousElementSibling);
  function filter() {
    const q = zoek.value.trim().toLowerCase();
    for (const c of chips.children) c.classList.toggle('on', c.dataset.keuze === keuze);
    let n = 0;
    for (const t of tegels) {
      const m = t.dataset.module;
      const past = (!q || t.textContent.toLowerCase().includes(q))
        && (!keuze || (keuze === 'denken' ? DENKEN.has(m) : keuze === 'actie' ? !DENKEN.has(m) : keuze === `g${groepVan(t)}`));
      t.classList.toggle('weg', !past);
      if (past) n++;
    }
    for (const k of koppen) {
      const grid = k.nextElementSibling;
      const iets = !!grid.querySelector('.module:not(.weg)');
      k.classList.toggle('hidden', !iets);
      grid.classList.toggle('hidden', !iets);
    }
    leeg.classList.toggle('hidden', n > 0);
    recent.classList.toggle('hidden', !!q || !!keuze || !recent.querySelector('.arena-recent-rij').children.length);
    if (typeof fillRows === 'function') fillRows();
  }

  // ---------- Laatst gespeeld ----------
  const SLEUTEL = 'lancelot-arena-recent';
  const lees = () => { try { return JSON.parse(localStorage.getItem(SLEUTEL)) || []; } catch { return []; } };
  function onthoud(m) {
    try { localStorage.setItem(SLEUTEL, JSON.stringify([m, ...lees().filter(x => x !== m)].slice(0, 5))); } catch {}
  }
  function tekenRecent() {
    const rij = recent.querySelector('.arena-recent-rij');
    rij.innerHTML = '';
    const gespeeld = lees();
    recent.querySelector('h3').textContent = gespeeld.length ? 'Laatst gespeeld' : 'Begin hier';
    for (const m of gespeeld.length ? gespeeld : BEGIN) {
      const t = tegels.find(x => x.dataset.module === m);
      if (!t) continue;
      rij.appendChild(klein(t, () => t.click()));
    }
    filter();
  }
  // Een kleine tegel: icoon en naam naast elkaar.
  function klein(t, klik) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spel-klein';
    const img = t.querySelector('.tile-icon').cloneNode();
    const naam = document.createElement('span');
    naam.textContent = t.querySelector('strong').textContent;
    b.append(img, naam);
    b.addEventListener('click', klik);
    return b;
  }
  for (const t of tegels) t.addEventListener('click', () => onthoud(t.dataset.module), true);
  tekenRecent();
  addEventListener('pageshow', tekenRecent);

  // ---------- Speel deze quiz in… ----------
  const venster = document.createElement('dialog');
  venster.className = 'speel-kies';
  venster.innerHTML = `<div class="bar"><h2>Speel deze quiz in…</h2><button type="button" class="secondary" data-dicht><i class="ic ic-kruis" aria-hidden="true"></i> Sluiten</button></div>
    <p class="muted" data-quiz></p><div data-lijst></div>`;
  document.body.appendChild(venster);
  venster.querySelector('[data-dicht]').addEventListener('click', () => venster.close());
  venster.addEventListener('click', e => { if (e.target === venster) venster.close(); });
  window.ArenaKies = {
    open(q) {
      venster.querySelector('[data-quiz]').textContent = q.title;
      const lijst = venster.querySelector('[data-lijst]');
      lijst.innerHTML = '';
      koppen.forEach((k, i) => {
        const hier = tegels.filter(t => groepVan(t) === i && !ZONDER_QUIZ.has(t.dataset.module));
        if (!hier.length) return;
        const h = document.createElement('h3');
        h.textContent = k.querySelector('h3').textContent;
        const rij = document.createElement('div');
        rij.className = 'arena-recent-rij';
        for (const t of hier) {
          rij.appendChild(klein(t, () => {
            const m = t.dataset.module;
            onthoud(m);
            venster.close();
            if (m === 'toernooi' && typeof loadQuiz === 'function') { show('idle'); loadQuiz(q.file); return; }
            location.href = `${padVan(m)}?quiz=${encodeURIComponent(q.file)}`;
          }));
        }
        lijst.append(h, rij);
      });
      venster.showModal();
    },
  };
})();
