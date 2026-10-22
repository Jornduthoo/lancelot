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
