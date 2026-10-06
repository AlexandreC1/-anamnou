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
import {
  ClassAccess,
  audit,
  type ClassScope,
  type Transaction,
} from '../classes/access.js';
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
// Upload steps belong to the asset's owner; yearbook media also requires class admin.
async function ownedAsset(
  tx: Transaction,
  scope: ClassScope,
  user: User,
  id: string,
) {
  const current = await tx.mediaAsset.findUniqueOrThrow({ where: { id } });
  if (
    scope.guest ||
    current.ownerUserId !== user.id ||
    (current.purpose === 'YEARBOOK' && !scope.admin)
  )
    throw new NotFoundException();
  return current;
}
// Ready media is readable by its owner, or by members when a shared profile or
// the draft references it. Admins may read any yearbook media in their class.
async function readableAsset(
  tx: Transaction,
  scope: ClassScope,
  user: User,
  id: string,
) {
  const current = await tx.mediaAsset.findUniqueOrThrow({ where: { id } });
  if (scope.guest || current.status !== 'READY') throw new NotFoundException();
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
  if (current.ownerUserId !== user.id && !shared) throw new NotFoundException();
  return current;
}
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
            status: { in: ['PENDING', 'PROCESSING', 'UPLOADED'] },
            expiresAt: { gt: new Date() },
          },
        });
        if (pending >= 10)
          throw new HttpException('Too many unfinished uploads.', 429);
        // Class row locks serialize concurrent quota reservations across replicas.
        const [quota] = await tx.$queryRaw<
          { ownBytes: bigint; totalBytes: bigint }[]
        >`
          SELECT COALESCE(SUM(GREATEST("declaredSize", COALESCE("size", 0))) FILTER (WHERE "ownerUserId" = ${user.id}::uuid), 0)::bigint AS "ownBytes",
          COALESCE(SUM(GREATEST("declaredSize", COALESCE("size", 0))), 0)::bigint AS "totalBytes"
          FROM "MediaAsset" WHERE "classId" = ${input.classId}::uuid AND "status" != 'DELETED'`;
        const ownBytes = Number(quota?.ownBytes ?? 0);
        const totalBytes = Number(quota?.totalBytes ?? 0);
        if (
          ownBytes + input.size > 128 * 1024 * 1024 ||
          totalBytes + input.size > 1024 * 1024 * 1024
        )
          throw new HttpException(
            'Storage allowance reached. Delete unused photos before uploading.',
            413,
          );
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
        const current = await ownedAsset(tx, scope, user, id);
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
    await this.access.withClass(
      asset.classId,
      user,
      true,
      async (tx, scope) => {
        const current = await ownedAsset(tx, scope, user, id);
        if (current.status !== 'PENDING' || current.expiresAt <= new Date())
          throw new ConflictException();
        await tx.mediaAsset.update({
          where: { id },
          data: { status: 'PROCESSING' },
        });
      },
      false,
    );
    try {
      await this.storage.put(asset.storageKey, normalized.data, 'image/webp');
      return await this.access.withClass(
        asset.classId,
        user,
        true,
        async (tx, scope) => {
          const current = await ownedAsset(tx, scope, user, id);
          if (
            current.status !== 'PROCESSING' ||
            current.expiresAt <= new Date()
          )
            throw new ConflictException();
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
    } catch (error) {
      // Retire failed leases. Cleanup retries deletion without risking committed content.
      await this.access.database.mediaAsset.updateMany({
        where: { id, status: { in: ['PROCESSING', 'DELETED'] } },
        data: { status: 'DELETED', purgedAt: null, updatedAt: new Date() },
      });
      throw error;
    }
  }
  async complete(user: User, id: string) {
    const asset = await this.locate(id);
    return this.access.withClass(
      asset.classId,
      user,
      true,
      async (tx, scope) => {
        const current = await ownedAsset(tx, scope, user, id);
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
    const key = await this.access.withClass(
      asset.classId,
      user,
      false,
      async (tx, scope) =>
        (await readableAsset(tx, scope, user, id)).storageKey,
    );
    // Storage reads do not hold a class/database lock. Recheck after I/O so
    // removal or privacy changes during a download cannot expose stale content.
    const bytes = Buffer.from(await this.storage.get(key));
    await this.access.withClass(
      asset.classId,
      user,
      false,
      async (tx, scope) => {
        await readableAsset(tx, scope, user, id);
      },
    );
    return bytes;
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
