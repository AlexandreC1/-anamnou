import { Module, type DynamicModule } from '@nestjs/common';
import type { Environment } from '../config.js';
import type { Database } from '../database.js';
import { IdentityController, AUTH_SECURE } from './controller.js';
import { IdentityService } from './service.js';
import { IdentityMailer } from './mail.js';
import { IdentityDelivery } from './delivery.js';

@Module({})
export class IdentityModule {
  static register(database: Database, environment: Environment): DynamicModule {
    return {
      module: IdentityModule,
      controllers: [IdentityController],
      exports: [IdentityService],
      providers: [
        {
          provide: IdentityService,
          useValue: new IdentityService(database),
        },
        {
          provide: IdentityDelivery,
          useValue: new IdentityDelivery(
            database,
            new IdentityMailer(environment),
          ),
        },
        {
          provide: AUTH_SECURE,
          useValue: environment.APP_ENV === 'production',
        },
      ],
    };
  }
}
