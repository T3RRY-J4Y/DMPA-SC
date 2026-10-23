/* Resources page: the preview dialog. Each resource has its own address,
   resources.html?resource=<id>, so a preview can be shared as a link and
   the back button closes it. From the preview people choose to download or
   share; nothing downloads just by opening it. */
window.DMPA = window.DMPA || {};

DMPA.resourcePreview = (() => {
  const { $, esc } = DMPA.util;
  const PARAM = 'resource';
  const dialog = $('#resource-preview');
  const body = $('[data-preview-body]', dialog);
  const baseTitle = document.title;
  let items = [];
  let pushed = false;     // whether opening added a history entry to go back over
  let current = null;

  const icon = path => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const ICONS = {
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    download: '<path d="M12 3v12m0 0-5-5m5 5 5-5M5 21h14"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  };

  /* The address to share for a resource: its share page when that's set
     up (it carries the resource's own link preview), else this page. */
  const cfg = DMPA.config || {};
  const sharePath = cfg.shareHosts?.includes(location.host) ? cfg.sharePath : null;
  const shareUrl = id => {
    if (sharePath) return new URL(sharePath + encodeURIComponent(id), location.origin).href;
    const u = new URL(location.pathname, location.origin);
    u.searchParams.set(PARAM, id);
    return u.href;
  };
  const idInUrl = () => new URLSearchParams(location.search).get(PARAM);
  function setUrl(id, push) {
    const u = new URL(location.href);
    if (id) u.searchParams.set(PARAM, id); else u.searchParams.delete(PARAM);
    history[push ? 'pushState' : 'replaceState'](id ? { preview: id } : null, '', u);
  }

  const extOf = r => (r.format || String(r.fileUrl).split('?')[0].split('.').pop() || '').toLowerCase();
  const cover = r => r.thumbUrl
    ? `<img class="preview__thumb" src="${esc(r.thumbUrl)}" alt="Cover of ${esc(r.title)}">`
    : `<div class="resource__cover"><span class="resource__cover-type">${esc(r.type)}</span><span class="resource__cover-title">${esc(r.title)}</span></div>`;

  /* Show the file itself where the browser can: PDFs (not on most phones),
     images and video. Otherwise the cover. */
  function media(r) {
    if (!DMPA.resources.hasFile(r)) return cover(r);
    const ext = extOf(r);
    if (ext === 'pdf' && navigator.pdfViewerEnabled) {
      return `<iframe class="preview__frame" src="${esc(r.fileUrl)}#view=FitH" title="Preview of ${esc(r.title)}" loading="lazy"></iframe>`;
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return `<img class="preview__image" src="${esc(r.fileUrl)}" alt="${esc(r.title)}">`;
    if (['mp4', 'webm', 'mov'].includes(ext)) {
      return `<video class="preview__video" src="${esc(r.fileUrl)}" controls playsinline preload="metadata"${r.thumbUrl ? ` poster="${esc(r.thumbUrl)}"` : ''}></video>`;
    }
    return cover(r);
  }

  function render(r) {
    const close = `<button class="preview__close" type="button" data-preview-close aria-label="Close preview">${icon(ICONS.x)}</button>`;
    dialog.classList.toggle('preview--narrow', !r);
    if (!r) {
      body.className = 'preview__inner';
      body.innerHTML = `${close}<div class="preview__info">
        <div class="preview__top"><span class="tag tag--neutral">Not found</span></div>
        <h2 class="preview__title" id="preview-title">This resource isn’t available</h2>
        <p class="preview__desc">It may have been removed or renamed. Have a look at the rest of the library instead.</p>
        <div class="preview__actions"><button class="btn btn--primary" type="button" data-preview-close>Browse resources</button></div>
      </div>`;
      return;
    }
    const url = shareUrl(r.id);
    const meta = [r.format, r.details].filter(Boolean).join(' · ');
    const download = DMPA.resources.hasFile(r)
      ? `<a class="btn btn--lg btn--primary" href="${esc(r.fileUrl)}" target="_blank" rel="noopener" download data-download="${esc(r.id)}">${icon(ICONS.download)} Download${r.format ? ` ${esc(r.format)}` : ''}</a>`
      : '<span class="btn btn--lg btn--placeholder" aria-disabled="true">Coming soon</span>';
    const wa = `https://wa.me/?text=${encodeURIComponent(`${r.title}: ${url}`)}`;
    body.className = `preview__inner ${DMPA.resources.toneFor(r)}`;
    body.innerHTML = `${close}<div class="preview__media">${media(r)}</div>
      <div class="preview__info">
        <div class="preview__top"><div class="resource__tags"><span class="tag">${esc(r.type)}</span>${r.audience ? `<span class="tag tag--neutral">${esc(r.audience)}</span>` : ''}</div></div>
        <h2 class="preview__title" id="preview-title">${esc(r.title)}</h2>
        ${r.description ? `<p class="preview__desc">${esc(r.description)}</p>` : ''}
        ${meta ? `<p class="resource__meta">${esc(meta)}</p>` : ''}
        <div class="preview__actions">${download}</div>
        ${DMPA.resources.hasFile(r) ? '' : '<p class="preview__note">This one isn’t ready yet. Share the link and it will work as soon as it is.</p>'}
        <div class="preview__share">
          <span class="preview__share-label">Share this resource</span>
          ${navigator.share ? `<button class="btn btn--sm btn--outline" type="button" data-share-native>${icon(ICONS.share)} Share</button>` : ''}
          <a class="btn btn--sm btn--outline" href="${esc(wa)}" target="_blank" rel="noopener" data-share="${esc(r.id)}">${icon(ICONS.chat)} WhatsApp</a>
          <button class="btn btn--sm btn--outline" type="button" data-copy>${icon(ICONS.link)} <span>Copy link</span></button>
        </div>
      </div>`;
  }

  function show(id, { push = true, count = true } = {}) {
    current = items.find(r => r.id === id) || null;
    render(current);
    if (push && idInUrl() !== id) { setUrl(id, true); pushed = true; }
    document.title = current ? `${current.title} · DMPA self-inject` : baseTitle;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    $('.preview__close', dialog).focus();
    if (current && count) DMPA.analytics?.track('resource_preview', current.id);
  }

  /* Closing removes ?resource= from the address: by going back if opening
     added a history entry, otherwise by rewriting it. */
  dialog.addEventListener('close', () => {
    document.title = baseTitle;
    dialog.querySelectorAll('video').forEach(v => v.pause());
    if (!idInUrl()) return;
    if (pushed) history.back(); else setUrl(null, false);
    pushed = false;
  });

  addEventListener('popstate', () => {
    const id = idInUrl();
    // Back/forward revisits an open already counted
    if (id) { pushed = false; show(id, { push: false, count: false }); }
    else if (dialog.open) { pushed = false; dialog.close(); }
  });

  dialog.addEventListener('click', async e => {
    if (e.target === dialog || e.target.closest('[data-preview-close]')) return dialog.close();
    if (!current) return;
    if (e.target.closest('[data-share-native]')) {
      try {
        await navigator.share({ title: current.title, text: current.description || current.title, url: shareUrl(current.id) });
        DMPA.analytics?.track('resource_share', current.id);
      } catch { /* cancelled */ }
    }
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      const label = $('span', copy);
      try {
        await navigator.clipboard.writeText(shareUrl(current.id));
        label.textContent = 'Link copied';
        DMPA.analytics?.track('resource_share', current.id);
      } catch {
        label.textContent = 'Couldn’t copy';
        prompt('Copy this link:', shareUrl(current.id));
      }
      setTimeout(() => { label.textContent = 'Copy link'; }, 2500);
    }
  });

  /* Called once the library has loaded. Opens the preview named in the
     address, if there is one. */
  function init(list) {
    items = list;
    const id = idInUrl();
    if (id) { pushed = false; show(id, { push: false }); }
  }

  return { init, show, href: id => `?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(location.search)), [PARAM]: id })}` };
})();
