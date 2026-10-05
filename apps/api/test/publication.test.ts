import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeImage } from '../src/publication/image.js';
import {
  intentInput,
  yearbookInput,
  profileInput,
} from '../src/publication/rules.js';

test('image pipeline decodes, normalizes orientation and strips metadata', async () => {
  const input = await sharp({
    create: { width: 300, height: 400, channels: 3, background: '#b0a080' },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await normalizeImage(input, 'image/jpeg');
  const metadata = await sharp(result.data).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 400);
  assert.equal(metadata.height, 300);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
});
test('image pipeline rejects forged signatures, mismatched MIME, truncated data, small and excessive dimensions', async () => {
  const valid = await sharp({
    create: { width: 128, height: 128, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  const tiny = await sharp({
    create: { width: 64, height: 64, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  const bomb = await sharp({
    create: { width: 4100, height: 4100, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  for (const [bytes, type] of [
    [Buffer.from('<svg onload="alert(1)"/>'), 'image/png'],
    [valid, 'image/jpeg'],
    [valid.subarray(0, 40), 'image/png'],
    [tiny, 'image/png'],
    [bomb, 'image/png'],
    [Buffer.alloc(8 * 1024 * 1024 + 1), 'image/png'],
  ] as const)
    await assert.rejects(normalizeImage(bytes, type));
});
test('publication inputs reject unsafe types, extra fields, duplicate media and invalid versions', () => {
  assert.equal(intentInput.safeParse({}).success, false);
  assert.equal(
    intentInput.safeParse({
      classId: '00000000-0000-4000-8000-000000000001',
      purpose: 'PROFILE',
      contentType: 'image/svg+xml',
      size: 123,
      alt: 'photo',
    }).success,
    false,
  );
  assert.equal(
    yearbookInput.safeParse({
      version: -1,
      title: 'Edition',
      theme: 'PAPER',
      sections: [],
    }).success,
    false,
  );
  assert.equal(
    profileInput.safeParse({ displayName: 'Name', userId: 'other' }).success,
    false,
  );
  assert.equal(
    yearbookInput.safeParse({
      version: 0,
      title: 'Edition',
      theme: 'PAPER',
      sections: [
        {
          type: 'COVER',
          title: 'Cover',
          body: '',
          assetIds: [
            '00000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000001',
          ],
        },
      ],
    }).success,
    false,
  );
});
