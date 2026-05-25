import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, IsNull, Repository } from 'typeorm'
import { Node, NodeType } from './node.entity'
import { NodeNotFoundException } from './node-not-found.exception'
import { CryptoService } from '../crypto/crypto.service'
import { NodeVersionsService } from '../node-versions/node-versions.service'

interface CreateNodeDto {
  name: string
  type: NodeType
  parentId?: string
}

interface UpdateNodeDto {
  name?: string
  parentId?: string | null
}

@Injectable()
export class NodesService {
  constructor(
    @InjectRepository(Node)
    private readonly nodesRepository: Repository<Node>,
    private readonly dataSource: DataSource,
    private readonly cryptoService: CryptoService,
    private readonly nodeVersionsService: NodeVersionsService,
  ) {}

  async getTree(userId: string): Promise<Node[]> {
    return this.dataSource.query(
      `WITH RECURSIVE tree AS (
        SELECT * FROM nodes WHERE parent_id IS NULL AND user_id = $1 AND deleted_at IS NULL
        UNION ALL
        SELECT n.* FROM nodes n INNER JOIN tree t ON n.parent_id = t.id WHERE n.deleted_at IS NULL
      ) SELECT id, user_id, parent_id, name, type, created_at, updated_at FROM tree ORDER BY type, name`,
      [userId],
    )
  }

  async findByIdOrFail(id: string, userId: string): Promise<Node> {
    const node = await this.nodesRepository.findOne({
      where: { id, userId, deletedAt: IsNull() },
    })
    if (!node) throw new NodeNotFoundException(id)

    if (node.content) {
      const plaintext = this.cryptoService.decrypt(node.content, userId)
      node.content = Buffer.from(plaintext)
    }
    return node
  }

  async create(userId: string, dto: CreateNodeDto): Promise<Node> {
    const node = this.nodesRepository.create({ ...dto, userId })
    return this.nodesRepository.save(node)
  }

  async update(id: string, userId: string, dto: UpdateNodeDto): Promise<Node> {
    const node = await this.nodesRepository.findOne({
      where: { id, userId, deletedAt: IsNull() },
    })
    if (!node) throw new NodeNotFoundException(id)

    if (dto.name !== undefined) node.name = dto.name
    if (dto.parentId !== undefined) node.parentId = dto.parentId ?? undefined

    return this.nodesRepository.save(node)
  }

  async saveContent(id: string, userId: string, content: string): Promise<void> {
    const node = await this.nodesRepository.findOne({
      where: { id, userId, deletedAt: IsNull() },
    })
    if (!node) throw new NodeNotFoundException(id)

    const encrypted = this.cryptoService.encrypt(content, userId)
    node.content = encrypted
    await this.nodesRepository.save(node)
    await this.nodeVersionsService.createVersion(id, userId, encrypted)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const node = await this.nodesRepository.findOne({
      where: { id, userId, deletedAt: IsNull() },
    })
    if (!node) throw new NodeNotFoundException(id)

    node.deletedAt = new Date()
    await this.nodesRepository.save(node)
  }
}
