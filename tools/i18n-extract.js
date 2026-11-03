// Zoekt alle Nederlandse zinnen die op een scherm kunnen komen: tekst in de html-pagina's, en tekst in
// strings van de scripts (public/js, src, server.js). Zo weten we wat er in de taalbestanden moet staan.
'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.join(__dirname, '..');

// Ziet dit eruit als tekst voor mensen (en niet als code, een kleur, een pad of een id)?
function isTekst(s) {
  const t = s.trim();
  if (t.length < 2) return false;
  if (!/[A-Za-zÀ-ÿ]{2}/.test(t)) return false;
  if (/^(https?:|data:|mailto:|\/|\.\/|#[0-9a-f]{3})/i.test(t)) return false;
  if (/^[\w.-]+\.(js|css|html|png|webp|jpe?g|svg|json|mp3|wav|ogg|webm|mp4|gif|txt|csv|pdf|zip)(\?.*)?$/i.test(t)) return false;
  if (/^[a-z][\w-]*$/.test(t)) return false; // één woord in kleine letters: meestal een id of event
  if (/^[a-z0-9_-]+$/.test(t) && /[-_]/.test(t)) return false; // id-met-streepjes
  if (/^[.#]?[a-z][\w-]*([ .#>:[][\w\-="'\]():.#> ]*)?$/.test(t) && !/[A-Z]/.test(t) && !/\b(de|het|een|en|is|van|je|niet|op|in|met|naar|tegen|door|voor|om|aan|bij|uit|over|te|nog|geen|als|of|maar|zijn|wordt|gaat|naast|tot|af|er|dan|ook|al|wat|wie|hoe|jij|jouw|we|wij|ze|zij|hij|klaar|juist|fout)\b/.test(t)) return false; // css-selector of klassen
  if (/^[\d\s.,:%+\-*/()px]*$/.test(t)) return false;
  if (/^(rgba?|hsla?|url|var|calc|translate|rotate|scale|linear-gradient|radial-gradient)\(/.test(t)) return false;
  if (/^(bold |italic |\d+px |\d+ )/.test(t) && /px|em|rem/.test(t) && /(sans|serif|mono|system|font|Cinzel|Arial|Inter|ui-)/i.test(t)) return false; // canvas-lettertype
  if (/[{};]\s*$/.test(t) && /:/.test(t)) return false;
  if (/^[A-Z_][A-Z0-9_]+$/.test(t)) return false; // CONSTANTE
  if (!/\s/.test(t) && (/\.\./.test(t) || /^-/.test(t) || /[=<>{}|\\]/.test(t))) return false; // pixeltekening, optie, code
  if (!/\s/.test(t) && /^[^aeiouyAEIOUY]*$/.test(t)) return false; // geen klinker: afkorting of code
  if ((t.match(/[A-Za-zÀ-ÿ]/g) || []).length < t.length * 0.4 && !/\{\d+\}/.test(t)) return false; // vooral tekens
  if (/^(application|text|image|audio|video)\//.test(t)) return false;
  if (/^[A-Za-z]+[A-Z][a-z]+[A-Za-z]*$/.test(t) && !/\s/.test(t) && !/^IJ[a-z]/.test(t)) return false; // camelCase
  return true;
}

// Een stuk html (uit een pagina of een string) opsplitsen in losse teksten zoals ze in tekstknopen staan.
const ATTR = /\b(placeholder|title|aria-label|alt|value|data-tip|label)\s*=\s*("([^"]*)"|'([^']*)')/gi;
function htmlTeksten(html, out) {
  html = html.replace(/<!--[\s\S]*?-->/g, ' ');
  html = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  // attributen
  for (const tag of html.match(/<[a-z][^>]*>/gi) || []) {
    let m;
    ATTR.lastIndex = 0;
    while ((m = ATTR.exec(tag))) {
      if (m[1].toLowerCase() === 'value' && !/type\s*=\s*["']?(button|submit|reset)/i.test(tag)) continue;
      const v = m[3] !== undefined ? m[3] : m[4];
      out.push(v);
    }
  }
  // tekst tussen tags: ook één woord in kleine letters is hier schermtekst (\u0002 = uit html)
  for (const stuk of html.split(/<[^>]*>/)) out.push(/^\s*[a-zà-ÿ]/.test(stuk) ? '\u0002' + stuk : stuk);
}
function decode(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&middot;/g, '·').replace(/&hellip;/g, '…').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
}
function normaliseer(s) {
  return decode(s).replace(/\s+/g, ' ').trim();
}

// Alle strings uit een script. Een template met ${…} wordt een patroon met {0}, {1}.
function scriptStrings(code, bestand) {
  const uit = [];
  let ast;
  const opties = { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true, allowReturnOutsideFunction: true };
  try { ast = acorn.parse(code, opties); } catch (e) {
    try { ast = acorn.parse(code, { ...opties, sourceType: 'module' }); } catch (e2) { throw new Error(`${bestand}: ${e.message}`); }
  }
  (function loop(n, ouder) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string') {
      if (!(ouder && (ouder.type === 'ImportDeclaration' || (ouder.type === 'Property' && ouder.key === n)))) uit.push(n.value);
    } else if (n.type === 'TemplateLiteral') {
      if (ouder && ouder.type === 'TaggedTemplateExpression') return;
      let s = '';
      n.quasis.forEach((q, i) => { s += q.value.cooked; if (i < n.expressions.length) s += '\u0001'; });
      uit.push(s);
    }
    if (n.type === 'CallExpression' && n.callee && n.callee.property && /^(require|getElementById|querySelector(All)?|addEventListener|emit|on|setAttribute|getAttribute|removeAttribute|toggleAttribute|classList|add|remove|toggle|contains|closest|matches|createElement|getItem|setItem|removeItem|startsWith|endsWith|split|join|includes|indexOf|replace|match|test|send|sendFile|attachment|type|get|post|use|has|delete)$/.test(n.callee.property.name) && n.arguments[0] && n.arguments[0].type === 'Literal') {
      // eerste argument is technisch (id, event, sleutel); de rest wel bekijken
      for (const a of n.arguments.slice(1)) loop(a, n);
      loop(n.callee, n);
      return;
    }
    if (n.type === 'CallExpression' && n.callee && n.callee.type === 'Identifier' && /^(require|\$|qs|el)$/.test(n.callee.name)) return;
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(x => loop(x, n));
      else if (v && typeof v.type === 'string') loop(v, n);
    }
  })(ast, null);
  // template-plekken nummeren, html splitsen
  const res = [];
  for (const s of uit) {
    const stukken = [];
    if (/<[a-z/][^>]*>/i.test(s)) htmlTeksten(s, stukken); else stukken.push(s);
    for (let st of stukken) {
      let i = 0;
      st = st.replace(/\u0001/g, () => `{${i++}}`);
      res.push(st);
    }
  }
  return res;
}

function lijstBestanden() {
  const pub = path.join(ROOT, 'public');
  const html = fs.readdirSync(pub).filter(f => f.endsWith('.html')).map(f => path.join('public', f));
  const js = fs.readdirSync(path.join(pub, 'js')).filter(f => f.endsWith('.js')).map(f => path.join('public/js', f));
  const src = fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).map(f => path.join('src', f));
  return { html, js: [...js, ...src, 'server.js'] };
}

// Overslaan: hele bestanden die geen schermtekst bevatten of eigen inhoud (woordenlijsten) zijn.
// De ingebouwde woorden en weetjes hebben per taal een eigen bestand (runen-woorden-en.js, ontdek-inhoud-en.js).
const OVERSLAAN = new Set(['public/js/i18n.js', 'public/js/logo-3d.js', 'src/runen-woorden.js', 'src/runen-woorden-en.js', 'src/ontdek-inhoud.js', 'src/ontdek-inhoud-en.js']);

function verzamel() {
  const { html, js } = lijstBestanden();
  const perBestand = {};
  const neem = (bestand, lijst) => {
    const set = new Set();
    for (const r of lijst) {
      const uitHtml = r.startsWith('\u0002');
      const t = normaliseer(uitHtml ? r.slice(1) : r);
      const rest = t.replace(/\{\d+\}/g, '').trim();
      const woorden = /^[a-zà-ÿ]{3,}( [a-zà-ÿ]{2,})*[.!?…:]?$/.test(rest) && /[aeiouy]/.test(rest);
      if (!isTekst(rest) && !((rest !== t || uitHtml) && woorden)) continue;
      if (/^\{\d+\}$/.test(t)) continue;
      set.add(t);
    }
    perBestand[bestand] = [...set];
  };
  for (const f of html) {
    if (OVERSLAAN.has(f)) continue;
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const lijst = [];
    htmlTeksten(code, lijst);
    for (const m of code.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) lijst.push(...scriptStrings(m[1], f));
    neem(f, lijst);
  }
  for (const f of js) {
    if (OVERSLAAN.has(f)) continue;
    neem(f, scriptStrings(fs.readFileSync(path.join(ROOT, f), 'utf8'), f));
  }
  return perBestand;
}

module.exports = { verzamel, isTekst, normaliseer, scriptStrings, htmlTeksten };

if (require.main === module) {
  const p = verzamel();
  const alle = new Set();
  for (const l of Object.values(p)) l.forEach(s => alle.add(s));
  const tel = Object.entries(p).map(([f, l]) => [f, l.length]).sort((a, b) => b[1] - a[1]);
  if (process.argv.includes('--tel')) { console.log(tel.slice(0, 60).map(x => x.join(' ')).join('\n')); }
  console.log('uniek', alle.size, 'tekens', [...alle].join('').length);
  if (process.argv.includes('--dump')) fs.writeFileSync(process.argv[process.argv.indexOf('--dump') + 1], JSON.stringify(p, null, 1));
}
