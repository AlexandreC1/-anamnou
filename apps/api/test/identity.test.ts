import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as argon2 from 'argon2';
import {
  emailSchema,
  hashToken,
  newToken,
  passwordOptions,
  passwordSchema,
  sessionToken,
} from '../src/auth/security.js';

test('password policy supports long passphrases and Argon2id verifies only the right password', async () => {
  assert.equal(passwordSchema.safeParse('too short').success, false);
  assert.equal(passwordSchema.safeParse('a'.repeat(129)).success, false);
  const password = newToken();
  const stored = await argon2.hash(password, passwordOptions);
  assert.match(stored, /^\$argon2id\$/);
  assert.equal(await argon2.verify(stored, password), true);
  assert.equal(await argon2.verify(stored, 'not the password'), false);
});
test('email normalization and cookie parsing reject ambiguous or malformed identities', () => {
  assert.equal(emailSchema.parse(' Reader@Example.org '), 'reader@example.org');
  const token = newToken();
  assert.notEqual(hashToken(token), token);
  assert.equal(sessionToken('yearbook_session=' + token), token);
  assert.equal(
    sessionToken('yearbook_session=' + token + '; yearbook_session=' + token),
    null,
  );
  assert.equal(sessionToken('yearbook_session=malformed'), null);
  assert.equal(sessionToken(undefined), null);
});
