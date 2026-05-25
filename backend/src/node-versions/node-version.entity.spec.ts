import { NodeVersion } from './node-version.entity'

describe('NodeVersion entity', () => {
  it('should instantiate with required fields', () => {
    const version = new NodeVersion()
    version.nodeId = 'node-1'
    version.userId = 'user-1'
    version.content = Buffer.from('encrypted')
    version.versionNumber = 1

    expect(version.nodeId).toBe('node-1')
    expect(version.versionNumber).toBe(1)
    expect(version.content).toBeInstanceOf(Buffer)
  })
})
