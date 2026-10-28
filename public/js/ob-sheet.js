// Een oefenblad tekenen. Gedeeld door de leerling (invullen), het bord (bekijken) en het printblad.
// view: het blad zonder oplossingen (zoals de server het naar leerlingen stuurt).
// opts: { mode: 'live' | 'view' | 'print', answers, results, solutions, key, onAnswer(id, value), voorlees }
// voorlees: 🔊-knopjes die de opdracht en de vragen voorlezen (Voorlees uit voorlees.js).
// Een blok 'vraag' is een vraag zoals in De Proef: die tekent PfPaper (pf-paper.js), dat pas laadt als een blad zo'n vraag heeft.
const ObSheet = (() => {
  const NAMES = {
    tekst: 'Lees', invullen: 'Invullen', meerkeuze: 'Meerkeuze', juistfout: 'Juist of fout', verbinden: 'Verbinden',
    woorden: 'Woordjes', overschrijven: 'Overschrijven', open: 'Open vragen', vraag: 'Vraag',
  };
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const paras = text => String(text).split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

  function render(box, view, opts = {}) {
    const mode = opts.mode || 'live';
    const answers = opts.answers || {};
    const sol = opts.solutions || {};
    const key = mode === 'print' && opts.key;
    const live = mode === 'live';
    let n = 0;
    // Wat elk 🔊-knopje voorleest. Een open vakje leest als een pauze.
    const said = [];
    const talk = mode !== 'print' && opts.voorlees && typeof Voorlees !== 'undefined' && Voorlees.ok;
    const say = text => talk ? `<button type="button" class="ob-say" data-say="${said.push(text) - 1}" title="Lees voor" aria-label="Lees voor">🔊</button>` : '';
    const gaps = parts => parts.map(part => typeof part === 'string' ? part : ' … ').join('');
    const block = b => {
      if (b.type === 'invullen') return gaps(b.parts);
      if (b.type === 'meerkeuze') return b.items.map(q => q.question).join('\n');
      if (b.type === 'juistfout') return b.items.map(q => q.statement).join('\n');
      if (b.type === 'verbinden') return [...b.left, 'Kies uit:', ...b.right.map((r, j) => `${LETTERS[j]}: ${r}`)].join('\n');
      if (b.type === 'woorden') return b.items.map(q => q.prompt).join('\n');
      if (b.type === 'overschrijven') return b.lines.join('\n');
      if (b.type === 'open') return b.items.map(q => q.question).join('\n');
      return '';
    };
    const choices = q => `${q.question}\n${q.options.map((o, j) => `${LETTERS[j]}: ${o}`).join('\n')}`;
    let html = `<header class="ob-head"><h1>${esc(view.title)}</h1>${mode === 'print' ? '<div class="ob-meta"><span>Naam: <i></i></span><span>Klas: <i class="short"></i></span><span>Datum: <i class="short"></i></span></div>' : ''}</header>`;
    view.blocks.forEach((b, bi) => {
      if (b.type === 'tekst') {
        html += `<section class="ob-block ob-tekst">${b.title || talk ? `<h2>${say([b.title, b.text].filter(Boolean).join('\n'))}${esc(b.title || '')}</h2>` : ''}${paras(b.text)}</section>`;
        return;
      }
      n++;
      if (b.type === 'vraag') {
        html += `<section class="ob-block ob-vraag"><div class="pf-paper ob-pf" data-field="${esc(b.view.id)}" data-bi="${bi}" data-nr="${n}"></div></section>`;
        return;
      }
      html += `<section class="ob-block ob-${b.type}"><h2><span class="ob-num">${n}</span>${say(`${b.instruction}\n${block(b)}`)} ${esc(b.instruction)} <small>${NAMES[b.type]}</small></h2>`;
      if (b.type === 'invullen') {
        html += '<p class="ob-gaps">' + b.parts.map(part => {
          if (typeof part === 'string') return esc(part).replace(/\n/g, '<br>');
          if (mode === 'print') return `<span class="ob-line" style="min-width:${part.size * .62}em">${key ? esc(sol[part.gap] ?? '') : ''}</span>`;
          return `<input class="ob-field ob-gap" data-field="${part.gap}" size="${part.size}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(answers[part.gap] ?? '')}"${live ? '' : ' readonly'}>`;
        }).join('') + '</p>';
      } else if (b.type === 'meerkeuze') {
        html += '<ol class="ob-items">' + b.items.map((q, i) => {
          const id = `${bi}.${i}`;
          return `<li><p>${say(choices(q))}${esc(q.question)}</p><div class="ob-choices" data-field="${id}">${q.options.map((o, j) =>
            mode === 'print'
              ? `<span class="ob-check${key && sol[id] === j ? ' on' : ''}">${LETTERS[j]}</span> ${esc(o)}`
              : `<button type="button" class="ob-choice${String(answers[id]) === String(j) ? ' on' : ''}" data-value="${j}"${live ? '' : ' disabled'}><b>${LETTERS[j]}</b> ${esc(o)}</button>`).join(mode === 'print' ? '<br>' : '')}</div></li>`;
        }).join('') + '</ol>';
      } else if (b.type === 'juistfout') {
        html += '<ol class="ob-items">' + b.items.map((q, i) => {
          const id = `${bi}.${i}`;
          return `<li class="ob-jf"><p>${say(q.statement)}${esc(q.statement)}</p><div class="ob-choices" data-field="${id}">${['J', 'F'].map(v =>
            mode === 'print'
              ? `<span class="ob-check${key && sol[id] === v ? ' on' : ''}">${v}</span>`
              : `<button type="button" class="ob-choice${answers[id] === v ? ' on' : ''}" data-value="${v}"${live ? '' : ' disabled'}>${v === 'J' ? 'Juist' : 'Fout'}</button>`).join(' ')}</div></li>`;
        }).join('') + '</ol>';
      } else if (b.type === 'verbinden') {
        if (mode === 'print') {
          html += `<div class="ob-match-print"><ol>${b.left.map((l, i) => `<li><span class="ob-box">${key ? LETTERS[sol[`${bi}.${i}`]] : ''}</span> ${esc(l)}</li>`).join('')}</ol>
            <ul>${b.right.map((r, j) => `<li><b>${LETTERS[j]}</b> ${esc(r)}</li>`).join('')}</ul></div>`;
        } else {
          html += '<div class="ob-match">' + b.left.map((l, i) => {
            const id = `${bi}.${i}`;
            const options = ['<option value="">kies…</option>', ...b.right.map((r, j) => `<option value="${j}"${String(answers[id]) === String(j) ? ' selected' : ''}>${LETTERS[j]}. ${esc(r)}</option>`)].join('');
            return `<label><span>${esc(l)}</span><select class="ob-field" data-field="${id}"${live ? '' : ' disabled'}>${options}</select></label>`;
          }).join('') + '</div>';
        }
      } else if (b.type === 'woorden') {
        html += '<ol class="ob-items ob-words">' + b.items.map((q, i) => {
          const id = `${bi}.${i}`;
          return `<li><span>${say(q.prompt)}${esc(q.prompt)}</span>${mode === 'print'
            ? `<span class="ob-line wide">${key ? esc(sol[id] ?? '') : ''}</span>`
            : `<input class="ob-field" data-field="${id}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(answers[id] ?? '')}"${live ? '' : ' readonly'}>`}</li>`;
        }).join('') + '</ol>';
      } else if (b.type === 'overschrijven') {
        html += '<ol class="ob-items ob-copy">' + b.lines.map((l, i) => {
          const id = `${bi}.${i}`;
          return `<li><p class="ob-model">${say(l)}${esc(l)}</p>${mode === 'print'
            ? '<div class="ob-writing"></div>'
            : `<input class="ob-field" data-field="${id}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(answers[id] ?? '')}"${live ? '' : ' readonly'}>`}</li>`;
        }).join('') + '</ol>';
      } else if (b.type === 'open') {
        html += '<ol class="ob-items">' + b.items.map((q, i) => {
          const id = `${bi}.${i}`;
          return `<li><p>${say(q.question)}${esc(q.question)}</p>${mode === 'print'
            ? '<div class="ob-lines">' + '<i></i>'.repeat(q.lines) + '</div>'
            : `<textarea class="ob-field" data-field="${id}" rows="${Math.min(6, q.lines)}"${live ? '' : ' readonly'}>${esc(answers[id] ?? '')}</textarea>`}</li>`;
        }).join('') + '</ol>';
      }
      html += '</section>';
    });
    if (typeof Voorlees !== 'undefined') Voorlees.stop();
    box.innerHTML = html;
    box.obSaid = said;
    if (talk && !box.obSayWired) {
      box.obSayWired = true;
      box.addEventListener('click', e => {
        const b = e.target.closest('.ob-say');
        if (b) Voorlees.speak(box.obSaid[b.dataset.say], b);
      });
    }
    if (mode !== 'print') mark(box, opts.results || {}, opts.solutions, view);
    if (live) wire(box, opts.onAnswer);
    return vraagjes(box, view, opts);
  }

  // De vragen uit De Proef in hun vak tekenen, zodra pf-paper.js geladen is.
  let laden = null;
  const laad = () => laden || (laden = new Promise((resolve, reject) => {
    if (!document.querySelector('link[href="/proef.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="/proef.css">');
    const nodig = [typeof PfAudio === 'undefined' && '/js/pf-media.js', typeof PfPaper === 'undefined' && '/js/pf-paper.js'].filter(Boolean);
    const volgende = () => {
      const src = nodig.shift();
      if (!src) return resolve();
      const el = document.createElement('script');
      el.src = src;
      el.onload = volgende;
      el.onerror = () => { laden = null; reject(new Error(`${src} laadt niet`)); };
      document.head.appendChild(el);
    };
    volgende();
  }));
  function vraagjes(box, view, opts) {
    const vakken = [...box.querySelectorAll('.ob-pf')];
    if (!vakken.length) return Promise.resolve();
    const mode = opts.mode || 'live';
    return laad().then(() => {
      for (const el of vakken) {
        if (!el.isConnected) continue;
        const id = el.dataset.field;
        const r = (opts.results || {})[id];
        const sol = opts.solutions && opts.solutions[id];
        const toon = sol !== undefined && sol !== '' && (mode === 'print' ? opts.key : r !== true);
        PfPaper.render(el, [view.blocks[Number(el.dataset.bi)].view], {
          mode, answers: { [id]: (opts.answers || {})[id] }, sleutel: toon ? { [id]: sol } : null, nummer: true, start: Number(el.dataset.nr) - 1,
          voorlees: opts.voorlees, onAnswer: (i, v) => opts.onAnswer && opts.onAnswer(i, v),
        });
      }
    });
  }

  // Groen of rood per veld, en de oplossing naast wat fout is.
  function mark(box, results, solutions, view) {
    for (const el of box.querySelectorAll('[data-field]')) {
      const id = el.dataset.field;
      const r = results[id];
      el.classList.toggle('ok', r === true);
      el.classList.toggle('bad', r === false);
      // Een vraag uit De Proef toont zijn oplossing zelf.
      if (el.classList.contains('ob-pf')) continue;
      const next = el.nextElementSibling;
      if (next && next.classList.contains('ob-sol')) next.remove();
      if (solutions && r !== true && solutions[id] !== undefined) {
        const [bi] = id.split('.').map(Number);
        const type = view.blocks[bi].type;
        let text = solutions[id];
        if (type === 'verbinden') text = `${LETTERS[text]}. ${view.blocks[bi].right[text]}`;
        else if (type === 'meerkeuze') text = `${LETTERS[text]}. ${view.blocks[bi].items[Number(id.split('.')[1])].options[text]}`;
        else if (type === 'juistfout') text = text === 'J' ? 'Juist' : 'Fout';
        el.insertAdjacentHTML('afterend', `<span class="ob-sol">✔ ${esc(text)}</span>`);
      }
    }
  }

  function wire(box, onAnswer) {
    const timers = new Map();
    const send = (id, value) => onAnswer && onAnswer(id, value);
    const eigen = sel => [...box.querySelectorAll(sel)].filter(el => !el.closest('.ob-pf'));
    for (const el of eigen('input.ob-field, textarea.ob-field')) {
      el.addEventListener('input', () => {
        el.classList.remove('ok', 'bad');
        clearTimeout(timers.get(el));
        timers.set(el, setTimeout(() => send(el.dataset.field, el.value), 900));
      });
      el.addEventListener('change', () => {
        clearTimeout(timers.get(el));
        send(el.dataset.field, el.value);
      });
      // Enter springt naar het volgende vakje.
      if (el.tagName === 'INPUT') {
        el.addEventListener('keydown', e => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const all = eigen('input.ob-field, select.ob-field, textarea.ob-field');
          const next = all[all.indexOf(el) + 1];
          if (next) next.focus(); else el.blur();
        });
      }
    }
    for (const el of eigen('select.ob-field')) el.addEventListener('change', () => send(el.dataset.field, el.value));
    for (const group of eigen('.ob-choices')) {
      for (const b of group.querySelectorAll('.ob-choice')) {
        b.addEventListener('click', () => {
          for (const o of group.querySelectorAll('.ob-choice')) o.classList.toggle('on', o === b);
          group.classList.remove('ok', 'bad');
          send(group.dataset.field, b.dataset.value);
        });
      }
    }
  }

  return { render, mark, NAMES };
})();
