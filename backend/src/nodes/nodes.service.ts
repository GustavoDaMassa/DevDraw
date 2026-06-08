import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, IsNull, Repository } from 'typeorm'
import { Node, NodeType } from './node.entity'
import { NodeNotFoundException } from './node-not-found.exception'
import { CryptoService } from '../crypto/crypto.service'
import { NodeVersionsService } from '../node-versions/node-versions.service'
import { ProjectsService } from '../projects/projects.service'
import { ProjectRole } from '../projects/project-member.entity'

interface CreateNodeDto {
  name: string
  type: NodeType
  parentId?: string
}

interface UpdateNodeDto {
  name?: string
  parentId?: string | null
}

const WRITE_ROLES = [ProjectRole.OWNER, ProjectRole.EDITOR]

@Injectable()
export class NodesService {
  constructor(
    @InjectRepository(Node)
    private readonly nodesRepository: Repository<Node>,
    private readonly dataSource: DataSource,
    private readonly cryptoService: CryptoService,
    private readonly nodeVersionsService: NodeVersionsService,
    private readonly projectsService: ProjectsService,
  ) {}

  async getTree(projectId: string, userId: string): Promise<Node[]> {
    await this.projectsService.assertMembership(projectId, userId)
    return this.dataSource.query(
      `WITH RECURSIVE tree AS (
        SELECT * FROM nodes WHERE parent_id IS NULL AND project_id = $1 AND deleted_at IS NULL
        UNION ALL
        SELECT n.* FROM nodes n INNER JOIN tree t ON n.parent_id = t.id WHERE n.deleted_at IS NULL
      ) SELECT id, project_id AS "projectId", created_by AS "createdBy", parent_id AS "parentId", name, type, created_at AS "createdAt", updated_at AS "updatedAt" FROM tree ORDER BY type, name`,
      [projectId],
    )
  }

  async findByIdOrFail(id: string, projectId: string, userId: string): Promise<Node> {
    await this.projectsService.assertMembership(projectId, userId)
    const node = await this.nodesRepository.findOne({
      where: { id, projectId, deletedAt: IsNull() },
    })
    if (!node) throw new NodeNotFoundException(id)

    if (node.content) {
      const plaintext = this.cryptoService.decrypt(node.content, projectId)
      ;(node as any).content = plaintext
    }
    return node
  }

  async create(projectId: string, userId: string, dto: CreateNodeDto): Promise<Node> {
    await this.projectsService.assertMembership(projectId, userId, WRITE_ROLES)
    const node = this.nodesRepository.create({ ...dto, projectId, createdBy: userId })
    return this.nodesRepository.save(node)
  }

  async update(id: string, projectId: string, userId: string, dto: UpdateNodeDto): Promise<Node> {
    await this.projectsService.assertMembership(projectId, userId, WRITE_ROLES)
    const node = await this.nodesRepository.findOne({
      where: { id, projectId, deletedAt: IsNull() },
    })
    if (!node) throw new NodeNotFoundException(id)

    if (dto.name !== undefined) node.name = dto.name
    if (dto.parentId !== undefined) node.parentId = dto.parentId ?? undefined

    return this.nodesRepository.save(node)
  }

  async saveContent(id: string, projectId: string, userId: string, content: string): Promise<void> {
    await this.projectsService.assertMembership(projectId, userId, WRITE_ROLES)
    const node = await this.nodesRepository.findOne({
      where: { id, projectId, deletedAt: IsNull() },
    })
    if (!node) throw new NodeNotFoundException(id)

    const encrypted = this.cryptoService.encrypt(content, projectId)
    node.content = encrypted
    await this.nodesRepository.save(node)
    await this.nodeVersionsService.createVersion(id, userId, encrypted)
  }

  async softDelete(id: string, projectId: string, userId: string): Promise<void> {
    await this.projectsService.assertMembership(projectId, userId, WRITE_ROLES)
    const node = await this.nodesRepository.findOne({
      where: { id, projectId, deletedAt: IsNull() },
    })
    if (!node) throw new NodeNotFoundException(id)

    node.deletedAt = new Date()
    await this.nodesRepository.save(node)
  }
}
