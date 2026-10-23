/* The admin area. /admin and everything under it is served from here, not
   from Hosting's public files, so the panel's page and code reach only
   signed-in admins:

   GET  /admin             the panel with a valid admin session, else the sign-in page
   GET  /admin/app/*       the panel's scripts and styles, admins only (401 otherwise)
   GET  /admin/login.*     the sign-in page's own script and styles (public)
   POST /admin/session     swaps a Firebase ID token for an HttpOnly session cookie
   POST /admin/logout      clears it

   The data has its own protection in firestore.rules and storage.rules;
   this keeps the panel itself private. Sessions are Firebase Auth session
   cookies. Every request checks the account's current admin claim and
   revocation time, so `npm run admin -- remove` ends a session straight away. */
import { readFileSync } from 'node:fs';
import { getAuth } from 'firebase-admin/auth';

const COOKIE = '__session';              // the only cookie Firebase Hosting passes to functions
const SESSION_MS = 12 * 60 * 60 * 1000;  // sign in again after 12 hours
const TYPES = { js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', html: 'text/html; charset=utf-8' };
const PUBLIC = { '/admin/login.js': 'login.js', '/admin/login.css': 'login.css' };

const files = new Map();
const read = name => {
  if (!files.has(name)) files.set(name, readFileSync(new URL(`./admin/${name}`, import.meta.url)));
  return files.get(name);
};
const send = (res, name) => res.type(TYPES[name.split('.').pop()]).send(read(name));

const hostOf = req => req.get('x-forwarded-host') || req.get('host') || '';
const isLocal = req => /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(hostOf(req));
const setCookie = (req, value, maxAgeSec) => `${COOKIE}=${value}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${isLocal(req) ? '' : '; Secure'}`;
const cookieValue = req => decodeURIComponent((req.get('cookie') || '').match(/(?:^|;\s*)__session=([^;]+)/)?.[1] || '');

async function adminSession(req) {
  const value = cookieValue(req);
  if (!value) return null;
  try {
    // The cookie keeps the claims it was made with, so check the account as
    // it is now: still an admin, not disabled, and not revoked since sign-in.
    const claims = await getAuth().verifySessionCookie(value);
    const user = await getAuth().getUser(claims.uid);
    const revokedAt = user.tokensValidAfterTime ? Date.parse(user.tokensValidAfterTime) : 0;
    if (user.disabled || claims.auth_time * 1000 < revokedAt) return null;
    return user.customClaims?.admin === true ? claims : null;
  } catch {
    return null;
  }
}

async function createSession(req, res) {
  // Only this site's own pages may start a session
  const origin = req.get('origin');
  if (!origin || new URL(origin).host !== hostOf(req)) return res.status(403).json({ error: 'bad-origin' });
  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string' || !idToken) return res.status(400).json({ error: 'missing-token' });
  let claims;
  try {
    claims = await getAuth().verifyIdToken(idToken, true);
  } catch {
    return res.status(401).json({ error: 'invalid-token' });
  }
  if (claims.admin !== true) return res.status(403).json({ error: 'not-admin' });
  const session = await getAuth().createSessionCookie(idToken, { expiresIn: SESSION_MS });
  res.set('Set-Cookie', setCookie(req, session, SESSION_MS / 1000));
  return res.status(204).end();
}

export async function handleAdmin(req, res) {
  res.set({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "frame-ancestors 'none'",
    'Referrer-Policy': 'same-origin',
  });
  const path = req.path;

  if (req.method === 'POST') {
    if (path === '/admin/session') return createSession(req, res);
    if (path === '/admin/logout') {
      res.set('Set-Cookie', setCookie(req, '', 0));
      return res.status(204).end();
    }
    return res.status(404).end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();

  if (path === '/admin/') return res.redirect(301, `/admin${req.url.slice(path.length)}`);
  if (PUBLIC[path]) return send(res, PUBLIC[path]);

  const asset = path.match(/^\/admin\/app\/([a-z-]+\.(?:js|css))$/)?.[1];
  if (path !== '/admin' && !asset) return res.status(404).type('text/plain').send('Not found');

  const admin = await adminSession(req);
  if (asset) return admin ? send(res, `app/${asset}`) : res.status(401).type('text/plain').send('Sign in at /admin first.');
  return send(res, admin ? 'app.html' : 'login.html');
}
