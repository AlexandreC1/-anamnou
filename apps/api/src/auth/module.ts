import { Module, type DynamicModule } from '@nestjs/common';
import type { Environment } from '../config.js';
import type { Database } from '../database.js';
import { IdentityController, AUTH_SECURE } from './controller.js';
import { IdentityService } from './service.js';
import { IdentityMailer } from './mail.js';
import { IdentityDelivery } from './delivery.js';
import { MfaService } from './mfa-service.js';
import { SecretBox } from './mfa.js';

@Module({})
export class IdentityModule {
  static register(database: Database, environment: Environment): DynamicModule {
    const identity = new IdentityService(database);
    return {
      module: IdentityModule,
      controllers: [IdentityController],
      exports: [IdentityService, MfaService],
      providers: [
        { provide: IdentityService, useValue: identity },
        {
          provide: MfaService,
          useValue: new MfaService(
            database,
            new SecretBox(
              Buffer.from(environment.MFA_ENCRYPTION_KEY, 'base64'),
            ),
            identity,
          ),
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
