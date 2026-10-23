# Connecting the database (Firebase)

The Resources page and the home-page downloads read from **Cloud Firestore**, which also stores anonymous usage events for the admin dashboard. Files and thumbnails are stored in **Firebase Storage**. Until a config is supplied, the site shows `js/data/sample-resources.js` and marks it with a “sample data” label.

The connection code is already written (`js/services/resources-service.js`). The security rules, Firebase CLI config and a seed script are in the repo too. Going live only needs a project and configuration.

## 0. Tooling

The site has no build, but the Firebase tooling is installed with npm:

```sh
npm install
npx firebase login          # opens a browser to sign in with your Google account
```

| Command | What it does |
| --- | --- |
| `npm run emulators` | Runs Firestore, Storage and Auth locally (needs Java), with a UI at http://localhost:4000. Use `npm run serve` and open `/admin?emulator` to use the admin panel against them. |
| `npm run seed:emulator` | Seeds the local emulator with the sample resources |
| `npm run seed` | Seeds the live project (needs a service account key, see step 4) |
| `npm run build` | Copies the public site into `dist/`, the only folder Hosting publishes (an allowlist, so keys and tooling can't be published) |
| `npm run serve` | Builds, then runs the whole site locally on the emulators at http://localhost:5000, including `/r/` share pages |
| `npm run deploy` | Builds and deploys the site, the share-page function and the rules |
| `npm run deploy:rules` | Publishes `firestore.rules`, `storage.rules` and `firestore.indexes.json` (which includes the events TTL policy) |
| `npm run admin -- add <email>` | Gives someone access to the admin panel (also `remove <email>` and `list`). Needs the service account key. |

## 1. Create the project

1. Go to the [Firebase console](https://console.firebase.google.com), choose **Add project**, and give it a name, e.g. `dmpa-selfinject`.
2. Under **Build → Firestore Database**, create a database in production mode. Choose the region closest to users, e.g. `africa-south1` (Johannesburg).
3. Under **Build → Storage**, enable Storage in the same region. New projects need the pay-as-you-go **Blaze** plan for Storage. At this site's traffic it stays within the free allowance, but set a budget alert under **Usage and billing**.
4. Under **Project settings → Your apps**, add a **Web app** and copy its config object.
5. If the project ID is not `dmpa-selfinject`, change it in `.firebaserc`.

## 2. Add the config

Paste the config object into `js/config.js`:

```js
firebase: {
  apiKey: '…',
  authDomain: 'dmpa-selfinject.firebaseapp.com',
  projectId: 'dmpa-selfinject',
  storageBucket: 'dmpa-selfinject.firebasestorage.app',
  appId: '…',
},
```

A Firebase web config is safe to publish, because access is controlled by the security rules below.

## 3. The `resources` collection

There is one document per downloadable item. The document ID can be anything readable, e.g. `pocketbook`.

| Field | Type | Required | Example / notes |
| --- | --- | --- | --- |
| `title` | string | ✓ | `DMPA-SC Pocketbook` |
| `description` | string | ✓ | One or two sentences |
| `type` | string | ✓ | `Guide`, `Card`, `Poster`, `Video` or `Brand`. Sets the card colour. |
| `audience` | string | ✓ | `For women`, `For partners` or `For health workers`. Drives the filter chips. |
| `format` | string |  | `PDF`, `PNG`, `MP4` |
| `details` | string |  | `16 pages` |
| `filePath` **or** `fileUrl` | string | ✓ | Storage path (`resources/pocketbook.pdf`) or a full URL |
| `thumbPath` **or** `thumbUrl` | string |  | Cover image (4:3). If none is given, a branded cover is drawn. |
| `order` | number | ✓ | Sort order, lowest first |
| `published` | boolean | ✓ | Only `true` documents are shown |

Upload files to the `resources/` folder in Storage and thumbnails to `thumbs/`. Other folders are not readable.

## 4. Seed the first documents

`js/data/sample-resources.js` uses the same fields, and `scripts/seed-resources.mjs` copies it into the collection. Entries whose `fileUrl` is `#` are stored without a file and show as “Coming soon” until you add a `filePath`.

1. In the console, go to **Project settings → Service accounts → Generate new private key**. Save the file in the repo root as `service-account.json`. It is git-ignored; never commit or share it.
2. Run:

   ```sh
   GOOGLE_APPLICATION_CREDENTIALS=service-account.json npm run seed
   ```

Re-running overwrites documents with the same ID and leaves others alone. Add `-- --dry-run` to print what would be written.

## 5. Security rules

The rules live in `firestore.rules` and `storage.rules`:

- **The public** can read published resources and the files in `resources/` and `thumbs/`, and can add usage events in one exact shape (see below). Nothing else.
- **Admins** are signed-in users with the `admin` custom claim. They can read, add, edit and delete every resource, upload files (up to 50 MB) and covers (images up to 5 MB), and read events.
- The Admin SDK (the seed and admin scripts) bypasses the rules.

Publish them with:

```sh
npm run deploy:rules
```

They have been checked against the emulators. Events with an unknown type, extra fields, a browser-set time or an over-long value are rejected. Public and non-admin users can't read events, see hidden resources, write resources or upload files. Admins can do all of those.

## 6. The admin panel

`/admin` is where resources are managed and usage is reviewed. It isn't linked from the site, and it is hidden from search engines.

**How it's protected.** The admin area isn't part of the public files. The `adminPanel` function (`functions/admin.js`) serves `/admin` and everything under it:
- **Without an admin session:** `/admin` shows only the sign-in page (`functions/admin/login.html`), and the panel's scripts and styles under `/admin/app/` return 401.
- **Signing in:** after Google sign-in, the browser swaps its Firebase ID token for a session cookie at `POST /admin/session`. That only works for accounts with the `admin` claim, and only from this site's own pages.
- **The cookie:** HttpOnly, SameSite=Strict, Secure, and limited to `/admin`. It lasts 12 hours.
- **Every request** checks the cookie with Firebase Auth, including whether it has been revoked. So `npm run admin -- remove` ends that person's session straight away.
- **Caching:** admin responses are never cached (`Cache-Control: private, no-store`), can't be framed, and aren't indexed.
- **The data** has its own protection: the security rules (section 5) check the admin claim on every read and write, so even someone holding the panel's code can't use it.

The admin area runs only on Firebase Hosting with the functions (`npm run serve` locally, or the deployed site), not on a plain static server.

**One-time setup**

1. In the Firebase console, go to **Authentication → Sign-in method**, and enable **Google**.
2. Under **Authentication → Settings → Authorised domains**, add every address the panel will be opened from. `localhost` and `dmpa-selfinject.firebaseapp.com` are there by default. Add the live domain and any Codespaces preview address, e.g. `xyz-5500.app.github.dev`.
3. Ask the new admin to open `/admin` and sign in with Google. They'll see “You don’t have access yet”.
4. Grant access, then they click **Check again**:

   ```sh
   GOOGLE_APPLICATION_CREDENTIALS=service-account.json npm run admin -- add their@email.com
   ```

**Resources tab:** add, edit, publish or hide, reorder and delete resources.
- Files and covers can be chosen or dragged in. They upload to Storage when you press Save.
- A replaced or deleted file is removed from Storage too.
- The download is given the resource's title as its file name.

**Analytics tab:** counts for the last 7, 30 or 90 days, each compared with the period before. It shows:
- visits per day;
- resources seen and downloaded;
- quiz starts, finishes and top matches;
- the FAQs opened most;
- pages viewed, traffic sources and devices;
- WhatsApp taps and reminders saved.

**Download CSV** exports the raw events. Tick **Don’t count my visits on this browser** on the browsers you use to test the site.

## 7. The `events` collection (analytics)

`js/analytics.js` writes one small document per event over the Firestore REST API, so public pages don't load the Firebase SDK. Nothing identifying is sent: no cookies, IDs, IP-based data or quiz answers. Browsers that send Do Not Track or Global Privacy Control are not counted.

| Field | Type | Notes |
| --- | --- | --- |
| `type` | string | `page_view`, `resource_view` (card on screen), `resource_preview` (preview opened), `resource_download`, `resource_share`, `quiz_start`, `quiz_complete`, `faq_open`, `whatsapp_click` or `reminder_save` |
| `page` | string | `home`, `faqs`, `resources`, `privacy` or `terms` |
| `item` | string | Depends on `type`: the traffic source (page views), the resource ID, the FAQ question, the quiz's top-match method ID, where the WhatsApp button was, or which calendar |
| `first` | boolean | `true` on the first page view of a browser session, which counts as a visit |
| `device` | string | `mobile` or `desktop` |
| `ts` | timestamp | Set by the server |
| `expireAt` | timestamp | Two years on. A TTL policy deletes the document after this. |

The dashboard loads the raw events for the chosen period and the one before it. That's one document read per event. At tens of thousands of events a month this is still cents. If traffic grows a lot, add a scheduled Cloud Function that rolls events up into daily totals.

Every resource has its own address, `resources.html?resource=<id>`, which opens its preview. The ID is the Firestore document ID, and each row in the admin panel has a **Page link** to it. Downloads are counted only from the preview's Download button. Shares are counted when someone copies the link, uses the share menu or taps WhatsApp in the preview. When the site is on Firebase Hosting, shared links have the form `/r/<id>` instead. The `sharePage` function (`functions/index.js`, in `europe-west1`, since Firebase Hosting can't route to functions in `africa-south1`) answers those links.
- It serves a small page with the resource's own title, description and cover as the WhatsApp and Facebook link preview.
- With no cover, it uses the file itself if that's an image, else the site's share image.
- Browsers are sent straight on to `resources.html?resource=<id>`. The visit is credited to the referring site, or to “shared link” when the app sends no referrer (WhatsApp usually doesn't).
- Unpublished and unknown resources get a 404 with the general preview.
- Pages are cached for 15 minutes, so a changed title or cover can take that long to show in new previews. Facebook keeps its own copy for longer; refresh it with its Sharing Debugger.
- `/r/` links are used only on the hosts listed in `shareHosts` in `js/config.js`. Everywhere else, including a local preview server, links are `resources.html?resource=<id>`. Add the custom domain to `shareHosts` when the site moves to it.

To tag a shared link, add `?utm_source=`, e.g. `index.html?utm_source=clinic-poster`. The tag then appears under “Where visits come from”.

## 8. Check it works

Open `resources.html`. The “sample data” label should disappear, and your published documents should load. If they don't, the browser console shows the Firebase error. The usual causes are a missing `published: true` field or rules that have not been published.

## Later

- **FAQs in the database:** `js/data/faq-data.js` could move to a `faqs` collection in the same way. Keep it static until the content changes often.
- **Spam protection:** anyone can add events, so a determined person could inflate the counts. If that happens, turn on Firebase App Check for Firestore.
