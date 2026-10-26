// Gedeelde effecten voor docent en leerling: iconen, geluiden en confetti. Alles lokaal, zonder externe bestanden.

// Vier wapens voor de vier antwoorden: zwaard, schild, kroon en toren.
const ICONS = [
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1l2.2 3.2V14H17v2.2h-3.6v3.1a2 2 0 1 1-2.8 0v-3.1H7V14h2.8V4.2z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l8 3v6c0 5.5-3.5 9.5-8 11-4.5-1.5-8-5.5-8-11V5z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7.5l4.6 4.2L12 4.5l4.4 7.2L21 7.5 19.2 18H4.8zM5 19.5h14V21H5z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 2.5h3v2.2h2.5V2.5h3v2.2H16V2.5h3v6.3l-2 2V21H7V10.8l-2-2zM10.3 21v-4a1.7 1.7 0 0 1 3.4 0v4z"/></svg>',
];
const ICON_NAMES = ['Zwaard', 'Schild', 'Kroon', 'Toren'];
const CROWN = ICONS[2];

// --- Geluid: kleine synthesizer, zodat er geen geluidsbestanden nodig zijn ---
const sfx = (() => {
  let ctx = null;
  let engine = null;
  let muted = false;
  try { muted = localStorage.getItem('lancelot-muted') === '1'; } catch {}

  function audio() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, { type = 'sine', vol = .18, slide = 0 } = {}) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + start;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + .015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + dur + .05);
  }

  function noise(start, dur, vol = .12) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + start;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = a.createBufferSource();
    const gain = a.createGain();
    const filter = a.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(filter).connect(gain).connect(a.destination);
    src.start(t);
  }

  return {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('lancelot-muted', muted ? '1' : '0'); } catch {}
      return muted;
    },
    unlock() { audio(); },
    join() { tone(880, 0, .12, { type: 'triangle' }); tone(1320, .08, .16, { type: 'triangle' }); },
    whoosh() { tone(220, 0, .5, { type: 'sawtooth', vol: .06, slide: 4 }); },
    go() { [523, 659, 784].forEach((f, i) => tone(f, i * .07, .25, { type: 'square', vol: .08 })); },
    tick(low) { tone(low ? 660 : 990, 0, .06, { type: 'square', vol: .06 }); },
    gong() { tone(196, 0, 1.4, { type: 'sine', vol: .25 }); tone(392, 0, 1, { type: 'triangle', vol: .08 }); },
    good() { [784, 1046, 1318].forEach((f, i) => tone(f, i * .09, .3, { type: 'triangle', vol: .14 })); },
    bad() { tone(196, 0, .35, { type: 'sawtooth', vol: .1, slide: .7 }); },
    swoosh() { noise(0, .35, .08); },
    jump() { tone(300, 0, .16, { type: 'square', vol: .05, slide: 2.2 }); },
    empty() { tone(140, 0, .25, { type: 'square', vol: .06 }); tone(110, .12, .3, { type: 'square', vol: .06 }); },
    hit() { noise(0, .25, .14); tone(220, 0, .5, { type: 'sawtooth', vol: .08, slide: .3 }); },
    laser() { tone(1400, 0, .12, { type: 'square', vol: .035, slide: .35 }); },
    marker() { tone(1800, 0, .05, { type: 'triangle', vol: .09 }); },
    boom() { noise(0, .45, .2); tone(120, 0, .4, { type: 'sawtooth', vol: .1, slide: .4 }); },
    power() { [523, 784, 1046, 1568].forEach((f, i) => tone(f, i * .06, .2, { type: 'square', vol: .06 })); },
    // Een zoemende motor die meegaat met de snelheid (0 = stil, 1 = vol gas).
    engine(level) {
      if (muted || !level) {
        if (engine) engine.gain.gain.setTargetAtTime(0, ctx.currentTime, .1);
        return;
      }
      const a = audio();
      if (!a) return;
      if (!engine) {
        const filter = a.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 700;
        engine = { low: a.createOscillator(), high: a.createOscillator(), gain: a.createGain() };
        engine.low.type = 'sawtooth';
        engine.high.type = 'square';
        engine.gain.gain.value = 0;
        engine.low.connect(filter);
        engine.high.connect(filter);
        filter.connect(engine.gain).connect(a.destination);
        engine.low.start();
        engine.high.start();
      }
      const t = a.currentTime;
      engine.low.frequency.setTargetAtTime(45 + level * 120, t, .06);
      engine.high.frequency.setTargetAtTime(90 + level * 260, t, .06);
      engine.gain.gain.setTargetAtTime(.02 + Math.min(1.4, level) * .025, t, .08);
    },
    drumroll(seconds = 2) {
      for (let t = 0; t < seconds; t += .06) noise(t, .05, .05 + t / seconds * .1);
    },
    fanfare() {
      const notes = [[523, 0, .18], [523, .2, .12], [523, .34, .12], [659, .5, .5], [523, 1.05, .2], [659, 1.27, .2], [784, 1.5, .9]];
      notes.forEach(([f, s, d]) => { tone(f, s, d, { type: 'sawtooth', vol: .07 }); tone(f / 2, s, d, { type: 'square', vol: .04 }); });
    },
  };
})();

// --- Confetti ---
function confetti(duration = 4000) {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti';
  document.body.appendChild(canvas);
  const c = canvas.getContext('2d');
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize();
  const colors = ['#4cc9ff', '#ffc94a', '#ff4d6d', '#2ee6a6', '#3d8bff', '#ffffff'];
  const parts = Array.from({ length: 180 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * .5,
    vx: (Math.random() - .5) * 3,
    vy: 2 + Math.random() * 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - .5) * .3,
    w: 6 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const end = performance.now() + duration;
  (function frame(now) {
    c.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.r);
      c.fillStyle = p.color;
      c.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2);
      c.restore();
    }
    if (now < end) requestAnimationFrame(frame);
    else canvas.remove();
  })(performance.now());
}

// Een spel starten. Loopt er nog een ander spel, dan vragen we of dat mag stoppen in plaats van een foutmelding te tonen.
const GAME_OF_EVENT = {
  load: 'toernooi', 'rt-load': 'rondetafel', 'tw-load': 'toren', 'sj-load': 'schat', 'ls-load': 'laserslag', 'rr-load': 'race',
  'bb-load': 'burcht', 'du-load': 'duel', 'pk-load': 'knight', 'sr-load': 'rossen', 'gt-load': 'gauntlet', 'ry-load': 'royale', 'sv-load': 'sterren', 'rs-load': 'slang', 'bs-load': 'storm', 'pw-load': 'poort', 'nv-load': 'vlucht', 'db-load': 'diep', 'px-load': 'pixel', 'mo-load': 'robomol', 'kk-load': 'kerker', 'rp-load': 'paarden', 'nd-load': 'neon', 'lb-load': 'baas', 'rk-load': 'rijk', 'kr-load': 'roof', 'vr-load': 'verrader', 'ob-load': 'oefenblad',
  'cg-load': 'galaga', 'bk-load': 'bomber', 'opwarmer-start': 'toernooi',
};
function loadGame(event, payload, cb) {
  socket.emit(event, payload, async res => {
    if (res && res.busy) {
      const what = res.error.replace(/\s*(Stop|Sluit) \S+ (spel )?eerst\.$/, '');
      if (await Ui.vraag(`${what}\n\nWil je dat nu stoppen en hier beginnen? De resultaten worden bewaard.`)) {
        socket.emit('stop-others', GAME_OF_EVENT[event], () => socket.emit(event, payload, cb));
        return;
      }
    }
    cb(res);
  });
}

// Het gekozen tempo van de vragen onthouden voor de volgende keer (op deze pc).
for (const sel of document.querySelectorAll('select.tempo-select')) {
  try {
    const saved = localStorage.getItem('lancelot-tempo');
    if (saved && [...sel.options].some(o => o.value === saved)) sel.value = saved;
  } catch {}
  sel.addEventListener('change', () => { try { localStorage.setItem('lancelot-tempo', sel.value); } catch {} });
}

// ---------- Tegen gokken ----------
// Na een fout antwoord even wachten. el krijgt een aftelling ("Even wachten… 3"), daarna volgt then().
function gokWait(el, ms, then) {
  const end = performance.now() + ms;
  let small = el && el.querySelector('small.gok-wait');
  if (el && !small) {
    small = document.createElement('small');
    small.className = 'gok-wait';
    el.append(small);
  }
  const step = () => {
    const left = end - performance.now();
    if (left <= 0) {
      clearInterval(timer);
      if (small) small.remove();
      then();
      return;
    }
    if (small) small.textContent = `Even wachten… ${Math.ceil(left / 1000)}`;
  };
  const timer = setInterval(step, 200);
  step();
  return () => { clearInterval(timer); if (small) small.remove(); };
}

// Na een fout antwoord: de flits kort tonen, dan het juiste antwoord in beeld laten en aftellen tot de volgende vraag.
function gokHold(flash, el, res, then) {
  setTimeout(() => flash && flash.classList.add('hidden'), 1100);
  gokWait(el, Math.max(res.wait || 0, 1800), then);
}

// Leerling: na drie keer snel en fout een duidelijke pauze. Leerkracht: wie lijkt te gokken.
addEventListener('DOMContentLoaded', () => {
  if (typeof socket === 'undefined') return;
  socket.on('gok-pauze', ({ ms } = {}) => {
    let box = document.getElementById('gok-pauze');
    if (!box) {
      box = document.createElement('div');
      box.id = 'gok-pauze';
      box.className = 'gok-pauze';
      box.innerHTML = '<div><b>🛑 Te snel gegokt!</b><span>Lees de vraag en alle antwoorden rustig. Je kan zo verder.</span><small></small></div>';
      document.body.append(box);
    }
    box.classList.remove('hidden');
    clearInterval(box.timer);
    const end = performance.now() + (ms || 4000);
    const step = () => {
      const left = end - performance.now();
      if (left <= 0) { clearInterval(box.timer); box.classList.add('hidden'); return; }
      box.querySelector('small').textContent = Math.ceil(left / 1000);
    };
    box.timer = setInterval(step, 200);
    step();
    if (typeof buzz === 'function') buzz([200, 100, 200]);
  });
  socket.on('gok', ({ name, spel, flags } = {}) => {
    let list = document.getElementById('gok-list');
    if (!list) {
      list = document.createElement('div');
      list.id = 'gok-list';
      list.className = 'gok-list';
      list.title = 'Klik om te sluiten';
      list.innerHTML = '<b>⚠️ Gokt er iemand?</b><ul></ul>';
      list.addEventListener('click', () => { list.remove(); });
      document.body.append(list);
    }
    const ul = list.querySelector('ul');
    const item = [...ul.children].find(li => li.dataset.name === name) || document.createElement('li');
    item.dataset.name = name;
    item.textContent = `${name} klikt te snel fout${spel ? ` (${spel})` : ''}${flags > 1 ? ` · ${flags}e keer` : ''}`;
    ul.prepend(item);
    list.classList.remove('flash');
    void list.offsetWidth;
    list.classList.add('flash');
  });
});
// --- Gloed voor canvasspellen ---
// Een zachte lichtvlek, één keer vooraf getekend per kleur. Veel lichter dan shadowBlur, zodat ook een
// Chromebook vlot blijft als er tientallen lichtjes tegelijk zijn. Ook een donkere rand (vignet) en bliksem.
const Glow = (() => {
  const glowCache = new Map();
  function rgba(color, a) {
    if (color[0] === '#') {
      const n = parseInt(color.length === 4 ? color.slice(1).replace(/./g, c => c + c) : color.slice(1, 7), 16);
      return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
    }
    const m = color.match(/[\d.]+/g) || [255, 255, 255];
    return `rgba(${m[0]},${m[1]},${m[2]},${a})`;
  }
  function glowSprite(color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, rgba(color, 1));
    grad.addColorStop(.25, rgba(color, .55));
    grad.addColorStop(.6, rgba(color, .15));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
    return c;
  }
  // Teken een lichtvlek met straal r. sy < 1 maakt hem plat (een lichtplas op de grond).
  function glow(ctx, x, y, r, color, alpha = 1, sy = 1) {
    if (r <= 0 || alpha <= 0 || !color) return;
    const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = ga * Math.min(1, alpha);
    ctx.drawImage(glowSprite(color), x - r, y - r * sy, r * 2, r * 2 * sy);
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = ga;
  }

  // Een donkere rand rond het beeld, één keer per schermgrootte getekend.
  let vigCache = null;
  function vignette(ctx, w, h, strength = .55) {
    if (!vigCache || vigCache.width !== w || vigCache.height !== h || vigCache.k !== strength) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h; c.k = strength;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.hypot(w, h) * .55);
      grad.addColorStop(0, 'rgba(2,3,10,0)');
      grad.addColorStop(1, `rgba(2,3,10,${strength})`);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      vigCache = c;
    }
    ctx.drawImage(vigCache, 0, 0);
  }

  // Een bliksemschicht van a naar b: een gekarteld lijntje met een lichtende kern.
  function lightning(ctx, x0, y0, x1, y1, color = '#d9a8ff', width = 3, jag = .18) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(4, Math.round(len / 28));
    const nx = -(y1 - y0) / (len || 1), ny = (x1 - x0) / (len || 1);
    const pts = [[x0, y0]];
    for (let i = 1; i < n; i++) {
      const k = i / n, off = (Math.random() - .5) * len * jag * Math.sin(k * Math.PI);
      pts.push([x0 + (x1 - x0) * k + nx * off, y0 + (y1 - y0) * k + ny * off]);
    }
    pts.push([x1, y1]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const [lw, col, a] of [[width * 4, color, .25], [width * 1.6, color, .7], [width * .6, '#ffffff', 1]]) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1]));
      ctx.stroke();
    }
    ctx.restore();
  }
  // De ruimte als achtergrond: een nevel met sterren, één keer getekend (1024 px, naadloos) en daarna herhaald.
  // ox/oy laten hem meeschuiven met de camera (trager dan de wereld geeft diepte).
  let spaceTile = null;
  function space(ctx, w, h, ox = 0, oy = 0) {
    if (!spaceTile) {
      const c = document.createElement('canvas');
      c.width = c.height = 1024;
      const g = c.getContext('2d');
      g.fillStyle = '#04030c';
      g.fillRect(0, 0, 1024, 1024);
      let seed = 99;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 26; i++) {
        const x = rnd() * 1024, y = rnd() * 1024, r = 120 + rnd() * 260;
        const col = ['#5b2a9e', '#1d4fa8', '#a02a7a', '#14627a'][i % 4];
        for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) glow(g, x + dx, y + dy, r, col, .18);
      }
      for (let i = 0; i < 420; i++) {
        const x = rnd() * 1024, y = rnd() * 1024, b = rnd();
        g.fillStyle = `rgba(${200 + b * 55},${210 + b * 45},255,${.35 + b * .6})`;
        g.fillRect(x, y, b > .9 ? 2.2 : 1.3, b > .9 ? 2.2 : 1.3);
        if (b > .96) glow(g, x + 1, y + 1, 9, '#bfe4ff', .6);
      }
      spaceTile = c;
    }
    const px = ((ox % 1024) + 1024) % 1024, py = ((oy % 1024) + 1024) % 1024;
    for (let x = px - 1024; x < w; x += 1024) for (let y = py - 1024; y < h; y += 1024) ctx.drawImage(spaceTile, x, y);
  }

  return { rgba, glowSprite, glow, vignette, lightning, space };
})();
