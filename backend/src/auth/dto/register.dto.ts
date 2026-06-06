import { IsEmail, IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ example: 'Dev User' })
  @IsString()
  @MinLength(2)
  name: string

  @ApiProperty({ example: 'dev@example.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'senha123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string
}
