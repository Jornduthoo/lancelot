// Vertaallaag. De schermen zijn in het Nederlands geschreven; kiest de leerkracht een andere taal
// (Instellingen > Uiterlijk > Taal), dan stuurt de server via /taal.js een woordenboek mee:
// { "Nederlandse tekst": "English text", "{0} wint!": "{0} wins!" }.
// Dit script vertaalt dan elke tekst die op het scherm komt: de html, wat de scripts later invullen
// (MutationObserver), tekst op een canvas (fillText) en de vensters van de browser.
// Het wordt alleen geladen als er een andere taal dan Nederlands gekozen is.
(() => {
  const W = window.LANCELOT_WOORDEN;
  if (!W || window.I18n) return;
  const taal = window.LANCELOT_TAAL || 'en';
  const LOCALE = { en: 'en-GB' }[taal] || taal;

  const exact = new Map();
  const patronen = []; // { re, uit }
  const BLANK = /^\s+|\s+$/g;
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const esc = s => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  for (const [nl, en] of Object.entries(W)) {
    if (typeof en !== 'string' || en === nl) continue;
    if (/\{\d+\}/.test(nl)) {
      const volgorde = [];
      const bron = '^' + nl.split(/(\{\d+\})/).map(stuk => {
        const m = /^\{(\d+)\}$/.exec(stuk);
        if (m) { volgorde.push(+m[1]); return '([\\s\\S]+?)'; }
        return esc(stuk);
      }).join('') + '$';
      try { patronen.push({ re: new RegExp(bron), volgorde, uit: en, lit: nl.replace(/\{\d+\}/g, '').length }); } catch { /* ongeldig patroon */ }
    } else exact.set(nl, en);
  }
  // Langste vaste tekst eerst: "Ronde {0} van {1}" gaat voor "{0} van {1}".
  patronen.sort((a, b) => b.lit - a.lit);

  const cache = new Map();
  function vertaalKern(s) {
    const hit = exact.get(s);
    if (hit !== undefined) return hit;
    const vorm = s.replace(/\d+/g, '0');
    let p = cache.get(vorm);
    if (p === undefined) {
      p = null;
      for (const kand of patronen) if (kand.re.test(s)) { p = kand; break; }
      if (cache.size > 4000) cache.clear();
      cache.set(vorm, p);
    }
    if (!p) return null;
    const m = p.re.exec(s);
    if (!m) { // dezelfde vorm, maar ander patroon: zonder cache zoeken
      for (const kand of patronen) {
        const m2 = kand.re.exec(s);
        if (m2) return vul(kand, m2);
      }
      return null;
    }
    return vul(p, m);
  }
  function vul(p, m) {
    const waarden = {};
    p.volgorde.forEach((nr, i) => { const v = m[i + 1]; waarden[nr] = exact.get(v.trim()) !== undefined ? v.replace(v.trim(), exact.get(v.trim())) : v; });
    return p.uit.replace(/\{(\d+)\}/g, (_, nr) => (waarden[nr] !== undefined ? waarden[nr] : ''));
  }

  // Vertaal een tekst; witruimte vooraan en achteraan blijft staan. Onbekend: de tekst zelf.
  function t(s) {
    if (typeof s !== 'string' || s.length < 2 || !/[A-Za-zÀ-ÿ]/.test(s)) return s;
    const kern = s.trim();
    let uit = vertaalKern(kern);
    if (uit === null) {
      const n = norm(kern);
      if (n !== kern) uit = vertaalKern(n);
    }
    if (uit === null) return s;
    const voor = s.match(/^\s*/)[0];
    const na = s.match(/\s*$/)[0];
    return voor + uit + na;
  }

  // ---------- Het scherm ----------
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip', 'label'];
  const geschreven = new WeakMap(); // tekstknoop -> wat wij erin zetten (zo vertalen we niet in een lus)
  const OVERSLAAN = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);
  function tekstKnoop(n) {
    const p = n.parentNode;
    if (!p || OVERSLAAN.has(p.nodeName) || (p.closest && p.closest('[data-geen-vertaling],[contenteditable=""],[contenteditable="true"]'))) return;
    const v = n.data;
    if (geschreven.get(n) === v) return;
    const u = t(v);
    if (u !== v) { geschreven.set(n, u); n.data = u; }
  }
  function attrs(el) {
    if (el.closest && el.closest('[data-geen-vertaling]')) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v) { const u = t(v); if (u !== v) el.setAttribute(a, u); }
    }
    if (el.nodeName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value) {
      const u = t(el.value); if (u !== el.value) el.value = u;
    }
  }
  function boom(root) {
    if (root.nodeType === 3) return tekstKnoop(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (OVERSLAAN.has(root.nodeName)) return; attrs(root); }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) tekstKnoop(n);
      else attrs(n);
    }
  }
  const mo = new MutationObserver(lijst => {
    for (const m of lijst) {
      if (m.type === 'characterData') tekstKnoop(m.target);
      else if (m.type === 'attributes') {
        const el = m.target;
        const v = el.getAttribute(m.attributeName);
        if (v) { const u = t(v); if (u !== v) el.setAttribute(m.attributeName, u); }
      } else for (const n of m.addedNodes) boom(n);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  document.documentElement.lang = taal;
  if (document.readyState !== 'loading') boom(document.documentElement);
  else document.addEventListener('DOMContentLoaded', () => { boom(document.documentElement); });

  // value van knoppen die een script zet
  const valDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  if (valDesc && valDesc.set) {
    Object.defineProperty(HTMLInputElement.prototype, 'value', {
      ...valDesc,
      set(v) { valDesc.set.call(this, /^(button|submit|reset)$/i.test(this.type) ? t(String(v)) : v); },
    });
  }
  const titelDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
  if (titelDesc && titelDesc.set) {
    Object.defineProperty(Document.prototype, 'title', { ...titelDesc, set(v) { titelDesc.set.call(this, t(String(v))); } });
  }

  // ---------- Canvas ----------
  const C = CanvasRenderingContext2D.prototype;
  for (const f of ['fillText', 'strokeText', 'measureText']) {
    const oud = C[f];
    C[f] = function (s, ...rest) { return oud.call(this, typeof s === 'string' ? t(s) : s, ...rest); };
  }

  // ---------- Browservensters ----------
  for (const f of ['alert', 'confirm', 'prompt']) {
    const oud = window[f];
    if (typeof oud === 'function') window[f] = function (s, ...rest) { return oud.call(window, typeof s === 'string' ? t(s) : s, ...rest); };
  }

  // ---------- Datums en getallen ----------
  // Scripts vragen vaak 'nl-BE'; in een andere taal krijgen ze die taal (maandnamen, dagnamen).
  const isNl = l => (typeof l === 'string' && /^nl\b/i.test(l)) || (Array.isArray(l) && l.some(x => /^nl\b/i.test(x)));
  const wissel = l => (l === undefined || isNl(l) ? LOCALE : l);
  for (const f of ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString']) {
    const oud = Date.prototype[f];
    Date.prototype[f] = function (l, o) { return oud.call(this, wissel(l), o); };
  }
  const DTF = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function (l, o) { return new DTF(wissel(l), o); };
  Intl.DateTimeFormat.prototype = DTF.prototype;
  Intl.DateTimeFormat.supportedLocalesOf = DTF.supportedLocalesOf;
  const lc = String.prototype.localeCompare;
  String.prototype.localeCompare = function (b, l, o) { return lc.call(this, b, isNl(l) ? LOCALE : l, o); };

  // ---------- Voorlezen ----------
  if (window.SpeechSynthesisUtterance) {
    const langDesc = Object.getOwnPropertyDescriptor(SpeechSynthesisUtterance.prototype, 'lang');
    if (langDesc && langDesc.set) {
      Object.defineProperty(SpeechSynthesisUtterance.prototype, 'lang', { ...langDesc, set(v) { langDesc.set.call(this, isNl(v) ? LOCALE : v); } });
    }
  }

  // ---------- AI-prompts ----------
  // De prompts zijn Nederlands; een prompt die de leerkracht kopieert (Ui.kopieer) krijgt deze opdracht vooraan,
  // zodat de chatbot alles in deze taal maakt. Dezelfde tekst staat in src/taal.js (AI_TAAL) voor de server.
  const AI_TAAL = {
    en: 'LANGUAGE: The teacher uses LANcelot in English. Write everything you create (titles, questions, answers, explanations, words, meanings, sentences, feedback) in English with British spelling, even where the instructions below ask for Dutch or Belgian Dutch. Keep JSON keys and fixed values (such as page, schildknaap, ridder) exactly as written below.\n\n',
  };
  function aiPrompt(s) {
    const voor = AI_TAAL[taal];
    if (!voor || typeof s !== 'string' || s.length < 150 || s.startsWith(voor)) return s;
    // Alleen echte prompts: lange tekst die over de leerkracht, leerlingen of JSON gaat.
    if (!/\b(leerkracht|leerlingen|leerjaar|JSON|codeblok)\b/i.test(s)) return s;
    return voor + s;
  }

  window.I18n = { taal, locale: LOCALE, t, aiPrompt };
})();
