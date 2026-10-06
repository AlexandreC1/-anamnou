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
import { MfaService } from './mfa-service.js';
import { factorSchema } from './mfa.js';
import {
  cookieName,
  emailSchema,
  localeSchema,
  MFA_CHALLENGE_MS,
  mfaCookieName,
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
const factorBody = z.object({ code: factorSchema }).strict();
const reauthBody = z
  .object({ password: z.string().min(1).max(128), code: factorSchema })
  .strict();
@ApiTags('Identity')
@Controller()
export class IdentityController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(MfaService) private readonly mfa: MfaService,
    @Inject(AUTH_SECURE) private readonly secure: boolean,
  ) {}
  private setSession(response: Response, token: string) {
    response.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.secure,
      path: '/',
      maxAge: SESSION_MS,
    });
  }

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
    const result = await this.identity.login(
      input.email,
      input.password,
      request.ip ?? '',
    );
    await this.identity.logout(sessionToken(request.headers.cookie));
    if ('challenge' in result) {
      response.cookie(mfaCookieName, result.challenge, {
        httpOnly: true,
        sameSite: 'strict',
        secure: this.secure,
        path: '/',
        maxAge: MFA_CHALLENGE_MS,
      });
      return { mfaRequired: true };
    }
    this.setSession(response, result.token);
    return result.user;
  }

  @Post('auth/mfa')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Complete sign-in with a six-digit authenticator code or a one-use recovery code.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['code'],
      properties: { code: { type: 'string', maxLength: 19 } },
    },
  })
  async completeMfa(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.mfa.completeLogin(
      sessionToken(request.headers.cookie, mfaCookieName),
      parse(factorBody, body).code,
    );
    response.clearCookie(mfaCookieName, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.secure,
      path: '/',
    });
    this.setSession(response, result.token);
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

  @Get('me/mfa')
  @ApiCookieAuth('session')
  mfaStatus(@Req() request: Request) {
    return this.mfa.status(sessionToken(request.headers.cookie));
  }
  @Post('me/mfa/setup')
  @HttpCode(200)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary:
      'Start authenticator enrollment after password reauthentication. The setup secret expires in ten minutes.',
  })
  mfaSetup(@Req() request: Request, @Body() body: unknown) {
    return this.mfa.setup(
      sessionToken(request.headers.cookie),
      parse(z.object({ password: z.string().min(1).max(128) }).strict(), body)
        .password,
    );
  }
  @Post('me/mfa/enable')
  @HttpCode(200)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary:
      'Confirm enrollment with a current code. Returns ten recovery codes once and signs out other sessions.',
  })
  mfaEnable(@Req() request: Request, @Body() body: unknown) {
    return this.mfa.enable(
      sessionToken(request.headers.cookie),
      parse(z.object({ code: z.string().regex(/^\d{6}$/) }).strict(), body)
        .code,
    );
  }
  @Post('me/mfa/disable')
  @HttpCode(200)
  @ApiCookieAuth('session')
  mfaDisable(@Req() request: Request, @Body() body: unknown) {
    const input = parse(reauthBody, body);
    return this.mfa.disable(
      sessionToken(request.headers.cookie),
      input.password,
      input.code,
    );
  }
  @Post('me/mfa/recovery-codes')
  @HttpCode(200)
  @ApiCookieAuth('session')
  mfaRecoveryCodes(@Req() request: Request, @Body() body: unknown) {
    const input = parse(reauthBody, body);
    return this.mfa.regenerate(
      sessionToken(request.headers.cookie),
      input.password,
      input.code,
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
