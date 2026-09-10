import 'dotenv/config';
import {
  CreateBucketCommand,
  GetBucketPolicyCommand,
  HeadBucketCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { parseEnvironment } from '../apps/api/src/config.js';
import { createS3Client } from '../apps/api/src/storage.js';

const environment = parseEnvironment(process.env);
if (environment.APP_ENV === 'production')
  throw new Error('Local bucket setup is not a production provisioning tool.');
const client = createS3Client(environment);
const Bucket = environment.STORAGE_BUCKET;
try {
  try {
    await client.send(new HeadBucketCommand({ Bucket }));
  } catch (error) {
    if (
      !(error instanceof S3ServiceException) ||
      error.$metadata.httpStatusCode !== 404
    )
      throw error;
    await client.send(new CreateBucketCommand({ Bucket }));
  }
  try {
    await client.send(new GetBucketPolicyCommand({ Bucket }));
    throw new Error(
      'Bucket has a policy. Review and remove public grants before using local storage.',
    );
  } catch (error) {
    if (
      !(error instanceof S3ServiceException) ||
      error.name !== 'NoSuchBucketPolicy'
    )
      throw error;
  }
  console.log('Private local storage bucket is ready.');
} finally {
  client.destroy();
}
