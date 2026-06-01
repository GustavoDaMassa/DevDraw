import { IsEmail } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateInvitationDto {
  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  invitedEmail: string
}
