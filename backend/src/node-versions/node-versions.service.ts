import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NodeVersion } from './node-version.entity'
import { NotFoundException } from '../common/exceptions/not-found.exception'

@Injectable()
export class NodeVersionsService {
  constructor(
    @InjectRepository(NodeVersion)
    private readonly versionsRepository: Repository<NodeVersion>,
  ) {}

  async createVersion(nodeId: string, userId: string, content: Buffer): Promise<NodeVersion> {
    const count = await this.versionsRepository.count({ where: { nodeId, userId } })
    return this.versionsRepository.save({ nodeId, userId, content, versionNumber: count + 1 })
  }

  async listVersions(nodeId: string, userId: string): Promise<NodeVersion[]> {
    return this.versionsRepository.find({
      where: { nodeId, userId },
      order: { versionNumber: 'DESC' },
      select: ['id', 'nodeId', 'userId', 'versionNumber', 'createdAt'],
    })
  }

  async findVersionOrFail(nodeId: string, versionId: string, userId: string): Promise<NodeVersion> {
    const version = await this.versionsRepository.findOne({
      where: { id: versionId, nodeId, userId },
    })
    if (!version) throw new NotFoundException(`Version ${versionId}`)
    return version
  }
}
