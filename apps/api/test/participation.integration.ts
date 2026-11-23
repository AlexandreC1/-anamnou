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

test('production participation denies pending content, separates reviewers, protects tenants and hides withdrawn content', async () => {
  const local = parseEnvironment(process.env);
  if (local.APP_ENV !== 'test')
    throw new Error('Isolated test database required.');
  const db = createDatabase(local.DATABASE_URL);
  const env = {
    ...local,
    APP_ENV: 'production' as const,
    PUBLIC_WEB_URL: 'https://app.example.org',
    STORAGE_ENDPOINT: 'https://storage.example.org',
    MAIL_FROM: 'sender@gmail.com',
    MAIL_TRANSPORT: 'gmail' as const,
    GMAIL_CLIENT_ID: 'test.apps.googleusercontent.com',
    GMAIL_CLIENT_SECRET: 'test-secret',
    GMAIL_REFRESH_TOKEN: 'test-refresh',
  };
  const app = await createApp(env);
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const schoolId = randomUUID(),
    otherSchoolId = randomUUID(),
    classId = randomUUID();
  const people = Array.from({ length: 6 }, (_, index) => ({
    id: randomUUID(),
    token: newToken(),
    codes: [...newRecoveryCodes(), ...newRecoveryCodes()],
    platform: index === 3 || index === 4,
  }));
  const [student, primary, backup, proposer, approver, outsider] = people;
  const password = newToken(),
    passwordHash = await hashPassword(password);
  const box = new SecretBox(Buffer.from(env.MFA_ENCRYPTION_KEY, 'base64'));
  const proof = (actor: (typeof people)[number]) => ({
    password,
    code: actor.codes.shift()!,
  });
  async function call(path: string, actor = student!, body?: object) {
    return fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        Origin: env.PUBLIC_WEB_URL,
        'Content-Type': 'application/json',
        Cookie: 'yearbook_session=' + actor.token,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  try {
    for (const person of people)
      await db.user.create({
        data: {
          id: person.id,
          email: person.id + '@example.test',
          displayName: 'Fictional participant',
          passwordHash,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          role: person.platform ? 'PLATFORM_ADMIN' : 'USER',
          mfaEnabledAt: new Date(),
          mfaSecret: box.seal(newTotpSecret(), person.id),
          sessions: {
            create: {
              tokenHash: hashToken(person.token),
              mfaVerifiedAt: new Date(),
              expiresAt: new Date(Date.now() + 3600000),
            },
          },
          mfaRecoveryCodes: {
            create: person.codes.map((code) => ({
              codeHash: recoveryCodeHash(code),
            })),
          },
        },
      });
    for (const id of [schoolId, otherSchoolId])
      await db.school.create({
        data: {
          id,
          name: 'Fictional Institution',
          slug: 'participation-' + id,
          verifiedAt: new Date(),
        },
      });
    await db.class.create({
      data: {
        id: classId,
        schoolId,
        name: 'Fictional Class',
        slug: 'fictional',
        graduationYear: 2027,
      },
    });
    const memberships = [];
    for (const [index, person] of [student!, primary!, backup!].entries())
      memberships.push(
        await db.classMembership.create({
          data: {
            classId,
            userId: person.id,
            role: index === 0 ? 'CLASS_ADMIN' : 'MEMBER',
          },
        }),
      );
    const member = memberships[0]!,
      reviewerMember = memberships[1]!;
    const grants = [];
    for (const person of [primary!, backup!])
      grants.push(
        await db.governanceGrant.create({
          data: {
            schoolId,
            userId: person.id,
            requestedById: proposer!.id,
            approvedById: approver!.id,
            approvedAt: new Date(),
            status: 'ACTIVE',
            role: 'CONSENT_REVIEWER',
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
      );
    await db.reviewQueue.create({
      data: {
        schoolId,
        name: 'Participation review',
        role: 'CONSENT_REVIEWER',
        primaryGrantId: grants[0]!.id,
        primaryUserId: primary!.id,
        backupGrantId: grants[1]!.id,
        backupUserId: backup!.id,
      },
    });
    // Neither a class administrator nor a platform administrator bypasses the gate.
    assert.equal((await call('/classes/' + classId)).status, 403);
    assert.equal((await call('/classes/' + classId, proposer!)).status, 403);
    assert.equal((await call('/classes/' + classId + '/yearbook')).status, 403);
    assert.equal(
      (
        await call('/media/upload-intent', student!, {
          classId,
          purpose: 'PROFILE',
          contentType: 'image/jpeg',
          size: 100,
          alt: 'Fictional portrait',
        })
      ).status,
      403,
    );
    const policyResponse = await call(
      '/governance/participation/policies',
      proposer!,
      {
        ...proof(proposer!),
        schoolId,
        jurisdiction: 'Pilot jurisdiction reviewed externally',
        notice:
          'This is a fictional test policy, not a legal notice. Participation authorizes only the private class workspace and its content under the reviewed institutional process.',
        reviewReference: 'review-test-001',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    );
    assert.equal(policyResponse.status, 201);
    const policy = (await policyResponse.json()) as { id: string };
    const requestPath = '/me/participation/' + member.id + '/request';
    assert.equal(
      (await call(requestPath, student!, { policyId: policy.id, version: 0 }))
        .status,
      409,
    );
    assert.equal(
      (
        await call(
          '/governance/participation/policies/' + policy.id + '/approve',
          proposer!,
          {
            ...proof(proposer!),
            reason: 'Attempted self approval must be denied.',
          },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          '/governance/participation/policies/' + policy.id + '/approve',
          approver!,
          {
            ...proof(approver!),
            reason:
              'Reviewed policy and institutional responsibilities independently.',
          },
        )
      ).status,
      200,
    );
    await assert.rejects(
      db.participationPolicy.update({
        where: { id: policy.id },
        data: { notice: 'Rewritten notice must be rejected.' },
      }),
    );
    assert.equal(
      (await call('/me/participation/' + member.id + '/policies', outsider!))
        .status,
      404,
    );
    assert.equal(
      (await call(requestPath, outsider!, { policyId: policy.id, version: 0 }))
        .status,
      404,
    );
    const request = await call(requestPath, student!, {
      policyId: policy.id,
      version: 0,
    });
    assert.equal(request.status, 200);
    assert.equal((await call('/classes/' + classId)).status, 403);
    assert.equal(
      (await call('/governance/participation?schoolId=' + schoolId, proposer!))
        .status,
      404,
    );
    assert.equal(
      (
        await call(
          '/governance/participation?schoolId=' + otherSchoolId,
          primary!,
        )
      ).status,
      404,
    );
    assert.equal(
      (await call('/governance/participation?schoolId=' + schoolId, primary!))
        .status,
      200,
    );
    const decision = {
      version: 1,
      approve: true,
      authority: 'GUARDIAN',
      reviewReference: 'review-test-002',
      reason:
        'Reviewed the required authorization under the approved pilot policy.',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    assert.equal(
      (
        await call(
          '/me/participation/' + reviewerMember.id + '/request',
          primary!,
          { policyId: policy.id, version: 0 },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          '/governance/participation/' + reviewerMember.id + '/decision',
          primary!,
          { ...decision, ...proof(primary!) },
        )
      ).status,
      403,
    );
    const outcomes = await Promise.all(
      [primary!, backup!].map((actor) =>
        call('/governance/participation/' + member.id + '/decision', actor, {
          ...decision,
          ...proof(actor),
        }),
      ),
    );
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await call('/classes/' + classId)).status, 200);
    assert.equal((await call('/classes/' + classId + '/yearbook')).status, 200);
    await db.profile.create({
      data: {
        classId,
        membershipId: member.id,
        displayName: 'Fictional participant',
        quote: 'Fictional shared quote',
        visibility: 'CLASS',
      },
    });
    // Approve the other member independently so their reader can verify withdrawal.
    assert.equal(
      (
        await call(
          '/governance/participation/' + reviewerMember.id + '/decision',
          backup!,
          { ...decision, ...proof(backup!) },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          '/classes/' + classId + '/members/' + member.id + '/profile',
          primary!,
        )
      ).status,
      200,
    );
    const withdrawal = await call(
      '/me/participation/' + member.id + '/withdraw',
      student!,
      { version: 2 },
    );
    assert.equal(withdrawal.status, 200);
    assert.equal((await call('/classes/' + classId)).status, 403);
    assert.equal(
      (
        await call(
          '/classes/' + classId + '/members/' + member.id + '/profile',
          primary!,
        )
      ).status,
      404,
    );
    const reader = await call(
      '/classes/' + classId + '/yearbook/members?kind=MEMBERS',
      primary!,
    );
    assert.equal(reader.status, 200);
    assert.ok(
      !JSON.stringify(await reader.json()).includes('Fictional shared quote'),
    );
    // Re-activating a normal membership cannot undo a withdrawn authorization.
    await db.classMembership.update({
      where: { id: member.id },
      data: { status: 'ACTIVE', role: 'CLASS_ADMIN' },
    });
    assert.equal((await call('/classes/' + classId)).status, 403);
    assert.equal((await call('/me/participation')).status, 200);
    assert.equal(
      (await call(requestPath, student!, { policyId: policy.id, version: 1 }))
        .status,
      409,
    );
    assert.equal(
      (await call(requestPath, student!, { policyId: policy.id, version: 3 }))
        .status,
      200,
    );
    await db.governanceGrant.update({
      where: { id: grants[1]!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.equal(
      (
        await call(
          '/governance/participation/' + member.id + '/decision',
          primary!,
          { ...decision, version: 4, ...proof(primary!) },
        )
      ).status,
      404,
    );
    const logs = await db.auditLog.findMany({
      where: { schoolId, action: { startsWith: 'participation.' } },
    });
    assert.ok(logs.some((row) => row.action === 'participation.withdrawn'));
    assert.ok(logs.some((row) => row.action === 'participation.approved'));
    assert.ok(!JSON.stringify(logs).includes('review-test-002'));
    const events = await db.participationEvent.findMany({
      where: { authorization: { membershipId: member.id } },
      orderBy: { version: 'asc' },
    });
    assert.deepEqual(
      events.map((event) => event.action),
      ['REQUESTED', 'APPROVED', 'WITHDRAWN', 'REQUESTED'],
    );
    assert.ok(JSON.stringify(events[1]!.details).includes('review-test-002'));
  } finally {
    await app.close();
    await db.participationEvent.deleteMany({ where: { schoolId } });
    await db.participationAuthorization.deleteMany({ where: { schoolId } });
    await db.participationPolicy.deleteMany({ where: { schoolId } });
    await db.reviewQueue.deleteMany({ where: { schoolId } });
    await db.governanceGrant.deleteMany({ where: { schoolId } });
    await db.auditLog.deleteMany({
      where: { schoolId: { in: [schoolId, otherSchoolId] } },
    });
    await db.profile.deleteMany({ where: { classId } });
    await db.classMembership.deleteMany({ where: { classId } });
    await db.class.deleteMany({ where: { id: classId } });
    await db.school.deleteMany({
      where: { id: { in: [schoolId, otherSchoolId] } },
    });
    await db.user.deleteMany({
      where: { id: { in: people.map((p) => p.id) } },
    });
    await db.$disconnect();
  }
});
