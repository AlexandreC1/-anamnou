import 'dotenv/config';
import { parseEnvironment } from '../apps/api/src/config.js';
import { createDatabase } from '../apps/api/src/database.js';
import { S3ObjectStorage } from '../apps/api/src/storage.js';
import { cleanupMedia } from '../apps/api/src/publication/cleanup.js';
const env = parseEnvironment(process.env);
const database = createDatabase(env.DATABASE_URL);
const storage = new S3ObjectStorage(env);
try {
  console.log(
    JSON.stringify({
      event: 'media.cleanup',
      cleaned: await cleanupMedia(database, storage),
    }),
  );
} finally {
  await database.$disconnect();
  storage.close();
}
