/* Copies js/data/sample-resources.js into the Firestore `resources` collection.
   Existing documents with the same ID are overwritten; others are left alone.

   Live project:  GOOGLE_APPLICATION_CREDENTIALS=service-account.json npm run seed
   Emulator:      npm run seed:emulator
   Add --dry-run to print the documents without writing. */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

// Both files are browser scripts that attach to window.DMPA.
const sandbox = { window: {} };
sandbox.DMPA = sandbox.window.DMPA = {};
runInNewContext(read('js/config.js'), sandbox);
runInNewContext(read('js/data/sample-resources.js'), sandbox);
const { config, sampleResources } = sandbox.DMPA;

const projectId = process.env.GCLOUD_PROJECT
  || config.firebase?.projectId
  || JSON.parse(read('.firebaserc')).projects.default;

if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify(sampleResources, null, 2));
  process.exit(0);
}

const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
initializeApp(emulator ? { projectId } : { projectId, credential: applicationDefault() });
const db = getFirestore();
const col = db.collection(config.resourcesCollection);

const batch = db.batch();
for (const { id, ...data } of sampleResources) {
  // '#' is the sample-data placeholder for "Coming soon"; store it as empty.
  if (data.fileUrl === '#') delete data.fileUrl;
  batch.set(col.doc(id), data);
}
await batch.commit();
console.log(`Wrote ${sampleResources.length} documents to ${projectId}/${config.resourcesCollection}${emulator ? ' (emulator)' : ''}.`);
