# Connecting the database (Firebase)

The Resources page and the home-page downloads read from **Cloud Firestore**. Files and thumbnails are stored in **Firebase Storage**. Until a config is supplied, the site shows `js/data/sample-resources.js` and marks it with a “sample data” label.

The connection code is already written (`js/services/resources-service.js`). Going live only needs configuration.

## 1. Create the project

1. Go to the [Firebase console](https://console.firebase.google.com), choose **Add project**, and give it a name, e.g. `dmpa-selfinject`.
2. Under **Build → Firestore Database**, create a database in production mode. Choose the region closest to users, e.g. `africa-south1` (Johannesburg).
3. Under **Build → Storage**, enable Storage in the same region.
4. Under **Project settings → Your apps**, add a **Web app** and copy its config object.

## 2. Add the config

Paste the config object into `js/config.js`:

```js
firebase: {
  apiKey: '…',
  authDomain: 'dmpa-selfinject.firebaseapp.com',
  projectId: 'dmpa-selfinject',
  storageBucket: 'dmpa-selfinject.appspot.com',
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

`js/data/sample-resources.js` uses the same fields, so its entries can be copied in as the first documents.

## 4. Security rules

The public can read published resources only. All writes go through the console or an admin tool.

**Firestore**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /resources/{id} {
      allow read: if resource.data.published == true;
      allow write: if false;
    }
  }
}
```

**Storage**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{folder}/{file} {
      allow read: if folder in ['resources', 'thumbs'];
      allow write: if false;
    }
  }
}
```

## 5. Check it works

Open `resources.html`. The “sample data” label should disappear, and your published documents should load. If they don't, the browser console shows the Firebase error. The usual causes are a missing `published: true` field or rules that have not been published.

## Later

- **Content editing:** to let non-developers manage resources, add Firebase Authentication and an admin page, and change the rules to `allow write: if request.auth.token.admin == true`.
- **FAQs in the database:** `js/data/faq-data.js` could move to a `faqs` collection in the same way. Keep it static until the content changes often.
- **Analytics:** Firebase Analytics or a privacy-friendly alternative can track downloads. Avoid collecting personal health data.
