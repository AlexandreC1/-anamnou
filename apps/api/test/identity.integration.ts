import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database.js';
import { parseEnvironment } from '../src/config.js';
import { hashToken, newToken } from '../src/auth/security.js';
import { IdentityService } from '../src/auth/service.js';

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
    assert.doesNotThrow(() =>
      f.app
        .get(IdentityService)
        .requirePlatformAdmin({ ...user, role: 'PLATFORM_ADMIN' }),
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
      if (job && job.attempts > 0) break;
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
