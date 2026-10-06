import {
  ArgumentsHost,
  Catch,
  HttpException,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from './generated/prisma/client.js';

interface SafeErrorEvent {
  requestId: string;
  statusCode: number;
}
interface ErrorReporter {
  report(event: SafeErrorEvent): void;
}
const messages: Record<number, string> = {
  400: 'Invalid request.',
  401: 'Authentication required.',
  403: 'Access denied.',
  404: 'Resource not found.',
  405: 'Method not allowed.',
  409: 'Request conflicts with current state.',
  413: 'Request is too large.',
  429: 'Too many requests. Please try again later.',
  503: 'Service unavailable.',
};
@Catch()
export class SafeErrorFilter implements ExceptionFilter {
  constructor(private readonly reporter: ErrorReporter) {}
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const parserStatus =
      typeof error === 'object' && error !== null && 'type' in error
        ? error.type === 'entity.too.large'
          ? 413
          : error.type === 'entity.parse.failed'
            ? 400
            : 500
        : 500;
    const statusCode =
      error instanceof HttpException
        ? error.getStatus()
        : error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ? 409
          : parserStatus;
    const requestId = String(response.getHeader('x-request-id'));
    if (statusCode >= 500) this.reporter.report({ requestId, statusCode });
    response.status(statusCode).json({
      statusCode,
      message:
        messages[statusCode] ??
        (statusCode < 500
          ? 'Request could not be completed.'
          : 'An unexpected error occurred.'),
      requestId,
    });
  }
}
