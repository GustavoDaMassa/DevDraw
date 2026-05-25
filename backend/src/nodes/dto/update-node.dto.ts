import { IsOptional, IsString, IsUUID } from 'class-validator'

export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsUUID()
  parentId?: string
}
