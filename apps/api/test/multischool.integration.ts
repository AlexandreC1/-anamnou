import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database.js';
import { parseEnvironment } from '../src/config.js';
import { hashToken, newToken } from '../src/auth/security.js';

const env = parseEnvironment(process.env);
const databaseUrl = new URL(env.DATABASE_URL);
if (
  env.APP_ENV !== 'test' ||
  !databaseUrl.pathname.endsWith('_test') ||
  !['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname)
) {
  throw new Error(
    'Multi-school verification requires an isolated local test database.',
  );
}
const db = createDatabase(env.DATABASE_URL);
const schools = Array.from({ length: 4 }, (_, index) => ({
  id: randomUUID(),
  userId: randomUUID(),
  token: newToken(),
  name: `Concurrent school ${index + 1}`,
  classes: Array.from({ length: 2 }, (_, classIndex) => ({
    id: randomUUID(),
    memberId: randomUUID(),
    name: `Edition ${index + 1}.${classIndex + 1}`,
  })),
}));
const apps: INestApplication[] = [];
const bases: string[] = [];
const profileFields = {
  nickname: null,
  bio: 'Shared class story',
  quote: 'A shared chapter',
  activities: null,
  aspiration: null,
  contact: 'private@example.test',
  visibility: 'CLASS',
  contactVisibility: 'PRIVATE',
  photoAssetId: null,
} as const;

async function request(
  instance: number,
  path: string,
  school: (typeof schools)[number],
  body?: object,
) {
  return fetch(bases[instance] + path, {
    method: body ? 'PATCH' : 'GET',
    headers: {
      Cookie: 'yearbook_session=' + school.token,
      Origin: env.PUBLIC_WEB_URL,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

before(async () => {
  for (const school of schools) {
    await db.user.create({
      data: {
        id: school.userId,
        email: school.userId + '@example.test',
        displayName: school.name + ' administrator',
        passwordHash: 'fixture-not-a-login-password',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        sessions: {
          create: {
            tokenHash: hashToken(school.token),
            expiresAt: new Date(Date.now() + 600000),
          },
        },
      },
    });
    await db.school.create({
      data: {
        id: school.id,
        slug: school.id,
        name: school.name,
        admins: { create: { userId: school.userId } },
        classes: {
          create: school.classes.map((klass, index) => ({
            id: klass.id,
            name: klass.name,
            slug: 'class-' + index,
            graduationYear: 2026,
            memberships: {
              create: {
                id: klass.memberId,
                userId: school.userId,
                role: 'CLASS_ADMIN',
              },
            },
            yearbook: {
              create: {
                title: klass.name,
                theme: 'PAPER',
                sections: {
                  create: {
                    type: 'MEMBERS',
                    title: klass.name,
                    position: 0,
                    body: '',
                  },
                },
              },
            },
          })),
        },
      },
    });
    for (const klass of school.classes)
      await db.profile.create({
        data: {
          ...profileFields,
          classId: klass.id,
          membershipId: klass.memberId,
          displayName: klass.name + ' member',
          version: 1,
        },
      });
  }
  for (let index = 0; index < 2; index++) {
    const app = await createApp(env);
    apps.push(app);
    await app.listen(0, '127.0.0.1');
    bases.push(await app.getUrl());
  }
});

after(async () => {
  await Promise.all(apps.map((app) => app.close()));
  const schoolIds = schools.map((school) => school.id);
  const userIds = schools.map((school) => school.userId);
  const classIds = schools.flatMap((school) =>
    school.classes.map((klass) => klass.id),
  );
  const scope = { classId: { in: classIds } };
  await db.profile.deleteMany({ where: scope });
  await db.yearbookSection.deleteMany({ where: scope });
  await db.yearbook.deleteMany({ where: scope });
  await db.auditLog.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await db.classMembership.deleteMany({ where: scope });
  await db.class.deleteMany({ where: { id: { in: classIds } } });
  await db.schoolAdmin.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await db.school.deleteMany({ where: { id: { in: schoolIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});

test('database sessions authorize the same school on either API instance', async () => {
  for (const school of schools)
    for (const instance of [0, 1]) {
      const response = await request(
        instance,
        '/schools/' + school.id + '/classes',
        school,
      );
      assert.equal(response.status, 200);
      const body = (await response.json()) as { items: { id: string }[] };
      assert.deepEqual(
        body.items.map((item) => item.id).sort(),
        school.classes.map((klass) => klass.id).sort(),
      );
    }
});

test('concurrent yearbook reads preserve isolation across four schools and two API instances', async (context) => {
  const durations: number[] = [];
  const started = performance.now();
  for (let round = 0; round < 4; round++) {
    await Promise.all(
      schools.flatMap((school, schoolIndex) =>
        school.classes.flatMap((klass, classIndex) => {
          const instance = (round + classIndex) % 2;
          const foreign = schools[(schoolIndex + 1) % schools.length]!;
          const path = `/classes/${klass.id}/yearbook/members?kind=MEMBERS&pageSize=3`;
          return [school, foreign].map(async (actor) => {
            const start = performance.now();
            const response = await request(instance, path, actor);
            const body = (await response.json()) as {
              items?: { membershipId: string; displayName: string }[];
            };
            durations.push(performance.now() - start);
            assert.equal(response.status, actor === school ? 200 : 404);
            if (actor === school) {
              assert.deepEqual(
                body.items?.map((member) => member.membershipId),
                [klass.memberId],
              );
              assert.equal(
                body.items?.[0]?.displayName,
                klass.name + ' member',
              );
              assert.equal(
                JSON.stringify(body).includes('private@example.test'),
                false,
              );
            } else {
              assert.equal(body.items, undefined);
              assert.equal(JSON.stringify(body).includes(klass.name), false);
            }
          });
        }),
      ),
    );
  }
  durations.sort((a, b) => a - b);
  const percentile = (fraction: number) =>
    Math.round(durations[Math.ceil(durations.length * fraction) - 1]!);
  context.diagnostic(
    JSON.stringify({
      scenario: 'local-multischool-read-smoke',
      schools: 4,
      classes: 8,
      apiInstances: 2,
      concurrency: 16,
      requests: durations.length,
      elapsedMs: Math.round(performance.now() - started),
      p50Ms: percentile(0.5),
      p95Ms: percentile(0.95),
      maxMs: durations.at(-1) && Math.round(durations.at(-1)!),
      note: 'Includes authorized reads and denials; not a production capacity benchmark.',
    }),
  );
});

test('edits through different API instances retain version conflicts and a single audit record', async () => {
  const school = schools[0]!;
  const klass = school.classes[0]!;
  const path = `/classes/${klass.id}/members/me/profile`;
  const responses = await Promise.all(
    [0, 1].map((instance) =>
      request(instance, path, school, {
        ...profileFields,
        version: 1,
        displayName: 'Saved by instance ' + instance,
      }),
    ),
  );
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 409],
  );
  const winner = responses.findIndex((response) => response.status === 200);
  const profile = await db.profile.findUniqueOrThrow({
    where: { membershipId: klass.memberId },
  });
  assert.equal(profile.version, 2);
  assert.equal(profile.displayName, 'Saved by instance ' + winner);
  const audits = await db.auditLog.findMany({
    where: { classId: klass.id, action: 'profile.update' },
  });
  assert.equal(audits.length, 1);
  assert.equal(audits[0]?.actorUserId, school.userId);
  assert.equal(audits[0]?.schoolId, school.id);
});
