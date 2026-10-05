import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database.js';
import { parseEnvironment } from '../src/config.js';
import { hashToken, newToken } from '../src/auth/security.js';
import { S3ObjectStorage } from '../src/storage.js';
import { cleanupMedia } from '../src/publication/cleanup.js';

const env = parseEnvironment(process.env);
if (env.APP_ENV === 'production') throw new Error('No production tests.');
const db = createDatabase(env.DATABASE_URL);
const storage = new S3ObjectStorage(env);
const actors = Array.from({ length: 4 }, () => ({
  id: randomUUID(),
  token: newToken(),
}));
const admin = actors[0]!;
const student = actors[1]!;
const outsider = actors[2]!;
const guest = actors[3]!;
const schoolId = randomUUID();
const foreignSchoolId = randomUUID();
const classId = randomUUID();
const foreignClassId = randomUUID();
const memberId = randomUUID();
let app: INestApplication;
let base = '';
let photo = '';
let classPhoto = '';
let image: Buffer;
const profile = {
  version: 0,
  displayName: 'Fictional Student',
  nickname: null,
  bio: 'A short story',
  quote: 'Our next chapter',
  activities: null,
  aspiration: null,
  contact: 'private-contact@example.test',
  visibility: 'PRIVATE',
  contactVisibility: 'PRIVATE',
  photoAssetId: null as string | null,
};
const draft = {
  version: 0,
  title: 'Our edition',
  theme: 'PAPER',
  sections: [
    {
      type: 'COVER',
      title: 'Our story',
      body: '<script>alert(1)</script>',
      assetIds: [] as string[],
    },
    { type: 'MEMBERS', title: 'Our class', body: '', assetIds: [] as string[] },
  ],
};
async function call(
  path: string,
  actor?: typeof admin,
  body?: object,
  method = body ? 'POST' : 'GET',
  origin = env.PUBLIC_WEB_URL,
) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(actor ? { Cookie: 'yearbook_session=' + actor.token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function upload(id: string, actor: typeof admin, bytes = image) {
  return fetch(base + '/media/' + id + '/content', {
    method: 'POST',
    headers: {
      Origin: env.PUBLIC_WEB_URL,
      'Content-Type': 'application/octet-stream',
      Cookie: 'yearbook_session=' + actor.token,
    },
    body: new Uint8Array(bytes),
  });
}
async function intent(
  actor: typeof admin,
  purpose = 'PROFILE',
  scope = classId,
) {
  return call('/media/upload-intent', actor, {
    classId: scope,
    purpose,
    contentType: 'image/png',
    size: image.length,
    alt: 'Fictional test image',
  });
}
before(async () => {
  image = await sharp({
    create: { width: 320, height: 400, channels: 3, background: '#b09080' },
  })
    .png()
    .toBuffer();
  for (const actor of actors)
    await db.user.create({
      data: {
        id: actor.id,
        email: actor.id + '@example.test',
        displayName: 'Fictional test',
        passwordHash: 'fixture-not-a-login-password',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        sessions: {
          create: {
            tokenHash: hashToken(actor.token),
            expiresAt: new Date(Date.now() + 600000),
          },
        },
      },
    });
  await db.school.create({
    data: {
      id: schoolId,
      name: 'Profile school',
      slug: schoolId,
      admins: { create: { userId: admin.id } },
    },
  });
  await db.school.create({
    data: { id: foreignSchoolId, name: 'Other school', slug: foreignSchoolId },
  });
  await db.class.create({
    data: {
      id: classId,
      schoolId,
      name: 'Class',
      slug: classId,
      graduationYear: 2026,
      memberships: {
        create: [
          { userId: admin.id, role: 'CLASS_ADMIN' },
          { id: memberId, userId: student.id, role: 'MEMBER' },
          { userId: guest.id, role: 'GUEST' },
        ],
      },
    },
  });
  await db.class.create({
    data: {
      id: foreignClassId,
      schoolId: foreignSchoolId,
      name: 'Other class',
      slug: foreignClassId,
      graduationYear: 2026,
      memberships: { create: { userId: outsider.id, role: 'CLASS_ADMIN' } },
    },
  });
  app = await createApp(env);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => {
  if (app) await app.close();
  const scope = { classId: { in: [classId, foreignClassId] } };
  for (const asset of await db.mediaAsset.findMany({ where: scope }))
    await storage.delete(asset.storageKey);
  await db.profile.deleteMany({ where: scope });
  await db.yearbookSection.deleteMany({ where: scope });
  await db.yearbook.deleteMany({ where: scope });
  await db.mediaAsset.deleteMany({ where: scope });
  await db.auditLog.deleteMany({ where: scope });
  await db.classMembership.deleteMany({ where: scope });
  await db.class.deleteMany({
    where: { id: { in: [classId, foreignClassId] } },
  });
  await db.schoolAdmin.deleteMany({ where: { schoolId } });
  await db.school.deleteMany({
    where: { id: { in: [schoolId, foreignSchoolId] } },
  });
  await db.user.deleteMany({
    where: { id: { in: actors.map((actor) => actor.id) } },
  });
  await db.authThrottle.deleteMany({
    where: {
      OR: actors.map((actor) => ({ key: { endsWith: hashToken(actor.id) } })),
    },
  });
  await db.$disconnect();
  storage.close();
});
test('profile reads require authentication, tenant access, nonguest membership and owner/visibility', async () => {
  const path = `/classes/${classId}/members/me/profile`;
  assert.equal((await call(path)).status, 401);
  assert.equal((await call(path, outsider)).status, 404);
  assert.equal((await call(path, guest)).status, 403);
  assert.equal((await call(path, student)).status, 200);
  assert.equal((await call(path, student, profile, 'PATCH')).status, 200);
  assert.equal(
    (await call(`/classes/${classId}/members/${memberId}/profile`, admin))
      .status,
    404,
  );
  assert.equal(
    (
      await call(
        `/classes/${classId}/members/${memberId}/profile`,
        admin,
        { ...profile, version: 1 },
        'PATCH',
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await call(
        path,
        student,
        { ...profile, version: 1, userId: admin.id },
        'PATCH',
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        path,
        student,
        { ...profile, version: 1 },
        'PATCH',
        'https://hostile.example',
      )
    ).status,
    403,
  );
});
test('private contact stays out of shared profiles and yearbook; stale saves conflict', async () => {
  const path = `/classes/${classId}/members/me/profile`;
  assert.equal((await call(path, student, profile, 'PATCH')).status, 409);
  assert.equal(
    (
      await call(
        path,
        student,
        { ...profile, version: 1, visibility: 'CLASS' },
        'PATCH',
      )
    ).status,
    200,
  );
  const shared = (await (
    await call(`/classes/${classId}/members/${memberId}/profile`, admin)
  ).json()) as Record<string, unknown>;
  assert.equal('contact' in shared, false);
  const reader = await (
    await call(`/classes/${classId}/yearbook/members`, admin)
  ).text();
  assert.ok(reader.includes('Fictional Student'));
  assert.ok(!reader.includes('private-contact'));
  assert.ok(!reader.includes('contactVisibility'));
  assert.equal(
    (await call(`/classes/${classId}/profile-progress`, student)).status,
    403,
  );
  assert.deepEqual(
    await (await call(`/classes/${classId}/profile-progress`, admin)).json(),
    { members: 2, profiles: 1, photos: 0, quotes: 1 },
  );
  assert.equal(
    (await call(`/classes/${classId}/yearbook/members?pageSize=100`, student))
      .status,
    400,
  );
});
test('upload intent checks roles and tenant before content ingestion; completed images are normalized and private', async () => {
  assert.equal((await intent(outsider)).status, 404);
  assert.equal((await intent(guest)).status, 403);
  assert.equal((await intent(student, 'YEARBOOK')).status, 403);
  const result = await intent(student);
  assert.equal(result.status, 201);
  photo = ((await result.json()) as { id: string }).id;
  assert.equal((await upload(photo, outsider)).status, 404);
  assert.equal((await upload(photo, admin)).status, 404);
  assert.equal(
    (await call('/media/' + photo + '/complete', student, {})).status,
    409,
  );
  assert.equal((await upload(photo, student)).status, 200);
  assert.equal(
    (await call('/media/' + photo + '/content', student)).status,
    404,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await call('/media/' + photo + '/complete', student, {})).status,
      200,
    );
  assert.equal((await upload(photo, student)).status, 409);
  assert.equal((await call('/media/' + photo + '/content', admin)).status, 404);
  const served = await call('/media/' + photo + '/content', student);
  assert.equal(served.headers.get('content-type'), 'image/webp');
  assert.equal(served.headers.get('cache-control'), 'no-store');
  assert.equal(
    (await sharp(Buffer.from(await served.arrayBuffer())).metadata()).format,
    'webp',
  );
  assert.equal(
    (
      await call(
        `/classes/${classId}/members/me/profile`,
        student,
        { ...profile, version: 2, visibility: 'CLASS', photoAssetId: photo },
        'PATCH',
      )
    ).status,
    200,
  );
  assert.equal((await call('/media/' + photo + '/content', admin)).status, 200);
  const shared = await (
    await call(`/classes/${classId}/members/${memberId}/profile`, admin)
  ).json();
  assert.deepEqual(shared.photo, {
    id: photo,
    alt: 'Fictional test image',
    width: 320,
    height: 400,
  });
  assert.equal('storageKey' in shared.photo, false);
  assert.equal('ownerUserId' in shared.photo, false);
  assert.equal('contact' in shared, false);
  assert.equal((await call('/media/' + photo + '/content', guest)).status, 404);
  assert.equal(
    (await call('/media/' + photo + '/content', outsider)).status,
    404,
  );
});
test('uploads reject size mismatch, forged images, expired intents and oversized bodies', async () => {
  const result = await intent(student);
  const asset = (await result.json()) as { id: string };
  assert.equal(
    (await upload(asset.id, student, Buffer.from('bad'))).status,
    400,
  );
  assert.equal(
    (await upload(asset.id, student, Buffer.alloc(image.length))).status,
    400,
  );
  assert.equal(
    (await upload(asset.id, student, Buffer.alloc(8 * 1024 * 1024 + 1))).status,
    413,
  );
  await db.mediaAsset.update({
    where: { id: asset.id },
    data: { expiresAt: new Date(0) },
  });
  assert.equal((await upload(asset.id, student)).status, 409);
  assert.equal(
    (
      await call('/media/upload-intent', student, {
        classId,
        purpose: 'PROFILE',
        contentType: 'image/svg+xml',
        size: 20,
        alt: 'bad',
      })
    ).status,
    400,
  );
});
test('draft editing is admin-only, tenant-scoped, versioned and media references stay within the class', async () => {
  const path = `/classes/${classId}/yearbook`;
  assert.equal((await call(path, student, draft, 'PATCH')).status, 403);
  assert.equal((await call(path, outsider, draft, 'PATCH')).status, 404);
  assert.equal((await call(path, guest)).status, 403);
  const created = await intent(admin, 'YEARBOOK');
  classPhoto = ((await created.json()) as { id: string }).id;
  assert.equal((await upload(classPhoto, admin)).status, 200);
  assert.equal(
    (await call('/media/' + classPhoto + '/complete', admin, {})).status,
    200,
  );
  draft.sections[0]!.assetIds = [classPhoto];
  assert.equal((await call(path, admin, draft, 'PATCH')).status, 200);
  assert.equal(
    (await call('/media/' + classPhoto + '/content', student)).status,
    200,
  );
  assert.equal((await call(path, admin, draft, 'PATCH')).status, 409);
  assert.equal(
    (
      await call(
        `/classes/${foreignClassId}/yearbook`,
        outsider,
        draft,
        'PATCH',
      )
    ).status,
    400,
  );
  const book = (await (await call(path, student)).json()) as {
    version: number;
    sections: { id: string }[];
    status: string;
  };
  assert.equal(book.status, 'DRAFT');
  assert.equal(book.version, 1);
  const foreignId = randomUUID();
  assert.equal(
    (
      await call(
        path,
        admin,
        {
          ...draft,
          version: 1,
          sections: [{ ...draft.sections[0], id: foreignId }],
        },
        'PATCH',
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        path,
        admin,
        {
          ...draft,
          version: 1,
          sections: [{ ...draft.sections[0], assetIds: [photo] }],
        },
        'PATCH',
      )
    ).status,
    400,
  );
  assert.equal(
    (await call(`/classes/${classId}/yearbook/publish`, admin, {})).status,
    404,
  );
});
test('database foreign keys reject cross-class profiles and media references', async () => {
  await assert.rejects(
    db.profile.create({
      data: {
        membershipId: memberId,
        classId: foreignClassId,
        displayName: 'Invalid',
      },
    }),
  );
  const foreignMember = await db.classMembership.findUniqueOrThrow({
    where: { classId_userId: { classId: foreignClassId, userId: outsider.id } },
  });
  await assert.rejects(
    db.profile.create({
      data: {
        membershipId: foreignMember.id,
        classId: foreignClassId,
        displayName: 'Invalid',
        photoAssetId: photo,
      },
    }),
  );
  await assert.rejects(
    db.yearbook.update({ where: { classId }, data: { version: 0 } }),
  );
});
test('deletion detaches references, advances draft versions, is retryable and audited', async () => {
  assert.equal(
    (await call('/media/' + photo, student, { profileVersion: 1 }, 'DELETE'))
      .status,
    409,
  );
  assert.equal(
    (await db.profile.findUniqueOrThrow({ where: { membershipId: memberId } }))
      .photoAssetId,
    photo,
  );
  assert.equal(
    (await call('/media/' + classPhoto, student, {}, 'DELETE')).status,
    404,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await call('/media/' + classPhoto, admin, {}, 'DELETE')).status,
      200,
    );
  assert.equal(
    (await call('/media/' + classPhoto + '/content', student)).status,
    404,
  );
  assert.equal(
    (await db.yearbook.findUniqueOrThrow({ where: { classId } })).version,
    2,
  );
  assert.equal(
    await db.yearbookSectionMedia.count({ where: { assetId: classPhoto } }),
    0,
  );
  assert.equal(
    (await call('/media/' + photo, student, {}, 'DELETE')).status,
    200,
  );
  const current = await db.profile.findUniqueOrThrow({
    where: { membershipId: memberId },
  });
  assert.equal(current.photoAssetId, null);
  assert.equal(current.version, 4);
  assert.ok(
    await db.auditLog.count({ where: { classId, action: 'media.delete' } }),
  );
  const logs = JSON.stringify(
    await db.auditLog.findMany({ where: { classId } }),
  );
  assert.ok(!logs.includes('private-contact'));
  assert.ok(!logs.includes(student.token));
});
test('cleanup removes expired uploads and preserves referenced assets; removal revokes profile/draft access', async () => {
  assert.ok((await cleanupMedia(db, storage)) >= 1);
  await db.classMembership.update({
    where: { id: memberId },
    data: { status: 'REMOVED' },
  });
  assert.equal(
    (await call(`/classes/${classId}/yearbook`, student)).status,
    404,
  );
  assert.equal(
    (await call(`/classes/${classId}/members/me/profile`, student)).status,
    404,
  );
  const members = (await (
    await call(`/classes/${classId}/yearbook/members`, admin)
  ).json()) as { items: unknown[] };
  assert.equal(members.items.length, 0);
});
