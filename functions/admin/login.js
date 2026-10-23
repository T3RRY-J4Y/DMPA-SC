/* Admin sign-in (/admin when there's no admin session). Signs in with
   Google, then exchanges the ID token for an HttpOnly session cookie at
   /admin/session. Only with that cookie does /admin serve the panel itself
   (functions/admin.js). Add ?emulator to use the local Auth emulator. */
const cfg = window.DMPA.config;
const sdk = `https://www.gstatic.com/firebasejs/${cfg.firebaseSdkVersion}/`;
const [{ initializeApp, getApps }, A] = await Promise.all([import(sdk + 'firebase-app.js'), import(sdk + 'firebase-auth.js')]);

const app = getApps()[0] || initializeApp(cfg.firebase);
const auth = A.getAuth(app);
const usingEmulator = new URLSearchParams(location.search).has('emulator');
if (usingEmulator) {
  A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  document.querySelector('[data-emulator-note]').hidden = false;
}

const $ = sel => document.querySelector(sel);
const views = [...document.querySelectorAll('[data-view]')];
function show(name) {
  $('.admin-loading').hidden = true;
  views.forEach(v => { v.hidden = v.dataset.view !== name; });
}

function toast(message) {
  let box = $('.admin-toasts');
  if (!box) {
    box = Object.assign(document.createElement('div'), { className: 'admin-toasts' });
    box.setAttribute('role', 'status');
    document.body.appendChild(box);
  }
  const t = Object.assign(document.createElement('p'), { className: 'admin-toast admin-toast--error', textContent: message });
  box.appendChild(t);
  setTimeout(() => t.remove(), 8000);
}

// If this page loads again right after a session was made, the browser
// didn't keep the cookie; say so rather than looping.
const LOOP_KEY = 'dmpa-admin-session-at';
let cameStraightBack = false;
try {
  cameStraightBack = Date.now() - Number(sessionStorage.getItem(LOOP_KEY) || 0) < 10000;
  sessionStorage.removeItem(LOOP_KEY);
} catch { /* storage blocked: no loop check */ }

async function startSession(user, refresh = false) {
  if (cameStraightBack) {
    cameStraightBack = false;
    show('signin');
    return toast('Your browser didn’t keep the sign-in cookie. Allow cookies for this site, then sign in again.');
  }
  const res = await fetch('/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: await user.getIdToken(refresh) }),
  });
  if (res.ok) {
    try { sessionStorage.setItem(LOOP_KEY, String(Date.now())); } catch { /* fine */ }
    return location.replace(`/admin${location.search}${location.hash}`);
  }
  const { error } = await res.json().catch(() => ({}));
  if (error === 'not-admin') {
    $('[data-denied-email]').textContent = user.email;
    $('[data-denied-command]').textContent = `npm run admin -- add ${user.email}`;
    return show('denied');
  }
  show('signin');
  toast('Sign-in didn’t work. Please try again.');
}

A.onAuthStateChanged(auth, user => {
  if (user) startSession(user).catch(() => { show('signin'); toast('Couldn’t reach the server. Check your connection.'); });
  else show('signin');
});

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
    if (msg) toast(msg);
  }
});
document.querySelectorAll('[data-sign-out]').forEach(b => b.addEventListener('click', () => A.signOut(auth)));
$('[data-check-again]').addEventListener('click', () => auth.currentUser && startSession(auth.currentUser, true));
