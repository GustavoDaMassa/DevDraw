import { Node, NodeType } from './node.entity'

describe('Node entity', () => {
  it('should instantiate with required fields', () => {
    const node = new Node()
    node.name = 'Backend'
    node.type = NodeType.FOLDER
    node.userId = 'user-1'

    expect(node.name).toBe('Backend')
    expect(node.type).toBe('FOLDER')
    expect(node.userId).toBe('user-1')
  })

  it('should allow null parentId for root nodes', () => {
    const node = new Node()
    expect(node.parentId).toBeUndefined()
  })

  it('should allow null content for FOLDER type', () => {
    const node = new Node()
    node.type = NodeType.FOLDER
    expect(node.content).toBeUndefined()
  })

  it('should accept Buffer content for FILE type', () => {
    const node = new Node()
    node.type = NodeType.FILE
    node.content = Buffer.from('encrypted-data')
    expect(node.content).toBeInstanceOf(Buffer)
  })
})
