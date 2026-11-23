import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IdentityDelivery } from '../src/auth/delivery.js';
import type { IdentityMailer } from '../src/auth/mail.js';
import { hashToken } from '../src/auth/security.js';
import type { Database } from '../src/database.js';

test('retries the receipt after provider acceptance without invalidating or resending the link', async (context) => {
  const userId = 'a8fb295f-43e7-4dfa-b489-d5e80e0bdcd5';
  const jobId = 'c65a4d97-64cf-4e40-9304-010e26587311';
  const issueToken =
    context.mock.fn<(input: { create: { tokenHash: string } }) => void>();
  const deleteToken = context.mock.fn();
  const recordAudit = context.mock.fn();
  const send = context.mock.fn<IdentityMailer['send']>(async () => undefined);
  const tx = {
    $queryRaw: async () => [
      { id: jobId, userId, purpose: 'RESET_PASSWORD', attempts: 0 },
    ],
    user: {
      findUniqueOrThrow: async () => ({
        id: userId,
        status: 'ACTIVE',
        email: 'reader@example.test',
        locale: 'en',
      }),
    },
    identityToken: { upsert: issueToken, deleteMany: deleteToken },
    identityEmailJob: {
      update: async () => {},
      deleteMany: async () => ({ count: 1 }),
    },
    auditLog: { create: recordAudit },
  };
  let transactionCount = 0;
  const database = {
    $transaction: async (run: (transaction: typeof tx) => Promise<unknown>) => {
      transactionCount++;
      if (transactionCount === 2)
        throw new Error('database unavailable after sending');
      return run(tx);
    },
  } as unknown as Database;

  await new IdentityDelivery(database, { send }).deliverOne();

  assert.equal(send.mock.callCount(), 1);
  const sentToken = send.mock.calls[0]?.arguments[3];
  assert.ok(sentToken);
  assert.equal(
    issueToken.mock.calls[0]?.arguments[0]?.create.tokenHash,
    hashToken(sentToken),
  );
  assert.equal(deleteToken.mock.callCount(), 0);
  assert.equal(recordAudit.mock.callCount(), 1);
  assert.equal(transactionCount, 3);
});
