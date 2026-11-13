// Gedeeld door de app van Eli en de ouderpagina: database, sessie, datums, confetti en toasts.
(function(){
const DB = {
  url: 'https://kkqzstqsczcooutdjypt.supabase.co/rest/v1/rpc/',
  key: 'sb_publishable_woxocUFof4ifDWmkVGsHsQ_HL_eMAhc',
};

async function rpc(fn, args, opts = {}){
  const r = await fetch(DB.url + fn, {
    method: 'POST',
    headers: { apikey: DB.key, 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {}),
    keepalive: !!opts.keepalive,
  });
  if (!r.ok) {
    let msg = 'fout ' + r.status;
    try { const j = await r.json(); msg = j.message || msg; } catch {}
    const e = new Error(msg); e.status = r.status; throw e;
  }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

// Sessie: alleen zolang het tabblad open is. Morgen opnieuw inloggen (zo hoort het).
const SESSIE = 'eli-sessie';
const sessie = {
  get(){ try { return JSON.parse(sessionStorage.getItem(SESSIE)); } catch { return null; } },
  set(v){ try { sessionStorage.setItem(SESSIE, JSON.stringify(v)); } catch {} },
  wis(){ try { sessionStorage.removeItem(SESSIE); } catch {} },
};
const lokaal = {
  get(k, d){ try { const v = localStorage.getItem('eli-' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v){ try { localStorage.setItem('eli-' + k, JSON.stringify(v)); } catch {} },
};

// Datum in België, als 'YYYY-MM-DD'.
function vandaag(){
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  return (window.ELI_TEST_DATUM || p);
}
function opDag(iso){ // timestamp -> Belgische datum
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(iso));
}
const DAGEN = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
const MAANDEN = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
function mooiDatum(d, kort){
  const x = new Date(d + 'T12:00:00');
  return kort ? DAGEN[x.getDay()].slice(0,2) + ' ' + x.getDate() + '/' + (x.getMonth()+1)
              : DAGEN[x.getDay()] + ' ' + x.getDate() + ' ' + MAANDEN[x.getMonth()];
}
function dagenTussen(a, b){ return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const $ = id => document.getElementById(id);

// Toast
let toastT;
function toast(tekst){
  let el = $('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role','status'); document.body.append(el); }
  el.textContent = tekst;
  el.classList.add('toon');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('toon'), 2600);
}

// Confetti (eigen canvas, geen bibliotheek nodig)
function confetti(ms = 2500){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let c = $('confetti');
  if (!c) { c = document.createElement('canvas'); c.id = 'confetti'; document.body.append(c); }
  const ctx = c.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const kleuren = ['#2f9e44','#f5b700','#6741d9','#ff6b6b','#4dabf7','#ffffff'];
  const deel = Array.from({length: 160}, () => ({
    x: Math.random() * c.width, y: -Math.random() * c.height * .5, vx: (Math.random() - .5) * 4 * dpr, vy: (2 + Math.random() * 4) * dpr,
    r: (4 + Math.random() * 6) * dpr, a: Math.random() * 6, va: (Math.random() - .5) * .3, k: kleuren[Math.floor(Math.random() * kleuren.length)], bal: Math.random() < .08,
  }));
  const eind = performance.now() + ms;
  (function stap(t){
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of deel) {
      p.x += p.vx; p.y += p.vy; p.vy += .05 * dpr; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      if (p.bal) { ctx.font = (p.r * 3) + 'px serif'; ctx.fillText('⚽', -p.r, p.r); }
      else { ctx.fillStyle = p.k; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); }
      ctx.restore();
    }
    if (t < eind) requestAnimationFrame(stap); else ctx.clearRect(0, 0, c.width, c.height);
  })(performance.now());
}

function xpPop(n, x, y){
  const el = document.createElement('div');
  el.className = 'xp-pop';
  el.textContent = '+' + n + ' XP';
  el.style.left = (x ?? innerWidth / 2 - 40) + 'px';
  el.style.top = (y ?? innerHeight / 2) + 'px';
  document.body.append(el);
  setTimeout(() => el.remove(), 1200);
}

// Kleine geluidjes (WebAudio), stil als het toestel stil moet.
let actx = null;
function piep(soort){
  if (lokaal.get('stil', false)) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const noten = { goed:[660, 880], fout:[220, 180], klaar:[523, 659, 784, 1046], klik:[440] }[soort] || [440];
    noten.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = soort === 'fout' ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      const t0 = actx.currentTime + i * .09;
      g.gain.setValueAtTime(.0001, t0);
      g.gain.exponentialRampToValueAtTime(soort === 'fout' ? .05 : .12, t0 + .02);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + .22);
      o.connect(g).connect(actx.destination);
      o.start(t0); o.stop(t0 + .25);
    });
  } catch {}
}

// Een foto verkleinen tot een lichte webp/jpeg (voor de selfie).
async function verklein(bestandOfCanvas, max = 640, kwaliteit = .78){
  let bron = bestandOfCanvas;
  if (bestandOfCanvas instanceof Blob) {
    bron = await new Promise((ok, nok) => { const img = new Image(); img.onload = () => ok(img); img.onerror = nok; img.src = URL.createObjectURL(bestandOfCanvas); });
  }
  const w = bron.videoWidth || bron.naturalWidth || bron.width, h = bron.videoHeight || bron.naturalHeight || bron.height;
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext('2d').drawImage(bron, 0, 0, c.width, c.height);
  let url = c.toDataURL('image/webp', kwaliteit);
  if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', kwaliteit);
  return url;
}

const NAMEN = { eli:'Eli', papa:'Papa', mama:'Mama', moemoe:'Moemoe', boeboe:'Boeboe', opa:'Opa Limburg', omalimburg:'Oma Limburg', omaveldegem:'Oma Veldegem', sylvie:'Tante Sylvie', tim:'Nonkel Tim', bjorn:'Nonkel Bjorn' };
const naamVan = n => NAMEN[n] || (n ? n[0].toUpperCase() + n.slice(1) : '');

window.ELI = { DB, rpc, sessie, lokaal, vandaag, opDag, mooiDatum, dagenTussen, esc, $, toast, confetti, xpPop, piep, verklein, naamVan, DAGEN, MAANDEN };
})();
