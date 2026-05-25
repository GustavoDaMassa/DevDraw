import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'

interface GoogleProfile {
  googleId: string
  email: string
  name: string
  avatarUrl?: string
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findOrCreate(profile: GoogleProfile): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { googleId: profile.googleId },
    })
    if (existing) return existing

    const user = this.usersRepository.create(profile)
    return this.usersRepository.save(user)
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } })
  }

  async updateRefreshToken(userId: string, token: string | null): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken: token ?? undefined })
  }
}
