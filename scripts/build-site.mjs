/* Copies the public site into dist/, which is the only folder Firebase
   Hosting publishes. It's an allowlist: anything not named here (keys,
   tooling, docs, design sources) can't end up on the web. Runs before every
   hosting deploy (firebase.json predeploy) and `npm run serve`. */
import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'dist');
const PAGES = readdirSync(root).filter(f => f.endsWith('.html'));
const FILES = [...PAGES, 'favicon.ico', 'robots.txt', 'sitemap.xml', 'site.webmanifest'];
const DIRS = ['css', 'js', 'assets'];

rmSync(out, { recursive: true, force: true });
for (const f of FILES) if (existsSync(join(root, f))) cpSync(join(root, f), join(out, f));
for (const d of DIRS) cpSync(join(root, d), join(out, d), { recursive: true });

// Belt and braces: refuse to publish anything that looks like a credential.
const walk = dir => readdirSync(dir).flatMap(f => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const files = walk(out);
const bad = files.filter(f => /service-account|adminsdk|\.env|\.pem$|\.key$/i.test(f));
if (bad.length) {
  rmSync(out, { recursive: true, force: true });
  throw new Error(`Refusing to publish: ${bad.join(', ')}`);
}
console.log(`Built dist/ with ${files.length} files.`);
