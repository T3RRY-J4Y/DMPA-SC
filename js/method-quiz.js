/* Home page: "Find your method" quiz for the compare section.
   Scores each method card in #methods from the answers and shows the top
   matches with the reasons behind them. It's a guide only; every screen
   points people to a provider. */
(() => {
  const { $, $$, esc } = DMPA.util;
  const dialog = $('#method-quiz');
  const cta = $('.quiz-cta');
  if (!dialog || !cta || typeof dialog.showModal !== 'function') return;
  cta.hidden = false;

  const ICONS = {
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    sprout: '<path d="M7 20h10M12 20v-8"/><path d="M12 12C12 8 9 6 4 6c0 4 3 6 8 6z"/><path d="M12 10c0-3.5 2.5-6 8-6 0 4-3 6-8 6z"/>',
    infinity: '<path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4z"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    clinic: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 7v6M9 10h6M10 21v-3h4v3"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><path d="m8.5 8.5 7 7"/>',
    bellOff: '<path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7M10.3 21a1.94 1.94 0 0 0 3.4 0M2 2l20 20"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    syringe: '<path d="m18 2 4 4M17 7l3-3M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5M9 11l4 4M5 19l-3 3M14 4l6 6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    sparkle: '<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z"/><path d="M19 17v4M17 19h4"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  const HORMONAL = ['sc', 'scp', 'im', 'implant', 'hiud', 'pill'];
  const each = (ids, n) => Object.fromEntries(ids.map(id => [id, n]));

  // Each option adds its points to the methods it names, and its `why` is
  // listed under any method it counted in favour of (an object gives
  // per-method wording, with `default` for the rest). The emergency pill is
  // never ranked; it's flagged on its own when the first answer is "yes".
  const QUESTIONS = [
    { id: 'urgent', tone: 'purple', text: 'Have you had sex without protection in the last 5 days?',
      options: [
        { label: 'Yes', icon: 'zap', flag: 'urgent' },
        { label: 'No', icon: 'check' },
      ] },
    { id: 'length', tone: 'pink', text: 'How long do you want to prevent pregnancy?',
      options: [
        { label: 'Less than a year', icon: 'clock', why: 'Easy to stop when you’re ready',
          score: { sc: 2, scp: 2, im: 2, pill: 2, condom: 2, implant: -1, hiud: -2, cuiud: -2 } },
        { label: '1 to 3 years', icon: 'calendar', why: 'Fits your 1 to 3 year plan',
          score: { sc: 2, scp: 2, im: 1, implant: 2, pill: 1, condom: 1 } },
        { label: 'More than 3 years', hint: 'but I may want children later', icon: 'sprout',
          why: { default: 'Lasts for years, and can be removed when you want a baby', sc: 'Keep going for as long as you like, and stop when you want a baby' },
          score: { implant: 3, hiud: 3, cuiud: 3, sc: 1 } },
        { label: 'I don’t want any (more) children', icon: 'infinity', why: 'Permanent or very long-lasting protection',
          score: { steril: 5, hiud: 2, cuiud: 2, implant: 2 }, flag: 'permanent' },
      ] },
    { id: 'clinic', tone: 'orange', text: 'How do you feel about going to the clinic?',
      options: [
        { label: 'As few visits as possible', icon: 'home', why: 'Fewer trips to the clinic',
          score: { sc: 2, implant: 2, hiud: 2, cuiud: 2, steril: 2, condom: 1, scp: -1, im: -1 } },
        { label: 'Every few months is fine', icon: 'clinic', why: 'A nurse gives it to you at the clinic',
          score: { scp: 1, im: 1 } },
        { label: 'It doesn’t matter to me', icon: 'smile' },
      ] },
    { id: 'daily', tone: 'green', text: 'Could you take a pill at the same time every day?',
      options: [
        { label: 'Yes, I’d remember', icon: 'pill', why: 'You’re happy with a daily routine', score: { pill: 2 } },
        { label: 'No, I’d probably forget', icon: 'bellOff', score: { pill: -4 } },
      ] },
    { id: 'hormones', tone: 'indigo', text: 'How do you feel about methods with hormones?',
      options: [
        { label: 'That’s fine', icon: 'heart' },
        { label: 'I’d prefer no hormones', icon: 'leaf', why: 'No hormones',
          score: { ...each(HORMONAL, -5), cuiud: 3, condom: 2, steril: 1 } },
        { label: 'I’m not sure', icon: 'question' },
      ] },
    { id: 'sti', tone: 'yellow', text: 'Do you also want protection from HIV and STIs?',
      options: [
        { label: 'Yes', icon: 'shield', why: 'Also protects against HIV and STIs', score: { condom: 3 }, flag: 'sti' },
        { label: 'No', icon: 'x' },
      ] },
    { id: 'inject', tone: 'lilac', text: 'Would you give yourself a small injection every 3 months?',
      hint: 'A nurse shows you how first. The needle is short and goes just under the skin.',
      options: [
        { label: 'Yes', icon: 'syringe', why: 'You’re comfortable injecting at home', score: { sc: 3 } },
        { label: 'No', icon: 'x', why: 'A provider does the injection for you', score: { sc: -3, scp: 1 } },
        { label: 'Maybe', hint: 'I’d like to learn more', icon: 'question', why: 'You can learn to self-inject at your clinic', score: { sc: 1 } },
      ] },
  ];

  const panel = $('[data-quiz-panel]', dialog);
  const cards = Object.fromEntries($$('#methods .method').map(m => [m.dataset.method, m]));
  const waUrl = DMPA.config?.whatsapp?.url || 'https://wa.me/27781680192';
  let answers = [], at = 0, advancing = null;

  const fact = (m, label) => {
    const dt = $$('dt', m).find(d => d.textContent === label);
    return dt ? dt.nextElementSibling.textContent : '';
  };
  const method = id => {
    const m = cards[id];
    return { id, name: $('.method__name', m).textContent, eff: $('.method__eff', m).textContent,
             lasts: fact(m, 'Lasts'), clinic: fact(m, 'Clinic'), note: $('.method__note', m).textContent };
  };
  const closeBtn = '<button class="quiz__close" type="button" data-quiz-close aria-label="Close quiz">' + icon('x') + '</button>';
  const blobs = '<span class="quiz__blob quiz__blob--a" aria-hidden="true"></span><span class="quiz__blob quiz__blob--b" aria-hidden="true"></span>';
  const disclaimer = '<p class="quiz__disclaimer">This quiz is a guide, not medical advice. A nurse or doctor at your clinic can help you choose, and can check which methods are safe for your health.</p>';

  function render(html, tone, focusSel) {
    clearTimeout(advancing);
    panel.className = `quiz__panel tone-${tone}`;
    panel.innerHTML = html;
    dialog.scrollTop = 0;
    $('[data-quiz-close]', panel).addEventListener('click', () => dialog.close());
    $(focusSel, panel)?.focus();
  }

  function renderIntro() {
    render(`<header class="quiz__band">${blobs}
        <div class="quiz__band-top"><p class="quiz__eyebrow">Method quiz</p>${closeBtn}</div>
        <h2 class="quiz__title" id="quiz-heading" tabindex="-1">Find your <span class="script">perfect</span> match</h2>
        <p class="quiz__sub">Every body is different. Answer a few questions to see which methods fit your life.</p>
      </header>
      <div class="quiz__body">
        <ul class="quiz__perks">
          <li>${icon('clock')}<span><b>About 1 minute</b>Up to 7 quick questions</span></li>
          <li>${icon('lock')}<span><b>Private</b>Your answers stay on your phone</span></li>
          <li>${icon('heart')}<span><b>Made for you</b>See why each method fits</span></li>
        </ul>
        <button class="btn btn--primary btn--lg btn--block" type="button" data-quiz-start>Start the quiz</button>
        ${disclaimer}
      </div>`, 'purple', '[data-quiz-start]');
    $('[data-quiz-start]', panel).addEventListener('click', () => { answers = []; at = 0; renderQuestion(); DMPA.analytics?.track('quiz_start'); });
  }

  function renderQuestion() {
    const q = QUESTIONS[at];
    const steps = QUESTIONS.map((_, i) => `<span class="${i < at ? 'is-done' : i === at ? 'is-now' : ''}"></span>`).join('');
    render(`<header class="quiz__band">${blobs}
        <div class="quiz__band-top">
          <div class="quiz__steps" role="progressbar" aria-label="Quiz progress" aria-valuemin="1" aria-valuemax="${QUESTIONS.length}" aria-valuenow="${at + 1}">${steps}</div>
          ${closeBtn}
        </div>
        <p class="quiz__eyebrow">Question ${at + 1} of ${QUESTIONS.length}</p>
        <h2 class="quiz__title quiz__title--q" id="quiz-heading" tabindex="-1">${esc(q.text)}</h2>
        ${q.hint ? `<p class="quiz__sub">${esc(q.hint)}</p>` : ''}
      </header>
      <div class="quiz__body">
        <div class="quiz__opts${q.options.length === 2 ? ' quiz__opts--pair' : ''}" role="group" aria-labelledby="quiz-heading">
          ${q.options.map((o, i) => `<button class="quiz__opt" type="button" data-opt="${i}" aria-pressed="${answers[at] === i}">
            <span class="quiz__opt-icon">${icon(o.icon)}</span>
            <span class="quiz__opt-text"><b>${esc(o.label)}</b>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</span>
            <span class="quiz__opt-tick">${icon('check')}</span>
          </button>`).join('')}
        </div>
        ${at > 0 || answers[at] !== undefined ? `<div class="quiz__foot">
          ${at > 0 ? `<button class="quiz__back" type="button" data-quiz-back>${icon('back')} Back</button>` : '<span></span>'}
          ${answers[at] !== undefined ? '<button class="btn btn--primary btn--sm" type="button" data-quiz-next>Next</button>' : ''}
        </div>` : ''}
        ${disclaimer}
      </div>`, q.tone, answers[at] !== undefined ? '[aria-pressed="true"]' : '#quiz-heading');

    $$('[data-opt]', panel).forEach(btn => btn.addEventListener('click', () => {
      answers[at] = Number(btn.dataset.opt);
      $$('[data-opt]', panel).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      clearTimeout(advancing);
      advancing = setTimeout(advance, 320);   // long enough to see the choice land
    }));
    $('[data-quiz-back]', panel)?.addEventListener('click', () => { at--; renderQuestion(); });
    $('[data-quiz-next]', panel)?.addEventListener('click', advance);
  }

  function advance() {
    if (at < QUESTIONS.length - 1) { at++; renderQuestion(); } else renderResults();
  }

  function results() {
    const picked = answers.map((a, i) => QUESTIONS[i].options[a]);
    const flags = new Set(picked.map(o => o.flag).filter(Boolean));
    const score = Object.fromEntries(Object.keys(cards).map(id => [id, 0]));
    const whys = Object.fromEntries(Object.keys(cards).map(id => [id, []]));
    picked.forEach(o => Object.entries(o.score || {}).forEach(([id, n]) => {
      score[id] += n;
      const why = typeof o.why === 'object' ? o.why[id] ?? o.why.default : o.why;
      if (n > 0 && why) whys[id].push(why);
    }));
    // Card order breaks ties; sterilisation only shows for "no more children".
    const ranked = Object.keys(score)
      .filter(id => id !== 'ec' && (id !== 'steril' || flags.has('permanent')) && score[id] > 0)
      .sort((a, b) => score[b] - score[a])
      .slice(0, 3);
    return { ranked, flags, whys };
  }

  function renderResults() {
    const { ranked, flags, whys } = results();
    // Only the top match is counted, never the answers that led to it.
    DMPA.analytics?.track('quiz_complete', ranked[0] || 'none');
    const notes = [];
    if (flags.has('urgent')) notes.push(`<div class="quiz__note quiz__note--urgent">${icon('zap')}<p><b>Act soon.</b> The emergency pill works best the sooner you take it, within 5 days of unprotected sex. Get it free at your clinic. It isn’t for regular use, so also choose an ongoing method.</p></div>`);
    if (flags.has('sti')) notes.push(`<div class="quiz__note">${icon('shield')}<p>Condoms are the only method that also protects against HIV and STIs. ${ranked[0] === 'condom' ? 'You can use them on their own or together with another method.' : 'Use them together with your main method.'}</p></div>`);

    const top = ranked.length ? method(ranked[0]) : null;
    const msg = top ? `Hi Sister Unathi! I took the method quiz on the DMPA self-inject website and my top match was ${top.name}. Can I ask a few questions?`
                    : 'Hi Sister Unathi! I took the method quiz on the DMPA self-inject website and I’d like help choosing a method.';
    const wa = `${waUrl}?text=${encodeURIComponent(msg)}`;

    const band = top
      ? `<header class="quiz__band quiz__band--result">${blobs}
          <div class="quiz__band-top"><p class="quiz__eyebrow">${icon('sparkle')} Your top match</p>${closeBtn}</div>
          <h2 class="quiz__title" id="quiz-heading" tabindex="-1">${esc(top.name)}</h2>
          <div class="quiz__facts">
            <span class="quiz__eff"><b>${esc(top.eff)}</b> effective</span>
            <span>Lasts ${esc(top.lasts.toLowerCase())}</span>
            <span>Clinic ${esc(top.clinic.toLowerCase())}</span>
          </div>
        </header>`
      : `<header class="quiz__band">${blobs}
          <div class="quiz__band-top"><p class="quiz__eyebrow">Your results</p>${closeBtn}</div>
          <h2 class="quiz__title" id="quiz-heading" tabindex="-1">Let’s talk it <span class="script">through</span></h2>
          <p class="quiz__sub">Your answers don’t point to one clear method, and that’s okay. A nurse can go through the options with you.</p>
        </header>`;

    const why = id => whys[id].length
      ? `<ul class="quiz__why">${whys[id].map(w => `<li>${icon('check')}${esc(w)}</li>`).join('')}</ul>` : '';
    const others = ranked.slice(1).map(id => {
      const m = method(id);
      return `<li class="quiz__alt">
        <div class="quiz__alt-head"><h4>${esc(m.name)}</h4><span class="method__eff">${esc(m.eff)}</span></div>
        <p class="quiz__alt-facts">Lasts ${esc(m.lasts.toLowerCase())} · Clinic ${esc(m.clinic.toLowerCase())}</p>
        ${why(id)}
      </li>`;
    }).join('');

    render(`${band}
      <div class="quiz__body">
        ${top ? `<section class="quiz__section"><h3 class="quiz__h">Why it fits you</h3>${why(top.id)}<p class="quiz__note-text">${esc(top.note)}</p></section>` : ''}
        ${notes.join('')}
        ${others ? `<section class="quiz__section"><h3 class="quiz__h">Also worth a look</h3><ol class="quiz__alts">${others}</ol></section>` : ''}
        <div class="quiz__actions">
          ${top ? '<button class="btn btn--primary btn--lg" type="button" data-quiz-show>Show these in the list</button>' : ''}
          <a class="btn btn--whatsapp btn--lg" href="${esc(wa)}" target="_blank" rel="noopener">${icon('chat')} Ask Sister Unathi on WhatsApp</a>
          <button class="quiz__back" type="button" data-quiz-restart>Start again</button>
        </div>
        ${disclaimer}
      </div>`, top ? 'purple' : 'pink', '#quiz-heading');

    $('[data-quiz-restart]', panel).addEventListener('click', () => { answers = []; at = 0; renderQuestion(); });
    $('[data-quiz-show]', panel)?.addEventListener('click', () => showInList(ranked));
  }

  function showInList(ranked) {
    dialog.close();
    $('#compare [data-filter="All"]').click();
    Object.entries(cards).forEach(([id, m]) => m.classList.toggle('method--match', ranked.includes(id)));
    cards[ranked[0]].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  $('[data-quiz-open]').addEventListener('click', () => {
    dialog.showModal();
    renderIntro();
  });
  dialog.addEventListener('close', () => clearTimeout(advancing));
  // Clicking the dimmed backdrop closes the quiz
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
})();
