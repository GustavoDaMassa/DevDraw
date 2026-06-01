import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NodeVersionsService } from './node-versions.service'
import { NodeVersion } from './node-version.entity'

const makeVersion = (n: number): NodeVersion =>
  ({ id: `v-${n}`, nodeId: 'node-1', userId: 'user-1', versionNumber: n, content: Buffer.from('x'), createdAt: new Date() }) as NodeVersion

describe('NodeVersionsService', () => {
  let service: NodeVersionsService
  let repo: jest.Mocked<Repository<NodeVersion>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodeVersionsService,
        {
          provide: getRepositoryToken(NodeVersion),
          useValue: { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), count: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(NodeVersionsService)
    repo = module.get(getRepositoryToken(NodeVersion))
  })

  describe('createVersion', () => {
    it('should save a new version with global incremented version number', async () => {
      repo.count.mockResolvedValue(2)
      repo.save.mockResolvedValue(makeVersion(3))

      await service.createVersion('node-1', 'user-1', Buffer.from('content'))

      expect(repo.count).toHaveBeenCalledWith({ where: { nodeId: 'node-1' } })
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nodeId: 'node-1', userId: 'user-1', versionNumber: 3 }),
      )
    })
  })

  describe('listVersions', () => {
    it('should return all versions for a node ordered by versionNumber desc', async () => {
      repo.find.mockResolvedValue([makeVersion(2), makeVersion(1)])

      const result = await service.listVersions('node-1')

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { nodeId: 'node-1' } }),
      )
      expect(result).toHaveLength(2)
    })
  })

  describe('findVersionOrFail', () => {
    it('should throw NotFoundException when version does not exist', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.findVersionOrFail('node-1', 'v-99')).rejects.toThrow()
    })

    it('should return version when found', async () => {
      repo.findOne.mockResolvedValue(makeVersion(1))

      const result = await service.findVersionOrFail('node-1', 'v-1')

      expect(result).toMatchObject({ nodeId: 'node-1' })
    })
  })
})
