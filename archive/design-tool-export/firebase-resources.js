// Resources data source. All resources live in Firebase:
//   Firestore collection `resources`, files + thumbnails in Firebase Storage.
// Paste your web app config below to go live. Until then, sample data is shown.
//
// Firestore document fields (per resource):
//   title        string   "DMPA-SC Pocketbook"
//   description  string
//   type         string   "Guide" | "Card" | "Poster" | "Video" | "Brand" ...
//   audience     string   "For women" | "For partners" | "For health workers"
//   format       string   "PDF" | "PNG" | "MP4" ...
//   details      string   "16 pages"            (optional)
//   filePath     string   "resources/pocketbook.pdf"  (Storage path)  OR  fileUrl (full URL)
//   thumbPath    string   "thumbs/pocketbook.jpg"     (optional)      OR  thumbUrl
//   order        number   sort order (lowest first)
//   published    boolean  only `true` documents are shown

export const FIREBASE_CONFIG = null; // { apiKey, authDomain, projectId, storageBucket, appId }
export const COLLECTION = 'resources';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

const SAMPLE = [
  { id: 's1', title: 'DMPA-SC Pocketbook', type: 'Guide', audience: 'For women', format: 'PDF', details: '16 pages', description: 'Contraception in simple terms: how every method works, a side-by-side comparison, self-injection steps and your reminder card.', fileUrl: '#', order: 1 },
  { id: 's2', title: 'Self-injection one-pager', type: 'Guide', audience: 'For women', format: 'PDF', details: '2 sides', description: 'The MAPS method with pictures, what to expect afterwards and a quick checklist, to keep at home.', fileUrl: '#', order: 2 },
  { id: 's3', title: 'Personal reminder card', type: 'Card', audience: 'For women', format: 'PDF', details: 'printable', description: 'Track each self-injection and follow-up clinic visit, and never miss a date.', fileUrl: '#', order: 3 },
  { id: 's4', title: 'DMPA self-inject logo pack', type: 'Brand', audience: 'For partners', format: 'PNG', details: '6 files', description: 'Primary and secondary logos in purple, black and white, with the “Contraception Made Simple” tagline.', fileUrl: 'assets/logo-full-purple.png', order: 4 },
];

export async function loadResources() {
  if (!FIREBASE_CONFIG) return { source: 'sample', items: SAMPLE };
  const [{ initializeApp, getApps }, fs, st] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-firestore.js'),
    import(SDK + 'firebase-storage.js'),
  ]);
  const app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
  const db = fs.getFirestore(app);
  const storage = st.getStorage(app);
  const snap = await fs.getDocs(fs.query(fs.collection(db, COLLECTION), fs.where('published', '==', true)));
  const url = async (u, p) => u || (p ? st.getDownloadURL(st.ref(storage, p)).catch(() => '') : '');
  const items = await Promise.all(snap.docs.map(async d => {
    const r = d.data();
    return { id: d.id, ...r, fileUrl: await url(r.fileUrl, r.filePath), thumbUrl: await url(r.thumbUrl, r.thumbPath) };
  }));
  items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return { source: 'firebase', items };
}
