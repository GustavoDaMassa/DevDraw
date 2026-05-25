import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

const mockTokens = { accessToken: 'acc', refreshToken: 'ref' }

describe('AuthController', () => {
  let controller: AuthController
  let authService: jest.Mocked<AuthService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            generateTokens: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(AuthController)
    authService = module.get(AuthService)
  })

  describe('refresh', () => {
    it('should return new token pair', async () => {
      authService.refreshTokens.mockResolvedValue(mockTokens)

      const result = await controller.refresh({ userId: 'uuid-1', refreshToken: 'old-ref' })

      expect(authService.refreshTokens).toHaveBeenCalledWith('uuid-1', 'old-ref')
      expect(result).toEqual(mockTokens)
    })
  })

  describe('logout', () => {
    it('should call authService.logout with the user id from request', async () => {
      authService.logout.mockResolvedValue(undefined)

      await controller.logout({ user: { id: 'uuid-1' } } as any)

      expect(authService.logout).toHaveBeenCalledWith('uuid-1')
    })
  })
})
