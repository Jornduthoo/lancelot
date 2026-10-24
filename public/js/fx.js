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
  'bb-load': 'burcht', 'du-load': 'duel', 'pk-load': 'knight', 'sr-load': 'rossen', 'gt-load': 'gauntlet', 'ry-load': 'royale', 'nd-load': 'neon', 'lb-load': 'baas', 'rk-load': 'rijk', 'kr-load': 'roof', 'vr-load': 'verrader', 'ob-load': 'oefenblad',
  'cg-load': 'galaga', 'bk-load': 'bomber', 'opwarmer-start': 'toernooi',
};
function loadGame(event, payload, cb) {
  socket.emit(event, payload, res => {
    if (res && res.busy) {
      const what = res.error.replace(/\s*(Stop|Sluit) \S+ (spel )?eerst\.$/, '');
      if (confirm(`${what}\n\nWil je dat nu stoppen en hier beginnen? De resultaten worden bewaard.`)) {
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
