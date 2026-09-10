import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const environment = { ...loadEnv(mode, '../..', ''), ...process.env };
  const port = Number(environment.WEB_PORT);
  const api = environment.API_BASE_URL;
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('WEB_PORT must be a valid port.');
  if (!api || !['http:', 'https:'].includes(new URL(api).protocol))
    throw new Error('API_BASE_URL must be an HTTP URL.');
  const proxy = {
    '/api': {
      target: api,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    },
  };
  return {
    plugins: [react()],
    server: { host: '127.0.0.1', port, strictPort: true, proxy },
    preview: { host: '127.0.0.1', port, strictPort: true, proxy },
    build: { sourcemap: false },
  };
});
