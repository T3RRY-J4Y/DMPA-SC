/* FAQ page: renders js/data/faq-data.js with topic nav, search and expand/collapse. */
(() => {
  const { $, $$, esc } = DMPA.util;
  const data = window.DMPA_FAQ;
  if (!data) { $('#faq-count').textContent = 'The FAQs could not be loaded.'; return; }

  const TONES = ['tone-purple', 'tone-green', 'tone-pink', 'tone-yellow', 'tone-orange', 'tone-indigo', 'tone-lilac'];
  const FACT_TONES = ['tone-indigo', 'tone-yellow', 'tone-pink', 'tone-green', 'tone-orange', 'tone-lilac'];
  const anchor = s => 'topic-' + s.n;
  const tone = i => TONES[i % TONES.length];
  const total = data.sections.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.items.length, 0), 0);

  /* Quick facts */
  $('#quick-facts-list').innerHTML = data.quickFacts.map((f, i) =>
    `<div class="quick-fact ${FACT_TONES[i % FACT_TONES.length]}"><span class="quick-fact__topic">${esc(f.topic)}</span><span class="quick-fact__answer">${esc(f.answer)}</span></div>`).join('');

  /* Topic nav */
  $('#topic-nav').innerHTML = data.sections.map((s, i) => {
    const count = s.groups.reduce((n, g) => n + g.items.length, 0);
    return `<a class="topic-link ${tone(i)}" href="#${anchor(s)}"><span class="topic-num">${esc(s.n)}</span><span class="topic-link__title">${esc(s.title)}</span><span class="topic-link__count" data-count="${esc(s.n)}">${count}</span></a>`;
  }).join('');

  /* Questions */
  const block = b => b.type === 'ul'
    ? `<ul>${b.items.map(li => `<li><span>${li.lead ? `<strong>${esc(li.lead)}</strong> ` : ''}${esc(li.text)}</span></li>`).join('')}</ul>`
    : `<p>${esc(b.text)}</p>`;
  const searchText = it => (it.q + ' ' + it.blocks.map(b => b.type === 'p' ? b.text : b.items.map(i => `${i.lead || ''} ${i.text}`).join(' ')).join(' ')).toLowerCase();

  $('#faq-list').innerHTML = data.sections.map((s, si) => `
    <div class="faq-topic ${tone(si)}" id="${anchor(s)}">
      <div class="faq-topic__head"><span class="topic-num topic-num--lg">${esc(s.n)}</span><h2 class="faq-topic__title">${esc(s.title)}</h2></div>
      ${s.groups.map(g => `
        <div class="faq-group">
          <h3 class="faq-group__title">${esc(g.title)}</h3>
          ${g.items.map(it => `<details class="acc-item" data-search="${esc(searchText(it))}"><summary>${esc(it.q)}</summary><div class="acc-item__body">${it.blocks.map(block).join('')}</div></details>`).join('')}
        </div>`).join('')}
    </div>`).join('');

  if (data.disclaimer) $('#faq-disclaimer').textContent = data.disclaimer;

  const items = $$('#faq-list details');
  const topics = $$('.faq-topic');
  const groups = $$('.faq-group');
  const toggleAll = $('#toggle-all');
  const countEl = $('#faq-count');
  const search = $('#faq-search');
  const empty = $('#faq-empty');
  items[0].open = true;

  /* Expand / collapse all */
  const visible = () => items.filter(d => !d.hidden);
  const syncToggle = () => { toggleAll.textContent = visible().every(d => d.open) ? 'Collapse all' : 'Expand all'; };
  toggleAll.addEventListener('click', () => {
    const open = !visible().every(d => d.open);
    visible().forEach(d => { d.open = open; });
    syncToggle();
  });
  items.forEach(d => d.addEventListener('toggle', syncToggle));

  /* Search */
  let opened = null; // open-state snapshot taken when a search starts
  function applySearch() {
    const q = search.value.trim().toLowerCase();
    const searching = q.length > 1;
    if (searching && !opened) opened = items.map(d => d.open);
    if (!searching && opened) { items.forEach((d, i) => { d.open = opened[i]; }); opened = null; }

    let shown = 0;
    items.forEach(d => {
      const match = !searching || d.dataset.search.includes(q);
      d.hidden = !match;
      if (searching && match) d.open = true;
      if (match) shown++;
    });
    groups.forEach(g => { g.hidden = !$$('details', g).some(d => !d.hidden); });
    topics.forEach((t, i) => {
      const n = $$('details', t).filter(d => !d.hidden).length;
      t.hidden = n === 0;
      $(`[data-count="${data.sections[i].n}"]`).textContent = n;
    });

    $('#quick-facts').hidden = searching;
    empty.hidden = !(searching && shown === 0);
    $('[data-query]', empty).textContent = search.value.trim();
    countEl.textContent = searching
      ? `${shown} ${shown === 1 ? 'answer' : 'answers'} for “${search.value.trim()}”`
      : `${total} questions in ${data.sections.length} topics`;
    syncToggle();
  }
  search.addEventListener('input', applySearch);
  $('#faq-clear').addEventListener('click', () => { search.value = ''; applySearch(); search.focus(); });

  /* Support links like faqs.html?q=late */
  const initial = new URLSearchParams(location.search).get('q');
  if (initial) search.value = initial;
  applySearch();

  /* Opening a deep link (#topic-3) scrolls to it once content exists */
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();

  /* Highlight the topic currently in view */
  const links = $$('.topic-link');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-120px 0px -60% 0px' });
  topics.forEach(t => io.observe(t));
})();
