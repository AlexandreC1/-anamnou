import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { z } from 'zod';
import type { MediaAsset, User } from '../generated/prisma/client.js';
import { ClassAccess, audit } from '../classes/access.js';
import type { ObjectStorage } from '../storage.js';
import type { intentInput } from './rules.js';
import { normalizeImage } from './image.js';

const view = (asset: MediaAsset) => ({
  id: asset.id,
  status: asset.status,
  alt: asset.alt,
  width: asset.width,
  height: asset.height,
  size: asset.size,
});
export class MediaService {
  private decoding = 0;
  constructor(
    private readonly access: ClassAccess,
    private readonly storage: ObjectStorage,
  ) {}
  intent(user: User, input: z.infer<typeof intentInput>) {
    return this.access.withClass(
      input.classId,
      user,
      true,
      async (tx, scope) => {
        if (
          scope.guest ||
          (input.purpose === 'PROFILE' && !scope.memberId) ||
          (input.purpose === 'YEARBOOK' && !scope.admin)
        )
          throw new ForbiddenException();
        const pending = await tx.mediaAsset.count({
          where: {
            classId: input.classId,
            ownerUserId: user.id,
            status: { in: ['PENDING', 'UPLOADED'] },
            expiresAt: { gt: new Date() },
          },
        });
        if (pending >= 10)
          throw new HttpException('Too many unfinished uploads.', 429);
        const id = randomUUID();
        const asset = await tx.mediaAsset.create({
          data: {
            id,
            classId: input.classId,
            ownerUserId: user.id,
            purpose: input.purpose,
            declaredType: input.contentType,
            declaredSize: input.size,
            alt: input.alt,
            storageKey: `classes/${input.classId}/media/${id}`,
            expiresAt: new Date(Date.now() + 15 * 60000),
          },
        });
        return { ...view(asset), expiresAt: asset.expiresAt };
      },
      false,
    );
  }
  private async locate(id: string) {
    const asset = await this.access.database.mediaAsset.findUnique({
      where: { id },
    });
    if (!asset) throw new NotFoundException();
    return asset;
  }
  async authorizeContent(user: User, id: string) {
    const asset = await this.locate(id);
    return this.access.withClass(
      asset.classId,
      user,
      false,
      async (tx, scope) => {
        const current = await tx.mediaAsset.findUniqueOrThrow({
          where: { id },
        });
        if (
          scope.guest ||
          current.ownerUserId !== user.id ||
          (current.purpose === 'YEARBOOK' && !scope.admin)
        )
          throw new NotFoundException();
        if (current.status !== 'PENDING' || current.expiresAt <= new Date())
          throw new ConflictException();
        return current;
      },
    );
  }
  async upload(user: User, id: string, bytes: unknown) {
    const asset = await this.authorizeContent(user, id);
    if (!Buffer.isBuffer(bytes) || bytes.length !== asset.declaredSize)
      throw new BadRequestException();
    if (this.decoding >= 2)
      throw new HttpException('Image processing is busy. Please retry.', 429);
    this.decoding++;
    let normalized: Awaited<ReturnType<typeof normalizeImage>>;
    try {
      normalized = await normalizeImage(bytes, asset.declaredType);
    } finally {
      this.decoding--;
    }
    return this.access.withClass(
      asset.classId,
      user,
      true,
      async (tx, scope) => {
        const current = await tx.mediaAsset.findUniqueOrThrow({
          where: { id },
        });
        if (
          scope.guest ||
          current.ownerUserId !== user.id ||
          (current.purpose === 'YEARBOOK' && !scope.admin)
        )
          throw new NotFoundException();
        if (current.status !== 'PENDING' || current.expiresAt <= new Date())
          throw new ConflictException();
        await this.storage.put(asset.storageKey, normalized.data, 'image/webp');
        return view(
          await tx.mediaAsset.update({
            where: { id },
            data: {
              status: 'UPLOADED',
              size: normalized.data.length,
              width: normalized.info.width,
              height: normalized.info.height,
            },
          }),
        );
      },
      false,
    );
  }
  async complete(user: User, id: string) {
    const asset = await this.locate(id);
    return this.access.withClass(
      asset.classId,
      user,
      true,
      async (tx, scope) => {
        const current = await tx.mediaAsset.findUniqueOrThrow({
          where: { id },
        });
        if (
          scope.guest ||
          current.ownerUserId !== user.id ||
          (current.purpose === 'YEARBOOK' && !scope.admin)
        )
          throw new NotFoundException();
        if (current.status === 'READY') return view(current);
        if (current.status !== 'UPLOADED' || current.expiresAt <= new Date())
          throw new ConflictException();
        const ready = await tx.mediaAsset.update({
          where: { id },
          data: { status: 'READY' },
        });
        await audit(
          tx,
          user,
          'media.complete',
          id,
          scope.schoolId,
          asset.classId,
        );
        return view(ready);
      },
      false,
    );
  }
  async content(user: User, id: string) {
    const asset = await this.locate(id);
    return this.access.withClass(
      asset.classId,
      user,
      false,
      async (tx, scope) => {
        const current = await tx.mediaAsset.findUniqueOrThrow({
          where: { id },
        });
        if (scope.guest || current.status !== 'READY')
          throw new NotFoundException();
        const owner = current.ownerUserId === user.id;
        const shared =
          current.purpose === 'PROFILE'
            ? await tx.profile.count({
                where: {
                  photoAssetId: id,
                  visibility: 'CLASS',
                  membership: { status: 'ACTIVE', role: { not: 'GUEST' } },
                },
              })
            : scope.admin ||
              (await tx.yearbookSectionMedia.count({ where: { assetId: id } }));
        if (!owner && !shared) throw new NotFoundException();
        return Buffer.from(await this.storage.get(current.storageKey));
      },
    );
  }
  async remove(user: User, id: string, expectedProfileVersion?: number) {
    const asset = await this.locate(id);
    const profileVersion = await this.access.withClass(
      asset.classId,
      user,
      true,
      async (tx, scope) => {
        if (scope.guest || (!scope.admin && asset.ownerUserId !== user.id))
          throw new NotFoundException();
        const ownProfile = scope.memberId
          ? await tx.profile.findUnique({
              where: { membershipId: scope.memberId },
            })
          : null;
        if (
          expectedProfileVersion !== undefined &&
          expectedProfileVersion !== (ownProfile?.version ?? 0)
        )
          throw new ConflictException();
        await tx.profile.updateMany({
          where: { photoAssetId: id },
          data: { photoAssetId: null, version: { increment: 1 } },
        });
        const linked = await tx.yearbookSectionMedia.count({
          where: { assetId: id },
        });
        await tx.yearbookSectionMedia.deleteMany({ where: { assetId: id } });
        if (linked)
          await tx.yearbook.updateMany({
            where: { classId: asset.classId },
            data: { version: { increment: 1 } },
          });
        await tx.mediaAsset.update({
          where: { id },
          data: { status: 'DELETED' },
        });
        await audit(
          tx,
          user,
          'media.delete',
          id,
          scope.schoolId,
          asset.classId,
        );
        return (
          (ownProfile?.version ?? 0) + (ownProfile?.photoAssetId === id ? 1 : 0)
        );
      },
      false,
    );
    await this.storage.delete(asset.storageKey);
    return { status: 'DELETED', profileVersion };
  }
}
