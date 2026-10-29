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
    ijs: 'Glijd over het ijsmeer naar het kristal.',
    klok: 'Lees de klokken in de klokkentoren.',
    spiegel: 'Maak het ijsbeeld af in de spiegel.',
    codeslot: 'Kraak de code van de lavapoort.',
    lampen: 'Laat alle vuurkristallen gloeien.',
    hanoi: 'Verhuis de toren van schijven naar de laatste paal.',
    breuk: 'Kleur het juiste deel van de taart.',
    munten: 'Betaal de piraten met precies genoeg geld.',
    coord: 'Zet de kruisjes op de schatkaart.',
    kubus: 'Tel de blokjes van de wolkentoren.',
    magisch: 'Maak het magische vierkant af.',
    route: 'Zoek de kortste vlucht tussen de wolken.',
    drijven: 'Wat drijft er, en wat zinkt?',
    thermo: 'Lees de thermometer af.',
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
        drakenzadel: '🐉 Genoeg kristallen voor het drakenzadel! De draak wacht bij de rotsen op de Drakenkust.',
        ijsraket: '❄️ Genoeg kristallen voor de ijsraket! Ze staat in de Sterrenhaven.',
        duikboot: '🐠 Genoeg kristallen voor de duikboot! Ze ligt bij de vijver op de Drakenkust.',
        luchtballon: '🎈 Genoeg kristallen voor de luchtballon! Hij staat in het IJsrijk.',
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

  // Zetten-teller met "het kan in ..." en een knop om opnieuw te beginnen.
  function tellerEnOpnieuw(min, opnieuw) {
    const teller = el('p', 'od-teller-tekst', '');
    body().appendChild(teller);
    body().appendChild(knop('↺ Opnieuw beginnen', 'secondary klein', opnieuw));
    return n => { teller.textContent = `${n} ${n === 1 ? 'zet' : 'zetten'}${min ? ` · het kan in ${min}` : ''}`; };
  }

  // ---------- IJsrijk: het ijsmeer (glijden) ----------

  function ijs(r) {
    const pz = r.pz;
    let stappen = '';
    let klaarGezet = false;
    let anim = null;
    body().appendChild(el('p', 'od-opdracht', 'Op het ijs glijd je door tot je ergens tegen botst. Kom precies op het kristal terecht.'));
    const b = bord(pz.w, pz.h);
    const { g, vak } = b;
    const rots = new Set(pz.rotsen);
    function tekenIjs(px, py) {
      g.fillStyle = '#0d1e36';
      g.fillRect(0, 0, b.w, b.h);
      for (let y = 0; y < pz.h; y++) for (let x = 0; x < pz.w; x++) {
        if (rots.has(y * pz.w + x)) {
          rrect(g, x * vak + 1, y * vak + 1, vak - 2, vak - 2, 4, '#9fb2cc');
          g.fillStyle = '#6b7f9e';
          g.beginPath();
          g.moveTo(x * vak + vak * 0.15, y * vak + vak * 0.85);
          g.lineTo(x * vak + vak * 0.5, y * vak + vak * 0.2);
          g.lineTo(x * vak + vak * 0.85, y * vak + vak * 0.85);
          g.fill();
          g.fillStyle = '#f4f8ff';
          g.fillRect(x * vak + vak * 0.42, y * vak + vak * 0.22, vak * 0.16, vak * 0.12);
        } else {
          rrect(g, x * vak + 1, y * vak + 1, vak - 2, vak - 2, 3, (x + y) % 2 ? '#bfe6f7' : '#aedcf2');
          if ((x * 7 + y * 3) % 5 === 0) {
            g.strokeStyle = 'rgba(255,255,255,.8)';
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(x * vak + vak * 0.25, y * vak + vak * 0.6);
            g.lineTo(x * vak + vak * 0.55, y * vak + vak * 0.3);
            g.stroke();
          }
        }
      }
      kristal(g, (pz.doel.x + 0.5) * vak, (pz.doel.y + 0.5) * vak, vak * 0.34, '#c77dff', 0.35);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc((px + 0.5) * vak, (py + 0.5) * vak, vak * 0.32, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2a8fe0';
      g.beginPath();
      g.arc((px + 0.5) * vak, (py + 0.5) * vak, vak * 0.2, 0, Math.PI * 2);
      g.fill();
    }
    const zetTel = tellerEnOpnieuw(pz.zetten, () => {
      if (klaarGezet) return;
      stappen = '';
      cancelAnimationFrame(anim);
      anim = null;
      tekenIjs(pz.start.x, pz.start.y);
      zetTel(0);
    });
    function stap(c) {
      if (klaarGezet || anim || !nu || nu.soort !== 'ijs') return;
      const van = OdPuzzels.ijsLoop(pz, stappen);
      const naar = OdPuzzels.ijsLoop(pz, stappen + c);
      if (naar.x === van.x && naar.y === van.y) return;
      stappen += c;
      zetTel(stappen.length);
      sfx.tick();
      // glijden: even zien hoe je over het ijs schuift
      const duur = 90 * (Math.abs(naar.x - van.x) + Math.abs(naar.y - van.y));
      const t0 = performance.now();
      const loop = nu2 => {
        const f = Math.min(1, (nu2 - t0) / duur);
        tekenIjs(van.x + (naar.x - van.x) * f, van.y + (naar.y - van.y) * f);
        if (f < 1) { anim = requestAnimationFrame(loop); return; }
        anim = null;
        if (naar.ok) {
          klaarGezet = true;
          sfx.good();
          setTimeout(() => stuur(stappen), 400);
        }
      };
      anim = requestAnimationFrame(loop);
    }
    pijlenBesturing(b, () => OdPuzzels.ijsLoop(pz, stappen), stap, 'ijs');
    tekenIjs(pz.start.x, pz.start.y);
    zetTel(0);
  }

  // Pijltjes, toetsen en tikken naast de speler (voor het doolhof en het ijs).
  function pijlenBesturing(b, waar, stap, soort) {
    const toets = e => {
      if (!nu || nu.soort !== soort) return window.removeEventListener('keydown', toets);
      const c = { ArrowUp: 'N', ArrowRight: 'O', ArrowDown: 'Z', ArrowLeft: 'W', KeyW: 'N', KeyD: 'O', KeyS: 'Z', KeyA: 'W' }[e.code];
      if (c) {
        e.preventDefault();
        stap(c);
      }
    };
    window.addEventListener('keydown', toets);
    b.c.addEventListener('click', e => {
      const [x, y] = b.vakOp(e);
      const st = waar();
      const dx = x - st.x;
      const dy = y - st.y;
      if (Math.abs(dx) >= Math.abs(dy) && dx) stap(dx > 0 ? 'O' : 'W');
      else if (dy) stap(dy > 0 ? 'Z' : 'N');
    });
    const pijlen = el('div', 'od-pijlen');
    for (const [c, t] of [['N', '▲'], ['W', '◀'], ['Z', '▼'], ['O', '▶']]) pijlen.appendChild(knop(t, `od-pijl od-pijl-${c}`, () => stap(c)));
    body().appendChild(pijlen);
  }

  // ---------- IJsrijk: de klokkentoren ----------

  function tekenKlok(g, s, uur, min) {
    const c = s / 2;
    const R = s * 0.46;
    g.clearRect(0, 0, s, s);
    g.fillStyle = '#2b3a63';
    g.beginPath();
    g.arc(c, c, R + s * 0.03, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f4f8ff';
    g.beginPath();
    g.arc(c, c, R, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1b2a48';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `bold ${Math.round(s * 0.09)}px sans-serif`;
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      g.fillText(String(i), c + Math.cos(a) * R * 0.8, c + Math.sin(a) * R * 0.8);
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const l = i % 5 ? 0.04 : 0.08;
      g.strokeStyle = i % 5 ? '#9aa6bf' : '#1b2a48';
      g.lineWidth = i % 5 ? 1 : 2;
      g.beginPath();
      g.moveTo(c + Math.sin(a) * R * (0.97 - l), c - Math.cos(a) * R * (0.97 - l));
      g.lineTo(c + Math.sin(a) * R * 0.97, c - Math.cos(a) * R * 0.97);
      g.stroke();
    }
    const wijzer = (a, l, w, kleur) => {
      g.strokeStyle = kleur;
      g.lineWidth = w;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(c, c);
      g.lineTo(c + Math.sin(a) * R * l, c - Math.cos(a) * R * l);
      g.stroke();
    };
    wijzer(((uur % 12) + min / 60) / 12 * Math.PI * 2, 0.5, s * 0.035, '#1b2a48');
    wijzer((min / 60) * Math.PI * 2, 0.78, s * 0.022, '#e0485e');
    g.fillStyle = '#1b2a48';
    g.beginPath();
    g.arc(c, c, s * 0.03, 0, Math.PI * 2);
    g.fill();
  }

  function klok(r) {
    const pz = r.pz;
    const antwoorden = [];
    const kop = el('p', 'od-opdracht', '');
    body().appendChild(kop);
    const c = el('canvas', 'od-klok-bord');
    const s = Math.min(220, Math.floor(window.innerHeight * 0.32));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = s * dpr;
    c.height = s * dpr;
    c.style.width = `${s}px`;
    c.style.height = `${s}px`;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    body().appendChild(c);
    const vraag = el('p', 'od-vraag-groot', '');
    body().appendChild(vraag);
    const opties = el('div', 'od-opties od-klok-opties');
    body().appendChild(opties);
    function toonKlok() {
      const i = antwoorden.length;
      const k = pz.klokken[i];
      kop.textContent = `Klok ${i + 1} van ${pz.klokken.length}. Kijk goed naar de korte en de lange wijzer.`;
      tekenKlok(g, s, k.uur, k.min);
      vraag.textContent = k.vraag;
      opties.innerHTML = '';
      k.opties.forEach((o, j) => opties.appendChild(knop(o, 'od-optie', () => {
        sfx.tick();
        antwoorden.push(j);
        if (antwoorden.length < pz.klokken.length) return toonKlok();
        stuur(antwoorden.slice(), res => {
          if (res.klaar) return klaar(res);
          sfx.bad();
          antwoorden.length = 0;
          melding('Niet alle klokken waren juist. Begin opnieuw en kijk nog eens goed!', 'fout');
          toonKlok();
        });
      })));
    }
    toonKlok();
  }

  // ---------- IJsrijk: het ijsbeeld (symmetrie) ----------

  function spiegel(r) {
    const pz = r.pz;
    const { W, H, v: doel } = OdPuzzels.spiegelVeld(pz);
    const gegeven = i => (i % W) < pz.half && Math.floor(i / W) < pz.h;
    const veld = doel.map((x, i) => (gegeven(i) ? x : 0));
    let klaarGezet = false;
    body().appendChild(el('p', 'od-opdracht', pz.dubbel
      ? 'Het beeld is gespiegeld naar rechts én naar onder. Tik de vakjes aan zodat alle vier de stukken kloppen.'
      : 'Maak het ijsbeeld af: tik de vakjes aan zodat de rechterkant het spiegelbeeld is van de linkerkant.'));
    const b = bord(W, H);
    const { g, vak } = b;
    function tekenSpiegel() {
      g.fillStyle = '#0d1630';
      g.fillRect(0, 0, b.w, b.h);
      for (let i = 0; i < W * H; i++) {
        const x = i % W;
        const y = Math.floor(i / W);
        const vast = gegeven(i);
        rrect(g, x * vak + 2, y * vak + 2, vak - 4, vak - 4, 5, veld[i] ? (vast ? '#4cc9ff' : '#9ff3ff') : vast ? '#16233f' : '#1d2e52');
        if (veld[i]) rrect(g, x * vak + 5, y * vak + 5, vak * 0.4, vak * 0.15, 3, 'rgba(255,255,255,.5)');
      }
      // de spiegel(s)
      g.strokeStyle = '#ffe08a';
      g.lineWidth = 3;
      g.setLineDash([8, 6]);
      g.beginPath();
      g.moveTo(pz.half * vak, 0);
      g.lineTo(pz.half * vak, b.h);
      if (pz.dubbel) {
        g.moveTo(0, pz.h * vak);
        g.lineTo(b.w, pz.h * vak);
      }
      g.stroke();
      g.setLineDash([]);
    }
    b.c.addEventListener('click', e => {
      if (klaarGezet) return;
      const [x, y] = b.vakOp(e);
      if (x < 0 || y < 0 || x >= W || y >= H || gegeven(y * W + x)) return;
      veld[y * W + x] = veld[y * W + x] ? 0 : 1;
      sfx.tick();
      tekenSpiegel();
      if (OdPuzzels.check('spiegel', pz, veld)) {
        klaarGezet = true;
        sfx.good();
        setTimeout(() => stuur(veld.slice()), 600);
      }
    });
    tekenSpiegel();
  }

  // ---------- Vuurberg: de lavapoort (codeslot) ----------

  function codeslot(r) {
    const pz = r.pz;
    body().appendChild(el('p', 'od-opdracht', `De poort heeft een code van ${pz.len} cijfers (${pz.van} tot ${pz.tot})${pz.uniek ? ', elk cijfer maar één keer' : ''}. Elke poging op de muur geeft een aanwijzing.`));
    const lijst = el('div', 'od-hints');
    for (const h of pz.hints) {
      const rij = el('div', 'od-hintrij');
      const gok = el('span', 'od-gok');
      for (const c of h.gok) gok.appendChild(el('b', '', c));
      rij.appendChild(gok);
      const delen = [];
      if (h.plek) delen.push(`🟢 ${h.plek} juist op de juiste plaats`);
      if (h.ander) delen.push(`🟡 ${h.ander} juist maar op een andere plaats`);
      rij.appendChild(el('span', 'od-hintuitleg', delen.length ? delen.join(' · ') : '⚫ geen enkel cijfer zit in de code'));
      lijst.appendChild(rij);
    }
    body().appendChild(lijst);
    const f = el('form', 'od-typ od-getal');
    const inp = el('input', 'od-code-in');
    inp.inputMode = 'numeric';
    inp.autocomplete = 'off';
    inp.maxLength = pz.len;
    inp.placeholder = '?'.repeat(pz.len);
    f.appendChild(inp);
    const knopC = el('button', 'gold', 'Open de poort');
    knopC.type = 'submit';
    f.appendChild(knopC);
    f.addEventListener('submit', e => {
      e.preventDefault();
      const code = inp.value.replace(/\D/g, '');
      if (code.length !== pz.len) return melding(`De code heeft ${pz.len} cijfers.`, 'fout');
      stuur(code, res => {
        if (res.klaar) return klaar(res);
        sfx.bad();
        melding('De poort blijft dicht. Klopt jouw code met elke aanwijzing?', 'fout');
        inp.select();
      });
    });
    body().appendChild(f);
    setTimeout(() => inp.focus(), 50);
  }

  // ---------- Vuurberg: het vuurkristal (lampen) ----------

  function lampen(r) {
    const pz = r.pz;
    const n = pz.size;
    let aan = pz.aan.map(Boolean);
    const tikken = [];
    let klaarGezet = false;
    body().appendChild(el('p', 'od-opdracht', 'Tik op een kristal: hij en zijn buren boven, onder, links en rechts wisselen. Laat alle kristallen gloeien!'));
    const b = bord(n, n);
    const { g, vak } = b;
    function tekenLampen() {
      g.fillStyle = '#1a0e0c';
      g.fillRect(0, 0, b.w, b.h);
      for (let i = 0; i < n * n; i++) {
        const x = i % n;
        const y = Math.floor(i / n);
        rrect(g, x * vak + 2, y * vak + 2, vak - 4, vak - 4, 8, '#2c1a16');
        kristal(g, (x + 0.5) * vak, (y + 0.5) * vak, vak * 0.32, aan[i] ? '#ff9a3a' : '#4a3430', aan[i] ? 0.45 : 0);
      }
    }
    const zetTel = tellerEnOpnieuw(0, () => {
      if (klaarGezet) return;
      aan = pz.aan.map(Boolean);
      tikken.length = 0;
      tekenLampen();
      zetTel(0);
    });
    b.c.addEventListener('click', e => {
      if (klaarGezet) return;
      const [x, y] = b.vakOp(e);
      if (x < 0 || y < 0 || x >= n || y >= n) return;
      aan = OdPuzzels.lampenTik(aan, n, y * n + x);
      tikken.push(y * n + x);
      sfx.tick();
      zetTel(tikken.length);
      tekenLampen();
      if (aan.every(Boolean)) {
        klaarGezet = true;
        sfx.good();
        setTimeout(() => stuur(tikken.slice()), 600);
      }
    });
    tekenLampen();
    zetTel(0);
  }

  // ---------- Vuurberg: de vuurtoren (torens van Hanoi) ----------

  function hanoi(r) {
    const pz = r.pz;
    const zetten = [];
    let hand = null; // de paal waarvan je een schijf opnam
    let klaarGezet = false;
    body().appendChild(el('p', 'od-opdracht', 'Breng de hele toren naar de laatste paal. Tik op een paal om de bovenste schijf te nemen en op een andere paal om ze neer te leggen. Nooit een grote schijf op een kleinere!'));
    const rijen = Math.ceil(pz.schijven * 0.6 + 2.2);
    const b = bord(9, rijen);
    const { g, vak } = b;
    const KL = [['#ff5a5a', '#ff9a3a', '#ffc94a', '#ffe08a', '#ff7aa8', '#c77dff', '#4cc9ff'], ['#4cc9ff', '#2ee6a6', '#ffc94a', '#ff9a3a', '#ff5a5a', '#c77dff', '#ff7aa8'], ['#c77dff', '#ff7aa8', '#ff5a5a', '#ff9a3a', '#ffc94a', '#2ee6a6', '#4cc9ff']][pz.kleur || 0];
    function tekenHanoi() {
      const st = OdPuzzels.hanoiLoop(pz, zetten);
      g.fillStyle = '#140c14';
      g.fillRect(0, 0, b.w, b.h);
      const dikte = vak * 0.55;
      const vloer = b.h - vak * 0.4;
      rrect(g, vak * 0.2, vloer, b.w - vak * 0.4, vak * 0.25, 4, '#4a3434');
      st.palen.forEach((paal, p) => {
        const cx = (p * 3 + 1.5) * vak;
        rrect(g, cx - vak * 0.08, vloer - (pz.schijven + 0.6) * dikte, vak * 0.16, (pz.schijven + 0.6) * dikte, 4, p === 2 ? '#ffc94a' : '#7a6a6a');
        paal.forEach((sch, i) => {
          const omhoog = hand === p && i === paal.length - 1;
          const w = vak * (0.9 + 1.8 * sch / pz.schijven);
          const y = omhoog ? vak * 0.15 : vloer - (i + 1) * dikte;
          rrect(g, cx - w / 2, y + 1, w, dikte - 2, dikte * 0.4, KL[(sch - 1) % KL.length]);
          rrect(g, cx - w / 2 + 4, y + 3, w * 0.4, dikte * 0.22, 3, 'rgba(255,255,255,.35)');
        });
      });
      return st;
    }
    const zetTel = tellerEnOpnieuw(pz.min, () => {
      if (klaarGezet) return;
      zetten.length = 0;
      hand = null;
      tekenHanoi();
      zetTel(0);
    });
    function kies(p) {
      if (klaarGezet || !nu || nu.soort !== 'hanoi') return;
      const st = OdPuzzels.hanoiLoop(pz, zetten);
      if (hand === null) {
        if (!st.palen[p].length) return;
        hand = p;
        sfx.tick();
      } else if (hand === p) {
        hand = null;
      } else {
        const na = OdPuzzels.hanoiLoop(pz, [...zetten, [hand, p]]);
        if (na.fout) {
          sfx.bad();
          melding('Een grote schijf mag niet op een kleinere.', 'fout');
          hand = null;
        } else {
          zetten.push([hand, p]);
          hand = null;
          melding('');
          sfx.tick();
          zetTel(zetten.length);
          if (na.ok) {
            klaarGezet = true;
            sfx.good();
            setTimeout(() => stuur(zetten.slice()), 600);
          }
        }
      }
      tekenHanoi();
    }
    b.c.addEventListener('click', e => {
      const [x] = b.vakOp(e);
      if (x >= 0 && x < 9) kies(Math.floor(x / 3));
    });
    const toets = e => {
      if (!nu || nu.soort !== 'hanoi') return window.removeEventListener('keydown', toets);
      const p = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
      if (p !== undefined) kies(p);
    };
    window.addEventListener('keydown', toets);
    tekenHanoi();
    zetTel(0);
  }

  // ---------- Koraalrif: de parelschelp (breuken) ----------

  function breukTekst(t, n) {
    const s = el('span', 'od-breukje');
    s.appendChild(el('b', '', String(t)));
    s.appendChild(el('b', '', String(n)));
    return s;
  }

  function breuk(r) {
    const pz = r.pz;
    const aan = new Set();
    const opdracht = el('p', 'od-vraag-groot', 'Kleur ');
    opdracht.appendChild(breukTekst(pz.teller, pz.noemer));
    opdracht.appendChild(document.createTextNode(pz.taarten > 1 ? ' van een taart. Je hebt er twee.' : ' van de taart.'));
    body().appendChild(opdracht);
    body().appendChild(el('p', 'od-opdracht', 'Tik op de stukjes om ze te kleuren. Nog eens tikken maakt ze weer leeg.'));
    const b = bord(pz.taarten * 4 + (pz.taarten - 1), 4);
    const { g, vak } = b;
    const R = vak * 1.8;
    const midden = i => [vak * (2 + i * 5), vak * 2];
    function stukOp(px, py) {
      for (let i = 0; i < pz.taarten; i++) {
        const [cx, cy] = midden(i);
        const dx = px - cx;
        const dy = py - cy;
        if (pz.vorm === 'rond') {
          if (Math.hypot(dx, dy) > R) continue;
          const a = (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
          return i * pz.delen + Math.floor((a / (Math.PI * 2)) * pz.delen);
        }
        if (Math.abs(dx) > R || Math.abs(dy) > R) continue;
        return i * pz.delen + Math.min(pz.delen - 1, Math.floor(((dx + R) / (2 * R)) * pz.delen));
      }
      return -1;
    }
    function tekenBreuk() {
      g.fillStyle = '#0d1630';
      g.fillRect(0, 0, b.w, b.h);
      for (let i = 0; i < pz.taarten; i++) {
        const [cx, cy] = midden(i);
        for (let d = 0; d < pz.delen; d++) {
          const k = i * pz.delen + d;
          g.fillStyle = aan.has(k) ? '#ff8fb8' : '#1f3058';
          g.strokeStyle = '#f8f4ff';
          g.lineWidth = 2;
          g.beginPath();
          if (pz.vorm === 'rond') {
            const a0 = -Math.PI / 2 + (d / pz.delen) * Math.PI * 2;
            g.moveTo(cx, cy);
            g.arc(cx, cy, R, a0, a0 + (Math.PI * 2) / pz.delen);
            g.closePath();
          } else {
            const w = (2 * R) / pz.delen;
            g.rect(cx - R + d * w, cy - R, w, 2 * R);
          }
          g.fill();
          g.stroke();
        }
      }
    }
    b.c.addEventListener('click', e => {
      const rc = b.c.getBoundingClientRect();
      const k = stukOp(e.clientX - rc.left, e.clientY - rc.top);
      if (k < 0) return;
      if (aan.has(k)) aan.delete(k);
      else aan.add(k);
      sfx.tick();
      tekenBreuk();
    });
    tekenBreuk();
    body().appendChild(knop('Klaar!', 'gold', () => {
      if (!aan.size) return melding('Kleur eerst een paar stukjes.', 'fout');
      stuur([...aan], res => {
        if (res.klaar) return klaar(res);
        sfx.bad();
        melding('Nog niet. Hoeveel stukjes is één deel van de noemer?', 'fout');
      });
    }));
  }

  // ---------- Koraalrif: het wrak (geld) ----------

  const euro = c => `€${(c / 100).toFixed(2).replace('.', ',')}`;
  const geldNaam = c => (c >= 100 ? `€${c / 100}` : `${c}c`);

  function munten(r) {
    const pz = r.pz;
    const hand = [];
    if (pz.soort === 'terug') {
      body().appendChild(el('p', 'od-vraag-groot', `Een schat kost ${euro(pz.prijs)}. De piraat betaalt met ${euro(pz.betaal)}.`));
      body().appendChild(el('p', 'od-opdracht', `Geef het wisselgeld terug met zo weinig mogelijk munten en briefjes (hooguit ${pz.max}).`));
    } else {
      body().appendChild(el('p', 'od-vraag-groot', `Betaal precies ${euro(pz.bedrag)}.`));
      body().appendChild(el('p', 'od-opdracht', pz.max ? `Gebruik hooguit ${pz.max} munten en briefjes.` : 'Tik op de munten om ze in je hand te nemen.'));
    }
    const kas = el('div', 'od-kas');
    for (const c of pz.geld) kas.appendChild(knop(geldNaam(c), `od-munt${c >= 500 ? ' briefje' : c >= 100 ? ' euro' : c >= 10 ? ' goud' : ''}`, () => {
      if (hand.length >= 40) return;
      hand.push(c);
      hand.sort((a, b2) => b2 - a);
      sfx.tick();
      tekenHand();
    }));
    body().appendChild(kas);
    const handEl = el('div', 'od-hand');
    const som = el('p', 'od-teller-tekst', '');
    body().appendChild(handEl);
    body().appendChild(som);
    function tekenHand() {
      handEl.innerHTML = '';
      hand.forEach((c, i) => handEl.appendChild(knop(geldNaam(c), `od-munt klein${c >= 500 ? ' briefje' : c >= 100 ? ' euro' : c >= 10 ? ' goud' : ''}`, () => {
        hand.splice(i, 1);
        tekenHand();
      })));
      if (!hand.length) handEl.appendChild(el('span', 'muted', 'Je hand is leeg.'));
      som.textContent = hand.length ? `In je hand: ${euro(hand.reduce((a, c) => a + c, 0))} · ${hand.length} ${hand.length === 1 ? 'stuk' : 'stukken'} (tik om terug te leggen)` : '';
    }
    tekenHand();
    body().appendChild(knop(pz.soort === 'terug' ? 'Geef terug' : 'Betalen', 'gold', () => {
      if (!hand.length) return melding('Neem eerst munten in je hand.', 'fout');
      stuur(hand.slice(), res => {
        if (res.klaar) return klaar(res);
        sfx.bad();
        const t = hand.reduce((a, c) => a + c, 0);
        melding(t !== pz.bedrag ? 'Dat is niet het juiste bedrag. Reken nog eens!' : 'Het bedrag klopt, maar het kan met minder munten.', 'fout');
      });
    }));
  }

  // ---------- Koraalrif: de schatkaart (coördinaten) ----------

  function coord(r) {
    const pz = r.pz;
    const antw = [];
    const n = pz.size;
    const vraag = el('p', 'od-vraag-groot', '');
    body().appendChild(vraag);
    const b = bord(n + 1, n + 1);
    const { g, vak } = b;
    const L = 'ABCDEFGH';
    function tekenKaart() {
      g.fillStyle = '#e8d6a8';
      g.fillRect(0, 0, b.w, b.h);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `bold ${Math.round(vak * 0.42)}px sans-serif`;
      g.fillStyle = '#5a3a1c';
      if (pz.assen) {
        // een assenstelsel: de punten liggen op de kruisingen van de lijnen
        for (let i = 0; i < n; i++) {
          g.strokeStyle = i === pz.R ? '#5a3a1c' : 'rgba(90,58,28,.3)';
          g.lineWidth = i === pz.R ? 3 : 1;
          g.beginPath();
          g.moveTo((i + 1) * vak, vak * 0.5);
          g.lineTo((i + 1) * vak, (n + 0.5) * vak);
          g.moveTo(vak * 0.5, (i + 0.5) * vak);
          g.lineTo((n + 0.5) * vak, (i + 0.5) * vak);
          g.stroke();
          if (i !== pz.R) {
            g.fillText(String(i - pz.R), (i + 1) * vak, (pz.R + 0.5) * vak + vak * 0.32);
            g.fillText(String(pz.R - i), (pz.R + 1) * vak - vak * 0.3, (i + 0.5) * vak);
          }
        }
      } else {
        for (let i = 0; i < n; i++) {
          g.fillText(L[i], (i + 1.5) * vak, (n + 0.5) * vak);
          g.fillText(String(n - i), vak * 0.5, (i + 0.5) * vak);
        }
        g.strokeStyle = 'rgba(90,58,28,.45)';
        g.lineWidth = 1.5;
        for (let i = 0; i <= n; i++) {
          g.beginPath();
          g.moveTo((i + 1) * vak, 0);
          g.lineTo((i + 1) * vak, n * vak);
          g.moveTo(vak, i * vak);
          g.lineTo((n + 1) * vak, i * vak);
          g.stroke();
        }
      }
      antw.forEach(([x, y], i) => {
        const [px, py] = pz.assen ? [(x + 1) * vak, (y + 0.5) * vak] : [(x + 1.5) * vak, (n - 1 - y + 0.5) * vak];
        g.fillStyle = '#c0392b';
        g.font = `bold ${Math.round(vak * 0.6)}px sans-serif`;
        g.fillText('✕', px, py);
        g.font = `bold ${Math.round(vak * 0.3)}px sans-serif`;
        g.fillText(String(i + 1), px + vak * 0.32, py - vak * 0.3);
      });
      vraag.textContent = antw.length < pz.vragen.length ? `${antw.length + 1}/${pz.vragen.length} · ${pz.vragen[antw.length].tekst}` : '';
    }
    b.c.addEventListener('click', e => {
      if (antw.length >= pz.vragen.length) return;
      const rc = b.c.getBoundingClientRect();
      const px = e.clientX - rc.left;
      const py = e.clientY - rc.top;
      let x;
      let y;
      if (pz.assen) {
        x = Math.round(px / vak - 1);
        y = Math.round(py / vak - 0.5);
      } else {
        x = Math.floor(px / vak) - 1;
        y = n - 1 - Math.floor(py / vak);
      }
      if (x < 0 || y < 0 || x >= n || y >= n) return;
      antw.push([x, y]);
      sfx.tick();
      tekenKaart();
      if (antw.length === pz.vragen.length) {
        stuur(antw.slice(), res => {
          if (res.klaar) return klaar(res);
          sfx.bad();
          antw.length = 0;
          melding('Niet elk kruisje stond goed. Probeer opnieuw!', 'fout');
          tekenKaart();
        });
      }
    });
    tekenKaart();
    body().appendChild(knop('↶ Laatste kruisje weg', 'secondary klein', () => { antw.pop(); tekenKaart(); }));
  }

  // ---------- Wolkenstad: de wolkentoren (blokjes tellen) ----------

  function kubus(r) {
    const pz = r.pz;
    body().appendChild(el('p', 'od-opdracht', 'Er zweven geen blokjes: onder elk blokje staat er nog een, tot op de grond.'));
    const c = el('canvas', 'od-klok-bord');
    const s = Math.min(320, Math.floor(window.innerHeight * 0.38));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = s * dpr;
    c.height = s * dpr;
    c.style.width = `${s}px`;
    c.style.height = `${s}px`;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    body().appendChild(c);
    const maxH = Math.max(...pz.h.flat(), 1);
    const u = s / (Math.max(pz.w + pz.d, maxH * 1.6) * 1.0 + 1.2);
    const ox = s / 2 + (pz.d - pz.w) * u * 0.43;
    const oy = s - (pz.w + pz.d) * u * 0.5 - u * 0.4;
    const P = (x, y, z) => [ox + (x - y) * u * 0.866, oy + (x + y) * u * 0.5 - z * u];
    const vlak = (pts, kleur) => {
      g.beginPath();
      g.moveTo(...pts[0]);
      for (const p of pts.slice(1)) g.lineTo(...p);
      g.closePath();
      g.fillStyle = kleur;
      g.fill();
      g.strokeStyle = '#2a1f55';
      g.lineWidth = 1.2;
      g.stroke();
    };
    const lijst = [];
    for (let y = 0; y < pz.d; y++) for (let x = 0; x < pz.w; x++) for (let z = 0; z < pz.h[y][x]; z++) lijst.push([x, y, z]);
    lijst.sort((a, b2) => a[0] + a[1] - (b2[0] + b2[1]) || a[2] - b2[2]);
    for (const [x, y, z] of lijst) {
      vlak([P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], '#e9dcff');
      vlak([P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], '#b48cff');
      vlak([P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)], '#8a5ce0');
    }
    body().appendChild(el('p', 'od-vraag-groot', pz.vraag === 'kubus'
      ? `Hoeveel blokjes moet je erbij leggen voor een grote kubus van ${pz.kubus} op ${pz.kubus} op ${pz.kubus}?`
      : 'Hoeveel blokjes tel je?'));
    body().appendChild(getalVeld(getalStuur));
  }

  // ---------- Wolkenstad: het windorgel (magisch vierkant) ----------

  function magisch(r) {
    const pz = r.pz;
    body().appendChild(el('p', 'od-vraag-groot', `Elke rij, kolom en schuine lijn is samen ${pz.som}.`));
    body().appendChild(el('p', 'od-opdracht', 'Zoek eerst een lijn waar maar één getal ontbreekt.'));
    const f = el('form', 'od-magisch-veld');
    const velden = pz.gegeven.map(v => {
      if (v !== null) {
        f.appendChild(el('span', 'od-mst', String(v)));
        return null;
      }
      const inp = el('input', 'od-mst leeg');
      inp.type = 'number';
      inp.inputMode = 'numeric';
      f.appendChild(inp);
      return inp;
    });
    body().appendChild(f);
    const knopC = knop('Controleer', 'gold', () => f.requestSubmit());
    body().appendChild(knopC);
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (velden.some(i => i && i.value.trim() === '')) return melding('Vul eerst alle lege vakjes in.', 'fout');
      const poging = pz.gegeven.map((v, i) => (v !== null ? v : Number(velden[i].value)));
      stuur(poging, res => {
        if (res.klaar) return klaar(res);
        sfx.bad();
        melding('Nog niet. Tel elke rij, kolom en schuine lijn eens na!', 'fout');
      });
    });
    setTimeout(() => { const v = velden.find(Boolean); if (v) v.focus(); }, 50);
  }

  // ---------- Wolkenstad: de luchthaven (kortste route) ----------

  function route(r) {
    const pz = r.pz;
    const pad = [pz.start];
    body().appendChild(el('p', 'od-opdracht', 'Vlieg van de groene wolk naar de gouden vlag. Tik de wolken na elkaar aan. De getallen zijn de lengtes. Zoek de kortste weg!'));
    const xs = pz.punten.map(p => p[0]);
    const ys = pz.punten.map(p => p[1]);
    const kol = Math.max(...xs) - Math.min(...xs) + 1.2;
    const rij = Math.max(...ys) - Math.min(...ys) + 1.2;
    const b = bord(Math.round(kol * 2), Math.round(rij * 2));
    const { g } = b;
    const sx = b.w / kol;
    const sy = b.h / rij;
    const pos = i => [(pz.punten[i][0] - Math.min(...xs) + 0.6) * sx, (pz.punten[i][1] - Math.min(...ys) + 0.6) * sy];
    const R = Math.min(sx, sy) * 0.2;
    const lengte = () => OdPuzzels.routeLengte(pz, pad);
    const teller = el('p', 'od-teller-tekst', '');
    function tekenRoute() {
      g.fillStyle = '#7fb8ff';
      g.fillRect(0, 0, b.w, b.h);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (const [a, c, l] of pz.bruggen) {
        const [x1, y1] = pos(a);
        const [x2, y2] = pos(c);
        const opPad = pad.some((p, i) => i && ((pad[i - 1] === a && p === c) || (pad[i - 1] === c && p === a)));
        g.strokeStyle = opPad ? '#ffc94a' : 'rgba(255,255,255,.85)';
        g.lineWidth = opPad ? 6 : 3;
        g.setLineDash(opPad ? [] : [6, 5]);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
        g.setLineDash([]);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        g.fillStyle = '#1b2a48';
        g.beginPath();
        g.arc(mx, my, R * 0.62, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffffff';
        g.font = `bold ${Math.round(R * 0.7)}px sans-serif`;
        g.fillText(String(l), mx, my + 1);
      }
      pz.punten.forEach((_, i) => {
        const [x, y] = pos(i);
        const kleur = i === pz.start ? '#2ee6a6' : i === pz.doel ? '#ffc94a' : pad.includes(i) ? '#ffe9a8' : '#ffffff';
        for (const [dx, dy, rr] of [[-0.5, 0.15, 0.6], [0.5, 0.15, 0.6], [0, -0.15, 0.8]]) {
          g.fillStyle = kleur;
          g.beginPath();
          g.arc(x + dx * R, y + dy * R, R * rr, 0, Math.PI * 2);
          g.fill();
        }
        if (i === pz.doel) {
          g.fillStyle = '#c0392b';
          g.fillRect(x + R * 0.1, y - R * 1.4, R * 0.5, R * 0.35);
          g.fillStyle = '#5a3a1c';
          g.fillRect(x, y - R * 1.4, R * 0.1, R * 1.1);
        }
      });
      const [hx, hy] = pos(pad[pad.length - 1]);
      g.font = `${Math.round(R * 1.1)}px sans-serif`;
      g.fillText('🎈', hx, hy - R * 0.2);
      teller.textContent = pad.length > 1 ? `Je route is ${lengte()} lang.` : '';
    }
    b.c.addEventListener('click', e => {
      const rc = b.c.getBoundingClientRect();
      const px = e.clientX - rc.left;
      const py = e.clientY - rc.top;
      const i = pz.punten.findIndex((_, k) => Math.hypot(pos(k)[0] - px, pos(k)[1] - py) < R * 1.3);
      if (i < 0) return;
      const laatste = pad[pad.length - 1];
      if (i === laatste && pad.length > 1) pad.pop();
      else if (pad.length > 1 && i === pad[pad.length - 2]) pad.pop();
      else if (OdPuzzels.routeLengte(pz, [laatste, i]) !== Infinity) pad.push(i);
      else return melding('Daar is geen brug naartoe.', 'fout');
      melding('');
      sfx.tick();
      tekenRoute();
      if (i === pz.doel && pad[pad.length - 1] === pz.doel) {
        stuur(pad.slice(), res => {
          if (res.klaar) return klaar(res);
          sfx.bad();
          melding(`Je bent er, met een route van ${lengte()}. Maar het kan korter!`, 'fout');
        });
      }
    });
    body().appendChild(teller);
    body().appendChild(knop('↺ Opnieuw beginnen', 'secondary klein', () => { pad.length = 1; melding(''); tekenRoute(); }));
    tekenRoute();
  }

  // ---------- Onderzeelab: zinken of drijven ----------

  function drijven(r) {
    const pz = r.pz;
    const keuze = pz.dingen.map(() => null);
    body().appendChild(el('p', 'od-opdracht', 'Je gooit alles in een bak water. Wat drijft er, en wat zinkt?'));
    const lijst = el('div', 'od-drijf');
    pz.dingen.forEach((d, i) => {
      const rij = el('div', 'od-drijf-rij');
      rij.appendChild(el('span', 'od-drijf-naam', d));
      const ja = knop('🫧 drijft', 'od-optie klein', () => { keuze[i] = 1; ja.classList.add('on'); nee.classList.remove('on'); });
      const nee = knop('⚓ zinkt', 'od-optie klein', () => { keuze[i] = 0; nee.classList.add('on'); ja.classList.remove('on'); });
      rij.appendChild(ja);
      rij.appendChild(nee);
      lijst.appendChild(rij);
    });
    body().appendChild(lijst);
    body().appendChild(knop('Gooi in het water!', 'gold', () => {
      if (keuze.includes(null)) return melding('Kies eerst bij alles: drijft het of zinkt het?', 'fout');
      stuur(keuze.slice(), res => {
        if (res.klaar) return klaar(res);
        sfx.bad();
        melding('Niet alles klopt. Denk aan wat lichter is dan water!', 'fout');
      });
    }));
  }

  // ---------- Weerstation: de thermometer ----------

  function thermo(r) {
    const pz = r.pz;
    const n = pz.temps.length;
    const c = el('canvas', 'od-klok-bord');
    const H = Math.min(340, Math.floor(window.innerHeight * 0.42));
    const W = 130 * n;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = W * dpr;
    c.height = H * dpr;
    c.style.width = `${W}px`;
    c.style.height = `${H}px`;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    body().appendChild(c);
    const top = 34;
    const bodem = H - 40;
    const yVan = t => bodem - ((t - pz.min) / (pz.max - pz.min)) * (bodem - top);
    pz.temps.forEach((t, i) => {
      const x = 130 * i + 50;
      rrect(g, x - 9, top - 14, 18, bodem - top + 30, 9, '#e8eef8');
      g.fillStyle = '#ff4d6d';
      g.fillRect(x - 4, yVan(t), 8, bodem - yVan(t) + 10);
      g.beginPath();
      g.arc(x, bodem + 18, 14, 0, Math.PI * 2);
      g.fill();
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.font = '11px sans-serif';
      for (let v = pz.min; v <= pz.max; v += 1) {
        const y = yVan(v);
        const groot = v % 10 === 0;
        const mid = v % 5 === 0;
        if (pz.max - pz.min > 40 && !mid && v % 2) continue;
        g.fillStyle = '#c8d4ea';
        g.fillRect(x + 11, y - 0.5, groot ? 14 : mid ? 10 : 5, groot ? 2 : 1);
        if (groot || (mid && pz.max - pz.min <= 30)) g.fillText(String(v), x + 28, y);
      }
      if (n > 1) {
        g.textAlign = 'center';
        g.fillStyle = '#ffe08a';
        g.font = 'bold 13px sans-serif';
        g.fillText(i ? "'s middags" : "'s morgens", x + 10, 12);
      }
    });
    body().appendChild(el('p', 'od-vraag-groot', pz.vraag === 'verschil' ? 'Hoeveel graden verschil is er?' : 'Hoeveel graden is het?'));
    body().appendChild(getalVeld(getalStuur));
  }

  const TEKEN = { schuif, robot, licht, stroom, tandwiel, wip, woorden, code, weetje, weeg, reeks, pixel, sudoku, doolhof, toren, ijs, klok, spiegel, codeslot, lampen, hanoi, breuk, munten, coord, kubus, magisch, route, drijven, thermo };

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
