import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import {
  ConsoleLogger,
  HttpException,
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
import { GovernanceModule } from './governance/module.js';
import { ClassesModule } from './classes/module.js';
import { PublicationModule } from './publication/module.js';
import { MediaService } from './publication/media.js';
import { IdentityService } from './auth/service.js';
import { sessionToken } from './auth/security.js';
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
import { Maintenance } from './maintenance.js';
import { DatabaseRateLimitStore } from './rate-limits.js';

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
    const identity = IdentityModule.register(database, environment);
    return {
      module: FoundationModule,
      imports: [
        identity,
        GovernanceModule.register(database, identity),
        ClassesModule.register(
          database,
          identity,
          environment.PUBLIC_WEB_URL,
          environment.APP_ENV === 'production',
        ),
        PublicationModule.register(database, storage, identity),
      ],
      controllers: [HealthController],
      providers: [
        ReadinessService,
        { provide: DATABASE, useValue: database },
        { provide: STORAGE, useValue: storage },
        { provide: ANALYTICS, useValue: analytics },
        { provide: Maintenance, useValue: new Maintenance(database, storage) },
        {
          provide: ResourceLifecycle,
          useValue: new ResourceLifecycle(database, storage),
        },
      ],
    };
  }
}
const limitResponse = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request: Request, response: Response) =>
    response.status(429).json({
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
      requestId: response.getHeader('x-request-id'),
    }),
} as const;
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
  if (environment.TRUST_PROXY_CIDRS.length)
    app
      .getHttpAdapter()
      .getInstance()
      .set('trust proxy', environment.TRUST_PROXY_CIDRS);
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
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'DELETE'],
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
      const binary =
        request.method === 'POST' &&
        /^\/media\/[a-f0-9-]{36}\/content$/.test(request.path);
      if (
        !request.is(binary ? 'application/octet-stream' : 'application/json')
      ) {
        response.status(415).json({
          statusCode: 415,
          message: 'Unsupported content type.',
          requestId: response.getHeader('x-request-id'),
        });
        return;
      }
    }
    next();
  });
  app.use(
    '/health',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      ...limitResponse,
    }),
  );
  app.use(
    '/auth',
    rateLimit({
      ...(environment.APP_ENV !== 'test'
        ? { store: new DatabaseRateLimitStore(database, 'rate-auth', 60_000) }
        : {}),
      windowMs: 60000,
      limit: 60,
      ...limitResponse,
    }),
  );
  app.use(
    rateLimit({
      ...(environment.APP_ENV !== 'test'
        ? { store: new DatabaseRateLimitStore(database, 'rate-global', 60_000) }
        : {}),
      // Process liveness must remain independent of database availability.
      skip: (request) => request.path === '/health',
      windowMs: 60_000,
      limit: 120,
      ...limitResponse,
    }),
  );
  let activeUploads = 0;
  app.use(async (request: Request, response: Response, next: NextFunction) => {
    const match =
      request.method === 'POST' &&
      /^\/media\/([a-f0-9-]{36})\/content$/.exec(request.path);
    if (!match) {
      next();
      return;
    }
    try {
      const user = await app
        .get(IdentityService)
        .authenticate(sessionToken(request.headers.cookie));
      const id = match[1];
      if (!id || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id)) {
        throw new HttpException('Invalid request.', 400);
      }
      await app.get(MediaService).authorizeContent(user, id);
      if (activeUploads >= 4) throw new HttpException('Uploads are busy.', 429);
      activeUploads++;
      let released = false;
      const release = () => {
        if (!released) {
          released = true;
          activeUploads--;
          clearTimeout(timeout);
        }
      };
      const timeout = setTimeout(() => {
        response.destroy();
        release();
      }, 60000);
      timeout.unref();
      response.once('finish', release);
      response.once('close', release);
      express.raw({
        type: 'application/octet-stream',
        limit: '8mb',
        inflate: false,
      })(request, response, next);
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 500;
      if (status === 500)
        logger.error({
          event: 'upload.authorization.error',
          requestId: response.getHeader('x-request-id'),
        });
      response.status(status).json({
        statusCode: status,
        message: 'Upload unavailable.',
        requestId: response.getHeader('x-request-id'),
      });
    }
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const yearbook =
      request.method === 'PATCH' &&
      /^\/classes\/[a-f0-9-]{36}\/yearbook$/.test(request.path);
    express.json({ limit: yearbook ? '128kb' : '16kb', strict: true })(
      request,
      response,
      next,
    );
  });
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
      .setVersion('0.3.0')
      .addCookieAuth(
        'yearbook_session',
        { type: 'apiKey', in: 'cookie' },
        'session',
      )
      .setDescription(
        'Identity, schools/classes, invitations, private member profiles, media and draft yearbooks. Mutations require the configured web Origin and JSON, except the bounded binary media content endpoint. Opaque HttpOnly sessions; verification required before login. Collections use page and pageSize (maximum 50). Publication is not yet available.',
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
