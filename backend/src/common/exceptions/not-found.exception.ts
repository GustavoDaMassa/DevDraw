import { AppException } from './app.exception'

export class NotFoundException extends AppException {
  constructor(resource: string) {
    super(404, `${resource} not found`)
  }
}
