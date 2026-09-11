import { Module, type DynamicModule } from '@nestjs/common';
import type { Database } from '../database.js';
import { ClassAccess } from './access.js';
import { ClassesController } from './controller.js';
import { SchoolsService } from './schools.js';
import { ClassesService } from './service.js';
import { InvitationsService } from './invitations.js';

@Module({})
export class ClassesModule {
  static register(
    database: Database,
    identity: DynamicModule,
    webUrl: string,
  ): DynamicModule {
    const access = new ClassAccess(database);
    return {
      module: ClassesModule,
      imports: [identity],
      controllers: [ClassesController],
      providers: [
        { provide: SchoolsService, useValue: new SchoolsService(access) },
        { provide: ClassesService, useValue: new ClassesService(access) },
        {
          provide: InvitationsService,
          useValue: new InvitationsService(access, webUrl),
        },
      ],
    };
  }
}
