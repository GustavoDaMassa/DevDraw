import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { User } from '../users/user.entity'
import { UnauthorizedException } from '../common/exceptions/unauthorized.exception'

const mockUser: User = {
  id: 'uuid-1',
  googleId: 'google-123',
  email: 'dev@example.com',
  name: 'Dev User',
  avatarUrl: undefined,
  refreshToken: 'old-refresh-token',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('AuthService', () => {
  let service: AuthService
  let usersService: jest.Mocked<UsersService>
  let jwtService: jest.Mocked<JwtService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOrCreate: jest.fn(),
            findById: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(AuthService)
    usersService = module.get(UsersService)
    jwtService = module.get(JwtService)
  })

  describe('validateGoogleUser', () => {
    it('should delegate to UsersService.findOrCreate', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser)

      const result = await service.validateGoogleUser({
        googleId: 'google-123',
        email: 'dev@example.com',
        name: 'Dev User',
      })

      expect(usersService.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ googleId: 'google-123' }),
      )
      expect(result).toBe(mockUser)
    })
  })

  describe('generateTokens', () => {
    it('should return access and refresh tokens and persist refresh token', async () => {
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')
      usersService.updateRefreshToken.mockResolvedValue(undefined)

      const result = await service.generateTokens(mockUser)

      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toBe('refresh-token')
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('uuid-1', 'refresh-token')
    })
  })

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findById.mockResolvedValue(null)

      await expect(service.refreshTokens('uuid-1', 'some-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('should throw UnauthorizedException when refresh token does not match', async () => {
      usersService.findById.mockResolvedValue({ ...mockUser, refreshToken: 'different-token' })

      await expect(service.refreshTokens('uuid-1', 'wrong-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('should return new tokens when refresh token matches', async () => {
      usersService.findById.mockResolvedValue(mockUser)
      jwtService.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh')
      usersService.updateRefreshToken.mockResolvedValue(undefined)

      const result = await service.refreshTokens('uuid-1', 'old-refresh-token')

      expect(result.accessToken).toBe('new-access')
      expect(result.refreshToken).toBe('new-refresh')
    })
  })

  describe('logout', () => {
    it('should clear the refresh token', async () => {
      usersService.updateRefreshToken.mockResolvedValue(undefined)

      await service.logout('uuid-1')

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('uuid-1', null)
    })
  })
})
