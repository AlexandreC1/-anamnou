import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

export function participationWhere(
  required: boolean,
): Prisma.ClassMembershipWhereInput {
  const approved: Prisma.ClassMembershipWhereInput = {
    participation: {
      is: {
        status: 'APPROVED',
        expiresAt: { gt: new Date() },
        policy: { approvedAt: { not: null }, expiresAt: { gt: new Date() } },
      },
    },
  };
  return required
    ? approved
    : { OR: [{ participation: { is: null } }, approved] };
}

export async function requireParticipation(
  tx: Prisma.TransactionClient,
  membershipId: string | null,
  required: boolean,
) {
  if (!membershipId) {
    if (required)
      throw new ForbiddenException(
        'Reviewed participation authorization is required.',
      );
    return;
  }
  if (
    !(await tx.classMembership.findFirst({
      where: { id: membershipId, ...participationWhere(required) },
    }))
  )
    throw new ForbiddenException(
      'Reviewed participation authorization is required.',
    );
}
