// Het live overzicht van één taak (toets, quiz of oefenblad): per leerling een kaartje met nog niet begonnen,
// bezig op vraag n (en hoe lang al), lang vast (⚠) of klaar (en hoe laat). Gedeeld door Mijn klas › Taken
// (het venster 📡 Live) en het startscherm (de zwevende Live-kaders), zodat beide hetzelfde tonen.
'use strict';
(function () {
  const el = (tag, cls, tekst) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  };
  const uurTekst = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${d.getHours()}.${String(d.getMinutes()).padStart(2, '0')}`; };

  // t: één taak uit de lijst van taken. grens: vanaf hoeveel minuten iemand "lang vast" zit.
  // opKlik(l): wat een tik op het kaartje van een leerling doet. opOpen(l): tik op wie op slot staat (de toets weer openen).
  // Geeft de kaartjes, de samenvatting (bezig · klaar · nog niet) en wie lang vastzit.
  function teken(t, { grens = 5, nu = Date.now(), opKlik, opOpen } = {}) {
    const ll = (t.leerlingen || []).filter(l => !l.niet);
    const vast = [];
    const kaarten = ll.map(l => {
      const toets = t.soort === 'proef';
      const stil = l.actief ? Math.max(0, (nu - Date.parse(l.actief)) / 60000) : 0;
      // Toets: hoe lang op deze vraag. Quiz: hoe lang op de volgende vraag. Oefenblad: hoe lang niets ingevuld.
      const min = l.status !== 'bezig' ? null : toets ? (l.posSinds ? Math.max(0, (nu - Date.parse(l.posSinds)) / 60000) : null) : l.actief ? stil : null;
      const isVast = min !== null && min >= grens && (!toets || stil >= 1);
      const nr = toets ? l.pos + 1 : Math.min(l.gedaan + 1, l.totaal || l.gedaan + 1);
      if (isVast) vast.push(t.soort === 'oefenblad' ? `${l.naam} (${Math.floor(min)} min niets ingevuld)` : `${l.naam} (vraag ${nr}, ${Math.floor(min)} min)`);
      const b = el('button', `tk-live-ll ${l.status}${isVast || l.opSlot ? ' vast' : ''}${l.afwezig ? ' inhalen' : ''}`);
      b.type = 'button';
      const naam = el('strong', '', l.naam);
      if (l.elders) naam.append(el('span', 'tk-ll-pc', ` 💻 ${l.elders}`));
      const wat = l.opSlot ? '🔒 Op slot · tik om te openen' : l.status === 'klaar' ? `✔ Klaar${l.klaar ? ` om ${uurTekst(l.klaar)}` : ''}`
        : l.status === 'bezig' && t.soort === 'oefenblad' ? `${isVast ? '⚠ ' : ''}Bezig${min !== null && min >= 1 ? ` · ${Math.floor(min)} min niets ingevuld` : ''}`
        : l.status === 'bezig' ? `${isVast ? '⚠ ' : ''}Vraag ${nr}${toets ? (l.paginas ? ` van ${l.paginas}` : '') : l.totaal ? ` van ${l.totaal}` : ''}${min !== null ? ` · ${min < 1 ? 'net' : `${Math.floor(min)} min`}` : ''}`
        : l.afwezig ? 'Afwezig: haalt in' : 'Nog niet begonnen';
      const balk = el('span', 'tk-ll-balk');
      balk.appendChild(el('i')).style.width = `${l.status === 'klaar' ? 100 : l.totaal ? (l.gedaan / l.totaal) * 100 : 0}%`;
      b.append(naam, el('span', 'tk-live-wat', wat), el('span', 'tk-live-klein', l.status === 'nieuw' ? '' : t.soort === 'quiz' ? `${l.gedaan} van ${l.totaal} beantwoord${l.score ? ` · ${l.juist} juist` : ''}` : `${l.gedaan} van ${l.totaal} ingevuld`), balk);
      b.title = l.opSlot ? 'Verliet de toets: tik om de toets weer te openen' : 'Bekijk het werk van deze leerling';
      if (l.opSlot && opOpen) b.addEventListener('click', () => opOpen(l));
      else if (opKlik) b.addEventListener('click', () => opKlik(l));
      return b;
    });
    const n = s => ll.filter(l => l.status === s).length;
    return { kaarten, samen: `${n('bezig')} bezig · ${n('klaar')} klaar · ${n('nieuw')} nog niet begonnen`, vast: vast.length ? `⚠ Lang vast: ${vast.join(', ')}` : '' };
  }

  // Op slot bij verlaten (wens 27 nov): de toets van een leerling weer openen, na één vraag.
  async function open(socket, id, naam) {
    const ok = window.Ui ? await Ui.vraag(`${naam} verliet de toets. De toets weer openen?`, { ja: '🔓 Openen', nee: 'Nee' }) : true;
    if (!ok) return;
    socket.emit('tk-ontgrendel', { id, naam }, r => { if (r && r.error && window.Ui) Ui.melding(r.error); });
  }
  window.TkOpen = open;
  window.LiveRaster = { teken, uurTekst, open };
})();
