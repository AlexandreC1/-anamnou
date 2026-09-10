import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import {
  ConsoleLogger,
  Module,
  ValidationPipe,
  type DynamicModule,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { type Environment } from './config.js';
import { createDatabase, type Database } from './database.js';
import {
  DATABASE,
  STORAGE,
  HealthController,
  ReadinessService,
} from './health.js';
import { S3ObjectStorage, type ObjectStorage } from './storage.js';
import { SafeErrorFilter } from './errors.js';
import { ANALYTICS, LocalAnalytics, type Analytics } from './analytics.js';

class ResourceLifecycle implements OnApplicationShutdown {
  constructor(
    private readonly database: Database,
    private readonly storage: ObjectStorage,
  ) {}
  async onApplicationShutdown() {
    await this.database.$disconnect();
    this.storage.close();
  }
}
@Module({})
class FoundationModule {
  static register(
    database: Database,
    storage: ObjectStorage,
    analytics: Analytics,
  ): DynamicModule {
    return {
      module: FoundationModule,
      controllers: [HealthController],
      providers: [
        ReadinessService,
        { provide: DATABASE, useValue: database },
        { provide: STORAGE, useValue: storage },
        { provide: ANALYTICS, useValue: analytics },
        {
          provide: ResourceLifecycle,
          useValue: new ResourceLifecycle(database, storage),
        },
      ],
    };
  }
}
export async function createApp(environment: Environment) {
  const database = createDatabase(environment.DATABASE_URL);
  const storage = new S3ObjectStorage(environment);
  const logger = new ConsoleLogger({ json: true, colors: false });
  const app = await NestFactory.create(
    FoundationModule.register(
      database,
      storage,
      new LocalAnalytics((event) =>
        logger.log({ event: 'analytics', ...event }),
      ),
    ),
    { logger, bodyParser: false },
  );
  app.enableShutdownHooks();
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const started = performance.now();
    response.setHeader('x-request-id', requestId);
    response.setHeader('cache-control', 'no-store');
    response.once('finish', () =>
      logger.log({
        event: 'http.request',
        requestId,
        method: request.method,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
    next();
  });
  app.use(helmet());
  app.enableCors({
    origin: new URL(environment.PUBLIC_WEB_URL).origin,
    methods: ['GET', 'HEAD', 'OPTIONS'],
    credentials: false,
  });
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_request, response) =>
        response.status(429).json({
          statusCode: 429,
          message: 'Too many requests. Please try again later.',
          requestId: response.getHeader('x-request-id'),
        }),
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(
    new SafeErrorFilter({
      report: (event) => logger.error({ event: 'http.error', ...event }),
    }),
  );
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Yearbook foundation API')
      .setVersion('0.0.0')
      .setDescription(
        'Phase 0 operations only. No identity or business endpoints.',
      )
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    ui: false,
    raw: ['json'],
    jsonDocumentUrl: 'openapi.json',
  });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  return app;
}
