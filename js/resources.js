/* Resources page: loads the library from DMPA.resources, with audience filter and search. */
(() => {
  const { $, esc } = DMPA.util;
  const els = {
    filters: $('#audience-filters'), search: $('#resource-search'), list: $('#resource-list'),
    count: $('#resource-count'), note: $('#sample-note'), error: $('#resource-error'), empty: $('#resource-empty'),
  };
  const state = { all: null, filter: 'All', query: '' };


  const card = r => {
    const cover = r.thumbUrl
      ? `<img class="resource__thumb" src="${esc(r.thumbUrl)}" alt="Cover of ${esc(r.title)}" loading="lazy">`
      : `<div class="resource__cover"><span class="resource__cover-type">${esc(r.type)}</span><span class="resource__cover-title">${esc(r.title)}</span></div>`;
    const action = DMPA.resources.hasFile(r)
      ? `<a class="btn btn--sm btn--dark" href="${esc(r.fileUrl)}" target="_blank" rel="noopener" download aria-label="Download ${esc(r.title)}">Download</a>`
      : '<span class="btn btn--sm btn--placeholder" aria-disabled="true">Coming soon</span>';
    return `<article class="resource ${DMPA.resources.toneFor(r)}">${cover}
      <div class="resource__body">
        <div class="resource__tags"><span class="tag">${esc(r.type)}</span>${r.audience ? `<span class="tag tag--neutral">${esc(r.audience)}</span>` : ''}</div>
        <h2 class="resource__title">${esc(r.title)}</h2>
        <p class="resource__desc">${esc(r.description)}</p>
        <div class="resource__foot"><span class="resource__meta">${esc([r.format, r.details].filter(Boolean).join(' · '))}</span>${action}</div>
      </div></article>`;
  };

  function render() {
    const all = state.all || [];
    const audiences = ['All', ...new Set(all.map(r => r.audience).filter(Boolean))];
    els.filters.innerHTML = audiences.map(a => `<button class="chip" type="button" data-audience="${esc(a)}" aria-pressed="${a === state.filter}">${esc(a)}</button>`).join('');

    const q = state.query.trim().toLowerCase();
    const items = all.filter(r => (state.filter === 'All' || r.audience === state.filter)
      && (!q || [r.title, r.description, r.type, r.audience].join(' ').toLowerCase().includes(q)));
    els.list.innerHTML = items.map(card).join('');
    els.list.setAttribute('aria-busy', 'false');
    els.count.textContent = items.length === 1 ? '1 resource' : `${items.length} resources`;
    els.empty.hidden = !(state.all && items.length === 0);
  }

  async function load() {
    els.error.hidden = true;
    els.list.setAttribute('aria-busy', 'true');
    els.list.innerHTML = DMPA.util.skeleton(3);
    els.count.textContent = 'Loading resources…';
    try {
      const { items, source } = await DMPA.resources.load({ fresh: true });
      state.all = items;
      els.note.hidden = source !== 'sample';
      render();
    } catch (err) {
      console.error('Resources failed to load', err);
      els.list.innerHTML = '';
      els.count.textContent = '';
      els.error.hidden = false;
    }
  }

  els.filters.addEventListener('click', e => {
    const chip = e.target.closest('[data-audience]');
    if (chip) { state.filter = chip.dataset.audience; render(); }
  });
  els.search.addEventListener('input', () => { state.query = els.search.value; render(); });
  $('#resource-reset').addEventListener('click', () => { state.filter = 'All'; state.query = els.search.value = ''; render(); });
  $('#resource-retry').addEventListener('click', load);

  load();
})();
