import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Environment } from './config.js';

export interface ObjectStorage {
  check(): Promise<void>;
  put(key: string, content: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  close(): void;
}
export function createS3Client(environment: Environment) {
  return new S3Client({
    endpoint: environment.STORAGE_ENDPOINT,
    region: environment.STORAGE_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: environment.STORAGE_ACCESS_KEY,
      secretAccessKey: environment.STORAGE_SECRET_KEY,
    },
    maxAttempts: 2,
    requestHandler: { connectionTimeout: 2000, requestTimeout: 3000 },
  });
}
// Internal infrastructure port, never exposed directly as an upload API.
export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  constructor(private readonly environment: Environment) {
    this.client = createS3Client(environment);
  }
  async check() {
    await this.client.send(
      new HeadBucketCommand({ Bucket: this.environment.STORAGE_BUCKET }),
    );
  }
  private validateKey(key: string) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,199}$/.test(key) || key.includes('//')) {
      throw new Error('Invalid object key.');
    }
  }
  async put(key: string, content: Uint8Array, contentType: string) {
    this.validateKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.environment.STORAGE_BUCKET,
        Key: key,
        Body: content,
        ContentType: contentType,
      }),
    );
  }
  async get(key: string) {
    this.validateKey(key);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.environment.STORAGE_BUCKET,
        Key: key,
      }),
    );
    if (!response.Body) throw new Error('Object content is unavailable.');
    return response.Body.transformToByteArray();
  }
  async delete(key: string) {
    this.validateKey(key);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.environment.STORAGE_BUCKET,
        Key: key,
      }),
    );
  }
  close() {
    this.client.destroy();
  }
}
