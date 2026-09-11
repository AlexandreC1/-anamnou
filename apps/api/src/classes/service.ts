import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import type { User } from '../generated/prisma/client.js';
import { ClassAccess, audit } from './access.js';
import { generatedSlug } from './rules.js';
import {
  pageQuery,
  pageResult,
  protectLastAdmin,
  type Page,
  type classInput,
  type classPatch,
  type membershipInput,
} from './rules.js';

export class ClassesService {
  constructor(private readonly access: ClassAccess) {}
  create(user: User, input: z.infer<typeof classInput>) {
    return this.access.database.$transaction(async (tx) => {
      await this.access.school(tx, input.schoolId, user, true);
      const klass = await tx.class.create({
        data: {
          ...input,
          slug: input.slug ?? generatedSlug(input.name),
          memberships: { create: { userId: user.id, role: 'CLASS_ADMIN' } },
        },
      });
      await audit(tx, user, 'class.create', klass.id, klass.schoolId, klass.id);
      return klass;
    });
  }
  async list(user: User, page: Page) {
    const rows = await this.access.database.class.findMany({
      where:
        user.role === 'PLATFORM_ADMIN'
          ? {}
          : {
              OR: [
                {
                  memberships: { some: { userId: user.id, status: 'ACTIVE' } },
                },
                { school: { admins: { some: { userId: user.id } } } },
              ],
            },
      include: { school: { select: { name: true } } },
      orderBy: { id: 'asc' },
      ...pageQuery(page),
    });
    return pageResult(rows, page);
  }
  get(user: User, id: string) {
    return this.access.withClass(id, user, false, async (tx, access) => ({
      ...(await tx.class.findUniqueOrThrow({
        where: { id },
        include: { school: { select: { name: true } } },
      })),
      permissions: { manage: access.admin, directory: !access.guest },
      memberCount: access.guest
        ? null
        : await tx.classMembership.count({
            where: { classId: id, status: 'ACTIVE' },
          }),
    }));
  }
  update(user: User, id: string, input: z.infer<typeof classPatch>) {
    return this.access.withClass(id, user, true, async (tx, access) => {
      const klass = await tx.class.update({ where: { id }, data: input });
      await audit(tx, user, 'class.update', id, access.schoolId, id);
      return klass;
    });
  }
  members(user: User, id: string, page: Page) {
    return this.access.withClass(id, user, false, async (tx, access) => {
      if (access.guest) throw new ForbiddenException();
      const rows = await tx.classMembership.findMany({
        where: { classId: id, ...(access.admin ? {} : { status: 'ACTIVE' }) },
        select: {
          id: true,
          role: true,
          status: true,
          joinedAt: true,
          user: { select: { displayName: true } },
        },
        orderBy: { id: 'asc' },
        ...pageQuery(page),
      });
      return pageResult(
        rows.map(({ user: member, ...row }) => ({
          ...row,
          displayName: member.displayName,
        })),
        page,
      );
    });
  }
  updateMember(
    user: User,
    id: string,
    memberId: string,
    input: z.infer<typeof membershipInput>,
  ) {
    return this.access.withClass(id, user, true, async (tx, access) => {
      const member = await tx.classMembership.findFirst({
        where: { id: memberId, classId: id },
      });
      if (!member) throw new NotFoundException();
      const count = await tx.classMembership.count({
        where: { classId: id, role: 'CLASS_ADMIN', status: 'ACTIVE' },
      });
      protectLastAdmin(member, input, count);
      await tx.classMembership.update({ where: { id: memberId }, data: input });
      await audit(
        tx,
        user,
        'membership.update',
        memberId,
        access.schoolId,
        id,
        {
          before: { role: member.role, status: member.status },
          after: input,
        },
      );
      return { id: memberId, ...input };
    });
  }
}
