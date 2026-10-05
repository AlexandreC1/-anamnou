import sharp from 'sharp';
import { BadRequestException } from '@nestjs/common';
import { MAX_IMAGE_BYTES } from './rules.js';

export async function normalizeImage(content: Buffer, declaredType: string) {
  if (!content.length || content.length > MAX_IMAGE_BYTES)
    throw new BadRequestException();
  const detected = content.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    ? 'image/jpeg'
    : content
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? 'image/png'
      : content.toString('ascii', 0, 4) === 'RIFF' &&
          content.toString('ascii', 8, 12) === 'WEBP'
        ? 'image/webp'
        : null;
  if (detected !== declaredType) throw new BadRequestException();
  // Some PNG decoders read only the first APNG frame. Inspect container chunks too.
  if (detected === 'image/png') {
    for (let offset = 8; offset + 12 <= content.length;) {
      if (content.toString('ascii', offset + 4, offset + 8) === 'acTL')
        throw new BadRequestException();
      offset += content.readUInt32BE(offset) + 12;
    }
  }
  if (detected === 'image/webp') {
    for (let offset = 12; offset + 8 <= content.length;) {
      const type = content.toString('ascii', offset, offset + 4);
      if (type === 'ANIM' || type === 'ANMF') throw new BadRequestException();
      const size = content.readUInt32LE(offset + 4);
      offset += 8 + size + (size % 2);
    }
  }
  try {
    const input = sharp(content, {
      failOn: 'warning',
      limitInputPixels: 16000000,
      animated: false,
    });
    const metadata = await input.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < 128 ||
      metadata.height < 128 ||
      metadata.width > 8192 ||
      metadata.height > 8192 ||
      (metadata.pages ?? 1) !== 1 ||
      'image/' + metadata.format !== declaredType
    )
      throw new Error('Image dimensions or format are invalid');
    const output = await input
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    if (output.data.length > MAX_IMAGE_BYTES)
      throw new Error('Output too large');
    return output;
  } catch {
    throw new BadRequestException();
  }
}
