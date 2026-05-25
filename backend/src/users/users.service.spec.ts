import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UsersService } from './users.service'
import { User } from './user.entity'

const mockUser: User = {
  id: 'uuid-1',
  googleId: 'google-123',
  email: 'dev@example.com',
  name: 'Dev User',
  avatarUrl: 'https://avatar.url',
  refreshToken: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('UsersService', () => {
  let service: UsersService
  let repo: jest.Mocked<Repository<User>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(UsersService)
    repo = module.get(getRepositoryToken(User))
  })

  describe('findOrCreate', () => {
    it('should return existing user when found by googleId', async () => {
      repo.findOne.mockResolvedValue(mockUser)

      const result = await service.findOrCreate({
        googleId: 'google-123',
        email: 'dev@example.com',
        name: 'Dev User',
        avatarUrl: 'https://avatar.url',
      })

      expect(result).toBe(mockUser)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('should create and return new user when not found', async () => {
      repo.findOne.mockResolvedValue(null)
      repo.create.mockReturnValue(mockUser)
      repo.save.mockResolvedValue(mockUser)

      const result = await service.findOrCreate({
        googleId: 'google-123',
        email: 'dev@example.com',
        name: 'Dev User',
        avatarUrl: 'https://avatar.url',
      })

      expect(repo.create).toHaveBeenCalled()
      expect(repo.save).toHaveBeenCalled()
      expect(result).toBe(mockUser)
    })
  })

  describe('updateRefreshToken', () => {
    it('should call repository update with the given token', async () => {
      repo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] })

      await service.updateRefreshToken('uuid-1', 'new-token')

      expect(repo.update).toHaveBeenCalledWith('uuid-1', { refreshToken: 'new-token' })
    })
  })
})
