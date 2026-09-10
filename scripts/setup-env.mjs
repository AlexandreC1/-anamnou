import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const password = randomBytes(24).toString('hex');
const generated = {
  POSTGRES_PASSWORD: password,
  DATABASE_URL: `postgresql://yearbook:${password}@127.0.0.1:5432/yearbook`,
  STORAGE_ACCESS_KEY: randomBytes(12).toString('hex'),
  STORAGE_SECRET_KEY: randomBytes(32).toString('hex'),
};
const template = await readFile(
  new URL('../.env.example', import.meta.url),
  'utf8',
);
const content = template.replace(
  /^(POSTGRES_PASSWORD|DATABASE_URL|STORAGE_ACCESS_KEY|STORAGE_SECRET_KEY)=$/gm,
  (_, key) => `${key}=${generated[key]}`,
);
try {
  await writeFile(new URL('../.env', import.meta.url), content, {
    flag: 'wx',
    mode: 0o600,
  });
  console.log(
    'Created .env with randomly generated local credentials. Keep this file private.',
  );
} catch (error) {
  if (error.code === 'EEXIST') {
    console.log('.env already exists; preserved without changes.');
  } else {
    throw error;
  }
}
