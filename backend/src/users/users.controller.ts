import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsersService } from './users.service'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get authenticated user profile' })
  @Get('me')
  async getMe(@Req() req: any) {
    const user = await this.usersService.findById(req.user.id)
    if (!user) return null
    const { passwordHash, refreshToken, googleId, ...profile } = user
    return profile
  }
}
