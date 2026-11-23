import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { z } from 'zod';
import type { Database } from '../database.js';
import type { Prisma, User } from '../generated/prisma/client.js';
import { audit } from '../classes/access.js';
import { GovernanceService } from './service.js';
import type {
  policyInput,
  participationDecision,
} from './participation-rules.js';
type Actor = { user: User; token: string };
const view = {
  id: true,
  membershipId: true,
  schoolId: true,
  policyId: true,
  status: true,
  version: true,
  expiresAt: true,
  reviewedAt: true,
  withdrawnAt: true,
  createdAt: true,
} as const;
const policyView = {
  id: true,
  schoolId: true,
  version: true,
  jurisdiction: true,
  notice: true,
  approvedAt: true,
  expiresAt: true,
} as const;
function coveredQueue(schoolId: string): Prisma.ReviewQueueWhereInput {
  const active = {
    status: 'ACTIVE' as const,
    expiresAt: { gt: new Date() },
    user: {
      status: 'ACTIVE' as const,
      emailVerifiedAt: { not: null },
      mfaEnabledAt: { not: null },
    },
  };
  return {
    schoolId,
    role: 'CONSENT_REVIEWER',
    primaryGrant: active,
    backupGrant: active,
  };
}

export class ParticipationService {
  constructor(
    private readonly db: Database,
    private readonly governance: GovernanceService,
  ) {}
  private async membership(tx: Prisma.TransactionClient, id: string) {
    const found = await tx.classMembership.findUnique({
      where: { id },
      select: { classId: true },
    });
    if (!found) throw new NotFoundException();
    // Same class lock as content reads, writes and upload finalization. Withdrawal
    // cannot race a transaction into granting new content access after it commits.
    await tx.$queryRaw`SELECT "id" FROM "Class" WHERE "id" = ${found.classId}::uuid FOR UPDATE`;
    const member = await tx.classMembership.findUniqueOrThrow({
      where: { id },
      include: { class: true },
    });
    if (member.status !== 'ACTIVE') throw new NotFoundException();
    return member;
  }
  private async reviewer(
    tx: Prisma.TransactionClient,
    actor: Actor,
    schoolId: string,
    queueId?: string,
  ) {
    await this.governance.actor(tx, actor);
    // Lock before consulting grants; grant revocation and queue reassignment
    // lock this same school row, so stale reviewer authority cannot commit.
    await tx.$queryRaw`SELECT "id" FROM "School" WHERE "id" = ${schoolId}::uuid FOR SHARE`;
    const now = new Date();
    const queue = await tx.reviewQueue.findFirst({
      where: {
        ...(queueId ? { id: queueId } : {}),
        schoolId,
        role: 'CONSENT_REVIEWER',
        OR: [{ primaryUserId: actor.user.id }, { backupUserId: actor.user.id }],
        primaryGrant: {
          status: 'ACTIVE',
          expiresAt: { gt: now },
          user: {
            status: 'ACTIVE',
            emailVerifiedAt: { not: null },
            mfaEnabledAt: { not: null },
          },
        },
        backupGrant: {
          status: 'ACTIVE',
          expiresAt: { gt: now },
          user: {
            status: 'ACTIVE',
            emailVerifiedAt: { not: null },
            mfaEnabledAt: { not: null },
          },
        },
      },
    });
    if (!queue) throw new NotFoundException();
  }
  policy(actor: Actor, input: z.infer<typeof policyInput>) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "School" WHERE "id" = ${input.schoolId}::uuid FOR UPDATE`;
      await this.governance.actor(tx, actor, true);
      if (!(await tx.school.findUnique({ where: { id: input.schoolId } })))
        throw new NotFoundException();
      const latest = await tx.participationPolicy.aggregate({
        where: { schoolId: input.schoolId },
        _max: { version: true },
      });
      const policy = await tx.participationPolicy.create({
        data: {
          schoolId: input.schoolId,
          version: (latest._max.version ?? 0) + 1,
          jurisdiction: input.jurisdiction,
          notice: input.notice,
          reviewReference: input.reviewReference,
          expiresAt: new Date(input.expiresAt),
          createdById: actor.user.id,
        },
        select: policyView,
      });
      await audit(
        tx,
        actor.user,
        'participation.policy_proposed',
        policy.id,
        input.schoolId,
      );
      return policy;
    });
  }
  approvePolicy(actor: Actor, id: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      const found = await tx.participationPolicy.findUnique({ where: { id } });
      if (!found) throw new NotFoundException();
      await tx.$queryRaw`SELECT "id" FROM "School" WHERE "id" = ${found.schoolId}::uuid FOR UPDATE`;
      await this.governance.actor(tx, actor, true);
      const policy = await tx.participationPolicy.findUniqueOrThrow({
        where: { id },
      });
      if (policy.createdById === actor.user.id)
        throw new ForbiddenException('Independent approval is required.');
      if (policy.approvedAt || policy.expiresAt <= new Date())
        throw new ConflictException();
      const changed = await tx.participationPolicy.update({
        where: { id },
        data: { approvedById: actor.user.id, approvedAt: new Date() },
        select: policyView,
      });
      await audit(
        tx,
        actor.user,
        'participation.policy_approved',
        id,
        policy.schoolId,
        undefined,
        { reason },
      );
      return changed;
    });
  }
  own(user: User) {
    return this.db.classMembership.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      take: 100,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        class: { select: { id: true, name: true, schoolId: true } },
        participation: { select: view },
      },
    });
  }
  async policies(user: User, membershipId: string) {
    const member = await this.db.classMembership.findFirst({
      where: { id: membershipId, userId: user.id, status: 'ACTIVE' },
      include: { class: true },
    });
    if (!member) throw new NotFoundException();
    return this.db.participationPolicy.findMany({
      where: {
        schoolId: member.class.schoolId,
        approvedAt: { not: null },
        expiresAt: { gt: new Date() },
      },
      orderBy: { version: 'desc' },
      take: 20,
      select: policyView,
    });
  }
  request(user: User, membershipId: string, policyId: string, version: number) {
    return this.db.$transaction(async (tx) => {
      const member = await this.membership(tx, membershipId);
      if (member.userId !== user.id) throw new NotFoundException();
      await tx.$queryRaw`SELECT "id" FROM "School" WHERE "id" = ${member.class.schoolId}::uuid FOR SHARE`;
      const policy = await tx.participationPolicy.findFirst({
        where: {
          id: policyId,
          schoolId: member.class.schoolId,
          approvedAt: { not: null },
          expiresAt: { gt: new Date() },
        },
      });
      if (!policy)
        throw new ConflictException(
          'An approved participation policy is required.',
        );
      const queue = await tx.reviewQueue.findFirst({
        where: coveredQueue(member.class.schoolId),
        orderBy: { id: 'asc' },
      });
      if (!queue)
        throw new ConflictException(
          'An independently covered review queue is required.',
        );
      const current = await tx.participationAuthorization.findUnique({
        where: { membershipId },
        include: { policy: true },
      });
      if (
        (current?.version ?? 0) !== version ||
        (current?.status === 'APPROVED' &&
          current.expiresAt &&
          current.expiresAt > new Date() &&
          current.policy.expiresAt > new Date()) ||
        (current?.status === 'PENDING' && current.policy.expiresAt > new Date())
      )
        throw new ConflictException();
      const authorization = await tx.participationAuthorization.upsert({
        where: { membershipId },
        create: {
          membershipId,
          schoolId: policy.schoolId,
          policyId,
          queueId: queue.id,
        },
        update: {
          policyId,
          queueId: queue.id,
          status: 'PENDING',
          authority: null,
          reviewReference: null,
          reviewedById: null,
          reviewedAt: null,
          expiresAt: null,
          withdrawnAt: null,
          version: { increment: 1 },
        },
        select: view,
      });
      await audit(
        tx,
        user,
        'participation.requested',
        authorization.id,
        policy.schoolId,
        member.classId,
        { policyId, version: authorization.version },
      );
      await tx.participationEvent.create({
        data: {
          authorizationId: authorization.id,
          schoolId: policy.schoolId,
          actorUserId: user.id,
          action: 'REQUESTED',
          version: authorization.version,
          details: { policyId },
        },
      });
      return authorization;
    });
  }
  list(actor: Actor, schoolId: string, cursor?: string) {
    return this.db.$transaction(async (tx) => {
      await this.reviewer(tx, actor, schoolId);
      const rows = await tx.participationAuthorization.findMany({
        where: {
          schoolId,
          queue: {
            ...coveredQueue(schoolId),
            OR: [
              { primaryUserId: actor.user.id },
              { backupUserId: actor.user.id },
            ],
          },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: 'asc' },
        take: 51,
        select: {
          ...view,
          membership: {
            select: {
              userId: true,
              classId: true,
              user: { select: { displayName: true } },
            },
          },
          policy: { select: policyView },
        },
      });
      await audit(
        tx,
        actor.user,
        'participation.queue_read',
        schoolId,
        schoolId,
      );
      return {
        items: rows.slice(0, 50),
        nextCursor: rows.length > 50 ? rows[49]!.id : null,
      };
    });
  }
  listPolicies(actor: Actor, schoolId: string, cursor?: string) {
    return this.db.$transaction(async (tx) => {
      if (actor.user.role === 'PLATFORM_ADMIN')
        await this.governance.actor(tx, actor, true);
      else await this.reviewer(tx, actor, schoolId);
      const rows = await tx.participationPolicy.findMany({
        where: { schoolId, ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: 'asc' },
        take: 51,
        select: { ...policyView, createdById: true, approvedById: true },
      });
      await audit(
        tx,
        actor.user,
        'participation.policies_read',
        schoolId,
        schoolId,
      );
      return {
        items: rows.slice(0, 50),
        nextCursor: rows.length > 50 ? rows[49]!.id : null,
      };
    });
  }
  decide(
    actor: Actor,
    membershipId: string,
    input: z.infer<typeof participationDecision>,
  ) {
    return this.db.$transaction(async (tx) => {
      const member = await this.membership(tx, membershipId);
      if (member.userId === actor.user.id)
        throw new ForbiddenException('Independent review is required.');
      const current = await tx.participationAuthorization.findUnique({
        where: { membershipId },
        include: { policy: true },
      });
      if (!current) throw new NotFoundException();
      if (!current.queueId)
        throw new ConflictException('A review queue assignment is required.');
      await this.reviewer(tx, actor, member.class.schoolId, current.queueId);
      if (
        current.version !== input.version ||
        current.status !== 'PENDING' ||
        !current.policy.approvedAt ||
        current.policy.expiresAt <= new Date() ||
        new Date(input.expiresAt) > current.policy.expiresAt
      )
        throw new ConflictException();
      const authorization = await tx.participationAuthorization.update({
        where: { membershipId },
        data: {
          status: input.approve ? 'APPROVED' : 'DENIED',
          authority: input.authority,
          reviewReference: input.reviewReference,
          reviewedById: actor.user.id,
          reviewedAt: new Date(),
          expiresAt: new Date(input.expiresAt),
          version: { increment: 1 },
        },
        select: view,
      });
      // Evidence stays out of routine audit metadata. Decisions retain an event
      // even when the subject later withdraws or requests review under a new policy.
      await audit(
        tx,
        actor.user,
        input.approve ? 'participation.approved' : 'participation.denied',
        authorization.id,
        current.schoolId,
        member.classId,
        {
          policyId: current.policyId,
          authority: input.authority,
          version: authorization.version,
          reason: input.reason,
        },
      );
      await tx.participationEvent.create({
        data: {
          authorizationId: authorization.id,
          schoolId: current.schoolId,
          actorUserId: actor.user.id,
          action: input.approve ? 'APPROVED' : 'DENIED',
          version: authorization.version,
          details: {
            policyId: current.policyId,
            authority: input.authority,
            reviewReference: input.reviewReference,
            expiresAt: input.expiresAt,
            reason: input.reason,
          },
        },
      });
      return authorization;
    });
  }
  withdraw(user: User, membershipId: string, version: number) {
    return this.db.$transaction(async (tx) => {
      const member = await this.membership(tx, membershipId);
      if (member.userId !== user.id) throw new NotFoundException();
      const current = await tx.participationAuthorization.findUnique({
        where: { membershipId },
      });
      if (!current) throw new NotFoundException();
      if (current.version !== version) throw new ConflictException();
      if (current.status === 'WITHDRAWN')
        return tx.participationAuthorization.findUniqueOrThrow({
          where: { membershipId },
          select: view,
        });
      const authorization = await tx.participationAuthorization.update({
        where: { membershipId },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date(),
          version: { increment: 1 },
        },
        select: view,
      });
      await audit(
        tx,
        user,
        'participation.withdrawn',
        authorization.id,
        current.schoolId,
        member.classId,
        { version: authorization.version },
      );
      await tx.participationEvent.create({
        data: {
          authorizationId: authorization.id,
          schoolId: current.schoolId,
          actorUserId: user.id,
          action: 'WITHDRAWN',
          version: authorization.version,
          details: { policyId: current.policyId },
        },
      });
      return authorization;
    });
  }
}
