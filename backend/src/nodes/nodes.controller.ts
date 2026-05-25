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
import { NodesService } from './nodes.service'
import { NodeVersionsService } from '../node-versions/node-versions.service'
import { CreateNodeDto } from './dto/create-node.dto'
import { UpdateNodeDto } from './dto/update-node.dto'
import { SaveContentDto } from './dto/save-content.dto'

@ApiTags('nodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nodes')
export class NodesController {
  constructor(
    private readonly nodesService: NodesService,
    private readonly nodeVersionsService: NodeVersionsService,
  ) {}

  @ApiOperation({ summary: 'Get full node tree for the authenticated user' })
  @Get()
  getTree(@Req() req: any) {
    return this.nodesService.getTree(req.user.id)
  }

  @ApiOperation({ summary: 'Get a single node with decrypted content' })
  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: any) {
    return this.nodesService.findByIdOrFail(id, req.user.id)
  }

  @ApiOperation({ summary: 'Create a FOLDER or FILE node' })
  @Post()
  create(@Body() dto: CreateNodeDto, @Req() req: any) {
    return this.nodesService.create(req.user.id, dto)
  }

  @ApiOperation({ summary: 'Rename or move a node' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNodeDto, @Req() req: any) {
    return this.nodesService.update(id, req.user.id, dto)
  }

  @ApiOperation({ summary: 'Save canvas JSON content (auto-save endpoint)' })
  @Patch(':id/content')
  @HttpCode(HttpStatus.NO_CONTENT)
  saveContent(@Param('id') id: string, @Body() dto: SaveContentDto, @Req() req: any) {
    return this.nodesService.saveContent(id, req.user.id, dto.content)
  }

  @ApiOperation({ summary: 'Soft delete a node' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.nodesService.softDelete(id, req.user.id)
  }

  @ApiOperation({ summary: 'List version history for a node' })
  @Get(':id/versions')
  listVersions(@Param('id') id: string, @Req() req: any) {
    return this.nodeVersionsService.listVersions(id, req.user.id)
  }

  @ApiOperation({ summary: 'Get content of a specific version' })
  @Get(':id/versions/:vid')
  getVersion(@Param('id') id: string, @Param('vid') vid: string, @Req() req: any) {
    return this.nodeVersionsService.findVersionOrFail(id, vid, req.user.id)
  }

  @ApiOperation({ summary: 'Restore node content from a previous version' })
  @Post(':id/versions/:vid/restore')
  async restoreVersion(@Param('id') id: string, @Param('vid') vid: string, @Req() req: any) {
    const version = await this.nodeVersionsService.findVersionOrFail(id, vid, req.user.id)
    const decrypted = version.content.toString('utf8')
    await this.nodesService.saveContent(id, req.user.id, decrypted)
    return { ok: true }
  }
}
