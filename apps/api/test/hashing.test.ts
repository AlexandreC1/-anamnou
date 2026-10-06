import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withPasswordCapacity } from '../src/auth/hashing.js';

test('password work rejects excess concurrency and releases capacity after errors', async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = withPasswordCapacity(() => blocked);
  const second = withPasswordCapacity(() => blocked);
  await assert.rejects(
    withPasswordCapacity(async () => 'third'),
    /busy/,
  );
  release();
  await Promise.all([first, second]);
  await assert.rejects(
    withPasswordCapacity(async () => {
      throw new Error('failure');
    }),
    /failure/,
  );
  assert.equal(
    await withPasswordCapacity(async () => 'available'),
    'available',
  );
});
