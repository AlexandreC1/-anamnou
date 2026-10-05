import { Module, type DynamicModule } from '@nestjs/common';
import type { Database } from '../database.js';
import type { ObjectStorage } from '../storage.js';
import { ClassAccess } from '../classes/access.js';
import { PublicationController } from './controller.js';
import { ProfilesService } from './profiles.js';
import { YearbooksService } from './yearbooks.js';
import { MediaService } from './media.js';
@Module({})
export class PublicationModule {
  static register(
    database: Database,
    storage: ObjectStorage,
    identity: DynamicModule,
  ): DynamicModule {
    const access = new ClassAccess(database);
    return {
      module: PublicationModule,
      imports: [identity],
      controllers: [PublicationController],
      providers: [
        { provide: ProfilesService, useValue: new ProfilesService(access) },
        { provide: YearbooksService, useValue: new YearbooksService(access) },
        { provide: MediaService, useValue: new MediaService(access, storage) },
      ],
      exports: [MediaService],
    };
  }
}
