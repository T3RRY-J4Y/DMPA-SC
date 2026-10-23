# Connecting the database (Firebase)

The Resources page and the home-page downloads read from **Cloud Firestore**. Files and thumbnails are stored in **Firebase Storage**. Until a config is supplied, the site shows `js/data/sample-resources.js` and marks it with a “sample data” label.

The connection code is already written (`js/services/resources-service.js`). The security rules, Firebase CLI config and a seed script are in the repo too. Going live only needs a project and configuration.

## 0. Tooling

The site has no build, but the Firebase tooling is installed with npm:

```sh
npm install
npx firebase login          # opens a browser to sign in with your Google account
```

| Command | What it does |
| --- | --- |
| `npm run emulators` | Runs Firestore and Storage locally (needs Java), with a UI at http://localhost:4000 |
| `npm run seed:emulator` | Seeds the local emulator with the sample resources |
| `npm run seed` | Seeds the live project (needs a service account key, see step 4) |
| `npm run deploy:rules` | Publishes `firestore.rules`, `storage.rules` and `firestore.indexes.json` |

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

The public can read published resources only. All writes go through the console or the Admin SDK (the seed script), which bypass the rules. The rules live in `firestore.rules` and `storage.rules`. Publish them with:

```sh
npm run deploy:rules
```

They have been checked against the emulator: the published-only query succeeds, while unfiltered reads, reads of unpublished documents and any client writes are denied.

## 6. Check it works

Open `resources.html`. The “sample data” label should disappear, and your published documents should load. If they don't, the browser console shows the Firebase error. The usual causes are a missing `published: true` field or rules that have not been published.

## Later

- **Content editing:** to let non-developers manage resources, add Firebase Authentication and an admin page, and change the rules to `allow write: if request.auth.token.admin == true`.
- **FAQs in the database:** `js/data/faq-data.js` could move to a `faqs` collection in the same way. Keep it static until the content changes often.
- **Analytics:** Firebase Analytics or a privacy-friendly alternative can track downloads. Avoid collecting personal health data.
