import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { UsersService } from '../users/users.service'
import { User } from '../users/user.entity'
import { UnauthorizedException } from '../common/exceptions/unauthorized.exception'
import { ConflictException } from '../common/exceptions/conflict.exception'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

interface GoogleProfile {
  googleId: string
  email: string
  name: string
  avatarUrl?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateGoogleUser(profile: GoogleProfile): Promise<User> {
    return this.usersService.findOrCreate(profile)
  }

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) throw new ConflictException('Email')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.usersService.createLocal({
      email: dto.email,
      name: dto.name,
      passwordHash,
    })

    return this.generateTokens(user)
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.usersService.findByEmail(dto.email)

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    return this.generateTokens(user)
  }

  async generateTokens(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email }

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' })
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' })

    await this.usersService.updateRefreshToken(user.id, refreshToken)

    return { accessToken, refreshToken }
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokenPair> {
    const user = await this.usersService.findById(userId)

    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    return this.generateTokens(user)
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null)
  }
}
