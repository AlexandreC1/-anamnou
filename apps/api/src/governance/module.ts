import { Module, type DynamicModule } from '@nestjs/common';
import type { Database } from '../database.js';
import { GovernanceController } from './controller.js';
import { GovernanceService } from './service.js';

@Module({})
export class GovernanceModule {
  static register(database: Database, identity: DynamicModule): DynamicModule {
    return {
      module: GovernanceModule,
      imports: [identity],
      controllers: [GovernanceController],
      providers: [
        {
          provide: GovernanceService,
          useValue: new GovernanceService(database),
        },
      ],
    };
  }
}
