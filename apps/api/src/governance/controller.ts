import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  HttpCode,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { IdentityService } from '../auth/service.js';
import { MfaService } from '../auth/mfa-service.js';
import { parse, sessionToken } from '../auth/security.js';
import { GovernanceService } from './service.js';
import {
  grantInput,
  decisionInput,
  queueInput,
  queuePatch,
  listInput,
} from './rules.js';

@ApiTags('Governance')
@ApiCookieAuth('session')
@Controller()
export class GovernanceController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(MfaService) private readonly mfa: MfaService,
    @Inject(GovernanceService) private readonly governance: GovernanceService,
  ) {}
  private async actor(
    request: Request,
    proof?: { password: string; code: string },
    platform = false,
  ) {
    const token = sessionToken(request.headers.cookie);
    const user = await this.identity.authenticate(token);
    if (platform) this.identity.requirePlatformAdmin(user);
    if (proof) await this.mfa.reauthenticate(token, proof.password, proof.code);
    return { user, token: token! };
  }
  @Get('me/governance/grants')
  async own(@Req() request: Request) {
    return this.governance.own(
      await this.identity.authenticate(sessionToken(request.headers.cookie)),
    );
  }
  @Get('governance/grants')
  async grants(@Req() request: Request, @Query() query: unknown) {
    const input = parse(listInput, query);
    return this.governance.list(
      await this.actor(request),
      input.schoolId,
      input.cursor,
    );
  }
  @Post('governance/grants')
  async requestGrant(@Req() request: Request, @Body() body: unknown) {
    const { password, code, ...input } = parse(grantInput, body);
    return this.governance.request(
      await this.actor(request, { password, code }, true),
      input,
    );
  }
  @Post('governance/grants/:id/approve')
  @HttpCode(200)
  async approve(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(decisionInput, body);
    return this.governance.decision(
      await this.actor(request, input, true),
      parse(z.uuid(), id),
      true,
      input.reason,
    );
  }
  @Post('governance/grants/:id/revoke')
  @HttpCode(200)
  async revoke(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(decisionInput, body);
    return this.governance.decision(
      await this.actor(request, input, true),
      parse(z.uuid(), id),
      false,
      input.reason,
    );
  }
  @Get('governance/queues')
  async queues(@Req() request: Request, @Query() query: unknown) {
    const input = parse(listInput, query);
    return this.governance.list(
      await this.actor(request),
      input.schoolId,
      input.cursor,
      true,
    );
  }
  @Post('governance/queues')
  async createQueue(@Req() request: Request, @Body() body: unknown) {
    const { password, code, schoolId, ...input } = parse(queueInput, body);
    return this.governance.queue(
      await this.actor(request, { password, code }),
      schoolId,
      input,
    );
  }
  @Patch('governance/queues/:id')
  async reassign(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { password, code, version, ...input } = parse(queuePatch, body);
    const actor = await this.actor(request, { password, code });
    const queueId = parse(z.uuid(), id);
    return this.governance.queue(
      actor,
      await this.governance.queueSchool(queueId),
      input,
      { id: queueId, version },
    );
  }
}
