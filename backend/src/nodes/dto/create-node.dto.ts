import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'
import { NodeType } from '../node.entity'

export class CreateNodeDto {
  @IsString()
  name: string

  @IsEnum(NodeType)
  type: NodeType

  @IsOptional()
  @IsUUID()
  parentId?: string
}
