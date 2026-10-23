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

  /* Accordions (.acc-item <details>): opening and closing slide, and opening
     one closes the others in the same list. Only clicks are handled here, so
     "Expand all" and search on the FAQ page can still open many at once. */
  // `name` in the markup gives native one-at-a-time as a fallback without this
  // script; it would close items instantly mid-animation, so drop it here.
  $$('.acc-item[name]').forEach(d => d.removeAttribute('name'));
  const accAnims = new WeakMap();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function setAccOpen(d, open) {
    const running = accAnims.get(d);
    if (!running && d.open === open) return;
    const startH = d.offsetHeight;
    running?.cancel();
    d.classList.toggle('is-closing', !open);
    if (reduceMotion.matches || !d.animate) { d.open = open; d.classList.remove('is-closing'); return null; }
    d.open = true;   // open while measuring and animating; a close commits at the end
    const borders = d.offsetHeight - d.clientHeight;
    const endH = open ? d.offsetHeight : $('summary', d).offsetHeight + borders;
    const anim = d.animate({ height: [`${startH}px`, `${endH}px`] }, { duration: 280, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    const body = $('.acc-item__body', d);
    if (open && body) body.animate({ opacity: [0, 1], transform: ['translateY(-6px)', 'none'] }, { duration: 280, easing: 'ease-out' });
    accAnims.set(d, anim);
    const done = () => { if (accAnims.get(d) === anim) accAnims.delete(d); };
    anim.onfinish = () => {
      done();
      if (!open) { d.open = false; d.classList.remove('is-closing'); }
    };
    anim.oncancel = done;
    return anim;
  }

  // Keep the clicked question still on screen until the animations end.
  // The browser's own scroll anchoring is switched off meanwhile: it often
  // anchors to content below the list and scrolls the page as items resize.
  let holding = 0;
  function holdInPlace(el, anims) {
    const id = ++holding;
    const root = document.documentElement;
    const top = el.getBoundingClientRect().top;
    let running = true;
    root.style.overflowAnchor = 'none';
    Promise.allSettled(anims.map(a => a.finished)).then(() => { running = false; });
    const tick = () => {
      if (id !== holding) return;   // a newer click took over
      const dy = el.getBoundingClientRect().top - top;
      if (Math.abs(dy) >= 1) scrollBy({ top: dy, behavior: 'instant' });   // html has smooth scrolling
      if (running) requestAnimationFrame(tick);
      else root.style.overflowAnchor = '';
    };
    requestAnimationFrame(tick);
  }

  document.addEventListener('click', e => {
    const summary = e.target.closest('.acc-item > summary');
    if (!summary) return;
    e.preventDefault();
    const d = summary.parentElement;
    const opening = !d.open || d.classList.contains('is-closing');
    const anims = [];
    if (opening) {
      const list = d.parentElement.closest('.accordion, #faq-list') || d.parentElement;
      const others = $$('.acc-item[open]', list).filter(o => o !== d && !o.classList.contains('is-closing'));
      others.forEach(o => anims.push(setAccOpen(o, false)));
    }
    anims.push(setAccOpen(d, opening));
    if (opening) DMPA.analytics?.track('faq_open', summary.textContent);
    holdInPlace(summary, anims.filter(Boolean));
  });

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
