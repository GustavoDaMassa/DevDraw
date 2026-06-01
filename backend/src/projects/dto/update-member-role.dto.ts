import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { ProjectRole } from '../project-member.entity'

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ProjectRole, example: ProjectRole.EDITOR })
  @IsEnum(ProjectRole)
  role: ProjectRole
}
