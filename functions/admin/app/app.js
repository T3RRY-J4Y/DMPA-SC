/* Admin panel shell: sign-in, the admin check, and switching between the
   Analytics and Resources views (#analytics, #resources). */
import { A, auth, usingEmulator } from './firebase.js';
import { $, $$, toast } from './ui.js';
import * as dashboard from './dashboard.js';
import * as library from './library.js';

const views = Object.fromEntries($$('[data-view]').map(v => [v.dataset.view, v]));
const tabs = $$('[data-tab]');
const userBox = $('[data-user]');
const modules = { analytics: dashboard, resources: library };

function show(name) {
  $('.admin-loading').hidden = true;
  Object.entries(views).forEach(([key, el]) => { el.hidden = key !== name; });
  const signedIn = name in modules;
  $('.admin-nav').hidden = !signedIn;
  tabs.forEach(t => t.setAttribute('aria-current', String(t.dataset.tab === name)));
  if (signedIn) modules[name].open();
}

const route = () => show(location.hash.slice(1) in modules ? location.hash.slice(1) : 'analytics');
let isAdmin = false;
addEventListener('hashchange', () => { if (isAdmin) route(); });

async function check(user, refresh = false) {
  if (!user) {
    isAdmin = false;
    userBox.hidden = true;
    return show('signin');
  }
  userBox.hidden = false;
  $('[data-user-email]').textContent = user.email;
  const token = await user.getIdTokenResult(refresh);
  isAdmin = token.claims.admin === true;
  if (!isAdmin) {
    $('[data-denied-email]').textContent = user.email;
    $('[data-denied-command]').textContent = `npm run admin -- add ${user.email}`;
    return show('denied');
  }
  route();
}

A.onAuthStateChanged(auth, user => check(user, true).catch(err => toast(err.message, 'error')));

const SIGN_IN_ERRORS = {
  'auth/unauthorized-domain': `This address (${location.hostname}) isn’t allowed to sign in yet. Add it in Firebase console → Authentication → Settings → Authorised domains.`,
  'auth/operation-not-allowed': 'Google sign-in is switched off. Turn it on in Firebase console → Authentication → Sign-in method.',
  'auth/popup-closed-by-user': '',
  'auth/cancelled-popup-request': '',
};

$('[data-sign-in]').addEventListener('click', async () => {
  const provider = new A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await A.signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === 'auth/popup-blocked') return A.signInWithRedirect(auth, provider);
    const msg = SIGN_IN_ERRORS[err.code] ?? err.message;
    if (msg) toast(msg, 'error');
  }
});
$$('[data-sign-out]').forEach(b => b.addEventListener('click', () => A.signOut(auth)));
$('[data-check-again]').addEventListener('click', () => check(auth.currentUser, true));

if (usingEmulator) $('[data-emulator-note]').hidden = false;
