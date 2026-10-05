import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { z } from 'zod';
import type { Profile, User } from '../generated/prisma/client.js';
import { ClassAccess, audit } from '../classes/access.js';
import type { profileInput } from './rules.js';

const photoSelection = {
  id: true,
  alt: true,
  width: true,
  height: true,
} as const;

export function profileView(
  profile: Profile,
  own: boolean,
  includeContact = true,
) {
  const { contact, contactVisibility, ...publicFields } = profile;
  return {
    ...publicFields,
    ...(includeContact && (own || contactVisibility === 'CLASS')
      ? { contact, contactVisibility }
      : {}),
  };
}
export class ProfilesService {
  constructor(private readonly access: ClassAccess) {}
  get(user: User, classId: string, memberId: string) {
    return this.access.withClass(classId, user, false, async (tx, access) => {
      if (access.guest) throw new ForbiddenException();
      const id = memberId === 'me' ? access.memberId : memberId;
      if (!id) throw new ForbiddenException();
      const member = await tx.classMembership.findFirst({
        where: { id, classId, status: 'ACTIVE', role: { not: 'GUEST' } },
        include: {
          profile: { include: { photo: { select: photoSelection } } },
          user: { select: { displayName: true } },
        },
      });
      if (!member) throw new NotFoundException();
      const own = member.id === access.memberId;
      if (!member.profile) {
        if (!own) throw new NotFoundException();
        return {
          membershipId: id,
          displayName: member.user.displayName,
          version: 0,
          visibility: 'PRIVATE',
          contactVisibility: 'PRIVATE',
          nickname: null,
          bio: null,
          quote: null,
          activities: null,
          aspiration: null,
          contact: null,
          photoAssetId: null,
          photo: null,
        };
      }
      if (!own && member.profile.visibility !== 'CLASS')
        throw new NotFoundException();
      return profileView(member.profile, own);
    });
  }
  update(user: User, classId: string, input: z.infer<typeof profileInput>) {
    return this.access.withClass(
      classId,
      user,
      true,
      async (tx, access) => {
        if (!access.memberId || access.guest) throw new ForbiddenException();
        const current = await tx.profile.findUnique({
          where: { membershipId: access.memberId },
        });
        if ((current?.version ?? 0) !== input.version)
          throw new ConflictException();
        if (
          input.photoAssetId &&
          !(await tx.mediaAsset.findFirst({
            where: {
              id: input.photoAssetId,
              classId,
              ownerUserId: user.id,
              purpose: 'PROFILE',
              status: 'READY',
            },
          }))
        )
          throw new BadRequestException();
        const { version, ...data } = input;
        const profile = await tx.profile.upsert({
          where: { membershipId: access.memberId },
          create: { ...data, classId, membershipId: access.memberId },
          update: { ...data, version: version + 1 },
          include: { photo: { select: photoSelection } },
        });
        await audit(
          tx,
          user,
          'profile.update',
          profile.id,
          access.schoolId,
          classId,
          { visibility: input.visibility, version: profile.version },
        );
        return profileView(profile, true);
      },
      false,
    );
  }
  progress(user: User, classId: string) {
    return this.access.withClass(classId, user, false, async (tx, access) => {
      if (!access.admin) throw new ForbiddenException();
      const where = {
        classId,
        membership: {
          status: 'ACTIVE' as const,
          role: { not: 'GUEST' as const },
        },
      };
      const [members, profiles, photos, quotes] = await Promise.all([
        tx.classMembership.count({
          where: { classId, status: 'ACTIVE', role: { not: 'GUEST' } },
        }),
        tx.profile.count({ where }),
        tx.profile.count({ where: { ...where, photoAssetId: { not: null } } }),
        tx.profile.count({
          where: { ...where, quote: { not: null }, NOT: { quote: '' } },
        }),
      ]);
      return { members, profiles, photos, quotes };
    });
  }
}
