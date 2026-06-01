import { IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateProjectDto {
  @ApiProperty({ example: 'My Architecture' })
  @IsString()
  @MinLength(1)
  name: string
}
