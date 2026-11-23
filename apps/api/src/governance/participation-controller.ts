import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { IdentityService } from '../auth/service.js';
import { MfaService } from '../auth/mfa-service.js';
import { parse, sessionToken } from '../auth/security.js';
import { decisionInput, listInput } from './rules.js';
import { ParticipationService } from './participation.js';
import {
  policyInput,
  participationInput,
  participationDecision,
  participationWithdrawal,
} from './participation-rules.js';

@ApiTags('Participation')
@ApiCookieAuth('session')
@Controller()
export class ParticipationController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(MfaService) private readonly mfa: MfaService,
    @Inject(ParticipationService)
    private readonly service: ParticipationService,
  ) {}
  private async actor(
    request: Request,
    proof?: { password: string; code: string },
  ) {
    const token = sessionToken(request.headers.cookie);
    const user = await this.identity.authenticate(token);
    if (proof) await this.mfa.reauthenticate(token, proof.password, proof.code);
    return { user, token: token! };
  }
  @Get('me/participation')
  async own(@Req() request: Request) {
    return this.service.own((await this.actor(request)).user);
  }
  @Get('me/participation/:membershipId/policies')
  async policies(
    @Req() request: Request,
    @Param('membershipId') membershipId: string,
  ) {
    return this.service.policies(
      (await this.actor(request)).user,
      parse(z.uuid(), membershipId),
    );
  }
  @Post('me/participation/:membershipId/request')
  @HttpCode(200)
  async request(
    @Req() request: Request,
    @Param('membershipId') membershipId: string,
    @Body() body: unknown,
  ) {
    const input = parse(participationInput, body);
    return this.service.request(
      (await this.actor(request)).user,
      parse(z.uuid(), membershipId),
      input.policyId,
      input.version,
    );
  }
  @Post('me/participation/:membershipId/withdraw')
  @HttpCode(200)
  async withdraw(
    @Req() request: Request,
    @Param('membershipId') membershipId: string,
    @Body() body: unknown,
  ) {
    const input = parse(participationWithdrawal, body);
    return this.service.withdraw(
      (await this.actor(request)).user,
      parse(z.uuid(), membershipId),
      input.version,
    );
  }
  @Post('governance/participation/policies')
  async policy(@Req() request: Request, @Body() body: unknown) {
    const input = parse(policyInput, body);
    return this.service.policy(await this.actor(request, input), input);
  }
  @Get('governance/participation/policies')
  async listPolicies(@Req() request: Request, @Query() query: unknown) {
    const input = parse(listInput, query);
    return this.service.listPolicies(
      await this.actor(request),
      input.schoolId,
      input.cursor,
    );
  }
  @Post('governance/participation/policies/:id/approve')
  @HttpCode(200)
  async approvePolicy(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(decisionInput, body);
    return this.service.approvePolicy(
      await this.actor(request, input),
      parse(z.uuid(), id),
      input.reason,
    );
  }
  @Get('governance/participation')
  async list(@Req() request: Request, @Query() query: unknown) {
    const input = parse(listInput, query);
    return this.service.list(
      await this.actor(request),
      input.schoolId,
      input.cursor,
    );
  }
  @Post('governance/participation/:membershipId/decision')
  @HttpCode(200)
  async decision(
    @Req() request: Request,
    @Param('membershipId') membershipId: string,
    @Body() body: unknown,
  ) {
    const input = parse(participationDecision, body);
    return this.service.decide(
      await this.actor(request, input),
      parse(z.uuid(), membershipId),
      input,
    );
  }
}
