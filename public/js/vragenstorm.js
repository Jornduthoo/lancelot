// Vragenstorm, het leerlingenscherm: de leerkracht drukte op het bord. Het spel staat op dit scherm even stil
// en er komen een paar vragen na elkaar. Elk juist antwoord geeft de beloning van het spel. Daarna speel je verder.
// Wordt geladen door ui.js bij het eerste seintje 'storm'. De timers zijn de echte: de spelklok staat hier stil.
(() => {
  const socket = Ui.stormSocket;
  const T = Ui.echt;
  const box = document.createElement('div');
  box.className = 'storm-scherm hidden';
  box.setAttribute('role', 'dialog');
  box.innerHTML = '<div class="storm-paneel"><p class="storm-kop">⚡ Vragenstorm</p><p class="storm-stap"></p>'
    + '<p class="storm-vraag"></p><div class="storm-antwoorden"></div><p class="storm-uitslag"></p></div>';
  document.body.appendChild(box);
  const $ = sel => box.querySelector(sel);
  const st = { open: false, n: 3, k: 0, juist: 0, cur: null, timer: 0 };

  function wacht(ms, dan) {
    T.ci(st.timer);
    const eind = T.perf() + ms;
    const tik = () => {
      if (!st.open) return T.ci(st.timer);
      const over = eind - T.perf();
      if (over <= 0) { T.ci(st.timer); dan(); return; }
      $('.storm-uitslag small').textContent = `Even wachten… ${Math.ceil(over / 1000)}`;
    };
    if (!$('.storm-uitslag small')) $('.storm-uitslag').append(document.createElement('br'), document.createElement('small'));
    tik();
    st.timer = T.si(tik, 200);
  }

  function laad() {
    st.cur = null;
    $('.storm-stap').textContent = `Vraag ${Math.min(st.k + 1, st.n)} van ${st.n}`;
    $('.storm-vraag').textContent = '…';
    $('.storm-antwoorden').innerHTML = '';
    $('.storm-uitslag').className = 'storm-uitslag';
    $('.storm-uitslag').textContent = '';
    socket.emit('storm-vraag', null, res => {
      if (!st.open) return;
      if (res && res.wait) { $('.storm-vraag').textContent = 'Even nadenken…'; return wacht(res.wait, laad); }
      if (!res || res.error || res.klaar || !res.question) return klaar();
      st.cur = { answers: res.answers, af: false };
      $('.storm-vraag').textContent = res.question;
      const lijst = $('.storm-antwoorden');
      lijst.innerHTML = res.answers.map((_, i) => `<button type="button" class="storm-a a${i}"><b>${i + 1}</b><span></span></button>`).join('');
      [...lijst.children].forEach((b, i) => {
        b.querySelector('span').textContent = res.answers[i];
        b.addEventListener('click', () => kies(i));
      });
      if (res.typ === 'getal') st.cur.veld = Ui.getal(lijst, t => kies({ getal: t }));
    });
  }

  function kies(i) {
    if (!st.cur || st.cur.af) return;
    if (st.cur.veld && typeof i === 'number') return;
    st.cur.af = true;
    socket.emit('storm-antwoord', i, res => {
      if (!st.open) return;
      if (!res || res.error) return klaar();
      st.k++;
      if (res.correct) st.juist++;
      const knoppen = st.cur.veld ? [] : [...$('.storm-antwoorden').children];
      if (st.cur.veld) Ui.getalKlaar(st.cur.veld, res.correct, Number.isInteger(res.right) ? st.cur.answers[res.right] : '');
      knoppen.forEach((b, j) => {
        b.disabled = true;
        b.classList.toggle('juist', j === res.right);
        b.classList.toggle('fout', j === i && !res.correct);
        b.classList.toggle('dim', j !== res.right && j !== i);
      });
      const uit = $('.storm-uitslag');
      uit.className = `storm-uitslag ${res.correct ? 'goed' : 'slecht'}`;
      uit.textContent = res.correct ? 'Juist! ⚡ Bonus voor je spel.' : 'Helaas. Kijk naar het juiste antwoord.';
      if (typeof sfx !== 'undefined' && sfx) (res.correct ? sfx.good : sfx.bad)?.();
      const verder = () => (res.left > 0 ? laad() : klaar());
      if (res.correct) st.timer = T.st(verder, 900);
      else wacht(Math.max(res.wait || 0, 2000), verder);
    });
  }

  function klaar() {
    st.cur = null;
    $('.storm-stap').textContent = '';
    $('.storm-vraag').textContent = st.k ? `Klaar! ${st.juist} van ${st.k} juist.` : 'De storm is voorbij.';
    $('.storm-antwoorden').innerHTML = '';
    $('.storm-uitslag').className = 'storm-uitslag';
    $('.storm-uitslag').textContent = 'Speel verder!';
    T.ct(st.timer);
    st.timer = T.st(sluit, 1600);
  }

  function sluit() {
    T.ci(st.timer);
    T.ct(st.timer);
    if (!st.open) return;
    st.open = false;
    box.classList.add('hidden');
    Ui.pauze.storm(false);
  }

  window.addEventListener('keydown', e => {
    if (!st.open || !st.cur || st.cur.af || st.cur.veld) return;
    if (/^[1-4]$/.test(e.key) && Number(e.key) <= st.cur.answers.length) { e.preventDefault(); kies(Number(e.key) - 1); }
  });

  window.Vragenstorm = s => {
    if (!s || s.uit) return sluit();
    if (st.open) return;
    Object.assign(st, { open: true, n: s.n || 3, k: 0, juist: 0 });
    box.classList.remove('hidden');
    Ui.pauze.storm(true, box);
    laad();
  };
  if (Ui.stormStart) window.Vragenstorm(Ui.stormStart);
})();
