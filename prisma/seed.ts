import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/api/src/generated/prisma/client.js';

if (process.env.APP_ENV !== 'development' && process.env.APP_ENV !== 'test') {
  throw new Error('The development seed requires APP_ENV=development or test.');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const client = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  await client.systemMetadata.upsert({
    where: { key: 'foundation_version' },
    create: { key: 'foundation_version', value: '1' },
    update: {},
  });
  console.log(
    'Foundation metadata seeded. No users or business records created.',
  );
} finally {
  await client.$disconnect();
}
