import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
await mkdir(new URL('.tools/', root), { recursive: true });
const destination = await mkdtemp(
  fileURLToPath(new URL('.tools/cloudflare-preview-', root)),
);
const vite = fileURLToPath(new URL('node_modules/vite/bin/vite.js', root));
const build = spawnSync(
  process.execPath,
  [vite, 'build', '--outDir', destination],
  {
    cwd: fileURLToPath(new URL('apps/web/', root)),
    env: { ...process.env, APP_ENV: 'production', VITE_PUBLIC_PREVIEW: 'true' },
    stdio: 'inherit',
  },
);
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
console.log('Closed-enrollment Cloudflare preview prepared: ' + destination);
