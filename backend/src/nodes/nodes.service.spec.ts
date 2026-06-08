import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { NodesService } from './nodes.service'
import { Node, NodeType } from './node.entity'
import { CryptoService } from '../crypto/crypto.service'
import { NodeVersionsService } from '../node-versions/node-versions.service'
import { ProjectsService } from '../projects/projects.service'
import { NodeNotFoundException } from './node-not-found.exception'
import { ProjectMember, ProjectRole } from '../projects/project-member.entity'

const mockNode = (overrides: Partial<Node> = {}): Node =>
  ({
    id: 'node-1',
    projectId: 'proj-1',
    createdBy: 'user-1',
    name: 'My Board',
    type: NodeType.FILE,
    parentId: undefined,
    content: undefined,
    deletedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Node

const mockMember = (): ProjectMember =>
  ({ projectId: 'proj-1', userId: 'user-1', role: ProjectRole.EDITOR }) as ProjectMember

describe('NodesService', () => {
  let service: NodesService
  let repo: jest.Mocked<Repository<Node>>
  let dataSource: jest.Mocked<DataSource>
  let cryptoService: jest.Mocked<CryptoService>
  let nodeVersionsService: jest.Mocked<NodeVersionsService>
  let projectsService: jest.Mocked<ProjectsService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        {
          provide: getRepositoryToken(Node),
          useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { query: jest.fn() },
        },
        {
          provide: CryptoService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn() },
        },
        {
          provide: NodeVersionsService,
          useValue: { createVersion: jest.fn() },
        },
        {
          provide: ProjectsService,
          useValue: { assertMembership: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(NodesService)
    repo = module.get(getRepositoryToken(Node))
    dataSource = module.get(DataSource)
    cryptoService = module.get(CryptoService)
    nodeVersionsService = module.get(NodeVersionsService)
    projectsService = module.get(ProjectsService)
  })

  describe('getTree', () => {
    it('should check membership and query the tree with projectId', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      dataSource.query.mockResolvedValue([mockNode()])

      const result = await service.getTree('proj-1', 'user-1')

      expect(projectsService.assertMembership).toHaveBeenCalledWith('proj-1', 'user-1')
      expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('RECURSIVE'), ['proj-1'])
      expect(result).toHaveLength(1)
    })
  })

  describe('findByIdOrFail', () => {
    it('should return node when found and user is a project member', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      repo.findOne.mockResolvedValue(mockNode())

      const result = await service.findByIdOrFail('node-1', 'proj-1', 'user-1')

      expect(result).toMatchObject({ id: 'node-1' })
    })

    it('should throw NodeNotFoundException when node not found', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      repo.findOne.mockResolvedValue(null)

      await expect(service.findByIdOrFail('node-1', 'proj-1', 'user-1')).rejects.toBeInstanceOf(
        NodeNotFoundException,
      )
    })

    it('should decrypt content using projectId as key', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      const encrypted = Buffer.from('cipher')
      repo.findOne.mockResolvedValue(mockNode({ content: encrypted }))
      cryptoService.decrypt.mockReturnValue('{"type":"draw"}')

      const result = await service.findByIdOrFail('node-1', 'proj-1', 'user-1')

      expect(cryptoService.decrypt).toHaveBeenCalledWith(encrypted, 'proj-1')
      expect(result.content).toEqual('{"type":"draw"}')
    })
  })

  describe('create', () => {
    it('should check EDITOR membership and create a FOLDER node', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      const node = mockNode({ type: NodeType.FOLDER })
      repo.create.mockReturnValue(node)
      repo.save.mockResolvedValue(node)

      const result = await service.create('proj-1', 'user-1', { name: 'Backend', type: NodeType.FOLDER })

      expect(projectsService.assertMembership).toHaveBeenCalledWith('proj-1', 'user-1', expect.arrayContaining([ProjectRole.EDITOR]))
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Backend', type: NodeType.FOLDER, projectId: 'proj-1', createdBy: 'user-1' }),
      )
      expect(result.type).toBe(NodeType.FOLDER)
    })
  })

  describe('update', () => {
    it('should update name and save', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      const node = mockNode()
      repo.findOne.mockResolvedValue(node)
      repo.save.mockResolvedValue({ ...node, name: 'Renamed' } as Node)

      const result = await service.update('node-1', 'proj-1', 'user-1', { name: 'Renamed' })

      expect(result.name).toBe('Renamed')
    })

    it('should throw NodeNotFoundException when node does not exist', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      repo.findOne.mockResolvedValue(null)

      await expect(service.update('node-1', 'proj-1', 'user-1', { name: 'X' })).rejects.toBeInstanceOf(
        NodeNotFoundException,
      )
    })
  })

  describe('saveContent', () => {
    it('should encrypt with projectId, save node, and create a version', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      const node = mockNode()
      repo.findOne.mockResolvedValue(node)
      cryptoService.encrypt.mockReturnValue(Buffer.from('cipher'))
      repo.save.mockResolvedValue({ ...node, content: Buffer.from('cipher') } as Node)
      nodeVersionsService.createVersion.mockResolvedValue({} as any)

      await service.saveContent('node-1', 'proj-1', 'user-1', '{"type":"draw"}')

      expect(cryptoService.encrypt).toHaveBeenCalledWith('{"type":"draw"}', 'proj-1')
      expect(repo.save).toHaveBeenCalled()
      expect(nodeVersionsService.createVersion).toHaveBeenCalledWith('node-1', 'user-1', expect.any(Buffer))
    })

    it('should throw NodeNotFoundException when node does not exist', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      repo.findOne.mockResolvedValue(null)

      await expect(service.saveContent('node-1', 'proj-1', 'user-1', '{}')).rejects.toBeInstanceOf(
        NodeNotFoundException,
      )
    })
  })

  describe('softDelete', () => {
    it('should set deletedAt and save', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      const node = mockNode()
      repo.findOne.mockResolvedValue(node)
      repo.save.mockResolvedValue({ ...node, deletedAt: new Date() } as Node)

      await service.softDelete('node-1', 'proj-1', 'user-1')

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: expect.any(Date) }))
    })

    it('should throw NodeNotFoundException when node does not exist', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      repo.findOne.mockResolvedValue(null)

      await expect(service.softDelete('node-1', 'proj-1', 'user-1')).rejects.toBeInstanceOf(NodeNotFoundException)
    })
  })
})
