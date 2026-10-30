// De Opwarmer op het leerkrachtenscherm: LANcelot stelt herhaalvragen voor, de leerkracht kijkt ze na en start.
// Gebruikt socket, show en loadGame uit host.js en fx.js.
(() => {
  let voorstel = null;

  function render() {
    const lijst = $('ow-lijst');
    lijst.innerHTML = '';
    $('ow-start').disabled = !voorstel || !voorstel.quiz.questions.length;
    if (!voorstel) return;
    voorstel.quiz.questions.forEach((q, i) => {
      const u = voorstel.uitleg[i];
      const row = document.createElement('div');
      row.className = 'quiz-row ow-vraag';
      row.innerHTML = '<div class="play"><strong class="ow-nr"></strong><span class="ow-tekst"><span class="ow-q"></span><small class="muted"></small></span></div><button class="secondary" title="Deze vraag overslaan">✕</button>';
      row.querySelector('.ow-nr').textContent = `${i + 1}.`;
      row.querySelector('.ow-q').textContent = q.question;
      row.querySelector('small').textContent = [u.bron, u.doel, u.reden].filter(Boolean).join(' · ');
      row.querySelector('button').addEventListener('click', () => {
        voorstel.quiz.questions.splice(i, 1);
        voorstel.uitleg.splice(i, 1);
        render();
      });
      lijst.appendChild(row);
    });
    $('ow-info').textContent = `Gekozen uit ${voorstel.beschikbaar} vragen. Klik op ✕ om een vraag over te slaan.`;
  }

  function maak() {
    $('ow-error').textContent = '';
    socket.emit('opwarmer-maak', { aantal: Number($('ow-aantal').value), vak: $('ow-vak').value }, res => {
      if (res.error) {
        voorstel = null;
        $('ow-error').textContent = res.error;
        $('ow-info').textContent = '';
        render();
        return;
      }
      voorstel = res;
      // De vakken waarvoor er vragen met een leerplandoel zijn.
      const sel = $('ow-vak');
      const keep = sel.value;
      sel.innerHTML = '<option value="">Alle vakken</option>';
      for (const v of res.vakken) sel.add(new Option(v, v));
      sel.value = res.vakken.includes(keep) ? keep : '';
      render();
    });
  }

  document.querySelector('[data-module="opwarmer"]').addEventListener('click', () => {
    show('opwarmer');
    maak();
  });
  $('ow-nieuw').addEventListener('click', maak);
  $('ow-aantal').addEventListener('change', maak);
  $('ow-vak').addEventListener('change', maak);
  $('ow-start').addEventListener('click', () => {
    if (!voorstel) return;
    loadGame('opwarmer-start', voorstel.quiz, res => {
      if (res.error) return ($('ow-error').textContent = res.error);
      show('lobby');
    });
  });
})();
