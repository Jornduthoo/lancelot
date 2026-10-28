// Audio en tekenen voor De Proef: opnemen of een geluidsbestand kiezen (PfAudio) en een tekenvak met pen en gom (PfTeken).
// Alles blijft klein: een opname is Opus aan 24 kbit/s (ongeveer 200 kB per minuut), een tekening een webp met doorzichtige achtergrond.
const PfAudio = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const kan = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  // Waarom opnemen hier niet lukt: een browser geeft de microfoon alleen op een beveiligd adres (of op de pc zelf).
  const waarom = () => (window.isSecureContext
    ? 'Deze browser kan geen geluid opnemen.'
    : 'Opnemen lukt hier niet: de browser geeft de microfoon alleen op de pc van LANcelot zelf. Kies een geluidsbestand, of vraag ICT om dit adres toe te laten.');
  const tijd = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const alsData = blob => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Het geluid lezen mislukt.'));
    r.readAsDataURL(blob);
  });

  async function bestand(file, max) {
    if (!/^audio\//.test(file.type)) throw new Error('Kies een geluidsbestand (mp3, m4a, wav, ogg of webm).');
    if (file.size * 1.37 > max) throw new Error(`Dit geluidsbestand is te groot (hooguit ${Math.floor(max / 1.37 / 100000) / 10} MB). Neem liever zelf op: dat is veel kleiner.`);
    return alsData(file);
  }

  // Opnemen tot stop() of tot de tijd om is. Geeft een data-adres terug.
  async function opnemen(maxSec, onTik) {
    window.pfMicVraag = Date.now();
    const stroom = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).finally(() => { window.pfMicVraag = Date.now(); });
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stroom, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 24000 });
    const delen = [];
    rec.ondataavailable = e => { if (e.data.size) delen.push(e.data); };
    const klaar = new Promise(resolve => {
      rec.onstop = () => {
        stroom.getTracks().forEach(t => t.stop());
        resolve(alsData(new Blob(delen, { type: rec.mimeType || type || 'audio/webm' })));
      };
    });
    const start = Date.now();
    const klok = setInterval(() => {
      const s = (Date.now() - start) / 1000;
      if (onTik) onTik(s);
      if (s >= maxSec && rec.state === 'recording') rec.stop();
    }, 250);
    rec.start();
    return { stop: () => { if (rec.state === 'recording') rec.stop(); clearInterval(klok); return klaar; }, klaar: klaar.then(d => { clearInterval(klok); return d; }) };
  }

  // Een knoppenrij: opnemen, beluisteren, een bestand kiezen en weghalen.
  // opts: { waarde, max (seconden), grootte (tekens), bestand: true, onChange(dataAdres) }
  function knop(box, opts = {}) {
    let waarde = opts.waarde || '';
    let bezig = null;
    const teken = () => {
      box.innerHTML = bezig
        ? `<button type="button" class="pf-rec stop">⏹ Stop <span class="pf-rec-tijd">0:00 / ${tijd(opts.max || 60)}</span></button>`
        : `${kan() ? `<button type="button" class="${waarde ? 'secondary ' : ''}pf-rec">🎙 ${waarde ? 'Opnieuw opnemen' : esc(opts.label || 'Opnemen')}</button>` : ''}
          ${waarde ? `<audio controls preload="metadata" src="${esc(waarde)}"></audio>` : ''}
          ${opts.bestand !== false ? `<label class="file-button secondary small-btn">📎 Geluidsbestand<input type="file" accept="audio/*" hidden></label>` : ''}
          ${waarde && opts.weg !== false ? '<button type="button" class="secondary small-btn pf-rec-weg" title="Weghalen">✕</button>' : ''}
          ${!kan() ? `<span class="muted small pf-rec-uitleg">${esc(waarom())}</span>` : ''}`;
      const rec = box.querySelector('.pf-rec');
      if (rec && !bezig) rec.addEventListener('click', start);
      if (rec && bezig) rec.addEventListener('click', stop);
      const f = box.querySelector('input[type=file]');
      if (f) f.addEventListener('change', async e => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try { zet(await bestand(file, opts.grootte || 2000000)); } catch (err) { melding(err.message); }
      });
      const weg = box.querySelector('.pf-rec-weg');
      if (weg) weg.addEventListener('click', () => zet(''));
    };
    const melding = m => (typeof Ui !== 'undefined' ? Ui.melding(m) : alert(m)); // eslint-disable-line no-alert
    const zet = d => {
      if (d && d.length > (opts.grootte || 2000000)) return melding('De opname is te lang. Probeer het korter.');
      waarde = d;
      teken();
      if (opts.onChange) opts.onChange(d);
    };
    async function start() {
      try {
        bezig = await opnemen(opts.max || 60, s => {
          const t = box.querySelector('.pf-rec-tijd');
          if (t) t.textContent = `${tijd(s)} / ${tijd(opts.max || 60)}`;
        });
      } catch {
        return melding('De microfoon start niet. Geef de browser toestemming om de microfoon te gebruiken.');
      }
      teken();
      bezig.klaar.then(d => { bezig = null; zet(d); });
    }
    function stop() { if (bezig) bezig.stop(); }
    teken();
    return { waarde: () => waarde };
  }

  // Eén speler voor de luisterknoppen: een nieuwe knop stopt de vorige.
  let speler = null;
  function speel(src, btn) {
    if (speler) { speler.pause(); if (speler.knop) speler.knop.classList.remove('speelt'); }
    if (speler && speler.knop === btn && speler.src.endsWith(src)) { speler = null; return; }
    speler = new Audio(src);
    speler.knop = btn;
    if (btn) btn.classList.add('speelt');
    speler.onended = () => { if (btn) btn.classList.remove('speelt'); };
    speler.play().catch(() => {});
  }

  return { kan, waarom, bestand, opnemen, knop, speel };
})();

const PfTeken = (() => {
  const KLEUREN = ['#1d1d1f', '#1e5bd8', '#d62828', '#178a3a'];

  // Een tekenvak in box. opts: { breedte (pixels van de tekening), verhouding (hoogte / breedte), waarde (data-adres),
  // klein (alleen een paar knopjes, voor een vak op een blad), onChange(dataAdres of null) }
  function mount(box, opts = {}) {
    const B = Math.round(opts.breedte || 900);
    const H = Math.round(B * (opts.verhouding || 0.6));
    box.classList.add('pf-tekenvak');
    box.innerHTML = `<canvas width="${B}" height="${H}"></canvas>
      <div class="pf-teken-balk">${opts.klein ? '' : KLEUREN.map((k, i) => `<button type="button" class="pf-kleur${i ? '' : ' on'}" data-kleur="${k}" style="--kleur:${k}" aria-label="Kleur"></button>`).join('')}
        ${opts.klein ? '' : '<button type="button" class="pf-dik" title="Dikke of dunne lijn">●</button>'}
        <button type="button" class="pf-gom" title="Gom">🧽</button>
        <button type="button" class="pf-terug" title="Ongedaan maken">↶</button>
        <button type="button" class="pf-wis" title="Alles wissen">🗑</button></div>`;
    const cv = box.querySelector('canvas');
    const ctx = cv.getContext('2d');
    let kleur = KLEUREN[0];
    let dik = false;
    let gom = false;
    let leeg = true;
    const stapels = [];
    if (opts.waarde) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, B, H); leeg = false; };
      img.src = opts.waarde;
    }
    const bewaar = () => {
      stapels.push(ctx.getImageData(0, 0, B, H));
      if (stapels.length > 12) stapels.shift();
    };
    let timer = null;
    const klaar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!opts.onChange) return;
        if (leeg) return opts.onChange(null);
        const d = cv.toDataURL('image/webp', 0.75);
        opts.onChange(d.startsWith('data:image/webp') || d.startsWith('data:image/png') ? d : cv.toDataURL('image/png'));
      }, 300);
    };
    const punt = e => {
      const r = cv.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * B, ((e.clientY - r.top) / r.height) * H];
    };
    let vorig = null;
    cv.addEventListener('pointerdown', e => {
      if (box.closest('[data-alleen-kijken]')) return;
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      bewaar();
      vorig = punt(e);
      const schaal = B / Math.max(1, cv.getBoundingClientRect().width);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = gom ? 'destination-out' : 'source-over';
      ctx.strokeStyle = kleur;
      ctx.lineWidth = (gom ? 22 : dik ? 7 : 3) * Math.max(1, schaal);
      ctx.beginPath();
      ctx.arc(vorig[0], vorig[1], ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = kleur;
      ctx.fill();
    });
    cv.addEventListener('pointermove', e => {
      if (!vorig) return;
      for (const ev of e.getCoalescedEvents ? e.getCoalescedEvents() : [e]) {
        const p = punt(ev);
        ctx.beginPath();
        ctx.moveTo(vorig[0], vorig[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.stroke();
        vorig = p;
      }
    });
    const los = () => {
      if (!vorig) return;
      vorig = null;
      if (!gom) leeg = false;
      klaar();
    };
    cv.addEventListener('pointerup', los);
    cv.addEventListener('pointercancel', los);
    box.querySelector('.pf-teken-balk').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.kleur) {
        kleur = b.dataset.kleur;
        gom = false;
        for (const x of box.querySelectorAll('.pf-kleur, .pf-gom')) x.classList.toggle('on', x === b);
      } else if (b.classList.contains('pf-dik')) {
        dik = !dik;
        b.classList.toggle('on', dik);
      } else if (b.classList.contains('pf-gom')) {
        gom = !gom;
        b.classList.toggle('on', gom);
        for (const x of box.querySelectorAll('.pf-kleur')) x.classList.toggle('on', !gom && x.dataset.kleur === kleur);
      } else if (b.classList.contains('pf-terug')) {
        const s = stapels.pop();
        if (s) { ctx.putImageData(s, 0, 0); leeg = !ctx.getImageData(0, 0, B, H).data.some((v, i) => i % 4 === 3 && v); klaar(); }
      } else if (b.classList.contains('pf-wis')) {
        bewaar();
        ctx.clearRect(0, 0, B, H);
        leeg = true;
        klaar();
      }
    });
  }

  return { mount };
})();
