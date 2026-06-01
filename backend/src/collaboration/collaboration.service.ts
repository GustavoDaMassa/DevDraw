import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as Y from 'yjs'
import { Node } from '../nodes/node.entity'

export interface PresenceInfo {
  userId: string
  name: string
  avatarUrl?: string
  cursor?: { x: number; y: number }
}

@Injectable()
export class CollaborationService {
  private readonly docs = new Map<string, Y.Doc>()
  private readonly presence = new Map<string, Map<string, PresenceInfo>>()

  constructor(
    @InjectRepository(Node)
    private readonly nodesRepository: Repository<Node>,
  ) {}

  async getOrLoadDoc(nodeId: string): Promise<Y.Doc> {
    if (this.docs.has(nodeId)) return this.docs.get(nodeId)!

    const node = await this.nodesRepository.findOne({ where: { id: nodeId } })
    const doc = new Y.Doc()

    if (node?.syncState) {
      Y.applyUpdate(doc, new Uint8Array(node.syncState))
    }

    this.docs.set(nodeId, doc)
    return doc
  }

  applyUpdate(nodeId: string, update: Uint8Array): void {
    const doc = this.docs.get(nodeId)
    if (doc) Y.applyUpdate(doc, update)
  }

  encodeFullState(nodeId: string): Uint8Array | null {
    const doc = this.docs.get(nodeId)
    if (!doc) return null
    return Y.encodeStateAsUpdate(doc)
  }

  async persistDoc(nodeId: string): Promise<void> {
    const doc = this.docs.get(nodeId)
    if (!doc) return

    const state = Buffer.from(Y.encodeStateAsUpdate(doc))
    await this.nodesRepository.update(nodeId, { syncState: state })
  }

  setPresence(nodeId: string, socketId: string, info: PresenceInfo): void {
    if (!this.presence.has(nodeId)) this.presence.set(nodeId, new Map())
    this.presence.get(nodeId)!.set(socketId, info)
  }

  removePresence(nodeId: string, socketId: string): void {
    this.presence.get(nodeId)?.delete(socketId)
  }

  getPresence(nodeId: string): PresenceInfo[] {
    return Array.from(this.presence.get(nodeId)?.values() ?? [])
  }

  async freeDoc(nodeId: string): Promise<void> {
    await this.persistDoc(nodeId)
    this.docs.delete(nodeId)
    this.presence.delete(nodeId)
  }

  clearAll(): void {
    this.docs.clear()
    this.presence.clear()
  }
}
