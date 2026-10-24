// Neon Duel op het bord: een neon arena met twee grote ridders, levensbalken zoals in Street Fighter,
// slagen, combo's, supermoves en de NEON OVERDRIVE. Alles getekend op één canvas, zonder afbeeldingen.
// Gebruikt Avatar uit avatar.js. NeonDraw.create(canvas) geeft een scène met setState, hit en frame.
const NeonDraw = (() => {
  const TEAM = [
    { name: 'Team Bliksem', icon: '⚡', c: '#3fd8ff', glow: 'rgba(63,216,255,', dark: '#063a52', armor: '#2fb8f0' },
    { name: 'Team Vuur', icon: '🔥', c: '#ff3d6e', glow: 'rgba(255,61,110,', dark: '#4a0a20', armor: '#ff4d6d' },
  ];
  const PRIO = { slag: 1, combo: 2, super: 3, overdrive: 4 };

  // Een ridder die bij de naam hoort: de eigen ridder van de leerling, anders altijd dezelfde willekeurige.
  function hash(text) {
    let h = 2166136261;
    for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function avatarOf(name) {
    const own = Avatar.byName(name);
    if (own) return own;
    const av = {};
    for (const [k, n] of Object.entries(Avatar.KEYS)) av[k] = hash(`${name}|${k}`) % n;
    return av;
  }

  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const rand = (a, b) => a + Math.random() * (b - a);

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const S = {
      state: null, W: 0, H: 0, bg: null,
      hp: [100, 100], ghost: [100, 100], ghostAt: [0, 0], energy: [0, 0],
      fighters: [0, 1].map(() => ({ attack: null, hitAt: -9999, recoil: 0, enter: 0 })),
      parts: [], numbers: [], bolts: [], rings: [],
      shakeUntil: 0, shakePow: 0, flashUntil: 0, flashColor: '#fff',
      announce: null, combo: [{ n: 0, at: 0 }, { n: 0, at: 0 }],
      stars: Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * .62, r: rand(.4, 1.6), p: Math.random() * 6 })),
      crowd: Array.from({ length: 70 }, (_, i) => ({ x: (i + Math.random() * .6) / 70, s: rand(.8, 1.25), p: Math.random() * 6, stick: Math.random() < .28 ? (i < 35 ? 0 : 1) : -1 })),
      roundKey: '',
    };

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      const w = Math.max(320, Math.round(r.width * dpr));
      const h = Math.max(200, Math.round(r.height * dpr));
      if (canvas.width === w && canvas.height === h && S.bg) return;
      canvas.width = w;
      canvas.height = h;
      S.W = w;
      S.H = h;
      S.bg = paintBackground(w, h);
    }

    // ---------- Achtergrond (één keer getekend, daarna hergebruikt) ----------

    function paintBackground(W, H) {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, H * .72);
      sky.addColorStop(0, '#05021a');
      sky.addColorStop(.55, '#150a3a');
      sky.addColorStop(1, '#3b0f55');
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      // Teamkleuren aan de zijkanten.
      for (const [x, col] of [[0, TEAM[0].glow], [W, TEAM[1].glow]]) {
        const side = g.createRadialGradient(x, H * .45, 0, x, H * .45, W * .55);
        side.addColorStop(0, `${col}.28)`);
        side.addColorStop(1, `${col}0)`);
        g.fillStyle = side;
        g.fillRect(0, 0, W, H);
      }
      // Een grote planeet met ringen.
      const px = W * .5, py = H * .27, pr = H * .17;
      const halo = g.createRadialGradient(px, py, pr * .8, px, py, pr * 2.2);
      halo.addColorStop(0, 'rgba(255,80,200,.35)');
      halo.addColorStop(1, 'rgba(255,80,200,0)');
      g.fillStyle = halo;
      g.fillRect(0, 0, W, H);
      const planet = g.createLinearGradient(px, py - pr, px, py + pr);
      planet.addColorStop(0, '#ffd166');
      planet.addColorStop(.45, '#ff4fa3');
      planet.addColorStop(1, '#5b1a8c');
      g.save();
      g.beginPath();
      g.arc(px, py, pr, 0, Math.PI * 2);
      g.fillStyle = planet;
      g.fill();
      g.clip();
      // Synthwave-strepen door de onderkant van de planeet.
      g.fillStyle = '#150a3a';
      for (let i = 0; i < 7; i++) {
        const y = py + pr * (.1 + i * .14);
        g.fillRect(px - pr, y, pr * 2, pr * (.02 + i * .012));
      }
      g.restore();
      g.save();
      g.translate(px, py);
      g.rotate(-.18);
      g.scale(1, .22);
      g.lineWidth = H * .012;
      g.strokeStyle = 'rgba(255,220,250,.55)';
      g.beginPath();
      g.arc(0, 0, pr * 1.65, Math.PI * 1.05, Math.PI * 1.95, true);
      g.stroke();
      g.restore();
      // De neon burcht aan de horizon.
      const base = H * .66;
      g.save();
      const towers = [];
      let x = -20;
      let seed = 7;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      while (x < W + 20) {
        const w = W * (.03 + rnd() * .05);
        const centre = Math.abs(x + w / 2 - W / 2) / (W / 2);
        const h = H * (.08 + rnd() * .14) * (1.2 - centre * .5);
        towers.push({ x, w, h, spire: rnd() < .35 });
        x += w * (.8 + rnd() * .5);
      }
      g.beginPath();
      g.moveTo(0, base);
      for (const t of towers) {
        const top = base - t.h;
        g.lineTo(t.x, base);
        g.lineTo(t.x, top);
        // Kantelen.
        const n = Math.max(2, Math.round(t.w / (H * .012)));
        for (let k = 0; k < n; k++) {
          const a = t.x + (t.w * k) / n, b = t.x + (t.w * (k + .5)) / n;
          g.lineTo(a, top);
          g.lineTo(a, top - H * .01);
          g.lineTo(b, top - H * .01);
          g.lineTo(b, top);
        }
        if (t.spire) {
          g.lineTo(t.x + t.w * .5 - t.w * .25, top);
          g.lineTo(t.x + t.w * .5, top - H * .07);
          g.lineTo(t.x + t.w * .5 + t.w * .25, top);
        }
        g.lineTo(t.x + t.w, top);
        g.lineTo(t.x + t.w, base);
      }
      g.lineTo(W, base);
      g.lineTo(W, H);
      g.lineTo(0, H);
      g.closePath();
      g.fillStyle = '#0a0620';
      g.shadowColor = '#ff4fd8';
      g.shadowBlur = H * .02;
      g.fill();
      g.shadowBlur = 0;
      g.lineWidth = Math.max(1, H * .0025);
      const edge = g.createLinearGradient(0, 0, W, 0);
      edge.addColorStop(0, TEAM[0].c);
      edge.addColorStop(.5, '#c77dff');
      edge.addColorStop(1, TEAM[1].c);
      g.strokeStyle = edge;
      g.stroke();
      // Verlichte ramen.
      for (const t of towers) {
        for (let k = 0; k < t.h / (H * .03); k++) {
          if (rnd() < .45) continue;
          g.fillStyle = rnd() < .5 ? 'rgba(255,214,102,.75)' : 'rgba(120,230,255,.7)';
          g.fillRect(t.x + t.w * (.2 + rnd() * .5), base - t.h + H * .02 + k * H * .03, H * .007, H * .012);
        }
      }
      g.restore();
      // De vloer: donker met een vervaagde horizon.
      const floor = g.createLinearGradient(0, H * .7, 0, H);
      floor.addColorStop(0, '#12062c');
      floor.addColorStop(1, '#030108');
      g.fillStyle = floor;
      g.fillRect(0, H * .7, W, H * .3);
      const fog = g.createLinearGradient(0, H * .62, 0, H * .78);
      fog.addColorStop(0, 'rgba(199,125,255,0)');
      fog.addColorStop(.5, 'rgba(199,125,255,.22)');
      fog.addColorStop(1, 'rgba(199,125,255,0)');
      g.fillStyle = fog;
      g.fillRect(0, H * .6, W, H * .2);
      return c;
    }

    // ---------- Bewegende achtergrond ----------

    function drawLive(t) {
      const { W, H } = S;
      ctx.drawImage(S.bg, 0, 0);
      // Twinkelende sterren.
      for (const s of S.stars) {
        const a = .35 + .65 * Math.abs(Math.sin(t / 900 + s.p));
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(s.x * W, s.y * H, s.r * H / 500, s.r * H / 500);
      }
      // Zoeklichten die over de arena zwaaien.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const ang = Math.sin(t / 2200 + i * 2) * .35 + (i ? -.25 : .25);
        const ox = i ? W * .92 : W * .08;
        ctx.save();
        ctx.translate(ox, -H * .05);
        ctx.rotate(ang);
        const cone = ctx.createLinearGradient(0, 0, 0, H * 1.1);
        cone.addColorStop(0, `${TEAM[i].glow}.32)`);
        cone.addColorStop(1, `${TEAM[i].glow}0)`);
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(-W * .01, 0);
        ctx.lineTo(W * .01, 0);
        ctx.lineTo(W * .12, H * 1.1);
        ctx.lineTo(-W * .12, H * 1.1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      // Hologramvlaggen van de teams.
      for (let i = 0; i < 2; i++) {
        const fx = i ? W * .935 : W * .065;
        const sway = Math.sin(t / 700 + i) * H * .006;
        ctx.save();
        ctx.globalAlpha = .75 + .1 * Math.sin(t / 130 + i * 3);
        const fw = W * .055, fh = H * .3;
        ctx.beginPath();
        ctx.moveTo(fx - fw / 2, H * .08);
        ctx.lineTo(fx + fw / 2, H * .08);
        ctx.lineTo(fx + fw / 2 + sway, H * .08 + fh);
        ctx.lineTo(fx + sway, H * .08 + fh - H * .035);
        ctx.lineTo(fx - fw / 2 + sway, H * .08 + fh);
        ctx.closePath();
        const flag = ctx.createLinearGradient(0, H * .08, 0, H * .08 + fh);
        flag.addColorStop(0, `${TEAM[i].glow}.55)`);
        flag.addColorStop(1, `${TEAM[i].glow}.12)`);
        ctx.fillStyle = flag;
        ctx.shadowColor = TEAM[i].c;
        ctx.shadowBlur = H * .03;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = TEAM[i].c;
        ctx.lineWidth = H * .003;
        ctx.stroke();
        // Scanlijnen van het hologram.
        ctx.globalAlpha = .18;
        ctx.fillStyle = '#fff';
        for (let y = H * .08; y < H * .08 + fh - H * .04; y += H * .008) ctx.fillRect(fx - fw / 2 + sway * ((y - H * .08) / fh), y + ((t / 30) % (H * .008)), fw, 1);
        ctx.globalAlpha = 1;
        ctx.font = `${Math.round(H * .06)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TEAM[i].icon, fx + sway * .5, H * .2);
        ctx.restore();
      }
      // Het publiek: silhouetten die meedeinen, met lichtstaven in de kleur van hun team.
      const cy = H * .71;
      const hype = S.state && S.state.stage === 'fight' ? 1 : .5;
      for (const p of S.crowd) {
        const x = p.x * W;
        const bob = Math.abs(Math.sin(t / (260 / hype) + p.p)) * H * .008 * hype;
        const r = H * .016 * p.s;
        ctx.fillStyle = '#07031a';
        ctx.beginPath();
        ctx.arc(x, cy - r * 2.2 - bob, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x, cy - bob * .4, r * 1.7, r * 1.4, 0, Math.PI, 0);
        ctx.fill();
        if (p.stick >= 0) {
          const a = Math.sin(t / 300 + p.p) * .6;
          ctx.save();
          ctx.translate(x + r, cy - r * 2 - bob);
          ctx.rotate(a);
          // Gloed met een brede doorschijnende streep in plaats van shadowBlur: zelfde effect, veel lichter voor een Chromebook.
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -H * .035);
          ctx.strokeStyle = `${TEAM[p.stick].glow}.28)`;
          ctx.lineWidth = H * .022;
          ctx.stroke();
          ctx.strokeStyle = TEAM[p.stick].c;
          ctx.lineWidth = H * .006;
          ctx.stroke();
          ctx.restore();
        }
      }
      // Neon raster op de vloer, dat langzaam naar je toe schuift.
      const hy = H * .72, vx = W / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, hy, W, H - hy);
      ctx.clip();
      ctx.lineWidth = Math.max(1, H * .0018);
      for (let i = -14; i <= 14; i++) {
        ctx.strokeStyle = i < 0 ? `${TEAM[0].glow}.35)` : i > 0 ? `${TEAM[1].glow}.35)` : 'rgba(199,125,255,.45)';
        ctx.beginPath();
        ctx.moveTo(vx + i * W * .012, hy);
        ctx.lineTo(vx + i * W * .16, H);
        ctx.stroke();
      }
      const shift = (t / 1600) % 1;
      for (let k = 0; k < 12; k++) {
        const f = Math.pow((k + shift) / 12, 2.2);
        const y = hy + f * (H - hy);
        ctx.strokeStyle = `rgba(199,125,255,${.12 + f * .4})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---------- De ridders ----------

    const groundY = () => S.H * .9;
    const fighterH = () => S.H * .47;
    const homeX = i => S.W * (i ? .7 : .3);

    function sprite(i) {
      const name = S.state && S.state.champions ? S.state.champions[i] : '';
      const k = Math.max(4, Math.round(fighterH() / 17));
      return Avatar.sprite(avatarOf(name || TEAM[i].name), { k, armor: TEAM[i].armor });
    }

    // Waar de ridder nu staat: thuis, een uitval naar voren, een sprong of terugdeinzen na een treffer.
    function pose(i, t) {
      const f = S.fighters[i];
      const dir = i ? -1 : 1;
      let x = homeX(i), y = 0, tilt = 0, after = 0;
      const enter = ease((t - f.enter) / 700);
      x -= dir * (1 - enter) * S.W * .4;
      y -= Math.abs(Math.sin(t / 380 + i * 1.7)) * S.H * .008;
      const a = f.attack;
      if (a) {
        const p = (t - a.t0) / a.dur;
        if (p >= 1) f.attack = null;
        else if (a.kind === 'super') {
          // Ineenduiken, dan een flitsende uitval tot vlak bij de tegenstander.
          const go = p < .25 ? -.03 * ease(p / .25) : p < .55 ? -.03 + .33 * ease((p - .25) / .3) : .3 * (1 - ease((p - .55) / .45));
          x += dir * S.W * go;
          y -= p > .25 && p < .65 ? Math.sin(((p - .25) / .4) * Math.PI) * S.H * .12 : 0;
          tilt = dir * (p < .55 ? .25 : .1 * (1 - p));
          after = p > .25 && p < .7 ? 1 : 0;
        } else if (a.kind === 'overdrive') {
          y -= Math.sin(Math.min(1, p * 1.6) * Math.PI) * S.H * .05;
          tilt = Math.sin(t / 40) * .02;
        } else {
          const reach = a.kind === 'combo' ? .09 : .065;
          const go = p < .35 ? ease(p / .35) : 1 - ease((p - .35) / .65);
          x += dir * S.W * reach * go;
          tilt = dir * .12 * go;
        }
      }
      // Een treffer: even terugdeinzen.
      const since = t - f.hitAt;
      if (since < 300) {
        x -= dir * f.recoil * S.W * (1 - since / 300);
        tilt -= dir * .08 * (1 - since / 300);
      }
      return { x, y, tilt, after, flash: since < 110 };
    }

    function drawFighter(i, t, ko) {
      const img = sprite(i);
      const f = S.fighters[i];
      const p = pose(i, t);
      const h = fighterH();
      const w = img.width * (h / img.height);
      const gy = groundY();
      const dir = i ? -1 : 1;
      // Schaduw en neon ring onder de voeten.
      ctx.save();
      const ring = ctx.createRadialGradient(p.x, gy, 0, p.x, gy, w * .7);
      ring.addColorStop(0, `${TEAM[i].glow}.55)`);
      ring.addColorStop(1, `${TEAM[i].glow}0)`);
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.ellipse(p.x, gy, w * .7, h * .06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Energie-aura: hoe voller de balk, hoe feller de vlammen.
      const e = S.energy[i] / 100;
      if (e > .15 && !ko) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = .6 + .4 * Math.sin(t / (e > .9 ? 70 : 200));
        const aura = ctx.createRadialGradient(p.x, gy - h * .5, h * .1, p.x, gy - h * .5, h * .7);
        aura.addColorStop(0, `${TEAM[i].glow}${(.35 * e * pulse).toFixed(3)})`);
        aura.addColorStop(1, `${TEAM[i].glow}0)`);
        ctx.fillStyle = aura;
        ctx.fillRect(p.x - h, gy - h * 1.3, h * 2, h * 1.5);
        ctx.restore();
        if (Math.random() < e * .6) {
          S.parts.push({ x: p.x + rand(-w * .45, w * .45), y: gy - rand(0, h * .3), vx: rand(-.2, .2), vy: -rand(1.5, 3.5) * S.H / 700, life: rand(400, 900), t0: t, c: TEAM[i].c, size: rand(1.5, 3.5) * S.H / 700, kind: 'ember' });
        }
      }
      // Na-beelden tijdens de supermove.
      const draw = (x, y, tilt, alpha, flash) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, gy + y);
        if (ko) {
          // K.O.: achterover vallen.
          const fall = ease((t - ko) / 900);
          ctx.rotate(-dir * fall * Math.PI / 2);
          ctx.translate(0, -fall * h * .05);
        } else ctx.rotate(tilt);
        if (i) ctx.scale(-1, 1);
        if (flash && 'filter' in ctx) ctx.filter = 'brightness(3.2) saturate(0)';
        // Neon rand in de kleur van het team.
        ctx.shadowColor = TEAM[i].c;
        ctx.shadowBlur = S.H * .035;
        ctx.drawImage(img, -w / 2, -h, w, h);
        ctx.restore();
      };
      if (p.after) {
        for (let k = 3; k >= 1; k--) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          draw(p.x - dir * k * S.W * .035, p.y, p.tilt, .18 * (4 - k) / 3, false);
          ctx.restore();
        }
      }
      // Weerspiegeling in de glanzende vloer.
      ctx.save();
      ctx.globalAlpha = .16;
      ctx.translate(p.x, gy);
      ctx.scale(i ? -1 : 1, -.45);
      ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.restore();
      draw(p.x, p.y, p.tilt, 1, p.flash);
      f.head = { x: p.x, y: gy + p.y - h * .78 };
      f.chest = { x: p.x, y: gy + p.y - h * .5 };
      f.w = w;
    }

    // ---------- Effecten ----------

    function sparks(x, y, color, n, power = 1) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2;
        const v = rand(2, 9) * power * S.H / 700;
        S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: rand(250, 650), t0: performance.now(), c: Math.random() < .3 ? '#fff' : color, size: rand(1.5, 3) * S.H / 700, kind: 'spark' });
      }
    }

    function ring(x, y, color, size, dur = 500) {
      S.rings.push({ x, y, color, size, t0: performance.now(), dur });
    }

    function shake(ms, pow) {
      const t = performance.now();
      S.shakeUntil = Math.max(S.shakeUntil, t + ms);
      S.shakePow = Math.max(t < S.shakeUntil - ms ? S.shakePow : 0, pow);
    }

    function flash(color, ms) {
      S.flashUntil = performance.now() + ms;
      S.flashMs = ms;
      S.flashColor = color;
    }

    function announce(text, sub, color, ms = 1600) {
      S.announce = { text, sub, color, t0: performance.now(), ms };
    }

    // Een treffer van de server: de ridder van dat team slaat toe.
    function hit(ev) {
      const t = performance.now();
      const i = ev.team, o = 1 - i;
      const f = S.fighters[i], g = S.fighters[o];
      const cur = f.attack;
      const dur = { slag: 330, combo: 420, super: 1100, overdrive: 1500 }[ev.kind] || 330;
      if (!cur || PRIO[ev.kind] >= PRIO[cur.kind]) f.attack = { kind: ev.kind, t0: t, dur, name: ev.name };
      const delay = ev.kind === 'super' ? 520 : ev.kind === 'overdrive' ? 380 : 110;
      setTimeout(() => impact(ev, i, o), delay);
      if (ev.kind === 'super') {
        announce('SUPERMOVE!', ev.name, TEAM[i].c, 1300);
        sfx.whoosh();
      }
      if (ev.kind === 'overdrive') {
        announce('NEON OVERDRIVE', TEAM[i].name, TEAM[i].c, 1700);
        sfx.power();
      }
      S.combo[i] = { n: ev.chain || 0, at: t };
      S.energy = ev.energy ? [...ev.energy] : S.energy;
      g.pendingHp = ev.hp ? ev.hp[o] : null;
    }

    function impact(ev, i, o) {
      const t = performance.now();
      const g = S.fighters[o];
      const target = g.chest || { x: homeX(o), y: groundY() - fighterH() * .5 };
      g.hitAt = t;
      g.recoil = { slag: .015, combo: .025, super: .06, overdrive: .08 }[ev.kind] || .015;
      if (g.pendingHp !== null && g.pendingHp !== undefined) setHp(o, g.pendingHp);
      g.pendingHp = null;
      const col = TEAM[i].c;
      const slash = { x: target.x, y: target.y, t0: t, kind: ev.kind, dir: i ? -1 : 1, c: col };
      S.bolts.push(slash);
      if (ev.kind === 'slag') {
        sparks(target.x, target.y, col, 10);
        shake(120, S.H * .004);
        sfx.laser();
      } else if (ev.kind === 'combo') {
        sparks(target.x, target.y, col, 18, 1.2);
        ring(target.x, target.y, col, S.H * .12, 350);
        shake(180, S.H * .007);
        sfx.hit();
      } else if (ev.kind === 'super') {
        sparks(target.x, target.y, col, 50, 2);
        ring(target.x, target.y, col, S.H * .35, 600);
        ring(target.x, target.y, '#fff', S.H * .22, 400);
        shake(450, S.H * .018);
        flash('#fff', 140);
        sfx.boom();
      } else if (ev.kind === 'overdrive') {
        for (let k = 0; k < 5; k++) setTimeout(() => {
          const x = target.x + rand(-S.W * .05, S.W * .05);
          S.bolts.push({ x, y: target.y, t0: performance.now(), kind: 'bolt', c: col, seed: Math.random() * 1000 });
          sparks(x, groundY() - fighterH() * rand(.1, .7), col, 16, 1.6);
          sfx.boom();
        }, k * 150);
        ring(target.x, target.y, col, S.H * .5, 900);
        shake(900, S.H * .022);
        flash(col, 260);
      }
      // Het getal van de schade, met de naam van wie de slag gaf.
      S.numbers.push({
        x: target.x + rand(-S.W * .03, S.W * .03), y: target.y - fighterH() * .25, t0: t, c: col, name: ev.name,
        text: `-${Math.round(ev.dmg)}`, big: PRIO[ev.kind] || 1,
      });
      if (S.numbers.length > 16) S.numbers.splice(0, S.numbers.length - 16);
    }

    function setHp(i, hp) {
      if (hp < S.hp[i]) S.ghostAt[i] = performance.now() + 450;
      S.hp[i] = hp;
    }

    function drawEffects(t) {
      const { H } = S;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // Zwaardbogen en bliksems.
      S.bolts = S.bolts.filter(b => t - b.t0 < (b.kind === 'bolt' ? 260 : b.kind === 'super' ? 420 : 240));
      for (const b of S.bolts) {
        const p = (t - b.t0) / (b.kind === 'bolt' ? 260 : b.kind === 'super' ? 420 : 240);
        ctx.strokeStyle = b.c;
        ctx.shadowColor = b.c;
        ctx.shadowBlur = H * .03;
        ctx.globalAlpha = 1 - p;
        if (b.kind === 'bolt') {
          ctx.lineWidth = H * .008;
          ctx.beginPath();
          let x = b.x + Math.sin(b.seed) * H * .05, y = -10;
          ctx.moveTo(x, y);
          let s = b.seed;
          while (y < groundY()) {
            s = (s * 9301 + 49297) % 233280;
            y += H * .05;
            x += ((s / 233280) - .5) * H * .08;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.lineWidth = H * .003;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
          continue;
        }
        const r = H * (b.kind === 'super' ? .3 : b.kind === 'combo' ? .14 : .11);
        const arcs = b.kind === 'combo' ? [-.5, .5] : [0];
        for (const off of arcs) {
          ctx.save();
          ctx.translate(b.x - b.dir * r * .45, b.y);
          ctx.rotate(off + (b.kind === 'super' ? -.6 : -.2) * b.dir);
          ctx.lineWidth = H * (b.kind === 'super' ? .03 : .014) * (1 - p * .6);
          ctx.beginPath();
          const sweep = ease(p * 1.6) * Math.PI * .9;
          if (b.dir > 0) ctx.arc(0, 0, r, -Math.PI * .45, -Math.PI * .45 + sweep);
          else ctx.arc(0, 0, r, Math.PI * 1.45, Math.PI * 1.45 - sweep, true);
          ctx.stroke();
          ctx.lineWidth *= .35;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      // Schokgolven.
      S.rings = S.rings.filter(r => t - r.t0 < r.dur);
      for (const r of S.rings) {
        const p = (t - r.t0) / r.dur;
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = 1 - p;
        ctx.lineWidth = H * .012 * (1 - p);
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.size * ease(p), r.size * ease(p) * .8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Vonken en gloeiende sintels.
      S.parts = S.parts.filter(p => t - p.t0 < p.life);
      if (S.parts.length > 500) S.parts.splice(0, S.parts.length - 500);
      for (const p of S.parts) {
        const k = (t - p.t0) / p.life;
        p.x += p.vx;
        p.y += p.vy;
        if (p.kind === 'spark') { p.vy += .25 * S.H / 700; p.vx *= .96; }
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = p.c;
        if (p.kind === 'spark') {
          ctx.strokeStyle = p.c;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - k * .5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      // Schadegetallen.
      S.numbers = S.numbers.filter(n => t - n.t0 < 1100);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const n of S.numbers) {
        const p = (t - n.t0) / 1100;
        const pop = p < .15 ? 1 + (1 - p / .15) * .8 : 1;
        const size = H * (.035 + n.big * .012) * pop;
        ctx.globalAlpha = p > .7 ? 1 - (p - .7) / .3 : 1;
        const y = n.y - ease(p) * H * .09;
        ctx.font = `italic 900 ${Math.round(size)}px Orbitron, sans-serif`;
        ctx.lineWidth = size * .16;
        ctx.strokeStyle = '#07031a';
        ctx.strokeText(n.text, n.x, y);
        ctx.fillStyle = n.big >= 3 ? '#fff3b0' : n.c;
        ctx.shadowColor = n.c;
        ctx.shadowBlur = H * .02;
        ctx.fillText(n.text, n.x, y);
        ctx.shadowBlur = 0;
        if (n.name) {
          ctx.font = `800 ${Math.round(H * .022)}px 'Exo 2', sans-serif`;
          ctx.lineWidth = H * .006;
          ctx.strokeText(n.name, n.x, y + size * .75);
          ctx.fillStyle = '#fff';
          ctx.fillText(n.name, n.x, y + size * .75);
        }
      }
      ctx.restore();
    }

    // ---------- Balken en teksten ----------

    function slanted(x, y, w, h, dir) {
      const s = h * .9 * dir;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - s, y + h);
      ctx.lineTo(x - s, y + h);
      ctx.closePath();
    }

    function drawHud(t) {
      const { W, H } = S;
      const s = S.state || {};
      const bw = W * .36, bh = H * .05, by = H * .06;
      for (let i = 0; i < 2; i++) {
        // Spookbalk: de schade blijft even wit zichtbaar en zakt dan weg.
        if (t > S.ghostAt[i]) S.ghost[i] += (S.hp[i] - S.ghost[i]) * .08;
        if (S.ghost[i] < S.hp[i]) S.ghost[i] = S.hp[i];
        const x0 = i ? W * .56 : W * .44 - bw;
        const dir = i ? -1 : 1;
        ctx.save();
        slanted(x0, by, bw, bh, dir);
        ctx.fillStyle = 'rgba(5,2,20,.85)';
        ctx.fill();
        ctx.clip();
        const fill = (frac, style) => {
          const w = bw * Math.max(0, Math.min(1, frac / 100)) + bh;
          ctx.fillStyle = style;
          if (i) ctx.fillRect(x0 - bh, by, w, bh);
          else ctx.fillRect(x0 + bw - w + bh, by, w, bh);
        };
        fill(S.ghost[i], '#fff');
        const low = S.hp[i] < 25;
        const grad = ctx.createLinearGradient(0, by, 0, by + bh);
        grad.addColorStop(0, low && Math.sin(t / 90) > 0 ? '#ffffff' : '#fff3b0');
        grad.addColorStop(.25, low ? '#ff2d55' : TEAM[i].c);
        grad.addColorStop(1, low ? '#7a0018' : TEAM[i].dark);
        fill(S.hp[i], grad);
        ctx.restore();
        ctx.save();
        slanted(x0, by, bw, bh, dir);
        ctx.strokeStyle = TEAM[i].c;
        ctx.shadowColor = TEAM[i].c;
        ctx.shadowBlur = H * .02;
        ctx.lineWidth = H * .004;
        ctx.stroke();
        ctx.restore();
        // Naam van het team, en wie er deze ronde vecht.
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = i ? 'right' : 'left';
        const tx = i ? W * .95 : W * .05;
        ctx.font = `900 ${Math.round(H * .034)}px Orbitron, sans-serif`;
        ctx.fillStyle = TEAM[i].c;
        ctx.shadowColor = TEAM[i].c;
        ctx.shadowBlur = H * .015;
        ctx.fillText(`${TEAM[i].icon} ${TEAM[i].name.toUpperCase()}`, tx, by - H * .012);
        ctx.shadowBlur = 0;
        ctx.font = `700 ${Math.round(H * .024)}px 'Exo 2', sans-serif`;
        ctx.fillStyle = '#eaf4ff';
        const size = s.sizes ? s.sizes[i] : 0;
        const champ = s.champions && s.champions[i] ? `⚔ ${s.champions[i]} vecht` : '';
        ctx.fillText([champ, `${size} ${size === 1 ? 'ridder' : 'ridders'}`].filter(Boolean).join('  ·  '), tx, by + bh + H * .035);
        // Gewonnen rondes.
        const need = Math.ceil((s.bestOf || 3) / 2);
        for (let k = 0; k < need; k++) {
          const cx = i ? W * .56 + H * .02 + k * H * .04 : W * .44 - H * .02 - k * H * .04;
          ctx.beginPath();
          ctx.arc(cx, by + bh + H * .028, H * .013, 0, Math.PI * 2);
          ctx.fillStyle = s.wins && s.wins[i] > k ? '#ffc94a' : 'rgba(255,255,255,.12)';
          ctx.shadowColor = '#ffc94a';
          ctx.shadowBlur = s.wins && s.wins[i] > k ? H * .02 : 0;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255,201,74,.7)';
          ctx.lineWidth = H * .003;
          ctx.stroke();
        }
        ctx.restore();
        // Energiebalk van het team onderaan.
        const ew = W * .3, eh = H * .026, ey = H * .955;
        const ex = i ? W * .95 - ew : W * .05;
        const e = S.energy[i];
        ctx.save();
        slanted(ex, ey, ew, eh, dir);
        ctx.fillStyle = 'rgba(5,2,20,.8)';
        ctx.fill();
        ctx.save();
        ctx.clip();
        const fw = ew * e / 100 + eh;
        const eg = ctx.createLinearGradient(ex, 0, ex + ew, 0);
        eg.addColorStop(0, i ? '#fff3b0' : TEAM[i].c);
        eg.addColorStop(1, i ? TEAM[i].c : '#fff3b0');
        ctx.fillStyle = eg;
        ctx.globalAlpha = e > 85 ? .75 + .25 * Math.sin(t / 60) : 1;
        if (i) ctx.fillRect(ex + ew + eh - fw, ey, fw, eh);
        else ctx.fillRect(ex - eh, ey, fw, eh);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(5,2,20,.8)';
        for (let k = 1; k < 4; k++) ctx.fillRect(ex + (ew * k) / 4, ey, H * .004, eh);
        ctx.restore();
        ctx.strokeStyle = TEAM[i].c;
        ctx.lineWidth = H * .003;
        ctx.stroke();
        ctx.font = `800 ${Math.round(H * .02)}px Orbitron, sans-serif`;
        ctx.textAlign = i ? 'right' : 'left';
        ctx.fillStyle = e > 85 ? '#fff3b0' : '#eaf4ff';
        ctx.fillText(e >= 99 ? 'OVERDRIVE!' : `ENERGIE ${Math.floor(e)}%`, i ? ex + ew : ex, ey - H * .008);
        ctx.restore();
        // De combo-teller aan de kant van het team.
        const c = S.combo[i];
        if (c.n >= 3 && t - c.at < 1800) {
          const p = (t - c.at) / 1800;
          const pop = 1 + Math.max(0, .35 - (t - c.at) / 300);
          ctx.save();
          ctx.globalAlpha = p > .75 ? (1 - p) / .25 : 1;
          ctx.translate(i ? W * .93 : W * .07, H * .36);
          ctx.scale(pop, pop);
          ctx.textAlign = i ? 'right' : 'left';
          ctx.font = `italic 900 ${Math.round(H * .085)}px Orbitron, sans-serif`;
          ctx.lineWidth = H * .01;
          ctx.strokeStyle = '#07031a';
          ctx.strokeText(String(c.n), 0, 0);
          ctx.fillStyle = '#fff3b0';
          ctx.shadowColor = TEAM[i].c;
          ctx.shadowBlur = H * .03;
          ctx.fillText(String(c.n), 0, 0);
          ctx.font = `italic 900 ${Math.round(H * .032)}px Orbitron, sans-serif`;
          ctx.fillStyle = TEAM[i].c;
          ctx.fillText('HITS COMBO', 0, H * .045);
          ctx.restore();
        }
      }
      // De klok in het midden.
      const now = Date.now() + (S.offset || 0);
      let secs = s.roundSec || 0;
      if (s.stage === 'fight' || s.stage === 'ko') secs = Math.max(0, Math.ceil((s.roundEnds - now) / 1000));
      if (s.stage === 'ko') secs = S.frozenSecs ?? secs;
      else S.frozenSecs = secs;
      ctx.save();
      const cx = W / 2, cy = H * .085, r = H * .062;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) ctx.lineTo(cx + r * Math.cos(Math.PI / 6 + k * Math.PI / 3), cy + r * Math.sin(Math.PI / 6 + k * Math.PI / 3));
      ctx.closePath();
      ctx.fillStyle = 'rgba(5,2,20,.9)';
      ctx.fill();
      ctx.strokeStyle = '#ffc94a';
      ctx.shadowColor = '#ffc94a';
      ctx.shadowBlur = H * .02;
      ctx.lineWidth = H * .004;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(H * .05)}px Orbitron, sans-serif`;
      ctx.fillStyle = secs <= 10 && s.stage === 'fight' && Math.sin(t / 120) > 0 ? '#ff4d6d' : '#fff3b0';
      ctx.fillText(String(secs), cx, cy + H * .003);
      ctx.font = `800 ${Math.round(H * .02)}px Orbitron, sans-serif`;
      ctx.lineWidth = H * .006;
      ctx.strokeStyle = '#07031a';
      ctx.strokeText(`RONDE ${s.round || 1}`, cx, cy + r + H * .022);
      ctx.fillStyle = '#fff';
      ctx.fillText(`RONDE ${s.round || 1}`, cx, cy + r + H * .022);
      ctx.restore();
    }

    function drawAnnounce(t) {
      const a = S.announce;
      if (!a) return;
      const p = (t - a.t0) / a.ms;
      if (p >= 1) { S.announce = null; return; }
      const { W, H } = S;
      const scale = p < .12 ? 2.4 - 1.4 * ease(p / .12) : 1 + (p - .12) * .08;
      ctx.save();
      ctx.globalAlpha = p > .8 ? (1 - p) / .2 : 1;
      ctx.translate(W / 2, H * .45);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const size = Math.round(H * (a.text.length > 10 ? .1 : .15));
      ctx.font = `italic 900 ${size}px Orbitron, sans-serif`;
      // Glitch: verschoven kopieën in cyaan en roze.
      const j = p < .3 ? H * .008 : H * .003;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(63,216,255,.8)';
      ctx.fillText(a.text, -j, 0);
      ctx.fillStyle = 'rgba(255,61,110,.8)';
      ctx.fillText(a.text, j, j * .5);
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = size * .08;
      ctx.strokeStyle = '#07031a';
      ctx.strokeText(a.text, 0, 0);
      const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(.5, '#fff3b0');
      g.addColorStop(1, a.color || '#ffc94a');
      ctx.fillStyle = g;
      ctx.shadowColor = a.color || '#ffc94a';
      ctx.shadowBlur = H * .04;
      ctx.fillText(a.text, 0, 0);
      if (a.sub) {
        ctx.shadowBlur = H * .02;
        ctx.font = `900 ${Math.round(H * .045)}px 'Exo 2', sans-serif`;
        ctx.lineWidth = H * .01;
        ctx.strokeText(a.sub, 0, size * .8);
        ctx.fillStyle = '#fff';
        ctx.fillText(a.sub, 0, size * .8);
      }
      ctx.restore();
    }

    // ---------- Stand van de server ----------

    function setState(s, offset) {
      const prev = S.state;
      S.state = s;
      S.offset = offset || 0;
      if (s.hp) for (let i = 0; i < 2; i++) if (S.fighters[i].pendingHp == null || s.stage !== 'fight') setHp(i, s.hp[i]);
      if (s.energy) S.energy = [...s.energy];
      const key = `${s.run}|${s.round}|${s.stage}`;
      if (key === S.roundKey || s.phase !== 'play') return;
      S.roundKey = key;
      const t = performance.now();
      if (s.stage === 'intro') {
        S.hp = [100, 100];
        S.ghost = [100, 100];
        S.ko = null;
        for (const f of S.fighters) { f.enter = t; f.attack = null; f.pendingHp = null; }
        announce(`RONDE ${s.round}`, s.round === s.bestOf ? 'Laatste ronde!' : '', '#c77dff', 2200);
        sfx.gong();
        setTimeout(() => { if (S.state && S.state.stage !== 'ko') { announce('FIGHT!', '', '#ffc94a', 1300); sfx.go(); flash('#fff', 120); } }, 2600);
      } else if (s.stage === 'ko' && prev) {
        const w = s.roundWinner;
        if (w >= 0) {
          const ko = s.hp[1 - w] <= 0;
          S.ko = ko ? { loser: 1 - w, t0: t + 300 } : null;
          announce(ko ? 'K.O.!' : 'TIJD OM', `${TEAM[w].name} wint de ronde`, TEAM[w].c, 3600);
          if (ko) { shake(600, S.H * .02); flash('#fff', 200); sfx.boom(); }
          else sfx.gong();
        } else {
          announce('TIJD OM', 'Gelijkspel', '#c77dff', 3200);
          sfx.gong();
        }
      }
    }

    function frame() {
      resize();
      const t = performance.now();
      const { W, H } = S;
      ctx.save();
      if (t < S.shakeUntil) {
        const k = (S.shakeUntil - t) / 400;
        ctx.translate(rand(-1, 1) * S.shakePow * Math.min(1, k), rand(-1, 1) * S.shakePow * Math.min(1, k));
      }
      drawLive(t);
      // De ridder die aanvalt staat vooraan.
      const order = S.fighters[1].attack && !S.fighters[0].attack ? [0, 1] : [1, 0];
      for (const i of order) drawFighter(i, t, S.ko && S.ko.loser === i && t > S.ko.t0 ? S.ko.t0 : 0);
      drawEffects(t);
      ctx.restore();
      // Vignet.
      const v = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .7);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
      drawHud(t);
      drawAnnounce(t);
      if (t < S.flashUntil) {
        ctx.globalAlpha = (S.flashUntil - t) / S.flashMs * .7;
        ctx.fillStyle = S.flashColor;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }

    return { setState, hit, frame, announce, resize };
  }

  return { create, TEAM, avatarOf };
})();
