import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new account with email and password' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @ApiOperation({ summary: 'Redirect to Google OAuth2 login page' })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth(): void {}

  @ApiOperation({ summary: 'Google OAuth2 callback — issues JWT and redirects to frontend' })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any): Promise<void> {
    const tokens = await this.authService.generateTokens(req.user)
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    res.redirect(`${frontendUrl}/auth/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`)
  }

  @ApiOperation({ summary: 'Refresh access token using a valid refresh token' })
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.userId, dto.refreshToken)
  }

  @ApiOperation({ summary: 'Invalidate the current session' })
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: any): Promise<void> {
    const user = req.user as { id: string }
    await this.authService.logout(user.id)
  }
}
