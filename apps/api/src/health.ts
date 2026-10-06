import {
  Controller,
  Get,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Database } from './database.js';
import type { ObjectStorage } from './storage.js';
import { ANALYTICS, type Analytics } from './analytics.js';

export const DATABASE = Symbol('DATABASE');
export const STORAGE = Symbol('STORAGE');
class HealthResponse {
  @ApiProperty({ enum: ['ok'] })
  status = 'ok' as const;
}
@Injectable()
export class ReadinessService {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    @Inject(STORAGE) private readonly storage: ObjectStorage,
    @Inject(ANALYTICS) private readonly analytics: Analytics,
  ) {}
  async check(): Promise<HealthResponse> {
    try {
      const [metadata] = await Promise.all([
        this.database.systemMetadata.findUnique({
          where: { key: 'foundation_version' },
        }),
        this.storage.check(),
      ]);
      if (metadata?.value !== '1')
        throw new Error('Foundation metadata missing.');
      this.analytics.track({
        name: 'foundation.readiness',
        outcome: 'available',
      });
      return { status: 'ok' };
    } catch {
      this.analytics.track({
        name: 'foundation.readiness',
        outcome: 'unavailable',
      });
      throw new ServiceUnavailableException('Service unavailable.');
    }
  }
}
@ApiTags('Operations')
@Controller()
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}
  @Get('health')
  @ApiOkResponse({
    type: HealthResponse,
    description: 'API process is alive; independent of database and storage.',
  })
  health(): HealthResponse {
    return { status: 'ok' };
  }
  @Get('ready')
  @ApiOkResponse({
    type: HealthResponse,
    description: 'Database migration, seed, and storage bucket are accessible.',
  })
  @ApiServiceUnavailableResponse({
    description: 'A dependency is unavailable or setup is incomplete.',
  })
  ready() {
    return this.readiness.check();
  }
}
