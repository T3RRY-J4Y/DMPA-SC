/* Home page: MAPS step tabs, next-date calculator, method filter, downloads. */
(() => {
  const { $, $$, esc } = DMPA.util;

  /* ---- MAPS step tabs -------------------------------------------------- */
  const tabs = $$('.step-tab');
  const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const stepNum = $('[data-step-num]');

  function selectStep(i, focus = false) {
    tabs.forEach((tab, j) => {
      const on = i === j;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    stepNum.textContent = i + 1;
    if (focus) tabs[i].focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectStep(i));
    tab.addEventListener('keydown', e => {
      const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (move) { e.preventDefault(); selectStep((i + move + tabs.length) % tabs.length, true); }
      if (e.key === 'Home') { e.preventDefault(); selectStep(0, true); }
      if (e.key === 'End') { e.preventDefault(); selectStep(tabs.length - 1, true); }
    });
  });
  panels.forEach((panel, i) => {
    $('[data-step-prev]', panel).disabled = i === 0;
    $('[data-step-prev]', panel).addEventListener('click', () => selectStep(i - 1, true));
    $('[data-step-next]', panel).addEventListener('click', () => selectStep((i + 1) % panels.length, true));
  });
  selectStep(0);

  // 3D renders replace the step illustrations once the section is near the
  // viewport. If WebGL or the CDN isn't available the SVGs simply stay.
  const maps = $('#maps');
  if (maps && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();
      const arts = $$('.step-art', maps);
      arts.forEach(a => a.classList.add('step-art--loading'));
      import('./maps-3d.js')
        .catch(err => console.warn('MAPS 3D unavailable:', err))
        .finally(() => arts.forEach(a => a.classList.remove('step-art--loading')));
    }, { rootMargin: '300px' });
    io.observe(maps);
  }

  /* ---- Next-date calculator -------------------------------------------- */
  // Due date is 3 calendar months after the last injection. The window runs
  // from 2 weeks before to 4 weeks after the due date (NDOH SOP, Sept 2026).
  const EARLY_DAYS = 14;
  const LATE_DAYS = 28;
  const DAY = 864e5;
  const input = $('#last-date');
  const out = Object.fromEntries($$('[data-calc]').map(el => [el.dataset.calc, el]));
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmt = d => d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = d => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  function addMonths(d, months) {
    const day = d.getDate();
    const r = new Date(d.getFullYear(), d.getMonth() + months, 1, 12);
    const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(day, lastDay));
    return r;
  }

  function schedule() {
    if (!input.value) return null;
    const last = new Date(input.value + 'T12:00:00');
    if (isNaN(last)) return null;
    const due = addMonths(last, 3);
    return { due, earliest: addDays(due, -EARLY_DAYS), latest: addDays(due, LATE_DAYS) };
  }

  function countdown({ due, latest }) {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const toDue = Math.round((due - today) / DAY);
    const toLatest = Math.round((latest - today) / DAY);
    if (toDue > 1) return [`That's in ${toDue} days.`, false];
    if (toDue === 1) return ['That’s tomorrow!', false];
    if (toDue === 0) return ['That’s today!', false];
    if (toLatest >= 0) return [`${plural(-toDue, 'day')} late, but still within your window. Inject as soon as you can.`, true];
    return ['Your window has closed. Don’t inject: use condoms and contact your clinic.', true];
  }

  function renderCalc() {
    const s = schedule();
    out.ics.disabled = !s;
    if (!s) {
      out.due.textContent = 'Pick a date';
      out.countdown.textContent = out.earliest.textContent = out.latest.textContent = '–';
      return;
    }
    const [text, late] = countdown(s);
    out.due.textContent = fmt(s.due);
    out.countdown.textContent = text;
    out.countdown.classList.toggle('is-late', late);
    out.earliest.textContent = fmtShort(s.earliest);
    out.latest.textContent = fmtShort(s.latest);
  }

  function downloadIcs() {
    const s = schedule();
    if (!s) return;
    const ymd = iso(s.due).replace(/-/g, '');
    const wa = DMPA.config.whatsapp.display;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DMPA self-inject//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${ymd}-${Date.now()}@dmpa-selfinject`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART;VALUE=DATE:${ymd}`,
      'SUMMARY:DMPA-SC injection day',
      `DESCRIPTION:Time for your DMPA-SC self-injection. You can inject up to 4 weeks after today. Questions? WhatsApp ${wa}`,
      'BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY', 'DESCRIPTION:DMPA-SC injection in 3 days', 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:PT9H', 'ACTION:DISPLAY', 'DESCRIPTION:DMPA-SC injection today', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'dmpa-next-injection.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  input.value = iso(new Date());
  input.max = iso(new Date());
  input.addEventListener('input', renderCalc);
  out.ics.addEventListener('click', downloadIcs);
  renderCalc();

  /* ---- Method filter --------------------------------------------------- */
  const chips = $$('#compare [data-filter]');
  const methods = $$('#methods .method');
  chips.forEach(chip => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    methods.forEach(m => { m.hidden = f !== 'All' && m.dataset.cat !== f; });
  }));

  /* ---- Downloads (first 3 resources for women) ------------------------- */
  const list = $('#downloads-list');
  const card = r => {
    const kicker = [r.type, r.details].filter(Boolean).join(' · ');
    const cover = r.thumbUrl
      ? `<img class="resource__thumb" src="${esc(r.thumbUrl)}" alt="Cover of ${esc(r.title)}" loading="lazy">`
      : `<div class="resource__cover"><span class="resource__cover-type">${esc(r.type)}</span><span class="resource__cover-title">${esc(r.title)}</span></div>`;
    const action = DMPA.resources.hasFile(r)
      ? `<a class="btn btn--outline self-start" href="${esc(r.fileUrl)}" target="_blank" rel="noopener" download>Download ${esc(r.format || '')}</a>`
      : '<span class="btn btn--placeholder self-start" aria-disabled="true">Coming soon</span>';
    return `<article class="resource resource--plain ${DMPA.resources.toneFor(r)}">${cover}
      <div class="resource__body"><span class="eyebrow" style="color:var(--tone-ink)">${esc(kicker)}</span>
      <h3 class="resource__title">${esc(r.title)}</h3><p class="resource__desc">${esc(r.description)}</p></div>${action}</article>`;
  };
  list.setAttribute('aria-busy', 'true');
  list.innerHTML = DMPA.util.skeleton(3);
  DMPA.resources.load()
    .finally(() => list.setAttribute('aria-busy', 'false'))
    .then(({ items }) => { list.innerHTML = items.filter(r => r.audience === 'For women').slice(0, 3).map(card).join(''); })
    .catch(err => {
      console.error('Downloads failed to load', err);
      list.innerHTML = '<p class="text-muted">Downloads are unavailable right now. <a href="resources.html">Try the resources page</a>.</p>';
    });
})();
