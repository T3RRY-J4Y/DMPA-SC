/* Analytics view. Loads the anonymous events written by js/analytics.js for
   the chosen period (plus the period before it, for the change figures) and
   counts them in the browser. */
import { F, db, RESOURCES } from './firebase.js';
import { $, $$, esc, num, pct, toast, explain } from './ui.js';

const DAY = 864e5;
const OPT_OUT_KEY = 'dmpa-notrack';

const PAGES = { home: 'Home', faqs: 'FAQs', resources: 'Resources', privacy: 'Privacy policy', terms: 'Terms of use' };
const METHODS = {
  sc: 'DMPA-SC self-injection', scp: 'DMPA-SC by a provider', im: 'Other injections', implant: 'Implant',
  hiud: 'Hormonal IUD', cuiud: 'Copper IUD', pill: 'Oral pills', condom: 'Condoms', steril: 'Sterilisation / vasectomy',
  none: 'No clear match',
};

/* The figures shown in the tiles and the daily chart. */
const METRICS = {
  visits: { label: 'Visits', hint: 'First page of each browser session', test: e => e.type === 'page_view' && e.first },
  views: { label: 'Page views', test: e => e.type === 'page_view' },
  downloads: { label: 'Downloads', hint: 'Taps on the download button in a resource’s preview', test: e => e.type === 'resource_download' },
  quiz: { label: 'Quiz completions', test: e => e.type === 'quiz_complete' },
  whatsapp: { label: 'WhatsApp taps', test: e => e.type === 'whatsapp_click' },
  reminders: { label: 'Reminders saved', hint: 'Next injection date added to a calendar', test: e => e.type === 'reminder_save' },
};

const state = { days: 30, metric: 'visits', cur: [], prev: [], start: null, titles: {}, loaded: false };
const view = $('[data-view="analytics"]');
let wired = false;

export function open() {
  if (!wired) wire();
  if (!state.loaded) load();
}

function wire() {
  wired = true;
  $('[data-range]', view).addEventListener('click', e => {
    const chip = e.target.closest('[data-days]');
    if (!chip || Number(chip.dataset.days) === state.days) return;
    state.days = Number(chip.dataset.days);
    $$('[data-days]', view).forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    load();
  });
  $('[data-metric]', view).addEventListener('click', e => {
    const chip = e.target.closest('[data-key]');
    if (!chip) return;
    state.metric = chip.dataset.key;
    renderChart();
  });
  $('[data-refresh]', view).addEventListener('click', load);
  $('[data-export]', view).addEventListener('click', exportCsv);

  const optOut = $('[data-opt-out]', view);
  try { optOut.checked = localStorage.getItem(OPT_OUT_KEY) === '1'; } catch { optOut.disabled = true; }
  optOut.addEventListener('change', () => {
    try {
      if (optOut.checked) localStorage.setItem(OPT_OUT_KEY, '1'); else localStorage.removeItem(OPT_OUT_KEY);
      toast(optOut.checked ? 'Your visits on this browser won’t be counted.' : 'Your visits on this browser will be counted again.');
    } catch { toast('This browser is blocking site storage, so the setting can’t be saved.', 'error'); }
  });

  new ResizeObserver(() => state.loaded && renderChart()).observe($('[data-chart]', view));
}

async function load() {
  const body = $('[data-analytics-body]', view);
  const status = $('[data-status]', view);
  body.setAttribute('aria-busy', 'true');
  status.textContent = 'Loading…';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  state.start = new Date(today.getTime() - (state.days - 1) * DAY);
  const prevStart = new Date(state.start.getTime() - state.days * DAY);
  try {
    const [events, resources] = await Promise.all([
      F.getDocs(F.query(F.collection(db, 'events'), F.where('ts', '>=', F.Timestamp.fromDate(prevStart)), F.orderBy('ts'))),
      F.getDocs(F.collection(db, RESOURCES)),
    ]);
    state.titles = Object.fromEntries(resources.docs.map(d => [d.id, d.data().title || d.id]));
    const all = events.docs.map(d => { const e = d.data(); return { ...e, ts: e.ts.toDate() }; });
    state.cur = all.filter(e => e.ts >= state.start);
    state.prev = all.filter(e => e.ts < state.start);
    state.loaded = true;
    status.textContent = `${num(all.length)} events loaded · updated ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
    render();
  } catch (err) {
    console.error(err);
    status.textContent = '';
    toast(`Analytics didn’t load. ${explain(err)}`, 'error');
  } finally {
    body.setAttribute('aria-busy', 'false');
  }
}

const count = (events, test) => events.reduce((n, e) => n + (test(e) ? 1 : 0), 0);
function tally(events, keyOf) {
  const m = new Map();
  events.forEach(e => { const k = keyOf(e); if (k != null) m.set(k, (m.get(k) || 0) + 1); });
  return [...m].sort((a, b) => b[1] - a[1]);
}

function render() {
  renderTiles();
  renderChart();
  renderPanels();
  $('[data-empty]', view).hidden = state.cur.length > 0;
}

/* ---- Stat tiles -------------------------------------------------------- */
function delta(now, before) {
  if (!before && !now) return '<span class="stat__delta">No change</span>';
  if (!before) return '<span class="stat__delta">New this period</span>';
  const change = Math.round(((now - before) / before) * 100);
  const dir = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const arrow = { up: '▲', down: '▼', flat: '■' }[dir];
  return `<span class="stat__delta stat__delta--${dir}"><span aria-hidden="true">${arrow}</span> ${change > 0 ? '+' : ''}${change}% <span class="stat__vs">vs previous ${state.days} days</span></span>`;
}

function renderTiles() {
  $('[data-tiles]', view).innerHTML = Object.entries(METRICS).map(([key, m]) => {
    const now = count(state.cur, m.test);
    return `<div class="stat"${m.hint ? ` title="${esc(m.hint)}"` : ''}>
      <span class="stat__label">${esc(m.label)}</span>
      <span class="stat__value">${num(now)}</span>
      ${delta(now, count(state.prev, m.test))}
    </div>`;
  }).join('');
}

/* ---- Daily column chart ------------------------------------------------- */
function daily(test) {
  const days = Array.from({ length: state.days }, (_, i) => ({ date: new Date(state.start.getTime() + i * DAY), value: 0 }));
  state.cur.forEach(e => {
    if (!test(e)) return;
    const i = Math.floor((new Date(e.ts).setHours(0, 0, 0, 0) - state.start) / DAY);
    if (days[i]) days[i].value++;
  });
  return days;
}

/* Four whole-number steps that clear the tallest bar: 0/1/2/3/4, 0/5/10/15/20 … */
function tickStep(max) {
  const raw = Math.max(max, 4) / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map(m => m * p).find(m => m >= raw);
}

const dayFmt = d => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
const dayLong = d => d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long' });

function renderChart() {
  const metric = METRICS[state.metric];
  $$('[data-key]', view).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.key === state.metric)));
  $('[data-chart-title]', view).textContent = `${metric.label} per day`;
  const data = daily(metric.test);
  const box = $('[data-chart]', view);
  const W = Math.max(box.clientWidth, 280), H = 240;
  const pad = { t: 12, r: 8, b: 28, l: 36 };
  const step = tickStep(Math.max(...data.map(d => d.value)));
  const max = step * 4;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const slot = iw / data.length;
  const bw = Math.max(2, Math.min(24, slot - 2));
  const y = v => pad.t + ih - (v / max) * ih;
  const ticks = [0, 1, 2, 3, 4].map(n => n * step);
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 64)));

  const bars = data.map((d, i) => {
    const x = pad.l + i * slot + (slot - bw) / 2;
    const h = (d.value / max) * ih;
    const r = Math.min(4, bw / 2, h);
    const base = pad.t + ih;
    const bar = h > 0
      ? `<path class="chart__bar" d="M${x},${base}V${base - h + r}q0,-${r} ${r},-${r}h${bw - 2 * r}q${r},0 ${r},${r}V${base}z"/>`
      : '';
    const label = i % every === 0 ? `<text class="chart__x" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(dayFmt(d.date))}</text>` : '';
    return `${bar}${label}<rect class="chart__hit" x="${pad.l + i * slot}" y="${pad.t}" width="${slot}" height="${ih}" data-i="${i}"/>`;
  }).join('');

  const grid = ticks.map(t => `<line class="chart__grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/>
    <text class="chart__y" x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end">${num(t)}</text>`).join('');

  box.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(metric.label)} per day, last ${state.days} days. Total ${num(data.reduce((n, d) => n + d.value, 0))}.">${grid}${bars}</svg>
    <div class="chart__tip" hidden></div>`;

  const tip = $('.chart__tip', box);
  box.onpointermove = e => {
    const hit = e.target.closest('.chart__hit');
    $$('.chart__hit.is-on', box).forEach(h => h.classList.remove('is-on'));
    if (!hit) { tip.hidden = true; return; }
    hit.classList.add('is-on');
    const d = data[hit.dataset.i];
    tip.innerHTML = `<b>${num(d.value)}</b> ${esc(metric.label.toLowerCase())}<br><span>${esc(dayLong(d.date))}</span>`;
    tip.hidden = false;
    const bx = box.getBoundingClientRect();
    const left = Math.min(Math.max(e.clientX - bx.left, 70), bx.width - 70);
    tip.style.left = `${left}px`;
    tip.style.top = `${y(d.value) - 8}px`;
  };
  box.onpointerleave = () => { tip.hidden = true; $$('.chart__hit.is-on', box).forEach(h => h.classList.remove('is-on')); };

  $('[data-chart-table]', view).innerHTML = `<table class="admin-table admin-table--compact"><thead><tr><th scope="col">Day</th><th scope="col" class="num">${esc(metric.label)}</th></tr></thead>
    <tbody>${data.slice().reverse().map(d => `<tr><td>${esc(dayLong(d.date))}</td><td class="num">${num(d.value)}</td></tr>`).join('')}</tbody></table>`;
}

/* ---- Breakdown panels ---------------------------------------------------- */
function barList(rows, { limit = 8, empty = 'Nothing yet for this period.', unit = '' } = {}) {
  if (!rows.length) return `<p class="panel__empty">${esc(empty)}</p>`;
  const max = Math.max(...rows.map(r => r[1]));
  const shown = rows.slice(0, limit);
  const rest = rows.slice(limit).reduce((n, r) => n + r[1], 0);
  if (rest) shown.push(['Other', rest]);
  return `<ol class="barlist">${shown.map(([label, value]) => `<li title="${esc(label)}: ${num(value)}${unit}">
      <span class="barlist__label">${esc(label)}</span>
      <span class="barlist__value">${num(value)}</span>
      <span class="barlist__track"><span class="barlist__bar" style="width:${Math.max(1, (value / max) * 100)}%"></span></span>
    </li>`).join('')}</ol>`;
}

function renderPanels() {
  const ev = type => state.cur.filter(e => e.type === type);
  const title = id => state.titles[id] || id;

  $('[data-panel="pages"]', view).innerHTML = barList(tally(ev('page_view'), e => PAGES[e.page] || e.page));

  const visits = ev('page_view').filter(e => e.first);
  $('[data-panel="sources"]', view).innerHTML = barList(tally(visits, e => e.item || 'Direct or unknown'));
  $('[data-panel="devices"]', view).innerHTML = barList(tally(visits, e => (e.device === 'mobile' ? 'Phone or tablet' : 'Computer')));

  // Every resource in the library is listed, so ones nobody opens stand out.
  const per = type => new Map(tally(ev(type), e => e.item));
  const seen = per('resource_view'), opened = per('resource_preview'), dls = per('resource_download'), shares = per('resource_share');
  const ids = [...new Set([...Object.keys(state.titles), ...seen.keys(), ...opened.keys(), ...dls.keys()])];
  const rows = ids.map(id => ({ id, v: seen.get(id) || 0, o: opened.get(id) || 0, d: dls.get(id) || 0, s: shares.get(id) || 0 }))
    .sort((a, b) => b.d - a.d || b.o - a.o || b.v - a.v);
  $('[data-panel="resources"]', view).innerHTML = rows.length
    ? `<table class="admin-table"><thead><tr><th scope="col">Resource</th><th scope="col" class="num">Seen</th><th scope="col" class="num">Opened</th><th scope="col" class="num">Downloads</th><th scope="col" class="num">Download rate</th><th scope="col" class="num">Shares</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${esc(title(r.id))}</td><td class="num">${num(r.v)}</td><td class="num">${num(r.o)}</td><td class="num">${num(r.d)}</td><td class="num">${pct(r.d, r.o)}</td><td class="num">${num(r.s)}</td></tr>`).join('')}</tbody></table>`
    : '<p class="panel__empty">No resources yet.</p>';

  const started = ev('quiz_start').length, done = ev('quiz_complete');
  $('[data-panel="quiz"]', view).innerHTML = `<dl class="mini-stats">
      <div><dt>Started</dt><dd>${num(started)}</dd></div>
      <div><dt>Finished</dt><dd>${num(done.length)}</dd></div>
      <div><dt>Finish rate</dt><dd>${pct(done.length, started)}</dd></div>
    </dl>
    <h4 class="panel__sub">Top match</h4>
    ${barList(tally(done, e => METHODS[e.item] || e.item), { limit: 10, empty: 'Nobody has finished the quiz in this period.' })}`;

  $('[data-panel="faqs"]', view).innerHTML = barList(tally(ev('faq_open'), e => e.item), { limit: 10 });
  $('[data-panel="whatsapp"]', view).innerHTML = barList(tally(ev('whatsapp_click'), e => e.item || 'page'));
  $('[data-panel="reminders"]', view).innerHTML = barList(tally(ev('reminder_save'), e => e.item));
}

/* ---- CSV export ---------------------------------------------------------- */
function exportCsv() {
  if (!state.loaded) return;
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['time', 'type', 'page', 'item', 'device', 'first_page_of_visit'].join(',')]
    .concat(state.cur.map(e => [e.ts.toISOString(), e.type, e.page, e.item, e.device, e.first ? 'yes' : ''].map(cell).join(',')));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv' }));
  a.download = `dmpa-events-last-${state.days}-days.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
