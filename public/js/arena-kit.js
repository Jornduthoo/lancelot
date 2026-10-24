// Gedeeld gereedschap voor Gauntlet en Ridder-Royale (bord en leerling): besturing met toetsen en duimjoystick,
// vloeiend tekenen van de anderen (interpolatie), vonken en ontploffingen, ridders tekenen en het vragenvenster.
// Gebruikt ICONS en sfx uit fx.js.
const AK = (() => {
  // ---------- Toetsenbord ----------
  const down = new Set();
  const MAP = { arrowup: 'u', w: 'u', z: 'u', arrowdown: 'd', s: 'd', arrowleft: 'l', a: 'l', q: 'l', arrowright: 'r', d: 'r' };
  addEventListener('keydown', e => { const k = MAP[e.key.toLowerCase()]; if (k) down.add(k); });
  addEventListener('keyup', e => { const k = MAP[e.key.toLowerCase()]; if (k) down.delete(k); });
  addEventListener('blur', () => down.clear());
  function keyVector() {
    const x = (down.has('r') ? 1 : 0) - (down.has('l') ? 1 : 0);
    const y = (down.has('d') ? 1 : 0) - (down.has('u') ? 1 : 0);
    const l = Math.hypot(x, y);
    return l ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }
  const isMoveKey = key => key.toLowerCase() in MAP;

  // ---------- Duimjoystick ----------
  // Zet je duim ergens op de linkerhelft van het scherm en schuif. De joystick verschijnt waar je duim staat
  // en schuift mee als je verder trekt, zodat hij altijd onder je duim blijft.
  function stick(stage) {
    const base = document.createElement('div');
    base.className = 'ak-stick hidden';
    base.innerHTML = '<i></i>';
    stage.appendChild(base);
    const knob = base.firstChild;
    const st = { id: null, ox: 0, oy: 0, x: 0, y: 0, active: false };
    const RAD = 56;
    stage.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || st.id !== null || e.target.closest('button')) return;
      const r = stage.getBoundingClientRect();
      if (e.clientX - r.left > r.width * .55) return;
      e.preventDefault();
      st.id = e.pointerId;
      st.ox = e.clientX;
      st.oy = e.clientY;
      st.x = st.y = 0;
      st.active = true;
      base.style.left = `${e.clientX - r.left}px`;
      base.style.top = `${e.clientY - r.top}px`;
      base.classList.remove('hidden');
      knob.style.transform = 'translate(-50%, -50%)';
      try { stage.setPointerCapture(e.pointerId); } catch {}
      if (typeof sfx !== 'undefined') sfx.unlock();
    });
    stage.addEventListener('pointermove', e => {
      if (e.pointerId !== st.id) return;
      let dx = e.clientX - st.ox, dy = e.clientY - st.oy;
      const l = Math.hypot(dx, dy);
      if (l > RAD) {
        const r = stage.getBoundingClientRect();
        st.ox += (dx / l) * (l - RAD);
        st.oy += (dy / l) * (l - RAD);
        base.style.left = `${st.ox - r.left}px`;
        base.style.top = `${st.oy - r.top}px`;
        dx = e.clientX - st.ox;
        dy = e.clientY - st.oy;
      }
      // Een kleine dode zone in het midden; daarbuiten meteen bijna volle snelheid.
      const m = Math.hypot(dx, dy);
      const power = m < 8 ? 0 : Math.min(1, .45 + (m / RAD) * .7);
      st.x = m ? (dx / m) * power : 0;
      st.y = m ? (dy / m) * power : 0;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const end = e => {
      if (e.pointerId !== st.id) return;
      st.id = null;
      st.x = st.y = 0;
      st.active = false;
      base.classList.add('hidden');
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    st.reset = () => { st.id = null; st.x = st.y = 0; st.active = false; base.classList.add('hidden'); };
    return st;
  }

  // Een knop die je kan ingedrukt houden (aanvallen): fn(true) bij indrukken, fn(false) bij loslaten.
  function holdButton(btn, fn) {
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (typeof sfx !== 'undefined') sfx.unlock();
      btn.classList.add('down');
      try { btn.setPointerCapture(e.pointerId); } catch {}
      fn(true);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      btn.addEventListener(ev, () => { if (btn.classList.contains('down')) { btn.classList.remove('down'); fn(false); } });
    }
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }

  // ---------- Vloeiend tekenen ----------
  // We tekenen de anderen 100 ms in het verleden, tussen twee berichten van de server in. Zo is alles vloeiend,
  // ook als een bericht wat later binnenkomt.
  class Interp {
    constructor(delay = 100) {
      this.delay = delay;
      this.snaps = new Map(); // id -> [{t, v:[...]}]
    }
    push(id, v, t = performance.now()) {
      let list = this.snaps.get(id);
      if (!list) { list = []; this.snaps.set(id, list); }
      list.push({ t, v });
      if (list.length > 6) list.shift();
      list.seen = t;
    }
    // Wie niet meer in de berichten zat, verdwijnt.
    prune(t = performance.now(), keep = 400) {
      for (const [id, list] of this.snaps) if (t - list.seen > keep) this.snaps.delete(id);
    }
    // Geeft [x, y, a, ...rest] terug op het tekenmoment, met hoeken in de kortste richting.
    get(id, t = performance.now()) {
      const list = this.snaps.get(id);
      if (!list || !list.length) return null;
      const rt = t - this.delay;
      let a = list[0], b = list[list.length - 1];
      if (rt <= a.t) return a.v;
      if (rt >= b.t) return b.v;
      for (let i = 0; i < list.length - 1; i++) {
        if (list[i].t <= rt && list[i + 1].t >= rt) { a = list[i]; b = list[i + 1]; break; }
      }
      const k = (rt - a.t) / Math.max(1, b.t - a.t);
      const out = b.v.slice();
      out[0] = a.v[0] + (b.v[0] - a.v[0]) * k;
      out[1] = a.v[1] + (b.v[1] - a.v[1]) * k;
      if (typeof a.v[2] === 'number') {
        let d = b.v[2] - a.v[2];
        d = Math.atan2(Math.sin(d), Math.cos(d));
        out[2] = a.v[2] + d * k;
      }
      return out;
    }
    ids() { return this.snaps.keys(); }
    clear() { this.snaps.clear(); }
  }

  // ---------- Gloed (uit fx.js) ----------
  const { rgba, glowSprite, glow, vignette, lightning } = Glow;

  // ---------- Vonken ----------
  class Particles {
    constructor() { this.list = []; }
    burst(x, y, { n = 12, color = '#ffc94a', speed = 220, life = .6, size = 3, drag = 3, glow = true, up = 0 } = {}) {
      for (let i = 0; i < n && this.list.length < 900; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (.3 + Math.random() * .7);
        this.list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, life: life * (.6 + Math.random() * .6), max: life, size: size * (.6 + Math.random() * .8), color, drag, glow });
      }
    }
    // Snelle lichtstreepjes die van een inslag wegspatten.
    sparks(x, y, { n = 10, color = '#ffe08a', speed = 420, life = .35, width = 2 } = {}) {
      for (let i = 0; i < n && this.list.length < 900; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (.4 + Math.random() * .6);
        this.list.push({ spark: true, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (.5 + Math.random() * .7), max: life, width, color, drag: 4 });
      }
    }
    // Rookwolkjes die opzwellen en vervagen.
    smoke(x, y, { n = 6, color = 'rgba(40,36,60,.55)', size = 16, life = .9, speed = 60 } = {}) {
      for (let i = 0; i < n && this.list.length < 900; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * Math.random();
        this.list.push({ smoke: true, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: life * (.6 + Math.random() * .6), max: life, size: size * (.6 + Math.random() * .8), color, drag: 2 });
      }
    }
    ring(x, y, r, color, life = .45) {
      this.list.push({ ring: true, x, y, r, color, life, max: life });
    }
    // Een schokgolf: een lichtende ring met een flits in het midden.
    shock(x, y, r, color, life = .5) {
      this.list.push({ flash: true, x, y, r: r * .7, color, life: life * .5, max: life * .5 });
      this.list.push({ ring: true, x, y, r, color, life, max: life });
      this.list.push({ ring: true, x, y, r: r * .6, color: '#ffffff', life: life * .6, max: life * .6 });
    }
    text(x, y, text, color = '#fff', size = 18) {
      this.list.push({ text, x, y, vy: -60, vx: 0, life: .9, max: .9, color, drag: 1, size });
    }
    // Grote tekst die even opveert en blijft hangen (KO!, SUPER!).
    pop(x, y, text, color = '#ffc94a', size = 34, life = 1.2) {
      this.list.push({ text, pop: true, x, y, vy: -18, vx: 0, life, max: life, color, drag: 1, size });
    }
    update(dt) {
      const keep = [];
      for (const p of this.list) {
        p.life -= dt;
        if (p.life <= 0) continue;
        if (!p.ring && !p.flash) {
          const f = Math.max(0, 1 - p.drag * dt);
          p.vx *= f;
          p.vy *= f;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        keep.push(p);
      }
      this.list = keep;
    }
    // Teken in wereldcoördinaten (de camera staat al ingesteld).
    draw(ctx) {
      ctx.save();
      for (const p of this.list) {
        const k = p.life / p.max;
        if (p.smoke) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, k * 1.4) * .8;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.8 - k), 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        if (p.text) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, k * 2);
          let size = p.size || 18;
          if (p.pop) { const age = (p.max - p.life) / p.max; size *= age < .15 ? .4 + age / .15 * .9 : age < .25 ? 1.3 - (age - .15) * 3 : 1; }
          ctx.font = `900 ${Math.round(size)}px Orbitron, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.lineJoin = 'round';
          ctx.lineWidth = Math.max(4, size * .22);
          ctx.strokeStyle = 'rgba(0,0,0,.75)';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y);
          if (p.pop) {
            ctx.globalAlpha *= .5;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(p.text, p.x, p.y - size * .06);
          }
          continue;
        }
        ctx.globalCompositeOperation = p.glow === false ? 'source-over' : 'lighter';
        ctx.globalAlpha = Math.min(1, k * 1.5);
        if (p.flash) {
          glow(ctx, p.x, p.y, p.r * (1.4 - k * .4), p.color, k);
          glow(ctx, p.x, p.y, p.r * .5, '#ffffff', k);
          continue;
        }
        if (p.ring) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 7 * k + 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1.15 - k * .9), 0, Math.PI * 2);
          ctx.stroke();
          continue;
        }
        if (p.spark) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.width;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * .045, p.y - p.vy * .045);
          ctx.stroke();
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (.4 + k * .6), 0, Math.PI * 2);
        ctx.fill();
        if (p.size > 2.5 && p.glow !== false) glow(ctx, p.x, p.y, p.size * 2.6, p.color, k * .5);
      }
      ctx.restore();
    }
  }

  // ---------- Sporen ----------
  // Een lichtspoor achter wie beweegt. Per id de laatste posities; draw() tekent een vervagend lint.
  class Trails {
    constructor(len = 10) { this.len = len; this.map = new Map(); }
    add(id, x, y, t = performance.now()) {
      let l = this.map.get(id);
      if (!l) { l = []; this.map.set(id, l); }
      const last = l[l.length - 1];
      if (last && Math.hypot(x - last[0], y - last[1]) > 120) l.length = 0; // geteleporteerd
      if (!last || Math.hypot(x - last[0], y - last[1]) > 4) { l.push([x, y, t]); if (l.length > this.len) l.shift(); }
      l.seen = t;
    }
    draw(ctx, id, color, width = 10, t = performance.now()) {
      const l = this.map.get(id);
      if (!l || l.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      for (let i = 1; i < l.length; i++) {
        const age = (t - l[i][2]) / 350;
        if (age > 1) continue;
        const k = (i / l.length) * (1 - age);
        ctx.globalAlpha = k * .35;
        ctx.lineWidth = width * k;
        ctx.beginPath();
        ctx.moveTo(l[i - 1][0], l[i - 1][1]);
        ctx.lineTo(l[i][0], l[i][1]);
        ctx.stroke();
      }
      ctx.restore();
    }
    prune(t = performance.now()) { for (const [id, l] of this.map) if (t - l.seen > 1000) this.map.delete(id); }
  }

  // ---------- Ridders tekenen ----------
  // Van bovenaf: lichtring op de grond, schaduw, wapperende cape, schouderstukken, borstpantser met een
  // lichtende kern, helm met kam en lichtend vizier, en het wapen van de klasse.
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = v => Math.max(0, Math.min(255, Math.round(v)));
    const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const mix = f >= 0 ? v => v + (255 - v) * f : v => v * (1 + f);
    return `rgb(${c(mix(r))},${c(mix(g))},${c(mix(b))})`;
  }

  function knight(ctx, x, y, a, o = {}) {
    const r = o.r || 17;
    const color = o.color || '#4cc9ff';
    const t = o.t || 0;
    const kind = o.kind || 'ridder';
    ctx.save();
    ctx.translate(x, y);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    // Lichtring op de grond in de kleur van de ridder
    if (o.ring !== false) {
      glow(ctx, 0, r * .25, r * 2.1, color, .32, .62);
      ctx.strokeStyle = rgba(color, .55);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, r * .25, r * 1.35, r * .85, 0, t * 2, t * 2 + 4.6);
      ctx.stroke();
    }
    // Schaduw
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath();
    ctx.ellipse(3, r * .55, r * 1.05, r * .55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Aura of schild
    if (o.glow) glow(ctx, 0, 0, r * 2.4, o.glow, 1);
    ctx.rotate(a);
    // Cape die achter je aan wappert, met een lichtende zoom
    const wave = Math.sin(t * 9) * (o.moving ? 3 : 1);
    const wave2 = Math.sin(t * 9 + 1.7) * (o.moving ? 3 : 1);
    const cg = ctx.createLinearGradient(0, 0, -r * 2, 0);
    cg.addColorStop(0, shade(color, -.15));
    cg.addColorStop(1, shade(color, -.6));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-r * .1, -r * .85);
    ctx.quadraticCurveTo(-r * 1.3, -r * 1.05 + wave, -r * 2.05, -r * .35 + wave2);
    ctx.lineTo(-r * 1.8, wave * .5);
    ctx.lineTo(-r * 2.05, r * .35 + wave2);
    ctx.quadraticCurveTo(-r * 1.3, r * 1.05 + wave, -r * .1, r * .85);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = shade(color, .45);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * 2.05, -r * .35 + wave2);
    ctx.lineTo(-r * 1.8, wave * .5);
    ctx.lineTo(-r * 2.05, r * .35 + wave2);
    ctx.stroke();
    // Wapen
    weapon(ctx, kind, r, color, o);
    // Schouders en pantser
    const body = ctx.createLinearGradient(-r, -r, r, r);
    if (kind === 'mech') {
      body.addColorStop(0, '#b9cbe0'); body.addColorStop(.5, '#4b5d73'); body.addColorStop(1, '#1d2633');
      ctx.fillStyle = body;
      roundRect(ctx, -r * .95, -r * 1.05, r * 1.7, r * 2.1, r * .35);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(-r * .55, -r * 1.12, r * .9, r * .22);
      ctx.fillRect(-r * .55, r * .9, r * .9, r * .22);
      glow(ctx, -r * .1, -r * 1.01, r * .6, color, .5);
      glow(ctx, -r * .1, r * 1.01, r * .6, color, .5);
    } else {
      body.addColorStop(0, '#f4f8ff'); body.addColorStop(.45, '#8a9bb5'); body.addColorStop(1, '#232c3c');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * .8, r * 1.02, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Schouderstukken
      for (const sgn of [-1, 1]) {
        const pg = ctx.createRadialGradient(-r * .1, sgn * r * .72 - r * .1, 1, 0, sgn * r * .72, r * .45);
        pg.addColorStop(0, '#ffffff');
        pg.addColorStop(.5, '#9fb0c8');
        pg.addColorStop(1, '#2f3a4e');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(-r * .05, sgn * r * .74, r * .42, r * .34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
    // Lichtende kern op de borst
    if (kind !== 'mech') {
      const pulse = .75 + Math.sin(t * 5) * .25;
      glow(ctx, -r * .42, 0, r * .55, color, .9 * pulse);
      ctx.fillStyle = shade(color, .6);
      ctx.beginPath();
      ctx.moveTo(-r * .25, 0); ctx.lineTo(-r * .42, -r * .14); ctx.lineTo(-r * .59, 0); ctx.lineTo(-r * .42, r * .14);
      ctx.closePath();
      ctx.fill();
    }
    // Helm met vizier
    const hg = ctx.createRadialGradient(-r * .15, -r * .2, 1, 0, 0, r * .7);
    hg.addColorStop(0, '#ffffff');
    hg.addColorStop(.35, kind === 'mage' ? shade(color, .2) : '#c4d1e3');
    hg.addColorStop(1, kind === 'mage' ? shade(color, -.5) : '#323d50');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(0, 0, r * .62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.65)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (kind === 'mage') {
      // Kap met punt naar achter
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(-r * .4, -r * .45);
      ctx.lineTo(-r * 1.1, 0);
      ctx.lineTo(-r * .4, r * .45);
      ctx.fill();
    } else {
      // Gouden kam over de helm
      ctx.strokeStyle = '#ffc94a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(r * .45, 0);
      ctx.lineTo(-r * .55, 0);
      ctx.stroke();
    }
    if (kind === 'paladijn' || kind === 'ridder' || kind === 'royale') {
      // Pluim
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * .2, 0);
      ctx.quadraticCurveTo(-r * .8, wave * .4, -r * 1.25, wave * .7);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    // Lichtend vizier
    const vc = o.visor || shade(color, .55);
    glow(ctx, r * .4, 0, r * .7, o.visor || color, .9);
    ctx.fillStyle = vc;
    roundRect(ctx, r * .28, -r * .36, r * .2, r * .72, r * .1);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(r * .34, -r * .26, r * .07, r * .52);
    ctx.restore();
    if (o.hp !== undefined && o.hp < 100) bar(ctx, x, y - r - 12, r * 2.2, o.hp / 100, o.hpColor);
    if (o.name) label(ctx, o.name, x, y - r - (o.hp !== undefined && o.hp < 100 ? 20 : 12), o.me ? '#ffc94a' : '#e8f1ff');
  }

  function weapon(ctx, kind, r, color, o) {
    const swing = o.swing || 0; // 0..1 tijdens een slag
    ctx.save();
    if (kind === 'paladijn' || kind === 'ridder') {
      // Schild links, energiezwaard rechts
      shieldPlate(ctx, r * .25, -r * .95, r * .5, r * .32, color);
      ctx.rotate(swing ? (swing - .5) * 2.4 : .35);
      energyBlade(ctx, r * .2, r * .71, r * 1.5, r * .18, o.blade || '#7fdcff');
      ctx.fillStyle = '#ffc94a';
      ctx.fillRect(r * .05, r * .5, r * .2, r * .42);
    } else if (kind === 'mage') {
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * .2, r * .8);
      ctx.lineTo(r * 1.35, r * .8);
      ctx.stroke();
      const pulse = .8 + Math.sin((o.t || 0) * 6) * .2;
      glow(ctx, r * 1.45, r * .8, r * 1.1 * pulse, color, .9);
      ctx.fillStyle = shade(color, .5);
      ctx.beginPath();
      ctx.arc(r * 1.45, r * .8, r * .26 * pulse + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(r * 1.45, r * .8, r * .1 * pulse + .5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'ranger') {
      ctx.strokeStyle = '#d9b26a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r * .55, 0, r * 1.05, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = shade(color, .4);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(r * 1.0, -r * .93);
      ctx.lineTo(r * (o.swing ? .1 : .4), 0);
      ctx.lineTo(r * 1.0, r * .93);
      ctx.stroke();
      glow(ctx, r * 1.05, 0, r * .7, color, .45);
    } else if (kind === 'mech') {
      ctx.fillStyle = '#2b3746';
      ctx.fillRect(r * .3, r * .35, r * 1.4, r * .42);
      ctx.fillRect(r * .3, -r * .77, r * 1.4, r * .42);
      ctx.fillStyle = color;
      ctx.fillRect(r * 1.6, r * .42, r * .16, r * .28);
      ctx.fillRect(r * 1.6, -r * .7, r * .16, r * .28);
      glow(ctx, r * 1.7, r * .56, r * .55, color, .8);
      glow(ctx, r * 1.7, -r * .56, r * .55, color, .8);
    } else if (kind === 'royale') {
      // Laserlans
      ctx.fillStyle = '#d6e2f2';
      ctx.fillRect(r * .2, r * .45, r * 1.5, r * .22);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(r * .2, r * .6, r * 1.5, r * .07);
      ctx.fillStyle = shade(color, .4);
      ctx.fillRect(r * 1.55, r * .4, r * .35, r * .32);
      glow(ctx, r * 1.85, r * .56, r * .7, color, .8);
      shieldPlate(ctx, r * .25, -r * .95, r * .45, r * .3, color);
    }
    ctx.restore();
  }

  // Een schild van boven: metaal met een rand in de kleur van de ridder en een embleem.
  function shieldPlate(ctx, x, y, rx, ry, color) {
    const g = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
    g.addColorStop(0, '#f2f6ff');
    g.addColorStop(1, '#6f7f98');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * .8, ry * .72, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, ry * .3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Een zwaard van licht: witte kern, gekleurde gloed.
  function energyBlade(ctx, x, y, len, w, color) {
    glow(ctx, x + len * .55, y, len * .75, color, .55, .35);
    ctx.fillStyle = color;
    roundRect(ctx, x, y - w * .75, len, w * 1.5, w * .7);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, y - w * .3, len * .96, w * .6, w * .3);
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function bar(ctx, cx, y, w, k, color) {
    k = Math.max(0, Math.min(1, k));
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    roundRect(ctx, cx - w / 2 - 1.5, y - 1.5, w + 3, 7, 3);
    ctx.fill();
    const c = color || (k > .5 ? '#4ade80' : k > .25 ? '#ffc94a' : '#ff4d6d');
    ctx.fillStyle = c;
    ctx.fillRect(cx - w / 2, y, w * k, 4);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(cx - w / 2, y, w * k, 1.5);
  }

  function label(ctx, text, x, y, color = '#e8f1ff', size = 12) {
    ctx.font = `800 ${size}px "Exo 2", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(3,6,13,.9)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  // Een gloeiende kogel met een staart.
  function bolt(ctx, x, y, vx, vy, color, r = 6, len = .05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const tx = x - vx * len * 1.6, ty = y - vy * len * 1.6;
    const g = ctx.createLinearGradient(tx, ty, x, y);
    g.addColorStop(0, rgba(color, 0));
    g.addColorStop(1, rgba(color, .75));
    ctx.strokeStyle = g;
    ctx.lineWidth = r * 1.5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = r * .5;
    ctx.beginPath();
    ctx.moveTo(x - vx * len * .7, y - vy * len * .7);
    ctx.lineTo(x, y);
    ctx.stroke();
    // Gloed zonder shadowBlur: dat is te zwaar voor een Chromebook als er veel schoten vliegen.
    glow(ctx, x, y, r * 3.4, color, .9);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r * .65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- Vragenvenster ----------
  // Eén venster per spel. opts: { root, status(res), ask(cb), answer(i, cb), close(), good(res), bad(res), next(res) }
  // next(res) geeft true als er meteen een volgende vraag mag komen.
  function quiz(opts) {
    const box = document.createElement('div');
    box.className = 'tw-question ak-question hidden';
    box.innerHTML = `<div class="panel">
      <p class="status"></p>
      <p class="tw-q-text"></p>
      <div class="answers"></div>
      <p class="tw-q-result"></p>
      <div class="ls-q-actions"><button class="gold" type="button">${opts.closeText || 'Terug naar het spel'}</button></div>
    </div>`;
    opts.root.appendChild(box);
    const $s = sel => box.querySelector(sel);
    const q = { open: false, cur: null, timer: null };
    $s('.ls-q-actions button').addEventListener('click', () => q.close());

    function wait(ms, then) {
      clearInterval(q.timer);
      const end = performance.now() + ms;
      const result = $s('.tw-q-result');
      let small = result.querySelector('small');
      if (!small) { small = document.createElement('small'); result.append(document.createElement('br'), small); }
      const step = () => {
        if (!q.open) return clearInterval(q.timer);
        const left = end - performance.now();
        if (left <= 0) { clearInterval(q.timer); then(); return; }
        small.textContent = `Even wachten… ${Math.ceil(left / 1000)}`;
      };
      step();
      q.timer = setInterval(step, 200);
    }

    function load() {
      q.cur = { loading: true };
      $s('.tw-q-text').textContent = '…';
      $s('.answers').innerHTML = '';
      const result = $s('.tw-q-result');
      result.textContent = '';
      result.className = 'tw-q-result';
      opts.ask(res => {
        if (!q.open) return;
        if (res && res.wait) {
          $s('.tw-q-text').textContent = 'Even nadenken…';
          wait(res.wait, load);
          return;
        }
        if (!res || res.error) return q.close();
        q.cur = { answers: res.answers };
        $s('.status').textContent = opts.status(res);
        $s('.tw-q-text').textContent = res.question;
        const list = $s('.answers');
        list.innerHTML = res.answers.map((_, i) => `<button type="button" class="answer a${i} enter" style="animation-delay:${i * 50}ms">${ICONS[i]}<span></span></button>`).join('');
        [...list.children].forEach((b, i) => {
          b.querySelector('span').textContent = res.answers[i];
          b.addEventListener('click', () => q.pick(i));
        });
      });
    }

    q.show = () => {
      if (q.open) return;
      q.open = true;
      box.classList.remove('hidden');
      load();
    };
    q.pick = i => {
      if (!q.cur || q.cur.done || !q.cur.answers) return;
      q.cur.done = true;
      opts.answer(i, res => {
        if (!res || res.error) return q.close();
        const tiles = [...$s('.answers').children];
        tiles.forEach((t, j) => {
          t.classList.remove('enter');
          t.classList.toggle('dim', j !== res.right && j !== i);
          t.classList.toggle('right', j === res.right);
          t.disabled = true;
        });
        const result = $s('.tw-q-result');
        result.className = `tw-q-result ${res.correct ? 'good' : 'bad'}`;
        if (res.correct) {
          result.textContent = opts.good(res);
          sfx.good();
          if (typeof buzz === 'function') buzz([30, 40, 30]);
          setTimeout(() => {
            if (!q.open || !q.cur || !q.cur.done) return;
            if (opts.next(res)) load();
            else q.close();
          }, 850);
        } else {
          // Tegen gokken: het juiste antwoord blijft even staan, en pas daarna komt een nieuwe vraag.
          tiles[i].classList.add('wrong');
          result.textContent = opts.bad(res);
          sfx.bad();
          if (typeof buzz === 'function') buzz(200);
          wait(res.wait || 3000, () => { if (q.open) load(); });
        }
      });
    };
    q.close = () => {
      clearInterval(q.timer);
      const was = q.open;
      q.open = false;
      q.cur = null;
      box.classList.add('hidden');
      if (was && opts.close) opts.close();
    };
    q.key = e => {
      if (!q.open) return false;
      if (q.cur && q.cur.answers && !q.cur.done && /^[1-4]$/.test(e.key)) q.pick(Number(e.key) - 1);
      if (e.key === 'Escape') q.close();
      return true;
    };
    return q;
  }

  // ---------- Kleine hulpjes ----------
  function esc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function clock(ms) {
    const left = Math.max(0, ms);
    return `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
  }

  // Een canvas zo groot als zijn plek op het scherm, scherp op elk scherm (maar niet groter dan nodig).
  function fit(canvas, maxDpr = 2) {
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return { w, h, dpr };
  }

  return { keyVector, isMoveKey, stick, holdButton, Interp, Particles, Trails, knight, shade, rgba, glow, glowSprite, vignette, lightning, shieldPlate, energyBlade, roundRect, bar, label, bolt, quiz, esc, clock, fit };
})();
