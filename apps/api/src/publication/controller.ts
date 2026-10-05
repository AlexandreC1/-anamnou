import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiProduces,
  ApiQuery,
  ApiTags,
  type SchemaObject,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { IdentityService } from '../auth/service.js';
import { parse, sessionToken } from '../auth/security.js';
import { idSchema } from '../classes/rules.js';
import { ProfilesService } from './profiles.js';
import { YearbooksService } from './yearbooks.js';
import { MediaService } from './media.js';
import {
  intentInput,
  profileInput,
  yearbookInput,
  deleteInput,
  readerQuery,
} from './rules.js';

const schema = (input: z.ZodType) =>
  z.toJSONSchema(input, {
    io: 'input',
    unrepresentable: 'any',
  }) as SchemaObject;
const empty = z.object({}).strict();
@ApiTags('Profiles, media and draft yearbooks')
@ApiCookieAuth('session')
@Controller()
export class PublicationController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(ProfilesService) private readonly profiles: ProfilesService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(YearbooksService) private readonly yearbooks: YearbooksService,
  ) {}
  private user(request: Request) {
    return this.identity.authenticate(sessionToken(request.headers.cookie));
  }
  @Get('classes/:id/members/:memberId/profile')
  async profile(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.profiles.get(
      await this.user(request),
      parse(idSchema, id),
      parse(z.union([idSchema, z.literal('me')]), memberId),
    );
  }
  @Patch('classes/:id/members/me/profile')
  @ApiBody({ schema: schema(profileInput) })
  async updateProfile(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.profiles.update(
      await this.user(request),
      parse(idSchema, id),
      parse(profileInput, body),
    );
  }
  @Get('classes/:id/profile-progress')
  async progress(@Req() request: Request, @Param('id') id: string) {
    return this.profiles.progress(
      await this.user(request),
      parse(idSchema, id),
    );
  }
  @Get('classes/:id/yearbook')
  async yearbook(@Req() request: Request, @Param('id') id: string) {
    return this.yearbooks.get(await this.user(request), parse(idSchema, id));
  }
  @Patch('classes/:id/yearbook')
  @ApiBody({ schema: schema(yearbookInput) })
  async updateYearbook(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.yearbooks.update(
      await this.user(request),
      parse(idSchema, id),
      parse(yearbookInput, body),
    );
  }
  @Get('classes/:id/yearbook/members')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 10000,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 50,
  })
  @ApiQuery({
    name: 'kind',
    required: false,
    enum: ['MEMBERS', 'STAFF', 'QUOTES'],
  })
  async members(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.yearbooks.members(
      await this.user(request),
      parse(idSchema, id),
      parse(readerQuery, query),
    );
  }
  @Post('media/upload-intent')
  @ApiBody({ schema: schema(intentInput) })
  async intent(@Req() request: Request, @Body() body: unknown) {
    const user = await this.user(request);
    await this.identity.throttle(user.id, 'upload-intent');
    return this.media.intent(user, parse(intentInput, body));
  }
  @Post('media/:id/content')
  @HttpCode(200)
  @ApiConsumes('application/octet-stream')
  @ApiBody({
    schema: {
      type: 'string',
      format: 'binary',
      description:
        'JPEG, PNG or WebP, exactly the declared size, maximum 8 MiB. Intent authorization precedes body parsing.',
    },
  })
  async upload(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.media.upload(
      await this.user(request),
      parse(idSchema, id),
      body,
    );
  }
  @Post('media/:id/complete')
  @HttpCode(200)
  @ApiBody({ schema: schema(empty) })
  async complete(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    parse(empty, body);
    return this.media.complete(await this.user(request), parse(idSchema, id));
  }
  @Get('media/:id/content')
  @ApiProduces('image/webp')
  async content(
    @Req() request: Request,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const bytes = await this.media.content(
      await this.user(request),
      parse(idSchema, id),
    );
    response.type('image/webp').setHeader('Content-Disposition', 'inline');
    response.send(bytes);
  }
  @Delete('media/:id')
  @ApiBody({ schema: schema(deleteInput) })
  async remove(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(deleteInput, body);
    return this.media.remove(
      await this.user(request),
      parse(idSchema, id),
      input.profileVersion,
    );
  }
}
