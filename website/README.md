# Website van LANcelot

De promowebsite in vijf talen (Nederlands, Engels, Frans, Spaans, Duits). Een gewone statische site: geen
bibliotheken, enkel html, één css-bestand, webp-beelden en de lettertypes van de app (samen ongeveer 2,6 MB,
een bezoeker laadt per taal zo'n 1,5 MB, de beelden pas als hij ernaar scrolt).

- `site/` is de website zelf. Die map zet Cloudflare Pages online.
- `bron/teksten/<taal>.json` zijn de teksten per taal.
- `bron/bouw.js` maakt `site/` opnieuw: `node website/bron/bouw.js`. De spellen (naam, uitleg, icoon) komen
  rechtstreeks uit de app: `public/host.html` en de vertalingen in `lang/`. Een nieuw spel staat na een nieuwe
  bouw dus vanzelf op de site. Spellen in `nietOpSite` (`bron/site.json`) blijven weg.
- `bron/schermen.js` maakt de schermafbeeldingen in elke taal opnieuw uit een draaiende LANcelot.
- `bron/site.json`: het adres van de site (voor Google). Downloaden staat nog op 'binnenkort'.

`npm test` controleert dat elke taal alle teksten heeft en dat de site geen bestaande spellen of merken noemt.

## Online zetten met Cloudflare (Workers)

`wrangler.jsonc` in de hoofdmap zegt Cloudflare dat enkel `website/site` online moet. In Workers & Pages: Create > Import a repository > lancelot, build command leeg, deploy command `npx wrangler deploy`. Elke merge op main zet de site vanzelf bij (adres `https://lancelot.<account>.workers.dev`).

## Of met Cloudflare Pages

1. Log in op dash.cloudflare.com, kies **Workers & Pages** > **Create** > **Pages** > **Connect to Git**.
2. Kies GitHub en de repository **lancelot**.
3. Bij de instellingen: framework **None**, build command **leeg laten**, build output directory **website/site**.
4. **Save and Deploy**. De site staat dan op `https://<naam>.pages.dev`. Elke merge op main zet ze vanzelf bij.
5. Eigen domein (optioneel): in het project **Custom domains** > **Set up a custom domain**.

Is het adres anders dan `https://lancelot.pages.dev`? Zet het juiste adres in `bron/site.json` en bouw opnieuw.
