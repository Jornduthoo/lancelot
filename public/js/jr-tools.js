// LANcelot Junior · Klastools voor de kleuterklas, op het bord: wie is aan de beurt, de wachtklok, het stil-draakje,
// het hoekenbord, het dagritme, de dobbelsteen en groepjes. Alles met de dieren van de klas en geschilderde prenten.
// JrTools.maak(vak, { kinderen }) tekent de tools in vak (kinderen() geeft de kinderen die er vandaag zijn); JrTools.stop().
(function () {
  const J = () => window.JR || { zin: {} };
  const Z = () => J().zin || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const zeg = stukken => { try { return Junior.Stem.zeg(stukken); } catch { return Promise.resolve(); } };
  const fx = naam => { try { sfx[naam](); } catch {} };
  const lees = (k, s) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? s : v; } catch { return s; } };
  const bewaar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const vandaag = () => new Date().toISOString().slice(0, 10);
  const schud = l => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const IMG = '/img/junior/tools';
  const draak = n => `${IMG}/draak/${n}.webp`;

  // icoon = prent uit tools/icoon/, naam = schermtekst (vertaald via lang/*/junior.json).
  const TOOLS = [
    { id: 'beurt', icoon: 1, naam: 'Wie is aan de beurt?' },
    { id: 'klok', icoon: 2, naam: 'Wachtklok' },
    { id: 'stil', icoon: 3, naam: 'Stil-draakje' },
    { id: 'hoeken', icoon: 4, naam: 'Hoekenbord' },
    { id: 'dag', icoon: 5, naam: 'Dagritme' },
    { id: 'dobbel', icoon: 6, naam: 'Dobbelsteen' },
    { id: 'groepjes', icoon: 8, naam: 'Groepjes' },
    { id: 'opruim', icoon: 'opruim', naam: 'Opruimen' },
    { id: 'rust', icoon: 'rust', naam: 'Rustmoment' },
  ];
  let vak = null, opt = null, huidig = null, opruim = [];
  const kids = () => (opt && opt.kinderen ? opt.kinderen() : []);
  const later = (fn, ms) => { const t = setTimeout(fn, ms); opruim.push(() => clearTimeout(t)); return t; };
  function stopTool() { for (const f of opruim.splice(0)) { try { f(); } catch {} } }

  function menu() {
    vak.innerHTML = `<div class="jr-kt">
      <div class="jr-kt-rij">${TOOLS.map(t => `<button type="button" class="jr-kt-tool jr-eigen" data-tool="${t.id}"><img src="${IMG}/icoon/${t.icoon}.webp" alt=""><b>${esc(t.naam)}</b></button>`).join('')}</div>
      <div class="jr-kt-podium" id="jr-kt-podium"></div>
    </div>`;
    vak.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => open(b.dataset.tool)));
    open(lees('jr-kt-tool', 'beurt'));
  }
  function open(id) {
    if (!TOOLS.some(t => t.id === id)) id = 'beurt';
    stopTool();
    huidig = id;
    bewaar('jr-kt-tool', id);
    vak.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('aan', b.dataset.tool === id));
    const p = vak.querySelector('#jr-kt-podium');
    p.className = `jr-kt-podium jr-kt-${id}`;
    ({ beurt, klok, stil, hoeken, dag, dobbel, groepjes, rust, opruim: opruimen })[id](p);
  }
  const dierHtml = (k, cls = '') => `<span class="jr-kt-dier ${cls}" data-kind="${esc(k.id)}"><img src="${esc(k.beeld)}" alt=""><b>${esc(k.naam)}</b></span>`;

  // ---------- Wie is aan de beurt? Het draakje springt over de dieren en stopt bij één kind. ----------
  function beurt(p) {
    let geweest = new Set(lees('jr-kt-geweest', { dag: '' }).dag === vandaag() ? lees('jr-kt-geweest', {}).ids || [] : []);
    const teken = () => {
      const lijst = kids();
      p.innerHTML = `<div class="jr-kt-dieren">${lijst.map(k => dierHtml(k, geweest.has(k.id) ? 'geweest' : '')).join('')}</div>
        <div class="jr-kt-knoppen"><img class="jr-kt-draakje" src="${draak(5)}" alt=""><button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-kies">✨ Kies!</button><button type="button" class="jr-kt-klein jr-eigen" id="jr-kt-opnieuw">↺ Iedereen opnieuw</button></div>`;
      p.querySelector('#jr-kt-kies').addEventListener('click', kies);
      p.querySelector('#jr-kt-opnieuw').addEventListener('click', () => { geweest = new Set(); bewaar('jr-kt-geweest', { dag: vandaag(), ids: [] }); teken(); });
    };
    function kies() {
      const lijst = kids();
      let kan = lijst.filter(k => !geweest.has(k.id));
      if (!kan.length) { geweest = new Set(); kan = lijst; }
      if (!kan.length) return;
      const doel = kan[Math.floor(Math.random() * kan.length)];
      const kaarten = [...p.querySelectorAll('.jr-kt-dier')].filter(el => kan.some(k => k.id === el.dataset.kind));
      p.querySelector('#jr-kt-kies').disabled = true;
      let stap = 0;
      const sprongen = 14 + Math.floor(Math.random() * 6);
      const spring = () => {
        p.querySelectorAll('.jr-kt-dier.licht').forEach(el => el.classList.remove('licht'));
        const laatste = stap >= sprongen;
        const el = laatste ? p.querySelector(`.jr-kt-dier[data-kind="${CSS.escape(doel.id)}"]`) : kaarten[stap % kaarten.length];
        if (el) el.classList.add('licht');
        fx('tick');
        if (laatste) {
          el.classList.add('gekozen');
          fx('fanfare');
          try { confetti(1500); } catch {}
          geweest.add(doel.id);
          bewaar('jr-kt-geweest', { dag: vandaag(), ids: [...geweest] });
          zeg([doel.naam, Z().ktBeurt]);
          later(() => { const b = p.querySelector('#jr-kt-kies'); if (b) b.disabled = false; el.classList.add('geweest'); el.classList.remove('licht', 'gekozen'); }, 3500);
          return;
        }
        stap++;
        later(spring, 70 + stap * stap * 1.4);
      };
      spring();
    }
    teken();
  }

  // ---------- Wachtklok: een gekleurde schijf die langzaam kleiner wordt. ----------
  function klok(p) {
    const MIN = [1, 2, 3, 5, 10, 15];
    let totaal = lees('jr-kt-klok', 3) * 60, rest = totaal, loopt = false, t0 = 0, raf = 0;
    p.innerHTML = `<div class="jr-kt-klokvak"><div class="jr-kt-schijf" id="jr-kt-schijf"><img src="${IMG}/icoon/2.webp" alt=""></div>
      <div class="jr-kt-klokzij"><div class="jr-kt-tijd" id="jr-kt-tijd" data-geen-vertaling></div>
      <div class="jr-kt-minuten">${MIN.map(m => `<button type="button" class="jr-kt-klein jr-eigen" data-min="${m}">${m} min</button>`).join('')}</div>
      <div class="jr-kt-knoppen"><button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-start">▶ Start</button><button type="button" class="jr-kt-klein jr-eigen" id="jr-kt-reset">↺</button></div></div></div>`;
    const teken = () => {
      const f = Math.max(0, rest / totaal);
      p.querySelector('#jr-kt-schijf').style.setProperty('--f', f);
      const s = Math.ceil(rest);
      p.querySelector('#jr-kt-tijd').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      p.querySelector('#jr-kt-start').textContent = loopt ? '⏸' : '▶ Start';
    };
    const tik = () => {
      rest = Math.max(0, rest - (performance.now() - t0) / 1000);
      t0 = performance.now();
      teken();
      if (rest <= 0) {
        loopt = false; teken();
        fx('fanfare');
        try { JrMuziek.liedje(); } catch {}
        p.querySelector('#jr-kt-schijf').classList.add('klaar');
        zeg([Z().ktTijdOp]);
        return;
      }
      if (loopt) raf = requestAnimationFrame(tik);
    };
    opruim.push(() => cancelAnimationFrame(raf));
    p.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', () => {
      totaal = rest = +b.dataset.min * 60; bewaar('jr-kt-klok', +b.dataset.min); loopt = false; cancelAnimationFrame(raf);
      p.querySelector('#jr-kt-schijf').classList.remove('klaar'); teken();
    }));
    p.querySelector('#jr-kt-start').addEventListener('click', () => {
      if (rest <= 0) rest = totaal;
      loopt = !loopt;
      p.querySelector('#jr-kt-schijf').classList.remove('klaar');
      if (loopt) { t0 = performance.now(); raf = requestAnimationFrame(tik); zeg([Z().ktKlokStart]); } else cancelAnimationFrame(raf);
      teken();
    });
    p.querySelector('#jr-kt-reset').addEventListener('click', () => { loopt = false; cancelAnimationFrame(raf); rest = totaal; p.querySelector('#jr-kt-schijf').classList.remove('klaar'); teken(); });
    teken();
  }

  // ---------- Stil-draakje: luistert via de micro. Stil = het draakje slaapt; te luid = het wordt wakker. ----------
  function stil(p) {
    let grens = lees('jr-kt-stil', 50);
    p.innerHTML = `<div class="jr-kt-stilvak"><img class="jr-kt-stildraak" id="jr-kt-stildraak" src="${draak(1)}" alt="">
      <div class="jr-kt-meter"><span id="jr-kt-niveau"></span><i id="jr-kt-grens"></i></div>
      <div class="jr-kt-knoppen"><button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-luister">🎤 Luisteren</button>
      <label class="jr-kt-schuif">🤫 <input type="range" min="15" max="90" value="${grens}" id="jr-kt-gevoel"> 📢</label></div>
      <p class="jr-kt-tip" id="jr-kt-tip"></p></div>`;
    const img = p.querySelector('#jr-kt-stildraak');
    const zetGrens = () => { p.querySelector('#jr-kt-grens').style.left = `${grens}%`; };
    zetGrens();
    p.querySelector('#jr-kt-gevoel').addEventListener('input', e => { grens = +e.target.value; bewaar('jr-kt-stil', grens); zetGrens(); });
    let stroom = null, ctx = null, raf = 0, gem = 0, staat = 0, sinds = 0, laatstGezegd = 0;
    opruim.push(() => { cancelAnimationFrame(raf); if (stroom) stroom.getTracks().forEach(t => t.stop()); if (ctx) ctx.close().catch(() => {}); });
    p.querySelector('#jr-kt-luister').addEventListener('click', async () => {
      if (stroom) return;
      try {
        stroom = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        p.querySelector('#jr-kt-tip').textContent = 'De micro van het bord werkt niet. Geef de browser toestemming voor de micro.';
        return;
      }
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      ctx.createMediaStreamSource(stroom).connect(an);
      const buf = new Float32Array(an.fftSize);
      p.querySelector('#jr-kt-luister').textContent = '🎤 …';
      const lus = () => {
        an.getFloatTimeDomainData(buf);
        let s = 0; for (const v of buf) s += v * v;
        const db = 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-6); // ongeveer -70 (stil) tot 0 (heel luid)
        const niveau = Math.max(0, Math.min(100, (db + 70) * 1.5));
        gem = gem * 0.9 + niveau * 0.1;
        p.querySelector('#jr-kt-niveau').style.width = `${gem}%`;
        const nieuw = gem > grens ? 2 : gem > grens * 0.7 ? 1 : 0;
        const nu = performance.now();
        if (nieuw !== staat && nu - sinds > 1200) {
          staat = nieuw; sinds = nu;
          img.src = draak([1, 2, 3][staat]);
          img.classList.toggle('boos', staat === 2);
          if (staat === 2 && nu - laatstGezegd > 8000) { laatstGezegd = nu; zeg([Z().ktLuid]); }
          if (staat === 0 && laatstGezegd && nu - laatstGezegd > 4000) { laatstGezegd = 0; zeg([Z().ktStil]); }
        }
        raf = requestAnimationFrame(lus);
      };
      lus();
    });
  }

  // Foto of tekening van de leerkracht verkleinen tot een kleine prent (blijft op dit toestel).
  const verklein = bestand => new Promise((ok, nee) => {
    const img = new Image(); img.onload = () => {
      const z = Math.min(1, 320 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * z); c.height = Math.round(img.height * z); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); const w = c.toDataURL('image/webp', .8); ok(w.startsWith('data:image/webp') ? w : c.toDataURL('image/jpeg', .8));
    }; img.onerror = nee; img.src = URL.createObjectURL(bestand);
  });

  // ---------- Hoekenbord: de leerkracht kiest de hoeken, de dieren worden verdeeld. Tik een dier en dan een hoek om te verplaatsen. ----------
  function hoeken(p) {
    const namen = Z().hoeken || [];
    let st = lees('jr-kt-hoeken', { aan: [1, 2, 3, 4, 5, 6], max: 5, dag: '', plek: {} });
    if (st.dag !== vandaag()) st.plek = {};
    // Eigen hoeken (naam + foto van de leerkracht) blijven op dit toestel bewaard.
    let eigen = lees('jr-kt-hoek-eigen', []);
    const eig = h => eigen.find(e => e.id === h);
    const src = h => eig(h) ? eig(h).src : `${IMG}/hoek/${h}.webp`;
    const naam = h => eig(h) ? eig(h).naam : (namen[h - 1] || '');
    const hv = v => /^\d+$/.test(v) ? +v : v;
    const orde = (a, c) => (typeof a === 'number' ? 0 : 1) - (typeof c === 'number' ? 0 : 1) || (typeof a === 'number' ? a - c : 0);
    st.aan = st.aan.filter(h => typeof h === 'number' || eig(h));
    let kies = false, vast = null;
    const bewaarSt = () => { st.dag = vandaag(); bewaar('jr-kt-hoeken', st); };
    function verdeel() {
      const plek = {}, tel = {};
      for (const h of st.aan) tel[h] = 0;
      for (const k of schud(kids())) {
        const vrij = st.aan.filter(h => tel[h] < st.max).sort((a, b) => tel[a] - tel[b]);
        if (!vrij.length) break;
        const h = vrij[Math.floor(Math.random() * Math.min(vrij.length, 2))];
        plek[k.id] = h; tel[h]++;
      }
      st.plek = plek; bewaarSt(); teken();
      fx('good');
      zeg([Z().ktHoeken]);
    }
    function teken() {
      const lijst = kids();
      if (kies) {
        const kaart = (h, beeld, nm, wis) => `<div class="jr-kt-eigen-kaart"><button type="button" class="jr-kt-hoek-kaart jr-eigen ${st.aan.includes(h) ? 'aan' : ''}" data-h="${h}"><img src="${beeld}" alt=""><b>${esc(nm)}</b></button>${wis ? `<button type="button" class="jr-kt-wis jr-eigen" data-wis="${h}" aria-label="Wissen">✕</button>` : ''}</div>`;
        p.innerHTML = `<p class="jr-kt-tip">Tik op de hoeken die open zijn vandaag.</p>
          <div class="jr-kt-hoekkies">${namen.map((n, i) => kaart(i + 1, `${IMG}/hoek/${i + 1}.webp`, n)).join('')}${eigen.map(e => kaart(e.id, e.src, e.naam, true)).join('')}</div>
          <div class="jr-kt-eigen-rij"><input type="text" id="jr-kt-eignaam" maxlength="24" placeholder="Naam van je eigen hoek"><label class="jr-kt-klein jr-eigen jr-kt-foto">📷 Met foto toevoegen<input type="file" id="jr-kt-eigfoto" accept="image/*" hidden></label><button type="button" class="jr-kt-klein jr-eigen" id="jr-kt-eigzonder">➕ Zonder foto</button></div>
          <div class="jr-kt-knoppen"><label class="jr-kt-schuif">Kinderen per hoek <select id="jr-kt-max">${[2, 3, 4, 5, 6, 8].map(m => `<option ${m === st.max ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
          <button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-klaar">✓ Klaar</button></div>`;
        p.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => {
          const h = hv(b.dataset.h);
          st.aan = st.aan.includes(h) ? st.aan.filter(x => x !== h) : [...st.aan, h].sort(orde);
          b.classList.toggle('aan', st.aan.includes(h));
        }));
        p.querySelectorAll('[data-wis]').forEach(b => b.addEventListener('click', () => { eigen = eigen.filter(e => e.id !== b.dataset.wis); st.aan = st.aan.filter(h => h !== b.dataset.wis); bewaar('jr-kt-hoek-eigen', eigen); teken(); }));
        const voegToe = async bestand => {
          const nm = p.querySelector('#jr-kt-eignaam').value.trim();
          if (!nm) { window.Ui && Ui.melding('Geef je hoek eerst een naam.'); p.querySelector('#jr-kt-eignaam').focus(); return; }
          try {
            const nieuw = { id: 'e' + Date.now(), naam: nm, src: bestand ? await verklein(bestand) : draak(5) };
            eigen.push(nieuw); bewaar('jr-kt-hoek-eigen', eigen);
            if (lees('jr-kt-hoek-eigen', []).length !== eigen.length) { eigen.pop(); window.Ui && Ui.melding('Er is geen plaats meer voor eigen hoeken. Wis er eerst een.'); return teken(); }
            st.aan = [...st.aan, nieuw.id].sort(orde); teken();
          } catch { window.Ui && Ui.melding('Die foto kon niet geladen worden.'); }
        };
        p.querySelector('#jr-kt-eigfoto').addEventListener('change', e => { const b = e.target.files[0]; if (b) voegToe(b); });
        p.querySelector('#jr-kt-eigzonder').addEventListener('click', () => voegToe(null));
        p.querySelector('#jr-kt-max').addEventListener('change', e => { st.max = +e.target.value; });
        p.querySelector('#jr-kt-klaar').addEventListener('click', () => { kies = false; st.plek = {}; bewaarSt(); verdeel(); });
        return;
      }
      const zonder = lijst.filter(k => !st.aan.includes(st.plek[k.id]));
      p.innerHTML = `<div class="jr-kt-hoekbord">${st.aan.map(h => `<div class="jr-kt-hoek" data-h="${h}"><div class="jr-kt-hoek-kop"><img src="${src(h)}" alt=""><b>${esc(naam(h))}</b></div>
          <div class="jr-kt-hoek-dieren">${lijst.filter(k => st.plek[k.id] === h).map(k => dierHtml(k, vast === k.id ? 'licht' : '')).join('')}</div></div>`).join('')}</div>
        ${zonder.length ? `<div class="jr-kt-zonder">${zonder.map(k => dierHtml(k, vast === k.id ? 'licht' : '')).join('')}</div>` : ''}
        <div class="jr-kt-knoppen"><button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-verdeel">🎲 Verdeel opnieuw</button><button type="button" class="jr-kt-klein jr-eigen" id="jr-kt-kieshoeken">⚙️ Hoeken kiezen</button></div>
        <p class="jr-kt-tip">Tik op een dier en daarna op een hoek om het te verplaatsen.</p>`;
      p.querySelector('#jr-kt-verdeel').addEventListener('click', verdeel);
      p.querySelector('#jr-kt-kieshoeken').addEventListener('click', () => { kies = true; teken(); });
      p.querySelectorAll('.jr-kt-dier').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); vast = vast === el.dataset.kind ? null : el.dataset.kind; teken(); }));
      p.querySelectorAll('.jr-kt-hoek').forEach(el => el.addEventListener('click', () => {
        if (!vast) { zeg([naam(hv(el.dataset.h))]); return; }
        st.plek[vast] = hv(el.dataset.h); vast = null; bewaarSt(); fx('marker'); teken();
      }));
    }
    if (!Object.keys(st.plek).length && st.aan.length) verdeel(); else teken();
  }

  // ---------- Dagritme: de prenten van de dag op een rij; het draakje wijst wat nu komt. ----------
  function dag(p) {
    const namen = Z().dagdelen || [];
    let st = lees('jr-kt-dag', { rij: [1, 2, 3, 4, 13, 9, 12, 8], nu: 0, dag: '' });
    if (st.dag !== vandaag()) st.nu = 0;
    let maak = false;
    // Eigen prenten (foto of tekening van de leerkracht) blijven op dit toestel bewaard.
    let eigen = lees('jr-kt-dag-eigen', []);
    const eig = d => eigen.find(e => e.id === d);
    const src = d => eig(d) ? eig(d).src : `${IMG}/dag/${d}.webp`;
    const naam = d => eig(d) ? eig(d).naam : (namen[d - 1] || '');
    st.rij = st.rij.filter(d => typeof d === 'number' || eig(d));
    const bewaarSt = () => { st.dag = vandaag(); bewaar('jr-kt-dag', st); };
    function teken() {
      if (maak) {
        p.innerHTML = `<p class="jr-kt-tip">Tik op de prenten in de volgorde van de dag. Tik op een prent in de rij om ze weg te halen.</p>
          <div class="jr-kt-dagrij klein">${st.rij.map((d, i) => `<button type="button" class="jr-kt-dagkaart jr-eigen" data-weg="${i}"><img src="${src(d)}" alt=""><b>${esc(naam(d))}</b></button>`).join('')}</div>
          <div class="jr-kt-eigen-rij"><input type="text" id="jr-kt-eignaam" maxlength="24" placeholder="Naam van je eigen prent"><label class="jr-kt-klein jr-eigen jr-kt-foto">📷 Eigen prent toevoegen<input type="file" id="jr-kt-eigfoto" accept="image/*" hidden></label></div>
          <div class="jr-kt-hoekkies">${eigen.map(e => `<div class="jr-kt-eigen-kaart"><button type="button" class="jr-kt-hoek-kaart jr-eigen" data-e="${e.id}"><img src="${e.src}" alt=""><b>${esc(e.naam)}</b></button><button type="button" class="jr-kt-wis jr-eigen" data-wis="${e.id}" aria-label="Wissen">✕</button></div>`).join('')}${namen.map((n, i) => `<button type="button" class="jr-kt-hoek-kaart jr-eigen" data-d="${i + 1}"><img src="${IMG}/dag/${i + 1}.webp" alt=""><b>${esc(n)}</b></button>`).join('')}</div>
          <div class="jr-kt-knoppen"><button type="button" class="jr-kt-klein jr-eigen" id="jr-kt-leeg">🗑️ Leeg</button><button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-klaar">✓ Klaar</button></div>`;
        p.querySelectorAll('[data-weg]').forEach(b => b.addEventListener('click', () => { st.rij.splice(+b.dataset.weg, 1); teken(); }));
        p.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { if (st.rij.length < 12) { st.rij.push(+b.dataset.d); teken(); } }));
        p.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => { if (st.rij.length < 12) { st.rij.push(b.dataset.e); teken(); } }));
        p.querySelectorAll('[data-wis]').forEach(b => b.addEventListener('click', () => { eigen = eigen.filter(e => e.id !== b.dataset.wis); st.rij = st.rij.filter(d => d !== b.dataset.wis); bewaar('jr-kt-dag-eigen', eigen); teken(); }));
        p.querySelector('#jr-kt-eigfoto').addEventListener('change', async e => {
          const b = e.target.files[0]; if (!b) return;
          try {
            const nieuw = { id: 'e' + Date.now(), naam: p.querySelector('#jr-kt-eignaam').value.trim() || 'Eigen prent', src: await verklein(b) };
            eigen.push(nieuw); bewaar('jr-kt-dag-eigen', eigen);
            if (lees('jr-kt-dag-eigen', []).length !== eigen.length) { eigen.pop(); window.Ui && Ui.melding('Er is geen plaats meer voor eigen prenten. Wis er eerst een.'); return teken(); }
            if (st.rij.length < 12) st.rij.push(nieuw.id); teken();
          } catch { window.Ui && Ui.melding('Die prent kon niet geladen worden.'); }
        });
        p.querySelector('#jr-kt-leeg').addEventListener('click', () => { st.rij = []; teken(); });
        p.querySelector('#jr-kt-klaar').addEventListener('click', () => { maak = false; st.nu = 0; bewaarSt(); teken(); });
        return;
      }
      st.nu = Math.max(0, Math.min(st.rij.length - 1, st.nu));
      p.innerHTML = `<div class="jr-kt-dagrij">${st.rij.map((d, i) => `<button type="button" class="jr-kt-dagkaart jr-eigen ${i < st.nu ? 'voorbij' : i === st.nu ? 'nu' : ''}" data-i="${i}">
          ${i === st.nu ? `<img class="jr-kt-wijs" src="${draak(5)}" alt="">` : ''}<img src="${src(d)}" alt=""><b>${esc(naam(d))}</b></button>`).join('')}</div>
        <div class="jr-kt-knoppen"><button type="button" class="jr-kt-klein jr-eigen" id="jr-kt-terug">◀</button><button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-verder">Volgende ▶</button><button type="button" class="jr-kt-klein jr-eigen" id="jr-kt-maak">✏️ Dag maken</button></div>`;
      const ga = i => { st.nu = Math.max(0, Math.min(st.rij.length - 1, i)); bewaarSt(); teken(); fx('jump'); zeg([Z().ktNu, naam(st.rij[st.nu])]); };
      p.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => ga(+b.dataset.i)));
      p.querySelector('#jr-kt-terug').addEventListener('click', () => ga(st.nu - 1));
      p.querySelector('#jr-kt-verder').addEventListener('click', () => ga(st.nu + 1));
      p.querySelector('#jr-kt-maak').addEventListener('click', () => { maak = true; teken(); });
    }
    teken();
  }

  // ---------- Opruimen: een opruimdeuntje (ingebouwd of eigen muziek) met een balk die leegloopt. Muziek stopt = alles op zijn plek. ----------
  // Eigen muziek (mp3 van de leerkracht) blijft op dit toestel bewaard in IndexedDB; localStorage is daar te klein voor.
  const DEUNEN = [
    { id: 'mars', naam: 'Riddermars', tempo: 0.85 },
    { id: 'bezem', naam: 'Snelle bezem', tempo: 0.62 },
    { id: 'draak', naam: 'Drakendans', tempo: 0.75 },
    { id: 'kalm', naam: 'Rustig opruimen', tempo: 1.25 },
  ];
  const db = () => new Promise((ok, nee) => {
    const r = indexedDB.open('jr-opruim', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('muziek', { keyPath: 'id' });
    r.onsuccess = () => ok(r.result); r.onerror = () => nee(r.error);
  });
  const dbDoe = (modus, fn) => db().then(d => new Promise((ok, nee) => {
    const t = d.transaction('muziek', modus); const r = fn(t.objectStore('muziek'));
    t.oncomplete = () => { ok(r && r.result); d.close(); }; t.onerror = () => { nee(t.error); d.close(); };
  }));
  const eigenLijst = () => dbDoe('readonly', st => st.getAll()).catch(() => []);
  function opruimen(p) {
    const MIN = [1, 2, 3, 5];
    let st = lees('jr-kt-opruim', { lied: 'mars', min: 2 });
    let eigen = [], loopt = false, rest = st.min * 60, t0 = 0, raf = 0, speler = null, url = '';
    const stopMuziek = () => { try { JrMuziek.stop(); } catch {} if (speler) { speler.pause(); speler = null; } if (url) { URL.revokeObjectURL(url); url = ''; } };
    opruim.push(() => { cancelAnimationFrame(raf); stopMuziek(); });
    const startMuziek = () => {
      const d = DEUNEN.find(x => x.id === st.lied);
      if (d) { try { JrMuziek.speel('opruim-' + d.id, { altijd: true, tempo: d.tempo, vol: 0.14 }); } catch {} return; }
      const e = eigen.find(x => x.id === st.lied);
      if (!e) return;
      url = URL.createObjectURL(e.blob); speler = new Audio(url); speler.loop = true;
      if (window.JrMuziek && JrMuziek.stil) return;
      speler.play().catch(() => {});
    };
    const chip = (id, naam, wis) => `<span class="jr-kt-lied"><button type="button" class="jr-kt-klein jr-eigen ${st.lied === id ? 'aan' : ''}" data-lied="${id}">🎵 ${esc(naam)}</button>${wis ? `<button type="button" class="jr-kt-wis jr-eigen" data-wislied="${id}" aria-label="Wissen">✕</button>` : ''}</span>`;
    function teken() {
      p.innerHTML = `<div class="jr-kt-opruimvak">
        <div class="jr-kt-opruim-beeld" id="jr-kt-opruim-beeld"><img src="${IMG}/icoon/opruim.webp" alt=""></div>
        <div class="jr-kt-opruim-zij">
        <div class="jr-kt-tijd" id="jr-kt-tijd" data-geen-vertaling></div>
        <div class="jr-kt-opruim-balk"><span id="jr-kt-opruim-vul"></span></div>
        <div class="jr-kt-knoppen"><button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-start"></button><button type="button" class="jr-kt-klein jr-eigen" id="jr-kt-reset">↺</button></div>
        <div class="jr-kt-minuten">${MIN.map(m => `<button type="button" class="jr-kt-klein jr-eigen ${m === st.min ? 'aan' : ''}" data-min="${m}">${m} min</button>`).join('')}</div>
        <div class="jr-kt-liedjes">${DEUNEN.map(d => chip(d.id, d.naam)).join('')}${eigen.map(e => chip(e.id, e.naam, true)).join('')}
          <label class="jr-kt-klein jr-eigen jr-kt-foto">➕ Eigen muziek<input type="file" id="jr-kt-eigmuziek" accept="audio/*" hidden></label></div>
      </div></div>`;
      p.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', () => { st.min = +b.dataset.min; bewaar('jr-kt-opruim', st); stopAlles(); teken(); }));
      p.querySelectorAll('[data-lied]').forEach(b => b.addEventListener('click', () => {
        st.lied = b.dataset.lied; bewaar('jr-kt-opruim', st);
        p.querySelectorAll('[data-lied]').forEach(x => x.classList.toggle('aan', x === b));
        if (loopt) { stopMuziek(); startMuziek(); }
      }));
      p.querySelectorAll('[data-wislied]').forEach(b => b.addEventListener('click', async () => {
        await dbDoe('readwrite', s2 => s2.delete(b.dataset.wislied)).catch(() => {});
        if (st.lied === b.dataset.wislied) { st.lied = 'mars'; bewaar('jr-kt-opruim', st); }
        eigen = await eigenLijst(); teken();
      }));
      p.querySelector('#jr-kt-eigmuziek').addEventListener('change', async e => {
        const f = e.target.files[0]; if (!f) return;
        if (f.size > 30 * 1024 * 1024) { window.Ui && Ui.melding('Dat muziekbestand is te groot (meer dan 30 MB).'); return; }
        const nieuw = { id: 'm' + Date.now(), naam: f.name.replace(/\.[^.]+$/, '').slice(0, 30), blob: f };
        try { await dbDoe('readwrite', s2 => s2.put(nieuw)); } catch { window.Ui && Ui.melding('Die muziek kon niet bewaard worden.'); return; }
        st.lied = nieuw.id; bewaar('jr-kt-opruim', st); eigen = await eigenLijst(); teken();
      });
      p.querySelector('#jr-kt-start').addEventListener('click', () => {
        if (rest <= 0) rest = st.min * 60;
        loopt = !loopt;
        p.querySelector('.jr-kt-opruimvak').classList.remove('klaar');
        if (loopt) { t0 = performance.now(); raf = requestAnimationFrame(tik); if (rest === st.min * 60) zeg([Z().ktOpruim]).then(() => { if (loopt) startMuziek(); }); else startMuziek(); }
        else { cancelAnimationFrame(raf); stopMuziek(); }
        toon();
      });
      p.querySelector('#jr-kt-reset').addEventListener('click', () => { stopAlles(); toon(); });
      toon();
    }
    function stopAlles() { loopt = false; cancelAnimationFrame(raf); stopMuziek(); rest = st.min * 60; const v = p.querySelector('.jr-kt-opruimvak'); if (v) v.classList.remove('klaar'); }
    function toon() {
      const f = Math.max(0, rest / (st.min * 60)), s = Math.ceil(rest);
      p.querySelector('#jr-kt-opruim-vul').style.width = `${f * 100}%`;
      p.querySelector('#jr-kt-tijd').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      p.querySelector('#jr-kt-start').textContent = loopt ? '⏸ Pauze' : '▶ Opruimen!';
      p.querySelector('#jr-kt-opruim-beeld').classList.toggle('bezig', loopt);
    }
    function tik() {
      rest = Math.max(0, rest - (performance.now() - t0) / 1000); t0 = performance.now(); toon();
      if (rest <= 0) {
        loopt = false; stopMuziek(); toon();
        p.querySelector('.jr-kt-opruimvak').classList.add('klaar');
        fx('fanfare'); try { JrMuziek.liedje(); } catch {}
        zeg([Z().ktOpruimKlaar]);
        return;
      }
      if (loopt) raf = requestAnimationFrame(tik);
    }
    teken();
    eigenLijst().then(l => { eigen = l; if (!loopt) teken(); });
  }

  // ---------- Dobbelsteen: één of twee grote dobbelstenen met ogen. ----------
  const OGEN = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  const steen = n => `<div class="jr-kt-steen">${Array.from({ length: 9 }, (_, i) => `<i class="${OGEN[n].includes(i + 1) ? 'oog' : ''}"></i>`).join('')}</div>`;
  function dobbel(p) {
    let aantal = lees('jr-kt-dobbel', 1), waarden = [6, 6].slice(0, aantal);
    const teken = () => {
      p.innerHTML = `<div class="jr-kt-stenen">${waarden.map(steen).join('')}</div>
        <div class="jr-kt-knoppen"><button type="button" class="jr-kt-klein jr-eigen ${aantal === 1 ? 'aan' : ''}" data-n="1">⚀</button><button type="button" class="jr-kt-klein jr-eigen ${aantal === 2 ? 'aan' : ''}" data-n="2">⚀⚀</button>
        <button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-gooi">🎲 Gooi!</button></div>`;
      p.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => { aantal = +b.dataset.n; bewaar('jr-kt-dobbel', aantal); waarden = Array.from({ length: aantal }, () => 6); teken(); }));
      p.querySelector('#jr-kt-gooi').addEventListener('click', gooi);
    };
    function gooi() {
      p.querySelector('#jr-kt-gooi').disabled = true;
      let n = 0;
      const rol = () => {
        waarden = waarden.map(() => 1 + Math.floor(Math.random() * 6));
        p.querySelector('.jr-kt-stenen').innerHTML = waarden.map(steen).join('');
        p.querySelectorAll('.jr-kt-steen').forEach(s => s.classList.add('rol'));
        fx('tick');
        if (++n < 10) { later(rol, 60 + n * 18); return; }
        p.querySelectorAll('.jr-kt-steen').forEach(s => s.classList.remove('rol'));
        fx('good');
        zeg([waarden.length === 2 ? waarden[0] + waarden[1] : waarden[0]]);
        p.querySelector('#jr-kt-gooi').disabled = false;
      };
      rol();
    }
    teken();
  }

  // ---------- Groepjes: de dieren in 2 tot 6 kleurgroepjes. ----------
  function groepjes(p) {
    let n = lees('jr-kt-groepen', 4), groepen = [];
    const maak = () => {
      groepen = Array.from({ length: n }, () => []);
      schud(kids()).forEach((k, i) => groepen[i % n].push(k));
      fx('good');
      teken();
    };
    const teken = () => {
      const kleur = Z().ktKleuren || [];
      p.innerHTML = `<div class="jr-kt-groepen">${groepen.map((g, i) => `<div class="jr-kt-groep kleur-${i}" data-g="${i}"><div class="jr-kt-groep-kop">${esc(Z().ktGroep || '')} ${esc(kleur[i] || i + 1)}</div><div class="jr-kt-hoek-dieren">${g.map(k => dierHtml(k)).join('')}</div></div>`).join('')}</div>
        <div class="jr-kt-knoppen">${[2, 3, 4, 5, 6].map(m => `<button type="button" class="jr-kt-klein jr-eigen ${m === n ? 'aan' : ''}" data-n="${m}">${m}</button>`).join('')}
        <button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-meng">🎲 Maak groepjes</button></div>`;
      p.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => { n = +b.dataset.n; bewaar('jr-kt-groepen', n); maak(); }));
      p.querySelector('#jr-kt-meng').addEventListener('click', maak);
      p.querySelectorAll('[data-g]').forEach(el => el.addEventListener('click', () => { const i = +el.dataset.g; zeg([`${Z().ktGroep || ''} ${(Z().ktKleuren || [])[i] || i + 1}`, ...groepen[i].map(k => k.naam)]); }));
    };
    maak();
  }

  // ---------- Rustmoment: samen met het draakje rustig in- en uitademen. ----------
  function rust(p) {
    let keer = lees('jr-kt-rust', 5), bezig = false;
    const POSE = n => `/img/junior/draakpose/${n}.webp`;
    const teken = () => {
      p.innerHTML = `<div class="jr-kt-rustvak"><div class="jr-kt-adem" id="jr-kt-adem"></div><img class="jr-kt-rustdraak" id="jr-kt-rustdraak" src="${POSE(5)}" alt="">
          <p class="jr-kt-rusttekst" id="jr-kt-rusttekst" data-geen-vertaling></p><div class="jr-kt-rustbollen" id="jr-kt-rustbollen">${'<i></i>'.repeat(keer)}</div></div>
        <div class="jr-kt-knoppen">${[3, 5, 8].map(m => `<button type="button" class="jr-kt-klein jr-eigen ${m === keer ? 'aan' : ''}" data-keer="${m}">${m}×</button>`).join('')}
          <button type="button" class="jr-kt-groot jr-eigen" id="jr-kt-rust-start">▶ Start</button></div>`;
      p.querySelectorAll('[data-keer]').forEach(b => b.addEventListener('click', () => { if (bezig) return; keer = +b.dataset.keer; bewaar('jr-kt-rust', keer); teken(); }));
      p.querySelector('#jr-kt-rust-start').addEventListener('click', () => (bezig ? stopRust() : start()));
    };
    const zet = (pose, tekst, klasse) => {
      p.querySelector('#jr-kt-rustdraak').src = POSE(pose);
      p.querySelector('#jr-kt-rusttekst').textContent = tekst || '';
      const a = p.querySelector('#jr-kt-adem'); a.className = `jr-kt-adem ${klasse || ''}`;
    };
    const stopRust = () => { stopTool(); bezig = false; try { JrMuziek.stop(); } catch {} teken(); };
    const start = async () => {
      bezig = true;
      p.querySelector('#jr-kt-rust-start').textContent = '■ Stop';
      p.querySelectorAll('[data-keer]').forEach(b => { b.disabled = true; });
      opruim.push(() => { bezig = false; });
      zet(5, Z().rustStart, '');
      await zeg([Z().rustStart]);
      let n = 0;
      const ronde = () => {
        if (!bezig) return;
        if (n >= keer) {
          zet(5, Z().rustKlaar, 'klaar'); fx('good'); zeg([Z().rustKlaar]);
          later(() => { bezig = false; teken(); }, 4000);
          return;
        }
        zet(3, Z().rustIn, 'in'); zeg([Z().rustIn]); try { JrMuziek.adem(true, 4); } catch {}
        later(() => {
          if (!bezig) return;
          zet(4, Z().rustUit, 'uit'); zeg([Z().rustUit]); try { JrMuziek.adem(false, 5); } catch {}
          later(() => { const b = p.querySelectorAll('#jr-kt-rustbollen i')[n]; if (b) b.classList.add('af'); n++; ronde(); }, 5000);
        }, 4000);
      };
      ronde();
    };
    teken();
  }

  window.JrTools = {
    maak(el, o) { vak = el; opt = o || {}; menu(); },
    stop() { stopTool(); try { Junior.Stem.stop(); } catch {} },
    get huidig() { return huidig; },
  };
})();
