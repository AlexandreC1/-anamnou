import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { z } from 'zod';
import type { User } from '../generated/prisma/client.js';
import { hashToken } from '../auth/security.js';
import { ClassAccess, audit, type Transaction } from './access.js';
import {
  pageQuery,
  pageResult,
  type Page,
  type invitationInput,
} from './rules.js';

const publicInvitation = {
  id: true,
  role: true,
  status: true,
  expiresAt: true,
  maxUses: true,
  usedCount: true,
  createdAt: true,
} as const;
export class InvitationsService {
  constructor(
    private readonly access: ClassAccess,
    private readonly webUrl: string,
    private readonly requireVerifiedSchool = false,
  ) {}
  private async checkSchool(tx: Transaction, schoolId: string) {
    if (!this.requireVerifiedSchool) return;
    await tx.$queryRaw`SELECT "id" FROM "School" WHERE "id" = ${schoolId}::uuid FOR SHARE`;
    const school = await tx.school.findUniqueOrThrow({
      where: { id: schoolId },
    });
    if (!school.verifiedAt)
      throw new ForbiddenException(
        'School approval is required before inviting members.',
      );
  }
  create(user: User, classId: string, input: z.infer<typeof invitationInput>) {
    return this.access.withClass(classId, user, true, async (tx, access) => {
      await this.checkSchool(tx, access.schoolId);
      const code = randomBytes(16).toString('hex');
      const invitation = await tx.invitation.create({
        data: {
          classId,
          createdById: user.id,
          role: input.role,
          maxUses: input.maxUses,
          expiresAt: new Date(Date.now() + input.expiresInDays * 86400000),
          tokenHash: hashToken(code),
        },
        select: publicInvitation,
      });
      await audit(
        tx,
        user,
        'invitation.create',
        invitation.id,
        access.schoolId,
        classId,
      );
      return { ...invitation, code, url: `${this.webUrl}/join#code=${code}` };
    });
  }
  list(user: User, classId: string, page: Page) {
    return this.access.withClass(classId, user, false, async (tx, access) => {
      if (!access.admin) throw new ForbiddenException();
      return pageResult(
        await tx.invitation.findMany({
          where: { classId },
          select: publicInvitation,
          orderBy: { id: 'asc' },
          ...pageQuery(page),
        }),
        page,
      );
    });
  }
  revoke(user: User, classId: string, id: string) {
    return this.access.withClass(classId, user, true, async (tx, access) => {
      const invite = await tx.invitation.findFirst({ where: { id, classId } });
      if (!invite) throw new NotFoundException();
      if (invite.status !== 'REVOKED') {
        await tx.invitation.update({
          where: { id },
          data: { status: 'REVOKED' },
        });
        await audit(
          tx,
          user,
          'invitation.revoke',
          id,
          access.schoolId,
          classId,
        );
      }
      return { status: 'REVOKED' };
    });
  }
  async accept(user: User, code: string) {
    const found = await this.access.database.invitation.findUnique({
      where: { tokenHash: hashToken(code) },
      select: { id: true, classId: true },
    });
    if (!found) throw new BadRequestException();
    return this.access.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Class" WHERE "id" = ${found.classId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Invitation" WHERE "id" = ${found.id}::uuid FOR UPDATE`;
      const invitation = await tx.invitation.findUniqueOrThrow({
        where: { id: found.id },
        include: { class: true },
      });
      await this.checkSchool(tx, invitation.class.schoolId);
      const existing = await tx.classMembership.findUnique({
        where: { classId_userId: { classId: found.classId, userId: user.id } },
      });
      if (existing?.status === 'REMOVED') throw new ForbiddenException();
      if (
        existing &&
        (await tx.invitationAcceptance.findUnique({
          where: {
            invitationId_membershipId: {
              invitationId: found.id,
              membershipId: existing.id,
            },
          },
        }))
      )
        return { classId: found.classId, membershipId: existing.id };
      if (
        invitation.status !== 'ACTIVE' ||
        invitation.expiresAt <= new Date() ||
        invitation.usedCount >= invitation.maxUses
      )
        throw new BadRequestException();
      if (existing)
        return { classId: found.classId, membershipId: existing.id };
      const membership = await tx.classMembership.create({
        data: {
          classId: found.classId,
          userId: user.id,
          role: invitation.role,
        },
      });
      await tx.invitationAcceptance.create({
        data: {
          invitationId: found.id,
          membershipId: membership.id,
          classId: found.classId,
        },
      });
      await tx.invitation.update({
        where: { id: found.id },
        data: { usedCount: { increment: 1 } },
      });
      await audit(
        tx,
        user,
        'invitation.accept',
        found.id,
        invitation.class.schoolId,
        found.classId,
      );
      return { classId: found.classId, membershipId: membership.id };
    });
  }
}
