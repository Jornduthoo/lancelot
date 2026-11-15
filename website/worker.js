// LANcelot meldt na het aanbrengen op het bord enkel: { "kaart": "W-142", "leerjaar": "4" }.
// Dat gaat door naar de database van In Beeld (Supabase, functie ib_aangebracht). Al de rest is gewone statische site.
const DB = 'https://kkqzstqsczcooutdjypt.supabase.co/rest/v1/rpc/ib_aangebracht';
const KEY = 'sb_publishable_woxocUFof4ifDWmkVGsHsQ_HL_eMAhc';
const NR = /^[A-Z]{1,3}-\d{1,5}$/;
const LJ = ['JK', 'K2', 'K3', '1', '2', '3', '4', '5', '6'];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== '/inbeeld/api/aangebracht') return env.ASSETS.fetch(req);
    if (req.method !== 'POST') return new Response('Gebruik POST', { status: 405 });
    let m;
    try { m = await req.json(); } catch { return new Response('Geen json', { status: 400 }); }
    const kaart = String(m?.kaart || '').toUpperCase();
    const leerjaar = String(m?.leerjaar || '').toUpperCase();
    if (!NR.test(kaart) || !LJ.includes(leerjaar)) return new Response('Kaart of leerjaar klopt niet', { status: 400 });
    const r = await fetch(DB, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_kaart: kaart, p_leerjaar: leerjaar }),
    });
    return new Response(null, { status: r.ok ? 204 : 502 });
  },
};
