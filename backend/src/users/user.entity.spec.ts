import { User } from './user.entity'

describe('User entity', () => {
  it('should instantiate with required fields', () => {
    const user = new User()
    user.googleId = 'google-123'
    user.email = 'dev@example.com'
    user.name = 'Dev User'

    expect(user.googleId).toBe('google-123')
    expect(user.email).toBe('dev@example.com')
    expect(user.name).toBe('Dev User')
  })

  it('should allow nullable optional fields', () => {
    const user = new User()
    expect(user.avatarUrl).toBeUndefined()
    expect(user.refreshToken).toBeUndefined()
  })
})
