import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as Y from 'yjs'
import { CollaborationService } from './collaboration.service'
import { Node } from '../nodes/node.entity'

const makeNode = (syncState?: Buffer): Node =>
  ({ id: 'node-1', projectId: 'proj-1', syncState: syncState ?? null } as unknown as Node)

describe('CollaborationService', () => {
  let service: CollaborationService
  let nodesRepo: jest.Mocked<Repository<Node>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationService,
        {
          provide: getRepositoryToken(Node),
          useValue: { findOne: jest.fn(), update: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(CollaborationService)
    nodesRepo = module.get(getRepositoryToken(Node))
  })

  afterEach(() => {
    service.clearAll()
  })

  describe('getOrLoadDoc', () => {
    it('should create a new empty doc when no sync_state exists', async () => {
      nodesRepo.findOne.mockResolvedValue(makeNode())

      const doc = await service.getOrLoadDoc('node-1')

      expect(doc).toBeInstanceOf(Y.Doc)
    })

    it('should load existing Y.js state from node sync_state', async () => {
      const original = new Y.Doc()
      const text = original.getText('content')
      text.insert(0, 'hello')
      const state = Buffer.from(Y.encodeStateAsUpdate(original))

      nodesRepo.findOne.mockResolvedValue(makeNode(state))

      const doc = await service.getOrLoadDoc('node-1')
      const loaded = doc.getText('content').toString()

      expect(loaded).toBe('hello')
    })

    it('should return the same doc instance on subsequent calls without DB hit', async () => {
      nodesRepo.findOne.mockResolvedValue(makeNode())

      const doc1 = await service.getOrLoadDoc('node-1')
      const doc2 = await service.getOrLoadDoc('node-1')

      expect(doc1).toBe(doc2)
      expect(nodesRepo.findOne).toHaveBeenCalledTimes(1)
    })
  })

  describe('applyUpdate', () => {
    it('should apply a Y.js binary update to the in-memory doc', async () => {
      nodesRepo.findOne.mockResolvedValue(makeNode())
      await service.getOrLoadDoc('node-1')

      const sender = new Y.Doc()
      const text = sender.getText('content')
      text.insert(0, 'world')
      const update = Y.encodeStateAsUpdate(sender)

      service.applyUpdate('node-1', update)

      const doc = await service.getOrLoadDoc('node-1')
      expect(doc.getText('content').toString()).toBe('world')
    })
  })

  describe('encodeFullState', () => {
    it('should return null when doc is not loaded', () => {
      const result = service.encodeFullState('unknown-node')

      expect(result).toBeNull()
    })

    it('should return binary state when doc is loaded', async () => {
      nodesRepo.findOne.mockResolvedValue(makeNode())
      await service.getOrLoadDoc('node-1')

      const state = service.encodeFullState('node-1')

      expect(state).toBeInstanceOf(Uint8Array)
    })
  })

  describe('persistDoc', () => {
    it('should save encoded Y.js state to node sync_state', async () => {
      nodesRepo.findOne.mockResolvedValue(makeNode())
      nodesRepo.update.mockResolvedValue({} as any)
      await service.getOrLoadDoc('node-1')

      await service.persistDoc('node-1')

      expect(nodesRepo.update).toHaveBeenCalledWith(
        'node-1',
        expect.objectContaining({ syncState: expect.any(Buffer) }),
      )
    })

    it('should do nothing when doc is not loaded', async () => {
      await service.persistDoc('unknown-node')

      expect(nodesRepo.update).not.toHaveBeenCalled()
    })
  })

  describe('presence', () => {
    it('should set and retrieve presence for a canvas', () => {
      service.setPresence('node-1', 'socket-1', { userId: 'user-1', name: 'Alice', cursor: { x: 10, y: 20 } })

      const presence = service.getPresence('node-1')

      expect(presence).toHaveLength(1)
      expect(presence[0]).toMatchObject({ userId: 'user-1', name: 'Alice' })
    })

    it('should remove presence on disconnect', () => {
      service.setPresence('node-1', 'socket-1', { userId: 'user-1', name: 'Alice' })
      service.removePresence('node-1', 'socket-1')

      const presence = service.getPresence('node-1')

      expect(presence).toHaveLength(0)
    })

    it('should return empty array when no presence exists', () => {
      expect(service.getPresence('node-1')).toEqual([])
    })
  })

  describe('freeDoc', () => {
    it('should remove doc and presence from memory', async () => {
      nodesRepo.findOne.mockResolvedValue(makeNode())
      nodesRepo.update.mockResolvedValue({} as any)
      await service.getOrLoadDoc('node-1')
      service.setPresence('node-1', 'socket-1', { userId: 'user-1', name: 'Alice' })

      await service.freeDoc('node-1')

      expect(service.encodeFullState('node-1')).toBeNull()
      expect(service.getPresence('node-1')).toEqual([])
      expect(nodesRepo.update).toHaveBeenCalled()
    })
  })
})
