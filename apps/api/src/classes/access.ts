import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Database } from '../database.js';
import type { Prisma, User } from '../generated/prisma/client.js';

export type Transaction = Prisma.TransactionClient;
export class ClassAccess {
  constructor(readonly database: Database) {}
  async schoolAdmin(tx: Transaction, schoolId: string, user: User) {
    return (
      user.role === 'PLATFORM_ADMIN' ||
      !!(await tx.schoolAdmin.findUnique({
        where: { schoolId_userId: { schoolId, userId: user.id } },
      }))
    );
  }
  async school(tx: Transaction, id: string, user: User, write = false) {
    if (write)
      await tx.$queryRaw`SELECT "id" FROM "School" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const school = await tx.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException();
    const admin = await this.schoolAdmin(tx, id, user);
    if (!admin) throw new NotFoundException();
    return school;
  }
  async withClass<T>(
    id: string,
    user: User,
    write: boolean,
    action: (
      tx: Transaction,
      access: { schoolId: string; admin: boolean; guest: boolean },
    ) => Promise<T>,
  ) {
    return this.database.$transaction(async (tx) => {
      if (write)
        await tx.$queryRaw`SELECT "id" FROM "Class" WHERE "id" = ${id}::uuid FOR UPDATE`;
      else
        await tx.$queryRaw`SELECT "id" FROM "Class" WHERE "id" = ${id}::uuid FOR SHARE`;
      const klass = await tx.class.findUnique({ where: { id } });
      if (!klass) throw new NotFoundException();
      const member = await tx.classMembership.findUnique({
        where: { classId_userId: { classId: id, userId: user.id } },
      });
      const schoolAdmin = await this.schoolAdmin(tx, klass.schoolId, user);
      if (!schoolAdmin && member?.status !== 'ACTIVE')
        throw new NotFoundException();
      const admin = schoolAdmin || member?.role === 'CLASS_ADMIN';
      if (write && !admin) throw new ForbiddenException();
      return action(tx, {
        schoolId: klass.schoolId,
        admin,
        guest: !admin && member?.role === 'GUEST',
      });
    });
  }
}
export async function audit(
  tx: Transaction,
  user: User,
  action: string,
  targetId: string,
  schoolId: string,
  classId?: string,
  metadata: Prisma.InputJsonValue = {},
) {
  await tx.auditLog.create({
    data: {
      actorUserId: user.id,
      action,
      targetId,
      schoolId,
      classId,
      metadata,
    },
  });
}
