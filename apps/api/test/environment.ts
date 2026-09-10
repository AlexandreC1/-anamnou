import { randomBytes } from 'node:crypto';
import { parseEnvironment } from '../src/config.js';

export function isolatedEnvironment() {
  return parseEnvironment({
    APP_ENV: 'test',
    API_PORT: '4000',
    PUBLIC_WEB_URL: 'http://localhost:3000',
    DATABASE_URL:
      'postgresql://test:' +
      randomBytes(16).toString('hex') +
      '@127.0.0.1:1/unavailable',
    STORAGE_ENDPOINT: 'http://127.0.0.1:1',
    STORAGE_REGION: 'us-east-1',
    STORAGE_BUCKET: 'test-bucket',
    STORAGE_ACCESS_KEY: randomBytes(12).toString('hex'),
    STORAGE_SECRET_KEY: randomBytes(24).toString('hex'),
  });
}
