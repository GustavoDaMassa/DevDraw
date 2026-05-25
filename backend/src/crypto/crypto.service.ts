import { Injectable } from '@nestjs/common'
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto'

const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const ALGORITHM = 'aes-256-gcm'

@Injectable()
export class CryptoService {
  private deriveKey(userId: string): Buffer {
    const masterKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY ?? '', 'hex')
    return createHmac('sha256', masterKey).update(userId).digest()
  }

  encrypt(plaintext: string, userId: string): Buffer {
    const key = this.deriveKey(userId)
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return Buffer.concat([iv, authTag, encrypted])
  }

  decrypt(data: Buffer, userId: string): string {
    const key = this.deriveKey(userId)
    const iv = data.subarray(0, IV_LENGTH)
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    return decipher.update(ciphertext) + decipher.final('utf8')
  }
}
