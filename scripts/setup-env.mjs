import { randomBytes } from 'node:crypto';
import { appendFile, readFile, writeFile } from 'node:fs/promises';

const password = randomBytes(24).toString('hex');
const generated = {
  POSTGRES_PASSWORD: password,
  DATABASE_URL: `postgresql://yearbook:${password}@127.0.0.1:5432/yearbook`,
  STORAGE_ACCESS_KEY: randomBytes(12).toString('hex'),
  STORAGE_SECRET_KEY: randomBytes(32).toString('hex'),
  MFA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
};
const target = new URL('../.env', import.meta.url);
const template = await readFile(
  new URL('../.env.example', import.meta.url),
  'utf8',
);
const content = template.replace(
  /^(POSTGRES_PASSWORD|DATABASE_URL|STORAGE_ACCESS_KEY|STORAGE_SECRET_KEY|MFA_ENCRYPTION_KEY)=$/gm,
  (_, key) => `${key}=${generated[key]}`,
);
try {
  await writeFile(target, content, { flag: 'wx', mode: 0o600 });
  console.log(
    'Created .env with randomly generated local credentials. Keep this file private.',
  );
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  // Existing files keep every value; only keys introduced later are added.
  const existing = await readFile(target, 'utf8');
  if (/^MFA_ENCRYPTION_KEY=.+$/m.test(existing)) {
    console.log('.env already exists; preserved without changes.');
  } else if (/^MFA_ENCRYPTION_KEY=/m.test(existing)) {
    throw new Error(
      'MFA_ENCRYPTION_KEY is present but empty in .env. Remove the line and rerun.',
    );
  } else {
    await appendFile(
      target,
      (existing.endsWith('\n') ? '' : '\n') +
        `MFA_ENCRYPTION_KEY=${generated.MFA_ENCRYPTION_KEY}\n`,
    );
    console.log(
      '.env preserved; added a generated MFA_ENCRYPTION_KEY. Back it up with the database key.',
    );
  }
}
