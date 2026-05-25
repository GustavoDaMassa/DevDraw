import { CryptoService } from './crypto.service'

describe('CryptoService', () => {
  let service: CryptoService

  beforeEach(() => {
    service = new CryptoService()
    process.env.ENCRYPTION_MASTER_KEY = 'a'.repeat(64)
  })

  it('should encrypt and decrypt a string back to original', () => {
    const original = JSON.stringify({ type: 'draw', elements: [{ id: '1' }] })
    const userId = 'user-abc-123'

    const encrypted = service.encrypt(original, userId)
    const decrypted = service.decrypt(encrypted, userId)

    expect(decrypted).toBe(original)
  })

  it('should produce different ciphertexts for the same input (random IV)', () => {
    const data = 'same data'
    const userId = 'user-abc-123'

    const enc1 = service.encrypt(data, userId)
    const enc2 = service.encrypt(data, userId)

    expect(enc1.equals(enc2)).toBe(false)
  })

  it('should fail to decrypt with a different userId', () => {
    const data = 'secret canvas'
    const encrypted = service.encrypt(data, 'user-1')

    expect(() => service.decrypt(encrypted, 'user-2')).toThrow()
  })
})
