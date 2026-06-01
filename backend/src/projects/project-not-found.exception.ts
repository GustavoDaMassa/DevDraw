import { NotFoundException } from '../common/exceptions/not-found.exception'

export class ProjectNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Project ${id}`)
  }
}
