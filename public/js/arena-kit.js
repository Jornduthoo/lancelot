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
    ring(x, y, r, color, life = .45) {
      this.list.push({ ring: true, x, y, r, color, life, max: life });
    }
    text(x, y, text, color = '#fff') {
      this.list.push({ text, x, y, vy: -60, vx: 0, life: .9, max: .9, color, drag: 1 });
    }
    update(dt) {
      const keep = [];
      for (const p of this.list) {
        p.life -= dt;
        if (p.life <= 0) continue;
        if (!p.ring) {
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
        if (p.text) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.font = '900 18px Orbitron, sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(0,0,0,.7)';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y);
          continue;
        }
        ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
        ctx.globalAlpha = Math.min(1, k * 1.5);
        if (p.ring) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 6 * k + 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1.15 - k * .9), 0, Math.PI * 2);
          ctx.stroke();
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (.4 + k * .6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------- Ridders tekenen ----------
  // Van bovenaf: schaduw, cape, pantser, helm met lichtend vizier en het wapen van de klasse.
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
    // Schaduw
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath();
    ctx.ellipse(3, r * .55, r * 1.05, r * .55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Aura of schild
    if (o.glow) {
      const g = ctx.createRadialGradient(0, 0, r * .5, 0, 0, r * 2.2);
      g.addColorStop(0, o.glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.rotate(a);
    // Cape die achter je aan wappert
    const wave = Math.sin(t * 9) * (o.moving ? 3 : 1);
    ctx.fillStyle = shade(color, -.35);
    ctx.beginPath();
    ctx.moveTo(-r * .2, -r * .8);
    ctx.quadraticCurveTo(-r * 1.6, -r * .9 + wave, -r * 1.9, wave * .6);
    ctx.quadraticCurveTo(-r * 1.6, r * .9 + wave, -r * .2, r * .8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Wapen
    weapon(ctx, kind, r, color, o);
    // Schouders en pantser
    const body = ctx.createLinearGradient(-r, -r, r, r);
    if (kind === 'mech') {
      body.addColorStop(0, '#9fb3c8'); body.addColorStop(.5, '#4b5d73'); body.addColorStop(1, '#1d2633');
      ctx.fillStyle = body;
      roundRect(ctx, -r * .95, -r * 1.05, r * 1.7, r * 2.1, r * .35);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillRect(-r * .55, -r * 1.12, r * .9, r * .22);
      ctx.fillRect(-r * .55, r * .9, r * .9, r * .22);
    } else {
      body.addColorStop(0, '#e9f1ff'); body.addColorStop(.45, '#8a9bb5'); body.addColorStop(1, '#2a3446');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * .78, r * 1.02, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(color, .1);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Helm met vizier
    const hg = ctx.createRadialGradient(-r * .15, -r * .2, 1, 0, 0, r * .7);
    hg.addColorStop(0, '#ffffff');
    hg.addColorStop(.35, kind === 'mage' ? shade(color, .2) : '#b8c6da');
    hg.addColorStop(1, kind === 'mage' ? shade(color, -.5) : '#3a4659');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(0, 0, r * .62, 0, Math.PI * 2);
    ctx.fill();
    if (kind === 'mage') {
      // Kap met punt naar achter
      ctx.beginPath();
      ctx.moveTo(-r * .4, -r * .45);
      ctx.lineTo(-r * 1.1, 0);
      ctx.lineTo(-r * .4, r * .45);
      ctx.fill();
    }
    if (kind === 'paladijn' || kind === 'ridder') {
      // Pluim
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * .2, 0);
      ctx.quadraticCurveTo(-r * .6, wave * .4, -r * 1.05, wave * .5);
      ctx.stroke();
    }
    // Lichtend vizier
    ctx.shadowColor = o.visor || color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = o.visor || shade(color, .55);
    roundRect(ctx, r * .28, -r * .36, r * .2, r * .72, r * .1);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    if (o.hp !== undefined && o.hp < 100) bar(ctx, x, y - r - 12, r * 2.2, o.hp / 100, o.hpColor);
    if (o.name) label(ctx, o.name, x, y - r - (o.hp !== undefined && o.hp < 100 ? 20 : 12), o.me ? '#ffc94a' : '#e8f1ff');
  }

  function weapon(ctx, kind, r, color, o) {
    const swing = o.swing || 0; // 0..1 tijdens een slag
    ctx.save();
    if (kind === 'paladijn' || kind === 'ridder') {
      // Schild links, energiezwaard rechts
      ctx.fillStyle = '#c9d6e8';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(r * .25, -r * .95, r * .5, r * .32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(swing ? (swing - .5) * 2.4 : .35);
      ctx.shadowColor = o.blade || '#7fdcff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = o.blade || '#bff0ff';
      ctx.fillRect(r * .2, r * .62, r * 1.5, r * .18);
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
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = shade(color, .4);
      ctx.beginPath();
      ctx.arc(r * 1.45, r * .8, r * .26 * pulse + 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'ranger') {
      ctx.strokeStyle = '#d9b26a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r * .55, 0, r * 1.05, -1.1, 1.1);
      ctx.stroke();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = shade(color, .4);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(r * 1.0, -r * .93);
      ctx.lineTo(r * (o.swing ? .1 : .4), 0);
      ctx.lineTo(r * 1.0, r * .93);
      ctx.stroke();
    } else if (kind === 'mech') {
      ctx.fillStyle = '#2b3746';
      ctx.fillRect(r * .3, r * .35, r * 1.4, r * .42);
      ctx.fillRect(r * .3, -r * .77, r * 1.4, r * .42);
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = color;
      ctx.fillRect(r * 1.6, r * .42, r * .16, r * .28);
      ctx.fillRect(r * 1.6, -r * .7, r * .16, r * .28);
    } else if (kind === 'royale') {
      // Laserlans
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#d6e2f2';
      ctx.fillRect(r * .2, r * .45, r * 1.5, r * .22);
      ctx.fillStyle = shade(color, .4);
      ctx.fillRect(r * 1.55, r * .4, r * .35, r * .32);
      ctx.fillStyle = '#c9d6e8';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(r * .25, -r * .95, r * .45, r * .3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
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
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    ctx.fillRect(cx - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = color || (k > .5 ? '#4ade80' : k > .25 ? '#ffc94a' : '#ff4d6d');
    ctx.fillRect(cx - w / 2, y, w * k, 4);
  }

  function label(ctx, text, x, y, color = '#e8f1ff', size = 12) {
    ctx.font = `800 ${size}px "Exo 2", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(3,6,13,.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  // Een gloeiende kogel met een staart.
  function bolt(ctx, x, y, vx, vy, color, r = 6, len = .05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 1.4;
    ctx.globalAlpha = .45;
    ctx.beginPath();
    ctx.moveTo(x - vx * len, y - vy * len);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(x, y, r * .6, 0, Math.PI * 2);
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

  return { keyVector, isMoveKey, stick, holdButton, Interp, Particles, knight, shade, roundRect, bar, label, bolt, quiz, esc, clock, fit };
})();
