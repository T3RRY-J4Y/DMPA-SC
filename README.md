# DMPA self-inject · Resource Hub

A resource hub for **DMPA-SC self-injectable contraception** (“Contraception Made Simple”). It covers:

- **Home**: what DMPA-SC is, the MAPS self-injection method, what to expect afterwards, a next-injection date calculator with calendar export, a comparison of contraceptive methods, and downloads.
- **FAQs**: 108 questions in 7 topics, with search, topic navigation and quick facts.
- **Resources**: a downloadable library of guides, cards and brand files, filtered by audience. It runs on sample data until Firebase is connected.

It is a static site: plain HTML, one stylesheet and vanilla JavaScript, with no build step or framework.

## Viewing the prototype

Open `index.html` in a browser. Everything works when the file is opened directly.

To share it or test it like a real website, serve the folder:

```bash
npx serve .            # or: python3 -m http.server 8000
```

The site can be hosted on any static host (GitHub Pages, Netlify, Firebase Hosting) without any setup. `404.html` is picked up automatically by those hosts.

## Project structure

```
├── index.html               Home page
├── faqs.html                FAQ page
├── resources.html           Resource library
├── 404.html                 Not-found page
├── css/
│   └── styles.css           The site stylesheet: brand tokens, components, page sections
├── js/
│   ├── config.js            Site settings: WhatsApp number, Firebase config  ← edit to go live
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
│   └── images/              Logos, WhatsApp QR code
├── docs/
│   └── DATABASE.md          Firebase setup, schema and security rules
├── design-source/           Brand and print source files (not served to users)
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
- [ ] Connect Firebase (see above).
- [ ] Clinical and content sign-off on all copy.
