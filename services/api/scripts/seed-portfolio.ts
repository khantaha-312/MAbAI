import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.org.create({
    data: {
      name: 'Seed Org',
    },
  });
  console.log('Seeded org:', org.id);

  const user = await prisma.user.create({
    data: {
      email: 'seed@example.com',
      clerkId: 'seed_clerk_id',
      org: { connect: { id: org.id } },
    },
  });
  console.log('Seeded user:', user.id);

  const portfolio = await prisma.portfolio.create({
    data: {
      name: 'Seed Portfolio',
      userId: user.id,
      orgId: org.id,
    },
  });
  console.log('Seeded portfolio:', portfolio.id);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });