// Je eigen ridder samenstellen op de gsm of Chromebook. Hij komt bij elk aanmeldscherm en elke lobby,
// en wordt op je naam bewaard op de pc van de leerkracht.
// Gebruikt socket, $ en store uit player.js, Avatar uit avatar.js.
const avState = {
  mine: Avatar.clean(JSON.parse(store('lancelot-avatar') || 'null')),
  draft: null,
};
if (!avState.mine) {
  avState.mine = Avatar.random();
  store('lancelot-avatar', JSON.stringify(avState.mine));
}

// De naam waaronder we de ridder bewaren: wat in het zichtbare aanmeldveld staat, anders de laatst gebruikte naam.
Avatar.setMine(avState.mine);

function avName() {
  const input = [...document.querySelectorAll('form.welcome input')].find(i => i.offsetParent && i.value.trim());
  return input ? input.value.trim() : store('lancelot-name');
}

function avSend(name = avName()) {
  if (name) socket.emit('avatar-set', { name, avatar: avState.mine });
}

// ---------- Het blokje "Mijn ridder" op aanmeldschermen en in lobby's ----------

function avBlock() {
  const box = document.createElement('div');
  box.className = 'av-mine';
  box.innerHTML = '<canvas></canvas><button type="button" class="secondary">🛡️ Pas je ridder aan</button>';
  box.querySelector('button').addEventListener('click', e => {
    e.preventDefault();
    avOpen();
  });
  return box;
}

for (const form of document.querySelectorAll('form.welcome')) {
  if (!form.querySelector('input')) continue;
  // Na de knop om binnen te gaan, zodat die de eerste knop van het formulier blijft.
  form.querySelector('button[type="submit"]').after(avBlock());
  // Na het aanmelden: ridder doorgeven, en de eerste keer meteen laten kiezen.
  form.addEventListener('submit', () => {
    const name = form.querySelector('input').value.trim();
    if (!name) return;
    avSend(name);
    if (!store('lancelot-avatar-made')) setTimeout(avOpen, 400);
  }, true);
}
for (const section of document.querySelectorAll('#idle, #lobby, section.screen[id$="-lobby"]')) {
  const title = section.querySelector('.title') || section.firstElementChild;
  title.after(avBlock());
}

function avPaint() {
  for (const c of document.querySelectorAll('.av-mine canvas')) {
    const src = Avatar.sprite(avState.mine, { k: 4 });
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(src, 0, 0);
  }
}
avPaint();

// ---------- De ridder samenstellen ----------

const maker = document.createElement('div');
maker.id = 'av-maker';
maker.className = 'av-maker hidden';
maker.innerHTML = `
  <div class="av-maker-box panel">
    <p class="title">Jouw ridder</p>
    <div class="av-stage"><canvas id="av-preview"></canvas><canvas id="av-back"></canvas></div>
    <div class="av-options" id="av-options"></div>
    <div class="av-buttons">
      <button type="button" class="secondary" id="av-random">🎲 Verras me</button>
      <button type="button" class="gold" id="av-done">✔ Klaar</button>
    </div>
  </div>`;
document.body.appendChild(maker);

const AV_ROWS = [
  { key: 'helm', label: 'Helm', list: Avatar.HELMS },
  { key: 'accent', label: 'Versiering', list: Avatar.ACCENTS },
  { key: 'kleur', label: 'Harnas en cape', colors: Avatar.COLORS },
  { key: 'vizier', label: 'Vizier', colors: Avatar.VISORS },
  { key: 'patroon', label: 'Schild', list: Avatar.PATTERNS },
  { key: 'schild', label: 'Kleur van je schild', colors: Avatar.SHIELDS },
];

function avOptions() {
  const d = avState.draft;
  $('av-options').innerHTML = AV_ROWS.map(r => {
    if (r.colors) {
      return `<div class="av-row"><span class="av-label">${r.label}</span><div class="av-swatches">${r.colors.map((c, i) =>
        `<button type="button" class="av-swatch${d[r.key] === i ? ' on' : ''}" data-key="${r.key}" data-i="${i}" style="background:${c}" aria-label="${r.label} ${i + 1}"></button>`).join('')}</div></div>`;
    }
    return `<div class="av-row"><span class="av-label">${r.label}</span><div class="av-cycle">
      <button type="button" class="secondary av-step" data-key="${r.key}" data-d="-1" aria-label="Vorige">◀</button>
      <span class="av-value">${r.list[d[r.key]].name}</span>
      <button type="button" class="secondary av-step" data-key="${r.key}" data-d="1" aria-label="Volgende">▶</button></div></div>`;
  }).join('');
  for (const b of $('av-options').querySelectorAll('.av-swatch')) {
    b.addEventListener('click', () => { avState.draft[b.dataset.key] = Number(b.dataset.i); avRefresh(); });
  }
  for (const b of $('av-options').querySelectorAll('.av-step')) {
    b.addEventListener('click', () => {
      const n = Avatar.KEYS[b.dataset.key];
      avState.draft[b.dataset.key] = (avState.draft[b.dataset.key] + Number(b.dataset.d) + n) % n;
      avRefresh();
    });
  }
}

function avDraw(canvas, src) {
  canvas.width = src.width;
  canvas.height = src.height;
  canvas.getContext('2d').drawImage(src, 0, 0);
}

function avRefresh() {
  avOptions();
  avDraw($('av-preview'), Avatar.sprite(avState.draft, { k: 12 }));
  avDraw($('av-back'), Avatar.sprite(avState.draft, { k: 6, back: true }));
}

function avOpen() {
  avState.draft = { ...avState.mine };
  maker.classList.remove('hidden');
  avRefresh();
}

$('av-random').addEventListener('click', () => {
  avState.draft = Avatar.random();
  avRefresh();
  sfx.swoosh();
});
$('av-done').addEventListener('click', () => {
  avState.mine = Avatar.clean(avState.draft);
  store('lancelot-avatar', JSON.stringify(avState.mine));
  store('lancelot-avatar-made', '1');
  Avatar.setMine(avState.mine);
  maker.classList.add('hidden');
  avPaint();
  avSend();
  sfx.good();
});

// Opnieuw verbonden (bijvoorbeeld na een herstart van de server): ridder opnieuw doorgeven.
socket.on('connect', () => avSend(store('lancelot-name')));
