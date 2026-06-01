import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { InvitationsService } from './invitations.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'

@ApiTags('invitations')
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @ApiOperation({ summary: 'Invite a user to a project by email (owner only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('projects/:projectId/invitations')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateInvitationDto,
    @Req() req: any,
  ) {
    return this.invitationsService.create(projectId, req.user.id, dto)
  }

  @ApiOperation({ summary: 'Get invitation details by token (public)' })
  @Get('invitations/:token')
  findByToken(@Param('token') token: string) {
    return this.invitationsService.findByToken(token)
  }

  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  accept(@Param('token') token: string, @Req() req: any) {
    return this.invitationsService.accept(token, req.user.id)
  }

  @ApiOperation({ summary: 'Decline an invitation' })
  @Post('invitations/:token/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  decline(@Param('token') token: string) {
    return this.invitationsService.decline(token)
  }

  @ApiOperation({ summary: 'Cancel a pending invitation (owner only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('projects/:projectId/invitations/:invId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @Param('projectId') projectId: string,
    @Param('invId') invId: string,
    @Req() req: any,
  ) {
    return this.invitationsService.cancel(projectId, invId, req.user.id)
  }
}
