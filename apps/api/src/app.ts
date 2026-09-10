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
import express from 'express';
import { IdentityModule } from './auth/module.js';
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
    environment: Environment,
  ): DynamicModule {
    return {
      module: FoundationModule,
      imports: [IdentityModule.register(database, environment)],
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
      environment,
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
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type'],
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      if (
        request.headers.origin !== new URL(environment.PUBLIC_WEB_URL).origin ||
        request.headers['sec-fetch-site'] === 'cross-site'
      ) {
        response.status(403).json({
          statusCode: 403,
          message: 'Access denied.',
          requestId: response.getHeader('x-request-id'),
        });
        return;
      }
      if (!request.is('application/json')) {
        response.status(415).json({
          statusCode: 415,
          message: 'JSON required.',
          requestId: response.getHeader('x-request-id'),
        });
        return;
      }
    }
    next();
  });
  app.use(
    '/auth',
    rateLimit({
      windowMs: 60000,
      limit: 60,
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
  app.use(express.json({ limit: '16kb', strict: true }));
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
      .setTitle('Yearbook API')
      .setVersion('0.1.0')
      .addCookieAuth(
        'yearbook_session',
        { type: 'apiKey', in: 'cookie' },
        'session',
      )
      .setDescription(
        'Operations and identity. Mutations require JSON and the configured web Origin. Opaque HttpOnly sessions; verification required before login.',
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
