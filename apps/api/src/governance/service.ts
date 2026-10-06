import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Database } from '../database.js';
import type {
  GovernanceRole,
  Prisma,
  User,
} from '../generated/prisma/client.js';
import { hashToken } from '../auth/security.js';
import { audit } from '../classes/access.js';

type Transaction = Prisma.TransactionClient;
type Actor = { user: User; token: string };
type QueueInput = {
  name: string;
  role: GovernanceRole;
  primaryGrantId: string;
  backupGrantId: string;
};
const publicGrant = {
  id: true,
  schoolId: true,
  userId: true,
  role: true,
  status: true,
  expiresAt: true,
  requestedById: true,
  approvedById: true,
  approvedAt: true,
  revokedAt: true,
  createdAt: true,
} as const;
const active = (
  grant: {
    status: string;
    expiresAt: Date;
    user: {
      status: string;
      mfaEnabledAt: Date | null;
      emailVerifiedAt: Date | null;
    };
  },
  now: Date,
) =>
  grant.status === 'ACTIVE' &&
  grant.expiresAt > now &&
  grant.user.status === 'ACTIVE' &&
  !!grant.user.mfaEnabledAt &&
  !!grant.user.emailVerifiedAt;

export class GovernanceService {
  constructor(private readonly database: Database) {}
  private async lock(tx: Transaction, schoolId: string, write: boolean) {
    if (write)
      await tx.$queryRaw`SELECT "id" FROM "School" WHERE "id" = ${schoolId}::uuid FOR UPDATE`;
    else
      await tx.$queryRaw`SELECT "id" FROM "School" WHERE "id" = ${schoolId}::uuid FOR SHARE`;
    if (!(await tx.school.findUnique({ where: { id: schoolId } })))
      throw new NotFoundException();
  }
  private async actor(tx: Transaction, actor: Actor, platform = false) {
    const tokenHash = hashToken(actor.token);
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${actor.user.id}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "Session" WHERE "tokenHash" = ${tokenHash} FOR SHARE`;
    const session = await tx.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    const now = new Date();
    if (
      !session ||
      session.userId !== actor.user.id ||
      session.expiresAt <= now ||
      !session.mfaVerifiedAt ||
      !session.user.mfaEnabledAt ||
      !session.user.emailVerifiedAt ||
      session.user.status !== 'ACTIVE' ||
      session.lastSeenAt.getTime() <
        now.getTime() -
          (session.user.role === 'PLATFORM_ADMIN' ? 1 : 24) * 60 * 60_000 ||
      (platform &&
        (actor.user.role !== 'PLATFORM_ADMIN' ||
          session.user.role !== 'PLATFORM_ADMIN'))
    )
      throw new ForbiddenException();
    return session.user;
  }
  private async permission(
    tx: Transaction,
    actor: Actor,
    schoolId: string,
    management = false,
  ) {
    const user = await this.actor(tx, actor);
    // Platform operators administer grant configuration, never receive case access here.
    if (
      !management &&
      actor.user.role === 'PLATFORM_ADMIN' &&
      user.role === 'PLATFORM_ADMIN'
    )
      return;
    const grant = await tx.governanceGrant.findFirst({
      where: {
        schoolId,
        userId: user.id,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        ...(management ? { role: 'QUEUE_MANAGER' } : {}),
      },
    });
    if (!grant) throw new NotFoundException();
  }
  request(
    actor: Actor,
    input: {
      schoolId: string;
      userId: string;
      role: GovernanceRole;
      expiresInDays: number;
    },
  ) {
    return this.database.$transaction(async (tx) => {
      await this.lock(tx, input.schoolId, true);
      await this.actor(tx, actor, true);
      const recipient = await tx.user.findUnique({
        where: { id: input.userId },
      });
      if (
        !recipient ||
        recipient.status !== 'ACTIVE' ||
        !recipient.emailVerifiedAt ||
        !recipient.mfaEnabledAt
      )
        throw new ConflictException(
          'Recipient must have an active verified account and MFA.',
        );
      const grant = await tx.governanceGrant.create({
        data: {
          schoolId: input.schoolId,
          userId: input.userId,
          role: input.role,
          requestedById: actor.user.id,
          expiresAt: new Date(Date.now() + input.expiresInDays * 86400000),
        },
        select: publicGrant,
      });
      await audit(
        tx,
        actor.user,
        'governance.grant_requested',
        grant.id,
        input.schoolId,
      );
      return grant;
    });
  }
  async decision(actor: Actor, id: string, approve: boolean, reason: string) {
    const found = await this.database.governanceGrant.findUnique({
      where: { id },
      select: { schoolId: true },
    });
    if (!found) throw new NotFoundException();
    return this.database.$transaction(async (tx) => {
      await this.lock(tx, found.schoolId, true);
      await this.actor(tx, actor, true);
      const grant = await tx.governanceGrant.findUniqueOrThrow({
        where: { id },
        include: { user: true },
      });
      if (approve) {
        if (
          grant.requestedById === actor.user.id ||
          grant.userId === actor.user.id
        )
          throw new ForbiddenException('Independent approval is required.');
        if (
          grant.status !== 'REQUESTED' ||
          grant.expiresAt <= new Date() ||
          grant.user.status !== 'ACTIVE' ||
          !grant.user.emailVerifiedAt ||
          !grant.user.mfaEnabledAt
        )
          throw new ConflictException();
        if (
          await tx.governanceGrant.count({
            where: {
              schoolId: grant.schoolId,
              userId: grant.userId,
              role: grant.role,
              status: 'ACTIVE',
            },
          })
        )
          throw new ConflictException(
            'Revoke the previous grant before replacing it.',
          );
      } else if (grant.status === 'REVOKED')
        return tx.governanceGrant.findUniqueOrThrow({
          where: { id },
          select: publicGrant,
        });
      const changed = await tx.governanceGrant.update({
        where: { id },
        data: approve
          ? {
              status: 'ACTIVE',
              approvedById: actor.user.id,
              approvedAt: new Date(),
            }
          : { status: 'REVOKED', revokedAt: new Date() },
        select: publicGrant,
      });
      await audit(
        tx,
        actor.user,
        approve ? 'governance.grant_approved' : 'governance.grant_revoked',
        id,
        grant.schoolId,
        undefined,
        { reason },
      );
      return changed;
    });
  }
  own(user: User) {
    return this.database.governanceGrant.findMany({
      where: { userId: user.id },
      select: publicGrant,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
  list(actor: Actor, schoolId: string, cursor?: string, queues = false) {
    return this.database.$transaction(async (tx) => {
      await this.lock(tx, schoolId, false);
      await this.permission(tx, actor, schoolId);
      const where = { schoolId, ...(cursor ? { id: { gt: cursor } } : {}) };
      const rows = queues
        ? await tx.reviewQueue.findMany({
            where,
            orderBy: { id: 'asc' },
            take: 51,
            include: {
              primaryGrant: {
                include: {
                  user: {
                    select: {
                      status: true,
                      mfaEnabledAt: true,
                      emailVerifiedAt: true,
                    },
                  },
                },
              },
              backupGrant: {
                include: {
                  user: {
                    select: {
                      status: true,
                      mfaEnabledAt: true,
                      emailVerifiedAt: true,
                    },
                  },
                },
              },
            },
          })
        : await tx.governanceGrant.findMany({
            where,
            orderBy: { id: 'asc' },
            take: 51,
            select: publicGrant,
          });
      const now = new Date();
      const items = rows.slice(0, 50).map((row) => {
        if (!('primaryGrant' in row)) return row;
        const { primaryGrant, backupGrant, ...queue } = row;
        return {
          ...queue,
          primaryAvailable: active(primaryGrant, now),
          backupAvailable: active(backupGrant, now),
          covered: active(primaryGrant, now) && active(backupGrant, now),
        };
      });
      await audit(
        tx,
        actor.user,
        queues ? 'governance.queues_read' : 'governance.grants_read',
        schoolId,
        schoolId,
      );
      return { items, nextCursor: rows.length > 50 ? items.at(-1)!.id : null };
    });
  }
  async queue(
    actor: Actor,
    schoolId: string,
    input: QueueInput,
    existing?: { id: string; version: number },
  ) {
    return this.database.$transaction(async (tx) => {
      await this.lock(tx, schoolId, true);
      await this.permission(tx, actor, schoolId, true);
      const grants = await tx.governanceGrant.findMany({
        where: {
          schoolId,
          id: { in: [input.primaryGrantId, input.backupGrantId] },
          role: input.role,
        },
        include: {
          user: {
            select: { status: true, mfaEnabledAt: true, emailVerifiedAt: true },
          },
        },
      });
      const primary = grants.find((grant) => grant.id === input.primaryGrantId);
      const backup = grants.find((grant) => grant.id === input.backupGrantId);
      if (
        !primary ||
        !backup ||
        primary.userId === backup.userId ||
        !active(primary, new Date()) ||
        !active(backup, new Date())
      )
        throw new ConflictException(
          'Two distinct eligible reviewers are required.',
        );
      if (
        ![
          'CONSENT_REVIEWER',
          'SAFEGUARDING_REVIEWER',
          'PRIVACY_REVIEWER',
        ].includes(input.role)
      )
        throw new ConflictException();
      if (existing) {
        const current = await tx.reviewQueue.findFirst({
          where: { id: existing.id, schoolId },
        });
        if (!current) throw new NotFoundException();
        if (current.version !== existing.version) throw new ConflictException();
      }
      const data = {
        ...input,
        primaryUserId: primary.userId,
        backupUserId: backup.userId,
      };
      const queue = existing
        ? await tx.reviewQueue.update({
            where: { id: existing.id },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.reviewQueue.create({ data: { ...data, schoolId } });
      await audit(
        tx,
        actor.user,
        existing ? 'governance.queue_reassigned' : 'governance.queue_created',
        queue.id,
        schoolId,
      );
      return queue;
    });
  }
  async queueSchool(id: string) {
    const queue = await this.database.reviewQueue.findUnique({
      where: { id },
      select: { schoolId: true },
    });
    if (!queue) throw new NotFoundException();
    return queue.schoolId;
  }
}
