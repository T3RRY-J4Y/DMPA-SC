/* Small DOM and formatting helpers shared by the admin modules. */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const nf = new Intl.NumberFormat('en-ZA');
const compact = new Intl.NumberFormat('en-ZA', { notation: 'compact', maximumFractionDigits: 1 });
export const num = n => (n >= 10000 ? compact.format(n) : nf.format(n));
export const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : '–');

/* A short message at the bottom of the screen. tone: 'ok' | 'error' */
export function toast(message, tone = 'ok') {
  let box = $('.admin-toasts');
  if (!box) {
    box = document.createElement('div');
    box.className = 'admin-toasts';
    box.setAttribute('role', 'status');
    document.body.appendChild(box);
  }
  const t = document.createElement('p');
  t.className = `admin-toast admin-toast--${tone}`;
  t.textContent = message;
  box.appendChild(t);
  setTimeout(() => t.remove(), tone === 'error' ? 8000 : 4000);
}

/* Readable Firebase errors for the messages people actually hit. */
export function explain(err) {
  const code = err?.code || '';
  if (code.includes('permission-denied') || code.includes('unauthorized')) return 'You don’t have permission to do that. Check that your account is an admin.';
  if (code.includes('unavailable') || code.includes('network')) return 'You seem to be offline. Check your connection and try again.';
  if (code.includes('quota')) return 'Firebase usage limit reached. Check the project’s billing in the Firebase console.';
  return err?.message || 'Something went wrong.';
}

export const slug = text => String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'resource';
