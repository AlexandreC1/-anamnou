import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  mkdir,
  readFile,
  writeFile,
  stat,
  appendFile,
  unlink,
} from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = join(root, '.tools', 'backups');
const keyPath = join(root, '.tools', 'backup-key');
const container = 'yearbook-local-postgres-1';
const action = process.argv[2];
const magic = Buffer.from('ANAMDB1\n');
await mkdir(directory, { recursive: true, mode: 0o700 });
if (action === 'init') {
  await writeFile(keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 });
  console.log(
    'Backup key created in ignored .tools/backup-key. Keep an independent secure copy.',
  );
  process.exit(0);
}
const key = process.env.BACKUP_ENCRYPTION_KEY
  ? Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'base64')
  : await readFile(keyPath);
if (key.length !== 32) throw new Error('Backup key must contain 32 bytes.');
function docker(command) {
  const result = spawnSync('docker', ['exec', container, 'sh', '-c', command], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error('Database operation failed.');
  return result.stdout;
}
if (action === 'create') {
  const output = join(
    directory,
    new Date().toISOString().replace(/[:.]/g, '-') + '.dump.enc',
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(magic);
  await writeFile(output, Buffer.concat([magic, iv]), {
    flag: 'wx',
    mode: 0o600,
  });
  const child = spawn(
    'docker',
    [
      'exec',
      container,
      'sh',
      '-c',
      'exec pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" "$POSTGRES_DB"',
    ],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const completion = new Promise((resolveCompletion, reject) => {
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolveCompletion()
        : reject(new Error('Database dump failed.')),
    );
  });
  try {
    await Promise.all([
      pipeline(child.stdout, cipher, createWriteStream(output, { flags: 'a' })),
      completion,
    ]);
    await appendFile(output, cipher.getAuthTag());
  } catch (error) {
    child.kill();
    try {
      await unlink(output);
    } catch {
      console.error('Could not remove incomplete encrypted backup.');
    }
    throw error;
  }
  console.log('Encrypted PostgreSQL backup: ' + output);
} else if (action === 'restore-test') {
  const source = resolve(process.argv[3] ?? '');
  if (!source.endsWith('.dump.enc'))
    throw new Error('Select an encrypted database dump.');
  const length = (await stat(source)).size;
  if (length <= magic.length + 12 + 16) throw new Error('Invalid backup.');
  // Read only the small header/tag; database content streams to a disposable DB.
  const { open } = await import('node:fs/promises');
  const handle = await open(source, 'r');
  const header = Buffer.alloc(magic.length + 12);
  const tag = Buffer.alloc(16);
  try {
    await handle.read(header, 0, header.length, 0);
    await handle.read(tag, 0, 16, length - 16);
  } finally {
    await handle.close();
  }
  if (!header.subarray(0, magic.length).equals(magic))
    throw new Error('Invalid backup header.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    header.subarray(magic.length),
  );
  decipher.setAAD(magic);
  decipher.setAuthTag(tag);
  const testName = 'yearbook_restore_' + randomBytes(8).toString('hex');
  docker(`exec createdb -U "$POSTGRES_USER" ${testName}`);
  try {
    const child = spawn(
      'docker',
      [
        'exec',
        '-i',
        container,
        'sh',
        '-c',
        `exec pg_restore --exit-on-error --no-owner --no-acl -U "$POSTGRES_USER" -d ${testName}`,
      ],
      { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] },
    );
    const completion = new Promise((resolveCompletion, reject) => {
      child.on('error', reject);
      child.on('close', (code) =>
        code === 0 ? resolveCompletion() : reject(new Error('Restore failed.')),
      );
    });
    try {
      await Promise.all([
        pipeline(
          createReadStream(source, { start: header.length, end: length - 17 }),
          decipher,
          child.stdin,
        ),
        completion,
      ]);
    } catch (error) {
      child.kill();
      await Promise.allSettled([completion]);
      throw error;
    }
    const result = docker(
      `exec psql -U "$POSTGRES_USER" -d ${testName} -Atc 'SELECT COUNT(*) FROM "_prisma_migrations"'`,
    ).trim();
    if (!/^\d+$/.test(result) || Number(result) < 1)
      throw new Error('Restored schema unavailable.');
    console.log(
      'Authenticated backup restored successfully into an isolated temporary database.',
    );
  } finally {
    // The generated name cannot target the application's database.
    docker(`exec dropdb --force -U "$POSTGRES_USER" ${testName}`);
  }
} else throw new Error('Use init, create, or restore-test <backup.dump.enc>.');
