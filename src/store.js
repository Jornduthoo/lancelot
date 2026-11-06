// LANcelot uit de Microsoft Store. Het Store-pakket (installer/store) zet store.json naast de app; alleen dan geldt wat hier staat.
// De zip-versie en de gewone installatie merken hier niets van: daar verandert niets, er loopt ook geen proefperiode.
// In de Store-versie:
// - Betalen en de proefmaand regelt de Microsoft Store. LANcelot vraagt de licentie op via Windows (store-licentie.ps1).
// - Na de proefmaand zonder aankoop opent het leerkrachtenscherm de pagina /licentie. De gegevens van de klas blijven altijd staan,
//   en een back-up downloaden kan altijd.
// - Lukt het opvragen niet (geen PowerShell, geblokkeerd door de school...), dan gebruikt LANcelot de laatst gekende licentie.
//   Is er nog geen, dan blokkeert LANcelot niets: een technisch probleem mag nooit een les stilleggen.
// - Bijwerken doet de Store zelf, dus de eigen updateknop en de snelkoppelingen verdwijnen.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const APP = path.resolve(__dirname, '..');
const INFO = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(APP, 'store.json'), 'utf8')); } catch { return null; }
})();
const ACTIEF = !!INFO || process.env.LANCELOT_STORE === '1';
const STORE_ID = (INFO && INFO.storeId) || '9P1CLC6W364H';
const KOOP = `ms-windows-store://pdp/?productid=${STORE_ID}`;
const WEB = `https://apps.microsoft.com/detail/${STORE_ID}`;
const DAG = 24 * 60 * 60 * 1000;

// De taal van Windows (nl, en, fr, es, de), voor de eerste start van de Store-versie. Een andere taal: Engels.
let systeemTaal = null;
function taalVanSysteem() {
  if (systeemTaal) return systeemTaal;
  let t = '';
  try { t = Intl.DateTimeFormat().resolvedOptions().locale; } catch {}
  t = String(t || process.env.LANG || '').slice(0, 2).toLowerCase();
  systeemTaal = ['nl', 'en', 'fr', 'es', 'de'].includes(t) ? t : 'en';
  return systeemTaal;
}
const OPNIEUW = 60 * 60 * 1000;

// Wat de licentie van de Store betekent. l = { active, trial, expires } zoals store-licentie.ps1 ze geeft.
function beoordeel(l, nu = Date.now()) {
  if (!l || typeof l !== 'object') return { soort: 'onbekend' };
  const tot = Date.parse(l.expires || '');
  if (l.active && !l.trial) return { soort: 'volledig' };
  if (l.active && l.trial) {
    // De Store zet een proefperiode die nooit verloopt op het jaar 9999. Een geldige datum in het verleden: verlopen.
    if (Number.isFinite(tot) && tot <= nu) return { soort: 'verlopen', tot };
    const dagen = Number.isFinite(tot) ? Math.max(1, Math.ceil((tot - nu) / DAG)) : null;
    return { soort: 'proef', dagen: dagen && dagen < 1000 ? dagen : null, tot: Number.isFinite(tot) ? tot : null };
  }
  return { soort: 'verlopen', tot: Number.isFinite(tot) ? tot : null };
}

let gegevens = null;
function cacheBestand() {
  if (!gegevens) gegevens = require('./gegevens');
  return gegevens.pad('store-licentie.json');
}
function leesCache() {
  try { return JSON.parse(fs.readFileSync(cacheBestand(), 'utf8')); } catch { return null; }
}
function bewaarCache(l) {
  try { fs.writeFileSync(cacheBestand(), JSON.stringify({ ...l, gecontroleerd: new Date().toISOString() }, null, 2) + '\n'); } catch {}
}

// Een test of een demo kan de licentie nabootsen: LANCELOT_STORE_LICENTIE='{"active":true,"trial":true,"expires":"..."}'.
function vraagWindows() {
  return new Promise(resolve => {
    if (process.env.LANCELOT_STORE_LICENTIE) {
      try { return resolve(JSON.parse(process.env.LANCELOT_STORE_LICENTIE)); } catch { return resolve(null); }
    }
    if (process.platform !== 'win32') return resolve(null);
    const script = path.join(__dirname, 'store-licentie.ps1');
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], { windowsHide: true, timeout: 30000 }, (err, stdout) => {
      if (err) return resolve(null);
      try {
        const l = JSON.parse(String(stdout).trim().split(/\r?\n/).pop());
        resolve(l && typeof l.active === 'boolean' ? l : null);
      } catch { resolve(null); }
    });
  });
}

let stand = { soort: ACTIEF ? 'onbekend' : 'geen' };
let laatste = 0;
let bezig = null;

function controleer() {
  if (!ACTIEF) return Promise.resolve(view());
  if (bezig) return bezig;
  bezig = vraagWindows().then(l => {
    if (l) bewaarCache(l);
    else l = leesCache();
    stand = beoordeel(l);
    laatste = Date.now();
    bezig = null;
    return view();
  });
  return bezig;
}

// Elk uur opnieuw, en meteen als een proefperiode intussen voorbij is.
function opDatum() {
  if (!ACTIEF) return;
  const verlopen = stand.soort === 'proef' && stand.tot && stand.tot <= Date.now();
  if (verlopen || Date.now() - laatste > OPNIEUW) controleer();
}

function geblokkeerd() {
  opDatum();
  return ACTIEF && stand.soort === 'verlopen';
}

function view() {
  return { store: ACTIEF, soort: stand.soort, dagen: stand.dagen || null, koop: KOOP, web: WEB };
}

if (ACTIEF) {
  controleer();
  setInterval(opDatum, 5 * 60 * 1000).unref();
}

module.exports = { ACTIEF, taalVanSysteem, STORE_ID, KOOP, WEB, beoordeel, controleer, geblokkeerd, view };
