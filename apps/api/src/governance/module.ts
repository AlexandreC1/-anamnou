import { Module, type DynamicModule } from '@nestjs/common';
import type { Database } from '../database.js';
import { GovernanceController } from './controller.js';
import { GovernanceService } from './service.js';
import { ParticipationService } from './participation.js';
import { ParticipationController } from './participation-controller.js';

@Module({})
export class GovernanceModule {
  static register(database: Database, identity: DynamicModule): DynamicModule {
    const governance = new GovernanceService(database);
    return {
      module: GovernanceModule,
      imports: [identity],
      controllers: [GovernanceController, ParticipationController],
      providers: [
        {
          provide: GovernanceService,
          useValue: governance,
        },
        {
          provide: ParticipationService,
          useValue: new ParticipationService(database, governance),
        },
      ],
    };
  }
}
