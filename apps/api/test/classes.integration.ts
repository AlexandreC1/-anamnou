import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database.js';
import { parseEnvironment } from '../src/config.js';
import { hashToken, newToken } from '../src/auth/security.js';

const env = parseEnvironment(process.env);
if (env.APP_ENV === 'production')
  throw new Error('Tests cannot run in production.');
const db = createDatabase(env.DATABASE_URL);
const users = [0, 1, 2, 3, 4, 5].map(() => ({
  id: randomUUID(),
  token: newToken(),
}));
const admin = users[0]!;
const student = users[1]!;
const other = users[2]!;
const second = users[3]!;
const guest = users[4]!;
const platform = users[5]!;
let app: INestApplication;
let base = '';
let schoolId = '';
let classId = '';
let otherSchool = '';
let otherClass = '';
let code = '';
let invitationId = '';
let memberId = '';
type Actor = typeof admin;
async function call(
  path: string,
  actor?: Actor,
  body?: object,
  method = body ? 'POST' : 'GET',
) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: env.PUBLIC_WEB_URL,
      'Content-Type': 'application/json',
      ...(actor ? { Cookie: 'yearbook_session=' + actor.token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function invite(role = 'MEMBER', maxUses = 1) {
  const response = await call('/classes/' + classId + '/invitations', admin, {
    role,
    maxUses,
  });
  assert.equal(response.status, 201);
  return (await response.json()) as { code: string; id: string; url: string };
}
before(async () => {
  app = await createApp(env);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  for (const user of users)
    await db.user.create({
      data: {
        id: user.id,
        email: user.id + '@example.test',
        displayName: 'Fictional ' + user.id,
        passwordHash: 'test-fixture-not-a-login-password',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        role: user === platform ? 'PLATFORM_ADMIN' : 'USER',
        sessions: {
          create: {
            tokenHash: hashToken(user.token),
            expiresAt: new Date(Date.now() + 600000),
          },
        },
      },
    });
});
after(async () => {
  if (app) await app.close();
  const ids = users.map((user) => user.id);
  const classes = await db.class.findMany({
    where: { school: { admins: { some: { userId: { in: ids } } } } },
    select: { id: true, schoolId: true },
  });
  const classIds = classes.map((klass) => klass.id);
  await db.invitationAcceptance.deleteMany({
    where: { classId: { in: classIds } },
  });
  await db.invitation.deleteMany({ where: { classId: { in: classIds } } });
  await db.classMembership.deleteMany({ where: { classId: { in: classIds } } });
  await db.auditLog.deleteMany({
    where: {
      OR: [{ actorUserId: { in: ids } }, { classId: { in: classIds } }],
    },
  });
  await db.class.deleteMany({ where: { id: { in: classIds } } });
  const schools = await db.schoolAdmin.findMany({
    where: { userId: { in: ids } },
  });
  await db.schoolAdmin.deleteMany({ where: { userId: { in: ids } } });
  await db.school.deleteMany({
    where: { id: { in: schools.map((school) => school.schoolId) } },
  });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.authThrottle.deleteMany({
    where: { OR: ids.map((id) => ({ key: { endsWith: hashToken(id) } })) },
  });
  await db.$disconnect();
});

test('verified president creates school/class and becomes class administrator; slugs are constrained', async () => {
  assert.equal(
    (await call('/schools', undefined, { name: 'School', slug: 'school' }))
      .status,
    401,
  );
  for (const [actor, save] of [
    [admin, true],
    [other, false],
  ] as const) {
    const response = await call('/schools', actor, {
      name: 'Fictional School',
      slug: 'school-' + actor.id,
    });
    assert.equal(response.status, 201);
    const school = (await response.json()) as { id: string };
    const klass = await call('/classes', actor, {
      schoolId: school.id,
      name: 'Fictional Class',
      slug: 'class-2026',
      graduationYear: 2026,
    });
    assert.equal(klass.status, 201);
    const value = (await klass.json()) as { id: string };
    if (save) {
      schoolId = school.id;
      classId = value.id;
    } else {
      otherSchool = school.id;
      otherClass = value.id;
    }
  }
  assert.equal(
    (
      await db.classMembership.findUniqueOrThrow({
        where: { classId_userId: { classId, userId: admin.id } },
      })
    ).role,
    'CLASS_ADMIN',
  );
  const duplicate = await call('/schools', student, {
    name: 'Duplicate',
    slug: 'school-' + admin.id,
  });
  assert.equal(duplicate.status, 409);
  assert.equal(
    JSON.stringify(await duplicate.json()).includes('Prisma'),
    false,
  );
});
test('cross-school/class IDOR, unauthorized creation and tenant reassignment are denied', async () => {
  for (const path of [
    '/schools/' + schoolId,
    '/schools/' + schoolId + '/classes',
    '/classes/' + classId,
    '/classes/' + classId + '/members',
  ])
    assert.equal((await call(path, other)).status, 404);
  assert.equal(
    (
      await call('/classes', other, {
        schoolId,
        name: 'Intrusion',
        slug: 'intrusion',
        graduationYear: 2026,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call(
        '/classes/' + classId,
        admin,
        { schoolId: otherSchool },
        'PATCH',
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        '/schools/' + schoolId,
        student,
        { name: 'Intrusion' },
        'PATCH',
      )
    ).status,
    404,
  );
  assert.equal((await call('/classes/not-a-uuid', admin)).status, 400);
});
test('invitation creation hashes code, excludes admin grants and acceptance is concurrent-safe and idempotent', async () => {
  assert.equal(
    (
      await call('/classes/' + classId + '/invitations', admin, {
        role: 'CLASS_ADMIN',
      })
    ).status,
    400,
  );
  const invitation = await invite();
  code = invitation.code;
  invitationId = invitation.id;
  assert.equal(invitation.url, env.PUBLIC_WEB_URL + '/join#code=' + code);
  const stored = await db.invitation.findUniqueOrThrow({
    where: { id: invitationId },
  });
  assert.equal(stored.tokenHash, hashToken(code));
  assert.notEqual(stored.tokenHash, code);
  const responses = await Promise.all([
    call('/invitations/accept', student, { code }),
    call('/invitations/accept', student, { code }),
  ]);
  assert.deepEqual(
    responses.map((r) => r.status),
    [200, 200],
  );
  memberId = ((await responses[0]!.json()) as { membershipId: string })
    .membershipId;
  assert.equal(
    (await db.invitation.findUniqueOrThrow({ where: { id: invitationId } }))
      .usedCount,
    1,
  );
  assert.equal(
    (await call('/invitations/accept', second, { code })).status,
    400,
  );
});
test('members cannot manage class, grant roles, invite or see invitation records; directory keeps emails private', async () => {
  assert.equal(
    (await call('/classes/' + classId, student, { name: 'Intrusion' }, 'PATCH'))
      .status,
    403,
  );
  assert.equal(
    (
      await call(
        '/classes/' + classId + '/members/' + memberId,
        student,
        { role: 'CLASS_ADMIN', status: 'ACTIVE' },
        'PATCH',
      )
    ).status,
    403,
  );
  assert.equal(
    (await call('/classes/' + classId + '/invitations', student, {})).status,
    403,
  );
  assert.equal(
    (await call('/classes/' + classId + '/invitations', student)).status,
    403,
  );
  assert.equal((await call('/classes/' + otherClass, student)).status, 404);
  const directory = (await (
    await call('/classes/' + classId + '/members', student)
  ).json()) as { items: Record<string, unknown>[] };
  assert.equal(directory.items.length, 2);
  for (const row of directory.items)
    assert.deepEqual(Object.keys(row).sort(), [
      'displayName',
      'id',
      'joinedAt',
      'role',
      'status',
    ]);
  for (const suffix of [
    '?pageSize=51',
    '?page=-1',
    '?page=1%20OR%201=1',
    '?sort=passwordHash',
  ])
    assert.equal(
      (await call('/classes/' + classId + '/members' + suffix, student)).status,
      400,
    );
  const first = (await (
    await call('/classes/' + classId + '/members?pageSize=1', student)
  ).json()) as { hasMore: boolean; items: { id: string }[] };
  const next = (await (
    await call('/classes/' + classId + '/members?pageSize=1&page=2', student)
  ).json()) as { items: { id: string }[] };
  assert.equal(first.hasMore, true);
  assert.notEqual(first.items[0]?.id, next.items[0]?.id);
});
test('last admin and cross-class membership mutations are protected', async () => {
  const president = await db.classMembership.findUniqueOrThrow({
    where: { classId_userId: { classId, userId: admin.id } },
  });
  assert.equal(
    (
      await call(
        '/classes/' + classId + '/members/' + president.id,
        admin,
        { role: 'MEMBER', status: 'ACTIVE' },
        'PATCH',
      )
    ).status,
    409,
  );
  const foreign = await db.classMembership.findUniqueOrThrow({
    where: { classId_userId: { classId: otherClass, userId: other.id } },
  });
  assert.equal(
    (
      await call(
        '/classes/' + classId + '/members/' + foreign.id,
        admin,
        { role: 'MEMBER', status: 'ACTIVE' },
        'PATCH',
      )
    ).status,
    404,
  );
});
test('expired/revoked links cannot enroll new members, while successful acceptance remains retry-safe', async () => {
  await db.invitation.update({
    where: { id: invitationId },
    data: { expiresAt: new Date(0) },
  });
  assert.equal(
    (await call('/invitations/accept', student, { code })).status,
    200,
  );
  const expired = await invite();
  await db.invitation.update({
    where: { id: expired.id },
    data: { expiresAt: new Date(0) },
  });
  assert.equal(
    (await call('/invitations/accept', second, { code: expired.code })).status,
    400,
  );
  const revoked = await invite();
  assert.equal(
    (
      await call(
        '/classes/' + classId + '/invitations/' + revoked.id + '/revoke',
        admin,
        {},
      )
    ).status,
    200,
  );
  assert.equal(
    (await call('/invitations/accept', second, { code: revoked.code })).status,
    400,
  );
});
test('two different members racing for the last invitation use cannot exceed its maximum', async () => {
  const invitation = await invite();
  const responses = await Promise.all([
    call('/invitations/accept', second, { code: invitation.code }),
    call('/invitations/accept', other, { code: invitation.code }),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
  assert.equal(
    (await db.invitation.findUniqueOrThrow({ where: { id: invitation.id } }))
      .usedCount,
    1,
  );
});
test('removed members lose access and cannot rejoin using old or new invitations', async () => {
  assert.equal(
    (
      await call(
        '/classes/' + classId + '/members/' + memberId,
        admin,
        { role: 'MEMBER', status: 'REMOVED' },
        'PATCH',
      )
    ).status,
    200,
  );
  assert.equal((await call('/classes/' + classId, student)).status, 404);
  assert.equal(
    (await call('/invitations/accept', student, { code })).status,
    403,
  );
  const fresh = await invite();
  assert.equal(
    (await call('/invitations/accept', student, { code: fresh.code })).status,
    403,
  );
});
test('guest role is limited and platform administration is explicit', async () => {
  const invitation = await invite('GUEST');
  assert.equal(
    (await call('/invitations/accept', guest, { code: invitation.code }))
      .status,
    200,
  );
  assert.equal((await call('/classes/' + classId, guest)).status, 200);
  assert.equal(
    (await call('/classes/' + classId + '/members', guest)).status,
    403,
  );
  assert.equal(
    (
      await call(
        '/classes/' + classId,
        platform,
        { motto: 'Reviewed' },
        'PATCH',
      )
    ).status,
    200,
  );
});
test('database rejects duplicate membership, impossible invite counters and cross-tenant acceptance', async () => {
  await assert.rejects(
    db.classMembership.create({ data: { classId, userId: admin.id } }),
  );
  await assert.rejects(
    db.invitation.update({
      where: { id: invitationId },
      data: { usedCount: 2 },
    }),
  );
  await assert.rejects(
    db.invitation.update({
      where: { id: invitationId },
      data: { role: 'CLASS_ADMIN' },
    }),
  );
  const foreign = await db.classMembership.findUniqueOrThrow({
    where: { classId_userId: { classId: otherClass, userId: other.id } },
  });
  await assert.rejects(
    db.invitationAcceptance.create({
      data: { invitationId, membershipId: foreign.id, classId },
    }),
  );
  const audit = await db.auditLog.findMany({ where: { classId } });
  for (const action of [
    'class.create',
    'invitation.create',
    'invitation.accept',
    'membership.update',
    'invitation.revoke',
  ])
    assert.ok(
      audit.some(
        (row) =>
          row.action === action && row.schoolId === schoolId && row.actorUserId,
      ),
    );
  assert.equal(JSON.stringify(audit).includes(code), false);
  assert.ok(
    audit.some(
      (row) =>
        row.action === 'membership.update' &&
        JSON.stringify(row.metadata).includes('REMOVED'),
    ),
  );
});

test('concurrent administrator demotions preserve one active class administrator', async () => {
  assert.equal(
    (
      await call(
        '/classes/' + classId + '/members/' + memberId,
        platform,
        { role: 'CLASS_ADMIN', status: 'ACTIVE' },
        'PATCH',
      )
    ).status,
    200,
  );
  const president = await db.classMembership.findUniqueOrThrow({
    where: { classId_userId: { classId, userId: admin.id } },
  });
  const responses = await Promise.all(
    [president.id, memberId].map((id) =>
      call(
        '/classes/' + classId + '/members/' + id,
        platform,
        { role: 'MEMBER', status: 'ACTIVE' },
        'PATCH',
      ),
    ),
  );
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 409],
  );
  assert.equal(
    await db.classMembership.count({
      where: { classId, role: 'CLASS_ADMIN', status: 'ACTIVE' },
    }),
    1,
  );
});

test('production invitations require school approval and school identity edits revoke it', async () => {
  const { InvitationsService } = await import('../src/classes/invitations.js');
  const { SchoolsService } = await import('../src/classes/schools.js');
  const { ClassAccess } = await import('../src/classes/access.js');
  const access = new ClassAccess(db);
  const invitations = new InvitationsService(access, env.PUBLIC_WEB_URL, true);
  const schools = new SchoolsService(access);
  const owner = await db.user.findUniqueOrThrow({ where: { id: admin.id } });
  const reviewer = await db.user.findUniqueOrThrow({
    where: { id: platform.id },
  });
  const input = { role: 'MEMBER' as const, maxUses: 1, expiresInDays: 1 };
  await assert.rejects(
    invitations.create(owner, classId, input),
    /School approval/,
  );
  await assert.rejects(
    async () =>
      schools.verify(
        owner,
        schoolId,
        true,
        'Reviewed institutional ownership evidence.',
      ),
    /Forbidden/,
  );
  await schools.verify(
    reviewer,
    schoolId,
    true,
    'Reviewed institutional ownership evidence.',
  );
  const approved = await invitations.create(owner, classId, input);
  await schools.update(owner, schoolId, {
    name: 'Renamed school requiring review',
  });
  assert.equal(
    (await db.school.findUniqueOrThrow({ where: { id: schoolId } })).verifiedAt,
    null,
  );
  await assert.rejects(
    invitations.accept(owner, approved.code),
    /School approval/,
  );
});
