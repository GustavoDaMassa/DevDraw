import { Test, TestingModule } from '@nestjs/testing'
import { NodesController } from './nodes.controller'
import { NodesService } from './nodes.service'
import { NodeVersionsService } from '../node-versions/node-versions.service'
import { CryptoService } from '../crypto/crypto.service'
import { NodeType } from './node.entity'
import { NodeNotFoundException } from './node-not-found.exception'
import { NotFoundException } from '../common/exceptions/not-found.exception'

const mockNode = { id: 'node-1', name: 'My Board', type: NodeType.FILE, projectId: 'proj-1' }
const mockReq = { user: { id: 'user-1' } }
const PROJECT_ID = 'proj-1'

describe('NodesController', () => {
  let controller: NodesController
  let nodesService: jest.Mocked<NodesService>
  let nodeVersionsService: jest.Mocked<NodeVersionsService>
  let cryptoService: jest.Mocked<CryptoService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NodesController],
      providers: [
        {
          provide: NodesService,
          useValue: {
            getTree: jest.fn(),
            findByIdOrFail: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            saveContent: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: NodeVersionsService,
          useValue: {
            listVersions: jest.fn(),
            findVersionOrFail: jest.fn(),
          },
        },
        {
          provide: CryptoService,
          useValue: { decrypt: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get(NodesController)
    nodesService = module.get(NodesService)
    nodeVersionsService = module.get(NodeVersionsService)
    cryptoService = module.get(CryptoService)
  })

  describe('GET /projects/:projectId/nodes', () => {
    it('should return the project node tree', async () => {
      nodesService.getTree.mockResolvedValue([mockNode] as any)

      const result = await controller.getTree(PROJECT_ID, mockReq as any)

      expect(nodesService.getTree).toHaveBeenCalledWith(PROJECT_ID, 'user-1')
      expect(result).toHaveLength(1)
    })
  })

  describe('GET /projects/:projectId/nodes/:id', () => {
    it('should return a single node', async () => {
      nodesService.findByIdOrFail.mockResolvedValue(mockNode as any)

      const result = await controller.getOne(PROJECT_ID, 'node-1', mockReq as any)

      expect(nodesService.findByIdOrFail).toHaveBeenCalledWith('node-1', PROJECT_ID, 'user-1')
      expect(result).toMatchObject({ id: 'node-1' })
    })

    it('should propagate NodeNotFoundException (→ 404)', async () => {
      nodesService.findByIdOrFail.mockRejectedValue(new NodeNotFoundException('node-1'))

      await expect(controller.getOne(PROJECT_ID, 'node-1', mockReq as any)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('POST /projects/:projectId/nodes', () => {
    it('should create and return a new node', async () => {
      nodesService.create.mockResolvedValue(mockNode as any)

      const result = await controller.create(PROJECT_ID, { name: 'My Board', type: NodeType.FILE }, mockReq as any)

      expect(nodesService.create).toHaveBeenCalledWith(PROJECT_ID, 'user-1', expect.objectContaining({ name: 'My Board' }))
      expect(result).toMatchObject({ id: 'node-1' })
    })
  })

  describe('PATCH /projects/:projectId/nodes/:id', () => {
    it('should update node name', async () => {
      nodesService.update.mockResolvedValue({ ...mockNode, name: 'Renamed' } as any)

      const result = await controller.update(PROJECT_ID, 'node-1', { name: 'Renamed' }, mockReq as any)

      expect(nodesService.update).toHaveBeenCalledWith('node-1', PROJECT_ID, 'user-1', { name: 'Renamed' })
      expect(result.name).toBe('Renamed')
    })

    it('should propagate NodeNotFoundException (→ 404)', async () => {
      nodesService.update.mockRejectedValue(new NodeNotFoundException('node-1'))

      await expect(controller.update(PROJECT_ID, 'node-1', { name: 'X' }, mockReq as any)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('PATCH /projects/:projectId/nodes/:id/content', () => {
    it('should save content and return 204', async () => {
      nodesService.saveContent.mockResolvedValue(undefined)

      await controller.saveContent(PROJECT_ID, 'node-1', { content: '{"type":"draw"}' }, mockReq as any)

      expect(nodesService.saveContent).toHaveBeenCalledWith('node-1', PROJECT_ID, 'user-1', '{"type":"draw"}')
    })

    it('should propagate NodeNotFoundException (→ 404)', async () => {
      nodesService.saveContent.mockRejectedValue(new NodeNotFoundException('node-1'))

      await expect(
        controller.saveContent(PROJECT_ID, 'node-1', { content: '{}' }, mockReq as any),
      ).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('DELETE /projects/:projectId/nodes/:id', () => {
    it('should soft delete and return 204', async () => {
      nodesService.softDelete.mockResolvedValue(undefined)

      await controller.remove(PROJECT_ID, 'node-1', mockReq as any)

      expect(nodesService.softDelete).toHaveBeenCalledWith('node-1', PROJECT_ID, 'user-1')
    })

    it('should propagate NodeNotFoundException (→ 404)', async () => {
      nodesService.softDelete.mockRejectedValue(new NodeNotFoundException('node-1'))

      await expect(controller.remove(PROJECT_ID, 'node-1', mockReq as any)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('GET /projects/:projectId/nodes/:id/versions', () => {
    it('should list all versions for a node', async () => {
      nodeVersionsService.listVersions.mockResolvedValue([{ id: 'v-1', versionNumber: 1 }] as any)

      const result = await controller.listVersions('node-1')

      expect(nodeVersionsService.listVersions).toHaveBeenCalledWith('node-1')
      expect(result).toHaveLength(1)
    })
  })

  describe('POST /projects/:projectId/nodes/:id/versions/:vid/restore', () => {
    it('should decrypt version content and save it', async () => {
      const version = { id: 'v-1', nodeId: 'node-1', content: Buffer.from('cipher') }
      nodeVersionsService.findVersionOrFail.mockResolvedValue(version as any)
      cryptoService.decrypt.mockReturnValue('{"type":"draw"}')
      nodesService.saveContent.mockResolvedValue(undefined)

      const result = await controller.restoreVersion(PROJECT_ID, 'node-1', 'v-1', mockReq as any)

      expect(cryptoService.decrypt).toHaveBeenCalledWith(version.content, PROJECT_ID)
      expect(nodesService.saveContent).toHaveBeenCalledWith('node-1', PROJECT_ID, 'user-1', '{"type":"draw"}')
      expect(result).toEqual({ ok: true })
    })
  })
})
