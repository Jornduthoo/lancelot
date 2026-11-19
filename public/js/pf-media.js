// Audio en tekenen voor De Proef: opnemen of een geluidsbestand kiezen (PfAudio) en een tekenvak met pen en gom (PfTeken).
// Alles blijft klein: een opname is Opus aan 24 kbit/s (ongeveer 200 kB per minuut), een groot geluidsbestand wordt
// Opus aan 48 kbit/s (ongeveer 360 kB per minuut), een tekening een webp met doorzichtige achtergrond.
const PfAudio = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const kan = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  // Waarom opnemen hier niet lukt: een browser geeft de microfoon alleen op een beveiligd adres (of op de pc zelf).
  const waarom = () => (window.isSecureContext
    ? 'Deze browser kan geen geluid opnemen.'
    : 'Opnemen lukt hier niet: de browser geeft de microfoon alleen op de pc van LANcelot zelf. Kies een geluidsbestand, of vraag ICT om dit adres toe te laten.');
  const mb = b => `${(Math.round(b / 100000) / 10).toLocaleString('nl-BE')} MB`;
  const tijd = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const alsData = blob => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Het geluid lezen mislukt.'));
    r.readAsDataURL(blob);
  });

  // Een geluidsbestand kiezen. Is het groot (bv. een mp3 van een luisterfragment), dan maken we het hier in de browser
  // kleiner: één kanaal, Opus aan 48 kbit/s (of 24 als het fragment lang is). opts: { onTik(gedaan, totaal) }
  // Geeft { data, kleiner: [oud, nieuw] } terug (kleiner alleen als het geluid kleiner gemaakt is).
  const KLEIN_GENOEG = 400000;
  async function bestand(file, max, opts = {}) {
    if (!/^audio\//.test(file.type)) throw new Error('Kies een geluidsbestand (mp3, m4a, wav, ogg of webm).');
    if (file.size <= KLEIN_GENOEG && file.size * 1.37 <= max) return { data: await alsData(file) };
    let klein = null;
    try { klein = await verklein(file, max, opts.onTik); } catch (err) { if (err.teLang) throw err; }
    if (klein && klein.size < file.size && klein.size * 1.37 <= max) return { data: await alsData(klein), kleiner: [file.size, klein.size] };
    if (file.size * 1.37 > max) throw new Error(`Dit geluidsbestand is te groot (hooguit ${Math.floor(max / 1.37 / 100000) / 10} MB). Neem liever zelf op: dat is veel kleiner.`);
    return { data: await alsData(file) };
  }

  // Het geluid lezen en omzetten naar één kanaal aan 48 kHz (dat lukt in elke browser).
  async function lees(file) {
    const ruw = await file.arrayBuffer();
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const buf = await new Ctx(1, 1, 48000).decodeAudioData(ruw);
    const mono = new Ctx(1, Math.max(1, Math.ceil(buf.duration * 48000)), 48000);
    const bron = mono.createBufferSource();
    bron.buffer = buf;
    bron.connect(mono.destination);
    bron.start();
    return mono.startRendering();
  }

  async function verklein(file, max, onTik) {
    const buf = await lees(file);
    // Hoeveel bits per seconde passen er? Liefst 48 kbit/s, voor een lang fragment 24.
    const past = bps => buf.duration * (bps / 8) * 1.37 * 1.06 <= max;
    const bps = past(48000) ? 48000 : past(24000) ? 24000 : 0;
    if (!bps) {
      const err = new Error(`Dit luisterfragment is te lang. Het mag hooguit ${Math.floor(max / (1.37 * 1.06 * 3000) / 60)} minuten duren.`);
      err.teLang = true;
      throw err;
    }
    if (window.AudioEncoder && await AudioEncoder.isConfigSupported({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: bps }).then(r => r.supported, () => false)) return snel(buf, bps);
    return opTempo(buf, bps, onTik);
  }

  // Snel (op de pc van LANcelot zelf): de browser codeert alles in een paar tellen, wij pakken het in een webm.
  async function snel(buf, bps) {
    const blokken = [];
    let head = null;
    let fout = null;
    const enc = new AudioEncoder({
      output: (chunk, meta) => {
        const d = new Uint8Array(chunk.byteLength);
        chunk.copyTo(d);
        blokken.push({ t: chunk.timestamp / 1000, d });
        if (meta && meta.decoderConfig && meta.decoderConfig.description && !head) head = new Uint8Array(meta.decoderConfig.description.buffer || meta.decoderConfig.description);
      },
      error: e => { fout = e; },
    });
    enc.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: bps });
    const pcm = buf.getChannelData(0);
    const STAP = 48000;
    for (let i = 0; i < pcm.length; i += STAP) {
      const stuk = pcm.subarray(i, Math.min(pcm.length, i + STAP));
      const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: stuk.length, numberOfChannels: 1, timestamp: Math.round((i / 48000) * 1e6), data: stuk });
      enc.encode(ad);
      ad.close();
    }
    await enc.flush();
    enc.close();
    if (fout || !blokken.length) throw fout || new Error('Het geluid kleiner maken mislukt.');
    return webm(blokken, head, buf.duration * 1000);
  }

  // Een webm-bestand (Matroska) met één Opus-spoor.
  function webm(blokken, head, duurMs) {
    const vint = n => { for (let l = 1; l <= 8; l++) if (n < 2 ** (7 * l) - 1) { const b = new Uint8Array(l); let x = n; for (let i = l - 1; i >= 0; i--) { b[i] = x & 255; x = Math.floor(x / 256); } b[0] |= 1 << (8 - l); return b; } throw new RangeError(String(n)); };
    const id = n => { const b = []; while (n > 0) { b.unshift(n & 255); n = Math.floor(n / 256); } return Uint8Array.from(b); };
    const plak = delen => { const uit = new Uint8Array(delen.reduce((s, d) => s + d.length, 0)); let o = 0; for (const d of delen) { uit.set(d, o); o += d.length; } return uit; };
    const el = (n, ...inhoud) => { const d = plak(inhoud); return plak([id(n), vint(d.length), d]); };
    const uint = (n, w) => { const b = []; do { b.unshift(w & 255); w = Math.floor(w / 256); } while (w > 0); return el(n, Uint8Array.from(b)); };
    const str = (n, s) => el(n, new TextEncoder().encode(s));
    const flt = (n, f) => { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, f); return el(n, b); };
    if (!head || head.length < 19) {
      head = new Uint8Array(19);
      head.set(new TextEncoder().encode('OpusHead'));
      const v = new DataView(head.buffer);
      v.setUint8(8, 1); v.setUint8(9, 1); v.setUint16(10, 312, true); v.setUint32(12, 48000, true);
    }
    const preskip = new DataView(head.buffer, head.byteOffset).getUint16(10, true);
    const clusters = [];
    for (let i = 0; i < blokken.length;) {
      const start = Math.round(blokken[i].t);
      const deel = [uint(0xE7, start)];
      while (i < blokken.length && blokken[i].t - start < 5000) {
        const rel = Math.round(blokken[i].t) - start;
        deel.push(el(0xA3, Uint8Array.from([0x81, (rel >> 8) & 255, rel & 255, 0x80]), blokken[i].d));
        i++;
      }
      clusters.push(el(0x1F43B675, ...deel));
    }
    const kop = el(0x1A45DFA3, uint(0x4286, 1), uint(0x42F7, 1), uint(0x42F2, 4), uint(0x42F3, 8), str(0x4282, 'webm'), uint(0x4287, 4), uint(0x4285, 2));
    const info = el(0x1549A966, uint(0x2AD7B1, 1000000), str(0x4D80, 'LANcelot'), str(0x5741, 'LANcelot'), flt(0x4489, duurMs));
    const spoor = el(0x1654AE6B, el(0xAE, uint(0xD7, 1), uint(0x73C5, 1), uint(0x83, 2), str(0x86, 'A_OPUS'), el(0x63A2, head),
      uint(0x56AA, Math.round((preskip / 48000) * 1e9)), uint(0x56BB, 80000000), el(0xE1, flt(0xB5, 48000), uint(0x9F, 1))));
    return new Blob([kop, el(0x18538067, info, spoor, ...clusters)], { type: 'audio/webm;codecs=opus' });
  }

  // Anders (bv. op een ander toestel in de klas): het geluid één keer afspelen en stil opnemen. Dat duurt even lang als het fragment.
  async function opTempo(buf, bps, onTik) {
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!type) throw new Error('Deze browser kan het geluid niet kleiner maken.');
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    await ctx.resume();
    const bron = ctx.createBufferSource();
    bron.buffer = buf;
    const doel = ctx.createMediaStreamDestination();
    doel.channelCount = 1;
    bron.connect(doel);
    const rec = new MediaRecorder(doel.stream, { mimeType: type, audioBitsPerSecond: bps });
    const delen = [];
    rec.ondataavailable = e => { if (e.data.size) delen.push(e.data); };
    const klaar = new Promise(resolve => { rec.onstop = () => resolve(new Blob(delen, { type })); });
    const start = ctx.currentTime;
    const klok = setInterval(() => { if (onTik) onTik(Math.min(buf.duration, ctx.currentTime - start), buf.duration); }, 250);
    bron.onended = () => setTimeout(() => rec.state === 'recording' && rec.stop(), 150);
    rec.start(1000);
    bron.start();
    const blob = await klaar;
    clearInterval(klok);
    ctx.close();
    return blob;
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
        const tel = box.querySelector('.pf-rec-uitleg') || box.appendChild(Object.assign(document.createElement('span'), { className: 'muted small pf-rec-uitleg' }));
        tel.textContent = '⏳ Even geduld…';
        try {
          const r = await bestand(file, opts.grootte || 2000000, { onTik: (s, tot) => { tel.textContent = `⏳ Het geluid wordt kleiner gemaakt: ${tijd(s)} van ${tijd(tot)}`; } });
          zet(r.data);
          if (r.kleiner) melding(`Het geluid is kleiner gemaakt: van ${mb(r.kleiner[0])} naar ${mb(r.kleiner[1])}.`);
        } catch (err) { tel.textContent = ''; melding(err.message); }
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

  return { kan, waarom, bestand, verklein, opnemen, knop, speel };
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
