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
import { ApiBody, ApiCookieAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { IdentityService } from '../auth/service.js';
import { parse, sessionToken, passwordSchema } from '../auth/security.js';
import { SchoolsService } from './schools.js';
import { ClassesService } from './service.js';
import { InvitationsService } from './invitations.js';
import {
  classInput,
  classPatch,
  idSchema,
  invitationCode,
  invitationInput,
  membershipInput,
  pagination,
  schoolInput,
  schoolPatch,
} from './rules.js';
import type { SchemaObject } from '@nestjs/swagger';

// Zod remains the runtime validator; OpenAPI describes the same input shape.
const schema = (value: z.ZodType): SchemaObject =>
  z.toJSONSchema(value, {
    io: 'input',
    unrepresentable: 'any',
  }) as SchemaObject;
const pageDocs = () =>
  ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 10000,
  });
const sizeDocs = () =>
  ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 50,
  });

@ApiTags('Schools and classes')
@ApiCookieAuth('session')
@Controller()
export class ClassesController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SchoolsService) private readonly schools: SchoolsService,
    @Inject(ClassesService) private readonly classes: ClassesService,
    @Inject(InvitationsService)
    private readonly invitations: InvitationsService,
  ) {}
  private user(request: Request) {
    return this.identity.authenticate(sessionToken(request.headers.cookie));
  }

  @Post('schools')
  @ApiBody({ schema: schema(schoolInput) })
  async createSchool(@Req() request: Request, @Body() body: unknown) {
    const user = await this.user(request);
    await this.identity.throttle(user.id, 'school-create');
    return this.schools.create(user, parse(schoolInput, body));
  }
  @Get('me/schools')
  @pageDocs()
  @sizeDocs()
  async mySchools(@Req() request: Request, @Query() query: unknown) {
    return this.schools.list(
      await this.user(request),
      parse(pagination, query),
    );
  }
  @Get('schools/:id')
  async school(@Req() request: Request, @Param('id') id: string) {
    return this.schools.get(await this.user(request), parse(idSchema, id));
  }
  @Patch('schools/:id')
  @ApiBody({ schema: schema(schoolPatch) })
  async updateSchool(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.schools.update(
      await this.user(request),
      parse(idSchema, id),
      parse(schoolPatch, body),
    );
  }
  @Get('schools/:id/classes')
  @pageDocs()
  @sizeDocs()
  async schoolClasses(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.schools.classes(
      await this.user(request),
      parse(idSchema, id),
      parse(pagination, query),
    );
  }
  @Patch('schools/:id/verification')
  async verifySchool(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const user = await this.user(request);
    this.identity.requirePlatformAdmin(user);
    const input = parse(
      z
        .object({
          verified: z.boolean(),
          reason: z.string().trim().min(20).max(500),
          password: passwordSchema,
        })
        .strict(),
      body,
    );
    const confirmed = await this.identity.confirmPassword(user, input.password);
    this.identity.requirePlatformAdmin(confirmed);
    return this.schools.verify(
      confirmed,
      parse(idSchema, id),
      input.verified,
      input.reason,
    );
  }
  @Post('classes')
  @ApiBody({ schema: schema(classInput) })
  async createClass(@Req() request: Request, @Body() body: unknown) {
    const user = await this.user(request);
    await this.identity.throttle(user.id, 'class-create');
    return this.classes.create(user, parse(classInput, body));
  }
  @Get('me/classes')
  @pageDocs()
  @sizeDocs()
  async myClasses(@Req() request: Request, @Query() query: unknown) {
    return this.classes.list(
      await this.user(request),
      parse(pagination, query),
    );
  }
  @Get('classes/:id')
  async klass(@Req() request: Request, @Param('id') id: string) {
    return this.classes.get(await this.user(request), parse(idSchema, id));
  }
  @Patch('classes/:id')
  @ApiBody({ schema: schema(classPatch) })
  async updateClass(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.classes.update(
      await this.user(request),
      parse(idSchema, id),
      parse(classPatch, body),
    );
  }
  @Get('classes/:id/members')
  @pageDocs()
  @sizeDocs()
  async members(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.classes.members(
      await this.user(request),
      parse(idSchema, id),
      parse(pagination, query),
    );
  }
  @Patch('classes/:id/members/:memberId')
  @ApiBody({ schema: schema(membershipInput) })
  async member(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: unknown,
  ) {
    return this.classes.updateMember(
      await this.user(request),
      parse(idSchema, id),
      parse(idSchema, memberId),
      parse(membershipInput, body),
    );
  }
  @Post('classes/:id/invitations')
  @ApiBody({ schema: schema(invitationInput) })
  async invite(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const user = await this.user(request);
    await this.identity.throttle(user.id, 'invite-create');
    return this.invitations.create(
      user,
      parse(idSchema, id),
      parse(invitationInput, body),
    );
  }
  @Get('classes/:id/invitations')
  @pageDocs()
  @sizeDocs()
  async invites(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.invitations.list(
      await this.user(request),
      parse(idSchema, id),
      parse(pagination, query),
    );
  }
  @Post('classes/:id/invitations/:invitationId/revoke')
  @HttpCode(200)
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  async revoke(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @Body() body: unknown,
  ) {
    parse(z.object({}).strict(), body);
    return this.invitations.revoke(
      await this.user(request),
      parse(idSchema, id),
      parse(idSchema, invitationId),
    );
  }
  @Post('invitations/accept')
  @HttpCode(200)
  @ApiBody({ schema: schema(z.object({ code: invitationCode }).strict()) })
  async accept(@Req() request: Request, @Body() body: unknown) {
    const user = await this.user(request);
    await this.identity.throttle(user.id, 'invite-accept');
    return this.invitations.accept(
      user,
      parse(z.object({ code: invitationCode }).strict(), body).code,
    );
  }
}
