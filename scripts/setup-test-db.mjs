import { loadEnvFile } from 'node:process';
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

loadEnvFile('.env');
if (process.env.APP_ENV === 'production')
  throw new Error('Test setup is forbidden in production.');
const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
const originalName = databaseUrl.pathname.slice(1);
if (!/^[a-zA-Z][a-zA-Z0-9_]{0,48}$/.test(originalName))
  throw new Error('Test setup requires a simple local database name.');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(databaseUrl.hostname))
  throw new Error('Automatic test setup is limited to local PostgreSQL.');
const testName = originalName + '_test';
const client = new pg.Client({ connectionString: databaseUrl.href });
await client.connect();
try {
  const existing = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [testName],
  );
  if (existing.rowCount === 0)
    await client.query(`CREATE DATABASE "${testName}"`);
} finally {
  await client.end();
}
databaseUrl.pathname = '/' + testName;
const testUrl = databaseUrl.href;
writeFileSync('.env.test', `APP_ENV=test\nDATABASE_URL=${testUrl}\n`, {
  mode: 0o600,
});
const migration = spawnSync(
  process.execPath,
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  {
    env: { ...process.env, APP_ENV: 'test', DATABASE_URL: testUrl },
    stdio: 'inherit',
  },
);
if (migration.status !== 0) process.exit(migration.status ?? 1);
const seed = spawnSync(
  process.execPath,
  ['node_modules/prisma/build/index.js', 'db', 'seed'],
  {
    env: { ...process.env, APP_ENV: 'test', DATABASE_URL: testUrl },
    stdio: 'inherit',
  },
);
if (seed.status !== 0) process.exit(seed.status ?? 1);
console.log(
  'Isolated local test database is ready. Development accounts remain separate.',
);
