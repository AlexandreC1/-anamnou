import type { z } from 'zod';
import { ForbiddenException, HttpException } from '@nestjs/common';
import type { User } from '../generated/prisma/client.js';
import { ClassAccess, audit } from './access.js';
import { generatedSlug } from './rules.js';
import {
  pageQuery,
  pageResult,
  type Page,
  type schoolInput,
  type schoolPatch,
} from './rules.js';

export class SchoolsService {
  constructor(private readonly access: ClassAccess) {}
  async create(user: User, input: z.infer<typeof schoolInput>) {
    return this.access.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id}::uuid FOR UPDATE`;
      if (
        (await tx.school.count({
          where: { admins: { some: { userId: user.id } } },
        })) >= 5
      )
        throw new HttpException('School workspace allowance reached.', 429);
      const school = await tx.school.create({
        data: {
          ...input,
          slug: input.slug ?? generatedSlug(input.name),
          admins: { create: { userId: user.id } },
        },
      });
      await audit(tx, user, 'school.create', school.id, school.id);
      return school;
    });
  }
  verify(user: User, id: string, verified: boolean, reason: string) {
    if (user.role !== 'PLATFORM_ADMIN') throw new ForbiddenException();
    return this.access.database.$transaction(async (tx) => {
      await this.access.school(tx, id, user, true);
      const school = await tx.school.update({
        where: { id },
        data: { verifiedAt: verified ? new Date() : null },
      });
      await audit(tx, user, 'school.verification', id, id, undefined, {
        verified,
        reason,
      });
      return school;
    });
  }
  async list(user: User, page: Page) {
    const rows = await this.access.database.school.findMany({
      where:
        user.role === 'PLATFORM_ADMIN'
          ? {}
          : { admins: { some: { userId: user.id } } },
      orderBy: { id: 'asc' },
      ...pageQuery(page),
    });
    return pageResult(rows, page);
  }
  get(user: User, id: string) {
    return this.access.database.$transaction((tx) =>
      this.access.school(tx, id, user),
    );
  }
  update(user: User, id: string, input: z.infer<typeof schoolPatch>) {
    return this.access.database.$transaction(async (tx) => {
      await this.access.school(tx, id, user, true);
      const school = await tx.school.update({
        where: { id },
        data: {
          ...input,
          ...(input.name !== undefined ||
          input.location !== undefined ||
          input.slug !== undefined
            ? { verifiedAt: null }
            : {}),
        },
      });
      await audit(tx, user, 'school.update', id, id);
      return school;
    });
  }
  classes(user: User, id: string, page: Page) {
    return this.access.database.$transaction(async (tx) => {
      await this.access.school(tx, id, user);
      return pageResult(
        await tx.class.findMany({
          where: { schoolId: id },
          orderBy: { id: 'asc' },
          ...pageQuery(page),
        }),
        page,
      );
    });
  }
}
