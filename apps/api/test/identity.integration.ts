import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database.js';
import { parseEnvironment } from '../src/config.js';
import { hashToken, newToken } from '../src/auth/security.js';
import { IdentityService } from '../src/auth/service.js';
import { totp } from '../src/auth/mfa.js';

const environment = parseEnvironment(process.env);
if (environment.APP_ENV === 'production')
  throw new Error('Tests cannot run in production.');
const database = createDatabase(environment.DATABASE_URL);
async function fixture(overrides: Partial<typeof environment> = {}) {
  const app = await createApp({ ...environment, ...overrides });
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  const email = `identity-${randomUUID()}@example.test`;
  const password = newToken();
  const call = (
    path: string,
    body?: object,
    cookie?: string,
    origin = environment.PUBLIC_WEB_URL,
    method = body ? 'POST' : 'GET',
  ) =>
    fetch(url + path, {
      method,
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const register = () =>
    call('/auth/register', {
      email,
      password,
      displayName: 'Test Reader',
      locale: 'en',
    });
  const verify = async () => {
    assert.equal((await register()).status, 202);
    assert.equal(
      (
        await call('/auth/verify-email', {
          token: await mailToken(email, 'verify-email'),
        })
      ).status,
      200,
    );
  };
  const login = async () => {
    const response = await call('/auth/login', { email, password });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie')?.split(';')[0] ?? '';
  };
  const close = async () => {
    await app.close();
    const user = await database.user.findUnique({ where: { email } });
    if (user) {
      await database.auditLog.deleteMany({ where: { targetId: user.id } });
      await database.user.delete({ where: { id: user.id } });
    }
    await database.authThrottle.deleteMany({
      where: { key: { endsWith: hashToken(email) } },
    });
  };
  return { app, url, email, password, call, register, verify, login, close };
}
async function mailToken(email: string, route: string, previous = '') {
  for (let attempt = 0; attempt < 100; attempt++) {
    const list = (await (
      await fetch(
        'http://127.0.0.1:8025/api/v1/search?query=' +
          encodeURIComponent('to:' + email),
      )
    ).json()) as { messages: { ID: string }[] };
    for (const item of list.messages) {
      const message = (await (
        await fetch('http://127.0.0.1:8025/api/v1/message/' + item.ID)
      ).json()) as { Text: string };
      const token = new RegExp('/' + route + '#token=([a-f0-9]{64})').exec(
        message.Text,
      )?.[1];
      if (
        token &&
        token !== previous &&
        (await database.identityToken.findUnique({
          where: { tokenHash: hashToken(token) },
        }))
      )
        return token;
    }
    await setTimeout(100);
  }
  throw new Error('Expected SMTP message did not arrive.');
}

test('registration, SMTP verification, safe profile updates, cookie protection and logout', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.call('/me')).status, 401);
    assert.equal((await f.register()).status, 202);
    assert.equal(
      (await f.call('/auth/login', { email: f.email, password: f.password }))
        .status,
      401,
    );
    const token = await mailToken(f.email, 'verify-email');
    assert.equal(
      await database.identityToken.findUnique({ where: { tokenHash: token } }),
      null,
    );
    const verification = await Promise.all([
      f.call('/auth/verify-email', { token }),
      f.call('/auth/verify-email', { token }),
    ]);
    assert.deepEqual(verification.map((r) => r.status).sort(), [200, 400]);
    const response = await f.call('/auth/login', {
      email: f.email.toUpperCase(),
      password: f.password,
    });
    assert.equal(response.status, 200);
    const header = response.headers.get('set-cookie') ?? '';
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Strict/);
    const cookie = header.split(';')[0] ?? '';
    const profile = (await (
      await f.call('/me', undefined, cookie)
    ).json()) as Record<string, unknown>;
    assert.deepEqual(Object.keys(profile).sort(), [
      'displayName',
      'email',
      'emailVerified',
      'id',
      'locale',
      'mfaEnabled',
      'role',
    ]);
    assert.equal(profile.role, 'USER');
    assert.equal(
      (
        await f.call(
          '/me',
          { displayName: '<script>alert(1)</script>', locale: 'ht' },
          cookie,
          undefined,
          'PATCH',
        )
      ).status,
      200,
    );
    assert.equal((await f.call('/auth/logout', {}, cookie)).status, 200);
    assert.equal((await f.call('/me', undefined, cookie)).status, 401);
    assert.equal((await f.call('/auth/logout', {}, cookie)).status, 200);
  } finally {
    await f.close();
  }
});

test('privilege escalation, user ID injection, CSRF, malformed input and authentication bypass are denied', async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await f.call('/auth/register', {
          email: f.email,
          password: f.password,
          displayName: 'Reader',
          role: 'PLATFORM_ADMIN',
        })
      ).status,
      400,
    );
    await f.verify();
    const cookie = await f.login();
    for (const data of [
      { role: 'PLATFORM_ADMIN' },
      { id: randomUUID(), displayName: 'Other' },
      { email: 'changed@example.test' },
    ])
      assert.equal(
        (await f.call('/me', data, cookie, undefined, 'PATCH')).status,
        400,
      );
    assert.equal(
      (
        await f.call(
          '/me',
          { displayName: 'CSRF' },
          cookie,
          'https://attacker.test',
          'PATCH',
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(f.url + '/me', {
          method: 'PATCH',
          headers: { Cookie: cookie, 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
      403,
    );
    assert.equal(
      (await f.call('/me', undefined, 'yearbook_session=' + newToken())).status,
      401,
    );
    assert.equal((await f.call('/users/' + randomUUID())).status, 404);
    assert.equal(
      (
        await f.call('/auth/login', {
          email: "' OR 1=1--",
          password: f.password,
        })
      ).status,
      400,
    );
    const user = await database.user.findUniqueOrThrow({
      where: { email: f.email },
    });
    assert.throws(() => f.app.get(IdentityService).requirePlatformAdmin(user));
    assert.throws(() =>
      f.app
        .get(IdentityService)
        .requirePlatformAdmin({ ...user, role: 'PLATFORM_ADMIN' }),
    );
    assert.doesNotThrow(() =>
      f.app.get(IdentityService).requirePlatformAdmin({
        ...user,
        role: 'PLATFORM_ADMIN',
        mfaEnabledAt: new Date(),
      }),
    );
    await assert.rejects(
      database.user.update({
        where: { id: user.id },
        data: { email: f.email.toUpperCase() },
      }),
    );
    await database.user.update({
      where: { id: user.id },
      data: { status: 'DISABLED' },
    });
    assert.equal((await f.call('/me', undefined, cookie)).status, 401);
  } finally {
    await f.close();
  }
});

test('password recovery is one-use, revokes sessions and rejects expired links', async () => {
  const f = await fixture();
  try {
    await f.verify();
    const cookie = await f.login();
    assert.equal(
      (await f.call('/auth/forgot-password', { email: f.email })).status,
      202,
    );
    const token = await mailToken(f.email, 'reset-password');
    const password = newToken();
    const results = await Promise.all([
      f.call('/auth/reset-password', { token, password }),
      f.call('/auth/reset-password', { token, password }),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    assert.equal((await f.call('/me', undefined, cookie)).status, 401);
    assert.equal(
      (await f.call('/auth/login', { email: f.email, password: f.password }))
        .status,
      401,
    );
    assert.equal(
      (await f.call('/auth/login', { email: f.email, password })).status,
      200,
    );
    const user = await database.user.findUniqueOrThrow({
      where: { email: f.email },
    });
    const expired = newToken();
    await database.identityToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(expired),
        purpose: 'RESET_PASSWORD',
        expiresAt: new Date(0),
      },
    });
    assert.equal(
      (
        await f.call('/auth/reset-password', {
          token: expired,
          password: newToken(),
        })
      ).status,
      400,
    );
    assert.equal(
      await database.auditLog.count({
        where: { targetId: user.id, action: 'auth.reset_password' },
      }),
      1,
    );
  } finally {
    await f.close();
  }
});

test('duplicate registration cannot overwrite identity; recovery responses and persistent account rate limits', async () => {
  const f = await fixture();
  try {
    const responses = await Promise.all([f.register(), f.register()]);
    assert.deepEqual(
      responses.map((r) => r.status),
      [202, 202],
    );
    assert.equal(await database.user.count({ where: { email: f.email } }), 1);
    const known = await f.call('/auth/forgot-password', { email: f.email });
    const unknown = await f.call('/auth/forgot-password', {
      email: 'absent-' + f.email,
    });
    assert.equal(known.status, unknown.status);
    assert.deepEqual(await known.json(), await unknown.json());
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await f.call('/auth/login', { email: f.email, password: 'incorrect' }))
          .status,
        401,
      );
    assert.equal(
      (await f.call('/auth/login', { email: f.email, password: 'incorrect' }))
        .status,
      429,
    );
  } finally {
    await f.close();
  }
});

test('expired sessions, token purpose confusion and replacement verification links are rejected', async () => {
  const f = await fixture();
  try {
    await f.register();
    const first = await mailToken(f.email, 'verify-email');
    assert.equal(
      (
        await f.call('/auth/reset-password', {
          token: first,
          password: newToken(),
        })
      ).status,
      400,
    );
    await f.call('/auth/resend-verification', { email: f.email });
    const second = await mailToken(f.email, 'verify-email', first);
    assert.equal(
      (await f.call('/auth/verify-email', { token: first })).status,
      400,
    );
    assert.equal(
      (await f.call('/auth/verify-email', { token: second })).status,
      200,
    );
    const cookie = await f.login();
    await database.session.updateMany({
      where: { user: { email: f.email } },
      data: { expiresAt: new Date(0) },
    });
    assert.equal((await f.call('/me', undefined, cookie)).status, 401);
  } finally {
    await f.close();
  }
});

test('SMTP failure keeps a durable job and delivery resumes after API restart', async () => {
  const f = await fixture({ SMTP_PORT: 1 });
  let restarted: Awaited<ReturnType<typeof createApp>> | undefined;
  try {
    assert.equal((await f.register()).status, 202);
    for (let attempt = 0; attempt < 100; attempt++) {
      const job = await database.identityEmailJob.findFirst({
        where: { user: { email: f.email } },
      });
      if (job && job.attempts > 0 && job.leaseId === null) break;
      await setTimeout(100);
    }
    const job = await database.identityEmailJob.findFirstOrThrow({
      where: { user: { email: f.email } },
    });
    assert.ok(job.attempts > 0);
    assert.equal(
      await database.identityToken.count({ where: { userId: job.userId } }),
      0,
    );
    await f.app.close();
    await database.identityEmailJob.update({
      where: { id: job.id },
      data: { nextAttemptAt: new Date() },
    });
    restarted = await createApp(environment);
    await restarted.listen(0, '127.0.0.1');
    await mailToken(f.email, 'verify-email');
    assert.equal(
      await database.identityEmailJob.count({ where: { id: job.id } }),
      0,
    );
  } finally {
    if (restarted) await restarted.close();
    await f.close();
  }
});

test('invalid JSON, body size, content type and per-IP request limits are enforced', async () => {
  const f = await fixture();
  try {
    const headers = {
      Origin: environment.PUBLIC_WEB_URL,
      'Content-Type': 'application/json',
    };
    assert.equal(
      (
        await fetch(f.url + '/auth/login', {
          method: 'POST',
          headers,
          body: '{invalid',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(f.url + '/auth/login', {
          method: 'POST',
          headers,
          body: JSON.stringify({ password: 'a'.repeat(17000) }),
        })
      ).status,
      413,
    );
    assert.equal(
      (
        await fetch(f.url + '/auth/login', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'text/plain' },
          body: '{}',
        })
      ).status,
      415,
    );
    let status = 0;
    for (let i = 0; i < 61; i++)
      status = (await f.call('/auth/login', {})).status;
    assert.equal(status, 429);
  } finally {
    await f.close();
  }
});

test.after(async () => database.$disconnect());

test('failed logins cannot lock out the owner; sessions are private and revocable', async () => {
  // Trust the loopback proxy so each request can present a distinct client address.
  const f = await fixture({ TRUST_PROXY_CIDRS: ['127.0.0.1'] });
  const other = await fixture();
  try {
    await f.verify();
    await other.verify();
    const from = (address: string, password: string) =>
      fetch(f.url + '/auth/login', {
        method: 'POST',
        headers: {
          Origin: environment.PUBLIC_WEB_URL,
          'Content-Type': 'application/json',
          'X-Forwarded-For': address,
        },
        body: JSON.stringify({ email: f.email, password }),
      });
    const first = await f.login();
    const second = await f.login();
    const foreign = await other.login();
    for (let index = 0; index < 11; index++)
      assert.equal(
        (await from('203.0.113.7', 'incorrect')).status,
        index < 10 ? 401 : 429,
      );
    // The attacking address cannot confirm a correct guess once cut off.
    assert.equal((await from('203.0.113.7', f.password)).status, 429);
    assert.equal((await from('198.51.100.20', f.password)).status, 200);
    const current = await f.login();
    const list = await f.call('/me/sessions', undefined, current);
    assert.equal(list.status, 200);
    const sessions = (await list.json()) as { id: string; current: boolean }[];
    assert.equal(sessions.length, 4);
    assert.equal(sessions.filter((session) => session.current).length, 1);
    assert.ok(sessions.every((session) => !('tokenHash' in session)));
    const victim = sessions.find((session) => !session.current)!;
    assert.equal(
      (await other.call('/me/sessions/revoke', { id: victim.id }, foreign))
        .status,
      200,
    );
    assert.equal((await f.call('/me', undefined, first)).status, 200);
    assert.equal((await f.call('/me', undefined, second)).status, 200);
    assert.equal(
      (await f.call('/me/sessions/revoke', {}, current)).status,
      200,
    );
    for (const cookie of [first, second, current])
      assert.equal((await f.call('/me', undefined, cookie)).status, 401);
    assert.equal((await other.call('/me', undefined, foreign)).status, 200);
  } finally {
    await f.close();
    await other.close();
  }
});

function decodeBase32(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let current = 0;
  const bytes: number[] = [];
  for (const character of value) {
    current = (current << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bytes.push((current >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
const cookieValue = (response: Response, name: string) =>
  response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0] ?? '')
    .find(
      (part) => part.startsWith(name + '=') && part.length > name.length + 1,
    );

test('authenticator enrollment, MFA sign-in, replay, brute force, privilege gating and step-up', async () => {
  const f = await fixture();
  try {
    await f.verify();
    const cookie = await f.login();
    const stale = await f.login();
    assert.deepEqual(
      await (await f.call('/me/mfa', undefined, cookie)).json(),
      { enabled: false, recoveryCodesRemaining: 0 },
    );
    assert.equal(
      (await f.call('/me/mfa/setup', { password: 'incorrect' }, cookie)).status,
      401,
    );
    const setup = await f.call(
      '/me/mfa/setup',
      { password: f.password },
      cookie,
    );
    assert.equal(setup.status, 200);
    const { secret, uri } = (await setup.json()) as {
      secret: string;
      uri: string;
    };
    assert.match(uri, /^otpauth:\/\/totp\//);
    const key = decodeBase32(secret);
    const step = () => Math.floor(Date.now() / 30_000);
    const pending = await database.user.findUniqueOrThrow({
      where: { email: f.email },
    });
    assert.ok(
      pending.mfaPendingSecret && !pending.mfaPendingSecret.includes(secret),
    );
    assert.equal(
      (await f.call('/me/mfa/enable', { code: totp(key, step() + 5) }, cookie))
        .status,
      400,
    );
    const enabled = await f.call(
      '/me/mfa/enable',
      { code: totp(key, step()) },
      cookie,
    );
    assert.equal(enabled.status, 200);
    const { recoveryCodes } = (await enabled.json()) as {
      recoveryCodes: string[];
    };
    assert.equal(recoveryCodes.length, 10);
    // Enrollment ends sessions that never proved the new factor.
    assert.equal((await f.call('/me', undefined, stale)).status, 401);
    const me = (await (await f.call('/me', undefined, cookie)).json()) as {
      mfaEnabled: boolean;
    };
    assert.equal(me.mfaEnabled, true);
    const stored = await database.user.findUniqueOrThrow({
      where: { email: f.email },
    });
    assert.equal(stored.mfaPendingSecret, null);
    assert.ok(stored.mfaSecret && !stored.mfaSecret.includes(secret));
    const storedCodes = await database.mfaRecoveryCode.findMany({
      where: { userId: stored.id },
    });
    assert.ok(
      storedCodes.every((row) =>
        recoveryCodes.every(
          (code) => !row.codeHash.includes(code.replace(/-/g, '')),
        ),
      ),
    );

    const signIn = async () => {
      const response = await f.call('/auth/login', {
        email: f.email,
        password: f.password,
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { mfaRequired: true });
      assert.equal(cookieValue(response, 'yearbook_session'), undefined);
      const challenge = cookieValue(response, 'yearbook_mfa');
      assert.ok(challenge);
      assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly/);
      return challenge;
    };
    const finish = (challenge: string, code: string) =>
      f.call('/auth/mfa', { code }, challenge);

    // The code used for enrollment cannot be replayed at sign-in.
    let challenge = await signIn();
    assert.equal((await finish(challenge, totp(key, step()))).status, 401);
    const next = totp(key, step() + 1);
    const completed = await finish(challenge, next);
    assert.equal(completed.status, 200);
    const mfaSession = cookieValue(completed, 'yearbook_session');
    assert.ok(mfaSession);
    assert.equal((await f.call('/me', undefined, mfaSession)).status, 200);
    // A consumed challenge and an already used step are both rejected.
    assert.equal((await finish(challenge, next)).status, 401);
    challenge = await signIn();
    assert.equal((await finish(challenge, next)).status, 401);

    // Recovery codes work once.
    assert.equal((await finish(challenge, recoveryCodes[0]!)).status, 200);
    challenge = await signIn();
    assert.equal((await finish(challenge, recoveryCodes[0]!)).status, 401);

    // Each challenge allows five guesses; afterwards even a valid code fails.
    challenge = await signIn();
    for (let index = 0; index < 5; index++)
      assert.equal((await finish(challenge, '000000')).status, 401);
    assert.equal((await finish(challenge, recoveryCodes[1]!)).status, 401);
    assert.equal(
      await database.mfaRecoveryCode.count({
        where: { userId: stored.id, usedAt: { not: null } },
      }),
      1,
    );
    await database.authThrottle.deleteMany({
      where: { key: { endsWith: hashToken(stored.id) } },
    });

    // Platform privileges are active only on MFA-verified sessions.
    await database.user.update({
      where: { id: stored.id },
      data: { role: 'PLATFORM_ADMIN' },
    });
    const unverified = 'yearbook_session=' + newToken();
    await database.session.create({
      data: {
        tokenHash: hashToken(unverified.split('=')[1]!),
        userId: stored.id,
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    const roleOf = async (session: string) =>
      (
        (await (await f.call('/me', undefined, session)).json()) as {
          role: string;
        }
      ).role;
    assert.equal(await roleOf(unverified), 'USER');
    assert.equal(await roleOf(mfaSession), 'PLATFORM_ADMIN');
    const school = await database.school.create({
      data: {
        name: 'MFA verification school',
        slug: 'mfa-' + newToken().slice(0, 12),
      },
    });
    try {
      const verify = (session: string, code: string) =>
        f.call(
          '/schools/' + school.id + '/verification',
          {
            verified: true,
            reason: 'Reviewed institutional ownership evidence.',
            password: f.password,
            code,
          },
          session,
          undefined,
          'PATCH',
        );
      assert.equal((await verify(unverified, recoveryCodes[3]!)).status, 403);
      assert.equal((await verify(mfaSession, '123456')).status, 400);
      await database.authThrottle.deleteMany({
        where: { key: { endsWith: hashToken(stored.id) } },
      });
      assert.equal((await verify(mfaSession, recoveryCodes[4]!)).status, 200);
      assert.ok(
        (await database.school.findUniqueOrThrow({ where: { id: school.id } }))
          .verifiedAt,
      );
    } finally {
      await database.auditLog.deleteMany({ where: { schoolId: school.id } });
      await database.school.delete({ where: { id: school.id } });
    }

    // Disabling needs the password and a factor, and clears every MFA record.
    assert.equal(
      (
        await f.call(
          '/me/mfa/disable',
          { password: f.password, code: '000000' },
          mfaSession,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await f.call(
          '/me/mfa/disable',
          { password: f.password, code: recoveryCodes[5]! },
          mfaSession,
        )
      ).status,
      200,
    );
    const disabled = await database.user.findUniqueOrThrow({
      where: { id: stored.id },
    });
    assert.equal(disabled.mfaSecret, null);
    assert.equal(
      await database.mfaRecoveryCode.count({ where: { userId: stored.id } }),
      0,
    );
    assert.equal(await roleOf(mfaSession), 'USER');
    const audit = await database.auditLog.findMany({
      where: { targetId: stored.id },
    });
    for (const action of [
      'auth.mfa_enable',
      'auth.mfa_recovery_used',
      'auth.mfa_disable',
    ])
      assert.ok(audit.some((row) => row.action === action));
    const serialized = JSON.stringify(audit);
    assert.ok(!serialized.includes(secret));
    assert.ok(recoveryCodes.every((code) => !serialized.includes(code)));
  } finally {
    await database.authThrottle.deleteMany({
      where: {
        key: {
          endsWith: hashToken(
            (await database.user.findUnique({ where: { email: f.email } }))
              ?.id ?? '',
          ),
        },
      },
    });
    await f.close();
  }
});
