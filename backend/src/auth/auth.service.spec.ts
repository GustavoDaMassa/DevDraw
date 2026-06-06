import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { User } from '../users/user.entity'
import { UnauthorizedException } from '../common/exceptions/unauthorized.exception'
import { ConflictException } from '../common/exceptions/conflict.exception'
import * as bcrypt from 'bcryptjs'

const mockUser: User = {
  id: 'uuid-1',
  googleId: 'google-123',
  email: 'dev@example.com',
  name: 'Dev User',
  avatarUrl: undefined,
  refreshToken: 'old-refresh-token',
  passwordHash: undefined,
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
            findByEmail: jest.fn(),
            createLocal: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
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

  describe('register', () => {
    it('should hash password, create user and return tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null)
      usersService.createLocal.mockResolvedValue({ ...mockUser, googleId: undefined })
      jwtService.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh')
      usersService.updateRefreshToken.mockResolvedValue(undefined)

      const result = await service.register({
        name: 'Dev User',
        email: 'dev@example.com',
        password: 'senha123',
      })

      expect(usersService.findByEmail).toHaveBeenCalledWith('dev@example.com')
      expect(usersService.createLocal).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'dev@example.com', name: 'Dev User' }),
      )
      expect(result.accessToken).toBe('access')
    })

    it('should throw ConflictException when email already registered', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser)

      await expect(
        service.register({ name: 'X', email: 'dev@example.com', password: 'senha123' }),
      ).rejects.toBeInstanceOf(ConflictException)
    })
  })

  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      const hash = await bcrypt.hash('senha123', 10)
      usersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash })
      jwtService.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh')
      usersService.updateRefreshToken.mockResolvedValue(undefined)

      const result = await service.login({ email: 'dev@example.com', password: 'senha123' })

      expect(result.accessToken).toBe('access')
    })

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null)

      await expect(
        service.login({ email: 'nope@example.com', password: 'senha123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('should throw UnauthorizedException when password is wrong', async () => {
      const hash = await bcrypt.hash('correta', 10)
      usersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash })

      await expect(
        service.login({ email: 'dev@example.com', password: 'errada' }),
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('should throw UnauthorizedException for Google-only accounts', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: undefined })

      await expect(
        service.login({ email: 'dev@example.com', password: 'qualquer' }),
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })
  })

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findById.mockResolvedValue(null)

      await expect(service.refreshTokens('uuid-1', 'some-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      )
    })

    it('should return new tokens when refresh token matches', async () => {
      usersService.findById.mockResolvedValue(mockUser)
      jwtService.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh')
      usersService.updateRefreshToken.mockResolvedValue(undefined)

      const result = await service.refreshTokens('uuid-1', 'old-refresh-token')

      expect(result.accessToken).toBe('new-access')
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
