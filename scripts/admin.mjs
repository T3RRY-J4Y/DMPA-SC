/* Manages who can use the admin panel, by setting the `admin` custom claim.
   The person must have signed in at /admin once first.

   GOOGLE_APPLICATION_CREDENTIALS=service-account.json npm run admin -- add someone@example.com
   … npm run admin -- remove someone@example.com
   … npm run admin -- list */
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects.default;
initializeApp(process.env.FIREBASE_AUTH_EMULATOR_HOST ? { projectId } : { projectId, credential: applicationDefault() });
const auth = getAuth();
const [command, email] = process.argv.slice(2);

async function setAdmin(on) {
  if (!email) throw new Error(`Usage: npm run admin -- ${command} <email>`);
  const user = await auth.getUserByEmail(email).catch(() => {
    throw new Error(`${email} has not signed in yet. Ask them to open /admin and sign in, then run this again.`);
  });
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: on || undefined });
  // Removing access also ends any open admin session (sessions are checked for revocation)
  if (!on) await auth.revokeRefreshTokens(user.uid);
  console.log(`${email} is ${on ? 'now an admin' : 'no longer an admin'}. They should click "Check again" or sign in again.`);
}

async function list() {
  let token, count = 0;
  do {
    const page = await auth.listUsers(1000, token);
    page.users.filter(u => u.customClaims?.admin).forEach(u => { count++; console.log(u.email); });
    token = page.pageToken;
  } while (token);
  if (!count) console.log('No admins yet.');
}

const commands = { add: () => setAdmin(true), remove: () => setAdmin(false), list };
if (!commands[command]) {
  console.error('Usage: npm run admin -- add|remove <email>, or npm run admin -- list');
  process.exit(1);
}
await commands[command]().catch(err => { console.error(err.message); process.exit(1); });
