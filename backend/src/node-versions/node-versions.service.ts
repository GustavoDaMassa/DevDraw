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
    const count = await this.versionsRepository.count({ where: { nodeId } })
    return this.versionsRepository.save({ nodeId, userId, content, versionNumber: count + 1 })
  }

  async listVersions(nodeId: string): Promise<NodeVersion[]> {
    return this.versionsRepository.find({
      where: { nodeId },
      order: { versionNumber: 'DESC' },
      select: { id: true, nodeId: true, userId: true, versionNumber: true, createdAt: true },
    })
  }

  async findVersionOrFail(nodeId: string, versionId: string): Promise<NodeVersion> {
    const version = await this.versionsRepository.findOne({
      where: { id: versionId, nodeId },
    })
    if (!version) throw new NotFoundException(`Version ${versionId}`)
    return version
  }
}
