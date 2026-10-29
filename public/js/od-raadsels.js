// De raadsels van de ontdekwereld, elk in een eigen venster: denkpuzzels, labo-proeven, woorden en weetjes.
// De puzzel komt van de server (zonder antwoorden). Denkpuzzels kijkt de gsm al na met OdPuzzels (dezelfde code als de server);
// de server keurt een oplossing pas goed als hij ze zelf ook narekent.
// Gebruikt socket, od, odStand, odToast en $ uit od-player.js, sfx en confetti uit fx.js.
const OdRaadsels = (() => {
  const NIV = [['page', 'Page'], ['schildknaap', 'Schildknaap'], ['ridder', 'Ridder']];
  const UITLEG = {
    schuif: 'Schuif de stenen in de goede volgorde om het zwaard te bevrijden.',
    robot: 'Programmeer de robotridder naar het kristal.',
    licht: 'Draai de spiegels zodat het licht het kristal raakt.',
    code: 'Kraak het geheimschrift op het portaal.',
    woorden: 'De woordenwachter laat je pas door als je zijn woorden kent.',
    weetje: 'Kijk door de telescoop en ontdek iets nieuws.',
    stroom: 'Draai de draadjes tot de lamp brandt.',
    tandwiel: 'Hoe draaien de tandwielen?',
    wip: 'Breng de wip in evenwicht.',
    weeg: 'De goudsmid weegt zijn schatten. Hoeveel weegt er één?',
    reeks: 'De draak legt eieren met getallen. Welk getal hoort erbij?',
    pixel: 'Herstel het mozaïek van het drakenbeeld.',
    sudoku: 'Elk getal één keer in elke rij, kolom en elk blok.',
    doolhof: 'Vind de uitgang van de donjon. Pak eerst de sleutels!',
    toren: 'Elke steen is de som van de twee stenen eronder.',
  };
  let nu = null; // het open raadsel
  let bezig = false;

  const el = (tag, cls, tekst) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  };
  const knop = (tekst, cls, fn) => {
    const b = el('button', cls, tekst);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  };
  const body = () => $('odv-body');
  const melding = (t, soort = '') => {
    $('odv-melding').textContent = t || '';
    $('odv-melding').className = `od-melding ${soort}`;
  };

  // ---------- Venster ----------

  function toon(aan) {
    od.venster = aan;
    $('od-venster').classList.toggle('hidden', !aan);
    if (!aan) {
      nu = null;
      body().innerHTML = '';
      if (window.Voorlees) Voorlees.stop();
    }
  }
  $('odv-dicht').addEventListener('click', () => toon(false));
  $('od-venster').addEventListener('click', e => { if (e.target.id === 'od-venster') toon(false); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && od.venster) toon(false); });

  function open(station, niveau) {
    socket.emit('od-open', { naam: od.naam, station, niveau }, res => {
      if (!res || res.error) return odToast((res && res.error) || 'Dat lukte niet.');
      nu = res;
      toon(true);
      teken();
    });
  }

  function teken() {
    $('odv-titel').textContent = nu.naam;
    $('odv-sub').textContent = `${nu.trap > 1 ? `Trap ${nu.trap} · ` : ''}${UITLEG[nu.soort] || ''}`;
    const niv = $('odv-niv');
    niv.innerHTML = '';
    for (const [id, naam] of NIV) {
      const b = knop(naam, `od-niv-k${id === nu.niveau ? ' on' : ''}${id === nu.eigen ? ' eigen' : ''}`, () => {
        if (id !== nu.niveau) open(nu.station, id);
      });
      b.title = id === nu.eigen ? 'Jouw niveau' : naam;
      niv.appendChild(b);
    }
    melding(nu.vandaag ? `Hier verdiende je vandaag al ${nu.perPlek || 3} kristallen. Oefenen mag altijd, en je gaat wel een trap hoger!` : '');
    body().innerHTML = '';
    body().className = `od-body od-${nu.soort}`;
    (TEKEN[nu.soort] || (() => {}))(nu);
  }

  // Een poging naar de server sturen.
  function stuur(poging, klaarFn) {
    if (bezig) return;
    bezig = true;
    socket.emit('od-poging', { naam: od.naam, station: nu.station, poging }, res => {
      bezig = false;
      if (!res || res.error) return melding((res && res.error) || 'Dat lukte niet.', 'fout');
      if (klaarFn) klaarFn(res);
      else if (res.klaar) klaar(res);
      else {
        sfx.bad();
        melding(res.tekst || 'Nog niet.', 'fout');
      }
    });
  }

  // ---------- Opgelost! ----------

  function klaar(res) {
    if (res.stand) odStand(res.stand);
    sfx.fanfare();
    if (res.beloning) confetti(2200);
    const b = body();
    b.innerHTML = '';
    b.className = 'od-body od-klaar';
    melding('');
    b.appendChild(el('p', 'od-klaar-kop', '✨ Opgelost!'));
    const beloning = el('div', 'od-beloning');
    if (res.beloning) {
      beloning.innerHTML = '<span class="od-kristal-ic groot"></span>';
      beloning.appendChild(el('span', '', '+1 kristal en Eer voor je burcht'));
      const st = res.stand;
      const tips = {
        brug: '🌉 Genoeg kristallen voor de brug! Loop naar de rand bij de banier om hem te bouwen.',
        luchtschip: '🚀 Genoeg kristallen voor het luchtschip! Het staat aan de zuidrand van het woud.',
        sterrenpoort: '🌌 Genoeg kristallen voor de sterrenpoort! Ze staat bij de Neonruïnes.',
      };
      const wat = st && st.bouw && Object.keys(tips).find(k => !st.gebouwd.includes(k) && (!st.bouw[k].nodig || st.gebouwd.includes(st.bouw[k].nodig)) && st.kristallen >= st.bouw[k].kost);
      if (wat) b.appendChild(el('p', 'od-brug-tip', tips[wat]));
    } else {
      beloning.appendChild(el('span', 'muted', 'Goed geoefend! De kristallen van deze plek had je vandaag al.'));
    }
    if (res.trap) beloning.appendChild(el('span', 'od-trap', `⬆ Volgende keer: trap ${res.trap + 1}`));
    b.appendChild(beloning);
    if (res.woord) b.appendChild(woordKaart(res.woord, true));
    if (res.weetje && res.weetje.w) b.appendChild(weetjeKaart(res.weetje));
    const rij = el('div', 'od-acties');
    rij.appendChild(knop('Nog een raadsel', 'secondary', () => open(nu.station, nu.niveau)));
    rij.appendChild(knop('Verder ontdekken', 'gold', () => toon(false)));
    b.appendChild(rij);
    rij.lastChild.focus();
  }

  function voorleesKnop(tekst) {
    if (!window.Voorlees || !Voorlees.ok) return null;
    const b = knop('🔊', 'od-lees', () => Voorlees.speak(tekst, b));
    b.title = 'Lees voor';
    return b;
  }

  function woordKaart(w, nieuw) {
    const k = el('div', 'od-woord-kaart');
    const kop = el('div', 'od-woord-kop');
    kop.appendChild(el('b', '', w.woord));
    const lees = voorleesKnop(`${w.woord}. ${w.b || ''}. ${w.z || ''}`);
    if (lees) kop.appendChild(lees);
    if (nieuw) kop.appendChild(el('span', 'od-nieuw', '📖 in je woordenboek'));
    k.appendChild(kop);
    if (w.b) k.appendChild(el('p', '', w.b));
    if (w.z) k.appendChild(el('p', 'od-zin', w.z));
    return k;
  }

  function weetjeKaart(x) {
    const k = el('div', 'od-weetje-kaart');
    const kop = el('div', 'od-woord-kop');
    kop.appendChild(el('b', '', `🔭 ${x.o || 'Weetje'}`));
    const lees = voorleesKnop(x.w);
    if (lees) kop.appendChild(lees);
    k.appendChild(kop);
    k.appendChild(el('p', '', x.w));
    return k;
  }

  // ---------- Hulp om op een canvas te tekenen ----------

  // Een canvas dat in het venster past; geeft de tekencontext en de grootte van een vakje terug.
  function bord(cols, rows, extraL = 0, extraR = 0) {
    const c = el('canvas', 'od-bord');
    const breed = Math.min(body().clientWidth || 340, 520);
    const hoog = Math.min(window.innerHeight * 0.5, 420);
    const vak = Math.floor(Math.min(breed / (cols + extraL + extraR), hoog / rows));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = (cols + extraL + extraR) * vak * dpr;
    c.height = rows * vak * dpr;
    c.style.width = `${(cols + extraL + extraR) * vak}px`;
    c.style.height = `${rows * vak}px`;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    body().appendChild(c);
    // Waar tikte je? (in vakjes, zonder de extra kolommen links)
    const vakOp = e => {
      const r = c.getBoundingClientRect();
      return [Math.floor((e.clientX - r.left) / vak) - extraL, Math.floor((e.clientY - r.top) / vak)];
    };
    return { c, g, vak, vakOp, w: (cols + extraL + extraR) * vak, h: rows * vak, ox: extraL * vak };
  }

  function rrect(g, x, y, w, h, r, kleur) {
    g.fillStyle = kleur;
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r);
    else g.rect(x, y, w, h);
    g.fill();
  }

  function kristal(g, x, y, r, kleur = '#4cc9ff', gloed = 0.3) {
    g.globalAlpha = gloed;
    g.beginPath();
    g.arc(x, y, r * 1.4, 0, Math.PI * 2);
    g.fillStyle = kleur;
    g.fill();
    g.globalAlpha = 1;
    g.beginPath();
    g.moveTo(x, y - r);
    g.lineTo(x + r * 0.6, y);
    g.lineTo(x, y + r);
    g.lineTo(x - r * 0.6, y);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillRect(x - r * 0.12, y - r * 0.6, r * 0.2, r * 0.6);
  }

  function veld(g, w, h) {
    rrect(g, 0, 0, w, h, 10, '#0d1628');
  }

  // ---------- Zwaardsteen: schuifpuzzel ----------

  function schuif(r) {
    const pz = r.pz;
    let bordStand = pz.bord.slice();
    const zetten = [];
    const uitleg = el('p', 'od-opdracht', pz.size === 3 ? 'Tik op een steen naast het lege vakje om hem te schuiven. Leg 1 tot 8 op volgorde.' : 'Leg 1 tot 15 op volgorde. Begin met de bovenste rij!');
    body().appendChild(uitleg);
    const grid = el('div', 'od-schuif-grid');
    grid.style.setProperty('--n', pz.size);
    body().appendChild(grid);
    const teller = el('p', 'od-teller-tekst', '');
    body().appendChild(teller);
    const tekenBord = () => {
      grid.innerHTML = '';
      bordStand.forEach((v, i) => {
        const goed = v === i + 1;
        const b = knop(v ? String(v) : '', `od-steen${v ? '' : ' leeg'}${goed ? ' goed' : ''}`, () => {
          const na = OdPuzzels.schuifZet(bordStand, pz.size, i);
          if (!na) return;
          sfx.tick();
          bordStand = na;
          zetten.push(i);
          tekenBord();
          if (OdPuzzels.schuifKlaar(bordStand)) setTimeout(() => stuur(zetten), 250);
        });
        if (!v) b.disabled = true;
        grid.appendChild(b);
      });
      teller.textContent = zetten.length ? `${zetten.length} ${zetten.length === 1 ? 'zet' : 'zetten'}` : '';
    };
    tekenBord();
    body().appendChild(knop('↺ Opnieuw beginnen', 'secondary klein', () => {
      bordStand = pz.bord.slice();
      zetten.length = 0;
      tekenBord();
    }));
  }

  // ---------- Robotridder ----------

  const BLOK = { V: { t: '⬆', n: 'Stap' }, L: { t: '↺', n: 'Links' }, R: { t: '↻', n: 'Rechts' } };

  function robot(r) {
    const pz = r.pz;
    const prog = [];
    let herhaal = 2;
    let pos = { ...pz.start };
    let spoor = [];
    let loopt = false;
    body().appendChild(el('p', 'od-opdracht', pz.lus
      ? `Maak één reeks van hooguit ${pz.max} blokken en kies hoe vaak de robot ze herhaalt.`
      : pz.max ? `Breng de robot naar het kristal met hooguit ${pz.max} blokken.` : 'Breng de robot naar het kristal. Volg de stippen!'));
    const b = bord(pz.size, pz.size);
    const muur = new Set(pz.muren.map(m => `${m[0]},${m[1]}`));
    const hulp = new Set((pz.hulp || []).map(m => `${m[0]},${m[1]}`));
    function tekenRobot() {
      const { g, vak } = b;
      veld(g, b.w, b.h);
      for (let y = 0; y < pz.size; y++) for (let x = 0; x < pz.size; x++) {
        const k = `${x},${y}`;
        if (muur.has(k)) {
          rrect(g, x * vak + 2, y * vak + 2, vak - 4, vak - 4, 6, '#3b4160');
          rrect(g, x * vak + 4, y * vak + 4, vak - 8, (vak - 8) * 0.4, 4, '#4c5473');
        } else {
          rrect(g, x * vak + 2, y * vak + 2, vak - 4, vak - 4, 6, (x + y) % 2 ? '#16233d' : '#1a2a48');
          if (hulp.has(k)) {
            g.fillStyle = 'rgba(255,201,74,.55)';
            g.beginPath();
            g.arc((x + 0.5) * vak, (y + 0.5) * vak, vak * 0.08, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      for (const p of spoor) {
        g.fillStyle = 'rgba(46,230,166,.35)';
        g.fillRect(p.x * vak + vak * 0.35, p.y * vak + vak * 0.35, vak * 0.3, vak * 0.3);
      }
      kristal(g, (pz.doel.x + 0.5) * vak, (pz.doel.y + 0.5) * vak, vak * 0.3, '#4cc9ff');
      // De robot: een rond lijfje met een pijl in zijn kijkrichting.
      const cx = (pos.x + 0.5) * vak;
      const cy = (pos.y + 0.5) * vak;
      g.save();
      g.translate(cx, cy);
      g.rotate((pos.d * Math.PI) / 2);
      rrect(g, -vak * 0.3, -vak * 0.3, vak * 0.6, vak * 0.6, vak * 0.15, '#c8d4ea');
      rrect(g, -vak * 0.2, -vak * 0.18, vak * 0.4, vak * 0.14, 4, '#0d1628');
      g.fillStyle = '#2ee6a6';
      g.fillRect(-vak * 0.14, -vak * 0.15, vak * 0.07, vak * 0.07);
      g.fillRect(vak * 0.07, -vak * 0.15, vak * 0.07, vak * 0.07);
      g.fillStyle = '#ff4d6d';
      g.beginPath();
      g.moveTo(0, -vak * 0.46);
      g.lineTo(vak * 0.1, -vak * 0.32);
      g.lineTo(-vak * 0.1, -vak * 0.32);
      g.fill();
      g.restore();
    }
    const palet = el('div', 'od-palet');
    for (const k of ['V', 'L', 'R']) {
      const kb = knop(`${BLOK[k].t} ${BLOK[k].n}`, 'od-blok', () => {
        if (loopt) return;
        if (pz.max && prog.length >= pz.max) return melding(`Hooguit ${pz.max} blokken!`, 'fout');
        prog.push(k);
        sfx.tick();
        tekenProg();
      });
      palet.appendChild(kb);
    }
    body().appendChild(palet);
    const progBox = el('div', 'od-prog');
    body().appendChild(progBox);
    let lusBox = null;
    if (pz.lus) {
      lusBox = el('div', 'od-lus');
      body().appendChild(lusBox);
    }
    function tekenProg() {
      progBox.innerHTML = '';
      if (!prog.length) progBox.appendChild(el('span', 'muted small', 'Tik op de blokken hierboven om je programma te maken.'));
      prog.forEach((k, i) => {
        const c = knop(BLOK[k].t, 'od-blok klein', () => {
          if (loopt) return;
          prog.splice(i, 1);
          tekenProg();
        });
        c.title = 'Tik om weg te halen';
        progBox.appendChild(c);
      });
      if (pz.max) progBox.appendChild(el('span', 'od-max', `${prog.length}/${pz.max}`));
      if (lusBox) {
        lusBox.innerHTML = '';
        lusBox.appendChild(el('span', '', '🔁 Herhaal'));
        lusBox.appendChild(knop('−', 'od-mini', () => { herhaal = Math.max(1, herhaal - 1); tekenProg(); }));
        lusBox.appendChild(el('b', '', `${herhaal}×`));
        lusBox.appendChild(knop('+', 'od-mini', () => { herhaal = Math.min(9, herhaal + 1); tekenProg(); }));
      }
    }
    const rij = el('div', 'od-acties');
    rij.appendChild(knop('🗑 Wis', 'secondary', () => {
      if (loopt) return;
      prog.length = 0;
      pos = { ...pz.start };
      spoor = [];
      melding('');
      tekenProg();
      tekenRobot();
    }));
    rij.appendChild(knop('▶ Start', 'gold', () => {
      if (loopt || !prog.length) return;
      const res = OdPuzzels.robotLoop(pz, prog, pz.lus ? herhaal : 1, true);
      loopt = true;
      melding('');
      spoor = [];
      let i = 0;
      const stap = () => {
        if (i < res.pad.length) {
          pos = res.pad[i];
          if (i) spoor.push({ x: pos.x, y: pos.y });
          i++;
          sfx.tick();
          tekenRobot();
          setTimeout(stap, 260);
          return;
        }
        loopt = false;
        if (res.ok) return stuur({ blokken: prog.slice(), herhaal });
        sfx.bad();
        melding(res.fout === 'muur' ? 'Bonk! De robot botste tegen een muur.' : res.fout === 'rand' ? 'Oei, de robot reed van het bord.' : 'De robot kwam niet bij het kristal. Pas je programma aan.', 'fout');
        setTimeout(() => {
          pos = { ...pz.start };
          tekenRobot();
        }, 900);
      };
      stap();
    }));
    body().appendChild(rij);
    tekenProg();
    tekenRobot();
  }

  // ---------- Lichtbaken: spiegels ----------

  function licht(r) {
    const pz = r.pz;
    const standen = pz.spiegels.map(m => m.s);
    body().appendChild(el('p', 'od-opdracht', 'Tik op een spiegel om hem te draaien. Laat het licht het kristal raken.'));
    const b = bord(pz.w, pz.h, 1, 0);
    let klaarGezet = false;
    function tekenLicht() {
      const { g, vak, ox } = b;
      veld(g, b.w, b.h);
      for (let y = 0; y < pz.h; y++) for (let x = 0; x < pz.w; x++) rrect(g, ox + x * vak + 2, y * vak + 2, vak - 4, vak - 4, 6, (x + y) % 2 ? '#16233d' : '#1a2a48');
      for (const [x, y] of pz.rotsen) {
        rrect(g, ox + x * vak + 5, y * vak + 8, vak - 10, vak - 12, 8, '#46506a');
        rrect(g, ox + x * vak + 8, y * vak + 10, vak * 0.3, vak * 0.15, 4, '#5d6a88');
      }
      const pad = OdPuzzels.lichtPad(pz, standen);
      // De lichtstraal.
      g.save();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const [breed, kleur] of [[vak * 0.28, 'rgba(255,112,200,.25)'], [vak * 0.08, '#ffd6f0']]) {
        g.strokeStyle = kleur;
        g.lineWidth = breed;
        g.beginPath();
        pad.pad.forEach(([x, y], i) => {
          const px = ox + (x + 0.5) * vak;
          const py = (y + 0.5) * vak;
          if (i) g.lineTo(px, py);
          else g.moveTo(px, py);
        });
        if (!pad.ok && pad.pad.length) {
          // tot aan de rand van het laatste vakje
          const [lx, ly] = pad.pad[pad.pad.length - 1];
          const [vx, vy] = pad.pad.length > 1 ? pad.pad[pad.pad.length - 2] : [lx - 1, ly];
          g.lineTo(ox + (lx + 0.5 + (lx - vx) * 0.5) * vak, (ly + 0.5 + (ly - vy) * 0.5) * vak);
        }
        g.stroke();
      }
      g.restore();
      // De bron links.
      rrect(g, 4, pz.bron * vak + vak * 0.2, vak - 8, vak * 0.6, 8, '#3b4160');
      g.fillStyle = '#ff70c8';
      g.beginPath();
      g.arc(vak - 10, (pz.bron + 0.5) * vak, vak * 0.12, 0, Math.PI * 2);
      g.fill();
      kristal(g, ox + (pz.doel.x + 0.5) * vak, (pz.doel.y + 0.5) * vak, vak * 0.3, pad.ok ? '#2ee6a6' : '#4cc9ff', pad.ok ? 0.6 : 0.25);
      // De spiegels.
      pz.spiegels.forEach((m, i) => {
        const cx = ox + (m.x + 0.5) * vak;
        const cy = (m.y + 0.5) * vak;
        const d = vak * 0.34;
        g.lineCap = 'round';
        g.strokeStyle = '#8aa0c0';
        g.lineWidth = vak * 0.14;
        g.beginPath();
        if (standen[i] === '/') {
          g.moveTo(cx - d, cy + d);
          g.lineTo(cx + d, cy - d);
        } else {
          g.moveTo(cx - d, cy - d);
          g.lineTo(cx + d, cy + d);
        }
        g.stroke();
        g.strokeStyle = '#e8f6ff';
        g.lineWidth = vak * 0.05;
        g.stroke();
      });
      if (pad.ok && !klaarGezet) {
        klaarGezet = true;
        sfx.good();
        setTimeout(() => stuur(standen.slice()), 600);
      }
    }
    b.c.addEventListener('click', e => {
      if (klaarGezet) return;
      const [x, y] = b.vakOp(e);
      const i = pz.spiegels.findIndex(m => m.x === x && m.y === y);
      if (i < 0) return;
      standen[i] = standen[i] === '/' ? '\\' : '/';
      sfx.tick();
      tekenLicht();
    });
    tekenLicht();
  }

  // ---------- Labo: stroomkring ----------

  function stroom(r) {
    const pz = r.pz;
    const rot = pz.stukken.map(() => 0);
    let klaarGezet = false;
    body().appendChild(el('p', 'od-opdracht', 'Tik op een stukje draad om het te draaien. Maak een gesloten kring van de batterij naar de lamp.'));
    const b = bord(pz.w, pz.h, 1, 1);
    function tekenStroom() {
      const { g, vak, ox } = b;
      veld(g, b.w, b.h);
      const aan = OdPuzzels.stroomBereik(pz, rot);
      const ok = OdPuzzels.stroomOk(pz, rot);
      for (let y = 0; y < pz.h; y++) for (let x = 0; x < pz.w; x++) {
        const i = y * pz.w + x;
        const px = ox + x * vak;
        const py = y * vak;
        rrect(g, px + 2, py + 2, vak - 4, vak - 4, 6, '#16233d');
        const m = OdPuzzels.draai(pz.stukken[i], rot[i]);
        if (!m) continue;
        const stroomt = aan.has(`${x},${y}`);
        g.lineCap = 'round';
        for (const [breed, kleur] of stroomt ? [[vak * 0.3, 'rgba(76,201,255,.3)'], [vak * 0.12, '#bff3ff']] : [[vak * 0.14, '#5b6478']]) {
          g.strokeStyle = kleur;
          g.lineWidth = breed;
          for (let d = 0; d < 4; d++) {
            if (!(m & (1 << d))) continue;
            g.beginPath();
            g.moveTo(px + vak / 2, py + vak / 2);
            g.lineTo(px + vak / 2 + OdPuzzels.DX[d] * vak / 2, py + vak / 2 + OdPuzzels.DY[d] * vak / 2);
            g.stroke();
          }
        }
        g.fillStyle = stroomt ? '#e8fbff' : '#7a849a';
        g.beginPath();
        g.arc(px + vak / 2, py + vak / 2, vak * 0.08, 0, Math.PI * 2);
        g.fill();
      }
      // Batterij links, lamp rechts.
      const by = pz.a * vak;
      rrect(g, 6, by + vak * 0.25, vak - 14, vak * 0.5, 6, '#ffc94a');
      rrect(g, vak - 10, by + vak * 0.4, 6, vak * 0.2, 2, '#d0d8e8');
      g.fillStyle = '#2a1a00';
      g.font = `bold ${Math.round(vak * 0.3)}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('+', vak * 0.45, by + vak / 2);
      const lx = ox + pz.w * vak + vak / 2;
      const ly = (pz.b + 0.5) * vak;
      if (ok) {
        g.fillStyle = 'rgba(255,224,138,.35)';
        g.beginPath();
        g.arc(lx, ly, vak * 0.48, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = ok ? '#ffe08a' : '#4a4f5e';
      g.beginPath();
      g.arc(lx, ly - vak * 0.05, vak * 0.24, 0, Math.PI * 2);
      g.fill();
      rrect(g, lx - vak * 0.1, ly + vak * 0.15, vak * 0.2, vak * 0.14, 2, '#8aa0c0');
      if (ok && !klaarGezet) {
        klaarGezet = true;
        sfx.good();
        setTimeout(() => stuur(rot.slice()), 700);
      }
    }
    b.c.addEventListener('click', e => {
      if (klaarGezet) return;
      const [x, y] = b.vakOp(e);
      if (x < 0 || y < 0 || x >= pz.w || y >= pz.h) return;
      const i = y * pz.w + x;
      if (!pz.stukken[i]) return;
      rot[i] = (rot[i] + 1) % 4;
      sfx.tick();
      tekenStroom();
    });
    tekenStroom();
  }

  // ---------- Labo: tandwielen ----------

  function tandwiel(r) {
    const pz = r.pz;
    body().appendChild(el('p', 'od-opdracht', pz.vraag));
    const cols = Math.max(...pz.wielen.map(w => w.x)) + 1;
    const rows = Math.max(...pz.wielen.map(w => w.y)) + 1;
    const b = bord(cols + (pz.ratio ? 0.6 : 0), rows + (pz.ratio ? 0.6 : 0));
    const maxT = Math.max(...pz.wielen.map(w => w.t));
    let hoek = 0;
    let draait = false;
    function straal(w) {
      return pz.ratio ? b.vak * 0.62 * (0.45 + 0.55 * (w.t / maxT)) : b.vak * 0.52;
    }
    // Waar staan de wielen? Bij tanden schuiven ze zo dat ze elkaar net raken.
    const plek = [];
    pz.wielen.forEach((w, i) => {
      if (!pz.ratio || !i) plek.push([(w.x + 0.5) * b.vak + (pz.ratio ? b.vak * 0.1 : 0), (w.y + 0.5) * b.vak + (pz.ratio ? b.vak * 0.3 : 0)]);
      else {
        const v = plek[i - 1];
        plek.push([v[0] + straal(pz.wielen[i - 1]) * 0.92 + straal(w) * 0.92, v[1]]);
      }
    });
    function tekenWielen() {
      const { g } = b;
      veld(g, b.w, b.h);
      pz.wielen.forEach((w, i) => {
        const [cx, cy] = plek[i];
        const rr = straal(w);
        const tanden = pz.ratio ? w.t : 12;
        // Elk wiel draait de andere kant op dan zijn buur, en kleine wielen draaien sneller.
        const richting = pz.ratio ? (i % 2 ? -1 : 1) : ((w.x + w.y) - (pz.wielen[0].x + pz.wielen[0].y)) % 2 ? -1 : 1;
        const a = hoek * richting * (pz.ratio ? pz.wielen[0].t / w.t : 1) + (i % 2 ? Math.PI / tanden : 0);
        g.save();
        g.translate(cx, cy);
        g.rotate(a);
        g.fillStyle = i === pz.vraagWiel ? '#ffc94a' : i === 0 ? '#4cc9ff' : '#9fb0cc';
        g.beginPath();
        for (let k = 0; k < tanden * 2; k++) {
          const ang = (k / (tanden * 2)) * Math.PI * 2;
          const rad = k % 2 ? rr : rr * 0.84;
          g.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(13,22,40,.55)';
        g.beginPath();
        g.arc(0, 0, rr * 0.55, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#e8edf5';
        g.fillRect(-rr * 0.06, -rr * 0.7, rr * 0.12, rr * 0.3); // een streepje om het draaien te zien
        g.restore();
        g.fillStyle = '#fff';
        g.font = `bold ${Math.round(rr * 0.42)}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        if (i === 0) g.fillText('↻', cx, cy);
        else if (i === pz.vraagWiel) g.fillText(draait ? '' : '?', cx, cy);
        if (pz.ratio) {
          g.font = `${Math.round(b.vak * 0.16)}px sans-serif`;
          g.fillStyle = '#cfe2ff';
          g.fillText(`${w.t} tanden`, cx, cy + rr + b.vak * 0.12);
        }
      });
    }
    const opties = el('div', 'od-opties');
    pz.opties.forEach((o, i) => opties.appendChild(knop(o, 'od-optie', () => {
      if (bezig || draait) return;
      stuur(i, res => {
        if (!res.klaar) {
          sfx.bad();
          return melding('Nog niet. Kijk goed: wielen die elkaar raken, draaien de andere kant op.', 'fout');
        }
        // Laten draaien, dan pas het resultaat.
        draait = true;
        const t0 = performance.now();
        const anim = t => {
          hoek = ((t - t0) / 1000) * 2.2;
          tekenWielen();
          if (t - t0 < 1800) requestAnimationFrame(anim);
          else klaar(res);
        };
        requestAnimationFrame(anim);
      });
    })));
    body().appendChild(opties);
    tekenWielen();
  }

  // ---------- Labo: wip ----------

  function wip(r) {
    const pz = r.pz;
    body().appendChild(el('p', 'od-opdracht', pz.vraag));
    const b = bord(9, 3.4);
    let keuze = { w: pz.rechts.w || null, d: null };
    let schuin = 0;
    const links = OdPuzzels.wipLinks(pz);
    function tekenWip() {
      const { g, vak } = b;
      veld(g, b.w, b.h);
      const cx = b.w / 2;
      const cy = b.h * 0.62;
      // Steunpunt.
      g.fillStyle = '#8aa0c0';
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + vak * 0.45, cy + vak * 0.9);
      g.lineTo(cx - vak * 0.45, cy + vak * 0.9);
      g.closePath();
      g.fill();
      g.save();
      g.translate(cx, cy);
      g.rotate(schuin);
      rrect(g, -vak * 4.4, -vak * 0.08, vak * 8.8, vak * 0.16, 4, '#c8d4ea');
      // Plaatsen 1 tot 4 aan elke kant.
      g.font = `${Math.round(vak * 0.22)}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      for (let d = 1; d <= 4; d++) {
        for (const kant of [-1, 1]) {
          g.fillStyle = '#5b6478';
          g.fillRect(kant * d * vak - 1, -vak * 0.08, 2, vak * 0.16);
          g.fillStyle = '#9fb0cc';
          g.fillText(String(d), kant * d * vak, vak * 0.14);
        }
      }
      const blok = (w, x, kleur) => {
        const s = vak * (0.36 + w * 0.07);
        rrect(g, x - s / 2, -vak * 0.08 - s, s, s, 5, kleur);
        g.fillStyle = '#0d1628';
        g.font = `bold ${Math.round(vak * 0.24)}px sans-serif`;
        g.textBaseline = 'middle';
        g.fillText(`${w}kg`, x, -vak * 0.08 - s / 2);
        g.textBaseline = 'top';
      };
      for (const l of pz.links) blok(l.w, -l.d * vak, '#ff8fa3');
      if (keuze.w && keuze.d) blok(keuze.w, keuze.d * vak, '#7fdcff');
      g.restore();
    }
    const knoppen = el('div', 'od-wip-knoppen');
    if (pz.rechts.kies) {
      const rij = el('div', 'od-opties klein');
      rij.appendChild(el('span', 'muted small', 'Blok:'));
      for (const w of pz.rechts.kies) {
        rij.appendChild(knop(`${w} kg`, 'od-optie klein', e => {
          keuze.w = w;
          for (const x of rij.querySelectorAll('button')) x.classList.toggle('on', x === e.currentTarget);
          tekenWip();
        }));
      }
      knoppen.appendChild(rij);
    }
    const plekken = el('div', 'od-opties klein');
    plekken.appendChild(el('span', 'muted small', 'Plaats:'));
    for (let d = 1; d <= 4; d++) {
      plekken.appendChild(knop(String(d), 'od-optie klein', e => {
        keuze.d = d;
        for (const x of plekken.querySelectorAll('button')) x.classList.toggle('on', x === e.currentTarget);
        tekenWip();
      }));
    }
    knoppen.appendChild(plekken);
    knoppen.appendChild(knop('⚖️ Laat los', 'gold', () => {
      if (!keuze.w || !keuze.d) return melding(pz.rechts.kies ? 'Kies eerst een blok en een plaats.' : 'Kies eerst een plaats.', 'fout');
      const rechts = keuze.w * keuze.d;
      const doel = Math.max(-0.22, Math.min(0.22, (rechts - links) * 0.03));
      const t0 = performance.now();
      const van = schuin;
      const anim = t => {
        const f = Math.min(1, (t - t0) / 600);
        schuin = van + (doel - van) * (1 - (1 - f) ** 3);
        tekenWip();
        if (f < 1) return requestAnimationFrame(anim);
        if (rechts === links) stuur({ w: keuze.w, d: keuze.d });
        else {
          sfx.bad();
          melding(rechts > links ? 'Rechts zakt naar beneden: te zwaar of te ver.' : 'Links zakt naar beneden: rechts moet meer kracht geven.', 'fout');
        }
      };
      requestAnimationFrame(anim);
    }));
    body().appendChild(knoppen);
    if (pz.rechts.kies) melding('');
    tekenWip();
  }

  // ---------- Woordenwachter ----------

  function woorden(r) {
    const v = r.vraag;
    body().appendChild(el('p', 'od-stap', `Woord ${v.nr} van ${v.van}`));
    body().appendChild(el('p', 'od-opdracht', 'Welk woord betekent:'));
    const bet = el('div', 'od-betekenis');
    bet.appendChild(el('span', '', v.b));
    const lees = voorleesKnop(v.b);
    if (lees) bet.appendChild(lees);
    body().appendChild(bet);
    const antwoord = a => stuur(a, res => {
      if (res.klaar) return klaar(res);
      const b = body();
      const fb = woordKaart(res.woord, res.woord.juist);
      b.innerHTML = '';
      b.appendChild(el('p', `od-feedback ${res.woord.juist ? 'goed' : 'fout'}`, res.woord.juist ? '✓ Juist!' : `✗ Het juiste woord was "${res.woord.woord}". Het komt straks nog eens terug.`));
      if (res.woord.juist) sfx.good();
      else sfx.bad();
      b.appendChild(fb);
      const verder = knop('Volgende woord →', 'gold', () => {
        nu = { ...nu, ...res.volgende };
        teken();
      });
      b.appendChild(verder);
      verder.focus();
    });
    if (v.opties) {
      const opties = el('div', 'od-opties');
      for (const o of v.opties) opties.appendChild(knop(o, 'od-optie', () => antwoord(o)));
      body().appendChild(opties);
    } else {
      body().appendChild(typVeld(v.hint, v.lengte, antwoord));
    }
  }

  function typVeld(hint, lengte, fn) {
    const f = el('form', 'od-typ');
    if (hint) f.appendChild(el('p', 'od-hint-woord', hint.split('').join(' ')));
    const inp = el('input');
    inp.autocomplete = 'off';
    inp.maxLength = 30;
    inp.placeholder = lengte ? `${lengte} letters` : 'Typ het woord';
    f.appendChild(inp);
    const b = el('button', 'gold', 'Controleer');
    b.type = 'submit';
    f.appendChild(b);
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (inp.value.trim()) fn(inp.value.trim());
    });
    setTimeout(() => inp.focus(), 50);
    return f;
  }

  // ---------- Runenportaal: geheimschrift ----------

  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function code(r) {
    const c = r.code;
    const tekst = el('div', 'od-code');
    for (const l of c.tekst) tekst.appendChild(el('span', 'od-rune', l));
    body().appendChild(el('p', 'od-opdracht', c.sleutel
      ? `Elke letter van het geheime woord schoof ${c.sleutel} ${c.sleutel === 1 ? 'plaats' : 'plaatsen'} op in het alfabet. Schuif terug!`
      : 'Elke letter schoof een paar plaatsen op in het alfabet. Hoeveel? Draai aan het wiel en zoek het zelf.'));
    body().appendChild(tekst);
    if (c.tabel) {
      // Page: een vertaaltabel van geheime letter naar echte letter.
      const tabel = el('div', 'od-tabel');
      for (let i = 0; i < 26; i++) {
        const k = el('div', 'od-tabel-k');
        k.appendChild(el('b', '', ABC[(i + c.sleutel) % 26]));
        k.appendChild(el('span', '', ABC[i]));
        tabel.appendChild(k);
      }
      body().appendChild(el('p', 'muted small', 'Boven: geheime letter. Onder: echte letter.'));
      body().appendChild(tabel);
    } else if (c.sleutel) {
      body().appendChild(el('div', 'od-abc', ABC.split('').join(' ')));
    } else {
      // Ridder: een decodeerwiel om te proberen.
      const wiel = el('div', 'od-wiel');
      const inp = el('input');
      inp.type = 'range';
      inp.min = 0;
      inp.max = 25;
      inp.value = 0;
      const toon = el('div', 'od-code proef');
      const tekenProef = () => {
        const k = Number(inp.value);
        toon.innerHTML = '';
        for (const l of c.tekst) toon.appendChild(el('span', 'od-rune klein', ABC[(ABC.indexOf(l) - k + 26) % 26]));
        lab.textContent = `${k} terug`;
      };
      const lab = el('b');
      wiel.appendChild(el('span', '', '🎡'));
      wiel.appendChild(inp);
      wiel.appendChild(lab);
      inp.addEventListener('input', tekenProef);
      body().appendChild(wiel);
      body().appendChild(toon);
      tekenProef();
    }
    if (c.betekenis) body().appendChild(el('p', 'od-hulp', `Hulp: het woord betekent "${c.betekenis}"`));
    if (c.eerste) body().appendChild(el('p', 'od-hulp', `Het woord begint met een ${c.eerste}.`));
    body().appendChild(typVeld('', c.lengte, a => stuur(a, res => {
      if (res.klaar) return klaar(res);
      sfx.bad();
      if (res.volgende && (res.volgende.code.eerste || res.volgende.code.betekenis) && !c.eerste) {
        nu = { ...nu, ...res.volgende };
        teken();
      }
      melding(res.tekst, 'fout');
    })));
  }

  // ---------- Sterrenwacht: weetjes ----------

  function weetje(r) {
    const w = r.weetje;
    body().appendChild(el('p', 'od-stap', `🔭 ${w.o}`));
    const vraag = el('div', 'od-betekenis');
    vraag.appendChild(el('span', '', w.v));
    const lees = voorleesKnop(`${w.v} ${w.a.join('. ')}`);
    if (lees) vraag.appendChild(lees);
    body().appendChild(vraag);
    const opties = el('div', 'od-opties');
    w.a.forEach((o, i) => opties.appendChild(knop(o, 'od-optie', () => stuur(i, res => {
      if (res.klaar) return klaar(res);
      sfx.bad();
      const b = body();
      b.innerHTML = '';
      b.appendChild(el('p', 'od-feedback fout', `✗ Helaas. Het juiste antwoord was: ${res.weetje.antwoord}.`));
      if (res.weetje.w) b.appendChild(weetjeKaart(res.weetje));
      b.appendChild(el('p', 'muted small', 'Dit weetje komt niet in je boek. Probeer een nieuwe vraag!'));
      const rij = el('div', 'od-acties');
      rij.appendChild(knop('Nieuwe vraag', 'gold', () => open(nu.station, nu.niveau)));
      rij.appendChild(knop('Verder ontdekken', 'secondary', () => toon(false)));
      b.appendChild(rij);
    }))));
    body().appendChild(opties);
  }

  // ---------- Een getal intikken ----------

  function getalVeld(fn, label = 'Controleer') {
    const f = el('form', 'od-typ od-getal');
    const inp = el('input');
    inp.type = 'number';
    inp.inputMode = 'numeric';
    inp.autocomplete = 'off';
    inp.placeholder = '?';
    f.appendChild(inp);
    const b = el('button', 'gold', label);
    b.type = 'submit';
    f.appendChild(b);
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (inp.value.trim() !== '') fn(Number(inp.value), inp);
    });
    setTimeout(() => inp.focus(), 50);
    return f;
  }
  const getalStuur = (getal, inp) => stuur(getal, res => {
    if (res.klaar) return klaar(res);
    sfx.bad();
    melding(res.tekst || 'Nog niet. Reken nog eens na!', 'fout');
    inp.select();
  });

  // ---------- Drakenkust: de goudsmid (weegschalen) ----------

  function weeg(r) {
    const pz = r.pz;
    body().appendChild(el('p', 'od-opdracht', 'Elke weegschaal is in evenwicht. Gebruik wat je weet!'));
    const lijst = el('div', 'od-schalen');
    for (const sch of pz.schalen) {
      const rij = el('div', 'od-schaal');
      rij.appendChild(el('span', 'od-schaal-l', sch.links.join(' ')));
      rij.appendChild(el('span', 'od-schaal-m', '⚖️'));
      rij.appendChild(el('span', 'od-schaal-r', `${sch.rechts.join(' ')} 🪙`));
      lijst.appendChild(rij);
    }
    body().appendChild(lijst);
    body().appendChild(el('p', 'od-vraag-groot', `Hoeveel 🪙 weegt één ${pz.vraag}?`));
    body().appendChild(getalVeld(getalStuur));
  }

  // ---------- Drakenkust: het drakennest (reeksen) ----------

  function reeks(r) {
    const pz = r.pz;
    const toon = pz.rij.slice();
    if (!toon.includes(null)) toon.push(null);
    body().appendChild(el('p', 'od-opdracht', 'Zoek de regel. Welk getal hoort op het lege ei?'));
    const rij = el('div', 'od-eieren');
    for (const x of toon) rij.appendChild(el('span', `od-ei${x === null ? ' leeg' : ''}`, x === null ? '?' : String(x)));
    body().appendChild(rij);
    body().appendChild(getalVeld(getalStuur));
  }

  // ---------- Drakenkust: het drakenbeeld (pixelpuzzel) ----------

  function pixel(r) {
    const pz = r.pz;
    const n = pz.size;
    const cw = Math.max(...pz.rijen.map(g => g.length));
    const ch = Math.max(...pz.kolommen.map(g => g.length));
    const veld = Array(n * n).fill(0); // 0 leeg, 1 gekleurd, 2 kruisje
    let klaarGezet = false;
    body().appendChild(el('p', 'od-opdracht', 'Tik om een vakje te kleuren, nog eens voor een kruisje. De getallen zeggen hoeveel vakjes na elkaar gekleurd zijn.'));
    const b = bord(n + cw, n + ch);
    const { g, vak } = b;
    function tekenAlles() {
      g.fillStyle = '#0d1630';
      g.fillRect(0, 0, b.w, b.h);
      const fs = Math.max(9, Math.round(vak * 0.42));
      g.font = `bold ${fs}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const rijOk = y => OdPuzzels.lijnGetallen(veld.slice(y * n, y * n + n).map(v => (v === 1 ? 1 : 0))).join() === pz.rijen[y].join();
      const kolOk = x => OdPuzzels.lijnGetallen(Array.from({ length: n }, (_, y) => (veld[y * n + x] === 1 ? 1 : 0))).join() === pz.kolommen[x].join();
      pz.rijen.forEach((gt, y) => {
        g.fillStyle = rijOk(y) ? '#2ee6a6' : '#ffe08a';
        gt.forEach((v, i) => g.fillText(String(v), (cw - gt.length + i + 0.5) * vak, (ch + y + 0.5) * vak));
      });
      pz.kolommen.forEach((gt, x) => {
        g.fillStyle = kolOk(x) ? '#2ee6a6' : '#ffe08a';
        gt.forEach((v, i) => g.fillText(String(v), (cw + x + 0.5) * vak, (ch - gt.length + i + 0.5) * vak));
      });
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const v = veld[y * n + x];
        const px = (cw + x) * vak;
        const py = (ch + y) * vak;
        rrect(g, px + 1, py + 1, vak - 2, vak - 2, 3, v === 1 ? '#c77dff' : '#1b2a48');
        if (v === 1) rrect(g, px + 3, py + 3, vak * 0.4, vak * 0.18, 2, 'rgba(255,255,255,.35)');
        if (v === 2) {
          g.strokeStyle = '#5b6b8c';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(px + vak * 0.3, py + vak * 0.3);
          g.lineTo(px + vak * 0.7, py + vak * 0.7);
          g.moveTo(px + vak * 0.7, py + vak * 0.3);
          g.lineTo(px + vak * 0.3, py + vak * 0.7);
          g.stroke();
        }
      }
      // dikkere lijnen om de 5 vakjes, zoals in een echt raster
      g.strokeStyle = 'rgba(76,201,255,.5)';
      g.lineWidth = 1.5;
      for (let i = 0; i <= n; i += 5) {
        g.beginPath();
        g.moveTo((cw + i) * vak, ch * vak);
        g.lineTo((cw + i) * vak, (ch + n) * vak);
        g.moveTo(cw * vak, (ch + i) * vak);
        g.lineTo((cw + n) * vak, (ch + i) * vak);
        g.stroke();
      }
    }
    b.c.addEventListener('click', e => {
      if (klaarGezet) return;
      const [x0, y0] = b.vakOp(e);
      const x = x0 - cw;
      const y = y0 - ch;
      if (x < 0 || y < 0 || x >= n || y >= n) return;
      veld[y * n + x] = (veld[y * n + x] + 1) % 3;
      sfx.tick();
      tekenAlles();
      const poging = veld.map(v => (v === 1 ? 1 : 0));
      if (OdPuzzels.check('pixel', pz, poging)) {
        klaarGezet = true;
        sfx.good();
        setTimeout(() => stuur(poging), 600);
      }
    });
    tekenAlles();
  }

  // ---------- Sterrenhaven: de sterrenkoepel (sudoku) ----------

  function sudoku(r) {
    const pz = r.pz;
    const n = pz.size;
    const v = pz.gegeven.slice();
    let kies = v.findIndex(x => !x);
    let klaarGezet = false;
    body().appendChild(el('p', 'od-opdracht', 'Tik op een leeg vakje en kies een getal.'));
    const b = bord(n, n);
    const { g, vak } = b;
    function tekenSudoku() {
      g.fillStyle = '#0d1630';
      g.fillRect(0, 0, b.w, b.h);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `bold ${Math.round(vak * 0.5)}px sans-serif`;
      for (let i = 0; i < n * n; i++) {
        const x = i % n;
        const y = Math.floor(i / n);
        const blok = (Math.floor(x / pz.bw) + Math.floor(y / pz.bh)) % 2;
        rrect(g, x * vak + 1, y * vak + 1, vak - 2, vak - 2, 4, i === kies ? '#3a2f6b' : blok ? '#18264a' : '#1f3058');
        if (v[i]) {
          g.fillStyle = pz.gegeven[i] ? '#ffe08a' : '#9ff3ff';
          g.fillText(String(v[i]), x * vak + vak / 2, y * vak + vak / 2 + 1);
        }
      }
      g.strokeStyle = 'rgba(199,125,255,.9)';
      g.lineWidth = 2.5;
      for (let x = 0; x <= n; x += pz.bw) { g.beginPath(); g.moveTo(x * vak, 0); g.lineTo(x * vak, n * vak); g.stroke(); }
      for (let y = 0; y <= n; y += pz.bh) { g.beginPath(); g.moveTo(0, y * vak); g.lineTo(n * vak, y * vak); g.stroke(); }
    }
    function zet(getal) {
      if (klaarGezet || kies < 0 || pz.gegeven[kies]) return;
      v[kies] = getal;
      sfx.tick();
      const volgende = v.findIndex((x, i) => !x && i > kies);
      if (getal && volgende >= 0) kies = volgende;
      tekenSudoku();
      if (v.every(Boolean)) {
        if (OdPuzzels.check('sudoku', pz, v)) {
          klaarGezet = true;
          sfx.good();
          setTimeout(() => stuur(v.slice()), 600);
        } else melding('Bijna! Ergens staat een getal twee keer in een rij, kolom of blok.', 'fout');
      } else melding('');
    }
    b.c.addEventListener('click', e => {
      const [x, y] = b.vakOp(e);
      if (x < 0 || y < 0 || x >= n || y >= n || pz.gegeven[y * n + x]) return;
      kies = y * n + x;
      tekenSudoku();
    });
    const knoppen = el('div', 'od-cijfers');
    for (let i = 1; i <= n; i++) knoppen.appendChild(knop(String(i), 'od-cijfer', () => zet(i)));
    knoppen.appendChild(knop('⌫', 'od-cijfer secondary', () => zet(0)));
    body().appendChild(knoppen);
    const toets = e => {
      if (!nu || nu.soort !== 'sudoku') return window.removeEventListener('keydown', toets);
      const k = Number(e.key);
      if (k >= 1 && k <= n) zet(k);
      else if (e.key === 'Backspace' || e.key === 'Delete') zet(0);
    };
    window.addEventListener('keydown', toets);
    tekenSudoku();
  }

  // ---------- Sterrenhaven: de donjon (doolhof met sleutels) ----------

  function doolhof(r) {
    const pz = r.pz;
    let stappen = '';
    let klaarGezet = false;
    const KLEUR = { goud: '#ffc94a', blauw: '#4cc9ff', rood: '#ff5a7a' };
    body().appendChild(el('p', 'od-opdracht', pz.deuren.length ? 'Loop met de pijltjes (of tik naast je ridder). Een deur gaat open met de sleutel in dezelfde kleur.' : 'Loop met de pijltjes (of tik naast je ridder) naar de uitgang.'));
    const b = bord(pz.size, pz.size);
    const { g, vak } = b;
    function tekenDoolhof() {
      const st = OdPuzzels.doolhofLoop(pz, stappen);
      g.fillStyle = '#0a1024';
      g.fillRect(0, 0, b.w, b.h);
      for (let y = 0; y < pz.size; y++) for (let x = 0; x < pz.size; x++) {
        if (pz.muren[y * pz.size + x] === '1') rrect(g, x * vak, y * vak, vak, vak, 1, '#2b3a63');
        else rrect(g, x * vak, y * vak, vak, vak, 0, '#121c38');
      }
      for (const s of pz.sleutels) if (!st.heb.has(s.k)) {
        g.fillStyle = KLEUR[s.k];
        g.font = `${Math.round(vak * 0.8)}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.beginPath();
        g.arc(s.x * vak + vak * 0.38, s.y * vak + vak * 0.5, vak * 0.22, 0, Math.PI * 2);
        g.fill();
        g.fillRect(s.x * vak + vak * 0.5, s.y * vak + vak * 0.44, vak * 0.4, vak * 0.12);
      }
      for (const d of pz.deuren) {
        const open = st.heb.has(d.k);
        rrect(g, d.x * vak + 1, d.y * vak + 1, vak - 2, vak - 2, 3, open ? 'rgba(255,255,255,.08)' : KLEUR[d.k]);
        if (!open) rrect(g, d.x * vak + vak * 0.42, d.y * vak + vak * 0.35, vak * 0.16, vak * 0.3, 2, '#1a1a2a');
      }
      kristal(g, pz.doel.x * vak + vak / 2, pz.doel.y * vak + vak / 2, vak * 0.38, '#2ee6a6', 0.35);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(st.x * vak + vak / 2, st.y * vak + vak / 2, vak * 0.34, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#c77dff';
      g.beginPath();
      g.arc(st.x * vak + vak / 2, st.y * vak + vak / 2, vak * 0.22, 0, Math.PI * 2);
      g.fill();
      if (st.ok && !klaarGezet) {
        klaarGezet = true;
        sfx.good();
        setTimeout(() => stuur(stappen), 500);
      }
      return st;
    }
    function stap(c) {
      if (klaarGezet || !nu || nu.soort !== 'doolhof') return;
      const voor = OdPuzzels.doolhofLoop(pz, stappen);
      const na = OdPuzzels.doolhofLoop(pz, stappen + c);
      if (na.x === voor.x && na.y === voor.y) return; // tegen een muur of een dichte deur
      stappen += c;
      if (na.heb.size > voor.heb.size) sfx.good();
      tekenDoolhof();
    }
    const toets = e => {
      if (!nu || nu.soort !== 'doolhof') return window.removeEventListener('keydown', toets);
      const c = { ArrowUp: 'N', ArrowRight: 'O', ArrowDown: 'Z', ArrowLeft: 'W', KeyW: 'N', KeyD: 'O', KeyS: 'Z', KeyA: 'W' }[e.code];
      if (c) {
        e.preventDefault();
        stap(c);
      }
    };
    window.addEventListener('keydown', toets);
    b.c.addEventListener('click', e => {
      const [x, y] = b.vakOp(e);
      const st = OdPuzzels.doolhofLoop(pz, stappen);
      const dx = x - st.x;
      const dy = y - st.y;
      if (Math.abs(dx) >= Math.abs(dy) && dx) stap(dx > 0 ? 'O' : 'W');
      else if (dy) stap(dy > 0 ? 'Z' : 'N');
    });
    const pijlen = el('div', 'od-pijlen');
    for (const [c, t] of [['N', '▲'], ['W', '◀'], ['Z', '▼'], ['O', '▶']]) pijlen.appendChild(knop(t, `od-pijl od-pijl-${c}`, () => stap(c)));
    body().appendChild(pijlen);
    tekenDoolhof();
  }

  // ---------- Sterrenhaven: de gouden toren (rekenmuur) ----------

  function toren(r) {
    const pz = r.pz;
    body().appendChild(el('p', 'od-opdracht', 'Elke steen is de som van de twee stenen eronder. Vul de lege stenen in.'));
    const muur = el('form', 'od-rekenmuur');
    const velden = [];
    pz.rijen.forEach((rij, y) => {
      const lijn = el('div', 'od-rekenmuur-rij');
      velden.push(rij.map(v => {
        if (v !== null) {
          lijn.appendChild(el('span', 'od-mst', String(v)));
          return null;
        }
        const inp = el('input', 'od-mst leeg');
        inp.type = 'number';
        inp.inputMode = 'numeric';
        lijn.appendChild(inp);
        return inp;
      }));
      muur.appendChild(lijn);
    });
    const knopC = el('button', 'gold', 'Controleer');
    knopC.type = 'submit';
    muur.appendChild(knopC);
    muur.addEventListener('submit', e => {
      e.preventDefault();
      const poging = pz.rijen.map((rij, y) => rij.map((v, x) => (v !== null ? v : Number(velden[y][x].value))));
      if (velden.flat().some(i => i && i.value.trim() === '')) return melding('Vul eerst alle lege stenen in.', 'fout');
      stuur(poging, res => {
        if (res.klaar) return klaar(res);
        sfx.bad();
        melding('Nog niet. Tel de twee stenen onder elke steen eens op!', 'fout');
      });
    });
    body().appendChild(muur);
    setTimeout(() => { const f = velden.flat().find(Boolean); if (f) f.focus(); }, 50);
  }

  const TEKEN = { schuif, robot, licht, stroom, tandwiel, wip, woorden, code, weetje, weeg, reeks, pixel, sudoku, doolhof, toren };

  // ---------- Woordenboek en ontdekkersboek ----------

  let boekTab = 'woorden';
  let boekData = null;
  function boek() {
    socket.emit('od-boek', od.naam, res => {
      if (!res || res.error) return odToast((res && res.error) || 'Dat lukte niet.');
      boekData = res;
      od.venster = true;
      $('od-boek').classList.remove('hidden');
      tekenBoek();
    });
  }
  function tekenBoek() {
    const b = $('odb-body');
    b.innerHTML = '';
    $('odb-nw').textContent = boekData.woorden.length;
    $('odb-nf').textContent = boekData.weetjes.length;
    for (const k of document.querySelectorAll('[data-boek]')) k.classList.toggle('on', k.dataset.boek === boekTab);
    if (od.stand && od.stand.runenTotaal) b.appendChild(el('p', 'od-runen-tel', `🪨 Verborgen runenstenen gevonden: ${(od.stand.runen || []).length} van de ${od.stand.runenTotaal}`));
    if (boekTab === 'woorden') {
      if (!boekData.woorden.length) b.appendChild(el('p', 'muted', 'Nog leeg. Bij de Woordenwachter en het Runenportaal vind je nieuwe woorden.'));
      for (const w of boekData.woorden) b.appendChild(woordKaart({ woord: w.w, b: w.b, z: w.z }, false));
    } else {
      if (!boekData.weetjes.length) b.appendChild(el('p', 'muted', 'Nog leeg. In de Sterrenwacht en het Labo ontdek je weetjes.'));
      let onderwerp = '';
      for (const w of boekData.weetjes) {
        if (w.o !== onderwerp) {
          onderwerp = w.o;
          b.appendChild(el('h4', 'od-boek-kop', onderwerp));
        }
        b.appendChild(weetjeKaart({ o: w.v || w.o, w: w.w }));
      }
    }
  }
  for (const k of document.querySelectorAll('[data-boek]')) k.addEventListener('click', () => { boekTab = k.dataset.boek; tekenBoek(); });
  const sluitBoek = () => {
    $('od-boek').classList.add('hidden');
    od.venster = false;
    if (window.Voorlees) Voorlees.stop();
  };
  $('odb-dicht').addEventListener('click', sluitBoek);
  $('od-boek').addEventListener('click', e => { if (e.target.id === 'od-boek') sluitBoek(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('od-boek').classList.contains('hidden')) sluitBoek(); });
  $('od-boek-knop').addEventListener('click', boek);

  return { open, boek };
})();
