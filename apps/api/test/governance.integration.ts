import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database.js';
import { parseEnvironment } from '../src/config.js';
import { hashPassword } from '../src/auth/hashing.js';
import { hashToken, newToken } from '../src/auth/security.js';
import {
  newRecoveryCodes,
  newTotpSecret,
  recoveryCodeHash,
  SecretBox,
} from '../src/auth/mfa.js';

test('governance enforces independent grants, tenant scope, MFA, backup coverage and audited reassignment', async () => {
  const env = parseEnvironment(process.env);
  if (env.APP_ENV !== 'test')
    throw new Error('Isolated test database required');
  const db = createDatabase(env.DATABASE_URL);
  const app = await createApp(env);
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const schoolIds = [randomUUID(), randomUUID()];
  const users = Array.from({ length: 7 }, (_, index) => ({
    id: randomUUID(),
    token: newToken(),
    codes: [
      ...newRecoveryCodes(),
      ...newRecoveryCodes(),
      ...newRecoveryCodes(),
    ],
    platform: index < 2 || index === 6,
  }));
  const [
    requester,
    approver,
    manager,
    primary,
    backup,
    outsider,
    thirdApprover,
  ] = users;
  const password = newToken();
  const passwordHash = await hashPassword(password);
  const box = new SecretBox(Buffer.from(env.MFA_ENCRYPTION_KEY, 'base64'));
  const call = (
    path: string,
    actor = requester!,
    body?: object,
    method = body ? 'POST' : 'GET',
  ) =>
    fetch(base + path, {
      method,
      headers: {
        Origin: env.PUBLIC_WEB_URL,
        'Content-Type': 'application/json',
        Cookie: 'yearbook_session=' + actor.token,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const proof = (actor: (typeof users)[number]) => ({
    password,
    code: actor.codes.shift()!,
  });
  const role = 'CONSENT_REVIEWER';
  try {
    for (const user of users) {
      await db.user.create({
        data: {
          id: user.id,
          email: user.id + '@example.test',
          displayName: 'Fictional Reviewer',
          status: 'ACTIVE',
          role: user.platform ? 'PLATFORM_ADMIN' : 'USER',
          passwordHash,
          emailVerifiedAt: new Date(),
          mfaEnabledAt: new Date(),
          mfaSecret: box.seal(newTotpSecret(), user.id),
          sessions: {
            create: {
              tokenHash: hashToken(user.token),
              mfaVerifiedAt: new Date(),
              expiresAt: new Date(Date.now() + 3600000),
            },
          },
          mfaRecoveryCodes: {
            create: user.codes.map((code) => ({
              codeHash: recoveryCodeHash(code),
            })),
          },
        },
      });
    }
    for (const id of schoolIds)
      await db.school.create({
        data: { id, name: 'Fictional Institution', slug: 'governance-' + id },
      });
    const request = async (
      userId: string,
      grantRole = role,
      schoolId = schoolIds[0]!,
    ) => {
      const response = await call('/governance/grants', requester!, {
        ...proof(requester!),
        schoolId,
        userId,
        role: grantRole,
        expiresInDays: 7,
      });
      assert.equal(response.status, 201);
      return (await response.json()) as { id: string; status: string };
    };
    const approve = async (id: string) => {
      const response = await call(
        '/governance/grants/' + id + '/approve',
        approver!,
        {
          ...proof(approver!),
          reason:
            'Reviewed institutional authorization and reviewer responsibilities.',
        },
      );
      assert.equal(response.status, 200);
      assert.equal(
        ((await response.json()) as { status: string }).status,
        'ACTIVE',
      );
    };
    const managerGrant = await request(manager!.id, 'QUEUE_MANAGER');
    assert.equal(
      (
        await call(
          '/governance/grants/' + managerGrant.id + '/approve',
          requester!,
          {
            ...proof(requester!),
            reason: 'Attempting to approve the original request independently.',
          },
        )
      ).status,
      403,
    );
    await approve(managerGrant.id);
    const primaryGrant = await request(primary!.id);
    const backupGrant = await request(backup!.id);
    const otherSchoolGrant = await request(outsider!.id, role, schoolIds[1]);
    for (const grant of [primaryGrant, backupGrant, otherSchoolGrant])
      await approve(grant.id);
    const concurrentGrant = await request(primary!.id, 'PRIVACY_REVIEWER');
    const competing = await Promise.all(
      [approver!, thirdApprover!].map((actor) =>
        call('/governance/grants/' + concurrentGrant.id + '/approve', actor, {
          ...proof(actor),
          reason: 'Independent approval of a scoped privacy review assignment.',
        }),
      ),
    );
    assert.deepEqual(
      competing.map((response) => response.status).sort(),
      [200, 409],
    );
    const queueBody = {
      schoolId: schoolIds[0],
      name: 'Participation review',
      role,
      primaryGrantId: primaryGrant.id,
      backupGrantId: backupGrant.id,
    };
    assert.equal(
      (
        await call('/governance/queues', requester!, {
          ...queueBody,
          ...proof(requester!),
        })
      ).status,
      404,
    ); // No implicit management grant.
    assert.equal(
      (
        await call('/governance/queues', manager!, {
          ...queueBody,
          backupGrantId: primaryGrant.id,
          ...proof(manager!),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call('/governance/queues', manager!, {
          ...queueBody,
          backupGrantId: otherSchoolGrant.id,
          ...proof(manager!),
        })
      ).status,
      409,
    );
    const created = await call('/governance/queues', manager!, {
      ...queueBody,
      ...proof(manager!),
    });
    assert.equal(created.status, 201);
    const queue = (await created.json()) as { id: string; version: number };
    assert.equal(queue.version, 1);
    const list = await call(
      '/governance/queues?schoolId=' + schoolIds[0],
      primary!,
    );
    assert.equal(list.status, 200);
    for (const [actor, expected] of [
      [manager!, true],
      [requester!, false],
      [primary!, false],
    ] as const) {
      const response = await call(
        '/governance/queues?schoolId=' + schoolIds[0],
        actor,
      );
      assert.equal(response.status, 200);
      assert.equal(
        ((await response.json()) as { permissions: { manageQueues: boolean } })
          .permissions.manageQueues,
        expected,
      );
    }
    assert.equal(
      ((await list.json()) as { items: { covered: boolean }[] }).items[0]!
        .covered,
      true,
    );
    assert.equal(
      (await call('/governance/queues?schoolId=' + schoolIds[0], outsider!))
        .status,
      404,
    );
    await db.session.update({
      where: { tokenHash: hashToken(manager!.token) },
      data: { mfaVerifiedAt: null },
    });
    assert.equal(
      (await call('/governance/queues?schoolId=' + schoolIds[0], manager!))
        .status,
      403,
    );
    await db.session.update({
      where: { tokenHash: hashToken(manager!.token) },
      data: { mfaVerifiedAt: new Date() },
    });
    await db.governanceGrant.update({
      where: { id: backupGrant.id },
      data: {
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(Date.now() - 86400000),
      },
    });
    const uncovered = await call(
      '/governance/queues?schoolId=' + schoolIds[0],
      manager!,
    );
    const coverage = (
      (await uncovered.json()) as {
        items: { covered: boolean; backupAvailable: boolean }[];
      }
    ).items[0]!;
    assert.equal(coverage.covered, false);
    assert.equal(coverage.backupAvailable, false);
    assert.equal(
      (await call('/governance/queues?schoolId=' + schoolIds[0], backup!))
        .status,
      404,
    );
    assert.equal(
      (
        await call(
          '/governance/grants/' + backupGrant.id + '/revoke',
          approver!,
          {
            ...proof(approver!),
            reason:
              'Replacing an expired reviewer grant with a renewed authorization.',
          },
        )
      ).status,
      200,
    );
    const renewal = await request(backup!.id);
    await approve(renewal.id);
    const { schoolId: omitted, ...update } = queueBody;
    assert.ok(omitted);
    const changed = { ...update, backupGrantId: renewal.id, version: 1 };
    assert.equal(
      (
        await call(
          '/governance/queues/' + queue.id,
          manager!,
          { ...changed, ...proof(manager!) },
          'PATCH',
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          '/governance/queues/' + queue.id,
          manager!,
          { ...changed, ...proof(manager!) },
          'PATCH',
        )
      ).status,
      409,
    );
    await assert.rejects(
      db.reviewQueue.update({
        where: { id: queue.id },
        data: { backupGrantId: primaryGrant.id, backupUserId: primary!.id },
      }),
    );
    await assert.rejects(
      db.governanceGrant.update({
        where: { id: primaryGrant.id },
        data: { approvedById: requester!.id },
      }),
    );
    const logs = await db.auditLog.findMany({
      where: { schoolId: { in: schoolIds } },
    });
    assert.ok(logs.some((log) => log.action === 'governance.queue_reassigned'));
    const serialized = JSON.stringify(logs);
    assert.ok(!serialized.includes(password));
    assert.ok(users.every((user) => !serialized.includes(user.token)));
    assert.equal(
      (
        await call(
          '/governance/grants/' + managerGrant.id + '/revoke',
          approver!,
          {
            ...proof(approver!),
            reason:
              'Removing management privileges following an access review.',
          },
        )
      ).status,
      200,
    );
    assert.equal(
      (await call('/governance/queues?schoolId=' + schoolIds[0], manager!))
        .status,
      404,
    );
  } finally {
    await app.close();
    await db.reviewQueue.deleteMany({ where: { schoolId: { in: schoolIds } } });
    await db.governanceGrant.deleteMany({
      where: { schoolId: { in: schoolIds } },
    });
    await db.auditLog.deleteMany({
      where: {
        OR: [
          { schoolId: { in: schoolIds } },
          { actorUserId: { in: users.map((user) => user.id) } },
        ],
      },
    });
    await db.school.deleteMany({ where: { id: { in: schoolIds } } });
    for (const user of users)
      await db.authThrottle.deleteMany({
        where: { key: { endsWith: hashToken(user.id) } },
      });
    await db.user.deleteMany({
      where: { id: { in: users.map((user) => user.id) } },
    });
    await db.$disconnect();
  }
});
