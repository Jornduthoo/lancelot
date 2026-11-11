// Titanenstrijd: tekenen van de geschilderde titans (uit losse delen) en de effecten. Gebruikt door ti-host.js.
// Elke titan bestaat uit vijf geschilderde delen (benen, romp, schildarm, zwaardarm, kanon). De code zet ze samen,
// kleurt ze per ploeg (één keer, op een klein canvas) en beweegt ze: uithalen, slaan, schild heffen, ontwijken, vallen.
const TiDraw = (() => {
  const NAMES = ['romp', 'benen', 'kanon', 'schildarm', 'zwaardarm', 'slag', 'schild', 'vuurbal', 'ontploffing', 'rook', 'ster', 'arena'];
  const ART = {};
  let ready = 0;
  const onReady = [];
  for (const n of NAMES) {
    const img = new Image();
    img.onload = () => { ART[n] = img; ready++; if (ready === NAMES.length) onReady.splice(0).forEach(f => f()); };
    img.src = `/img/titanenstrijd/${n}.webp`;
  }
  const loaded = () => ready === NAMES.length;

  // Waar elk deel hangt, in pixels van de geschilderde delen. Oorsprong: tussen de voeten, de titan kijkt naar rechts.
  // piv = draaipunt in het deel (0-1), at = waar dat draaipunt op de titan zit.
  const RIG = {
    benen: { piv: [.5, 1], at: [0, 0] },
    kanon: { piv: [.28, .62], at: [-40, -650], z: -1 },
    zwaardarm: { piv: [.22, .22], at: [135, -540] },
    romp: { piv: [.5, .92], at: [-6, -330] },
    schildarm: { piv: [.25, .22], at: [-96, -545] },
  };
  const ORDER = ['kanon', 'benen', 'zwaardarm', 'romp', 'schildarm'];
  const BACK = ['kanon', 'schildarm', 'benen', 'zwaardarm', 'romp'];
  const HEIGHT = 760; // hoogte van een titan in deze pixels

  // Ploegkleur: vermenigvuldigen met een lichte versie van de kleur, zodat goud en gloed blijven.
  const cache = new Map();
  function tinted(name, kleur, mode = '') {
    const key = `${name}|${kleur}|${mode}`;
    let c = cache.get(key);
    if (c) return c;
    const img = ART[name];
    c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = mode === 'kapot' ? '#4a4652' : mix(kleur, '#ffffff', .12);
    x.fillRect(0, 0, c.width, c.height);
    if (mode === 'flits') { x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(0, 0, c.width, c.height); }
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(img, 0, 0);
    cache.set(key, c);
    return c;
  }
  function mix(a, b, k) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
  }

  // a: de animatie van dit moment { swing (-1 uithalen .. 1 slaan), shield (0-1), aim, recoil, fall, lean, kapot:Set, flash }
  // Staat de titan gewoon klaar (de meeste frames), dan tekenen we één gebakken beeld in plaats van vijf delen:
  // dat spaart veel rekenwerk op het bord.
  const BOX = [-430, -830, 900, 880]; // x, y, breedte, hoogte van een titan in de pixels van de delen
  const baked = new Map();
  function titan(ctx, x, y, scale, facing, kleur, a) {
    if (!loaded()) return;
    const bob = Math.sin(a.t * 2.2) * 5;
    const sh = a.shield || 0;
    const still = !a.swing && !a.aim && !a.recoil && !a.fall && !a.flash && !a.lean && (sh === 0 || sh === 1);
    if (still) {
      const key = `${kleur}|${Math.round(scale * 1000)}|${facing}|${[...(a.kapot || [])].sort().join()}|${sh}`;
      let c = baked.get(key);
      if (!c) {
        if (baked.size > 40) baked.clear();
        c = document.createElement('canvas');
        c.width = Math.ceil(BOX[2] * scale) + 2;
        c.height = Math.ceil(BOX[3] * scale) + 2;
        const bx = c.getContext('2d');
        bx.translate(facing > 0 ? -BOX[0] * scale : c.width + BOX[0] * scale, -BOX[1] * scale);
        bx.scale(scale * facing, scale);
        parts(bx, kleur, a);
        baked.set(key, c);
      }
      ctx.drawImage(c, Math.round(x - (facing > 0 ? -BOX[0] * scale : c.width + BOX[0] * scale)), Math.round(y + bob * scale + BOX[1] * scale));
      return;
    }
    ctx.save();
    ctx.translate(x, y + bob * scale);
    ctx.scale(scale * facing, scale);
    if (a.fall) {
      ctx.translate(-120 * a.fall, 0);
      ctx.rotate(-a.fall * 1.35);
      ctx.globalAlpha = 1 - a.fall * .35;
    }
    ctx.rotate(a.lean || 0);
    parts(ctx, kleur, a);
    ctx.restore();
  }

  function parts(ctx, kleur, a) {
    // Beide armen hangen aan de schouders van de romp. De schildarm hangt in rust achter de romp omlaag,
    // en komt naar voren voor de borst als de schildwacht het schild heft.
    const order = (a.shield || 0) > .3 ? ORDER : BACK;
    for (const name of order) {
      const r = RIG[name], img = ART[name];
      const broken = a.kapot && a.kapot.has(rolVan(name));
      const pic = tinted(name, kleur, a.flash ? 'flits' : broken ? 'kapot' : '');
      let rot = 0, dx = 0, dy = 0;
      if (name === 'zwaardarm') { const sw = a.swing || 0; rot = broken ? .75 : sw < 0 ? sw * 1.1 : sw * .55; }
      if (name === 'schildarm') { const sh = a.shield || 0; rot = broken ? 1.35 : 1 - sh * 1.1; }
      if (name === 'kanon') { rot = broken ? .5 : -.08 + (a.aim || 0) * -.12; dx = -(a.recoil || 0) * 40; }
      ctx.save();
      ctx.translate(r.at[0] + dx, r.at[1] + dy);
      ctx.rotate(rot);
      ctx.drawImage(pic, -img.width * r.piv[0], -img.height * r.piv[1]);
      ctx.restore();
    }
  }
  const rolVan = name => ({ zwaardarm: 'zwaard', schildarm: 'schild', kanon: 'kanon', benen: 'benen' })[name];

  // Plekken op het bord (van de breedte en hoogte), per aantal ploegen: [x, y, schaal, kijkrichting]
  const SPOTS = {
    2: [[.3, .78, 1, 1], [.7, .78, 1, -1]],
    3: [[.24, .7, .85, 1], [.76, .7, .85, -1], [.5, .9, .95, 1]],
    4: [[.22, .64, .8, 1], [.78, .64, .8, -1], [.37, .9, .95, 1], [.63, .9, .95, -1]],
  };

  // De plek op het canvas waar de titan staat, en hoe groot hij is.
  function spot(n, i, w, h) {
    const s = (SPOTS[n] || SPOTS[2])[i];
    const scale = (h * (n === 2 ? .56 : n === 3 ? .48 : .42) * s[2]) / HEIGHT;
    return { x: w * s[0], y: h * s[1], scale, facing: s[3] };
  }

  // De arena: de schilderij vult het canvas (bijgesneden zoals background-size: cover). Eén keer gebakken.
  let bg = null;
  function arena(ctx, w, h) {
    if (!ART.arena) { ctx.fillStyle = '#120b26'; ctx.fillRect(0, 0, w, h); return; }
    if (!bg || bg.width !== w || bg.height !== h) {
      bg = document.createElement('canvas');
      bg.width = w;
      bg.height = h;
      const x = bg.getContext('2d');
      const img = ART.arena, k = Math.max(w / img.width, h / img.height);
      x.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k);
      // Onderaan iets donkerder, zodat de namen en levensbalken goed leesbaar zijn.
      const g = x.createLinearGradient(0, h * .55, 0, h);
      g.addColorStop(0, 'rgba(8,4,20,0)');
      g.addColorStop(1, 'rgba(8,4,20,.55)');
      x.fillStyle = g;
      x.fillRect(0, h * .55, w, h * .45);
    }
    ctx.drawImage(bg, 0, 0);
  }

  // Een effect: sprite gecentreerd, met grootte, draaiing en doorzichtigheid.
  function sprite(ctx, name, x, y, size, o = {}) {
    const img = ART[name];
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    if (o.add) ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    const k = size / Math.max(img.width, img.height);
    ctx.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k);
    ctx.restore();
  }

  return { ART, loaded, onReady: f => (loaded() ? f() : onReady.push(f)), titan, spot, arena, sprite, HEIGHT, RIG, mix };
})();
if (typeof module !== 'undefined') module.exports = TiDraw;
