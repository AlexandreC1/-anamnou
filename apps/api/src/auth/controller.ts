import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { IdentityService, publicUser } from './service.js';
import {
  cookieName,
  emailSchema,
  localeSchema,
  nameSchema,
  parse,
  passwordSchema,
  sessionToken,
  SESSION_MS,
  tokenSchema,
} from './security.js';

export const AUTH_SECURE = Symbol('AUTH_SECURE');
const emailBody = z.object({ email: emailSchema }).strict();
const accepted = { status: 'accepted' } as const;
@ApiTags('Identity')
@Controller()
export class IdentityController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(AUTH_SECURE) private readonly secure: boolean,
  ) {}

  @Post('auth/register')
  @HttpCode(202)
  @ApiOperation({
    summary:
      'Register; verify the email before login. Duplicate emails receive the same response.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['email', 'password', 'displayName'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 15, maxLength: 128 },
        displayName: { type: 'string', maxLength: 80 },
        locale: { type: 'string', enum: ['ht', 'fr', 'en', 'es'] },
      },
    },
  })
  async register(@Body() body: unknown) {
    await this.identity.register(
      parse(
        z
          .object({
            email: emailSchema,
            password: passwordSchema,
            displayName: nameSchema,
            locale: localeSchema.default('en'),
          })
          .strict(),
        body,
      ),
    );
    return accepted;
  }

  @Post('auth/login')
  @HttpCode(200)
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', maxLength: 128 },
      },
    },
  })
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    const input = parse(
      z
        .object({ email: emailSchema, password: z.string().min(1).max(128) })
        .strict(),
      body,
    );
    const result = await this.identity.login(input.email, input.password);
    await this.identity.logout(sessionToken(request.headers.cookie));
    response.cookie(cookieName, result.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.secure,
      path: '/',
      maxAge: SESSION_MS,
    });
    return result.user;
  }

  @Post('auth/logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.identity.logout(sessionToken(request.headers.cookie));
    response.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.secure,
      path: '/',
    });
    return { status: 'ok' };
  }

  @Post('auth/forgot-password')
  @HttpCode(202)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: { email: { type: 'string', format: 'email' } },
    },
  })
  async forgot(@Body() body: unknown) {
    await this.identity.requestToken(
      parse(emailBody, body).email,
      'RESET_PASSWORD',
    );
    return accepted;
  }

  @Post('auth/resend-verification')
  @HttpCode(202)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: { email: { type: 'string', format: 'email' } },
    },
  })
  async resend(@Body() body: unknown) {
    await this.identity.requestToken(
      parse(emailBody, body).email,
      'VERIFY_EMAIL',
    );
    return accepted;
  }

  @Post('auth/verify-email')
  @HttpCode(200)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: { token: { type: 'string', pattern: '^[a-f0-9]{64}$' } },
    },
  })
  async verify(@Body() body: unknown) {
    await this.identity.redeem(
      parse(z.object({ token: tokenSchema }).strict(), body).token,
      'VERIFY_EMAIL',
    );
    return { status: 'ok' };
  }

  @Post('auth/reset-password')
  @HttpCode(200)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'password'],
      properties: {
        token: { type: 'string', pattern: '^[a-f0-9]{64}$' },
        password: { type: 'string', minLength: 15, maxLength: 128 },
      },
    },
  })
  async reset(@Body() body: unknown) {
    const input = parse(
      z.object({ token: tokenSchema, password: passwordSchema }).strict(),
      body,
    );
    await this.identity.redeem(input.token, 'RESET_PASSWORD', input.password);
    return { status: 'ok' };
  }

  @Get('me')
  @ApiCookieAuth('session')
  async me(@Req() request: Request) {
    return publicUser(
      await this.identity.authenticate(sessionToken(request.headers.cookie)),
    );
  }

  @Get('me/sessions')
  @ApiCookieAuth('session')
  sessions(@Req() request: Request) {
    return this.identity.sessions(sessionToken(request.headers.cookie));
  }
  @Post('me/sessions/revoke')
  @HttpCode(200)
  @ApiCookieAuth('session')
  revokeSession(@Req() request: Request, @Body() body: unknown) {
    const input = parse(z.object({ id: z.uuid().optional() }).strict(), body);
    return this.identity.revokeSession(
      sessionToken(request.headers.cookie),
      input.id,
    );
  }

  @Patch('me')
  @ApiCookieAuth('session')
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        displayName: { type: 'string', maxLength: 80 },
        locale: { type: 'string', enum: ['ht', 'fr', 'en', 'es'] },
      },
    },
  })
  async update(@Req() request: Request, @Body() body: unknown) {
    return this.identity.update(
      sessionToken(request.headers.cookie),
      parse(
        z
          .object({
            displayName: nameSchema.optional(),
            locale: localeSchema.optional(),
          })
          .strict()
          .refine((value) => Object.keys(value).length > 0),
        body,
      ),
    );
  }
}
