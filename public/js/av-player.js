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
    const src = Avatar.sprite(avState.mine, { k: 8 });
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
    <div class="av-stage">
      <div class="av-platform"></div>
      <canvas id="av-preview"></canvas>
      <button type="button" class="secondary av-turn" id="av-turn" title="Draai je ridder om">↻ Draai</button>
      <p class="av-name" id="av-name"></p>
    </div>
    <div class="av-side">
      <div class="av-tabs" id="av-tabs"></div>
      <div class="av-options" id="av-options"></div>
    </div>
    <div class="av-buttons">
      <button type="button" class="secondary" id="av-random">🎲 Verras me</button>
      <button type="button" class="gold" id="av-done">✔ Klaar</button>
    </div>
  </div>`;
document.body.appendChild(maker);

// Per tabblad: tegels met een voorbeeld (list) en/of kleurbolletjes (colors).
const AV_TABS = [
  { id: 'ridder', label: '🧑 Ridder', rows: [
    { key: 'type', list: Avatar.TYPES },
    { key: 'huid', label: 'Huidskleur', colors: Avatar.SKINS },
    { key: 'haar', label: 'Haar', list: Avatar.HAIRS, head: true, hair: true },
    { key: 'haarkleur', label: 'Haarkleur', colors: Avatar.HAIR_COLORS },
  ] },
  { id: 'helm', label: '⛑️ Helm', rows: [
    { key: 'helm', list: Avatar.HELMS, head: true },
    { key: 'vizier', label: 'Kleur van het licht', colors: Avatar.VISORS },
  ] },
  { id: 'accent', label: '✨ Versiering', rows: [{ key: 'accent', list: Avatar.ACCENTS, head: true }] },
  { id: 'harnas', label: '🎨 Harnas', rows: [
    { key: 'harnas', list: Avatar.ARMORS },
    { key: 'kleur', label: 'Kleur', colors: Avatar.COLORS },
    { key: 'arm', label: 'Arm', list: Avatar.ARMS, arm: true },
  ] },
  { id: 'rug', label: '🚀 Rug', rows: [{ key: 'rug', list: Avatar.BACKS, back: true }] },
  { id: 'wapen', label: '⚔️ Wapen', rows: [{ key: 'wapen', list: Avatar.WEAPONS, weapon: true }] },
  { id: 'schild', label: '🛡️ Schild', rows: [
    { key: 'patroon', list: Avatar.PATTERNS, shield: true },
    { key: 'schild', label: 'Kleur van je schild', colors: Avatar.SHIELDS },
  ] },
];
avState.tab = 'ridder';
avState.back = false;

$('av-tabs').innerHTML = AV_TABS.map(t => `<button type="button" class="av-tab" data-tab="${t.id}">${t.label}</button>`).join('');
for (const b of $('av-tabs').querySelectorAll('.av-tab')) {
  b.addEventListener('click', () => { avState.tab = b.dataset.tab; avOptions(); });
}

// Een tegel: de ridder met die keuze, of enkel zijn hoofd of schild.
function avTile(row, i) {
  const av = { ...avState.draft, [row.key]: i };
  // Haar zie je niet onder een gesloten helm: toon het dan onder het holovizier.
  if (row.hair && !Avatar.OPEN.includes(av.helm)) av.helm = 8;
  const src = Avatar.sprite(av, { k: 6, back: !!row.back });
  const c = document.createElement('canvas');
  const crop = row.head ? [0, 0, 12, 8] : row.shield ? [7, 8.6, 5, 6.4] : row.weapon ? [0, 3.5, 7, 10] : row.arm ? [0, 7, 6, 7] : [0, 0, 12, 17];
  c.width = crop[2] * 6;
  c.height = crop[3] * 6;
  c.getContext('2d').drawImage(src, crop[0] * 6, crop[1] * 6, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}

function avOptions() {
  const d = avState.draft;
  const tab = AV_TABS.find(t => t.id === avState.tab);
  for (const b of $('av-tabs').querySelectorAll('.av-tab')) b.classList.toggle('on', b.dataset.tab === tab.id);
  const box = $('av-options');
  box.innerHTML = '';
  for (const r of tab.rows) {
    const row = document.createElement('div');
    row.className = 'av-row';
    if (r.label) row.innerHTML = `<span class="av-label">${r.label}</span>`;
    const wrap = document.createElement('div');
    wrap.className = r.colors ? 'av-swatches' : 'av-tiles';
    (r.colors || r.list).forEach((item, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.key = r.key;
      b.dataset.i = i;
      if (r.colors) {
        b.className = 'av-swatch' + (d[r.key] === i ? ' on' : '');
        b.style.background = item;
        b.setAttribute('aria-label', `${r.label} ${i + 1}`);
      } else {
        b.className = 'av-tile' + (d[r.key] === i ? ' on' : '') + (r.head ? ' head' : r.shield ? ' shield' : r.weapon || r.arm ? ' weapon' : '');
        b.appendChild(avTile(r, i));
        const name = document.createElement('span');
        name.textContent = item.name;
        b.appendChild(name);
      }
      b.addEventListener('click', () => {
        avState.draft[r.key] = i;
        avRefresh(true);
        sfx.tick();
      });
      wrap.appendChild(b);
    });
    row.appendChild(wrap);
    box.appendChild(row);
  }
}

function avDraw(canvas, src) {
  canvas.width = src.width;
  canvas.height = src.height;
  canvas.getContext('2d').drawImage(src, 0, 0);
}

function avRefresh(bump = false) {
  avOptions();
  avDraw($('av-preview'), Avatar.sprite(avState.draft, { k: 20, back: avState.back }));
  if (bump) {
    const c = $('av-preview');
    c.classList.remove('bump');
    void c.offsetWidth;
    c.classList.add('bump');
  }
}

function avOpen() {
  avState.draft = { ...avState.mine };
  avState.back = false;
  $('av-name').textContent = avName() || '';
  maker.classList.remove('hidden');
  avRefresh();
}

$('av-turn').addEventListener('click', () => {
  const c = $('av-preview');
  c.classList.remove('bump');
  c.classList.add('turning');
  setTimeout(() => {
    avState.back = !avState.back;
    avRefresh();
    c.classList.remove('turning');
  }, 160);
});
$('av-random').addEventListener('click', () => {
  avState.draft = Avatar.random();
  avRefresh(true);
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
