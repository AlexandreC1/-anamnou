import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export function createDatabase(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 2000,
      statement_timeout: 3000,
    }),
  });
}
export type Database = ReturnType<typeof createDatabase>;
