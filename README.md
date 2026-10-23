# DMPA self-inject · Resource Hub

A resource hub for **DMPA-SC self-injectable contraception** (“Contraception Made Simple”). It covers:

- **Home**: what DMPA-SC is, the MAPS self-injection method, what to expect afterwards, a next-injection date calculator with calendar export, a comparison of contraceptive methods, and downloads.
- **FAQs**: 108 questions in 7 topics, with search, topic navigation and quick facts.
- **Resources**: a downloadable library of guides, cards and brand files, filtered by audience, served from Firebase.
- **Admin** (`admin.html`, not linked from the site): upload and manage resources, and see anonymous usage analytics. Setup is in [`docs/DATABASE.md`](docs/DATABASE.md#6-the-admin-panel).

It is a static site: plain HTML, one stylesheet and vanilla JavaScript, with no build step or framework.

## Viewing the prototype

Open `index.html` in a browser. Everything works when the file is opened directly.

To share it or test it like a real website, serve the folder:

```bash
npx serve .            # or: python3 -m http.server 8000
```

It's set up for **Firebase Hosting** (`npm run deploy`), which also provides the `/r/<id>` share pages. Only the files that `scripts/build-site.mjs` copies into `dist/` are published. Any other static host works too. Share links then fall back to `resources.html?resource=<id>` (see `shareHosts` in `js/config.js`). `404.html` is picked up automatically by those hosts.

## Project structure

```
├── index.html               Home page
├── faqs.html                FAQ page
├── resources.html           Resource library
├── privacy.html             Privacy policy (POPIA)
├── terms.html               Terms of use
├── admin.html               Admin panel (Google sign-in, admins only)
├── 404.html                 Not-found page
├── robots.txt, sitemap.xml  Search engine files (domain placeholder, see below)
├── favicon.ico, site.webmanifest
├── css/
│   ├── styles.css           The site stylesheet: brand tokens, components, page sections
│   └── admin.css            Admin panel styles, built on the same tokens
├── js/
│   ├── config.js            Site settings: WhatsApp number, Firebase config  ← edit to go live
│   ├── analytics.js         Anonymous usage counts for the admin dashboard
│   ├── admin/               Admin panel modules: sign-in, analytics dashboard, resource manager
│   ├── site.js              Shared behaviour: mobile menu, back-to-top, helpers
│   ├── home.js              MAPS tabs, date calculator, method filter, downloads
│   ├── faqs.js              FAQ rendering, search, expand/collapse
│   ├── resources.js         Resource library, filters, search
│   ├── services/
│   │   └── resources-service.js   Data layer: sample data now, Firestore when configured
│   └── data/
│       ├── faq-data.js           FAQ content
│       └── sample-resources.js   Placeholder resources, used as seed data too
├── assets/
│   ├── images/              Logos, hero photo, social share image (og-image.jpg), WhatsApp QR code
│   └── icons/               Favicons and app icons
├── docs/
│   └── DATABASE.md          Firebase setup, schema and security rules
├── firebase.json, .firebaserc       Firebase CLI config (project ID, rules, emulators)
├── firestore.rules, storage.rules   Security rules, deployed with `npm run deploy:rules`
├── scripts/
│   ├── seed-resources.mjs   Copies the sample resources into Firestore
│   └── admin.mjs            Grants or removes admin access (npm run admin -- add <email>)
├── package.json             Firebase tooling only; the site itself has no build
├── design-source/           Brand and print source files (not served to users)
│   ├── social/og-image.html Layout used to render assets/images/og-image.jpg (1200×630)
│   ├── brand/               Logo PNGs and the colour palette
│   ├── print/               Pocketbook and one-pager InDesign files
│   └── content/             Chatbot FAQ document (source for faq-data.js)
└── archive/                 Original design-tool export, kept for reference
```

## Styling

All styling is in `css/styles.css`. The file starts with a table of contents.

- **Brand tokens** are CSS custom properties on `:root`, for example `--purple`, `--pink`, `--ink` and `--r-lg`. Change a colour in one place.
- **Tone classes** (`tone-purple`, `tone-pink`, `tone-orange`, `tone-yellow`, `tone-green`, `tone-indigo`, `tone-lilac`) give a component its colour family. Nav dots, tiles, MAPS steps, FAQ topics and resource cards all read from them.
- **Components** use plain BEM-style names: `.btn`, `.btn--primary`, `.card`, `.acc-item`, `.resource__title`.

## Editing content

| What | Where |
| --- | --- |
| WhatsApp number | `js/config.js` (updates every link marked `data-whatsapp-link`) |
| FAQs | `js/data/faq-data.js` |
| MAPS steps, side effects, method comparison | `index.html` |
| Downloadable resources | Firestore once connected; until then `js/data/sample-resources.js` |

## Connecting the database

See [`docs/DATABASE.md`](docs/DATABASE.md). In short: create a Firebase project, paste its web config into `js/config.js`, and add resources to the `resources` collection. No other code changes are needed.

## Still to do before launch

- [ ] Replace the drawn MAPS and hero illustrations with final artwork or photography from the creative team.
- [ ] Export the Pocketbook, one-pager and reminder card to PDF and upload them as resources.
- [x] Connect Firebase (project `dmpa-selfinject`).
- [ ] Clinical and content sign-off on all copy.

## Before going live

- **Domain.** `robots.txt`, `sitemap.xml` and the `canonical` / `og:url` / `og:image` tags use the placeholder `https://dmpa-selfinject.example`. Replace it everywhere with the real address:
  ```bash
  grep -rl 'dmpa-selfinject.example' --include='*.html' --include='*.xml' --include='*.txt' . | xargs sed -i 's#https://dmpa-selfinject.example#https://YOUR-DOMAIN#g'
  ```
- **Legal pages.** `privacy.html` and `terms.html` are drafts. Have both pages reviewed before publishing.
- **Cookie notice.** The site sets no cookies; the notice only records in `localStorage` that it was dismissed. If analytics are added later, it must become a consent banner that blocks them until accepted.
