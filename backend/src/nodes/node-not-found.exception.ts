import { NotFoundException } from '../common/exceptions/not-found.exception'

export class NodeNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Node ${id}`)
  }
}
