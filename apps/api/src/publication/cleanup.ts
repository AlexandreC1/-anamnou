import type { Database } from '../database.js';
import type { ObjectStorage } from '../storage.js';

// One bounded batch per invocation. Class locks serialize cleanup with upload/linking.
export async function cleanupMedia(
  database: Database,
  storage: ObjectStorage,
  now = new Date(),
) {
  const abandonedBefore = new Date(now.getTime() - 24 * 60 * 60000);
  const candidates = await database.mediaAsset.findMany({
    where: {
      OR: [
        { status: { in: ['PENDING', 'UPLOADED'] }, expiresAt: { lt: now } },
        {
          status: 'READY',
          createdAt: { lt: abandonedBefore },
          profiles: { none: {} },
          sectionMedia: { none: {} },
        },
        { status: 'DELETED' },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: 100,
  });
  let cleaned = 0;
  for (const candidate of candidates) {
    await database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Class" WHERE "id" = ${candidate.classId}::uuid FOR UPDATE`;
      const asset = await tx.mediaAsset.findUnique({
        where: { id: candidate.id },
        include: { _count: { select: { profiles: true, sectionMedia: true } } },
      });
      if (!asset || asset._count.profiles || asset._count.sectionMedia) return;
      if (
        asset.status === 'READY'
          ? asset.createdAt >= abandonedBefore
          : asset.status !== 'DELETED' && asset.expiresAt >= now
      )
        return;
      await storage.delete(asset.storageKey);
      await tx.mediaAsset.update({
        where: { id: asset.id },
        data: { status: 'DELETED', updatedAt: now },
      });
      if (asset.status !== 'DELETED') {
        const klass = await tx.class.findUniqueOrThrow({
          where: { id: asset.classId },
          select: { schoolId: true },
        });
        await tx.auditLog.create({
          data: {
            action: 'media.cleanup',
            targetId: asset.id,
            classId: asset.classId,
            schoolId: klass.schoolId,
            metadata: { previousStatus: asset.status },
          },
        });
      }
      cleaned++;
    });
  }
  return cleaned;
}
