/* Admin panel shell: switching between the Analytics and Resources views
   (#analytics, #resources), and signing out. This file is only served with
   an admin session (functions/admin.js); signing in happens on the sign-in
   page. The browser's Firebase sign-in is still needed, because the
   security rules check it on every read and write. */
import { A, auth, usingEmulator } from './firebase.js';
import { $, $$, toast } from './ui.js';
import * as dashboard from './dashboard.js';
import * as library from './library.js';

// Reaching the panel means the session cookie worked (see the loop check in login.js)
try { sessionStorage.removeItem('dmpa-admin-session-at'); } catch { /* fine */ }

const views = Object.fromEntries($$('[data-view]').map(v => [v.dataset.view, v]));
const tabs = $$('[data-tab]');
const modules = { analytics: dashboard, resources: library };

function show(name) {
  $('.admin-loading').hidden = true;
  Object.entries(views).forEach(([key, el]) => { el.hidden = key !== name; });
  $('.admin-nav').hidden = false;
  tabs.forEach(t => t.setAttribute('aria-current', String(t.dataset.tab === name)));
  modules[name].open();
}

const route = () => show(location.hash.slice(1) in modules ? location.hash.slice(1) : 'analytics');
let started = false;
addEventListener('hashchange', () => { if (started) route(); });

/* Ends the server session too, then goes back to the sign-in page. */
async function signOut() {
  await fetch('/admin/logout', { method: 'POST' }).catch(() => {});
  await A.signOut(auth).catch(() => {});
  location.replace(`/admin${location.search}`);
}

A.onAuthStateChanged(auth, async user => {
  // A session cookie without a browser sign-in (e.g. site data cleared): start over
  if (!user) return signOut();
  const token = await user.getIdTokenResult(true).catch(() => null);
  if (token?.claims.admin !== true) return signOut();
  $('[data-user]').hidden = false;
  $('[data-user-email]').textContent = user.email;
  started = true;
  route();
}, err => toast(err.message, 'error'));

$$('[data-sign-out]').forEach(b => b.addEventListener('click', signOut));
if (usingEmulator) $('[data-emulator-note]').hidden = false;
