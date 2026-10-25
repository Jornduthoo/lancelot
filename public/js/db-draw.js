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
    const ground = (base, dark) => {
      g.fillStyle = base;
      g.fillRect(0, 0, px, px);
      for (let i = 0; i < 9; i++) {
        g.fillStyle = r() < .5 ? rgba(dark, .5) : 'rgba(255,255,255,.07)';
        const s = px * (.06 + r() * .12);
        g.fillRect(r() * (px - s), r() * (px - s), s, s * (.6 + r() * .6));
      }
      // Een randje licht bovenaan, schaduw onderaan: zo zie je de blokken.
      g.fillStyle = 'rgba(255,255,255,.09)';
      g.fillRect(0, 0, px, Math.max(1, px * .06));
      g.fillStyle = 'rgba(0,0,0,.28)';
      g.fillRect(0, px * .92, px, px * .08);
      g.fillRect(px * .94, 0, px * .06, px);
    };
    if (type === T.LEEG) {
      // Gang: donkere achterwand met wat lagen.
      g.fillStyle = mix(b.dark, '#000000', .55);
      g.fillRect(0, 0, px, px);
      g.fillStyle = rgba(b.color, .12);
      for (let i = 0; i < 3; i++) g.fillRect(0, px * (.15 + i * .3 + r() * .08), px, px * .05);
    } else if (type === T.STEEN) {
      ground(mix(b.color, '#6b7184', .55), '#1a1c26');
      g.strokeStyle = 'rgba(0,0,0,.45)';
      g.lineWidth = Math.max(1, px * .04);
      g.beginPath();
      g.moveTo(px * .1, px * (.3 + r() * .2)); g.lineTo(px * .5, px * (.45 + r() * .1)); g.lineTo(px * .9, px * (.3 + r() * .3));
      g.moveTo(px * .5, px * .5); g.lineTo(px * (.4 + r() * .2), px * .9);
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
      ground(type === T.KOPER || type === T.IJZER ? b.color : mix(b.color, '#000000', .15), b.dark);
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
    const moon = g.createRadialGradient(w * .8, h * .25, 0, w * .8, h * .25, h * .16);
    moon.addColorStop(0, 'rgba(255,240,210,.95)'); moon.addColorStop(.5, 'rgba(255,220,180,.4)'); moon.addColorStop(1, 'rgba(255,220,180,0)');
    g.fillStyle = moon;
    g.fillRect(0, 0, w, h);
    skyCache = c;
    return c;
  }

  // Burcht in de verte en de smidse op het oppervlak, één keer gebakken per vakgrootte.
  const surfCache = new Map();
  function surface(px) {
    let c = surfCache.get(px);
    if (c) return c;
    const wpx = (W.COLS + 16) * px, hpx = px * 4;
    c = mk(wpx, hpx);
    const g = c.getContext('2d');
    // Silhouet van de burcht
    g.fillStyle = '#120c26';
    const base = hpx;
    g.fillRect(0, base - px * .9, wpx, px * .9);
    for (let i = 0; i < wpx / px; i += 3) {
      const tw = px * (1.2 + (i % 5) * .2), th = px * (1.6 + ((i * 7) % 5) * .35);
      g.fillRect(i * px, base - th, tw, th);
      for (let k = 0; k < 3; k++) g.fillRect(i * px + k * tw / 3, base - th - px * .25, tw / 6, px * .25);
      g.fillStyle = 'rgba(255,201,74,.75)';
      if (i % 2 === 0) g.fillRect(i * px + tw * .45, base - th * .7, px * .14, px * .22);
      g.fillStyle = 'rgba(76,201,255,.8)';
      g.fillRect(i * px, base - th, tw, Math.max(1, px * .04));
      g.fillStyle = '#120c26';
    }
    surfCache.set(px, c);
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
      const f = forge(px);
      ctx.drawImage(f, ox + px * 14, oy - f.height);
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
  // Elke leerling krijgt een klein canvas van 24 × 260 pixels: één pixel per vakje.
  class Board {
    constructor(seed) {
      this.seed = seed;
      this.mines = new Map();
      this.pos = new Map();
      this.base = null;
      this.bg = null;
    }
    baseImage() {
      if (this.base) return this.base;
      const img = new ImageData(W.COLS, W.ROWS);
      for (let y = 0; y < W.ROWS; y++) {
        const b = W.band(y);
        for (let x = 0; x < W.COLS; x++) {
          const t = W.tile(this.seed, x, y);
          // Nog niet uitgegraven grond is gedempt; zo springen de gangen van de leerling eruit.
          let col;
          if (W.ORES[t]) col = mix(b.color, W.ORES[t].color, t >= T.GOUD ? .7 : .4);
          else if (t === T.LAVA) col = '#c2410c';
          else if (t === T.GAS) col = mix(b.color, '#6fbf4a', .5);
          else if (t === T.ROTS) col = '#110f17';
          else if (t === T.LEEG) col = '#0a0810';
          else if (t === T.STEEN) col = mix(b.color, '#555a6c', .35);
          else col = W.hash(this.seed, x, y) < .5 ? b.color : mix(b.color, b.dark, .12);
          if (t !== T.LEEG && t !== T.ROTS) col = mix(col, '#05060d', W.ORES[t] ? .3 : .5);
          const i = (y * W.COLS + x) * 4;
          img.data[i] = parseInt(col.slice(1, 3), 16);
          img.data[i + 1] = parseInt(col.slice(3, 5), 16);
          img.data[i + 2] = parseInt(col.slice(5, 7), 16);
          img.data[i + 3] = 255;
        }
      }
      this.base = img;
      return img;
    }
    mine(n, color) {
      let m = this.mines.get(n);
      if (m) return m;
      const c = mk(W.COLS, W.ROWS);
      const img = new ImageData(new Uint8ClampedArray(this.baseImage().data), W.COLS, W.ROWS);
      const tunnel = mix(color || '#4cc9ff', '#000000', .35);
      m = { c, ctx: c.getContext('2d'), img, dirty: true, tunnel: [1, 3, 5].map(k => parseInt(tunnel.slice(k, k + 2), 16)) };
      this.mines.set(n, m);
      return m;
    }
    dig(n, cell, color) {
      const m = this.mine(n, color);
      const i = cell * 4;
      m.img.data[i] = m.tunnel[0]; m.img.data[i + 1] = m.tunnel[1]; m.img.data[i + 2] = m.tunnel[2];
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
    background(w, h, top, gut, mineH) {
      if (this.bg && this.bg.width === w && this.bg.height === h) return this.bg;
      const c = mk(w, h);
      const g = c.getContext('2d');
      g.drawImage(sky(w, top), 0, 0);
      const s = surface(Math.max(10, Math.round(top / 4)));
      g.drawImage(s, 0, 0, s.width, s.height, 0, top - s.height, s.width, s.height);
      g.fillStyle = '#05060d';
      g.fillRect(0, top, w, h - top);
      const sy = mineH / W.ROWS;
      g.font = `800 ${Math.round(Math.max(10, gut * .2))}px Orbitron, sans-serif`;
      g.textBaseline = 'middle';
      let from = 0;
      for (const b of W.BANDS) {
        const y = top + from * sy, hh = (b.to - from) * sy;
        g.fillStyle = rgba(b.color, .25);
        g.fillRect(0, y, w, hh);
        g.fillStyle = rgba(b.color, .9);
        g.fillRect(0, y, 4, hh);
        g.save();
        g.translate(gut * .45, y + hh / 2);
        g.rotate(-Math.PI / 2);
        g.textAlign = 'center';
        g.fillStyle = '#e8f1ff';
        g.fillText(b.name.toUpperCase(), 0, 0);
        g.restore();
        g.textAlign = 'right';
        g.fillStyle = 'rgba(232,241,255,.6)';
        g.fillText(`${b.to} m`, gut - 4, y + hh - 6);
        from = b.to;
      }
      this.bg = c;
      return c;
    }
    // roster: Map n -> {name, color}; ranking: voor de diepte bij de naam.
    render(ctx, w, h, roster, opts = {}) {
      const dpr = opts.dpr || 1;
      const top = Math.round(h * .12), gut = Math.round(60 * dpr);
      const mineH = h - top - 4;
      ctx.drawImage(this.background(w, h, top, gut, mineH), 0, 0);
      const list = [...roster.values()].sort((a, b) => a.n - b.n);
      const n = Math.max(1, list.length);
      const gap = Math.max(3, Math.round(6 * dpr));
      const sy = mineH / W.ROWS;
      let colW = (w - gut - gap * (n + 1)) / n;
      colW = Math.min(colW, W.COLS * sy * 2.4);
      const x0 = gut + (w - gut - (colW + gap) * n + gap) / 2;
      ctx.imageSmoothingEnabled = false;
      const font = Math.round(Math.max(9, Math.min(15 * dpr, colW / 5)));
      ctx.font = `800 ${font}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const m = this.mine(r.n, r.color);
        if (m.dirty) { m.ctx.putImageData(m.img, 0, 0); m.dirty = false; }
        const x = Math.round(x0 + i * (colW + gap));
        ctx.drawImage(m.c, x, top, Math.round(colW), mineH);
        ctx.fillStyle = rgba(r.color, .8);
        ctx.fillRect(x, top - 3, Math.round(colW), 3);
        // Naam boven de mijn (ingekort als hij niet past)
        let name = r.name;
        while (name.length > 2 && ctx.measureText(name).width > colW + gap * .5) name = name.slice(0, -1);
        if (name !== r.name) name = `${name.slice(0, -1)}…`;
        ctx.fillStyle = '#05060d';
        ctx.fillText(name, x + colW / 2 + 1, top - 7 + 1);
        ctx.fillStyle = r.color;
        ctx.fillText(name, x + colW / 2, top - 7);
        const p = this.pos.get(r.n);
        if (!p) continue;
        const py = Math.max(-1, p.y);
        const dx = x + (p.x + .5) / W.COLS * colW, dy = top + (py + .5) * sy;
        const rad = Math.max(4 * dpr, Math.min(colW / 6, 9 * dpr));
        Glow.glow(ctx, dx, dy, rad * 3, r.color, .9);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(dx, dy, rad, 0, 7); ctx.fill();
        ctx.fillStyle = r.color;
        ctx.beginPath(); ctx.arc(dx, dy, rad * .7, 0, 7); ctx.fill();
        if (py > 1) {
          ctx.font = `700 ${Math.round(font * .85)}px Orbitron, sans-serif`;
          ctx.fillStyle = '#e8f1ff';
          ctx.fillText(`${Math.round(py)}`, dx, dy - rad - 4);
          ctx.font = `800 ${font}px Orbitron, sans-serif`;
        }
      }
      ctx.imageSmoothingEnabled = true;
    }
  }

  return { render, pod, chipColor, Board, tileSprite };
})();
