/* Anonymous usage counts for the admin dashboard (admin.html).
   Each event is one small Firestore document: what happened, on which page,
   and where relevant which resource, question or quiz match. Nothing that
   identifies a person is sent: no cookies, IDs, IP-based location or quiz
   answers. Events go over the Firestore REST API so public pages don't load
   the Firebase SDK. The browser's Do Not Track / Global Privacy Control
   setting turns tracking off, as does the "don't count this browser" switch
   in the admin panel. */
window.DMPA = window.DMPA || {};

DMPA.analytics = (() => {
  const cfg = DMPA.config || {};
  const fb = cfg.firebase;
  const OPT_OUT_KEY = 'dmpa-notrack';
  const store = (kind, fn) => { try { return fn(window[kind]); } catch { return null; } };
  const optedOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1'
    || store('localStorage', s => s.getItem(OPT_OUT_KEY)) === '1';
  const enabled = !!fb && cfg.analytics !== false && !optedOut;

  const page = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '').replace(/^index$/, 'home');
  const device = matchMedia('(max-width: 760px), (pointer: coarse)').matches ? 'mobile' : 'desktop';
  const RETAIN_MS = 730 * 864e5;   // deleted by a Firestore TTL policy after 2 years
  const docs = fb && `projects/${fb.projectId}/databases/(default)/documents`;
  const id = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString(36) + Math.random().toString(36).slice(2));

  function track(type, item, extra = {}) {
    if (!enabled) return;
    const fields = {
      type: { stringValue: type },
      page: { stringValue: page },
      device: { stringValue: device },
      expireAt: { timestampValue: new Date(Date.now() + RETAIN_MS).toISOString() },
    };
    if (item) fields.item = { stringValue: String(item).trim().slice(0, 120) };
    if (extra.first) fields.first = { booleanValue: true };
    const body = { writes: [{
      update: { name: `${docs}/events/${id()}`, fields },
      updateTransforms: [{ fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false },
    }] };
    fetch(`https://firestore.googleapis.com/v1/${docs}:commit?key=${encodeURIComponent(fb.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true,
    }).catch(() => { /* counts are best-effort */ });
  }

  /* Where a visit came from: a ?utm_source= tag, the ?from= that share
     pages (/r/<id>) add, else the referring site. */
  function source() {
    const params = new URLSearchParams(location.search);
    const utm = params.get('utm_source') || params.get('from');
    if (params.has('from')) {
      params.delete('from');
      history.replaceState(history.state, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
    }
    if (utm) return utm.toLowerCase();
    try {
      const ref = new URL(document.referrer);
      return ref.host === location.host ? '' : ref.hostname.replace(/^www\./, '');
    } catch { return ''; }
  }

  /* Which part of the page a link sits in, for WhatsApp taps. */
  function placeOf(el) {
    if (el.closest('#method-quiz')) return 'quiz';
    if (el.closest('.mobile-cta')) return 'sticky button';
    if (el.closest('.site-header')) return 'header';
    if (el.closest('.site-footer')) return 'footer';
    return el.closest('section[id]')?.id || 'page';
  }

  /* Resource cards carry data-resource="<id>". Each card counts as viewed
     once per page load when half of it has been on screen. */
  const seen = new Set();
  const io = 'IntersectionObserver' in window && new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const rid = e.target.dataset.resource;
    if (!seen.has(rid)) { seen.add(rid); track('resource_view', rid); }
  }), { threshold: 0.5 });
  function watchResources(root) {
    if (enabled && io) root.querySelectorAll('[data-resource]').forEach(el => io.observe(el));
  }

  if (enabled) {
    const first = store('sessionStorage', s => { const f = !s.getItem('dmpa-visit'); s.setItem('dmpa-visit', '1'); return f; });
    track('page_view', source(), { first: first !== false });

    // Download and share links name their resource: data-download="<id>",
    // data-share="<id>". A WhatsApp share isn't a chat with us, so it isn't
    // counted as a WhatsApp tap.
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      if (a.dataset.download) track('resource_download', a.dataset.download);
      else if (a.dataset.share) track('resource_share', a.dataset.share);
      else if (/wa\.me|whatsapp\.com/.test(a.href)) track('whatsapp_click', placeOf(a));
    }, { capture: true });
  }

  return { track, watchResources, OPT_OUT_KEY };
})();
