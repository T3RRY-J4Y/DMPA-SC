/* Share pages. A link to /r/<id> gives WhatsApp, Facebook and other link
   previews the resource's own title, description and cover, then sends
   people on to its preview on resources.html. Firebase Hosting routes /r/**
   here (see firebase.json). Crawlers don't run JavaScript, so they read the
   tags; browsers run the redirect straight away. */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage, getDownloadURL } from 'firebase-admin/storage';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { handleAdmin } from './admin.js';

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });

const SITE = 'DMPA self-inject';
const FALLBACK_IMAGE = { path: '/assets/images/og-image.jpg', width: 1200, height: 630, alt: 'DMPA self-inject: Contraception that fits your life.' };

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fileUrl = path => (path ? getDownloadURL(getStorage().bucket().file(path)).catch(() => '') : Promise.resolve(''));

async function lookup(id) {
  if (!/^[\w-]{1,100}$/.test(id)) return null;
  const doc = await getFirestore().collection('resources').doc(id).get();
  const r = doc.exists ? doc.data() : null;
  if (!r || r.published !== true) return null;
  // The cover, or the file itself when it's an image, else the site's share image
  const image = r.thumbUrl || await fileUrl(r.thumbPath)
    || (/\.(png|jpe?g|webp)$/i.test(r.filePath || r.fileUrl || '') ? r.fileUrl || await fileUrl(r.filePath) : '');
  return { ...r, image };
}

function page({ origin, shareUrl, target, r }) {
  const title = r ? `${r.title} · ${SITE}` : `Resources · ${SITE}`;
  const description = r?.description || 'Guides, cards and brand files to download, print or share, for women using DMPA-SC and the health workers supporting them.';
  const abs = u => new URL(u, origin).href;
  const img = r?.image
    ? `<meta property="og:image" content="${esc(abs(r.image))}">\n  <meta property="og:image:alt" content="${esc(`Cover of ${r.title}`)}">`
    : `<meta property="og:image" content="${esc(abs(FALLBACK_IMAGE.path))}">\n  <meta property="og:image:width" content="${FALLBACK_IMAGE.width}">\n  <meta property="og:image:height" content="${FALLBACK_IMAGE.height}">\n  <meta property="og:image:alt" content="${esc(FALLBACK_IMAGE.alt)}">`;
  // The visit is credited to the referring site, or to "shared link" when
  // the app sends none (WhatsApp usually doesn't).
  const redirect = `const u = new URL(${JSON.stringify(target)}, location.href);
    if (!u.searchParams.has('utm_source')) {
      let from = 'shared link';
      try { const h = new URL(document.referrer).hostname.replace(/^www\\./, ''); if (h && h !== location.hostname) from = h; } catch {}
      u.searchParams.set('from', from);
    }
    location.replace(u);`;
  return `<!DOCTYPE html>
<html lang="en-ZA">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${esc(shareUrl)}">
  <meta property="og:site_name" content="${SITE}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_ZA">
  <meta property="og:url" content="${esc(shareUrl)}">
  <meta property="og:title" content="${esc(r?.title || 'DMPA self-inject resources')}">
  <meta property="og:description" content="${esc(description)}">
  ${img}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#9300FF">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:17px/1.5 system-ui,sans-serif;background:#3626A7;color:#fff;text-align:center;padding:24px}a{color:#FFE06B;font-weight:700}</style>
  <script>${redirect}</script>
</head>
<body>
  <p>${r ? `Opening <strong>${esc(r.title)}</strong>…` : 'Opening the resource library…'}<br><a href="${esc(target)}">Continue</a></p>
</body>
</html>`;
}

export const sharePage = onRequest({ memory: '256MiB', concurrency: 40 }, async (req, res) => {
  const id = decodeURIComponent(req.path.replace(/^\/r\//, '').replace(/\/+$/, ''));
  const host = req.get('x-forwarded-host') || req.get('host');
  const origin = `${req.protocol === 'http' && /^(localhost|127\.)/.test(host) ? 'http' : 'https'}://${host}`;
  const query = new URLSearchParams(req.query).toString();
  const target = `/resources.html?resource=${encodeURIComponent(id)}${query ? `&${query}` : ''}`;
  let r = null;
  try {
    r = await lookup(id);
  } catch (err) {
    console.error('Share page lookup failed', id, err);
  }
  res.set('Cache-Control', r ? 'public, max-age=300, s-maxage=900' : 'public, max-age=60');
  res.status(r ? 200 : 404).type('html').send(page({ origin, shareUrl: `${origin}/r/${encodeURIComponent(id)}`, target, r }));
});

/* The admin area: see admin.js. */
export const adminPanel = onRequest({ memory: '256MiB', concurrency: 40 }, handleAdmin);
