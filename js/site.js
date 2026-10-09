/* Shared behaviour for every page: mobile menu, back-to-top button,
   WhatsApp details, and small DOM helpers used by the page scripts. */
window.DMPA = window.DMPA || {};

DMPA.util = {
  /* Escape text for safe use inside innerHTML templates. */
  esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  },
  $(sel, root = document) { return root.querySelector(sel); },
  $$(sel, root = document) { return [...root.querySelectorAll(sel)]; },
};

(() => {
  const { $, $$ } = DMPA.util;
  document.documentElement.classList.replace('no-js', 'js');

  /* Mobile menu */
  const header = $('.site-header');
  const toggle = $('.menu-toggle');
  if (header && toggle) {
    const setOpen = open => {
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
    $$('.mobile-nav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); toggle.focus(); } });
    matchMedia('(min-width: 1340px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
  }

  /* Back to top */
  const top = $('.back-to-top');
  if (top) {
    const onScroll = () => top.classList.toggle('is-visible', scrollY > 600);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* WhatsApp number and link come from config so they change in one place */
  const wa = DMPA.config?.whatsapp;
  if (wa) {
    $$('[data-whatsapp-link]').forEach(a => { a.href = wa.url; });
    $$('[data-whatsapp-number]').forEach(el => { el.textContent = wa.display; });
  }

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
