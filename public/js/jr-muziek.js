// LANcelot Junior · zachte speeldoosmuziek voor op het bord, gemaakt in de browser (geen bestanden, geen internet).
// Elk spel krijgt een eigen deuntje (toonsoort en melodie volgen uit de naam van het spel). Spreekt het draakje,
// dan gaat de muziek even zachter. JrMuziek.speel('tafel'), JrMuziek.stop(), JrMuziek.liedje() (als het draakje groeit),
// JrMuziek.aan = true/false (wordt onthouden op dit toestel).
(function () {
  let ctx = null, meester = null, echo = null;
  let aan = true;
  try { aan = localStorage.getItem('jr-muziek') !== '0'; } catch {}
  let lied = null; // { stappen, tempo, volgende, i, klok }
  const VOL = 0.05;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      meester = ctx.createGain();
      meester.gain.value = VOL;
      // Een korte echo maakt het zachter en ronder, zoals een speeldoos.
      echo = ctx.createDelay(1);
      echo.delayTime.value = 0.33;
      const terug = ctx.createGain();
      terug.gain.value = 0.28;
      echo.connect(terug).connect(echo);
      echo.connect(meester);
      meester.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noot(freq, t, dur, vol, soort = 'sine') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = soort;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(meester);
    g.connect(echo);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

  // Een eenvoudige melodie: vijftoonsladder, akkoorden I - vi - IV - V, op de eerste tel een akkoordtoon.
  function maakLied(naam) {
    let h = 7;
    for (const c of String(naam || 'draak')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const toeval = () => { h = (h * 1103515245 + 12345) >>> 0; return h / 4294967296; };
    const grond = 60 + [0, 2, 5, 7, -3][h % 5];
    const ladder = [0, 2, 4, 7, 9, 12, 14, 16];
    const akkoorden = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]];
    const stappen = [];
    let plek = 2;
    for (let maat = 0; maat < 4; maat++) {
      const ak = akkoorden[maat];
      for (let s = 0; s < 8; s++) {
        let toon = null;
        if (s === 0) toon = ak[Math.floor(toeval() * 3)];
        else if (toeval() > 0.3) {
          plek = Math.max(0, Math.min(ladder.length - 1, plek + Math.round((toeval() - 0.5) * 3)));
          toon = ladder[plek];
        }
        stappen.push({ toon: toon === null ? null : grond + toon, bas: s === 0 || s === 4 ? grond - 12 + ak[s === 0 ? 0 : 2] - (ak[0] > 6 ? 12 : 0) : null });
      }
    }
    return { stappen, tempo: 0.3 + toeval() * 0.06 };
  }

  function plan() {
    if (!lied || !ctx) return;
    // Zachter terwijl het draakje praat.
    const praat = (window.Junior && Junior.Stem && Junior.Stem.praat) || (window.speechSynthesis && speechSynthesis.speaking);
    meester.gain.setTargetAtTime(praat ? VOL * 0.3 : VOL, ctx.currentTime, 0.15);
    while (lied.volgende < ctx.currentTime + 0.6) {
      const st = lied.stappen[lied.i % lied.stappen.length];
      if (st.toon !== null) noot(hz(st.toon), lied.volgende, lied.tempo * 2.6, 0.5, 'triangle');
      if (st.bas !== null) noot(hz(st.bas), lied.volgende, lied.tempo * 3.5, 0.35, 'sine');
      lied.volgende += lied.tempo;
      lied.i++;
    }
  }

  window.JrMuziek = {
    speel(naam) {
      if (!aan) return;
      if (lied && lied.naam === naam) return;
      this.stop();
      if (!audio()) return;
      lied = { naam, ...maakLied(naam), volgende: ctx.currentTime + 0.2, i: 0 };
      lied.klok = setInterval(plan, 120);
      plan();
    },
    stop() {
      if (lied) clearInterval(lied.klok);
      lied = null;
    },
    // Een vrolijk loopje naar boven, als het draakje groeit of de klas iets koopt.
    liedje() {
      if (!aan || !audio()) return;
      const t = ctx.currentTime + 0.05;
      [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => noot(hz(m), t + i * 0.09, 0.6, 0.6, 'triangle'));
      noot(hz(60), t, 1.2, 0.4);
    },
    // Een eigen vrolijk feestdeuntje voor een verjaardag (geen bestaand liedje).
    feest() {
      if (!aan || !audio()) return;
      this.stop();
      const t = ctx.currentTime + 0.1;
      const mel = [67, 67, 69, 67, 72, 71, null, 67, 67, 69, 67, 74, 72, null, 67, 79, 76, 72, 71, 69, null, 77, 77, 76, 72, 74, 72];
      mel.forEach((m, i) => { if (m) noot(hz(m), t + i * 0.26, 0.5, 0.55, 'triangle'); });
      [48, 55, 53, 55, 48, 53, 55, 48].forEach((m, i) => noot(hz(m), t + i * 0.9, 1.2, 0.35));
    },
    // Een zachte klank die aanzwelt (inademen) of wegebt (uitademen), voor het rustmoment.
    adem(inademen, sec = 4) {
      if (!aan || !audio()) return;
      const t = ctx.currentTime + 0.05;
      for (const m of inademen ? [55, 62, 67] : [55, 60, 64]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(hz(m), t);
        if (inademen) o.frequency.linearRampToValueAtTime(hz(m + 2), t + sec);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + (inademen ? sec * 0.9 : 0.4));
        g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
        o.connect(g); g.connect(meester); g.connect(echo);
        o.start(t); o.stop(t + sec + 0.1);
      }
    },
    get aan() { return aan; },
    set aan(v) {
      aan = !!v;
      try { localStorage.setItem('jr-muziek', aan ? '1' : '0'); } catch {}
      if (!aan) this.stop();
    },
  };
})();
