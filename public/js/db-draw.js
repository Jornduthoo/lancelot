// Diepboor tekenen: de mijn rond je boorridder (leerling) en alle mijnen als doorsnede naast elkaar (bord).
// Vakjes, de boor en het licht worden één keer per grootte gebakken; per frame tekenen we alleen wat in beeld is.
// Gebruikt DbWorld, AK en Glow.
const DbDraw = (() => {
  const W = DbWorld;
  const { T } = W;
  const { rgba } = Glow;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const bandIndex = y => W.BANDS.findIndex(b => y < b.to);
  // Een vaste reeks willekeurige getallen per variant, zodat de vakjes niet allemaal gelijk zijn.
  function rng(seed) {
    let s = seed * 9301 + 49297;
    return () => { s = (s * 16807) % 2147483647; return (s % 10000) / 10000; };
  }
  const mix = (a, b, f) => {
    const p = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const x = p(a), y = p(b);
    return `#${x.map((v, i) => Math.round(v + (y[i] - v) * f).toString(16).padStart(2, '0')).join('')}`;
  };

  // ---------- Vakjes ----------
  const tiles = new Map();
  function tileSprite(type, bi, variant, px) {
    const key = `${type}|${bi}|${variant}|${px}`;
    let c = tiles.get(key);
    if (c) return c;
    c = mk(px, px);
    const g = c.getContext('2d');
    const b = W.BANDS[bi];
    const r = rng(type * 31 + bi * 7 + variant * 101 + 3);
    // Grond zonder randjes: de vakjes lopen in elkaar over. Elke laag heeft zijn eigen sporen (wortels, lagen, barsten...).
    // Lijnen staan op een vaste hoogte per laag, zodat ze over de vakjes heen doorlopen.
    const ground = (base, dark) => {
      g.fillStyle = base;
      g.fillRect(0, 0, px, px);
      for (let i = 0; i < 9; i++) {
        g.fillStyle = r() < .5 ? rgba(dark, .45) : 'rgba(255,255,255,.06)';
        const s = px * (.05 + r() * .1);
        g.beginPath(); g.ellipse(px * (.08 + r() * .84), px * (.08 + r() * .84), s, s * (.55 + r() * .4), r() * 3, 0, 7); g.fill();
      }
      if (bi === 0) {
        // Aarde: dunne wortels en een steentje
        g.strokeStyle = 'rgba(40,24,12,.55)';
        g.lineWidth = Math.max(1, px * .025);
        if (r() < .3) {
          const x = px * (.2 + r() * .6), y = px * (.1 + r() * .4);
          g.beginPath(); g.moveTo(x, y);
          g.quadraticCurveTo(x + px * (r() - .5) * .3, y + px * .2, x + px * (r() - .5) * .2, y + px * (.3 + r() * .2)); g.stroke();
        }
        g.fillStyle = 'rgba(150,130,110,.5)';
        g.beginPath(); g.ellipse(px * (.2 + r() * .6), px * (.2 + r() * .6), px * .06, px * .04, 0, 0, 7); g.fill();
      } else if (bi === 1 || bi === 2) {
        // Klei en steen: doorlopende lagen
        for (const [f, a] of [[.3, .3], [.68, .22]]) {
          g.fillStyle = rgba(dark, a);
          g.fillRect(0, px * f, px, Math.max(1, px * .05));
          g.fillStyle = 'rgba(255,255,255,.05)';
          g.fillRect(0, px * f - Math.max(1, px * .02), px, Math.max(1, px * .02));
        }
        if (bi === 2 && r() < .5) {
          g.strokeStyle = 'rgba(0,0,0,.35)';
          g.lineWidth = Math.max(1, px * .02);
          g.beginPath(); const x = r() * px; g.moveTo(x, px * .32); g.lineTo(x + px * .08, px * .5); g.lineTo(x - px * .04, px * .68); g.stroke();
        }
      } else if (bi === 3) {
        // Kristalgrot: kleine splinters die zacht oplichten
        for (let i = 0; i < 2; i++) {
          if (r() < .45) continue;
          const x = px * (.15 + r() * .7), y = px * (.15 + r() * .7), s = px * (.04 + r() * .04);
          g.fillStyle = r() < .5 ? 'rgba(199,125,255,.75)' : 'rgba(76,201,255,.7)';
          g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s, y); g.lineTo(x, y + s * .6); g.lineTo(x - s, y); g.closePath(); g.fill();
        }
      } else {
        // Magma: gloeiende adertjes
        g.strokeStyle = 'rgba(255,110,40,.5)';
        g.lineWidth = Math.max(1, px * .03);
        if (r() < .6) {
          g.beginPath(); let x = 0, y = px * (.2 + r() * .6); g.moveTo(x, y);
          while (x < px) { x += px * (.15 + r() * .2); y += px * (r() - .5) * .25; g.lineTo(x, y); }
          g.stroke();
        }
      }
    };
    if (type === T.LEEG) {
      // Gang: een ruwe, donkere achterwand.
      g.fillStyle = mix(b.dark, '#000000', .5);
      g.fillRect(0, 0, px, px);
      for (let i = 0; i < 7; i++) {
        g.fillStyle = r() < .5 ? 'rgba(0,0,0,.35)' : rgba(b.color, .14);
        const s = px * (.08 + r() * .14);
        g.beginPath(); g.ellipse(r() * px, r() * px, s, s * .6, r() * 3, 0, 7); g.fill();
      }
      g.fillStyle = rgba(b.color, .1);
      for (let i = 0; i < 2; i++) g.fillRect(0, px * (.25 + i * .4 + r() * .08), px, px * .04);
    } else if (type === T.STEEN) {
      // Een rotsblok in de grond: rond, met een lichte kant en een barst.
      ground(b.color, b.dark);
      const sc = mix(b.color, '#7a8094', .6);
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.beginPath(); g.ellipse(px * .52, px * .56, px * .47, px * .41, 0, 0, 7); g.fill();
      const rock = g.createLinearGradient(0, px * .1, 0, px * .95);
      rock.addColorStop(0, mix(sc, '#ffffff', .25)); rock.addColorStop(1, mix(sc, '#000000', .35));
      g.fillStyle = rock;
      g.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2, rr = .4 + r() * .07;
        g[i ? 'lineTo' : 'moveTo'](px * (.5 + Math.cos(a) * rr), px * (.5 + Math.sin(a) * rr * .9));
      }
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.beginPath(); g.ellipse(px * .4, px * .3, px * .18, px * .08, -.3, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.45)';
      g.lineWidth = Math.max(1, px * .035);
      g.beginPath();
      g.moveTo(px * .2, px * (.4 + r() * .15)); g.lineTo(px * .5, px * (.5 + r() * .1)); g.lineTo(px * .78, px * (.38 + r() * .2));
      g.moveTo(px * .5, px * .55); g.lineTo(px * (.42 + r() * .16), px * .85);
      g.stroke();
    } else if (type === T.ROTS) {
      // Onbreekbaar: donker metaal met klinknagels en een runenlijn.
      g.fillStyle = '#17141f';
      g.fillRect(0, 0, px, px);
      g.fillStyle = '#231f30';
      g.fillRect(px * .06, px * .06, px * .88, px * .88);
      g.fillStyle = '#4a4560';
      for (const [x, y] of [[.18, .18], [.82, .18], [.18, .82], [.82, .82]]) { g.beginPath(); g.arc(px * x, px * y, px * .05, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(199,125,255,.35)';
      g.lineWidth = Math.max(1, px * .035);
      g.beginPath(); g.moveTo(px * .3, px * .5); g.lineTo(px * .5, px * .32); g.lineTo(px * .7, px * .5); g.lineTo(px * .5, px * .68); g.closePath(); g.stroke();
    } else if (type === T.LAVA) {
      const grad = g.createLinearGradient(0, 0, 0, px);
      grad.addColorStop(0, '#ffb347'); grad.addColorStop(.5, '#ff5a1f'); grad.addColorStop(1, '#a3160c');
      g.fillStyle = grad;
      g.fillRect(0, 0, px, px);
      for (let i = 0; i < 5; i++) {
        g.fillStyle = r() < .5 ? 'rgba(255,240,170,.65)' : 'rgba(120,10,0,.45)';
        g.beginPath(); g.arc(r() * px, r() * px, px * (.05 + r() * .09), 0, 7); g.fill();
      }
    } else if (type === T.GAS) {
      ground(b.color, b.dark);
      const grad = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px * .48);
      grad.addColorStop(0, 'rgba(170,255,120,.85)'); grad.addColorStop(.6, 'rgba(90,200,70,.45)'); grad.addColorStop(1, 'rgba(60,140,40,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, px, px);
      g.fillStyle = 'rgba(230,255,200,.7)';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(px * (.25 + r() * .5), px * (.25 + r() * .5), px * (.03 + r() * .04), 0, 7); g.fill(); }
    } else if (W.ORES[type]) {
      ground(b.color, b.dark);
      const col = W.ORES[type].color;
      const halo = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px * .5);
      halo.addColorStop(0, rgba(col, type >= T.KRISTAL ? .55 : .3)); halo.addColorStop(1, rgba(col, 0));
      g.fillStyle = halo;
      g.fillRect(0, 0, px, px);
      if (type === T.NEON) {
        // Neonkern: een gloeiende bol met een ring.
        const core = g.createRadialGradient(px * .45, px * .42, 0, px / 2, px / 2, px * .26);
        core.addColorStop(0, '#ffffff'); core.addColorStop(.4, '#ff8df5'); core.addColorStop(1, '#b0129e');
        g.fillStyle = core;
        g.beginPath(); g.arc(px / 2, px / 2, px * .24, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,200,250,.85)';
        g.lineWidth = Math.max(1, px * .04);
        g.beginPath(); g.ellipse(px / 2, px / 2, px * .38, px * .13, -.4, 0, 7); g.stroke();
      } else {
        // Kristallen: een paar facetten met een lichte kant.
        const n = type >= T.GOUD ? 3 : 4;
        for (let i = 0; i < n; i++) {
          const cx = px * (.25 + r() * .5), cy = px * (.28 + r() * .45), s = px * (type >= T.KRISTAL ? .2 : .13) * (.7 + r() * .5);
          const tall = type === T.KRISTAL ? 1.7 : 1;
          g.fillStyle = mix(col, '#000000', .35);
          g.beginPath(); g.moveTo(cx, cy - s * tall); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s * .8); g.lineTo(cx - s, cy); g.closePath(); g.fill();
          g.fillStyle = col;
          g.beginPath(); g.moveTo(cx, cy - s * tall); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s * .2); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,.75)';
          g.beginPath(); g.moveTo(cx, cy - s * tall); g.lineTo(cx - s * .45, cy - s * .2); g.lineTo(cx, cy - s * .05); g.closePath(); g.fill();
        }
      }
    } else {
      // Aarde (en klei, en de grond van de diepere lagen)
      ground(b.color, b.dark);
      g.fillStyle = rgba(b.dark, .6);
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(r() * px, r() * px, px * (.04 + r() * .05), 0, 7); g.fill(); }
    }
    tiles.set(key, c);
    return c;
  }

  // ---------- Randen van de gangen ----------
  // Waar grond aan een gang grenst: een lichte, brokkelige rand bovenop, druppels en worteltjes eronder,
  // schaduw in de gang en afgeronde hoeken. Zo lijkt een gang uitgegraven in plaats van een raster van vakjes.
  const edgeCache = new Map();
  // Een kant-sprite in een vaste stand (rot: 0 boven, 1 links, 2 rechts, 3 onder; hoeken 4-7), gebakken zodat we per frame niet draaien.
  function turned(kind, bi, px, k) {
    const key = `${kind}|${bi}|${px}|${k}`;
    let c = edgeCache.get(key);
    if (c) return c;
    const src = edgeSprite(kind, bi, px);
    c = mk(kind === 'side' ? src.width : px, kind === 'corner' ? src.height : kind === 'side' ? px : px);
    const g = c.getContext('2d');
    if (kind === 'ao') {
      g.translate(px / 2, px / 2);
      g.rotate([0, -Math.PI / 2, Math.PI / 2, Math.PI][k]);
      g.drawImage(src, -px / 2, -px / 2);
    } else if (kind === 'corner') {
      c.width = src.width; c.height = src.height;
      g.translate(k === 5 || k === 7 ? src.width : 0, k >= 6 ? src.height : 0);
      g.scale(k === 5 || k === 7 ? -1 : 1, k >= 6 ? -1 : 1);
      g.drawImage(src, 0, 0);
    } else {
      g.translate(k === 2 ? src.width : 0, 0);
      g.scale(k === 2 ? -1 : 1, 1);
      g.drawImage(src, 0, 0);
    }
    edgeCache.set(key, c);
    return c;
  }
  function edgeSprite(kind, bi, px) {
    const key = `${kind}|${bi}|${px}`;
    let c = edgeCache.get(key);
    if (c) return c;
    const b = W.BANDS[bi];
    const r = rng(bi * 13 + kind.length * 7 + 1);
    if (kind === 'lip') {
      // Bovenkant van de grond (de vloer van een gang): een lichte rand met kruimels, in de aarde met grassprietjes.
      c = mk(px, px * .3);
      const g = c.getContext('2d');
      const top = px * .1;
      g.fillStyle = mix(b.color, '#ffffff', .22);
      g.beginPath(); g.moveTo(0, top + px * .04);
      for (let x = 0; x <= px; x += px / 8) g.lineTo(x, top + (r() - .5) * px * .06);
      g.lineTo(px, top + px * .12); g.lineTo(0, top + px * .12); g.closePath(); g.fill();
      g.fillStyle = rgba(b.dark, .6);
      g.fillRect(0, top + px * .1, px, Math.max(1, px * .04));
      for (let i = 0; i < 4; i++) { g.fillStyle = rgba(b.dark, .8); g.fillRect(r() * px, top - px * .05, px * .05, px * .04); }
      if (bi === 0) {
        g.strokeStyle = '#3f8f4a';
        g.lineWidth = Math.max(1, px * .025);
        g.beginPath();
        for (let i = 0; i < 5; i++) { const x = r() * px; g.moveTo(x, top); g.lineTo(x + (r() - .5) * px * .08, top - px * (.05 + r() * .07)); }
        g.stroke();
      }
    } else if (kind === 'drip') {
      // Onderkant van de grond (het plafond van een gang): een donkere rand met hangende puntjes.
      c = mk(px, px * .32);
      const g = c.getContext('2d');
      g.fillStyle = mix(b.color, '#000000', .3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(px, 0);
      let x = px;
      while (x > 0) {
        const w = px * (.08 + r() * .12), d = px * (.04 + r() * (bi >= 2 ? .2 : .1));
        g.lineTo(x - w / 2, d); g.lineTo(x - w, px * .03); x -= w;
      }
      g.closePath(); g.fill();
      if (bi === 0 || bi === 1) {
        g.strokeStyle = 'rgba(70,45,25,.85)';
        g.lineWidth = Math.max(1, px * .02);
        g.beginPath();
        for (let i = 0; i < 2; i++) { const x0 = px * (.15 + r() * .7); g.moveTo(x0, 0); g.quadraticCurveTo(x0 + px * .05, px * .14, x0 - px * .02, px * (.18 + r() * .1)); }
        g.stroke();
      }
      if (bi === 3) {
        g.fillStyle = 'rgba(199,125,255,.85)';
        for (let i = 0; i < 2; i++) { const x0 = px * (.2 + r() * .6); g.beginPath(); g.moveTo(x0 - px * .03, 0); g.lineTo(x0 + px * .03, 0); g.lineTo(x0, px * .22); g.closePath(); g.fill(); }
      }
    } else if (kind === 'seam') {
      // Overgang naar een nieuwe laag: tanden van de nieuwe laag in de vorige, met een donkere naad.
      c = mk(px, px * .45);
      const g = c.getContext('2d');
      g.fillStyle = b.color;
      g.beginPath(); g.moveTo(0, px * .45);
      for (let x = 0; x <= px; x += px / 6) g.lineTo(x, px * (.06 + r() * .16));
      g.lineTo(px, px * .45); g.closePath(); g.fill();
      g.strokeStyle = rgba(b.dark, .9);
      g.lineWidth = Math.max(1, px * .04);
      g.stroke();
    } else if (kind === 'side') {
      // Zijkant (links van een gang, spiegelen voor rechts): een smalle, onregelmatige rand.
      c = mk(px * .16, px);
      const g = c.getContext('2d');
      g.fillStyle = mix(b.color, '#000000', .25);
      g.beginPath(); g.moveTo(0, 0);
      for (let y = 0; y <= px; y += px / 6) g.lineTo(px * (.03 + r() * .08), y);
      g.lineTo(0, px); g.closePath(); g.fill();
    } else if (kind === 'ao') {
      // Schaduw in de gang tegen een wand (bovenaan; draaien voor de andere kanten).
      c = mk(px, px * .45);
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, px * .45);
      grad.addColorStop(0, 'rgba(0,0,0,.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, px, px * .45);
    } else if (kind === 'corner') {
      // Afgeronde hoek (linksboven): grond die de hoek van een gang opvult.
      c = mk(px * .34, px * .34);
      const g = c.getContext('2d');
      const s = px * .34;
      g.fillStyle = b.color;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0); g.quadraticCurveTo(0, 0, 0, s); g.closePath(); g.fill();
      g.strokeStyle = mix(b.color, '#000000', .3);
      g.lineWidth = Math.max(1, px * .03);
      g.beginPath(); g.moveTo(s, 0); g.quadraticCurveTo(0, 0, 0, s); g.stroke();
    } else if (kind === 'beam') {
      // Houten stut: twee palen en een dwarsbalk, met ijzeren beslag.
      c = mk(px, px);
      const g = c.getContext('2d');
      const wood = (x, y, w, h) => {
        const gr = g.createLinearGradient(x, y, x + w, y);
        gr.addColorStop(0, '#7a5230'); gr.addColorStop(.5, '#5b3a20'); gr.addColorStop(1, '#3a2412');
        g.fillStyle = gr; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(0,0,0,.25)';
        for (let i = 1; i < 3; i++) g.fillRect(x + w * i / 3, y, Math.max(1, px * .01), h);
      };
      wood(px * .04, px * .08, px * .1, px * .92);
      wood(px * .86, px * .08, px * .1, px * .92);
      g.fillStyle = '#6b4526'; g.fillRect(0, px * .02, px, px * .1);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, px * .02, px, px * .02);
      g.fillStyle = '#8b93ad';
      for (const x of [.09, .91]) { g.fillRect(px * (x - .07), px * .1, px * .14, px * .035); g.beginPath(); g.arc(px * x, px * .07, px * .02, 0, 7); g.fill(); }
    } else if (kind === 'rung') {
      // Sport in een schacht: een plank tussen de wanden.
      c = mk(px, px * .14);
      const g = c.getContext('2d');
      g.fillStyle = '#5b3a20'; g.fillRect(0, px * .03, px, px * .08);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, px * .03, px, px * .02);
      g.fillStyle = '#8b93ad'; g.fillRect(px * .02, px * .02, px * .06, px * .1); g.fillRect(px * .92, px * .02, px * .06, px * .1);
    } else {
      // Lantaarn aan een haak.
      c = mk(px * .3, px * .45);
      const g = c.getContext('2d');
      g.strokeStyle = '#2b2b38'; g.lineWidth = Math.max(1, px * .02);
      g.beginPath(); g.moveTo(px * .15, 0); g.lineTo(px * .15, px * .12); g.stroke();
      g.fillStyle = '#2b2b38'; g.fillRect(px * .06, px * .12, px * .18, px * .04); g.fillRect(px * .06, px * .36, px * .18, px * .05);
      const fl = g.createLinearGradient(0, px * .16, 0, px * .36);
      fl.addColorStop(0, '#fff2b0'); fl.addColorStop(1, '#ff9a3c');
      g.fillStyle = fl; g.fillRect(px * .08, px * .16, px * .14, px * .2);
      g.fillStyle = '#2b2b38'; g.fillRect(px * .14, px * .16, px * .02, px * .2);
    }
    edgeCache.set(key, c);
    return c;
  }

  // ---------- De boorridder ----------
  const pods = new Map();
  // Het lijf zonder boor, naar rechts kijkend (spiegelen voor links). s = vakje in pixels.
  function podBody(color, s) {
    const key = `${color}|${s}`;
    let c = pods.get(key);
    if (c) return c;
    c = mk(s * 1.2, s * 1.2);
    const g = c.getContext('2d');
    g.translate(s * .6, s * .62);
    // Rupsbanden
    g.fillStyle = '#1d2030';
    AK.roundRect(g, -s * .4, s * .12, s * .8, s * .2, s * .1); g.fill();
    g.fillStyle = '#5a6078';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-s * .28 + i * s * .187, s * .22, s * .055, 0, 7); g.fill(); }
    // Romp in de kleur van de speler
    const body = g.createLinearGradient(0, -s * .3, 0, s * .16);
    body.addColorStop(0, AK.shade(color, .35)); body.addColorStop(.55, color); body.addColorStop(1, AK.shade(color, -.45));
    g.fillStyle = body;
    AK.roundRect(g, -s * .38, -s * .26, s * .72, s * .42, s * .12); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)';
    g.lineWidth = Math.max(1, s * .03);
    g.stroke();
    // Schildplaat met rune
    g.fillStyle = 'rgba(10,14,28,.55)';
    g.beginPath(); g.moveTo(-s * .26, -s * .12); g.lineTo(-s * .08, -s * .12); g.lineTo(-s * .08, s * .02); g.lineTo(-s * .17, s * .09); g.lineTo(-s * .26, s * .02); g.closePath(); g.fill();
    g.strokeStyle = '#ffc94a';
    g.lineWidth = Math.max(1, s * .025);
    g.beginPath(); g.moveTo(-s * .17, -s * .09); g.lineTo(-s * .17, s * .05); g.moveTo(-s * .22, -s * .04); g.lineTo(-s * .12, -s * .04); g.stroke();
    // Cockpit met vizier
    const glass = g.createLinearGradient(0, -s * .24, 0, s * .02);
    glass.addColorStop(0, '#bff3ff'); glass.addColorStop(1, '#1b6c9a');
    g.fillStyle = glass;
    AK.roundRect(g, s * .02, -s * .2, s * .26, s * .17, s * .07); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillRect(s * .06, -s * .17, s * .1, s * .03);
    // Helmkam / pluim
    g.fillStyle = AK.shade(color, .5);
    g.beginPath(); g.moveTo(-s * .2, -s * .26); g.quadraticCurveTo(-s * .05, -s * .48, s * .12, -s * .26); g.closePath(); g.fill();
    // Antenne met lampje
    g.strokeStyle = '#9aa3bd';
    g.lineWidth = Math.max(1, s * .025);
    g.beginPath(); g.moveTo(-s * .3, -s * .24); g.lineTo(-s * .34, -s * .42); g.stroke();
    g.fillStyle = '#ffc94a';
    g.beginPath(); g.arc(-s * .34, -s * .43, s * .04, 0, 7); g.fill();
    pods.set(key, c);
    return c;
  }

  // Boor: een kegel met draaiende strepen. dir: 'r', 'l', 'd'. spin loopt op tijdens het boren.
  function drill(ctx, s, dir, spin, active) {
    ctx.save();
    if (dir === 'd') { ctx.translate(0, s * .3); ctx.rotate(Math.PI / 2); }
    else { ctx.translate(dir === 'l' ? -s * .36 : s * .36, -s * .04); if (dir === 'l') ctx.scale(-1, 1); }
    const len = s * .3, half = s * .14;
    const grad = ctx.createLinearGradient(0, -half, 0, half);
    grad.addColorStop(0, '#f2f5ff'); grad.addColorStop(.5, '#9aa3bd'); grad.addColorStop(1, '#4a5068');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(0, -half); ctx.lineTo(len, 0); ctx.lineTo(0, half); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = active ? '#ffc94a' : 'rgba(30,34,50,.7)';
    ctx.lineWidth = Math.max(1, s * .025);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const f = ((spin * 3 + i / 3) % 1);
      const x = f * len;
      const hh = half * (1 - f);
      ctx.moveTo(x, -hh); ctx.lineTo(x + len * .12, hh);
    }
    ctx.stroke();
    ctx.restore();
  }

  function pod(ctx, x, y, s, color, o = {}) {
    const body = podBody(color, s);
    ctx.save();
    ctx.translate(x + (o.shake ? (Math.random() - .5) * s * .05 : 0), y);
    if (o.flash) ctx.globalAlpha = .45 + .55 * Math.abs(Math.sin(o.t * 20));
    if (o.flame) {
      // Stuwraketten bij het vliegen
      const f = .7 + Math.random() * .5;
      const fl = ctx.createLinearGradient(0, s * .3, 0, s * (.3 + .35 * f));
      fl.addColorStop(0, 'rgba(255,240,180,.95)'); fl.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = fl;
      for (const dx of [-.22, .2]) { ctx.beginPath(); ctx.moveTo(s * (dx - .07), s * .3); ctx.lineTo(s * dx, s * (.3 + .35 * f)); ctx.lineTo(s * (dx + .07), s * .3); ctx.fill(); }
    }
    const flip = o.face === 'l';
    if (o.dir !== 'd') drill(ctx, s, flip ? 'l' : 'r', o.spin || 0, o.drilling);
    else drill(ctx, s, 'd', o.spin || 0, o.drilling);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(body, -s * .6, -s * .62);
    ctx.restore();
  }

  // ---------- Hemel en burcht ----------
  let skyCache = null;
  function sky(w, h) {
    if (skyCache && skyCache.width === w && skyCache.height === h) return skyCache;
    const c = mk(w, h);
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#060818'); grad.addColorStop(.6, '#1b1440'); grad.addColorStop(1, '#3a1d5c');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${.3 + r() * .6})`; g.fillRect(r() * w, r() * h * .8, 1.5, 1.5); }
    for (const [x, y, rr, col] of [[.2, .35, .5, '#5b2a9e'], [.55, .2, .4, '#1d4fa8'], [.85, .5, .45, '#a02a7a']]) Glow.glow(g, w * x, h * y, Math.max(w, h) * rr * .5, col, .22);
    const moon = g.createRadialGradient(w * .8, h * .25, 0, w * .8, h * .25, h * .16);
    moon.addColorStop(0, 'rgba(255,240,210,.95)'); moon.addColorStop(.5, 'rgba(255,220,180,.4)'); moon.addColorStop(1, 'rgba(255,220,180,0)');
    g.fillStyle = moon;
    g.fillRect(0, 0, w, h);
    skyCache = c;
    return c;
  }

  // Burcht in de verte en de smidse op het oppervlak, één keer gebakken per vakgrootte.
  // Bergen, een burchtmuur met kantelen, ronde torens met spitse daken en vaandels, en een hoge donjon met verlichte ramen.
  const surfCache = new Map();
  function surface(px) {
    let c = surfCache.get(px);
    if (c) return c;
    const wpx = (W.COLS + 16) * px, hpx = Math.round(px * 5);
    c = mk(wpx, hpx);
    const g = c.getContext('2d');
    const r = rng(11);
    const base = hpx;
    // Bergen
    for (const [col, hh, step] of [['#1a1238', 2.6, 2.2], ['#140e2c', 1.9, 1.5]]) {
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, base);
      for (let x = 0; x <= wpx + px; x += px * step) g.lineTo(x, base - px * (hh * (.55 + r() * .45)));
      g.lineTo(wpx, base); g.closePath(); g.fill();
    }
    const stone = '#1d1538', lit = 'rgba(76,201,255,.55)', win = 'rgba(255,201,74,.85)';
    // Muur met kantelen
    const wallH = px * 1.1;
    g.fillStyle = stone;
    g.fillRect(0, base - wallH, wpx, wallH);
    for (let x = 0; x < wpx; x += px * .5) g.fillRect(x, base - wallH - px * .22, px * .28, px * .22);
    g.fillStyle = 'rgba(0,0,0,.25)';
    for (let y = base - wallH + px * .25; y < base; y += px * .28) g.fillRect(0, y, wpx, Math.max(1, px * .02));
    g.fillStyle = lit;
    g.fillRect(0, base - wallH, wpx, Math.max(1, px * .03));
    const flagCols = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#c77dff'];
    const tower = (x, tw, th, i) => {
      g.fillStyle = stone;
      g.fillRect(x, base - th, tw, th);
      g.fillStyle = 'rgba(255,255,255,.05)';
      g.fillRect(x, base - th, tw * .3, th);
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillRect(x + tw * .8, base - th, tw * .2, th);
      // Spits dak met een vaandel
      g.fillStyle = '#2a1d4d';
      g.beginPath(); g.moveTo(x - tw * .12, base - th); g.lineTo(x + tw / 2, base - th - tw * 1.1); g.lineTo(x + tw * 1.12, base - th); g.closePath(); g.fill();
      g.fillStyle = lit;
      g.fillRect(x - tw * .12, base - th, tw * 1.24, Math.max(1, px * .03));
      g.strokeStyle = '#9aa3bd'; g.lineWidth = Math.max(1, px * .03);
      const top = base - th - tw * 1.1;
      g.beginPath(); g.moveTo(x + tw / 2, top); g.lineTo(x + tw / 2, top - px * .45); g.stroke();
      g.fillStyle = flagCols[i % flagCols.length];
      g.beginPath(); g.moveTo(x + tw / 2, top - px * .45); g.lineTo(x + tw / 2 + px * .4, top - px * .36); g.lineTo(x + tw / 2, top - px * .26); g.closePath(); g.fill();
      // Ramen
      g.fillStyle = win;
      for (let k = 0; k < Math.floor(th / px) - 1; k++) {
        if (r() < .35) continue;
        const wy = base - th + px * (.45 + k * .8);
        g.fillRect(x + tw * .42, wy, tw * .16, px * .22);
        g.beginPath(); g.arc(x + tw * .5, wy, tw * .08, Math.PI, 0); g.fill();
      }
    };
    let i = 0;
    for (let x = px * .5; x < wpx; x += px * (3.2 + r() * 1.4), i++) tower(x, px * (.8 + r() * .35), px * (1.7 + r() * .9), i);
    // Donjon in het midden
    const kx = wpx / 2 - px * 1.2, kw = px * 2.4, kh = px * 3.3;
    g.fillStyle = '#211843';
    g.fillRect(kx, base - kh, kw, kh);
    for (let x = kx; x < kx + kw; x += kw / 5) g.fillRect(x, base - kh - px * .25, kw / 10, px * .25);
    g.fillStyle = lit;
    g.fillRect(kx, base - kh, kw, Math.max(1, px * .03));
    g.fillStyle = win;
    for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) {
      const wx = kx + kw * (.25 + k * .25) - px * .08, wy = base - kh + px * (.6 + j * .9);
      g.fillRect(wx, wy, px * .16, px * .3);
    }
    // Groot vaandel aan de donjon
    g.fillStyle = '#7a1630';
    g.fillRect(kx + kw * .4, base - kh + px * .3, kw * .2, px * 1.3);
    g.beginPath(); g.moveTo(kx + kw * .4, base - kh + px * 1.6); g.lineTo(kx + kw * .5, base - kh + px * 1.4); g.lineTo(kx + kw * .6, base - kh + px * 1.6); g.fill();
    g.fillStyle = '#ffc94a';
    g.beginPath(); g.moveTo(kx + kw * .5, base - kh + px * .55); g.lineTo(kx + kw * .56, base - kh + px * .8); g.lineTo(kx + kw * .5, base - kh + px * 1.05); g.lineTo(kx + kw * .44, base - kh + px * .8); g.closePath(); g.fill();
    surfCache.set(px, c);
    return c;
  }

  // Het erf boven de mijn: een schachttoren met wiel, fakkels, een hek en een mijnkar vol erts.
  // Gebakken per vakgrootte; de fakkelvlammen tekenen we per frame (yardTorches, in vakjes).
  const yardTorches = [[1.5, -1.45], [10.6, -1.45], [21.4, -1.45]];
  const yardCache = new Map();
  function yard(px) {
    let c = yardCache.get(px);
    if (c) return c;
    const hh = px * 3.2;
    c = mk(W.COLS * px, hh);
    const g = c.getContext('2d');
    const r = rng(23);
    const base = hh;
    const wood = '#6b4526', woodDark = '#3a2412';
    // Hek
    g.fillStyle = woodDark;
    for (let x = px * .2; x < px * 4; x += px * .45) g.fillRect(x, base - px * .55, px * .09, px * .55);
    g.fillStyle = wood;
    g.fillRect(px * .1, base - px * .45, px * 4, px * .07);
    g.fillRect(px * .1, base - px * .25, px * 4, px * .07);
    // Schachttoren (bok met wiel) boven een oude schacht
    const tx = px * 6.5;
    g.strokeStyle = wood; g.lineWidth = px * .12; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(tx - px * .9, base); g.lineTo(tx, base - px * 2.6);
    g.moveTo(tx + px * .9, base); g.lineTo(tx, base - px * 2.6);
    g.moveTo(tx - px * .6, base - px * .9); g.lineTo(tx + px * .6, base - px * .9);
    g.moveTo(tx - px * .35, base - px * 1.75); g.lineTo(tx + px * .35, base - px * 1.75);
    g.stroke();
    g.strokeStyle = woodDark; g.lineWidth = px * .05;
    g.beginPath(); g.moveTo(tx - px * .6, base - px * .9); g.lineTo(tx + px * .35, base - px * 1.75); g.moveTo(tx + px * .6, base - px * .9); g.lineTo(tx - px * .35, base - px * 1.75); g.stroke();
    // Wiel
    g.strokeStyle = '#9aa3bd'; g.lineWidth = px * .07;
    g.beginPath(); g.arc(tx, base - px * 2.55, px * .45, 0, 7); g.stroke();
    g.lineWidth = px * .03;
    g.beginPath();
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.moveTo(tx, base - px * 2.55); g.lineTo(tx + Math.cos(a) * px * .45, base - px * 2.55 + Math.sin(a) * px * .45); }
    g.stroke();
    g.fillStyle = '#ffc94a';
    g.beginPath(); g.arc(tx, base - px * 2.55, px * .08, 0, 7); g.fill();
    // Touw en emmer
    g.strokeStyle = '#c9b48a'; g.lineWidth = Math.max(1, px * .025);
    g.beginPath(); g.moveTo(tx + px * .45, base - px * 2.55); g.lineTo(tx + px * .45, base - px * .7); g.stroke();
    g.fillStyle = '#4a4560';
    g.fillRect(tx + px * .3, base - px * .7, px * .3, px * .28);
    // Fakkelpalen
    for (const [fx] of yardTorches) {
      const x = fx * px;
      g.fillStyle = woodDark; g.fillRect(x - px * .05, base - px * 1.4, px * .1, px * 1.4);
      g.fillStyle = '#8a7a50';
      g.beginPath(); g.moveTo(x - px * .16, base - px * 1.45); g.lineTo(x + px * .16, base - px * 1.45); g.lineTo(x + px * .08, base - px * 1.3); g.lineTo(x - px * .08, base - px * 1.3); g.closePath(); g.fill();
    }
    // Mijnkar met erts bij de smidse
    const cx = px * 12.6;
    g.fillStyle = '#4a4560';
    g.beginPath(); g.moveTo(cx, base - px * .75); g.lineTo(cx + px * 1.1, base - px * .75); g.lineTo(cx + px * .95, base - px * .25); g.lineTo(cx + px * .15, base - px * .25); g.closePath(); g.fill();
    g.fillStyle = '#6b7184'; g.fillRect(cx, base - px * .78, px * 1.1, px * .07);
    for (const [col, ox] of [['#e07b39', .25], ['#ffc94a', .5], ['#4cc9ff', .75], ['#b9c2d0', .4], ['#e8f1ff', .62]]) {
      g.fillStyle = col;
      g.beginPath(); g.arc(cx + px * ox * 1.1, base - px * (.8 + r() * .08), px * .11, Math.PI, 0); g.fill();
    }
    g.fillStyle = '#1d2030';
    for (const ox of [.3, .8]) { g.beginPath(); g.arc(cx + px * ox, base - px * .2, px * .14, 0, 7); g.fill(); }
    // Grasplukjes en steentjes
    g.strokeStyle = '#3f8f4a'; g.lineWidth = Math.max(1, px * .03);
    g.beginPath();
    for (let k = 0; k < 40; k++) { const x = r() * W.COLS * px; g.moveTo(x, base); g.lineTo(x + (r() - .5) * px * .15, base - px * (.08 + r() * .14)); }
    g.stroke();
    g.fillStyle = '#5a5470';
    for (let k = 0; k < 8; k++) { g.beginPath(); g.ellipse(r() * W.COLS * px, base - px * .03, px * (.06 + r() * .08), px * .05, 0, Math.PI, 0); g.fill(); }
    yardCache.set(px, c);
    return c;
  }

  const forgeCache = new Map();
  function forge(px) {
    let c = forgeCache.get(px);
    if (c) return c;
    c = mk(px * 4, px * 3);
    const g = c.getContext('2d');
    // Stenen smidse met een gloeiende oven en een neonbord.
    g.fillStyle = '#3b3550';
    g.fillRect(px * .3, px * 1.1, px * 3.4, px * 1.9);
    g.fillStyle = '#2a2540';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 7; x++) g.fillRect(px * (.3 + x * .5 + (y % 2) * .25), px * (1.15 + y * .47), px * .46, px * .43);
    g.fillStyle = '#5b2a2a';
    g.beginPath(); g.moveTo(px * .1, px * 1.15); g.lineTo(px * 2, px * .35); g.lineTo(px * 3.9, px * 1.15); g.closePath(); g.fill();
    g.fillStyle = '#4a4560';
    g.fillRect(px * 2.8, px * .2, px * .4, px * .8);
    const oven = g.createRadialGradient(px * 1.2, px * 2.5, 0, px * 1.2, px * 2.5, px * .7);
    oven.addColorStop(0, '#fff0b0'); oven.addColorStop(.4, '#ff8c42'); oven.addColorStop(1, 'rgba(255,90,30,0)');
    g.fillStyle = oven;
    g.fillRect(px * .5, px * 1.8, px * 1.4, px * 1.2);
    g.fillStyle = '#ff8c42';
    AK.roundRect(g, px * .85, px * 2.2, px * .7, px * .8, px * .3); g.fill();
    // Neonbord
    g.fillStyle = 'rgba(6,10,19,.9)';
    AK.roundRect(g, px * 1.95, px * 1.4, px * 1.6, px * .55, px * .1); g.fill();
    g.strokeStyle = '#ffc94a';
    g.lineWidth = Math.max(1, px * .04);
    g.stroke();
    g.fillStyle = '#ffc94a';
    g.font = `900 ${Math.round(px * .32)}px Orbitron, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('SMIDSE', px * 2.75, px * 1.68);
    // Aambeeld
    g.fillStyle = '#9aa3bd';
    g.fillRect(px * 2.3, px * 2.45, px * .9, px * .18);
    g.fillRect(px * 2.55, px * 2.6, px * .4, px * .4);
    forgeCache.set(px, c);
    return c;
  }

  // Donker met een gat van licht rond je lamp: twee keer zo groot als het scherm, zodat we het kunnen verschuiven.
  let maskCache = null;
  function mask(w, h, px) {
    if (maskCache && maskCache.w === w && maskCache.h === h && maskCache.px === px) return maskCache.c;
    const c = mk(w * 2, h * 2);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(w, h, px * .8, w, h, px * 4.2);
    grad.addColorStop(0, 'rgba(2,3,10,0)'); grad.addColorStop(.55, 'rgba(2,3,10,.55)'); grad.addColorStop(1, 'rgba(2,3,10,1)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w * 2, h * 2);
    maskCache = { w, h, px, c };
    return c;
  }

  // ---------- Leerling: de mijn rond je boor ----------
  // v: { seed, dug:Set, x, y (vakjes, mag een kommagetal), face, dir, drilling, spin, flame, flash, color, t, cam:{x,y}, fx:Particles }
  function render(ctx, v, w, h) {
    const px = Math.max(24, Math.round(Math.min(w / 13, h / 9.5)));
    v.px = px;
    // Camera volgt vloeiend; bovenaan zie je meer hemel.
    const tx = (v.x + .5) * px, ty = (v.y + .5) * px - (v.y < 2 ? h * .12 : 0);
    if (!v.cam || v.cam.px !== px) v.cam = { x: tx, y: ty, px };
    v.cam.x += (tx - v.cam.x) * Math.min(1, v.dt * 8);
    v.cam.y += (ty - v.cam.y) * Math.min(1, v.dt * 8);
    const mineW = W.COLS * px;
    let cx = v.cam.x;
    if (w >= mineW + px * 2) cx = mineW / 2;
    else cx = Math.max(w / 2 - px, Math.min(mineW + px - w / 2, cx));
    const cy = v.cam.y;
    const ox = Math.round(w / 2 - cx), oy = Math.round(h / 2 - cy);

    ctx.fillStyle = '#03050b';
    ctx.fillRect(0, 0, w, h);
    // Hemel boven de grond
    if (oy > 0) {
      ctx.drawImage(sky(w, Math.max(2, Math.min(h, oy))), 0, 0);
      const s = surface(px);
      ctx.drawImage(s, Math.round(ox * .5 - px * 8), oy - s.height);
      const yd = yard(px);
      ctx.drawImage(yd, ox, oy - yd.height);
      const f = forge(px);
      ctx.drawImage(f, ox + px * 14, oy - f.height);
      for (const [tx, ty] of yardTorches) {
        const fx = ox + tx * px, fy = oy + ty * px;
        if (fx < -px * 2 || fx > w + px * 2 || fy < -px * 2) continue;
        const fl = .82 + Math.sin(v.t * 13 + tx) * .1 + Math.sin(v.t * 7.3 + tx * .37) * .08;
        Glow.glow(ctx, fx, fy, px * 1.3 * fl, '#ff8a2a', .7 * fl);
        Glow.glow(ctx, fx, fy - px * .05, px * .35 * fl, '#fff2b0', .95);
      }
      // Gras-randje met neon
      ctx.fillStyle = '#2e6b3a';
      ctx.fillRect(ox - px * 2, oy - px * .08, mineW + px * 4, px * .14);
      ctx.fillStyle = 'rgba(74,222,128,.7)';
      ctx.fillRect(ox - px * 2, oy - px * .1, mineW + px * 4, Math.max(1, px * .03));
    }

    const x0 = Math.floor(-ox / px), x1 = Math.ceil((w - ox) / px);
    const y0 = Math.max(0, Math.floor(-oy / px)), y1 = Math.min(W.ROWS, Math.ceil((h - oy) / px));
    const sparkle = [];
    for (let y = y0; y < y1; y++) {
      const bi = bandIndex(y);
      for (let x = x0; x < x1; x++) {
        let t;
        if (x < 0 || x >= W.COLS) t = T.ROTS;
        else if (v.dug.has(y * W.COLS + x)) t = T.LEEG;
        else t = W.tile(v.seed, x, y);
        const variant = (x * 7 + y * 13) % 3;
        ctx.drawImage(tileSprite(t, bi, variant, px), ox + x * px, oy + y * px);
        if (t >= T.ZILVER && t <= T.NEON) sparkle.push(x, y, t);
      }
    }
    // Bodem van de mijn
    if (y1 >= W.ROWS) { ctx.fillStyle = '#17141f'; ctx.fillRect(0, oy + W.ROWS * px, w, h); }
    const lamps = edges(ctx, v, ox, oy, px, x0, x1, y0, y1);

    // Vonken en puin (in wereldpixels)
    ctx.save();
    ctx.translate(ox, oy);
    if (v.fx) drawParticles(ctx, v.fx);
    ctx.restore();

    const sx = ox + (v.x + .5) * px, sy = oy + (v.y + .5) * px;
    pod(ctx, sx, sy, px, v.color, v);

    // Licht: hoe dieper, hoe donkerder, behalve rond je lamp.
    const dark = Math.max(0, Math.min(.9, (v.y - 4) / 45));
    if (dark > 0) {
      ctx.save();
      ctx.globalAlpha = dark;
      ctx.drawImage(mask(w, h, px), w - sx, h - sy, w, h, 0, 0, w, h);
      ctx.restore();
      // Edelstenen schitteren ook in het donker.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < sparkle.length; i += 3) {
        const a = .5 + .5 * Math.sin(v.t * 3 + sparkle[i] * 1.7 + sparkle[i + 1]);
        if (a < .55) continue;
        Glow.glow(ctx, ox + (sparkle[i] + .5) * px, oy + (sparkle[i + 1] + .5) * px, px * .45, W.ORES[sparkle[i + 2]].color, (a - .5) * dark * 1.2);
      }
      ctx.restore();
    }
    // Lantaarns in de gangen schijnen door het donker.
    for (let i = 0; i < lamps.length; i += 2) {
      const fl = .85 + Math.sin(v.t * 9 + lamps[i] * .05) * .08 + Math.sin(v.t * 5.3 + lamps[i + 1] * .03) * .07;
      Glow.glow(ctx, lamps[i], lamps[i + 1], px * 1.6 * fl, '#ff9a3c', .45 * fl);
      Glow.glow(ctx, lamps[i], lamps[i + 1], px * .35, '#fff2b0', .8);
    }
  }

  // Randen, schaduw, stutten en lantaarns rond de gangen in beeld. Geeft de lantaarns terug (schermpixels).
  function edges(ctx, v, ox, oy, px, x0, x1, y0, y1) {
    const openAt = (x, y) => {
      if (y < 0) return true;
      if (x < 0 || x >= W.COLS || y >= W.ROWS) return false;
      return v.dug.has(y * W.COLS + x) || W.tile(v.seed, x, y) === T.LEEG;
    };
    const lamps = [];
    const ao = [], solidEdge = [], props = [];
    for (let y = Math.max(0, y0 - 1); y < Math.min(W.ROWS, y1 + 1); y++) {
      const bi = bandIndex(y);
      for (let x = x0; x < x1; x++) {
        const sx = ox + x * px, sy = oy + y * px;
        const o = openAt(x, y);
        const n = openAt(x, y - 1), s = openAt(x, y + 1), wl = openAt(x - 1, y), e = openAt(x + 1, y);
        if (o) {
          if (!n) ao.push(0, sx, sy, bi);
          if (!wl) ao.push(1, sx, sy, bi);
          if (!e) ao.push(2, sx, sy, bi);
          if (!s) ao.push(3, sx, sy, bi);
          if (!n && !wl) ao.push(4, sx, sy, bi);
          if (!n && !e) ao.push(5, sx, sy, bi);
          if (!s && !wl) ao.push(6, sx, sy, bi);
          if (!s && !e) ao.push(7, sx, sy, bi);
          if (y < 1) continue;
          const h = W.hash(v.seed + 3, x, y);
          if (!n && !s && wl && e && h < .3) props.push(0, sx, sy, bi);
          else if (!wl && !e && n && s && y % 3 === 0) props.push(1, sx, sy, bi);
          if (!n && h > .86) { props.push(2, sx, sy, bi); lamps.push(sx + px * .5, sy + px * .3); }
        } else if (x >= 0 && x < W.COLS) {
          if (bi > 0 && y === W.BANDS[bi - 1].to && !n) solidEdge.push(4, sx, sy, bi);
          if (n) solidEdge.push(0, sx, sy, bi);
          if (s) solidEdge.push(1, sx, sy, bi);
          if (wl) solidEdge.push(2, sx, sy, bi);
          if (e) solidEdge.push(3, sx, sy, bi);
        }
      }
    }
    for (let i = 0; i < ao.length; i += 4) {
      const k = ao[i], sx = ao[i + 1], sy = ao[i + 2], bi = ao[i + 3];
      if (k < 4) ctx.drawImage(turned('ao', bi, px, k), sx, sy);
      else {
        const img = turned('corner', bi, px, k);
        ctx.drawImage(img, sx + (k === 5 || k === 7 ? px - img.width : 0), sy + (k >= 6 ? px - img.height : 0));
      }
    }
    for (let i = 0; i < solidEdge.length; i += 4) {
      const k = solidEdge[i], sx = solidEdge[i + 1], sy = solidEdge[i + 2], bi = solidEdge[i + 3];
      if (k === 0) ctx.drawImage(edgeSprite('lip', bi, px), sx, sy - px * .1);
      else if (k === 1) ctx.drawImage(edgeSprite('drip', bi, px), sx, sy + px);
      else if (k === 4) ctx.drawImage(edgeSprite('seam', bi, px), sx, sy - px * .2);
      else {
        const img = turned('side', bi, px, k);
        ctx.drawImage(img, k === 2 ? sx - img.width : sx + px, sy);
      }
    }
    for (let i = 0; i < props.length; i += 4) {
      const k = props[i], sx = props[i + 1], sy = props[i + 2], bi = props[i + 3];
      if (k === 0) ctx.drawImage(edgeSprite('beam', bi, px), sx, sy);
      else if (k === 1) ctx.drawImage(edgeSprite('rung', bi, px), sx, sy + px * .4);
      else ctx.drawImage(edgeSprite('lamp', bi, px), sx + px * .35, sy + px * .02);
    }
    return lamps;
  }

  function drawParticles(ctx, fx) {
    for (const p of fx.list) {
      const a = Math.max(0, p.life / p.max);
      if (p.text) {
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.font = `900 ${p.size}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.smoke) {
        ctx.globalAlpha = a * .8;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - a * .6), 0, 7); ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Kleur van een vakje voor puin.
  function chipColor(type, y) {
    if (W.ORES[type]) return W.ORES[type].color;
    if (type === T.LAVA) return '#ff8c42';
    if (type === T.GAS) return '#a3e635';
    const b = W.band(y);
    return type === T.STEEN ? mix(b.color, '#6b7184', .55) : mix(b.color, '#ffffff', .2);
  }

  // ---------- Bord: alle mijnen als doorsnede naast elkaar ----------
  // Elke leerling krijgt een klein canvas met 3 × 3 pixels per vakje (72 × 780): genoeg voor een lichte en een donkere
  // kant per blok. Boven elke mijn staat een schachttoren met een vaandel in de kleur van de speler; die en de
  // achtergrond worden één keer gebakken (opnieuw als de spelers veranderen).
  const S = 3;
  const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const markCache = new Map();
  function marker(color, s) {
    const key = `${color}|${s}`;
    let c = markCache.get(key);
    if (c) return c;
    c = mk(s * 1.4, s * 1.6);
    const g = c.getContext('2d');
    pod(g, s * .7, s * .62, s, color, { dir: 'd' });
    markCache.set(key, c);
    return c;
  }
  class Board {
    constructor(seed) {
      this.seed = seed;
      this.mines = new Map();
      this.pos = new Map();
      this.base = null;
      this.bg = null;
      this.frameKey = '';
    }
    baseImage() {
      if (this.base) return this.base;
      const img = new ImageData(W.COLS * S, W.ROWS * S);
      const d = img.data, rowW = W.COLS * S;
      for (let y = 0; y < W.ROWS; y++) {
        const b = W.band(y);
        for (let x = 0; x < W.COLS; x++) {
          const t = W.tile(this.seed, x, y);
          // Nog niet uitgegraven grond is gedempt; zo springen de gangen van de leerling eruit.
          let col;
          if (W.ORES[t]) col = mix(b.color, W.ORES[t].color, t >= T.GOUD ? .65 : .35);
          else if (t === T.LAVA) col = '#e2551a';
          else if (t === T.GAS) col = mix(b.color, '#6fbf4a', .55);
          else if (t === T.ROTS) col = '#1a1724';
          else if (t === T.LEEG) col = '#07060c';
          else if (t === T.STEEN) col = mix(b.color, '#6b7184', .45);
          else col = W.hash(this.seed, x, y) < .5 ? b.color : mix(b.color, b.dark, .15);
          if (t !== T.LEEG && t !== T.ROTS && t !== T.LAVA) col = mix(col, '#05060d', W.ORES[t] ? .3 : .42);
          const [cr, cg, cb] = hex(col);
          const bright = W.ORES[t] && t >= T.ZILVER;
          for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
            // Lichte kant linksboven, donkere kant rechtsonder; edelstenen hebben een fonkelend middenpixel.
            let f = 1;
            if (t !== T.LEEG && t !== T.AARDE) f = j === 0 || i === 0 ? 1.28 : j === S - 1 || i === S - 1 ? .7 : 1;
            else if (t === T.AARDE) f = .96 + W.hash(this.seed + 5, x * S + i, y * S + j) * .08;
            if (bright && i === 1 && j === 1) f = 1.9;
            // Hoe dichter bij de bodem, hoe meer het magma gloeit.
            const heat = Math.max(0, (y - 200) / 60);
            const k = ((y * S + j) * rowW + x * S + i) * 4;
            d[k] = Math.min(255, cr * f + heat * 70); d[k + 1] = Math.min(255, cg * f + heat * 18); d[k + 2] = Math.min(255, cb * f); d[k + 3] = 255;
          }
        }
      }
      this.base = img;
      return img;
    }
    mine(n, color) {
      let m = this.mines.get(n);
      if (m) return m;
      const c = mk(W.COLS * S, W.ROWS * S);
      const img = new ImageData(new Uint8ClampedArray(this.baseImage().data), W.COLS * S, W.ROWS * S);
      const tunnel = mix(color || '#4cc9ff', '#000000', .45);
      m = { c, ctx: c.getContext('2d'), img, dirty: true, tunnel: hex(tunnel), core: hex(mix(color || '#4cc9ff', '#ffffff', .1)) };
      this.mines.set(n, m);
      return m;
    }
    // Een gegraven vakje: donkere gangkleur van de speler met een lichtere kern, zodat het spoor oplicht.
    dig(n, cell, color) {
      const m = this.mine(n, color);
      const x = cell % W.COLS, y = Math.floor(cell / W.COLS), rowW = W.COLS * S;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const k = ((y * S + j) * rowW + x * S + i) * 4;
        const c = i === 1 && j === 1 ? m.core : m.tunnel;
        m.img.data[k] = c[0]; m.img.data[k + 1] = c[1]; m.img.data[k + 2] = c[2];
      }
      m.dirty = true;
    }
    setDug(list, roster) {
      for (const [n, cells] of list) {
        const r = roster.get(n);
        for (const c of cells) this.dig(n, c, r && r.color);
      }
    }
    move(k) {
      for (const [n, x, y] of k) {
        const p = this.pos.get(n);
        if (p) { p.tx = x; p.ty = y; } else this.pos.set(n, { x, y, tx: x, ty: y });
      }
    }
    update(dt) {
      const f = Math.min(1, dt * 8);
      for (const p of this.pos.values()) { p.x += (p.tx - p.x) * f; p.y += (p.ty - p.y) * f; }
    }
    // Hemel, burcht, lagen met een stenen naambordje en dieptestreepjes.
    background(w, h, top, gut, mineH) {
      if (this.bg && this.bg.width === w && this.bg.height === h) return this.bg;
      const c = mk(w, h);
      const g = c.getContext('2d');
      g.drawImage(sky(w, top), 0, 0);
      const s = surface(Math.max(10, Math.round(top / 5)));
      for (let x = 0; x < w; x += s.width) g.drawImage(s, x, top - s.height);
      g.fillStyle = '#2e6b3a';
      g.fillRect(0, top - 3, w, 3);
      g.fillStyle = '#05060d';
      g.fillRect(0, top, w, h - top);
      const sy = mineH / W.ROWS;
      const r = rng(17);
      let from = 0;
      for (const b of W.BANDS) {
        const y = top + from * sy, hh = (b.to - from) * sy;
        // De grond tussen de mijnen: laagkleur met kiezels en een gekartelde overgang naar de volgende laag.
        const gr = g.createLinearGradient(0, y, 0, y + hh);
        gr.addColorStop(0, mix(b.color, '#05060d', .45)); gr.addColorStop(1, mix(b.dark, '#05060d', .35));
        g.fillStyle = gr;
        g.fillRect(0, y, w, hh);
        for (let i = 0; i < w * hh / 260; i++) {
          g.fillStyle = r() < .5 ? rgba(b.dark, .7) : rgba(b.color, .35);
          g.beginPath(); g.ellipse(r() * w, y + r() * hh, 1 + r() * 2.5, 1 + r() * 1.5, 0, 0, 7); g.fill();
        }
        if (b.to < W.ROWS) {
          g.fillStyle = 'rgba(0,0,0,.45)';
          g.beginPath(); g.moveTo(0, y + hh);
          for (let x = 0; x <= w; x += 14) g.lineTo(x, y + hh + (r() - .5) * 6);
          g.lineTo(w, y + hh + 4); g.lineTo(0, y + hh + 4); g.closePath(); g.fill();
        }
        // Stenen naambordje in de goot, met een rand in de laagkleur
        const pw = gut * .5, ph = Math.min(hh - 10, Math.max(60, hh * .7));
        const px0 = gut * .2, py0 = y + (hh - ph) / 2;
        g.fillStyle = '#1b1828';
        AK.roundRect(g, px0, py0, pw, ph, 6); g.fill();
        g.strokeStyle = rgba(b.color === '#4a1c1c' ? '#ff6b3d' : mix(b.color, '#ffffff', .35), .9);
        g.lineWidth = 2;
        g.stroke();
        g.fillStyle = '#4a4560';
        for (const yy of [py0 + 6, py0 + ph - 6]) { g.beginPath(); g.arc(px0 + pw / 2, yy, 2, 0, 7); g.fill(); }
        g.save();
        g.translate(px0 + pw / 2, py0 + ph / 2);
        g.rotate(-Math.PI / 2);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `800 ${Math.round(Math.max(10, Math.min(pw * .5, gut * .2)))}px Orbitron, sans-serif`;
        g.fillStyle = '#e8f1ff';
        g.fillText(b.name.toUpperCase(), 0, 0);
        g.restore();
        from = b.to;
      }
      // Dieptestreepjes om de 10 m
      for (let m = 10; m < W.ROWS; m += 10) {
        const y = top + m * sy;
        g.fillStyle = m % 50 === 0 ? 'rgba(255,201,74,.85)' : 'rgba(232,241,255,.35)';
        g.fillRect(gut * .8, y, gut * .2 - 2, m % 50 === 0 ? 2 : 1);
      }
      this.bg = c;
      return c;
    }
    // Alles wat alleen van de spelers en de schermgrootte afhangt: achtergrond, mijnkaders, schachttorens met vaandel, namen.
    layout(w, h, list, dpr) {
      const key = `${w}|${h}|${dpr}|${list.map(r => `${r.n}:${r.name}:${r.color}`).join(',')}`;
      if (this.frame && this.frameKey === key) return this.frame;
      const top = Math.round(h * .12), gut = Math.round(60 * dpr);
      const mineH = h - top - 4;
      const n = Math.max(1, list.length);
      const gap = Math.max(4, Math.round(8 * dpr));
      const sy = mineH / W.ROWS;
      let colW = (w - gut - gap * (n + 1)) / n;
      colW = Math.min(colW, W.COLS * sy * 2.4);
      const x0 = gut + (w - gut - (colW + gap) * n + gap) / 2;
      const c = this.frame && this.frame.width === w && this.frame.height === h ? this.frame : mk(w, h);
      const g = c.getContext('2d');
      g.clearRect(0, 0, w, h);
      g.drawImage(this.background(w, h, top, gut, mineH), 0, 0);
      const font = Math.round(Math.max(9, Math.min(15 * dpr, colW / 5)));
      const cols = [];
      const torches = [];
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const x = Math.round(x0 + i * (colW + gap)), cw = Math.round(colW);
        cols.push({ r, x, cw });
        // Houten kader met ijzeren banden om de schacht
        g.fillStyle = '#2a1a0e';
        g.fillRect(x - 3, top - 2, cw + 6, mineH + 4);
        g.fillStyle = '#5b3a20';
        g.fillRect(x - 3, top - 2, 2, mineH + 4);
        g.fillRect(x + cw + 1, top - 2, 2, mineH + 4);
        g.fillStyle = '#6b7184';
        for (const b of W.BANDS) if (b.to < W.ROWS) g.fillRect(x - 4, top + b.to * sy - 2, cw + 8, 3);
        // Schachttoren boven de mijn: twee schuine poten, een dwarsbalk, een wiel en een vaandel in de spelerskleur.
        const th = Math.min(top * .62, cw * 1.1), cx = x + cw / 2, base = top - 2;
        g.strokeStyle = '#6b4526'; g.lineWidth = Math.max(2, cw * .07); g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x + cw * .08, base); g.lineTo(cx, base - th);
        g.moveTo(x + cw * .92, base); g.lineTo(cx, base - th);
        g.moveTo(x + cw * .25, base - th * .45); g.lineTo(x + cw * .75, base - th * .45);
        g.stroke();
        g.strokeStyle = '#9aa3bd'; g.lineWidth = Math.max(1.5, cw * .035);
        g.beginPath(); g.arc(cx, base - th, Math.max(4, cw * .16), 0, 7); g.stroke();
        g.fillStyle = r.color;
        const fw = Math.max(8, cw * .28), fh = Math.max(10, th * .38);
        g.beginPath(); g.moveTo(cx - fw / 2, base - th * .42); g.lineTo(cx + fw / 2, base - th * .42); g.lineTo(cx + fw / 2, base - th * .42 + fh); g.lineTo(cx, base - th * .42 + fh * .75); g.lineTo(cx - fw / 2, base - th * .42 + fh); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.3)';
        g.fillRect(cx - fw / 2, base - th * .42, fw, Math.max(1, fh * .12));
        torches.push([x - 1, base - th * .2], [x + cw + 1, base - th * .2]);
        // Naam op een donker plankje
        let name = r.name;
        g.font = `800 ${font}px Orbitron, sans-serif`;
        while (name.length > 2 && g.measureText(name).width > colW + gap * .5) name = name.slice(0, -1);
        if (name !== r.name) name = `${name.slice(0, -1)}…`;
        const nw = Math.min(cw + gap, g.measureText(name).width + 10);
        g.fillStyle = 'rgba(6,8,18,.78)';
        AK.roundRect(g, cx - nw / 2, base - th - font * 1.55, nw, font * 1.3, 4); g.fill();
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = r.color;
        g.fillText(name, cx, base - th - font * .9);
      }
      // Fakkelhouders
      g.fillStyle = '#8a7a50';
      for (const [tx, ty] of torches) g.fillRect(tx - 2, ty, 4, 7);
      this.frame = c;
      this.frameKey = key;
      this.geo = { top, mineH, sy, colW, font, cols, torches };
      return c;
    }
    // roster: Map n -> {name, color}
    render(ctx, w, h, roster, opts = {}) {
      const dpr = opts.dpr || 1, t = opts.t || 0;
      const list = [...roster.values()].sort((a, b) => a.n - b.n);
      ctx.drawImage(this.layout(w, h, list, dpr), 0, 0);
      const { top, mineH, sy, colW, font, cols, torches } = this.geo;
      ctx.imageSmoothingEnabled = false;
      for (const { r, x, cw } of cols) {
        const m = this.mine(r.n, r.color);
        if (m.dirty) { m.ctx.putImageData(m.img, 0, 0); m.dirty = false; }
        ctx.drawImage(m.c, x, top, cw, mineH);
      }
      ctx.imageSmoothingEnabled = true;
      for (const [tx, ty] of torches) {
        const fl = .8 + Math.sin(t * 13 + tx) * .1 + Math.sin(t * 7.3 + tx * .37) * .1;
        Glow.glow(ctx, tx, ty - 3, 16 * dpr * fl, '#ff8a2a', .7 * fl);
        Glow.glow(ctx, tx, ty - 4, 5 * dpr * fl, '#fff2b0', .95);
      }
      // De boorridders zelf, met hun kleur als licht en de diepte erboven.
      const ms = Math.max(12 * dpr, Math.min(colW * .7, 30 * dpr));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = `700 ${Math.round(font * .85)}px Orbitron, sans-serif`;
      for (const { r, x, cw } of cols) {
        const p = this.pos.get(r.n);
        if (!p) continue;
        const py = Math.max(-1, p.y);
        const dx = x + (p.x + .5) / W.COLS * cw, dy = top + (py + .5) * sy;
        Glow.glow(ctx, dx, dy, ms * 1.4, r.color, .75);
        Glow.glow(ctx, dx, dy + ms * .5, ms * .9, '#fff2b0', .25);
        const img = marker(r.color, Math.round(ms));
        ctx.drawImage(img, dx - img.width / 2, dy - ms * .62);
        if (py > 1) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(5,6,13,.85)';
          ctx.strokeText(`${Math.round(py)}`, dx, dy - ms * .6);
          ctx.fillStyle = '#e8f1ff';
          ctx.fillText(`${Math.round(py)}`, dx, dy - ms * .6);
        }
      }
    }
  }

  return { render, pod, chipColor, Board, tileSprite };
})();
