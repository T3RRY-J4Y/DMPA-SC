/* Resources data service.
   Pages call DMPA.resources.load() and get back { source, items }, where
   source is 'sample' or 'firebase'. Swapping the backend only touches this
   file and js/config.js. */
window.DMPA = window.DMPA || {};

DMPA.resources = (() => {
  const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);
  let cache = null;

  async function fromFirebase(cfg) {
    const sdk = `https://www.gstatic.com/firebasejs/${cfg.firebaseSdkVersion}/`;
    const [{ initializeApp, getApps }, fs, st] = await Promise.all([
      import(sdk + 'firebase-app.js'),
      import(sdk + 'firebase-firestore.js'),
      import(sdk + 'firebase-storage.js'),
    ]);
    const app = getApps()[0] || initializeApp(cfg.firebase);
    const db = fs.getFirestore(app);
    const storage = st.getStorage(app);
    const snap = await fs.getDocs(fs.query(fs.collection(db, cfg.resourcesCollection), fs.where('published', '==', true)));
    // Accept either a full URL or a Storage path for files and thumbnails.
    const resolve = async (url, path) => url || (path ? st.getDownloadURL(st.ref(storage, path)).catch(() => '') : '');
    const items = await Promise.all(snap.docs.map(async doc => {
      const r = doc.data();
      return { id: doc.id, ...r, fileUrl: await resolve(r.fileUrl, r.filePath), thumbUrl: await resolve(r.thumbUrl, r.thumbPath) };
    }));
    return items.sort(byOrder);
  }

  async function load({ fresh = false } = {}) {
    if (cache && !fresh) return cache;
    const cfg = DMPA.config;
    cache = cfg.firebase
      ? { source: 'firebase', items: await fromFirebase(cfg) }
      : { source: 'sample', items: DMPA.sampleResources.filter(r => r.published !== false).sort(byOrder) };
    return cache;
  }

  /* Shared helpers for rendering a resource card. */
  const TONES = { Guide: 'tone-purple', Card: 'tone-yellow', Poster: 'tone-pink', Video: 'tone-orange', Brand: 'tone-green' };
  const hasFile = r => !!r.fileUrl && r.fileUrl !== '#';
  const toneFor = r => TONES[r.type] || 'tone-indigo';

  /* Sort orders offered on the Resources page. Ties fall back to the
     admin-set order. createdAt is a Firestore Timestamp, or absent on
     sample data and seeded documents (sorted as oldest). */
  const time = v => (v?.toMillis ? v.toMillis() : Date.parse(v) || 0);
  const text = (a, b) => String(a || '').localeCompare(String(b || ''), 'en-ZA', { sensitivity: 'base' });
  const SORTS = {
    featured: { label: 'Recommended', compare: byOrder },
    newest: { label: 'Newest first', compare: (a, b) => time(b.createdAt) - time(a.createdAt) || byOrder(a, b) },
    title: { label: 'Title (A to Z)', compare: (a, b) => text(a.title, b.title) },
    type: { label: 'Type', compare: (a, b) => text(a.type, b.type) || byOrder(a, b) },
  };
  const sort = (items, key) => items.slice().sort((SORTS[key] || SORTS.featured).compare);

  return { load, hasFile, toneFor, SORTS, sort };
})();
