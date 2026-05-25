import { ArgumentsHost } from '@nestjs/common'
import { GlobalExceptionFilter } from './global-exception.filter'
import { NotFoundException } from '../exceptions/not-found.exception'
import { ConflictException } from '../exceptions/conflict.exception'

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter

  const mockJson = jest.fn()
  const mockStatus = jest.fn(() => ({ json: mockJson }))

  const mockHost = {
    switchToHttp: jest.fn(() => ({
      getResponse: jest.fn(() => ({ status: mockStatus })),
      getRequest: jest.fn(() => ({ url: '/test' })),
    })),
  } as unknown as ArgumentsHost

  beforeEach(() => {
    filter = new GlobalExceptionFilter()
    jest.clearAllMocks()
  })

  it('should handle NotFoundException with 404', () => {
    filter.catch(new NotFoundException('User'), mockHost)

    expect(mockStatus).toHaveBeenCalledWith(404)
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'User not found', path: '/test' }),
    )
  })

  it('should handle ConflictException with 409', () => {
    filter.catch(new ConflictException('Email'), mockHost)

    expect(mockStatus).toHaveBeenCalledWith(409)
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, message: 'Email already exists' }),
    )
  })

  it('should handle unknown errors with 500', () => {
    filter.catch(new Error('boom'), mockHost)

    expect(mockStatus).toHaveBeenCalledWith(500)
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Internal server error', path: '/test' }),
    )
  })

  it('should include timestamp in all responses', () => {
    filter.catch(new NotFoundException('Node'), mockHost)

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ timestamp: expect.any(String) }),
    )
  })
})
