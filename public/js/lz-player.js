// De Leescheck op de Chromebook of gsm: titel van je boek, je bladzijde en een kort antwoord op de vraag van vandaag.
// Klaar in een minuut. Vandaag kun je je antwoord nog aanpassen. klas-kies.js gebruikt store, socket en $ van hier.

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

const socket = io({ autoConnect: false });
document.addEventListener('DOMContentLoaded', () => socket.connect());
const $ = id => document.getElementById(id);

const lz = { naam: store('lancelot-name') || '', stand: null, bezig: false };

const lzDag = dag => new Date(`${dag}T12:00:00`).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });

function lzToon(scherm) {
  for (const s of ['join', 'vorm', 'gedaan', 'uit']) $(`lz-${s}`).classList.toggle('hidden', s !== scherm);
  $('lz-switch').classList.toggle('hidden', scherm !== 'vorm' && scherm !== 'gedaan');
}

function lzLaad(naam = lz.naam) {
  if (!naam) return lzToon('join');
  socket.emit('lz-get', naam, res => {
    if (!res || res.error) {
      const uit = res && /nog niet aan/.test(res.error);
      if (uit) return lzToon('uit');
      $('lz-join-error').textContent = (res && res.error) || '';
      return lzToon('join');
    }
    lz.naam = res.naam;
    lz.stand = res;
    store('lancelot-name', res.naam);
    socket.emit('hier', { naam: res.naam, waar: 'lezen' });
    $('lz-sub').textContent = `${res.naam} · ${lzDag(res.dag)}`;
    if (res.vandaag) lzGedaan(res);
    else lzVorm(res);
  });
}

function lzVorm(s) {
  const v = s.vandaag;
  $('lz-boek').value = v ? v.boek : (s.vorige ? s.vorige.boek : '');
  $('lz-blz').value = v ? v.blz : '';
  $('lz-antwoord').value = v ? v.antwoord : '';
  $('lz-vraag').textContent = s.vraag;
  $('lz-antwoord').rows = s.kort ? 2 : 4;
  $('lz-antwoord').placeholder = s.kort ? 'Een kort antwoord is genoeg.' : 'Schrijf je antwoord in een paar zinnen.';
  $('lz-vorige').classList.toggle('hidden', !s.vorige);
  if (s.vorige) $('lz-vorige').textContent = `Vorige keer was je op bladzijde ${s.vorige.blz} (${lzDag(s.vorige.dag)}).`;
  $('lz-error').textContent = '';
  lzToon('vorm');
  // Meteen typen waar het nodig is: de titel staat er meestal al.
  setTimeout(() => ($('lz-boek').value ? $('lz-blz') : $('lz-boek')).focus(), 50);
}

function lzGedaan(s) {
  const v = s.vandaag;
  $('lz-gedaan-tekst').textContent = `${v.boek}, bladzijde ${v.blz}. Morgen weer een kwartier lezen!`;
  lzToon('gedaan');
}

$('lz-join').addEventListener('submit', e => {
  e.preventDefault();
  const naam = $('lz-name').value.trim();
  if (!naam) return;
  lz.naam = naam;
  lzLaad(naam);
});
$('lz-name').value = lz.naam;
$('lz-switch').addEventListener('click', () => klasSwitch());
$('lz-pas-aan').addEventListener('click', () => lz.stand && lzVorm(lz.stand));

$('lz-vorm').addEventListener('submit', e => {
  e.preventDefault();
  if (lz.bezig) return;
  lz.bezig = true;
  $('lz-klaar').disabled = true;
  socket.emit('lz-bewaar', { naam: lz.naam, boek: $('lz-boek').value, blz: $('lz-blz').value, antwoord: $('lz-antwoord').value }, res => {
    lz.bezig = false;
    $('lz-klaar').disabled = false;
    if (!res || res.error) {
      $('lz-error').textContent = (res && res.error) || 'Dat lukte niet. Probeer opnieuw.';
      if (typeof sfx !== 'undefined') sfx.bad();
      return;
    }
    lz.stand = res;
    if (typeof sfx !== 'undefined') sfx.good();
    lzGedaan(res);
  });
});

socket.on('connect', () => lzLaad());
socket.on('lz-staat', () => lzLaad());

// Start de leerkracht een spel, dan tonen we een knop om mee te doen.
const lzSpellen = {};
socket.onAny((event, s) => {
  if (!s || typeof s !== 'object' || typeof s.phase !== 'string' || !/(^|-)state$/.test(event)) return;
  lzSpellen[event] = !['idle', 'einde', 'end', 'podium'].includes(s.phase);
  $('lz-start-banner').classList.toggle('hidden', !Object.values(lzSpellen).some(Boolean));
});
