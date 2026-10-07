import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const destination = new URL('.tools/cloudflare-site/', root);
await mkdir(destination, { recursive: true });
await cp(new URL('apps/web/dist/', root), destination, { recursive: true });
const index = new URL('index.html', destination);
const html = await readFile(index, 'utf8');
await writeFile(
  index,
  html.replace(
    '<body>',
    '<body><aside role="status" style="padding:12px 20px;background:#231b2e;color:#fff;text-align:center;font:16px/1.5 system-ui">Design preview · Aperçu du design · Account services are not open yet. Please do not submit personal information.</aside>',
  ),
);
console.log(
  'Closed-enrollment Cloudflare preview prepared: ' +
    fileURLToPath(destination),
);
