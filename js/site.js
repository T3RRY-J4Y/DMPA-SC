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
  /* Placeholder cards shown while resources load. */
  skeleton(count) {
    return '<div class="skeleton" aria-hidden="true"><div class="skeleton__img"></div><div class="skeleton__body"><div class="skeleton__line" style="width:40%"></div><div class="skeleton__line" style="width:80%;height:22px"></div><div class="skeleton__line" style="width:95%"></div></div></div>'.repeat(count);
  },
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

  /* Sticky call to action on phones, shown once the hero is scrolled past */
  const onHome = !!$('#maps');
  const cta = document.createElement('div');
  cta.className = 'mobile-cta';
  cta.innerHTML = `<a class="btn btn--sun" href="${onHome ? '#maps' : 'index.html#maps'}">How to self-inject</a>` +
    `<a class="btn btn--whatsapp" href="${DMPA.util.esc(wa?.url || 'https://wa.me/27781680192')}">WhatsApp us</a>`;
  document.body.appendChild(cta);
  const footer = $('.site-footer');
  let footerInView = false;
  const showCta = () => cta.classList.toggle('is-visible', scrollY > 480 && !footerInView);
  if (footer) new IntersectionObserver(([e]) => { footerInView = e.isIntersecting; showCta(); }).observe(footer);
  addEventListener('scroll', showCta, { passive: true });
  showCta();

  /* Cookie notice. The site sets no tracking cookies, so this informs rather
     than asks; the only thing stored is that the notice was dismissed. */
  const NOTICE_KEY = 'dmpa-cookie-notice';
  let seen = false;
  try { seen = localStorage.getItem(NOTICE_KEY) === '1'; } catch { /* storage blocked: show the notice */ }
  if (!seen) {
    const notice = document.createElement('section');
    notice.className = 'cookie-notice';
    notice.setAttribute('aria-label', 'Cookie notice');
    notice.innerHTML = '<p>We don’t use advertising or tracking cookies. We only remember that you’ve seen this message. ' +
      '<a href="privacy.html">Privacy policy</a></p><button class="btn btn--sm btn--primary" type="button">Got it</button>';
    document.body.appendChild(notice);
    document.body.classList.add('has-cookie-notice');
    $('button', notice).addEventListener('click', () => {
      try { localStorage.setItem(NOTICE_KEY, '1'); } catch { /* not remembered; fine */ }
      notice.remove();
      document.body.classList.remove('has-cookie-notice');
    });
  }
})();
