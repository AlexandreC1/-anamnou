import { createApp } from './app.js';
import { parseEnvironment } from './config.js';

async function main() {
  const environment = parseEnvironment(process.env);
  const app = await createApp(environment);
  await app.listen(environment.API_PORT, '127.0.0.1');
}
main().catch(() => {
  console.error(
    JSON.stringify({
      event: 'startup.failed',
      message: 'API startup failed. Check configuration and port availability.',
    }),
  );
  process.exitCode = 1;
});
