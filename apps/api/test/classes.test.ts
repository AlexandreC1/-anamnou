import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException } from '@nestjs/common';
import {
  invitationInput,
  pagination,
  classInput,
  protectLastAdmin,
} from '../src/classes/rules.js';

test('invitation roles and bounded pagination reject privilege and resource abuse', () => {
  assert.equal(
    invitationInput.safeParse({ role: 'CLASS_ADMIN' }).success,
    false,
  );
  assert.equal(invitationInput.safeParse({ maxUses: 501 }).success, false);
  assert.equal(invitationInput.safeParse({ expiresInDays: 0 }).success, false);
  for (const query of [
    { pageSize: 1000 },
    { page: -1 },
    { page: '1 OR 1=1' },
    { extra: true },
  ])
    assert.equal(pagination.safeParse(query).success, false);
  assert.deepEqual(pagination.parse({}), { page: 1, pageSize: 20 });
});
test('class inputs reject tenant reassignment fields and malformed slugs', () => {
  assert.equal(
    classInput.safeParse({
      schoolId: 'not-an-id',
      name: 'Class',
      slug: '../class',
      graduationYear: 2026,
    }).success,
    false,
  );
});
test('the last active class administrator cannot be removed or demoted', () => {
  const current = { role: 'CLASS_ADMIN', status: 'ACTIVE' } as const;
  assert.throws(
    () => protectLastAdmin(current, { role: 'MEMBER', status: 'ACTIVE' }, 1),
    ConflictException,
  );
  assert.throws(
    () =>
      protectLastAdmin(current, { role: 'CLASS_ADMIN', status: 'REMOVED' }, 1),
    ConflictException,
  );
  assert.doesNotThrow(() =>
    protectLastAdmin(current, { role: 'MEMBER', status: 'ACTIVE' }, 2),
  );
});
