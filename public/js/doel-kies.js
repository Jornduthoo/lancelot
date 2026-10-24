// Een leerplandoel (Op.stap) kiezen bij een quizvraag of een oefening.
// Typ een code (2.2.GL6.12) of een woord uit het doel (breuk, deler): de browser toont de passende doelen.
// Gebruikt socket uit host.js of ob-host.js.
const DoelKies = (() => {
  let doelen = [];
  let asked = false;
  const fields = new Set();

  function find(code) {
    return doelen.find(d => d.code === code) || null;
  }

  function describe(d) {
    return `${d.domein} · ${d.tekst}${d.soort === 'plus' ? ' (plusdoel)' : ''}`;
  }

  function load() {
    if (asked) return;
    asked = true;
    socket.emit('doelen-get', null, res => {
      if (!res || res.error) return;
      // Alleen de doelen van het leerjaar van de klas; zijn er daarvoor geen, dan alles.
      const mine = res.doelen.filter(d => d.leerjaar === res.leerjaar);
      doelen = mine.length ? mine : res.doelen;
      let list = document.getElementById('doelen-lijst');
      if (!list) {
        list = document.createElement('datalist');
        list.id = 'doelen-lijst';
        document.body.appendChild(list);
      }
      list.innerHTML = '';
      for (const d of doelen) {
        const o = document.createElement('option');
        o.value = d.code;
        o.textContent = describe(d);
        list.appendChild(o);
      }
      for (const el of fields) el.refresh();
    });
  }

  // De code uit wat er in het veld staat (de leerkracht kan ook de hele regel plakken).
  function codeOf(value) {
    return String(value || '').trim().split(/\s+/)[0] || '';
  }

  // Een veld om een doel te kiezen. onChange(code) wordt opgeroepen als het doel verandert.
  function field(value = '', { label = 'Leerplandoel (mag leeg)', onChange } = {}) {
    load();
    const el = document.createElement('label');
    el.className = 'doel-veld';
    el.innerHTML = `<span></span><input class="doel" list="doelen-lijst" maxlength="200" autocomplete="off" placeholder="Typ een code of een woord, bv. breuk"><span class="doel-tekst"></span>`;
    el.firstElementChild.textContent = label;
    const input = el.querySelector('input');
    input.value = value || '';
    el.refresh = () => {
      const code = codeOf(input.value);
      const d = find(code);
      el.querySelector('.doel-tekst').textContent = !code ? '' : d ? describe(d) : 'Kies een doel uit de lijst.';
    };
    input.addEventListener('input', () => {
      el.refresh();
      if (onChange) onChange(DoelKies.read(el));
    });
    fields.add(el);
    el.refresh();
    return el;
  }

  // De gekozen doelcode, of leeg als het veld leeg is of het doel niet bestaat.
  function read(el) {
    const code = codeOf(el.querySelector('input').value);
    return find(code) || (!doelen.length && /^\d/.test(code)) ? code : '';
  }

  return { field, read, find, describe, load };
})();
