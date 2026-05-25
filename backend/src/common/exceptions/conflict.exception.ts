import { AppException } from './app.exception'

export class ConflictException extends AppException {
  constructor(resource: string) {
    super(409, `${resource} already exists`)
  }
}
