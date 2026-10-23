/* Loads the Firebase SDK for the admin panel, using the project config and
   SDK version in js/config.js. Add ?emulator to the URL to use the local
   emulators started with `npm run emulators`. */
const cfg = window.DMPA.config;
const sdk = `https://www.gstatic.com/firebasejs/${cfg.firebaseSdkVersion}/`;

export const [appSdk, A, F, S] = await Promise.all([
  import(sdk + 'firebase-app.js'),
  import(sdk + 'firebase-auth.js'),
  import(sdk + 'firebase-firestore.js'),
  import(sdk + 'firebase-storage.js'),
]);

export const app = appSdk.getApps()[0] || appSdk.initializeApp(cfg.firebase);
export const auth = A.getAuth(app);
export const db = F.getFirestore(app);
export const storage = S.getStorage(app);
export const RESOURCES = cfg.resourcesCollection;

export const usingEmulator = new URLSearchParams(location.search).has('emulator');
if (usingEmulator) {
  A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  F.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  S.connectStorageEmulator(storage, '127.0.0.1', 9199);
}
