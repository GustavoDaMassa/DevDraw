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
import { CryptoService } from '../crypto/crypto.service'
import { CreateNodeDto } from './dto/create-node.dto'
import { UpdateNodeDto } from './dto/update-node.dto'
import { SaveContentDto } from './dto/save-content.dto'

@ApiTags('nodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/nodes')
export class NodesController {
  constructor(
    private readonly nodesService: NodesService,
    private readonly nodeVersionsService: NodeVersionsService,
    private readonly cryptoService: CryptoService,
  ) {}

  @ApiOperation({ summary: 'Get full node tree for a project' })
  @Get()
  getTree(@Param('projectId') projectId: string, @Req() req: any) {
    return this.nodesService.getTree(projectId, req.user.id)
  }

  @ApiOperation({ summary: 'Get a single node with decrypted content' })
  @Get(':id')
  getOne(@Param('projectId') projectId: string, @Param('id') id: string, @Req() req: any) {
    return this.nodesService.findByIdOrFail(id, projectId, req.user.id)
  }

  @ApiOperation({ summary: 'Create a FOLDER or FILE node' })
  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateNodeDto, @Req() req: any) {
    return this.nodesService.create(projectId, req.user.id, dto)
  }

  @ApiOperation({ summary: 'Rename or move a node' })
  @Patch(':id')
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateNodeDto,
    @Req() req: any,
  ) {
    return this.nodesService.update(id, projectId, req.user.id, dto)
  }

  @ApiOperation({ summary: 'Save canvas JSON content (auto-save endpoint)' })
  @Patch(':id/content')
  @HttpCode(HttpStatus.NO_CONTENT)
  saveContent(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: SaveContentDto,
    @Req() req: any,
  ) {
    return this.nodesService.saveContent(id, projectId, req.user.id, dto.content)
  }

  @ApiOperation({ summary: 'Soft delete a node' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('projectId') projectId: string, @Param('id') id: string, @Req() req: any) {
    return this.nodesService.softDelete(id, projectId, req.user.id)
  }

  @ApiOperation({ summary: 'List version history for a node' })
  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.nodeVersionsService.listVersions(id)
  }

  @ApiOperation({ summary: 'Get content of a specific version' })
  @Get(':id/versions/:vid')
  getVersion(@Param('id') id: string, @Param('vid') vid: string) {
    return this.nodeVersionsService.findVersionOrFail(id, vid)
  }

  @ApiOperation({ summary: 'Restore node content from a previous version' })
  @Post(':id/versions/:vid/restore')
  async restoreVersion(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('vid') vid: string,
    @Req() req: any,
  ) {
    const version = await this.nodeVersionsService.findVersionOrFail(id, vid)
    const decrypted = this.cryptoService.decrypt(version.content, projectId)
    await this.nodesService.saveContent(id, projectId, req.user.id, decrypted)
    return { ok: true }
  }
}
