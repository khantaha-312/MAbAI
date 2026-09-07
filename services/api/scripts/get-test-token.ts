import { createClerkClient } from '@clerk/backend';
import 'dotenv/config';

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error('CLERK_SECRET_KEY not found in .env');
    process.exit(1);
  }

  const clerk = createClerkClient({ secretKey });

  // Uses the first real user in your Clerk instance. If you have no users
  // yet, sign up once through the frontend first, then re-run this script.
  const { data: users } = await clerk.users.getUserList({ limit: 1 });
  if (users.length === 0) {
    console.error('No users found in Clerk. Sign up through the frontend once first.');
    process.exit(1);
  }

  const user = users[0];
  const session = await clerk.sessions.createSession({ userId: user.id });
  const token = await clerk.sessions.getToken(session.id, 'default' as any);

  console.log('\nUser:', user.emailAddresses[0]?.emailAddress);
  console.log('\nBearer token (paste into Postman Authorization header, or use below):\n');
  console.log(token.jwt);
  console.log('\nExpires shortly — re-run this script whenever you need a fresh one.\n');
}

main().catch((err) => {
  console.error('Failed to mint test token:', err);
  process.exit(1);
});