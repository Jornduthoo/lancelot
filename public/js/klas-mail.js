// Mijn klas > Klas: toetsen mailen. Per leerling een adres (bv. de GON-begeleider, later ook ouders);
// elke verbeterde toets van die leerling gaat dan vanzelf naar dat adres (zie src/toetsmail.js).
(() => {
  const sock = io({ query: { role: 'host' } });
  const el = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  let mail = null;
  const info = t => { el('km-info').textContent = t || ''; };

  function renderBox(velden) {
    if (!mail) return;
    if (velden) {
      el('km-van').value = mail.van || '';
      el('km-naam').value = mail.naam || '';
      el('km-host').value = mail.host && mail.host !== 'smtp.gmail.com' ? mail.host : '';
      el('km-port').value = mail.port && mail.port !== 465 ? mail.port : '';
    }
    el('km-pass').placeholder = mail.heeftPass ? '•••• bewaard (laat leeg)' : '16 letters';
    el('km-wis').classList.toggle('hidden', !mail.van);
    el('km-test').disabled = !mail.klaar;
    el('km-status').textContent = mail.klaar ? `✔ Mailbox: ${mail.van} (wijzigen)` : 'Eerst: met welke mailbox?';
    if (!mail.klaar) el('km-box').open = true;
  }

  const sleutel = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
  // Per leerling: adres 1, adres 2 en het vinkje "Automatisch mailen". Elke wijziging bewaart meteen.
  function renderLijst() {
    sock.emit('klas-namen', null, namen => {
      const lijst = [...new Set((namen || []).map(n => (typeof n === 'string' ? n : n && n.naam) || '').filter(Boolean))];
      const box = el('km-lijst');
      if (!lijst.length) { box.innerHTML = '<p class="muted">Zet eerst je leerlingen op de klaslijst hierboven.</p>'; return; }
      const ad = mail ? mail.adressen : {};
      const uit = (mail && mail.uit) || {};
      box.innerHTML = '<span class="km-kop">Leerling</span><span class="km-kop">Adres 1</span><span class="km-kop">Adres 2</span><span class="km-kop"></span>'
        + lijst.map(n => {
          const k = sleutel(n);
          const [a1 = '', ...rest] = String(ad[k] || '').split(/,\s*/).filter(Boolean);
          return `<span>${esc(n)}</span>
          <input type="email" data-naam="${esc(n)}" data-veld="1" value="${esc(a1)}" placeholder="bv. begeleider@school.be" autocomplete="off">
          <input type="email" data-naam="${esc(n)}" data-veld="2" value="${esc(rest.join(', '))}" placeholder="bv. ouder@mail.be" autocomplete="off">
          <label><input type="checkbox" data-naam="${esc(n)}" data-veld="aan"${ad[k] && !uit[k] ? ' checked' : ''}${ad[k] ? '' : ' disabled'}> Automatisch mailen</label>`;
        }).join('');
      box.querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => {
        const naam = inp.dataset.naam;
        const rij = [...box.querySelectorAll('input')].filter(i => i.dataset.naam === naam);
        const veld = v => rij.find(i => i.dataset.veld === v);
        const nieuw = inp.dataset.veld !== 'aan' && !(mail.adressen || {})[sleutel(naam)];
        const aan = nieuw ? true : veld('aan').checked;
        sock.emit('pf-mail-leerling', { naam, adres1: veld('1').value, adres2: veld('2').value, aan }, v => {
          if (v && v.error) { Ui.melding(v.error); return; }
          mail = v; renderBox();
          const heeft = !!mail.adressen[sleutel(naam)];
          veld('aan').disabled = !heeft;
          veld('aan').checked = heeft && !(mail.uit || {})[sleutel(naam)];
          inp.classList.add('ok'); setTimeout(() => inp.classList.remove('ok'), 1500);
          if (veld('aan').checked && !mail.klaar) Ui.melding('Bewaard. Stel nog je mailbox in, anders kan Lancelot niet mailen.');
        });
      }));
    });
  }

  function laad() { sock.emit('pf-mail-view', null, v => { if (v) { mail = v; renderBox(true); renderLijst(); } }); }
  sock.on('connect', laad);
  // De klaslijst veranderde (hier bewaard of via Mijn lesmap): opnieuw tonen, behalve terwijl je een adres typt.
  const opnieuw = () => { if (!el('km-lijst').contains(document.activeElement)) renderLijst(); };
  sock.on('klas-gewijzigd', opnieuw);
  sock.on('klas-namen', opnieuw);

  el('km-bewaar').addEventListener('click', () => {
    sock.emit('pf-mail-afzender', { van: el('km-van').value, pass: el('km-pass').value, naam: el('km-naam').value, host: el('km-host').value, port: el('km-port').value }, v => {
      if (v && v.error) { info(`⚠ ${v.error}`); return; }
      mail = v; el('km-pass').value = ''; renderBox(true); info('✔ Bewaard. Stuur een proefmail om te testen.');
    });
  });
  el('km-test').addEventListener('click', () => {
    info('⏳ Bezig…');
    sock.emit('pf-mail-test', null, r => info(r && r.error ? `⚠ ${r.error}` : `✔ Proefmail verstuurd naar ${mail.van}. Kijk in je mailbox.`));
  });
  el('km-wis').addEventListener('click', async () => {
    if (!await Ui.vraag('Je mailbox uit Lancelot wissen? De adressen per leerling blijven staan.')) return;
    sock.emit('pf-mail-afzender', { wis: true }, v => { if (v && !v.error) { mail = v; renderBox(true); info(''); } });
  });
})();
