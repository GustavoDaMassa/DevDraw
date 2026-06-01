import { IsString, MinLength, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Renamed Project' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string
}
