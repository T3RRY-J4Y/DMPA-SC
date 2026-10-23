/* Resources view: the library shown on resources.html and the home page.
   Files go to Storage under resources/ and covers under thumbs/; each
   resource is one Firestore document (schema in docs/DATABASE.md). */
import { F, S, db, storage, RESOURCES } from './firebase.js';
import { $, $$, esc, toast, explain, slug } from './ui.js';

const view = $('[data-view="resources"]');
const list = $('[data-library]', view);
const dialog = $('#resource-editor');
const form = $('form', dialog);
const TONES = { Guide: 'tone-purple', Card: 'tone-yellow', Poster: 'tone-pink', Video: 'tone-orange', Brand: 'tone-green' };
const MAX_FILE = 50 * 1024 * 1024, MAX_THUMB = 5 * 1024 * 1024;

let items = [];      // [{ id, ...data, thumbSrc, fileSrc }]
let editing = null;  // the item being edited, or null for a new one
let pending = {};    // { file, thumb }: File to upload, or null to remove
let wired = false, loaded = false;
let sortBy = 'order';   // the site's own order; the arrows only work in this view

const time = v => (v?.toMillis ? v.toMillis() : 0);
const text = (a, b) => String(a || '').localeCompare(String(b || ''), 'en-ZA', { sensitivity: 'base' });
const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);
const SORTS = {
  order: byOrder,
  title: (a, b) => text(a.title, b.title),
  newest: (a, b) => time(b.createdAt) - time(a.createdAt) || byOrder(a, b),
  updated: (a, b) => time(b.updatedAt || b.createdAt) - time(a.updatedAt || a.createdAt) || byOrder(a, b),
  type: (a, b) => text(a.type, b.type) || byOrder(a, b),
  status: (a, b) => Number(a.published) - Number(b.published) || byOrder(a, b),
};

export function open() {
  if (!wired) wire();
  if (!loaded) load();
}

const col = () => F.collection(db, RESOURCES);
const url = path => (path ? S.getDownloadURL(S.ref(storage, path)).catch(() => '') : Promise.resolve(''));
const fileName = path => decodeURIComponent(String(path).split('/').pop().split('?')[0]);

async function load() {
  list.setAttribute('aria-busy', 'true');
  try {
    const snap = await F.getDocs(col());
    items = await Promise.all(snap.docs.map(async d => {
      const r = { id: d.id, ...d.data() };
      [r.thumbSrc, r.fileSrc] = await Promise.all([r.thumbUrl || url(r.thumbPath), r.fileUrl || url(r.filePath)]);
      return r;
    }));
    items.sort(byOrder);
    loaded = true;
    render();
  } catch (err) {
    console.error(err);
    list.innerHTML = `<p class="panel__empty">The library didn’t load. ${esc(explain(err))}</p>`;
  } finally {
    list.setAttribute('aria-busy', 'false');
  }
}

function render() {
  $('[data-library-count]', view).textContent = `${items.length} ${items.length === 1 ? 'resource' : 'resources'} · ${items.filter(r => r.published).length} published`;
  if (!items.length) {
    list.innerHTML = '<div class="empty-state"><strong>No resources yet</strong><p>Add your first guide, card or poster.</p></div>';
    return;
  }
  const manual = sortBy === 'order';
  $('[data-sort-hint]', view).hidden = manual;
  list.innerHTML = items.slice().sort(SORTS[sortBy]).map((r, i) => {
    const cover = r.thumbSrc
      ? `<img src="${esc(r.thumbSrc)}" alt="" loading="lazy">`
      : `<span class="lib-item__cover-type">${esc(r.type || 'File')}</span>`;
    const file = r.fileSrc
      ? `<a href="${esc(r.fileSrc)}" target="_blank" rel="noopener">${esc(r.filePath ? fileName(r.filePath) : 'Link')}</a>`
      : '<span class="lib-item__missing">No file yet: shows “Coming soon”</span>';
    return `<li class="lib-item ${TONES[r.type] || 'tone-indigo'}" data-id="${esc(r.id)}">
      <div class="lib-item__order">
        <button class="icon-btn" type="button" data-move="-1" aria-label="Move ${esc(r.title)} up" ${!manual || i === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon-btn" type="button" data-move="1" aria-label="Move ${esc(r.title)} down" ${!manual || i === items.length - 1 ? 'disabled' : ''}>↓</button>
      </div>
      <div class="lib-item__cover">${cover}</div>
      <div class="lib-item__body">
        <h3 class="lib-item__title">${esc(r.title)}</h3>
        <div class="lib-item__tags"><span class="tag">${esc(r.type || 'No type')}</span>${r.audience ? `<span class="tag tag--neutral">${esc(r.audience)}</span>` : ''}${[r.format, r.details].filter(Boolean).length ? `<span class="lib-item__meta">${esc([r.format, r.details].filter(Boolean).join(' · '))}</span>` : ''}</div>
        <p class="lib-item__file">${file} · <a href="resources.html?resource=${encodeURIComponent(r.id)}" target="_blank" rel="noopener">Page link</a></p>
      </div>
      <label class="switch"><input type="checkbox" data-publish ${r.published ? 'checked' : ''}><span class="switch__track" aria-hidden="true"></span><span class="switch__label">${r.published ? 'Published' : 'Hidden'}</span></label>
      <div class="lib-item__actions">
        <button class="btn btn--sm btn--outline" type="button" data-edit>Edit</button>
        <button class="btn btn--sm btn--danger" type="button" data-delete aria-label="Delete ${esc(r.title)}">Delete</button>
      </div>
    </li>`;
  }).join('');
}

function wire() {
  wired = true;
  $('[data-add]', view).addEventListener('click', () => edit(null));
  $('[data-sort]', view).addEventListener('change', e => { sortBy = e.target.value; render(); });

  list.addEventListener('click', e => {
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const item = items.find(r => r.id === row.dataset.id);
    if (e.target.closest('[data-edit]')) edit(item);
    else if (e.target.closest('[data-delete]')) remove(item);
    else if (e.target.closest('[data-move]')) move(item, Number(e.target.closest('[data-move]').dataset.move));
  });
  list.addEventListener('change', async e => {
    if (!e.target.matches('[data-publish]')) return;
    const item = items.find(r => r.id === e.target.closest('[data-id]').dataset.id);
    const published = e.target.checked;
    try {
      await F.updateDoc(F.doc(col(), item.id), { published, updatedAt: F.serverTimestamp() });
      item.published = published;
      toast(published ? `“${item.title}” is now on the site.` : `“${item.title}” is hidden from the site.`);
    } catch (err) {
      e.target.checked = !published;
      toast(explain(err), 'error');
    }
    render();
  });

  // Picking, dropping or removing a file or cover
  $$('[data-drop]', form).forEach(zone => {
    const kind = zone.dataset.drop;
    const input = $('input[type=file]', zone);
    input.addEventListener('change', () => input.files[0] && pick(kind, input.files[0]));
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('is-over');
      if (e.dataTransfer.files[0]) pick(kind, e.dataTransfer.files[0]);
    });
  });
  form.addEventListener('click', e => {
    const clear = e.target.closest('[data-clear]');
    if (!clear) return;
    pending[clear.dataset.clear] = null;
    if (clear.dataset.clear === 'file') form.fileUrl.value = '';
    showFiles();
  });
  form.fileUrl.addEventListener('input', () => { if (form.fileUrl.value.trim()) { pending.file = null; showFiles(); } });

  form.format.addEventListener('input', () => { form.format.dataset.auto = ''; });
  form.addEventListener('submit', save);
  $$('[data-cancel]', dialog).forEach(b => b.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('cancel', e => { if (form.classList.contains('is-saving')) e.preventDefault(); });
}

/* ---- Editor ---------------------------------------------------------------- */
function edit(item) {
  editing = item;
  pending = {};
  form.reset();
  $('[data-editor-title]', dialog).textContent = item ? 'Edit resource' : 'Add a resource';
  const r = item || { published: false, order: (items.at(-1)?.order ?? 0) + 1 };
  ['title', 'description', 'type', 'audience', 'format', 'details'].forEach(k => { form[k].value = r[k] || ''; });
  form.order.value = r.order ?? '';
  form.published.checked = !!r.published;
  form.fileUrl.value = r.fileUrl || '';
  form.format.dataset.auto = '';
  $('[data-progress]', dialog).hidden = true;
  showFiles();
  dialog.showModal();
  form.title.focus();
}

function pick(kind, file) {
  const limit = kind === 'thumb' ? MAX_THUMB : MAX_FILE;
  if (kind === 'thumb' && !file.type.startsWith('image/')) return toast('The cover must be an image (JPG, PNG or WebP).', 'error');
  if (file.size > limit) return toast(`That file is too big. The limit is ${limit / 1024 / 1024} MB.`, 'error');
  pending[kind] = file;
  if (kind === 'file') {
    form.fileUrl.value = '';
    const ext = file.name.split('.').pop().toUpperCase();
    if (!form.format.value || form.format.dataset.auto === '1') { form.format.value = ext; form.format.dataset.auto = '1'; }
  }
  showFiles();
}

/* What each drop zone currently holds: a new pick, the saved file, or nothing. */
function showFiles() {
  const r = editing || {};
  const state = kind => {
    if (pending[kind]) return { name: pending[kind].name, size: pending[kind].size, isNew: true };
    if (pending[kind] === null) return null;
    if (kind === 'file' && r.filePath) return { name: fileName(r.filePath), href: r.fileSrc };
    if (kind === 'thumb' && (r.thumbPath || r.thumbUrl)) return { name: r.thumbPath ? fileName(r.thumbPath) : 'Linked image', src: r.thumbSrc };
    return null;
  };
  ['file', 'thumb'].forEach(kind => {
    const s = state(kind);
    const zone = $(`[data-drop="${kind}"]`, form);
    zone.classList.toggle('has-file', !!s);
    const preview = kind === 'thumb' && s ? (s.isNew ? URL.createObjectURL(pending.thumb) : s.src) : '';
    $('[data-current]', zone).innerHTML = s
      ? `${preview ? `<img src="${esc(preview)}" alt="">` : ''}<span class="drop__name">${s.href ? `<a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)}${s.isNew ? ` <small>${(s.size / 1024 / 1024).toFixed(1)} MB · uploads when you save</small>` : ''}</span>
         <button class="btn btn--sm btn--outline" type="button" data-clear="${kind}">Remove</button>`
      : '';
  });
}

function upload(kind, file, id) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${kind === 'thumb' ? 'thumbs' : 'resources'}/${id}-${Date.now().toString(36)}.${ext}`;
  // A readable name for people who save the file, instead of the storage path.
  const niceName = `${form.title.value.trim().replace(/[\\/:*?"<>|]+/g, '') || id}.${ext}`;
  const task = S.uploadBytesResumable(S.ref(storage, path), file, {
    contentType: file.type || 'application/octet-stream',
    contentDisposition: `inline; filename="${niceName.replace(/"/g, '')}"`,
  });
  const bar = $('[data-progress]', dialog);
  return new Promise((resolve, reject) => task.on('state_changed',
    snap => {
      bar.hidden = false;
      $('progress', bar).value = snap.bytesTransferred / snap.totalBytes;
      $('[data-progress-label]', bar).textContent = `Uploading ${kind === 'thumb' ? 'cover' : 'file'}… ${Math.round((snap.bytesTransferred / snap.totalBytes) * 100)}%`;
    },
    reject,
    () => resolve(path)));
}

async function save(e) {
  e.preventDefault();
  if (form.classList.contains('is-saving')) return;
  const title = form.title.value.trim();
  if (!title) return form.title.focus();
  const linked = form.fileUrl.value.trim();
  if (linked && !/^https?:\/\//.test(linked) && !/^[\w./-]+$/.test(linked)) return toast('The link should start with https:// or be a path on this site.', 'error');

  form.classList.add('is-saving');
  $$('button, input, textarea', form).forEach(el => { el.dataset.was = el.disabled; el.disabled = true; });
  const old = editing || {};
  let id = old.id;
  if (!id) {
    id = slug(title);
    for (let n = 2; items.some(r => r.id === id); n++) id = `${slug(title)}-${n}`;
  }
  const uploaded = [];
  try {
    const data = {
      title,
      description: form.description.value.trim(),
      type: form.type.value.trim(),
      audience: form.audience.value.trim(),
      format: form.format.value.trim(),
      details: form.details.value.trim(),
      order: Number(form.order.value) || 0,
      published: form.published.checked,
      createdAt: old.createdAt || F.serverTimestamp(),
      updatedAt: F.serverTimestamp(),
    };
    // The file: a new upload, a link, the existing upload, or none
    if (pending.file) { data.filePath = await upload('file', pending.file, id); uploaded.push(data.filePath); }
    else if (linked) data.fileUrl = linked;
    else if (pending.file !== null && old.filePath) data.filePath = old.filePath;
    // The cover: a new upload, the existing one, or none (a branded cover is drawn)
    if (pending.thumb) { data.thumbPath = await upload('thumb', pending.thumb, id); uploaded.push(data.thumbPath); }
    else if (pending.thumb !== null) {
      if (old.thumbPath) data.thumbPath = old.thumbPath;
      else if (old.thumbUrl) data.thumbUrl = old.thumbUrl;
    }

    await F.setDoc(F.doc(col(), id), data);

    // Tidy up files this resource no longer uses
    [old.filePath, old.thumbPath].filter(p => p && p !== data.filePath && p !== data.thumbPath)
      .forEach(p => S.deleteObject(S.ref(storage, p)).catch(() => {}));

    toast(editing ? `Saved “${title}”.` : `Added “${title}”.${data.published ? '' : ' It’s hidden until you publish it.'}`);
    dialog.close();
    await load();
  } catch (err) {
    console.error(err);
    uploaded.forEach(p => S.deleteObject(S.ref(storage, p)).catch(() => {}));
    toast(`Not saved. ${explain(err)}`, 'error');
  } finally {
    form.classList.remove('is-saving');
    $$('button, input, textarea', form).forEach(el => { el.disabled = el.dataset.was === 'true'; });
    $('[data-progress]', dialog).hidden = true;
  }
}

/* ---- Reorder and delete ---------------------------------------------------- */
async function move(item, by) {
  if (sortBy !== 'order') return;
  const from = items.indexOf(item), to = from + by;
  if (to < 0 || to >= items.length) return;
  const next = items.slice();
  next.splice(to, 0, ...next.splice(from, 1));
  const batch = F.writeBatch(db);
  next.forEach((r, i) => { if (r.order !== i + 1) batch.update(F.doc(col(), r.id), { order: i + 1 }); });
  try {
    await batch.commit();
    next.forEach((r, i) => { r.order = i + 1; });
    items = next;
    render();
    $(`[data-id="${CSS.escape(item.id)}"] [data-move="${by}"]`, list)?.focus();
  } catch (err) {
    toast(explain(err), 'error');
  }
}

async function remove(item) {
  if (!confirm(`Delete “${item.title}”? Its file and cover are deleted too. This can’t be undone.`)) return;
  try {
    await F.deleteDoc(F.doc(col(), item.id));
    [item.filePath, item.thumbPath].filter(Boolean).forEach(p => S.deleteObject(S.ref(storage, p)).catch(() => {}));
    items = items.filter(r => r !== item);
    render();
    toast(`Deleted “${item.title}”.`);
  } catch (err) {
    toast(explain(err), 'error');
  }
}
