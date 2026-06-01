import { AppException } from './app.exception'

export class ForbiddenException extends AppException {
  constructor(message = 'Forbidden') {
    super(403, message)
  }
}
