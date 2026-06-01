import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ProjectsService } from './projects.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'
import { UpdateMemberRoleDto } from './dto/update-member-role.dto'

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ApiOperation({ summary: 'List all projects for the authenticated user' })
  @Get()
  findAll(@Req() req: any) {
    return this.projectsService.findAllByUser(req.user.id)
  }

  @ApiOperation({ summary: 'Create a new project' })
  @Post()
  create(@Body() dto: CreateProjectDto, @Req() req: any) {
    return this.projectsService.create(req.user.id, dto)
  }

  @ApiOperation({ summary: 'Get project details' })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.projectsService.findByIdOrFail(id, req.user.id)
  }

  @ApiOperation({ summary: 'Rename project (owner only)' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Req() req: any) {
    return this.projectsService.update(id, req.user.id, dto)
  }

  @ApiOperation({ summary: 'Delete project (owner only)' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.projectsService.remove(id, req.user.id)
  }

  @ApiOperation({ summary: 'List project members' })
  @Get(':id/members')
  getMembers(@Param('id') id: string, @Req() req: any) {
    return this.projectsService.getMembers(id, req.user.id)
  }

  @ApiOperation({ summary: 'Update member role (owner only)' })
  @Patch(':id/members/:userId')
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: any,
  ) {
    return this.projectsService.updateMemberRole(id, req.user.id, targetUserId, dto.role)
  }

  @ApiOperation({ summary: 'Remove member from project (owner only)' })
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param('id') id: string, @Param('userId') targetUserId: string, @Req() req: any) {
    return this.projectsService.removeMember(id, req.user.id, targetUserId)
  }
}
