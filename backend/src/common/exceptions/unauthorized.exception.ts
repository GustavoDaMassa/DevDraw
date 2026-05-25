import { AppException } from './app.exception'

export class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized') {
    super(401, message)
  }
}
