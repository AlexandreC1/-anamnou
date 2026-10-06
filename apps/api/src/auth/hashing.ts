import { HttpException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { passwordOptions } from './security.js';

// Shared by all identity service instances in this process. No unbounded queue.
let active = 0;
export async function withPasswordCapacity<T>(
  operation: () => Promise<T>,
): Promise<T> {
  if (active >= 2)
    throw new HttpException('Authentication is busy. Please retry.', 429);
  active++;
  try {
    return await operation();
  } finally {
    active--;
  }
}
export const hashPassword = (password: string) =>
  withPasswordCapacity(() => argon2.hash(password, passwordOptions));
export const verifyPassword = (hash: string, password: string) =>
  withPasswordCapacity(() => argon2.verify(hash, password));
