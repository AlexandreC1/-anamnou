import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { z } from 'zod';
import type { User } from '../generated/prisma/client.js';
import { ClassAccess, audit } from '../classes/access.js';
import { pageQuery, pageResult } from '../classes/rules.js';
import type { yearbookInput, readerQuery } from './rules.js';

const include = {
  sections: {
    orderBy: { position: 'asc' as const },
    include: {
      media: {
        orderBy: { position: 'asc' as const },
        select: {
          asset: { select: { id: true, alt: true, width: true, height: true } },
        },
      },
    },
  },
};
export class YearbooksService {
  constructor(private readonly access: ClassAccess) {}
  get(user: User, classId: string) {
    return this.access.withClass(classId, user, false, async (tx, scope) => {
      if (scope.guest) throw new ForbiddenException();
      const yearbook = await tx.yearbook.findUnique({
        where: { classId },
        include,
      });
      const klass = await tx.class.findUniqueOrThrow({
        where: { id: classId },
        select: {
          name: true,
          graduationYear: true,
          school: { select: { name: true } },
        },
      });
      return {
        ...(yearbook ?? {
          title: klass.name,
          theme: 'PAPER',
          version: 0,
          sections: [],
        }),
        classId,
        class: klass,
        editable: scope.admin,
        status: 'DRAFT',
      };
    });
  }
  update(user: User, classId: string, input: z.infer<typeof yearbookInput>) {
    return this.access.withClass(classId, user, true, async (tx, scope) => {
      const current = await tx.yearbook.findUnique({
        where: { classId },
        include: { sections: { select: { id: true } } },
      });
      if ((current?.version ?? 0) !== input.version)
        throw new ConflictException();
      if (
        input.sections.some(
          (section) =>
            section.id &&
            !current?.sections.some((existing) => existing.id === section.id),
        )
      )
        throw new BadRequestException();
      const assetIds = [
        ...new Set(input.sections.flatMap((section) => section.assetIds)),
      ];
      const count = await tx.mediaAsset.count({
        where: {
          id: { in: assetIds },
          classId,
          purpose: 'YEARBOOK',
          status: 'READY',
        },
      });
      if (count !== assetIds.length) throw new BadRequestException();
      const yearbook = await tx.yearbook.upsert({
        where: { classId },
        create: { classId, title: input.title, theme: input.theme },
        update: {
          title: input.title,
          theme: input.theme,
          version: { increment: 1 },
        },
      });
      await tx.yearbookSection.deleteMany({
        where: { yearbookId: yearbook.id },
      });
      for (const [position, section] of input.sections.entries()) {
        const created = await tx.yearbookSection.create({
          data: {
            id: section.id,
            yearbookId: yearbook.id,
            classId,
            position,
            type: section.type,
            title: section.title,
            body: section.body,
          },
        });
        if (section.assetIds.length)
          await tx.yearbookSectionMedia.createMany({
            data: section.assetIds.map((assetId, mediaPosition) => ({
              sectionId: created.id,
              assetId,
              classId,
              position: mediaPosition,
            })),
          });
      }
      await audit(
        tx,
        user,
        'yearbook.update',
        yearbook.id,
        scope.schoolId,
        classId,
        { version: yearbook.version },
      );
      return {
        version: yearbook.version,
        sectionIds: (
          await tx.yearbookSection.findMany({
            where: { yearbookId: yearbook.id },
            orderBy: { position: 'asc' },
            select: { id: true },
          })
        ).map((section) => section.id),
      };
    });
  }
  members(user: User, classId: string, page: z.infer<typeof readerQuery>) {
    return this.access.withClass(classId, user, false, async (tx, scope) => {
      if (scope.guest) throw new ForbiddenException();
      const rows = await tx.profile.findMany({
        where: {
          classId,
          visibility: 'CLASS',
          ...(page.kind === 'QUOTES'
            ? { quote: { not: null }, NOT: { quote: '' } }
            : {}),
          membership: {
            status: 'ACTIVE',
            role:
              page.kind === 'STAFF'
                ? 'STAFF'
                : {
                    notIn:
                      page.kind === 'MEMBERS' ? ['GUEST', 'STAFF'] : ['GUEST'],
                  },
          },
        },
        ...pageQuery(page),
        orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
        select: {
          membershipId: true,
          displayName: true,
          nickname: true,
          bio: true,
          quote: true,
          activities: true,
          aspiration: true,
          photo: { select: { id: true, alt: true, width: true, height: true } },
          membership: { select: { role: true } },
        },
      });
      return pageResult(rows, page);
    });
  }
}
