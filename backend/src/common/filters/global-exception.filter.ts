import { ExceptionFilter, Catch, ArgumentsHost, Logger, HttpException } from '@nestjs/common'
import { Request, Response } from 'express'
import { AppException } from '../exceptions/app.exception'
import { ErrorResponse } from '../dto/error-response.dto'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let statusCode = 500
    let message = 'Internal server error'

    if (exception instanceof AppException) {
      statusCode = exception.statusCode
      message = exception.message
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const resp = exception.getResponse()
      message = typeof resp === 'string' ? resp : ((resp as Record<string, unknown>).message as string) ?? exception.message
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack)
    }

    const body: ErrorResponse = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    }

    response.status(statusCode).json(body)
  }
}
